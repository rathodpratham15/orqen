"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, CheckCircle2, Zap, DollarSign, Loader2, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AnalyticsStats, DailyRuns } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtCost(n: number) {
  if (n < 0.001) return `$${(n * 1000).toFixed(3)}m`;
  return `$${n.toFixed(4)}`;
}

function fmtDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, accent = "text-slate-100",
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-lg border border-[#1E1E2E] bg-[#12121A] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={14} />
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", accent)}>{value}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

// ── Custom recharts tooltip ────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[#2a2a40] bg-[#12121A] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-slate-300">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  success:   "#10B981",
  failed:    "#EF4444",
  running:   "#06B6D4",
  paused:    "#F59E0B",
  queued:    "#64748B",
  pending:   "#475569",
  cancelled: "#334155",
};

export default function AnalyticsPage() {
  const [stats, setStats]     = useState<AnalyticsStats | null>(null);
  const [chart, setChart]     = useState<DailyRuns[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analytics.stats(), api.analytics.runsOverTime(7)])
      .then(([s, c]) => { setStats(s); setChart(c); })
      .catch((e) => toast.error("Failed to load analytics", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }
  if (!stats) return null;

  // Prepare pie chart data from by_status
  const pieData = Object.entries(stats.by_status)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] ?? "#475569" }));

  // Prepare bar chart data
  const barData = chart.map((d) => ({
    date:    d.date.slice(5),  // "MM-DD"
    Success: d.success,
    Failed:  d.failed,
  }));

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-[1400px] mx-auto w-full" data-testid="analytics-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Observability</h1>
        <p className="mt-1 text-sm text-slate-500">Token usage, cost, and run health across all workflows</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Activity}
          label="Total runs"
          value={stats.total_runs.toLocaleString()}
          sub={`${stats.runs_last_24h} in last 24h`}
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
          sub="All-time"
          accent="text-violet-400"
        />
        <StatCard
          icon={DollarSign}
          label="Estimated cost"
          value={fmtCost(stats.total_cost_usd)}
          sub={stats.avg_duration_ms ? `Avg run: ${fmtDuration(stats.avg_duration_ms)}` : undefined}
          accent="text-emerald-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Bar chart — runs over time */}
        <div className="rounded-lg border border-[#1E1E2E] bg-[#12121A] p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            Runs — last 7 days
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={12} barGap={2}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
              <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="Success" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Failed"  fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-600">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-violet-600" /> Success</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> Failed</span>
          </div>
        </div>

        {/* Pie chart — status breakdown */}
        <div className="rounded-lg border border-[#1E1E2E] bg-[#12121A] p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            Status breakdown
          </p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-[10px] text-slate-400 capitalize">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-600">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Top workflows */}
      {stats.top_workflows.length > 0 && (
        <div className="rounded-lg border border-[#1E1E2E] bg-[#12121A] p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
            <TrendingUp size={12} />
            Top workflows by token usage
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E2E] text-[10px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 text-left font-medium">Workflow</th>
                <th className="pb-2 text-right font-medium">Runs</th>
                <th className="pb-2 text-right font-medium">Tokens</th>
                <th className="pb-2 text-right font-medium">Cost</th>
                <th className="pb-2 text-right font-medium">Success</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_workflows.map((wf, i) => (
                <tr key={wf.workflow_id} className={cn("border-b border-[#0d0d14]", i === stats.top_workflows.length - 1 && "border-none")}>
                  <td className="py-2.5 font-medium text-slate-300 truncate max-w-[200px]">{wf.workflow_name}</td>
                  <td className="py-2.5 text-right text-slate-500">{wf.run_count}</td>
                  <td className="py-2.5 text-right font-mono text-xs text-violet-400">{fmtTokens(wf.tokens)}</td>
                  <td className="py-2.5 text-right font-mono text-xs text-emerald-400">{fmtCost(wf.cost_usd)}</td>
                  <td className="py-2.5 text-right">
                    <span className={cn(
                      "text-xs font-semibold",
                      wf.success_rate >= 80 ? "text-emerald-400" : wf.success_rate >= 50 ? "text-amber-400" : "text-red-400",
                    )}>
                      {wf.success_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
