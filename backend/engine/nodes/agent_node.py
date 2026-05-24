"""
Agent Node — multi-step Claude ReAct (Reason + Act) tool-use loop.

This is Orqen's most powerful node type. It gives Claude a set of tools and
lets it reason and act autonomously until it reaches a final answer or hits
the iteration limit.

Architecture
────────────
  Round 1: Claude receives the goal + context → responds with text or tool_use
  Round N: We execute tool calls, append results, call Claude again
  Done:    Claude responds with stop_reason="end_turn" (no more tool calls)

Built-in tools (enabled via config.available_tools list):
  http_request   — fetch a URL or call an API (GET / POST / PUT / DELETE)
  run_python     — execute sandboxed Python and capture stdout
  search_memory  — semantic search over stored agent memories (requires MemoryNode)

Config fields
─────────────
  goal              (str, required)   — the agent's objective / first user message
  system_prompt     (str)             — Claude's persona / rules
  model             (str)             — default claude-sonnet-4-6
  max_iterations    (int)             — max tool-call rounds before forced stop (default 10)
  max_tokens        (int)             — max output tokens per turn (default 4096)
  available_tools   (list[str])       — which built-in tools to enable
  extra_tools       (list[dict])      — additional Anthropic-format tool definitions
  inject_context    (bool)            — append prior node outputs to the first message

Output
──────
  final_answer      — Claude's last text block
  iterations        — how many tool-call rounds ran
  tool_calls_log    — [{tool, input, result, duration_ms}, ...]
  messages          — full conversation history (for debugging / audit)
  stop_reason       — "end_turn" | "max_iterations" | "error"
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any

import anthropic
import httpx

from .base import BaseNode, NodeResult

# ── Cost constants (Sonnet 4 pricing) ────────────────────────────────────────
_INPUT_COST  = 3.00  / 1_000_000
_OUTPUT_COST = 15.00 / 1_000_000

DEFAULT_MODEL = "claude-sonnet-4-6"


# ─────────────────────────────────────────────────────────────────────────────
# Built-in tool definitions (Anthropic tool-use format)
# ─────────────────────────────────────────────────────────────────────────────

_TOOL_HTTP_REQUEST = {
    "name": "http_request",
    "description": (
        "Make an HTTP request and return the response body. "
        "Use this to call APIs, fetch web pages, or interact with external services."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "method": {
                "type": "string",
                "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                "description": "HTTP method",
            },
            "url": {
                "type": "string",
                "description": "Full URL to request",
            },
            "headers": {
                "type": "object",
                "description": "Optional HTTP headers as key-value pairs",
            },
            "body": {
                "description": "Request body (string or JSON object for POST/PUT)",
            },
            "timeout_seconds": {
                "type": "number",
                "description": "Request timeout in seconds (default 30)",
            },
        },
        "required": ["method", "url"],
    },
}

_TOOL_RUN_PYTHON = {
    "name": "run_python",
    "description": (
        "Execute Python code and return stdout + stderr. "
        "Useful for calculations, data processing, and transformations. "
        "Each call runs in an isolated subprocess. Print your results."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python code to execute",
            },
            "timeout_seconds": {
                "type": "number",
                "description": "Execution timeout (default 10, max 30)",
            },
        },
        "required": ["code"],
    },
}

_TOOL_SEARCH_MEMORY = {
    "name": "search_memory",
    "description": (
        "Search the semantic memory store for relevant information. "
        "Returns the most similar stored memories to the query."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language search query",
            },
            "top_k": {
                "type": "integer",
                "description": "Number of results to return (default 5)",
            },
            "collection": {
                "type": "string",
                "description": "Memory collection to search (default: 'default')",
            },
        },
        "required": ["query"],
    },
}

_BUILTIN_TOOL_DEFS = {
    "http_request":  _TOOL_HTTP_REQUEST,
    "run_python":    _TOOL_RUN_PYTHON,
    "search_memory": _TOOL_SEARCH_MEMORY,
}


# ─────────────────────────────────────────────────────────────────────────────
# Tool execution implementations
# ─────────────────────────────────────────────────────────────────────────────

async def _exec_http_request(tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute http_request tool — async HTTP call via httpx."""
    method  = tool_input.get("method", "GET").upper()
    url     = tool_input["url"]
    headers = tool_input.get("headers", {})
    body    = tool_input.get("body")
    timeout = float(tool_input.get("timeout_seconds", 30))

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            kwargs: dict[str, Any] = {"headers": headers}
            if body is not None:
                if isinstance(body, dict):
                    kwargs["json"] = body
                else:
                    kwargs["content"] = str(body)

            resp = await client.request(method, url, **kwargs)

        # Try to decode as JSON, fall back to text
        try:
            content = resp.json()
        except Exception:
            content = resp.text[:4000]  # cap response size

        return {
            "status_code": resp.status_code,
            "content":     content,
            "headers":     dict(resp.headers),
        }
    except httpx.TimeoutException:
        return {"error": f"Request to {url} timed out after {timeout}s"}
    except Exception as exc:
        return {"error": str(exc)}


