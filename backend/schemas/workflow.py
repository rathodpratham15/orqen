"""
Pydantic v2 request/response schemas.
Keeps API contracts explicit and separate from ORM models.
"""
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict


# ─── Workflow Definition ──────────────────────────────────────────────────────

class NodeDefinition(BaseModel):
    """A single node in the visual workflow graph."""
    id: str
    type: str                               # llm | http | condition | approval | code | delay
    label: str = ""
    config: dict[str, Any] = Field(default_factory=dict)
    position: dict[str, float] = Field(default_factory=dict)  # { x, y } for canvas


class EdgeDefinition(BaseModel):
    """A directed connection between two nodes."""
    id: str
    source: str                             # node id
    target: str                             # node id
    condition: str | None = None            # "true" | "false" | None (unconditional)


class WorkflowDefinition(BaseModel):
    """The complete graph stored in workflows.definition."""
    nodes: list[NodeDefinition] = Field(default_factory=list)
    edges: list[EdgeDefinition] = Field(default_factory=list)


class TriggerConfig(BaseModel):
    type: Literal["manual", "webhook", "cron"] = "manual"
    config: dict[str, Any] = Field(default_factory=dict)


# ─── Workflow CRUD ────────────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    definition: WorkflowDefinition = Field(default_factory=WorkflowDefinition)
    trigger_config: TriggerConfig = Field(default_factory=TriggerConfig)


class WorkflowUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    definition: WorkflowDefinition | None = None
    trigger_config: TriggerConfig | None = None
    is_active: bool | None = None


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    definition: dict
    trigger_config: dict
    user_id: str
    org_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ─── Run Trigger ─────────────────────────────────────────────────────────────

class TriggerRunRequest(BaseModel):
    """Payload for manually triggering a workflow run."""
    trigger_data: dict[str, Any] = Field(
        default_factory=dict,
        description="Input data passed to the run as {{ trigger.field }}"
    )


# ─── Run + Node Execution ─────────────────────────────────────────────────────

class NodeExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    node_id: str
    node_type: str
    status: str
    input: dict
    output: dict | None
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: int | None
    tokens_used: int
    retry_count: int
    error: str | None
    trace_id: str | None


class WorkflowRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_id: uuid.UUID
    status: str
    trigger_type: str
    trigger_data: dict
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: int | None
    total_tokens: int
    estimated_cost_usd: float | None
    error: str | None
    created_at: datetime
    node_executions: list[NodeExecutionResponse] = Field(default_factory=list)


# ─── Approvals ────────────────────────────────────────────────────────────────

class ApprovalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    run_id: uuid.UUID
    node_id: str
    status: str
    message: str
    context: dict
    created_at: datetime
    resolved_at: datetime | None
    resolved_by: str | None
    expires_at: datetime | None


class ResolveApprovalRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    comment: str | None = None
