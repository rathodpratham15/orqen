"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, formatDuration, formatTokens, formatCost } from "@/lib/utils";
import type { WorkflowRun, RunStatus, Workflow } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function Pill({ label, value, color = "text-slate-300" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[#1E1E2E] bg-[#12121A] px-3 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const STATUS_META: Record<RunStatus, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "#F59E0B" },
  queued:    { label: "Queued",    color: "#F59E0B" },
  running:   { label: "Running",   color: "#06B6D4" },
  success:   { label: "Success",   color: "#10B981" },
  failed:    { label: "Failed",    color: "#EF4444" },
  paused:    { label: "Paused",    color: "#F59E0B" },
  cancelled: { label: "Cancelled", color: "#64748B" },
};

const STATUS_TABS = ["All", "Running", "Success", "Failed", "Paused"] as const;
type StatusTab = (typeof STATUS_TABS)[number];
const RANGES = ["Last 24h", "7d", "30d"] as const;

export default function RunsPage() {
  const router = useRouter();
  const [runs,      setRuns]      = useState<WorkflowRun[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [wfFilter,  setWfFilter]  = useState("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [range,     setRange]     = useState<string>("7d");

  useEffect(() => {
    Promise.all([api.runs.list({ limit: 100 }), api.workflows.list()])
      .then(([r, w]) => { setRuns(r); setWorkflows(w); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build a quick lookup map: workflow_id → name
  const wfNames = useMemo(() => {
    const m: Record<string, string> = {};
    workflows.forEach((w) => { m[w.id] = w.name; });
    return m;
  }, [workflows]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (wfFilter !== "all" && r.workflow_id !== wfFilter) return false;
      if (statusTab !== "All" && r.status !== statusTab.toLowerCase()) return false;
      return true;
    });
  }, [runs, wfFilter, statusTab]);

  const totals = useMemo(() => ({
    runs:       filtered.length,
    tokens:     filtered.reduce((s, r) => s + (r.total_tokens ?? 0), 0),
    cost:       filtered.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0),
    duration_ms:filtered.reduce((s, r) => s + (r.duration_ms ?? 0), 0),
    success:    filtered.filter((r) => r.status === "success").length,
    failed:     filtered.filter((r) => r.status === "failed").length,
  }), [filtered]);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-[1400px] mx-auto w-full" data-testid="runs-page">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Run History</h1>
          <p className="mt-1 text-sm text-slate-500">All workflow executions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select value={wfFilter} onValueChange={setWfFilter}>
          <SelectTrigger className="w-[220px]" data-testid="wf-filter">
            <SelectValue placeholder="All workflows" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All workflows</SelectItem>
            {workflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md border border-[#2a2a40] bg-[#12121A] p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setStatusTab(t)}
              data-testid={`status-tab-${t.toLowerCase()}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                statusTab === t ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-[#2a2a40] bg-[#12121A] p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      {!loading && totals.runs > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <Pill label="Runs"     value={String(totals.runs)} />
          <Pill label="Success"  value={String(totals.success)} color="text-emerald-400" />
          {totals.failed > 0 && (
            <Pill label="Failed" value={String(totals.failed)} color="text-red-400" />
          )}
          <Pill label="Tokens"   value={formatTokens(totals.tokens)} />
          <Pill label="Cost"     value={formatCost(totals.cost)} />
          <Pill label="Total time" value={formatDuration(totals.duration_ms)} />
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#1E1E2E] bg-[#12121A]">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-zinc-600" />
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="runs-table">
            <thead className="border-b border-[#1E1E2E] bg-[#0d0d14]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium">Trigger</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                    No runs yet — trigger a workflow to see executions here
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const meta = STATUS_META[r.status];
                  return (
                    <tr
                      key={r.id}
                      data-testid={`run-row-${r.id}`}
                      className={cn(
                        "border-b border-[#1E1E2E] last:border-0 transition-colors hover:bg-white/[0.02]",
                        r.status === "running" ? "border-l-2 border-l-cyan-400" : "",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${r.status === "running" ? "pulse-dot" : ""}`}
                            style={{ background: meta.color }}
                          />
                          <span className="text-slate-200">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/editor/${r.workflow_id}`)}
                          className="text-slate-200 hover:text-violet-300 hover:underline"
                        >
                          {wfNames[r.workflow_id] ?? r.workflow_id.slice(0, 8) + "…"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded border border-[#1E1E2E] bg-[#0a0a0f] px-2 py-0.5 text-xs text-slate-300 capitalize">
                          {r.trigger_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {r.started_at ? fmtRelative(r.started_at) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                        {formatDuration(r.duration_ms)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                        {formatTokens(r.total_tokens)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                        {formatCost(r.estimated_cost_usd)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/runs/${r.id}`)}
                          className="h-7"
                          data-testid={`view-run-${r.id}`}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── Totals footer ───────────────────────────────────────── */}
            {filtered.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-[#2a2a40] bg-[#0d0d14] text-[11px] font-semibold text-slate-400">
                  <td className="px-4 py-2.5 uppercase tracking-wider text-slate-500">
                    {totals.runs} runs
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-emerald-500">{totals.success} ✓</span>
                    {totals.failed > 0 && (
                      <span className="ml-2 text-red-500">{totals.failed} ✗</span>
                    )}
                  </td>
                  <td />
                  <td />
                  <td className="px-4 py-2.5 font-mono text-slate-300">
                    {formatDuration(totals.duration_ms)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">
                    {formatTokens(totals.tokens)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">
                    {formatCost(totals.cost)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
