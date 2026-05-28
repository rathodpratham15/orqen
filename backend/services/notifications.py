"""
Run completion email notifications via Resend.

Called from executor.py after every run finishes (success or failure).
Only sends if RESEND_API_KEY is configured. Failures are swallowed so
a bad email config never crashes a workflow run.
"""
from __future__ import annotations
import httpx
from config import settings

RESEND_URL = "https://api.resend.com/emails"


async def notify_run_finished(
    *,
    user_email: str,
    user_name: str,
    workflow_name: str,
    run_id: str,
    status: str,
    duration_ms: int | None,
    total_tokens: int,
    estimated_cost_usd: float | None,
    error: str | None,
) -> None:
    """Send a run-completion email. Silently no-ops if RESEND_API_KEY is unset."""
    if not settings.RESEND_API_KEY:
        return

    is_success = status == "success"
    color = "#7c3aed" if is_success else "#dc2626"
    status_label = "Completed successfully" if is_success else "Failed"
    duration_str = f"{duration_ms / 1000:.1f}s" if duration_ms else "—"
    cost_str = f"${estimated_cost_usd:.4f}" if estimated_cost_usd else "$0.0000"

    error_row = f"<tr><td style='padding:4px 0;color:#94a3b8;'>Error</td><td style='padding:4px 0;color:#f87171;'>{error}</td></tr>" if error else ""

    html = f"""
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#0a0a0f;color:#e2e8f0;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#12121a;border:1px solid #1e1e2e;border-radius:12px;padding:28px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-weight:bold;font-size:14px;">O</span>
      </div>
      <span style="font-size:18px;font-weight:700;color:#f1f5f9;">Orqen</span>
    </div>
    <h2 style="margin:0 0 8px;font-size:20px;color:#f1f5f9;">
      Workflow run <span style="color:{color};">{status_label.lower()}</span>
    </h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">
      Hi {user_name}, your workflow <strong style="color:#c4b5fd;">{workflow_name}</strong> just finished.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:4px 0;color:#94a3b8;">Status</td>
          <td style="padding:4px 0;color:{color};font-weight:600;">{status_label}</td></tr>
      <tr><td style="padding:4px 0;color:#94a3b8;">Duration</td>
          <td style="padding:4px 0;">{duration_str}</td></tr>
      <tr><td style="padding:4px 0;color:#94a3b8;">Tokens used</td>
          <td style="padding:4px 0;">{total_tokens:,}</td></tr>
      <tr><td style="padding:4px 0;color:#94a3b8;">Estimated cost</td>
          <td style="padding:4px 0;">{cost_str}</td></tr>
      {error_row}
    </table>
    <div style="margin-top:24px;">
      <a href="{settings.FRONTEND_URL}/runs/{run_id}"
         style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">
        View run details →
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:11px;color:#334155;">
      You received this because you own the <em>{workflow_name}</em> workflow on Orqen.
    </p>
  </div>
</body>
</html>
"""

    payload = {
        "from": "Orqen <notifications@orqen.app>",
        "to": [user_email],
        "subject": f"{'✓' if is_success else '✗'} {workflow_name} — {status_label}",
        "html": html,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
    except Exception:
        pass  # never crash a workflow run over a notification failure
