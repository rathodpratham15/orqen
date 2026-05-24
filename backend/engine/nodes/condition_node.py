"""
Condition Node — branch the workflow based on a comparison.

This is what makes workflows dynamic. The executor reads the 'branch' key
from metadata and follows the matching edge ('true' or 'false').

Config fields:
  left      (str)  — left operand, supports {{ }} templates
  operator  (str)  — ==, !=, >, >=, <, <=, contains, not_contains, is_empty, is_not_empty
  right     (str)  — right operand, supports {{ }} templates

Output fields:
  result    (bool) — the evaluated result
  branch    (str)  — "true" or "false" — executor uses this to pick the next edge
  evaluated (str)  — human-readable expression for observability logs

Example config:
  { "left": "{{ llm_node.text }}", "operator": "contains", "right": "approved" }
"""
from __future__ import annotations

from typing import Any, Callable

from .base import BaseNode, NodeResult


# Operator name → comparison function
_OPS: dict[str, Callable[[Any, Any], bool]] = {
    "==":           lambda a, b: a == b,
    "!=":           lambda a, b: a != b,
    ">":            lambda a, b: float(a) > float(b),
    ">=":           lambda a, b: float(a) >= float(b),
    "<":            lambda a, b: float(a) < float(b),
    "<=":           lambda a, b: float(a) <= float(b),
    "contains":     lambda a, b: str(b).lower() in str(a).lower(),
    "not_contains": lambda a, b: str(b).lower() not in str(a).lower(),
    "is_empty":     lambda a, _: not bool(str(a).strip()),
    "is_not_empty": lambda a, _: bool(str(a).strip()),
    "starts_with":  lambda a, b: str(a).lower().startswith(str(b).lower()),
    "ends_with":    lambda a, b: str(a).lower().endswith(str(b).lower()),
}


class ConditionNode(BaseNode):
    node_type = "condition"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        left  = str(config.get("left", ""))
        right = str(config.get("right", ""))
        op    = config.get("operator", "==")

        op_fn = _OPS.get(op)
        if op_fn is None:
            return NodeResult.failure(
                f"Unknown operator {op!r}. Valid: {', '.join(_OPS)}"
            )

        try:
            result: bool = op_fn(left, right)
        except (ValueError, TypeError) as exc:
            return NodeResult.failure(
                f"Condition evaluation error ({left!r} {op} {right!r}): {exc}"
            )

        branch = "true" if result else "false"

        return NodeResult.success(
            output={
                "result":    result,
                "branch":    branch,
                "evaluated": f"{left!r} {op} {right!r} → {result}",
            },
            metadata={"branch": branch},   # executor reads this to pick edge
        )

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if "left" not in config:
            errors.append("Condition node requires 'left'")
        if "operator" not in config:
            errors.append("Condition node requires 'operator'")
        if config.get("operator") not in _OPS:
            errors.append(
                f"Unknown operator {config.get('operator')!r}. "
                f"Valid: {', '.join(_OPS)}"
            )
        return errors
