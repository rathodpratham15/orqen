"""
HTTP Node — make any REST API call from inside a workflow.

Config fields:
  url          (str, required) — supports {{ }} templates
  method       (str)           — GET | POST | PUT | PATCH | DELETE (default: GET)
  headers      (dict)          — request headers
  params       (dict)          — query string params
  body         (dict|str)      — request body (JSON-serialized if dict)
  timeout      (int)           — seconds, default 30
  success_codes(list[int])     — HTTP codes treated as success (default: 2xx)

Output fields:
  status_code  (int)
  body         (dict|str)      — parsed JSON if content-type is JSON, else text
  headers      (dict)
  ok           (bool)          — True if status code is in success_codes
"""
from __future__ import annotations

from typing import Any

import httpx

from .base import BaseNode, NodeResult


class HTTPNode(BaseNode):
    node_type = "http"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        url     = config.get("url", "").strip()
        method  = config.get("method", "GET").upper()
        headers = config.get("headers", {})
        params  = config.get("params", {})
        body    = config.get("body")
        timeout = int(config.get("timeout", 30))
        success_codes: list[int] | None = config.get("success_codes")

        if not url:
            return NodeResult.failure("HTTP node requires a 'url'")

        if method not in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}:
            return NodeResult.failure(f"Unsupported HTTP method: {method!r}")

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                kwargs: dict[str, Any] = dict(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params or None,
                )

                if body is not None and method in {"POST", "PUT", "PATCH"}:
                    if isinstance(body, dict):
                        kwargs["json"] = body
                    else:
                        kwargs["content"] = str(body)
                        kwargs["headers"] = {
                            **headers,
                            "Content-Type": "text/plain",
                        }

                response = await client.request(**kwargs)

        except httpx.TimeoutException:
            return NodeResult.failure(f"Request timed out after {timeout}s")
        except httpx.ConnectError as exc:
            return NodeResult.failure(f"Connection error: {exc}")
        except httpx.HTTPError as exc:
            return NodeResult.failure(f"HTTP error: {exc}")

        # Parse response body
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                parsed_body: Any = response.json()
            except Exception:
                parsed_body = response.text
        else:
            parsed_body = response.text

        # Determine success
        if success_codes:
            ok = response.status_code in success_codes
        else:
            ok = response.is_success

        output = {
            "status_code": response.status_code,
            "body":        parsed_body,
            "headers":     dict(response.headers),
            "ok":          ok,
        }

        if not ok:
            return NodeResult(
                status=__import__("engine.nodes.base", fromlist=["NodeStatus"]).NodeStatus.FAILED,
                output=output,
                error=f"HTTP {response.status_code} from {url}",
            )

        return NodeResult.success(output=output)

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if not config.get("url"):
            errors.append("HTTP node requires a 'url'")
        return errors
