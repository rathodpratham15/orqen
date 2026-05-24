"""
Approval endpoints — human-in-the-loop pause/resume.

Flow:
  1. ApprovalNode fires → run pauses → ApprovalRequest row created
  2. GET /api/approvals/pending  → user sees pending approvals
  3. POST /api/approvals/:id/resolve  → user approves or rejects
  4. On approve → resume_workflow_task.delay(run_id, approval_node_id)
  5. On reject  → run marked failed with rejection reason
"""
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import ApprovalRequest, WorkflowRun
from schemas import ApprovalRequestResponse, ResolveApprovalRequest
from engine.executor import resume_workflow_task

router = APIRouter()


def get_current_user_id() -> str:
    return "dev-user"

UserDep = Annotated[str, Depends(get_current_user_id)]
DBDep   = Annotated[AsyncSession, Depends(get_db)]


@router.get("/pending", response_model=list[ApprovalRequestResponse])
async def list_pending_approvals(user_id: UserDep, db: DBDep):
    """Return all pending approval requests for the current user."""
    result = await db.execute(
        select(ApprovalRequest)
        .where(ApprovalRequest.status == "pending")
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{approval_id}", response_model=ApprovalRequestResponse)
async def get_approval(approval_id: uuid.UUID, db: DBDep):
    approval = await db.get(ApprovalRequest, approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return approval


@router.post("/{approval_id}/resolve", response_model=ApprovalRequestResponse)
async def resolve_approval(
    approval_id: uuid.UUID,
    body: ResolveApprovalRequest,
    user_id: UserDep,
    db: DBDep,
):
    """
    Approve or reject a paused workflow run.

    - approved → resume_workflow_task.delay(run_id, node_id)
    - rejected → mark run as failed with rejection reason
    """
    approval = await db.get(ApprovalRequest, approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if approval.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Approval already resolved with status: {approval.status!r}"
        )

    # Check expiry
    if approval.expires_at and datetime.now(timezone.utc) > approval.expires_at:
        approval.status = "expired"
        await db.commit()
        raise HTTPException(status_code=400, detail="Approval request has expired")

    # Update approval record
    approval.status      = body.decision
    approval.resolved_at = datetime.now(timezone.utc)
    approval.resolved_by = user_id
    if body.comment:
        approval.context = {**approval.context, "comment": body.comment}

    run = await db.get(WorkflowRun, approval.run_id)
    if not run:
        await db.commit()
        raise HTTPException(status_code=404, detail="Workflow run not found")

    if body.decision == "approved":
        run.status = "queued"
        await db.commit()
        # Re-enqueue from the node after the approval
        resume_workflow_task.delay(str(run.id), approval.node_id)
    else:
        # Rejected — fail the run
        run.status       = "failed"
        run.error        = f"Rejected by {user_id}: {body.comment or 'No reason given'}"
        run.finished_at  = datetime.now(timezone.utc)
        await db.commit()

    return approval
