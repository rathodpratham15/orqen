"""
LLM Node — calls Claude with prompt templates and optional tool use.

Config fields:
  prompt         (str, required)  — user message, supports {{ }} templates
  system_prompt  (str)            — system message
  model          (str)            — defaults to claude-sonnet-4-6
  max_tokens     (int)            — defaults to 2048
  tools          (list)           — Anthropic tool definitions for tool use
  structured     (bool)           — if True, parse output as JSON

Output fields set in context:
  text           — raw text response from the model
  tool_calls     — list of tool use requests (if any)
  stop_reason    — why the model stopped ("end_turn" | "tool_use" | "max_tokens")
"""
from __future__ import annotations

import json
import os
from typing import Any

import anthropic

from config import settings
from .base import BaseNode, NodeResult


# Cost per token in USD (blended estimate for Sonnet)
_INPUT_COST_PER_TOKEN  = 3.00 / 1_000_000   # $3.00 / 1M input tokens
_OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000   # $15.00 / 1M output tokens

DEFAULT_MODEL = "claude-sonnet-4-6"


class LLMNode(BaseNode):
    node_type = "llm"

    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY or os.environ.get("ANTHROPIC_API_KEY", "")
        )

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        # Config (templates already resolved by executor before calling execute)
        prompt       = config.get("prompt", "")
        system       = config.get("system_prompt", "You are a helpful AI assistant.")
        model        = config.get("model", DEFAULT_MODEL)
        max_tokens   = int(config.get("max_tokens", 2048))
        tools        = config.get("tools", [])
        structured   = config.get("structured", False)

        if not prompt:
            return NodeResult.failure("LLM node requires a non-empty 'prompt'")

        messages = [{"role": "user", "content": prompt}]

        try:
            kwargs: dict[str, Any] = dict(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            )
            if tools:
                kwargs["tools"] = tools

            response = await self._client.messages.create(**kwargs)

        except anthropic.AuthenticationError:
            return NodeResult.failure("Invalid Anthropic API key")
        except anthropic.RateLimitError:
            return NodeResult.failure("Anthropic rate limit hit — will retry")
        except anthropic.APIError as exc:
            return NodeResult.failure(f"Anthropic API error: {exc}")

        # Parse content blocks
        text_parts: list[str] = []
        tool_calls: list[dict] = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({
                    "id":    block.id,
                    "name":  block.name,
                    "input": block.input,
                })

        text = "\n".join(text_parts)

        # Optionally parse the text as JSON (structured output)
        parsed: Any = None
        if structured and text:
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code block
                import re
                m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
                if m:
                    try:
                        parsed = json.loads(m.group(1))
                    except json.JSONDecodeError:
                        pass

        input_tokens  = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        total_tokens  = input_tokens + output_tokens
        cost_usd      = (
            input_tokens  * _INPUT_COST_PER_TOKEN +
            output_tokens * _OUTPUT_COST_PER_TOKEN
        )

        output: dict[str, Any] = {
            "text":        text,
            "tool_calls":  tool_calls,
            "stop_reason": response.stop_reason,
        }
        if parsed is not None:
            output["parsed"] = parsed

        return NodeResult.success(
            output=output,
            tokens_used=total_tokens,
            metadata={
                "model":         model,
                "input_tokens":  input_tokens,
                "output_tokens": output_tokens,
                "cost_usd":      round(cost_usd, 8),
                "stop_reason":   response.stop_reason,
            },
        )

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if not config.get("prompt"):
            errors.append("LLM node requires a 'prompt'")
        return errors
