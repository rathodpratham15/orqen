import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fmtRelative, fmtDuration, fmtNumber, fmtCost, useData } from "@/lib/dataStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const STATUS_META = {
  pending: { label: "Pending", color: "#F59E0B" },
  running: { label: "Running", color: "#06B6D4" },
  success: { label: "Success", color: "#10B981" },
  failed: { label: "Failed", color: "#EF4444" },
  paused: { label: "Paused", color: "#F59E0B" },
  cancelled: { label: "Cancelled", color: "#64748B" },
};

const STATUS_TABS = ["All", "Running", "Success", "Failed", "Paused"];
const RANGES = ["Last 24h", "7d", "30d", "Custom"];

export default function Runs() {
  const navigate = useNavigate();
  const { runs, workflows } = useData();
  const [wfFilter, setWfFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("All");
  const [range, setRange] = useState("7d");

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (wfFilter !== "all" && r.workflowId !== wfFilter) return false;
      if (statusTab !== "All" && r.status !== statusTab.toLowerCase()) return false;
      return true;
    });
  }, [runs, wfFilter, statusTab]);

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto" data-testid="runs-page">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Run History</h1>
          <p className="mt-1 text-sm text-slate-500">All workflow executions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select value={wfFilter} onValueChange={setWfFilter}>
          <SelectTrigger className="w-[220px] bg-[#12121A] border-border" data-testid="wf-filter">
            <SelectValue placeholder="All workflows" />
          </SelectTrigger>
          <SelectContent className="bg-[#12121A] border-border text-slate-200">
            <SelectItem value="all">All workflows</SelectItem>
            {workflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md border border-border bg-[#12121A] p-1">
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

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border bg-[#12121A] p-1">
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

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-[#12121A]">
        <table className="w-full text-sm" data-testid="runs-table">
          <thead className="border-b border-border bg-[#0d0d14]">
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
                    className={`border-b border-border last:border-0 transition-colors hover:bg-white/[0.02] ${
                      r.status === "running" ? "border-l-2 border-l-cyan-400" : ""
                    }`}
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
                        onClick={() => navigate(`/editor/${r.workflowId}`)}
                        className="text-slate-200 hover:text-violet-300 hover:underline"
                      >
                        {r.workflowName}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded border border-border bg-[#0a0a0f] px-2 py-0.5 text-xs text-slate-300 capitalize">
                        {r.trigger}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400" title={new Date(r.startedAt).toLocaleString()}>
                      {fmtRelative(r.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{fmtDuration(r.durationMs)}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{fmtNumber(r.tokens)}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{fmtCost(r.cost)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/runs/${r.id}`)}
                        className="h-7 border-border bg-transparent text-slate-300 hover:bg-white/5"
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
        </table>
      </div>
    </div>
  );
}
