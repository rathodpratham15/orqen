"""
Execution Context — shared state passed between nodes in a run.

Key responsibilities:
  1. Store each node's output so downstream nodes can reference it
  2. Resolve {{ template }} variables in node configs before execution
  3. Serialize/deserialize for pause-and-resume across Celery task restarts

Variable syntax (resolved in node configs before execution):
  {{ trigger.field }}         — value from the run's trigger_data
  {{ node_id.output_field }}  — output field from a previous node
  {{ variables.key }}         — manually set workflow-level variables

Examples:
  "Summarize this: {{ search_node.text }}"
  "Send to: {{ trigger.email }}"
"""
from __future__ import annotations

import re
from typing import Any


_TEMPLATE_RE = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


class ExecutionContext:
    """
    Mutable shared state for a single workflow run.
    Passed to every node executor; serialized into WorkflowRun.context on pause.
    """

    def __init__(
        self,
        run_id: str,
        workflow_id: str,
        trigger_data: dict[str, Any] | None = None,
    ) -> None:
        self.run_id = run_id
        self.workflow_id = workflow_id
        self.trigger_data: dict[str, Any] = trigger_data or {}
        self.node_outputs: dict[str, Any] = {}   # node_id → output dict
        self.variables: dict[str, Any] = {}      # workflow-level variables

    # ─── Output management ───────────────────────────────────────────────────

    def set_output(self, node_id: str, output: dict[str, Any]) -> None:
        self.node_outputs[node_id] = output

    def get_output(self, node_id: str) -> dict[str, Any] | None:
        return self.node_outputs.get(node_id)

    # ─── Variable resolution ─────────────────────────────────────────────────

    def resolve(self, value: Any) -> Any:
        """
        Recursively resolve {{ template }} references in strings.
        Non-string values are returned as-is.
        Dicts and lists are resolved recursively.
        """
        if isinstance(value, str):
            return self._resolve_string(value)
        if isinstance(value, dict):
            return {k: self.resolve(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self.resolve(item) for item in value]
        return value

    def resolve_config(self, config: dict[str, Any]) -> dict[str, Any]:
        """Resolve all template strings in a node config dict."""
        return {k: self.resolve(v) for k, v in config.items()}

    def _resolve_string(self, template: str) -> str:
        def replacer(match: re.Match) -> str:
            path = match.group(1).strip()
            resolved = self._lookup(path)
            if resolved is None:
                return match.group(0)          # leave unresolved refs as-is
            if isinstance(resolved, (dict, list)):
                import json
                return json.dumps(resolved)
            return str(resolved)

        return _TEMPLATE_RE.sub(replacer, template)

    def _lookup(self, path: str) -> Any:
        """
        Resolve a dotted path like "node_id.field" or "trigger.email".
        Supports nested dicts: "node_id.result.items.0"
        """
        parts = path.split(".")
        root = parts[0]

        if root == "trigger":
            data: Any = self.trigger_data
        elif root == "variables":
            data = self.variables
        elif root in self.node_outputs:
            data = self.node_outputs[root]
        else:
            return None

        for part in parts[1:]:
            if isinstance(data, dict):
                data = data.get(part)
            elif isinstance(data, list):
                try:
                    data = data[int(part)]
                except (ValueError, IndexError):
                    return None
            else:
                return None

        return data

    # ─── Serialization (for pause/resume) ────────────────────────────────────

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "workflow_id": self.workflow_id,
            "trigger_data": self.trigger_data,
            "node_outputs": self.node_outputs,
            "variables": self.variables,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ExecutionContext":
        ctx = cls(
            run_id=data["run_id"],
            workflow_id=data["workflow_id"],
            trigger_data=data.get("trigger_data", {}),
        )
        ctx.node_outputs = data.get("node_outputs", {})
        ctx.variables = data.get("variables", {})
        return ctx

    def __repr__(self) -> str:
        return (
            f"<ExecutionContext run_id={self.run_id!r} "
            f"nodes_completed={list(self.node_outputs.keys())}>"
        )
