"""
Public webhook receiver — POST /api/webhooks/{workflow_id}

No authentication required. The workflow_id in the URL acts as the secret.
The workflow must have trigger_config.type == "webhook" and be active.
"""
import uuid
from fastapi import APIRouter, HTTPException, Request, status
from api.deps import DBDep
from models import Workflow, WorkflowRun
from engine.executor import execute_workflow_task

router = APIRouter()

@router.post("/{workflow_id}", status_code=status.HTTP_202_ACCEPTED)
async def receive_webhook(workflow_id: uuid.UUID, request: Request, db: DBDep):
    wf = await db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not wf.is_active:
        raise HTTPException(status_code=409, detail="Workflow is not active")
    if wf.trigger_config.get("type") != "webhook":
        raise HTTPException(status_code=400, detail="Workflow is not configured for webhook triggers")

    try:
        body = await request.json()
    except Exception:
        body = {}

    trigger_data = {
        "body": body,
        "query": dict(request.query_params),
        "headers": {k: v for k, v in request.headers.items() if k.lower() not in ("authorization", "cookie")},
    }

    run = WorkflowRun(
        id=uuid.uuid4(),
        workflow_id=wf.id,
        status="queued",
        trigger_type="webhook",
        trigger_data=trigger_data,
    )
    db.add(run)
    await db.commit()

    execute_workflow_task.delay(str(run.id))

    return {"run_id": str(run.id), "status": "queued", "workflow_id": str(wf.id)}
