"""
Workflow CRUD endpoints.
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Workflow
from schemas import WorkflowCreate, WorkflowUpdate, WorkflowResponse

router = APIRouter()

# TODO: replace with real Clerk auth dependency
def get_current_user_id() -> str:
    return "dev-user"

UserDep = Annotated[str, Depends(get_current_user_id)]
DBDep   = Annotated[AsyncSession, Depends(get_db)]


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(body: WorkflowCreate, user_id: UserDep, db: DBDep):
    workflow = Workflow(
        name=body.name,
        description=body.description,
        definition=body.definition.model_dump(),
        trigger_config=body.trigger_config.model_dump(),
        user_id=user_id,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow


@router.get("", response_model=list[WorkflowResponse])
async def list_workflows(user_id: UserDep, db: DBDep):
    result = await db.execute(
        select(Workflow)
        .where(Workflow.user_id == user_id)
        .order_by(Workflow.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: uuid.UUID, user_id: UserDep, db: DBDep):
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != user_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: uuid.UUID, body: WorkflowUpdate, user_id: UserDep, db: DBDep
):
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != user_id:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if body.name is not None:
        wf.name = body.name
    if body.description is not None:
        wf.description = body.description
    if body.definition is not None:
        wf.definition = body.definition.model_dump()
    if body.trigger_config is not None:
        wf.trigger_config = body.trigger_config.model_dump()
    if body.is_active is not None:
        wf.is_active = body.is_active

    await db.commit()
    await db.refresh(wf)
    return wf


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(workflow_id: uuid.UUID, user_id: UserDep, db: DBDep):
    wf = await db.get(Workflow, workflow_id)
    if not wf or wf.user_id != user_id:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(wf)
    await db.commit()
