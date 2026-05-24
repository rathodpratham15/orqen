"""
Workflow run endpoints — trigger, status, trace, and real-time SSE stream.
"""
import asyncio
import json
import uuid
from typing import Annotated, AsyncIterator

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import Workflow, WorkflowRun
from schemas import TriggerRunRequest, WorkflowRunResponse
from engine.executor import execute_workflow_task

router = APIRouter()


def get_current_user_id() -> str:
    return "dev-user"

UserDep = Annotated[str, Depends(get_current_user_id)]
DBDep   = Annotated[AsyncSession, Depends(get_db)]


@router.post("/{workflow_id}/run", response_model=WorkflowRunResponse, status_code=202)
async def trigger_run(
    workflow_id: uuid.UUID,
    body: TriggerRunRequest,
    user_id: UserDep,
    db: DBDep,
):
    """Enqueue a workflow run. Returns immediately; execution is async."""
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != user_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not wf.is_active:
        raise HTTPException(status_code=400, detail="Workflow is inactive")

    run = WorkflowRun(
        id=uuid.uuid4(),
        workflow_id=workflow_id,
        status="queued",
        trigger_type="manual",
        trigger_data=body.trigger_data,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Dispatch to Celery worker
    execute_workflow_task.delay(str(run.id))

    return run


@router.get("", response_model=list[WorkflowRunResponse])
async def list_runs(
    workflow_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = 50,
    user_id: UserDep = Depends(get_current_user_id),
    db: DBDep = Depends(get_db),
):
    """List runs, optionally filtered by workflow or status."""
    query = (
        select(WorkflowRun)
        .join(Workflow)
        .where(Workflow.user_id == user_id)
        .options(selectinload(WorkflowRun.node_executions))
        .order_by(WorkflowRun.created_at.desc())
        .limit(limit)
    )
    if workflow_id:
        query = query.where(WorkflowRun.workflow_id == workflow_id)
    if status:
        query = query.where(WorkflowRun.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{run_id}", response_model=WorkflowRunResponse)
async def get_run(run_id: uuid.UUID, user_id: UserDep, db: DBDep):
    """Get a run with its full node execution trace."""
    result = await db.execute(
        select(WorkflowRun)
        .options(selectinload(WorkflowRun.node_executions))
        .where(WorkflowRun.id == run_id)
        .join(Workflow)
        .where(Workflow.user_id == user_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/{run_id}/stream")
async def stream_run_events(run_id: uuid.UUID, request: Request):
    """
    Server-Sent Events endpoint — streams live node execution events.

    The frontend subscribes to this before triggering a run, then receives:
      node_started, node_completed, run_paused, run_failed, run_completed

    Events are published by the Celery worker to Redis channel 'run:{run_id}'.
    """
    async def event_generator() -> AsyncIterator[str]:
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe(f"run:{run_id}")

        try:
            while True:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message and message["type"] == "message":
                    data = message["data"]
                    yield f"data: {data}\n\n"

                    # Stop streaming once the run reaches a terminal state
                    try:
                        event = json.loads(data)
                        if event.get("type") in {
                            "run_completed", "run_failed", "run_paused"
                        }:
                            yield "data: {\"type\": \"stream_end\"}\n\n"
                            break
                    except json.JSONDecodeError:
                        pass

                await asyncio.sleep(0.05)
        finally:
            await pubsub.unsubscribe(f"run:{run_id}")
            await client.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
