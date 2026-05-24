"""
Orqen Execution Engine — Celery task orchestration.

This is the heart of the system. It:
  1. Picks up a WorkflowRun from the queue
  2. Parses the workflow definition into a typed DAG
  3. Traverses the graph node-by-node using BFS
  4. Dispatches each node to the right executor
  5. Handles retries, pauses (approval), failures, and run completion
  6. Publishes real-time SSE events to Redis for the frontend monitor

Key design decisions:
  - Celery tasks are sync wrappers around async Python — we call asyncio.run()
    per task, not once globally, to avoid event loop conflicts with multiple workers.
  - We use BFS traversal (queue-based) rather than recursion to avoid stack
    overflow on deep workflows and to naturally support fan-out (parallel branches).
  - ExecutionContext is serialized to the DB on pause so any worker can resume.
  - Node configs are resolved (templates substituted) just before execution,
    not at workflow save time — this is intentional so outputs from earlier
    nodes flow into later ones dynamically.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from collections import deque
from datetime import datetime, timezone, timedelta
from typing import Any

import redis as redis_sync
from sqlalchemy import select

from config import settings
from database import async_session_factory
from models import Workflow, WorkflowRun, NodeExecution, ApprovalRequest, WorkflowSchedule
from workers import celery_app
from .graph import WorkflowGraph
from .context import ExecutionContext
from .nodes import NODE_REGISTRY
from .nodes.base import NodeStatus


# ─── Redis client for SSE pub/sub ────────────────────────────────────────────

_redis = redis_sync.from_url(settings.REDIS_URL, decode_responses=True)


def _publish(run_id: str, event: dict[str, Any]) -> None:
    """Publish a run event to Redis. The SSE endpoint subscribes to this channel."""
    channel = f"run:{run_id}"
    _redis.publish(channel, json.dumps(event))


# ─── Celery tasks ─────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="engine.executor.execute_workflow_task",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def execute_workflow_task(self, run_id: str) -> None:
    """
    Entry point: triggered when a workflow run is created.
    Runs the full workflow from the entry node(s).
    """
    try:
        asyncio.run(_execute_run(run_id, resume_from=None))
    except Exception as exc:
        # Celery retry with exponential backoff: 30s, 60s, 120s
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@celery_app.task(
    bind=True,
    name="engine.executor.resume_workflow_task",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def resume_workflow_task(self, run_id: str, resume_from_node: str) -> None:
    """
    Resume a paused run after an approval is resolved.
    Rehydrates the ExecutionContext from the DB and continues from
    the nodes immediately after the approval node.
    """
    try:
        asyncio.run(_execute_run(run_id, resume_from=resume_from_node))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@celery_app.task(name="engine.executor.poll_scheduled_workflows")
def poll_scheduled_workflows() -> None:
    """
    Called every minute by Celery Beat.
    Checks WorkflowSchedule rows where next_run_at <= now and fires runs.
    """
    asyncio.run(_poll_schedules())


# ─── Core async execution logic ───────────────────────────────────────────────

async def _execute_run(run_id: str, resume_from: str | None) -> None:
    """
    Core execution function. Traverses the workflow DAG using BFS.
    Handles node dispatch, retries, pause/resume, and run completion.
    """
    async with async_session_factory() as session:
        # ── Load run ──────────────────────────────────────────────────────────
        run = await session.get(WorkflowRun, uuid.UUID(run_id))
        if not run:
            return

        workflow = await session.get(Workflow, run.workflow_id)
        if not workflow:
            await _fail_run(session, run, "Workflow not found")
            return

        # ── Mark running ──────────────────────────────────────────────────────
        run.status = "running"
        if not run.started_at:
            run.started_at = datetime.now(timezone.utc)
        await session.commit()

        _publish(run_id, {"type": "run_started", "run_id": run_id})

        # ── Build graph ───────────────────────────────────────────────────────
        try:
            graph = WorkflowGraph.from_definition(workflow.definition)
        except ValueError as exc:
            await _fail_run(session, run, f"Invalid workflow graph: {exc}")
            return

        # ── Restore or create execution context ───────────────────────────────
        if resume_from and run.context:
            context = ExecutionContext.from_dict(run.context)
        else:
            context = ExecutionContext(
                run_id=run_id,
                workflow_id=str(run.workflow_id),
                trigger_data=run.trigger_data or {},
            )

        # ── Determine start nodes ─────────────────────────────────────────────
        if resume_from:
            # Resuming after approval: continue with nodes after the approval node
            start_nodes = graph.next_nodes(resume_from, branch=None)
        else:
            start_nodes = graph.entry_nodes()

        if not start_nodes:
            await _fail_run(session, run, "Workflow has no entry nodes")
            return

        # ── BFS traversal ─────────────────────────────────────────────────────
        queue: deque[str] = deque(start_nodes)
        visited: set[str] = set()

        while queue:
            node_id = queue.popleft()

            if node_id in visited:
                continue
            visited.add(node_id)

            node_def = graph.nodes.get(node_id)
            if not node_def:
                continue

            # Skip nodes that don't have a registered executor
            executor_class = NODE_REGISTRY.get(node_def.type)
            if not executor_class:
                await _fail_run(
                    session, run,
                    f"Unknown node type {node_def.type!r} on node {node_id!r}"
                )
                return

            # ── Create NodeExecution record ───────────────────────────────────
            node_exec = NodeExecution(
                id=uuid.uuid4(),
                run_id=run.id,
                node_id=node_id,
                node_type=node_def.type,
                status="running",
                input={"config": node_def.config},
                started_at=datetime.now(timezone.utc),
            )
            session.add(node_exec)
            await session.flush()   # get the ID without committing

            _publish(run_id, {
                "type":              "node_started",
                "node_id":           node_id,
                "node_type":         node_def.type,
                "node_execution_id": str(node_exec.id),
            })

            # ── Resolve config templates, then execute ────────────────────────
            resolved_config = context.resolve_config(node_def.config)
            executor_instance = executor_class()
            result = await executor_instance.execute(resolved_config, context)

            # ── Update NodeExecution ──────────────────────────────────────────
            now = datetime.now(timezone.utc)
            node_exec.status      = result.status.value
            node_exec.output      = result.output
            node_exec.error       = result.error
            node_exec.tokens_used = result.tokens_used
            node_exec.finished_at = now
            node_exec.duration_ms = int(
                (now - node_exec.started_at).total_seconds() * 1000
            )

            # Update run-level observability counters
            run.total_tokens = (run.total_tokens or 0) + result.tokens_used
            cost = result.metadata.get("cost_usd", 0) if result.metadata else 0
            run.estimated_cost_usd = (run.estimated_cost_usd or 0) + cost

            await session.commit()

            _publish(run_id, {
                "type":        "node_completed",
                "node_id":     node_id,
                "status":      result.status.value,
                "tokens":      result.tokens_used,
                "duration_ms": node_exec.duration_ms,
                "error":       result.error,
            })

            # ── Handle PAUSED (approval node) ─────────────────────────────────
            if result.status == NodeStatus.PAUSED:
                timeout_hours = result.output.get("timeout_hours", 24)
                approval = ApprovalRequest(
                    id=uuid.uuid4(),
                    run_id=run.id,
                    node_id=node_id,
                    status="pending",
                    message=result.output.get("message", ""),
                    context=result.output,
                    expires_at=datetime.now(timezone.utc) + timedelta(hours=timeout_hours),
                )
                session.add(approval)

                # Serialize context so any worker can resume
                run.context      = context.to_dict()
                run.status       = "paused"
                run.run_metadata = {
                    **(run.run_metadata or {}),
                    "paused_at_node": node_id,
                    "approval_id":    str(approval.id),
                }
                await session.commit()

                _publish(run_id, {
                    "type":        "run_paused",
                    "node_id":     node_id,
                    "approval_id": str(approval.id),
                    "message":     result.output.get("message", ""),
                })
                return  # ← Celery task ends here; resume_workflow_task continues it

            # ── Handle FAILED ─────────────────────────────────────────────────
            if result.status == NodeStatus.FAILED:
                await _fail_run(session, run, result.error or "Node failed")
                _publish(run_id, {"type": "run_failed", "error": result.error})
                return

            # ── Store output, queue next nodes ────────────────────────────────
            context.set_output(node_id, result.output)

            branch = (result.metadata or {}).get("branch")
            for next_node_id in graph.next_nodes(node_id, branch):
                if next_node_id not in visited:
                    queue.append(next_node_id)

        # ── All nodes processed — run complete ────────────────────────────────
        now = datetime.now(timezone.utc)
        run.status      = "success"
        run.finished_at = now
        if run.started_at:
            run.duration_ms = int((now - run.started_at).total_seconds() * 1000)
        await session.commit()

        _publish(run_id, {
            "type":         "run_completed",
            "total_tokens": run.total_tokens,
            "cost_usd":     float(run.estimated_cost_usd or 0),
            "duration_ms":  run.duration_ms,
        })


async def _fail_run(session, run: WorkflowRun, error: str) -> None:
    run.status      = "failed"
    run.error       = error
    run.finished_at = datetime.now(timezone.utc)
    if run.started_at:
        run.duration_ms = int(
            (run.finished_at - run.started_at).total_seconds() * 1000
        )
    await session.commit()


# ─── Scheduler poller ─────────────────────────────────────────────────────────

async def _poll_schedules() -> None:
    """Fire workflow runs for any schedules whose next_run_at has passed."""
    from croniter import croniter  # optional dep, only needed for scheduling

    now = datetime.now(timezone.utc)

    async with async_session_factory() as session:
        result = await session.execute(
            select(WorkflowSchedule).where(
                WorkflowSchedule.is_active == True,
                WorkflowSchedule.next_run_at <= now,
            )
        )
        schedules = result.scalars().all()

        for schedule in schedules:
            # Create a new run
            run = WorkflowRun(
                id=uuid.uuid4(),
                workflow_id=schedule.workflow_id,
                status="queued",
                trigger_type="cron",
                trigger_data={"schedule_id": str(schedule.id), "fired_at": now.isoformat()},
            )
            session.add(run)

            # Compute next fire time
            cron = croniter(schedule.cron_expr, now)
            schedule.last_run_at = now
            schedule.next_run_at = cron.get_next(datetime)

            await session.flush()

            # Dispatch async
            execute_workflow_task.delay(str(run.id))

        await session.commit()
