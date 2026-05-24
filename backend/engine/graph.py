"""
Workflow Graph — DAG representation and traversal.

The workflow definition (stored as JSONB) is parsed into a WorkflowGraph.
We use Kahn's algorithm for topological sort and track conditional edges
so the executor can follow the correct branch after a ConditionNode.

Design notes:
- Cycles are detected and rejected at parse time
- Entry nodes are those with no incoming edges (can be multiple)
- Conditional edges carry a label ("true" | "false"); unconditional edges are None
- The graph is immutable after construction — all mutation lives in ExecutionContext
"""
from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class GraphNode:
    """Immutable representation of a single workflow node."""
    id: str
    type: str                            # llm | http | condition | approval | code | delay
    config: dict[str, Any]
    label: str = ""

    def __hash__(self) -> int:
        return hash(self.id)


@dataclass(frozen=True)
class GraphEdge:
    """Directed connection between two nodes, with an optional branch condition."""
    source: str                          # node id
    target: str                          # node id
    condition: str | None = None         # "true" | "false" | None (always follow)


@dataclass
class WorkflowGraph:
    """
    Parsed, validated workflow graph.

    Attributes:
        nodes       — id → GraphNode lookup
        edges       — all edges in the graph
        out_edges   — source_id → [GraphEdge]  (outgoing edges per node)
        in_edges    — target_id → [GraphEdge]  (incoming edges per node)
    """
    nodes: dict[str, GraphNode]
    edges: list[GraphEdge]
    out_edges: dict[str, list[GraphEdge]] = field(default_factory=dict)
    in_edges: dict[str, list[GraphEdge]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.out_edges = defaultdict(list)
        self.in_edges = defaultdict(list)
        for edge in self.edges:
            self.out_edges[edge.source].append(edge)
            self.in_edges[edge.target].append(edge)

    # ─── Factory ──────────────────────────────────────────────────────────────

    @classmethod
    def from_definition(cls, definition: dict[str, Any]) -> "WorkflowGraph":
        """
        Parse a workflow definition dict into a validated WorkflowGraph.
        Raises ValueError if the graph contains a cycle or references unknown nodes.
        """
        raw_nodes: list[dict] = definition.get("nodes", [])
        raw_edges: list[dict] = definition.get("edges", [])

        nodes: dict[str, GraphNode] = {
            n["id"]: GraphNode(
                id=n["id"],
                type=n["type"],
                config=n.get("config", {}),
                label=n.get("label", ""),
            )
            for n in raw_nodes
        }

        edges: list[GraphEdge] = []
        for e in raw_edges:
            source, target = e["source"], e["target"]
            if source not in nodes:
                raise ValueError(f"Edge references unknown source node: {source!r}")
            if target not in nodes:
                raise ValueError(f"Edge references unknown target node: {target!r}")
            edges.append(GraphEdge(
                source=source,
                target=target,
                condition=e.get("condition"),
            ))

        graph = cls(nodes=nodes, edges=edges)
        graph._validate_no_cycles()
        return graph

    # ─── Traversal helpers ───────────────────────────────────────────────────

    def entry_nodes(self) -> list[str]:
        """Return node IDs with no incoming edges (workflow start points)."""
        nodes_with_incoming = set(self.in_edges.keys())
        return [nid for nid in self.nodes if nid not in nodes_with_incoming]

    def next_nodes(self, node_id: str, branch: str | None = None) -> list[str]:
        """
        Return the node IDs to execute after `node_id` completes.

        Args:
            node_id: The node that just finished.
            branch:  The branch taken ("true"/"false" for condition nodes, None otherwise).

        Logic:
            - Unconditional edges (condition=None) are always followed.
            - Conditional edges are followed only when their label matches `branch`.
        """
        result: list[str] = []
        for edge in self.out_edges.get(node_id, []):
            if edge.condition is None:
                result.append(edge.target)
            elif branch is not None and edge.condition == branch:
                result.append(edge.target)
        return result

    def topological_order(self) -> list[str]:
        """
        Return all node IDs in a valid execution order (Kahn's algorithm).
        Useful for static analysis and validation; the executor uses dynamic
        traversal via next_nodes() to respect runtime branching.
        """
        in_degree: dict[str, int] = defaultdict(int)
        for edge in self.edges:
            in_degree[edge.target] += 1

        queue: deque[str] = deque(
            nid for nid in self.nodes if in_degree[nid] == 0
        )
        order: list[str] = []

        while queue:
            nid = queue.popleft()
            order.append(nid)
            for edge in self.out_edges.get(nid, []):
                in_degree[edge.target] -= 1
                if in_degree[edge.target] == 0:
                    queue.append(edge.target)

        return order  # length check done in _validate_no_cycles

    # ─── Validation ──────────────────────────────────────────────────────────

    def _validate_no_cycles(self) -> None:
        """Raise ValueError if the graph contains a cycle."""
        order = self.topological_order()
        if len(order) != len(self.nodes):
            raise ValueError(
                "Workflow contains a cycle. Orqen only supports DAG workflows."
            )

    # ─── Debug ───────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"<WorkflowGraph nodes={len(self.nodes)} edges={len(self.edges)} "
            f"entry={self.entry_nodes()}>"
        )