async def _exec_run_python(tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute run_python tool — subprocess Python with stdout capture."""
    code    = tool_input["code"]
    timeout = min(float(tool_input.get("timeout_seconds", 10)), 30)

    try:
        proc = await asyncio.create_subprocess_exec(
            "python3", "-c", code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
        return {
            "stdout":      stdout.decode(errors="replace")[:4000],
            "stderr":      stderr.decode(errors="replace")[:1000],
            "exit_code":   proc.returncode,
        }
    except asyncio.TimeoutError:
        return {"error": f"Code execution timed out after {timeout}s"}
    except Exception as exc:
        return {"error": str(exc)}


async def _exec_search_memory(tool_input: dict[str, Any], run_id: str) -> dict[str, Any]:
    """
    Execute search_memory tool — delegate to MemoryNode's search logic.
    Imports lazily to avoid circular dependency.
    """
    try:
        from .memory_node import _semantic_search
        results = await _semantic_search(
            query=tool_input["query"],
            top_k=int(tool_input.get("top_k", 5)),
            collection=tool_input.get("collection", "default"),
        )
        return {"results": results}
    except ImportError:
        return {"error": "Memory node not available"}
    except Exception as exc:
        return {"error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# AgentNode
# ─────────────────────────────────────────────────────────────────────────────

def _serialize_content(content: list[Any]) -> list[dict]:
    """
    Convert Anthropic SDK ContentBlock objects to plain JSON-serializable dicts.
    Required before storing messages in JSONB columns.
    """
    result = []
    for block in content:
        if block.type == "text":
            result.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            result.append({
                "type":  "tool_use",
                "id":    block.id,
                "name":  block.name,
                "input": block.input,
            })
        else:
            # Fallback: use model_dump if available (Pydantic models), else repr
            try:
                result.append(block.model_dump())
            except AttributeError:
                result.append({"type": block.type, "raw": repr(block)})
    return result


class AgentNode(BaseNode):
    """
    Multi-step Claude ReAct agent.

    Runs a tool-use loop: Claude → tool calls → results → Claude → ...
    until Claude finishes (end_turn) or max_iterations is reached.
    """
    node_type = "agent"

    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY", "")
        )

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        # ── Config ─────────────────────────────────────────────────────────
        goal           = config.get("goal", "").strip()
        system_prompt  = config.get(
            "system_prompt",
            "You are a capable AI agent. Use the tools available to accomplish the goal. "
            "Think step by step. When you have a final answer, respond with just text "
            "(no tool calls).",
        )
        model          = config.get("model", DEFAULT_MODEL)
        max_iter       = int(config.get("max_iterations", 10))
        max_tokens     = int(config.get("max_tokens", 4096))
        avail_tools    = config.get("available_tools", ["http_request", "run_python"])
        extra_tools    = config.get("extra_tools", [])
        inject_context = config.get("inject_context", True)

        if not goal:
            return NodeResult.failure("AgentNode requires a non-empty 'goal'")

        # ── Build tool list ────────────────────────────────────────────────
        tools: list[dict] = []
        for t_name in avail_tools:
            if t_name in _BUILTIN_TOOL_DEFS:
                tools.append(_BUILTIN_TOOL_DEFS[t_name])
        tools.extend(extra_tools)

        # ── Build initial user message ─────────────────────────────────────
        first_message = goal
        if inject_context and context.node_outputs:
            ctx_summary = json.dumps(
                {k: v for k, v in context.node_outputs.items()},
                indent=2,
            )[:2000]  # cap to avoid massive prompts
            first_message = (
                f"Context from previous steps:\n```json\n{ctx_summary}\n```\n\n"
                f"Goal: {goal}"
            )

        messages: list[dict] = [{"role": "user", "content": first_message}]

        # ── State tracking ─────────────────────────────────────────────────
        tool_calls_log: list[dict] = []
        total_input_tokens  = 0
        total_output_tokens = 0
        final_answer        = ""
        stop_reason         = "end_turn"

        # ── ReAct loop ─────────────────────────────────────────────────────
        for iteration in range(max_iter):
            # Call Claude
            try:
                kwargs: dict[str, Any] = dict(
                    model=model,
                    max_tokens=max_tokens,
                    system=system_prompt,
                    messages=messages,
                )
                if tools:
                    kwargs["tools"] = tools

                response = await self._client.messages.create(**kwargs)

            except anthropic.AuthenticationError:
                return NodeResult.failure("Invalid Anthropic API key")
            except anthropic.RateLimitError:
                return NodeResult.failure("Anthropic rate limit — retry later")
            except anthropic.APIError as exc:
                return NodeResult.failure(f"Anthropic API error: {exc}")

            total_input_tokens  += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            # Collect text + tool_use blocks
            text_parts: list[str] = []
            tool_use_blocks: list[Any] = []

            for block in response.content:
                if block.type == "text":
                    text_parts.append(block.text)
                elif block.type == "tool_use":
                    tool_use_blocks.append(block)

            if text_parts:
                final_answer = "\n".join(text_parts)

            # Append assistant turn to history as JSON-serializable dicts
            # (Anthropic SDK returns ContentBlock objects; we need plain dicts for JSONB storage)
            messages.append({"role": "assistant", "content": _serialize_content(response.content)})

            # ── No tool calls → done ───────────────────────────────────────
            if response.stop_reason == "end_turn" or not tool_use_blocks:
                stop_reason = "end_turn"
                break

            # ── Execute tool calls in parallel ─────────────────────────────
            tool_results = await self._execute_tools(
                tool_use_blocks, tool_calls_log, context
            )

            # Append user turn with tool results
            messages.append({
                "role": "user",
                "content": tool_results,
            })

        else:
            # Loop exhausted without end_turn
            stop_reason = "max_iterations"
            if not final_answer:
                final_answer = (
                    f"Agent reached max iterations ({max_iter}) without a final answer."
                )

        total_tokens = total_input_tokens + total_output_tokens
        cost_usd = (
            total_input_tokens  * _INPUT_COST +
            total_output_tokens * _OUTPUT_COST
        )

        return NodeResult.success(
            output={
                "final_answer":   final_answer,
                "iterations":     len([l for l in tool_calls_log]),
                "tool_calls_log": tool_calls_log,
                "stop_reason":    stop_reason,
                # Include last 20 messages for debugging (full history can be huge)
                "messages_tail":  messages[-20:],
            },
            tokens_used=total_tokens,
            metadata={
                "model":          model,
                "input_tokens":   total_input_tokens,
                "output_tokens":  total_output_tokens,
                "cost_usd":       round(cost_usd, 8),
                "stop_reason":    stop_reason,
                "iterations":     len(tool_calls_log),
            },
        )

    async def _execute_tools(
        self,
        tool_use_blocks: list[Any],
        tool_calls_log: list[dict],
        context,
    ) -> list[dict]:
        """
        Execute all tool calls (potentially in parallel) and return
        tool_result content blocks for the next Claude message.
        """
        async def _run_one(block: Any) -> dict:
            t_start = time.monotonic()
            tool_name  = block.name
            tool_input = block.input

            if tool_name == "http_request":
                result = await _exec_http_request(tool_input)
            elif tool_name == "run_python":
                result = await _exec_run_python(tool_input)
            elif tool_name == "search_memory":
                result = await _exec_search_memory(tool_input, context.run_id)
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            duration_ms = int((time.monotonic() - t_start) * 1000)

            tool_calls_log.append({
                "tool":        tool_name,
                "input":       tool_input,
                "result":      result,
                "duration_ms": duration_ms,
            })

            result_content = json.dumps(result) if isinstance(result, dict) else str(result)

            return {
                "type":        "tool_result",
                "tool_use_id": block.id,
                "content":     result_content[:8000],  # cap to avoid token explosion
            }

        # Run all tool calls concurrently
        return list(await asyncio.gather(*[_run_one(b) for b in tool_use_blocks]))

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors = []
        if not config.get("goal"):
            errors.append("AgentNode requires a 'goal'")
        max_iter = config.get("max_iterations", 10)
        if not isinstance(max_iter, int) or max_iter < 1 or max_iter > 50:
            errors.append("max_iterations must be between 1 and 50")
        return errors
