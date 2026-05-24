"""
Base node abstraction and NodeResult dataclass.

Every node type inherits from BaseNode and implements execute().
The executor calls execute(), gets a NodeResult, and decides what to do next
based on the status field.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from engine.context import ExecutionContext


class NodeStatus(str, Enum):
    PENDING  = "pending"
    RUNNING  = "running"
    SUCCESS  = "success"
    FAILED   = "failed"
    SKIPPED  = "skipped"
    PAUSED   = "paused"     # approval node — run pauses here


@dataclass
class NodeResult:
    """
    The output of a single node execution.

    status      — what happened
    output      — data passed to downstream nodes via ExecutionContext
    error       — human-readable error message (set on FAILED)
    tokens_used — LLM token count (0 for non-LLM nodes)
    metadata    — extra info (model name, branch taken, http status, etc.)
    """
    status: NodeStatus
    output: dict[str, Any]       = field(default_factory=dict)
    error: str | None            = None
    tokens_used: int             = 0
    metadata: dict[str, Any]     = field(default_factory=dict)

    @classmethod
    def success(
        cls,
        output: dict[str, Any],
        tokens_used: int = 0,
        metadata: dict[str, Any] | None = None,
    ) -> "NodeResult":
        return cls(
            status=NodeStatus.SUCCESS,
            output=output,
            tokens_used=tokens_used,
            metadata=metadata or {},
        )

    @classmethod
    def failure(cls, error: str, metadata: dict[str, Any] | None = None) -> "NodeResult":
        return cls(
            status=NodeStatus.FAILED,
            error=error,
            metadata=metadata or {},
        )

    @classmethod
    def paused(cls, output: dict[str, Any]) -> "NodeResult":
        return cls(status=NodeStatus.PAUSED, output=output)


class BaseNode(ABC):
    """
    Abstract base for all Orqen node types.

    Subclasses must:
      - Set `node_type` class attribute (must match the string in the workflow definition)
      - Implement `execute(config, context) -> NodeResult`
    """
    node_type: str = "base"

    @abstractmethod
    async def execute(
        self,
        config: dict[str, Any],
        context: "ExecutionContext",
    ) -> NodeResult:
        """
        Run the node.

        Args:
            config:  The node's configuration dict from the workflow definition,
                     with all {{ template }} vars already resolved.
            context: The shared run context — read prior node outputs from here.

        Returns:
            NodeResult with status SUCCESS, FAILED, or PAUSED.
        """

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        """
        Return a list of validation error strings.
        Called at workflow save time, not at execution time.
        Override to add node-specific validation.
        """
        return []
