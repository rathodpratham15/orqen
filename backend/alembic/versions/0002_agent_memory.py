"""agent_memory: add agent_memories table with pgvector embedding

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure pgvector extension is available
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "agent_memories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "collection",
            sa.String(255),
            nullable=False,
            server_default="default",
        ),
        sa.Column("workflow_id", sa.String(255), nullable=True),
        sa.Column("run_id", sa.String(255), nullable=True),
        sa.Column("content", sa.Text, nullable=False),
        # 384-dim vector from all-MiniLM-L6-v2
        sa.Column(
            "embedding",
            sa.Text,  # stored as text; pgvector cast handles the rest
            nullable=True,
        ),
        sa.Column("metadata", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Indexes for fast lookup
    op.create_index("ix_agent_memories_collection", "agent_memories", ["collection"])
    op.create_index("ix_agent_memories_workflow_id", "agent_memories", ["workflow_id"])
    op.create_index("ix_agent_memories_run_id", "agent_memories", ["run_id"])

    # pgvector HNSW index for approximate nearest-neighbour search
    # Cosine distance is best for normalized sentence-transformer embeddings
    op.execute("""
        ALTER TABLE agent_memories
        ALTER COLUMN embedding TYPE vector(384)
        USING embedding::vector(384)
    """)
    op.execute("""
        CREATE INDEX ix_agent_memories_embedding_hnsw
        ON agent_memories
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)


def downgrade() -> None:
    op.drop_table("agent_memories")
