/**
 * Observability dashboard — token usage, costs, run history, per-workflow breakdown.
 */
"use client";

import { useEffect, useState } from "react";
import {
  BarChart2, Zap, DollarSign, Clock, CheckCircle2,
  XCircle, Loader2, TrendingUp, Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AnalyticsStats, DailyRuns } from "@/lib/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtCost(n: number) {
  if (n < 0.001) return `$${(n * 1000).toFixed(3)}m`;   // millicents
  return `$${n.toFixed(4)}`;
}

function fmtDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1_000)  return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-zinc-300",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#13131f] border border-[#2a2a40] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={14} />
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", accent)}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

// ─── Mini bar chart (CSS, no library) ─────────────────────────────────────────

function RunsChart({ data }: { data: DailyRuns[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-[#13131f] border border-[#2a2a40] rounded-xl p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
        Runs — last 7 days
      </p>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            {/* tooltip */}
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1 text-[10px] text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {d.date.slice(5)}: {d.success}✓ {d.failed}✗
            </div>

            {/* stacked bar */}
            <div className="w-full flex flex-col-reverse gap-px" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 4 : 0 }}>
              <div
                className="w-full rounded-sm bg-purple-500/80"
                style={{ flex: d.success }}
              />
              {d.failed > 0 && (
                <div
                  className="w-full rounded-sm bg-red-500/70"
                  style={{ flex: d.failed }}
                />
              )}
            </div>

            {/* date label */}
            <span className="text-[9px] text-zinc-700 mt-1">
              {d.date.slice(8)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/80 inline-block" /> Success</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/70 inline-block" /> Failed</span>
      </div>
    </div>
  );
}

// ─── Status breakdown ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  success:  "bg-emerald-500",
  failed:   "bg-red-500",
  running:  "bg-blue-500",
  paused:   "bg-amber-500",
  queued:   "bg-zinc-500",
  pending:  "bg-zinc-600",
  cancelled:"bg-zinc-700",
};

function StatusBar({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  if (!total) return null;

  const order = ["success", "running", "paused", "queued", "failed", "cancelled", "pending"];
  const sorted = order.filter((s) => (byStatus[s] ?? 0) > 0);

  return (
    <div className="bg-[#13131f] border border-[#2a2a40] rounded-xl p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
        Status breakdown
      </p>

      {/* Segmented bar */}
      <div className="flex rounded-full overflow-hidden h-3 gap-px mb-4">
        {sorted.map((s) => (
          <div
            key={s}
            className={cn("h-full", STATUS_COLORS[s] ?? "bg-zinc-500")}
            style={{ flex: byStatus[s] }}
            title={`${s}: ${byStatus[s]}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
        {sorted.map((s) => (
          <div key={s} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-zinc-400 capitalize">
              <span className={cn("w-2 h-2 rounded-full", STATUS_COLORS[s] ?? "bg-zinc-500")} />
              {s}
            </span>
            <span className="text-zinc-500">{byStatus[s]} · {((byStatus[s] / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top workflows table ───────────────────────────────────────────────────────

function TopWorkflows({ workflows }: { workflows: AnalyticsStats["top_workflows"] }) {
  if (!workflows.length) return null;

  return (
    <div className="bg-[#13131f] border border-[#2a2a40] rounded-xl p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-4">
        Top workflows by token usage
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] text-zinc-600 uppercase tracking-wide border-b border-[#2a2a40]">
            <th className="text-left pb-2 font-medium">Workflow</th>
            <th className="text-right pb-2 font-medium">Runs</th>
            <th className="text-right pb-2 font-medium">Tokens</th>
            <th className="text-right pb-2 font-medium">Cost</th>
            <th className="text-right pb-2 font-medium">Success</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((wf, i) => (
            <tr key={wf.workflow_id} className={cn("border-b border-[#1a1a28]", i === workflows.length - 1 && "border-none")}>
              <td className="py-2.5 text-zinc-300 font-medium truncate max-w-[200px]">{wf.workflow_name}</td>
              <td className="py-2.5 text-right text-zinc-500">{wf.run_count}</td>
              <td className="py-2.5 text-right text-purple-400 font-mono text-xs">{fmtTokens(wf.tokens)}</td>
              <td className="py-2.5 text-right text-emerald-400 font-mono text-xs">{fmtCost(wf.cost_usd)}</td>
              <td className="py-2.5 text-right">
                <span className={cn(
                  "text-xs font-semibold",
                  wf.success_rate >= 80 ? "text-emerald-400" : wf.success_rate >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {wf.success_rate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [stats, setStats]   = useState<AnalyticsStats | null>(null);
  const [chart, setChart]   = useState<DailyRuns[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.analytics.stats(), api.analytics.runsOverTime(7)])
      .then(([s, c]) => { setStats(s); setChart(c); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        Failed to load analytics: {error}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <BarChart2 size={22} className="text-purple-400" />
          Observability
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Token usage, cost, and run health across all workflows
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Activity}
          label="Total runs"
          value={stats.total_runs.toLocaleString()}
          sub={`${stats.runs_last_24h} in last 24h`}
          accent="text-zinc-100"
        />
        <StatCard
          icon={CheckCircle2}
          label="Success rate"
          value={`${stats.success_rate}%`}
          sub={`${stats.by_status.success ?? 0} successful`}
          accent={stats.success_rate >= 80 ? "text-emerald-400" : stats.success_rate >= 50 ? "text-amber-400" : "text-red-400"}
        />
        <StatCard
          icon={Zap}
          label="Total tokens"
          value={fmtTokens(stats.total_tokens)}
          sub="All-time across all runs"
          accent="text-purple-400"
        />
        <StatCard
          icon={DollarSign}
          label="Estimated cost"
          value={fmtCost(stats.total_cost_usd)}
          sub={stats.avg_duration_ms ? `Avg run: ${fmtDuration(stats.avg_duration_ms)}` : "No completed runs yet"}
          accent="text-emerald-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RunsChart data={chart} />
        <StatusBar byStatus={stats.by_status} total={stats.total_runs} />
      </div>

      {/* Top workflows */}
      <TopWorkflows workflows={stats.top_workflows} />
    </div>
  );
}
