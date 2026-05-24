"""
Approval Node — pause the workflow and wait for a human decision.

When the executor encounters PAUSED status it:
  1. Creates an ApprovalRequest row in the database
  2. Sets WorkflowRun.status = 'paused'
  3. Serializes the ExecutionContext into WorkflowRun.context
  4. Returns — the Celery task ends here

Resume flow (triggered by PATCH /api/approvals/:id/resolve):
  - Decision 'approved'  → executor picks up from the next node after this one
  - Decision 'rejected'  → run is marked failed with the rejection reason

Config fields:
  message      (str) — what the approver sees, supports {{ }} templates
  summary      (str) — extra context/preview of what the agent wants to do
  timeout_hours(int) — auto-reject after N hours if not resolved (default: 24)

Output fields (stored in ApprovalRequest.context):
  message       (str)
  summary       (str)
  timeout_hours (int)
"""
from __future__ import annotations

from typing import Any

from .base import BaseNode, NodeResult


class ApprovalNode(BaseNode):
    node_type = "approval"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        """
        Approval nodes never 'complete' — they signal a PAUSE.
        The executor sees PAUSED status and suspends the run.
        """
        message       = config.get("message", "Please review and approve to continue.")
        summary       = config.get("summary", "")
        timeout_hours = int(config.get("timeout_hours", 24))

        return NodeResult.paused(output={
            "message":       message,
            "summary":       summary,
            "timeout_hours": timeout_hours,
        })

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if not config.get("message"):
            errors.append("Approval node requires a 'message' for the approver")
        return errors
