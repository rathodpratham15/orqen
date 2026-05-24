"""
SQLAlchemy ORM models for Orqen.

Core tables:
  workflows          — saved workflow definitions (nodes + edges as JSONB)
  workflow_runs      — each execution instance with full state
  node_executions    — per-node execution records within a run
  approval_requests  — human-in-the-loop pause/resume
  workflow_schedules — cron trigger config
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, ForeignKey, Integer, Numeric,
    String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid() -> uuid.UUID:
    return uuid.uuid4()

def _now() -> datetime:
    return datetime.now(timezone.utc)


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # The visual graph: { nodes: [...], edges: [...] }
    definition: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # How this workflow gets triggered: { type: 'manual'|'webhook'|'cron', config: {...} }
    trigger_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Ownership
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    org_id: Mapped[str | None] = mapped_column(String(255), index=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)

    # Relationships
    runs: Mapped[list["WorkflowRun"]] = relationship(
        "WorkflowRun", back_populates="workflow", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["WorkflowSchedule"]] = relationship(
        "WorkflowSchedule", back_populates="workflow", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Workflow id={self.id} name={self.name!r}>"


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )

    # State machine: pending → queued → running → success | failed | paused | cancelled
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)

    # What triggered this run
    trigger_type: Mapped[str] = mapped_column(String(50), default="manual")
    trigger_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Serialized ExecutionContext — used to resume paused runs
    context: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Internal metadata (paused_at_node, resume_from, etc.)
    run_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Observability aggregates
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_usd: Mapped[float | None] = mapped_column(
        Numeric(10, 6), nullable=True
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=_now)

    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="runs")
    node_executions: Mapped[list["NodeExecution"]] = relationship(
        "NodeExecution", back_populates="run", cascade="all, delete-orphan",
        order_by="NodeExecution.started_at"
    )
    approval_requests: Mapped[list["ApprovalRequest"]] = relationship(
        "ApprovalRequest", back_populates="run", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<WorkflowRun id={self.id} status={self.status!r}>"


class NodeExecution(Base):
    __tablename__ = "node_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), index=True
    )

    node_id: Mapped[str] = mapped_column(String(255), nullable=False)
    node_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # pending | running | success | failed | skipped | paused
    status: Mapped[str] = mapped_column(String(50), default="pending")

    # What was passed in (resolved config + context snapshot)
    input: Mapped[dict] = mapped_column(JSONB, default=dict)
    # What the node produced
    output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Distributed trace ID for correlating with external observability tools
    trace_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    run: Mapped["WorkflowRun"] = relationship(
        "WorkflowRun", back_populates="node_executions"
    )

    def __repr__(self) -> str:
        return f"<NodeExecution node={self.node_id!r} status={self.status!r}>"


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), index=True
    )
    node_id: Mapped[str] = mapped_column(String(255), nullable=False)

    # pending | approved | rejected | expired
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)

    # What the user sees when deciding
    message: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(default=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    run: Mapped["WorkflowRun"] = relationship(
        "WorkflowRun", back_populates="approval_requests"
    )

    def __repr__(self) -> str:
        return f"<ApprovalRequest id={self.id} status={self.status!r}>"


class WorkflowSchedule(Base):
    __tablename__ = "workflow_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=_uuid
    )
    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), index=True
    )

    cron_expr: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "0 9 * * MON-FRI"
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    last_run_at: Mapped[datetime | None] = mapped_column(nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(default=_now)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="schedules")
