"""
Slack Node — post messages to Slack via Incoming Webhooks.

Why webhooks instead of OAuth?
  Webhooks are a single URL, zero-dependency, and take 60 seconds to set up.
  For a workflow builder this is the right default — OAuth is an integration
  concern, not a workflow node concern.

Setup:
  1. Go to https://api.slack.com/apps → New App → Incoming Webhooks
  2. Activate and add to a channel
  3. Copy the webhook URL into the node config

Config fields:
  webhook_url  (str, required) — Slack Incoming Webhook URL
  text         (str, required) — Message text, supports {{ }} templates
  username     (str)           — Bot display name (default: Orqen)
  icon_emoji   (str)           — Bot icon (default: :robot_face:)
  blocks       (list)          — Optional Slack Block Kit blocks for rich messages

Output fields:
  ok       (bool)
  text     (str)  — The message that was sent
  channel  (str)  — Resolved from webhook URL context
"""
from __future__ import annotations

from typing import Any

import httpx

from .base import BaseNode, NodeResult


class SlackNode(BaseNode):
    node_type = "slack"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        webhook_url = config.get("webhook_url", "").strip()
        text        = config.get("text", "").strip()
        username    = config.get("username", "Orqen")
        icon_emoji  = config.get("icon_emoji", ":robot_face:")
        blocks      = config.get("blocks")

        if not webhook_url:
            return NodeResult.failure("Slack node requires a 'webhook_url'")
        if not text and not blocks:
            return NodeResult.failure("Slack node requires 'text' or 'blocks'")

        payload: dict[str, Any] = {
            "username":   username,
            "icon_emoji": icon_emoji,
        }
        if text:
            payload["text"] = text
        if blocks:
            payload["blocks"] = blocks

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(webhook_url, json=payload)

        except httpx.TimeoutException:
            return NodeResult.failure("Slack webhook timed out")
        except httpx.HTTPError as exc:
            return NodeResult.failure(f"Slack HTTP error: {exc}")

        # Slack webhooks return plain "ok" text on success
        if response.status_code != 200 or response.text != "ok":
            return NodeResult.failure(
                f"Slack webhook error ({response.status_code}): {response.text}"
            )

        return NodeResult.success(output={
            "ok":      True,
            "text":    text,
            "channel": "via webhook",
        })

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if not config.get("webhook_url"):
            errors.append("Slack node requires a 'webhook_url'")
        if not config.get("text") and not config.get("blocks"):
            errors.append("Slack node requires 'text' or 'blocks'")
        return errors
