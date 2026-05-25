"""
Memory Node — semantic memory store and retrieval via pgvector.

Uses sentence-transformers (all-MiniLM-L6-v2, 384-dim) to embed text and
store/retrieve it from the agent_memories Postgres table.

This node powers long-term agent memory: write facts during one workflow run,
retrieve relevant context in another.

Config fields
─────────────
  operation   (str, required)   — "store" | "search"
  content     (str)             — text to embed and store   [store only]
  query       (str)             — natural-language search   [search only]
  top_k       (int)             — number of results         [search, default 5]
  collection  (str)             — memory namespace          [both, default "default"]
  metadata    (dict)            — extra metadata to attach  [store only]

Output fields
─────────────
  store:   { memory_id, content, collection }
  search:  { results: [{ id, content, collection, score, metadata }] }
"""
from __future__ import annotations

import asyncio
import functools
import uuid
from typing import Any

from sqlalchemy import select, text

from database import async_session_factory
from models import AgentMemory
from .base import BaseNode, NodeResult

# ─── Embedding model (lazy-loaded once, thread-safe) ─────────────────────────

_model = None
_model_lock = asyncio.Lock()
_SENTENCE_TRANSFORMERS_AVAILABLE: bool | None = None  # None = not yet checked


def _check_sentence_transformers() -> bool:
    """Return True if sentence-transformers is installed."""
    global _SENTENCE_TRANSFORMERS_AVAILABLE
    if _SENTENCE_TRANSFORMERS_AVAILABLE is None:
        try:
            import sentence_transformers  # noqa: F401
            _SENTENCE_TRANSFORMERS_AVAILABLE = True
        except ImportError:
            _SENTENCE_TRANSFORMERS_AVAILABLE = False
    return _SENTENCE_TRANSFORMERS_AVAILABLE


async def _get_model():
    """Load the embedding model on first use (cached for process lifetime)."""
    global _model
    if _model is not None:
        return _model

    async with _model_lock:
        if _model is not None:
            return _model
        # Run synchronous model load in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        _model = await loop.run_in_executor(
            None,
            _load_model_sync,
        )
    return _model


def _load_model_sync():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer("all-MiniLM-L6-v2")


# Zero vector fallback when sentence-transformers is unavailable
_ZERO_VECTOR = [0.0] * 384


async def _embed(text_: str) -> list[float]:
    """
    Embed a string into a 384-dim vector.
    Falls back to a zero vector when sentence-transformers is not installed.
    Note: zero-vector search degrades to returning results in arbitrary order.
    """
    if not _check_sentence_transformers():
        return _ZERO_VECTOR

    model = await _get_model()
    loop = asyncio.get_event_loop()
    embedding = await loop.run_in_executor(
        None,
        functools.partial(model.encode, text_, convert_to_numpy=True),
    )
    return embedding.tolist()


# ─── Public search function (used by AgentNode's search_memory tool) ─────────

async def _semantic_search(
    query: str,
    top_k: int = 5,
    collection: str = "default",
) -> list[dict]:
    """
    Semantic similarity search over agent_memories.
    Returns a list of dicts: { id, content, collection, score, metadata }.
    Lower score = more similar (cosine distance).
    """
    try:
        embedding = await _embed(query)
    except Exception as exc:
        return [{"error": f"Embedding failed: {exc}"}]

    async with async_session_factory() as session:
        # pgvector cosine distance operator: <=>
        result = await session.execute(
            text("""
                SELECT id, content, collection, metadata,
                       (embedding <=> :emb::vector) AS score
                FROM agent_memories
                WHERE collection = :col
                ORDER BY embedding <=> :emb::vector
                LIMIT :k
            """),
            {
                "emb": str(embedding),
                "col": collection,
                "k":   top_k,
            },
        )
        rows = result.fetchall()

    return [
        {
            "id":         str(row.id),
            "content":    row.content,
            "collection": row.collection,
            "score":      float(row.score),
            "metadata":   row.metadata or {},
        }
        for row in rows
    ]


# ─── MemoryNode ───────────────────────────────────────────────────────────────

class MemoryNode(BaseNode):
    """
    Store text in semantic memory or retrieve similar memories.
    """
    node_type = "memory"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        operation  = config.get("operation", "search").lower()
        collection = config.get("collection", "default")

        if operation == "store":
            return await self._store(config, context, collection)
        elif operation == "search":
            return await self._search(config, collection)
        else:
            return NodeResult.failure(
                f"MemoryNode: unknown operation {operation!r}. Use 'store' or 'search'."
            )

    async def _store(
        self,
        config: dict[str, Any],
        context,
        collection: str,
    ) -> NodeResult:
        content = config.get("content", "").strip()
        if not content:
            return NodeResult.failure("MemoryNode store requires non-empty 'content'")

        extra_meta = config.get("metadata", {})

        try:
            embedding = await _embed(content)
        except Exception as exc:
            return NodeResult.failure(f"Embedding model error: {exc}")

        memory = AgentMemory(
            id=uuid.uuid4(),
            collection=collection,
            workflow_id=context.workflow_id,
            run_id=context.run_id,
            content=content,
            embedding=embedding,
            metadata_={
                **extra_meta,
                "workflow_id": context.workflow_id,
                "run_id":      context.run_id,
            },
        )

        try:
            async with async_session_factory() as session:
                session.add(memory)
                await session.commit()
        except Exception as exc:
            return NodeResult.failure(f"Failed to store memory: {exc}")

        return NodeResult.success(
            output={
                "memory_id":  str(memory.id),
                "content":    content,
                "collection": collection,
            },
            metadata={"operation": "store"},
        )

    async def _search(
        self,
        config: dict[str, Any],
        collection: str,
    ) -> NodeResult:
        query = config.get("query", "").strip()
        if not query:
            return NodeResult.failure("MemoryNode search requires non-empty 'query'")

        top_k = int(config.get("top_k", 5))

        try:
            results = await _semantic_search(query, top_k=top_k, collection=collection)
        except Exception as exc:
            return NodeResult.failure(f"Memory search failed: {exc}")

        return NodeResult.success(
            output={"results": results, "query": query, "top_k": top_k},
            metadata={"operation": "search", "count": len(results)},
        )

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        op = config.get("operation", "search")
        if op not in ("store", "search"):
            errors.append("operation must be 'store' or 'search'")
        if op == "store" and not config.get("content"):
            errors.append("store operation requires 'content'")
        if op == "search" and not config.get("query"):
            errors.append("search operation requires 'query'")
        return errors
