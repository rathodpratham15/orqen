/**
 * Typed API client for the Orqen backend.
 * All requests go through Next.js's /api/* rewrite → FastAPI.
 */
import type {
  Workflow, WorkflowRun, ApprovalRequest,
  WorkflowDefinition, TriggerConfig, RunEvent,
  AnalyticsStats, DailyRuns,
  AuthResponse, APIKeyStatus,
  WorkflowSchedule,
} from "./types";

const BASE = "/api";
const SSE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "") + "/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Attach JWT from Zustand store (works outside React via .getState())
  let authHeader: Record<string, string> = {};
  try {
    const { useAuthStore } = await import("@/stores/auth-store");
    const token = useAuthStore.getState().token;
    if (token) authHeader = { Authorization: `Bearer ${token}` };
  } catch {
    // During SSR or before store is hydrated, skip
  }

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    me: () => request<{ id: string; email: string; name: string }>("/auth/me"),
  },

  settings: {
    listAPIKeys: () =>
      request<APIKeyStatus[]>("/settings/api-keys"),

    setAPIKey: (provider: string, key: string) =>
      request<APIKeyStatus>(`/settings/api-keys/${provider}`, {
        method: "PUT",
        body: JSON.stringify({ key }),
      }),

    deleteAPIKey: (provider: string) =>
      request<void>(`/settings/api-keys/${provider}`, { method: "DELETE" }),
  },

  // ─── Workflows ───────────────────────────────────────────────────────────────

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

    triggerRun: (workflowId: string, triggerData: Record<string, unknown> = {}) =>
      request<WorkflowRun>(`/runs/${workflowId}/run`, {
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

    stream: (runId: string, onEvent: (event: RunEvent) => void): EventSource => {
      const es = new EventSource(`${SSE_BASE}/runs/${runId}/stream`);
      es.onmessage = (e) => {
        try {
          const event: RunEvent = JSON.parse(e.data);
          onEvent(event);
          if (event.type === "stream_end") es.close();
        } catch {}
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

  schedules: {
    list: () =>
      request<WorkflowSchedule[]>("/schedules"),

    toggle: (id: string) =>
      request<WorkflowSchedule>(`/schedules/${id}/toggle`, { method: "PATCH" }),

    delete: (id: string) =>
      request<void>(`/schedules/${id}`, { method: "DELETE" }),
  },
};
