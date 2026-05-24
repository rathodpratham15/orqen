"""
Analytics endpoints — aggregate stats for the observability dashboard.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Workflow, WorkflowRun

router = APIRouter()

DBDep = Annotated[AsyncSession, Depends(get_db)]


def get_current_user_id() -> str:
    return "dev-user"


@router.get("/stats")
async def get_stats(db: DBDep):
    """
    Aggregate metrics across all runs for the current user.

    Returns:
      - Run counts broken down by status
      - Total tokens consumed and estimated cost
      - Runs created in the last 24h
      - Average duration of successful runs (ms)
      - Top 5 workflows by token usage
    """
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)

    # ── Run counts by status ──────────────────────────────────────────────────
    status_counts_q = await db.execute(
        select(WorkflowRun.status, func.count().label("count"))
        .join(Workflow)
        .where(Workflow.user_id == "dev-user")
        .group_by(WorkflowRun.status)
    )
    status_rows = status_counts_q.all()
    by_status: dict[str, int] = {row.status: row.count for row in status_rows}

    total_runs = sum(by_status.values())
    successful  = by_status.get("success", 0)
    success_rate = round(successful / total_runs * 100, 1) if total_runs else 0.0

    # ── Token + cost totals ───────────────────────────────────────────────────
    totals_q = await db.execute(
        select(
            func.coalesce(func.sum(WorkflowRun.total_tokens), 0).label("tokens"),
            func.coalesce(func.sum(WorkflowRun.estimated_cost_usd), 0.0).label("cost"),
        )
        .join(Workflow)
        .where(Workflow.user_id == "dev-user")
    )
    totals = totals_q.one()

    # ── Runs in last 24 h ─────────────────────────────────────────────────────
    recent_count_q = await db.execute(
        select(func.count())
        .select_from(WorkflowRun)
        .join(Workflow)
        .where(
            Workflow.user_id == "dev-user",
            WorkflowRun.created_at >= since_24h,
        )
    )
    runs_last_24h = recent_count_q.scalar() or 0

    # ── Average duration of successful runs ───────────────────────────────────
    avg_dur_q = await db.execute(
        select(func.avg(WorkflowRun.duration_ms))
        .join(Workflow)
        .where(
            Workflow.user_id == "dev-user",
            WorkflowRun.status == "success",
            WorkflowRun.duration_ms.isnot(None),
        )
    )
    avg_duration_ms = avg_dur_q.scalar()

    # ── Top 5 workflows by token usage ────────────────────────────────────────
    top_q = await db.execute(
        select(
            Workflow.id.label("workflow_id"),
            Workflow.name.label("workflow_name"),
            func.count(WorkflowRun.id).label("run_count"),
            func.coalesce(func.sum(WorkflowRun.total_tokens), 0).label("tokens"),
            func.coalesce(func.sum(WorkflowRun.estimated_cost_usd), 0.0).label("cost"),
            func.sum(
                case((WorkflowRun.status == "success", 1), else_=0)
            ).label("successes"),
        )
        .join(WorkflowRun, WorkflowRun.workflow_id == Workflow.id, isouter=True)
        .where(Workflow.user_id == "dev-user")
        .group_by(Workflow.id, Workflow.name)
        .order_by(func.coalesce(func.sum(WorkflowRun.total_tokens), 0).desc())
        .limit(5)
    )
    top_workflows = [
        {
            "workflow_id":   str(row.workflow_id),
            "workflow_name": row.workflow_name,
            "run_count":     row.run_count,
            "tokens":        int(row.tokens),
            "cost_usd":      round(float(row.cost), 6),
            "success_rate":  round(row.successes / row.run_count * 100, 1) if row.run_count else 0.0,
        }
        for row in top_q.all()
    ]

    return {
        "total_runs":       total_runs,
        "runs_last_24h":    runs_last_24h,
        "success_rate":     success_rate,
        "total_tokens":     int(totals.tokens),
        "total_cost_usd":   round(float(totals.cost), 6),
        "avg_duration_ms":  round(float(avg_duration_ms)) if avg_duration_ms else None,
        "by_status":        by_status,
        "top_workflows":    top_workflows,
    }


@router.get("/runs-over-time")
async def runs_over_time(db: DBDep, days: int = 7):
    """
    Daily run counts for the past N days, split by success/failed.
    Used to render the sparkline / bar chart on the dashboard.
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    rows_q = await db.execute(
        select(
            func.date_trunc("day", WorkflowRun.created_at).label("day"),
            WorkflowRun.status,
            func.count().label("count"),
        )
        .join(Workflow)
        .where(
            Workflow.user_id == "dev-user",
            WorkflowRun.created_at >= since,
        )
        .group_by("day", WorkflowRun.status)
        .order_by("day")
    )

    # Build a map keyed by ISO date string
    by_day: dict[str, dict] = {}
    for row in rows_q.all():
        day_str = row.day.date().isoformat()
        if day_str not in by_day:
            by_day[day_str] = {"date": day_str, "success": 0, "failed": 0, "total": 0}
        by_day[day_str][row.status] = by_day[day_str].get(row.status, 0) + row.count
        by_day[day_str]["total"] += row.count

    # Fill in missing days with zeros so the chart is continuous
    result = []
    for i in range(days):
        day = (now - timedelta(days=days - 1 - i)).date().isoformat()
        result.append(by_day.get(day, {"date": day, "success": 0, "failed": 0, "total": 0}))

    return result
