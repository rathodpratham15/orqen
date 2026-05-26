import { createContext, useContext, useState, useCallback } from "react";
import { SAMPLE_WORKFLOWS, SAMPLE_RUNS, SAMPLE_APPROVALS, SAMPLE_ANALYTICS } from "./mockData";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [workflows, setWorkflows] = useState(SAMPLE_WORKFLOWS);
  const [runs, setRuns] = useState(SAMPLE_RUNS);
  const [approvals, setApprovals] = useState(SAMPLE_APPROVALS);
  const analytics = SAMPLE_ANALYTICS;

  const getWorkflow = useCallback(
    (id) => workflows.find((w) => w.id === id),
    [workflows]
  );

  const upsertWorkflow = useCallback((wf) => {
    setWorkflows((prev) => {
      const idx = prev.findIndex((w) => w.id === wf.id);
      const next = { ...wf, updatedAt: Date.now() };
      if (idx === -1) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }, []);

  const createWorkflow = useCallback(({ name, description, trigger }) => {
    const id = "wf_" + Math.random().toString(36).slice(2, 9);
    const newWf = {
      id,
      name,
      description: description || "",
      trigger: trigger || "manual",
      active: false,
      updatedAt: Date.now(),
      nodes: [],
      edges: [],
    };
    setWorkflows((prev) => [newWf, ...prev]);
    return newWf;
  }, []);

  const deleteWorkflow = useCallback((id) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const duplicateWorkflow = useCallback((id) => {
    setWorkflows((prev) => {
      const src = prev.find((w) => w.id === id);
      if (!src) return prev;
      const copy = {
        ...src,
        id: "wf_" + Math.random().toString(36).slice(2, 9),
        name: src.name + " (Copy)",
        active: false,
        updatedAt: Date.now(),
      };
      return [copy, ...prev];
    });
  }, []);

  const toggleActive = useCallback((id) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w))
    );
  }, []);

  const triggerRun = useCallback((workflowId) => {
    const wf = workflows.find((w) => w.id === workflowId);
    if (!wf) return null;
    const runId = "run_" + Math.random().toString(36).slice(2, 9);
    const newRun = {
      id: runId,
      workflowId: wf.id,
      workflowName: wf.name,
      trigger: "manual",
      status: "running",
      startedAt: Date.now(),
      durationMs: null,
      tokens: 0,
      cost: 0,
      nodes: wf.nodes.map((n, i) => ({
        id: n.id,
        name: n.data.label,
        type: n.type,
        status: i === 0 ? "running" : "pending",
        durationMs: null,
        input: null,
        output: null,
      })),
    };
    setRuns((prev) => [newRun, ...prev]);
    return newRun;
  }, [workflows]);

  const resolveApproval = useCallback((approvalId, decision) => {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === approvalId
          ? { ...a, status: decision, resolvedAt: Date.now() }
          : a
      )
    );
  }, []);

  const getRun = useCallback((id) => runs.find((r) => r.id === id), [runs]);

  // Mock SSE simulation: advance a running run's nodes one by one
  const advanceRun = useCallback((runId) => {
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id !== runId || r.status !== "running") return r;
        const nodes = [...r.nodes];
        const runningIdx = nodes.findIndex((n) => n.status === "running");
        if (runningIdx === -1) return r;

        // Mark current as success with mock data
        nodes[runningIdx] = {
          ...nodes[runningIdx],
          status: "success",
          durationMs: 300 + Math.floor(Math.random() * 2400),
          tokens: nodes[runningIdx].type === "llm" ? 200 + Math.floor(Math.random() * 800) : nodes[runningIdx].tokens,
          input: { mock: "input data", node: nodes[runningIdx].id },
          output: { ok: true, mock: "output", at: new Date().toISOString() },
        };
        // Activate next
        const nextIdx = nodes.findIndex((n) => n.status === "pending");
        if (nextIdx !== -1) {
          nodes[nextIdx] = { ...nodes[nextIdx], status: "running" };
          return { ...r, nodes };
        }
        // All done
        const totalDur = nodes.reduce((s, n) => s + (n.durationMs || 0), 0);
        const totalTokens = nodes.reduce((s, n) => s + (n.tokens || 0), 0);
        return {
          ...r,
          nodes,
          status: "success",
          durationMs: totalDur,
          tokens: totalTokens,
          cost: +(totalTokens * 0.000003).toFixed(4),
        };
      })
    );
  }, []);

  return (
    <DataContext.Provider
      value={{
        workflows,
        runs,
        approvals,
        analytics,
        getWorkflow,
        upsertWorkflow,
        createWorkflow,
        deleteWorkflow,
        duplicateWorkflow,
        toggleActive,
        triggerRun,
        resolveApproval,
        getRun,
        advanceRun,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// Utility helpers
export const fmtRelative = (ts) => {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const sec = Math.floor(Math.abs(diff) / 1000);
  const future = diff < 0;
  const prefix = future ? "in " : "";
  const suffix = future ? "" : " ago";
  if (sec < 60) return `${prefix}${sec}s${suffix}`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${prefix}${min} min${suffix}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${prefix}${hr} hour${hr === 1 ? "" : "s"}${suffix}`;
  const day = Math.floor(hr / 24);
  return `${prefix}${day} day${day === 1 ? "" : "s"}${suffix}`;
};

export const fmtDuration = (ms) => {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
};

export const fmtNumber = (n) =>
  n == null ? "—" : n.toLocaleString("en-US");

export const fmtCost = (c) =>
  c == null ? "—" : `$${c.toFixed(3)}`;
