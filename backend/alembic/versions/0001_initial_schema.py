"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-23

Creates all Orqen tables:
  workflows, workflow_runs, node_executions, approval_requests, workflow_schedules
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension (needed for future memory features)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── workflows ──────────────────────────────────────────────────────────────
    op.create_table(
        "workflows",
        sa.Column("id",             UUID(as_uuid=True), primary_key=True),
        sa.Column("name",           sa.String(255),     nullable=False),
        sa.Column("description",    sa.Text,            nullable=True),
        sa.Column("definition",     JSONB,              nullable=False, server_default="{}"),
        sa.Column("trigger_config", JSONB,              nullable=False, server_default="{}"),
        sa.Column("user_id",        sa.String(255),     nullable=False),
        sa.Column("org_id",         sa.String(255),     nullable=True),
        sa.Column("is_active",      sa.Boolean,         nullable=False, server_default="true"),
        sa.Column("created_at",     sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at",     sa.TIMESTAMP(timezone=True), nullable=False),
    )
    op.create_index("ix_workflows_user_id", "workflows", ["user_id"])
    op.create_index("ix_workflows_org_id",  "workflows", ["org_id"])

    # ── workflow_runs ─────────────────────────────────────────────────────────
    op.create_table(
        "workflow_runs",
        sa.Column("id",                  UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_id",         UUID(as_uuid=True), sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status",              sa.String(50),  nullable=False, server_default="pending"),
        sa.Column("trigger_type",        sa.String(50),  nullable=False, server_default="manual"),
        sa.Column("trigger_data",        JSONB,          nullable=False, server_default="{}"),
        sa.Column("context",             JSONB,          nullable=False, server_default="{}"),
        sa.Column("run_metadata",        JSONB,          nullable=False, server_default="{}"),
        sa.Column("started_at",          sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("finished_at",         sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("duration_ms",         sa.Integer,     nullable=True),
        sa.Column("total_tokens",        sa.Integer,     nullable=False, server_default="0"),
        sa.Column("estimated_cost_usd",  sa.Numeric(10, 6), nullable=True),
        sa.Column("error",               sa.Text,        nullable=True),
        sa.Column("created_at",          sa.TIMESTAMP(timezone=True), nullable=False),
    )
    op.create_index("ix_workflow_runs_workflow_id", "workflow_runs", ["workflow_id"])
    op.create_index("ix_workflow_runs_status",      "workflow_runs", ["status"])

    # ── node_executions ───────────────────────────────────────────────────────
    op.create_table(
        "node_executions",
        sa.Column("id",          UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id",      UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id",     sa.String(255), nullable=False),
        sa.Column("node_type",   sa.String(50),  nullable=False),
        sa.Column("status",      sa.String(50),  nullable=False, server_default="pending"),
        sa.Column("input",       JSONB,          nullable=False, server_default="{}"),
        sa.Column("output",      JSONB,          nullable=True),
        sa.Column("started_at",  sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("finished_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer,     nullable=True),
        sa.Column("tokens_used", sa.Integer,     nullable=False, server_default="0"),
        sa.Column("retry_count", sa.Integer,     nullable=False, server_default="0"),
        sa.Column("error",       sa.Text,        nullable=True),
        sa.Column("trace_id",    sa.String(255), nullable=True),
    )
    op.create_index("ix_node_executions_run_id", "node_executions", ["run_id"])

    # ── approval_requests ─────────────────────────────────────────────────────
    op.create_table(
        "approval_requests",
        sa.Column("id",          UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id",      UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id",     sa.String(255), nullable=False),
        sa.Column("status",      sa.String(50),  nullable=False, server_default="pending"),
        sa.Column("message",     sa.Text,        nullable=False),
        sa.Column("context",     JSONB,          nullable=False, server_default="{}"),
        sa.Column("created_at",  sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.String(255), nullable=True),
        sa.Column("expires_at",  sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_approval_requests_run_id", "approval_requests", ["run_id"])
    op.create_index("ix_approval_requests_status", "approval_requests", ["status"])

    # ── workflow_schedules ────────────────────────────────────────────────────
    op.create_table(
        "workflow_schedules",
        sa.Column("id",          UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_id", UUID(as_uuid=True), sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cron_expr",   sa.String(100), nullable=False),
        sa.Column("timezone",    sa.String(50),  nullable=False, server_default="UTC"),
        sa.Column("is_active",   sa.Boolean,     nullable=False, server_default="true"),
        sa.Column("last_run_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at",  sa.TIMESTAMP(timezone=True), nullable=False),
    )
    op.create_index("ix_workflow_schedules_workflow_id", "workflow_schedules", ["workflow_id"])
    op.create_index("ix_workflow_schedules_next_run_at", "workflow_schedules", ["next_run_at"])


def downgrade() -> None:
    op.drop_table("workflow_schedules")
    op.drop_table("approval_requests")
    op.drop_table("node_executions")
    op.drop_table("workflow_runs")
    op.drop_table("workflows")
