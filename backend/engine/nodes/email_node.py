"""
Email Node — send emails via the Resend API.

Resend (resend.com) has a free tier (3k emails/month), a clean REST API,
and takes one API key to set up. No OAuth, no SMTP config.

Setup:
  1. Sign up at resend.com (free)
  2. Add/verify your sending domain (or use their sandbox onboarding@resend.dev)
  3. Create an API key under Settings → API Keys
  4. Set RESEND_API_KEY in backend/.env  OR  pass it in node config

Config fields:
  to           (str | list, required) — recipient email(s), supports {{ }}
  subject      (str, required)        — email subject, supports {{ }}
  body         (str, required)        — HTML or plain text body, supports {{ }}
  from_email   (str)                  — sender address (must be on verified domain)
  from_name    (str)                  — sender display name
  api_key      (str)                  — override RESEND_API_KEY env var

Output fields:
  id        (str)   — Resend message ID
  ok        (bool)
  to        (str)   — recipient(s)
  subject   (str)
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from .base import BaseNode, NodeResult

RESEND_API_URL = "https://api.resend.com/emails"


class EmailNode(BaseNode):
    node_type = "email"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        api_key    = config.get("api_key") or os.environ.get("RESEND_API_KEY", "")
        to         = config.get("to", "")
        subject    = config.get("subject", "")
        body       = config.get("body", "")
        from_email = config.get("from_email", "orqen@resend.dev")
        from_name  = config.get("from_name", "Orqen")

        if not api_key:
            return NodeResult.failure(
                "Email node requires RESEND_API_KEY in env or 'api_key' in config"
            )
        if not to:
            return NodeResult.failure("Email node requires a 'to' address")
        if not subject:
            return NodeResult.failure("Email node requires a 'subject'")
        if not body:
            return NodeResult.failure("Email node requires a 'body'")

        # Accept comma-separated string or list
        recipients = [t.strip() for t in to.split(",")] if isinstance(to, str) else list(to)

        # Auto-detect HTML vs plain text
        is_html  = "<" in body and ">" in body
        html_body = body if is_html else body.replace("\n", "<br>")

        payload = {
            "from":    f"{from_name} <{from_email}>",
            "to":      recipients,
            "subject": subject,
            "html":    html_body,
            "text":    body,
        }

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    RESEND_API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type":  "application/json",
                    },
                    json=payload,
                )
        except httpx.TimeoutException:
            return NodeResult.failure("Resend API timed out")
        except httpx.HTTPError as exc:
            return NodeResult.failure(f"Resend HTTP error: {exc}")

        if not response.is_success:
            err = response.json().get("message", response.text) if response.content else response.text
            return NodeResult.failure(f"Resend API error ({response.status_code}): {err}")

        data = response.json()
        return NodeResult.success(output={
            "id":      data.get("id", ""),
            "ok":      True,
            "to":      to,
            "subject": subject,
        })

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        for field in ("to", "subject", "body"):
            if not config.get(field):
                errors.append(f"Email node requires '{field}'")
        return errors
