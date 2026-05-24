"""
Node registry — maps node type strings to their executor classes.

To add a new node type:
  1. Create nodes/my_node.py with class MyNode(BaseNode): node_type = "my_node"
  2. Import it here and add it to NODE_REGISTRY

The executor looks up NODE_REGISTRY[node.type] at runtime.
"""
from .base import BaseNode, NodeResult, NodeStatus
from .llm_node import LLMNode
from .http_node import HTTPNode
from .condition_node import ConditionNode
from .approval_node import ApprovalNode

NODE_REGISTRY: dict[str, type[BaseNode]] = {
    "llm":       LLMNode,
    "http":      HTTPNode,
    "condition": ConditionNode,
    "approval":  ApprovalNode,
}

__all__ = [
    "NODE_REGISTRY",
    "BaseNode",
    "NodeResult",
    "NodeStatus",
    "LLMNode",
    "HTTPNode",
    "ConditionNode",
    "ApprovalNode",
]
