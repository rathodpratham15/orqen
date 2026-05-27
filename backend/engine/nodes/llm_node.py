"""
LLM Node — calls an AI model with prompt templates, supporting multiple providers.

Supported providers:
  anthropic  — Claude (Sonnet, Opus, Haiku)
  openai     — GPT-4o, GPT-4o-mini, GPT-4-turbo
  google     — Gemini 2.0 Flash, 1.5 Pro, 1.5 Flash
  groq       — Llama-3.3, Mixtral, Gemma (ultra-fast inference)

Config fields:
  provider       (str)   — "anthropic" | "openai" | "google" | "groq"  [default: anthropic]
  model          (str)   — provider-specific model name
  prompt         (str)   — user message; supports {{ }} templates
  system_prompt  (str)   — system message
  max_tokens     (int)   — defaults to 2048
  structured     (bool)  — if True, attempt to parse output as JSON

Output fields:
  text           — raw text response
  stop_reason    — why the model stopped
  tool_calls     — (Anthropic only) tool use requests
  parsed         — (if structured=True) parsed JSON object
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from config import settings
from .base import BaseNode, NodeResult

# ── Provider → model catalogue ────────────────────────────────────────────────

PROVIDER_MODELS: dict[str, list[str]] = {
    "anthropic": [
        "claude-sonnet-4-6",
        "claude-opus-4-7",
        "claude-haiku-4-5-20251001",
    ],
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
    ],
    "google": [
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
    ],
    "groq": [
        "llama-3.3-70b-versatile",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    ],
}

DEFAULT_PROVIDER = "anthropic"
DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-6",
    "openai":    "gpt-4o",
    "google":    "gemini-2.0-flash",
    "groq":      "llama-3.3-70b-versatile",
}

# ── Cost table: (input_per_1M, output_per_1M) in USD ─────────────────────────

COST_TABLE: dict[str, tuple[float, float]] = {
    # Anthropic
    "claude-sonnet-4-6":          (3.00,  15.00),
    "claude-opus-4-7":            (15.00, 75.00),
    "claude-haiku-4-5-20251001":  (0.25,   1.25),
    # OpenAI
    "gpt-4o":                     (2.50,  10.00),
    "gpt-4o-mini":                (0.15,   0.60),
    "gpt-4-turbo":                (10.00, 30.00),
    "gpt-3.5-turbo":              (0.50,   1.50),
    # Google
    "gemini-2.0-flash":           (0.075,  0.30),
    "gemini-1.5-pro":             (3.50,  10.50),
    "gemini-1.5-flash":           (0.075,  0.30),
    # Groq (very cheap)
    "llama-3.3-70b-versatile":    (0.59,   0.79),
    "mixtral-8x7b-32768":         (0.24,   0.24),
    "gemma2-9b-it":               (0.20,   0.20),
}


def _calc_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    inp, out = COST_TABLE.get(model, (1.0, 5.0))
    return (input_tokens * inp + output_tokens * out) / 1_000_000


# ── Provider-specific call implementations ────────────────────────────────────

async def _call_anthropic(
    api_key: str, model: str, system: str, prompt: str,
    max_tokens: int, tools: list,
) -> dict[str, Any]:
    import anthropic as _anthropic

    client = _anthropic.AsyncAnthropic(api_key=api_key)
    kwargs: dict[str, Any] = dict(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    if tools:
        kwargs["tools"] = tools

    try:
        response = await client.messages.create(**kwargs)
    except _anthropic.AuthenticationError:
        return {"error": "Invalid Anthropic API key"}
    except _anthropic.RateLimitError:
        return {"error": "Anthropic rate limit hit"}
    except _anthropic.APIError as exc:
        return {"error": f"Anthropic API error: {exc}"}

    text_parts, tool_calls = [], []
    for block in response.content:
        if block.type == "text":
            text_parts.append(block.text)
        elif block.type == "tool_use":
            tool_calls.append({"id": block.id, "name": block.name, "input": block.input})

    return {
        "text":         "\n".join(text_parts),
        "tool_calls":   tool_calls,
        "stop_reason":  response.stop_reason,
        "input_tokens": response.usage.input_tokens,
        "output_tokens":response.usage.output_tokens,
    }


async def _call_openai_compat(
    api_key: str, model: str, system: str, prompt: str,
    max_tokens: int, base_url: str | None = None,
) -> dict[str, Any]:
    """Shared implementation for OpenAI and Groq (OpenAI-compatible API)."""
    try:
        from openai import AsyncOpenAI, AuthenticationError, RateLimitError, APIError
    except ImportError:
        return {"error": "openai package not installed (pip install openai)"}

    kwargs: dict = {}
    if base_url:
        kwargs["base_url"] = base_url

    client = AsyncOpenAI(api_key=api_key, **kwargs)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
        )
    except AuthenticationError:
        return {"error": f"Invalid API key for model {model}"}
    except RateLimitError:
        return {"error": "Rate limit hit"}
    except APIError as exc:
        return {"error": f"API error: {exc}"}

    choice = response.choices[0]
    return {
        "text":          choice.message.content or "",
        "tool_calls":    [],
        "stop_reason":   choice.finish_reason,
        "input_tokens":  response.usage.prompt_tokens if response.usage else 0,
        "output_tokens": response.usage.completion_tokens if response.usage else 0,
    }


async def _call_google(
    api_key: str, model: str, system: str, prompt: str, max_tokens: int,
) -> dict[str, Any]:
    try:
        import google.generativeai as genai
    except ImportError:
        return {"error": "google-generativeai package not installed"}

    genai.configure(api_key=api_key)

    generation_config = genai.types.GenerationConfig(max_output_tokens=max_tokens)
    system_instruction = system if system else None

    gm = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_instruction,
        generation_config=generation_config,
    )

    try:
        response = await gm.generate_content_async(prompt)
    except Exception as exc:
        return {"error": f"Google Gemini error: {exc}"}

    text = response.text if hasattr(response, "text") else ""
    usage = response.usage_metadata if hasattr(response, "usage_metadata") else None

    return {
        "text":          text,
        "tool_calls":    [],
        "stop_reason":   "end_turn",
        "input_tokens":  getattr(usage, "prompt_token_count", 0) if usage else 0,
        "output_tokens": getattr(usage, "candidates_token_count", 0) if usage else 0,
    }


# ── Node class ────────────────────────────────────────────────────────────────

class LLMNode(BaseNode):
    node_type = "llm"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        provider   = config.get("provider", DEFAULT_PROVIDER)
        model      = config.get("model") or DEFAULT_MODELS.get(provider, "")
        prompt     = config.get("prompt", "")
        system     = config.get("system_prompt", "You are a helpful AI assistant.")
        max_tokens = int(config.get("max_tokens", 2048))
        tools      = config.get("tools", [])
        structured = config.get("structured", False)

        if not prompt:
            return NodeResult.failure("LLM node requires a non-empty 'prompt'")

        api_key = context.get_api_key(provider)
        if not api_key:
            return NodeResult.failure(
                f"No API key configured for provider '{provider}'. "
                f"Add your key in Settings → API Keys."
            )

        # ── Dispatch to provider ───────────────────────────────────────────────
        if provider == "anthropic":
            raw = await _call_anthropic(api_key, model, system, prompt, max_tokens, tools)
        elif provider == "openai":
            raw = await _call_openai_compat(api_key, model, system, prompt, max_tokens)
        elif provider == "groq":
            raw = await _call_openai_compat(
                api_key, model, system, prompt, max_tokens,
                base_url="https://api.groq.com/openai/v1",
            )
        elif provider == "google":
            raw = await _call_google(api_key, model, system, prompt, max_tokens)
        else:
            return NodeResult.failure(f"Unknown provider: {provider!r}")

        if "error" in raw:
            return NodeResult.failure(raw["error"])

        text          = raw.get("text", "")
        tool_calls    = raw.get("tool_calls", [])
        stop_reason   = raw.get("stop_reason", "end_turn")
        input_tokens  = raw.get("input_tokens", 0)
        output_tokens = raw.get("output_tokens", 0)
        total_tokens  = input_tokens + output_tokens
        cost_usd      = _calc_cost(model, input_tokens, output_tokens)

        # ── Optional JSON parsing ──────────────────────────────────────────────
        parsed: Any = None
        if structured and text:
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                m = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
                if m:
                    try:
                        parsed = json.loads(m.group(1))
                    except json.JSONDecodeError:
                        pass

        output: dict[str, Any] = {
            "text":        text,
            "tool_calls":  tool_calls,
            "stop_reason": stop_reason,
        }
        if parsed is not None:
            output["parsed"] = parsed

        return NodeResult.success(
            output=output,
            tokens_used=total_tokens,
            metadata={
                "provider":      provider,
                "model":         model,
                "input_tokens":  input_tokens,
                "output_tokens": output_tokens,
                "cost_usd":      round(cost_usd, 8),
                "stop_reason":   stop_reason,
            },
        )

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if not config.get("prompt"):
            errors.append("LLM node requires a 'prompt'")
        return errors
