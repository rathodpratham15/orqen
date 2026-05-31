"""
Schedule management — list, toggle, and delete cron schedules.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from api.deps import CurrentUser, DBDep
from models import Workflow, WorkflowSchedule
from schemas import WorkflowScheduleResponse

router = APIRouter()

@router.get("", response_model=list[WorkflowScheduleResponse])
async def list_schedules(current_user: CurrentUser, db: DBDep):
    result = await db.execute(
        select(WorkflowSchedule)
        .join(Workflow)
        .where(Workflow.user_id == str(current_user.id))
        .options(selectinload(WorkflowSchedule.workflow))
        .order_by(WorkflowSchedule.next_run_at.asc().nullslast())
    )
    schedules = result.scalars().all()
    # Build response manually so we can embed workflow_name
    out = []
    for s in schedules:
        out.append(WorkflowScheduleResponse(
            id=s.id,
            workflow_id=s.workflow_id,
            workflow_name=s.workflow.name if s.workflow else "",
            cron_expr=s.cron_expr,
            timezone=s.timezone,
            is_active=s.is_active,
            last_run_at=s.last_run_at,
            next_run_at=s.next_run_at,
            created_at=s.created_at,
        ))
    return out

@router.patch("/{schedule_id}/toggle", response_model=WorkflowScheduleResponse)
async def toggle_schedule(schedule_id: uuid.UUID, current_user: CurrentUser, db: DBDep):
    result = await db.execute(
        select(WorkflowSchedule)
        .join(Workflow)
        .where(WorkflowSchedule.id == schedule_id, Workflow.user_id == str(current_user.id))
        .options(selectinload(WorkflowSchedule.workflow))
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    schedule.is_active = not schedule.is_active
    await db.commit()
    await db.refresh(schedule)
    return WorkflowScheduleResponse(
        id=schedule.id,
        workflow_id=schedule.workflow_id,
        workflow_name=schedule.workflow.name if schedule.workflow else "",
        cron_expr=schedule.cron_expr,
        timezone=schedule.timezone,
        is_active=schedule.is_active,
        last_run_at=schedule.last_run_at,
        next_run_at=schedule.next_run_at,
        created_at=schedule.created_at,
    )

@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: uuid.UUID, current_user: CurrentUser, db: DBDep):
    result = await db.execute(
        select(WorkflowSchedule)
        .join(Workflow)
        .where(WorkflowSchedule.id == schedule_id, Workflow.user_id == str(current_user.id))
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await db.delete(schedule)
    await db.commit()
