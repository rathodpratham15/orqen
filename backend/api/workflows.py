"""
Workflow CRUD endpoints.
"""
import uuid
from datetime import datetime, timezone
from typing import Annotated

from croniter import croniter as _croniter
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import CurrentUser, DBDep
from database import get_db
from models import Workflow, WorkflowSchedule
from schemas import WorkflowCreate, WorkflowUpdate, WorkflowResponse

router = APIRouter()


def _compute_next_run(cron_expr: str) -> datetime | None:
    try:
        now = datetime.now(timezone.utc)
        return _croniter(cron_expr, now).get_next(datetime)
    except Exception:
        return None


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(body: WorkflowCreate, current_user: CurrentUser, db: DBDep):
    workflow = Workflow(
        name=body.name,
        description=body.description,
        definition=body.definition.model_dump(),
        trigger_config=body.trigger_config.model_dump(),
        user_id=str(current_user.id),
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    if body.trigger_config.type == "cron":
        cron_expr = body.trigger_config.config.get("cron", "0 9 * * *")
        schedule = WorkflowSchedule(
            workflow_id=workflow.id,
            cron_expr=cron_expr,
            timezone=body.trigger_config.config.get("timezone", "UTC"),
            is_active=True,
            next_run_at=_compute_next_run(cron_expr),
        )
        db.add(schedule)
        await db.commit()

    return workflow


@router.get("", response_model=list[WorkflowResponse])
async def list_workflows(current_user: CurrentUser, db: DBDep):
    result = await db.execute(
        select(Workflow)
        .where(Workflow.user_id == str(current_user.id))
        .order_by(Workflow.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: uuid.UUID, current_user: CurrentUser, db: DBDep):
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: uuid.UUID, body: WorkflowUpdate, current_user: CurrentUser, db: DBDep
):
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Workflow not found")

    if body.name is not None:
        wf.name = body.name
    if body.description is not None:
        wf.description = body.description
    if body.definition is not None:
        wf.definition = body.definition.model_dump()
    if body.trigger_config is not None:
        wf.trigger_config = body.trigger_config.model_dump()

        # Sync schedule
        existing = await db.execute(
            select(WorkflowSchedule).where(WorkflowSchedule.workflow_id == workflow_id)
        )
        existing_schedule = existing.scalar_one_or_none()

        if body.trigger_config.type == "cron":
            cron_expr = body.trigger_config.config.get("cron", "0 9 * * *")
            if existing_schedule:
                existing_schedule.cron_expr = cron_expr
                existing_schedule.timezone = body.trigger_config.config.get("timezone", "UTC")
                existing_schedule.is_active = True
                existing_schedule.next_run_at = _compute_next_run(cron_expr)
            else:
                db.add(WorkflowSchedule(
                    workflow_id=wf.id,
                    cron_expr=cron_expr,
                    timezone=body.trigger_config.config.get("timezone", "UTC"),
                    is_active=True,
                    next_run_at=_compute_next_run(cron_expr),
                ))
        else:
            if existing_schedule:
                existing_schedule.is_active = False

    if body.is_active is not None:
        wf.is_active = body.is_active
        if not body.is_active:
            existing = await db.execute(
                select(WorkflowSchedule).where(WorkflowSchedule.workflow_id == workflow_id)
            )
            if s := existing.scalar_one_or_none():
                s.is_active = False

    await db.commit()
    await db.refresh(wf)
    return wf


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(workflow_id: uuid.UUID, current_user: CurrentUser, db: DBDep):
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(wf)
    await db.commit()
