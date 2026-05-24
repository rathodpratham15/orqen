/**
 * Zustand store for live run execution state.
 *
 * The SSE stream from /api/runs/:id/stream populates this store.
 * The WorkflowCanvas reads nodeStatuses to overlay run status on each node.
 */
import { create } from "zustand";
import type { NodeStatus, RunStatus, RunEvent } from "@/lib/types";

export interface NodeRunState {
  status:      NodeStatus;
  tokens:      number;
  duration_ms: number | null;
  error:       string | null;
}

interface RunStore {
  activeRunId:   string | null;
  runStatus:     RunStatus | null;
  nodeStatuses:  Record<string, NodeRunState>;   // node_id → state
  approvalId:    string | null;                  // set when run is paused
  approvalMsg:   string | null;
  totalTokens:   number;
  costUsd:       number;
  durationMs:    number | null;
  error:         string | null;

  // Actions
  startRun:      (runId: string) => void;
  handleEvent:   (event: RunEvent) => void;
  clearRun:      () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  activeRunId:  null,
  runStatus:    null,
  nodeStatuses: {},
  approvalId:   null,
  approvalMsg:  null,
  totalTokens:  0,
  costUsd:      0,
  durationMs:   null,
  error:        null,

  startRun: (runId) =>
    set({
      activeRunId:  runId,
      runStatus:    "queued",
      nodeStatuses: {},
      approvalId:   null,
      approvalMsg:  null,
      totalTokens:  0,
      costUsd:      0,
      durationMs:   null,
      error:        null,
    }),

  handleEvent: (event) => {
    switch (event.type) {
      case "run_started":
        set({ runStatus: "running" });
        break;

      case "node_started":
        set((s) => ({
          nodeStatuses: {
            ...s.nodeStatuses,
            [event.node_id]: { status: "running", tokens: 0, duration_ms: null, error: null },
          },
        }));
        break;

      case "node_completed":
        set((s) => ({
          nodeStatuses: {
            ...s.nodeStatuses,
            [event.node_id]: {
              status:      event.status,
              tokens:      event.tokens,
              duration_ms: event.duration_ms,
              error:       event.error,
            },
          },
        }));
        break;

      case "run_paused":
        set((s) => ({
          runStatus:   "paused",
          approvalId:  event.approval_id,
          approvalMsg: event.message,
          nodeStatuses: {
            ...s.nodeStatuses,
            [event.node_id]: { status: "paused", tokens: 0, duration_ms: null, error: null },
          },
        }));
        break;

      case "run_failed":
        set({ runStatus: "failed", error: event.error });
        break;

      case "run_completed":
        set({
          runStatus:   "success",
          totalTokens: event.total_tokens,
          costUsd:     event.cost_usd,
          durationMs:  event.duration_ms,
        });
        break;

      case "stream_end":
        break;
    }
  },

  clearRun: () =>
    set({
      activeRunId:  null,
      runStatus:    null,
      nodeStatuses: {},
      approvalId:   null,
      approvalMsg:  null,
      totalTokens:  0,
      costUsd:      0,
      durationMs:   null,
      error:        null,
    }),
}));
