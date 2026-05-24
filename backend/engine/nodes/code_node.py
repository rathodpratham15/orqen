"""
Code Node — execute Python snippets inside a workflow.

This is one of the most powerful node types: it lets you transform data,
do calculations, parse outputs from LLM nodes, call libraries, etc.

The user's code runs in a subprocess with a timeout, keeping the main
worker process safe. Context data from prior nodes is injected as `inputs`.

How it works:
  1. User writes Python code in the node config
  2. Before execution, prior node outputs are injected as `inputs` dict
  3. User code sets a `result` variable (any JSON-serializable value)
  4. After execution, `result` is captured and stored as the node output

Example:
  # Parse a comma-separated list from an LLM response
  raw = inputs.get("llm_node", {}).get("text", "")
  result = [item.strip() for item in raw.split(",") if item.strip()]

Config fields:
  code     (str, required) — Python code to execute
  timeout  (int)           — max seconds (default: 10, max: 30)

Output fields:
  result  (any)  — whatever the code set in `result` variable
  stdout  (str)  — captured stdout
  stderr  (str)  — captured stderr (non-empty means warnings/errors)
  ok      (bool)

Security note:
  This runs arbitrary Python. In production you'd use a sandboxed container
  (e.g. Firecracker microVM, gVisor, or a dedicated code execution service).
  For this project we use subprocess + timeout as a reasonable demonstration.
"""
from __future__ import annotations

import asyncio
import json
import textwrap
from typing import Any

from .base import BaseNode, NodeResult

_MAX_TIMEOUT = 30


class CodeNode(BaseNode):
    node_type = "code"

    async def execute(self, config: dict[str, Any], context) -> NodeResult:
        code    = config.get("code", "").strip()
        timeout = min(int(config.get("timeout", 10)), _MAX_TIMEOUT)

        if not code:
            return NodeResult.failure("Code node requires 'code'")

        # Inject context data so user code can reference prior node outputs
        inputs_json = json.dumps(context.node_outputs, default=str)

        # Wrap user code: inject inputs, capture result, emit JSON to stdout
        runner = textwrap.dedent(f"""
            import json, sys

            # Prior node outputs available as `inputs`
            inputs = json.loads({inputs_json!r})

            # User code
            {textwrap.indent(code, "            ").strip()}

            # Capture result
            _result = locals().get("result", None)
            print(json.dumps({{"ok": True, "result": _result}}))
        """)

        try:
            proc = await asyncio.create_subprocess_exec(
                "python3", "-c", runner,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout_b, stderr_b = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                return NodeResult.failure(
                    f"Code execution timed out after {timeout}s"
                )

        except Exception as exc:
            return NodeResult.failure(f"Failed to launch code executor: {exc}")

        stdout = stdout_b.decode(errors="replace").strip()
        stderr = stderr_b.decode(errors="replace").strip()

        if proc.returncode != 0:
            return NodeResult.failure(
                f"Code exited with code {proc.returncode}:\n{stderr or stdout}",
                metadata={"stdout": stdout, "stderr": stderr},
            )

        # Parse the captured result JSON
        try:
            captured = json.loads(stdout) if stdout else {"ok": True, "result": None}
        except json.JSONDecodeError:
            # Code printed non-JSON to stdout — treat the raw text as result
            captured = {"ok": True, "result": stdout}

        return NodeResult.success(output={
            **captured,
            "stdout": stdout,
            "stderr": stderr,
        })

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        if not config.get("code"):
            return ["Code node requires 'code'"]
        return []
