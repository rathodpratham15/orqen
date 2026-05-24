/**
 * Typed API client for the Orqen backend.
 * All requests go through Next.js's /api/* rewrite → FastAPI.
 */
import type {
  Workflow, WorkflowRun, ApprovalRequest,
  WorkflowDefinition, TriggerConfig, RunEvent,
  AnalyticsStats, DailyRuns,
} from "./types";

const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export const api = {
  workflows: {
    list: () =>
      request<Workflow[]>("/workflows"),

    get: (id: string) =>
      request<Workflow>(`/workflows/${id}`),

    create: (data: { name: string; description?: string; definition?: WorkflowDefinition; trigger_config?: TriggerConfig }) =>
      request<Workflow>("/workflows", { method: "POST", body: JSON.stringify(data) }),

    update: (id: string, data: Partial<{ name: string; description: string; definition: WorkflowDefinition; is_active: boolean }>) =>
      request<Workflow>(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) }),

    delete: (id: string) =>
      request<void>(`/workflows/${id}`, { method: "DELETE" }),

    // ─── Runs ──────────────────────────────────────────────────────────────
    triggerRun: (workflowId: string, triggerData: Record<string, unknown> = {}) =>
      request<WorkflowRun>(`/workflows/${workflowId}/run`, {
        method: "POST",
        body: JSON.stringify({ trigger_data: triggerData }),
      }),
  },

  runs: {
    list: (params?: { workflow_id?: string; status?: string; limit?: number }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<WorkflowRun[]>(`/runs${qs ? "?" + qs : ""}`);
    },

    get: (id: string) =>
      request<WorkflowRun>(`/runs/${id}`),

    /**
     * Subscribe to live run events via Server-Sent Events.
     * Calls onEvent for each event; resolves when the stream closes.
     */
    stream: (runId: string, onEvent: (event: RunEvent) => void): EventSource => {
      const es = new EventSource(`${BASE}/runs/${runId}/stream`);
      es.onmessage = (e) => {
        try {
          const event: RunEvent = JSON.parse(e.data);
          onEvent(event);
          if (event.type === "stream_end") es.close();
        } catch {
          // ignore parse errors
        }
      };
      return es;
    },
  },

  analytics: {
    stats: () =>
      request<AnalyticsStats>("/analytics/stats"),

    runsOverTime: (days = 7) =>
      request<DailyRuns[]>(`/analytics/runs-over-time?days=${days}`),
  },

  approvals: {
    listPending: () =>
      request<ApprovalRequest[]>("/approvals/pending"),

    get: (id: string) =>
      request<ApprovalRequest>(`/approvals/${id}`),

    resolve: (id: string, decision: "approved" | "rejected", comment?: string) =>
      request<ApprovalRequest>(`/approvals/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ decision, comment }),
      }),
  },
};
