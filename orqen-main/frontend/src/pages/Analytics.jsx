import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, CheckCircle2, Hash, DollarSign, ArrowUp, ArrowDown } from "lucide-react";
import { useData, fmtNumber, fmtDuration } from "@/lib/dataStore";

const RANGES = ["Last 24h", "Last 7 days", "Last 30 days"];

export default function Analytics() {
  const { analytics } = useData();
  const [range, setRange] = useState("Last 7 days");

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto" data-testid="analytics-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Observability</h1>
          <p className="mt-1 text-sm text-slate-500">Operational metrics across all workflows</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-[#12121A] p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              data-testid={`range-${r.replace(/\s+/g, "-")}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Total Runs" value={fmtNumber(analytics.totalRuns)} trend={analytics.trend.runs} />
        <StatCard icon={CheckCircle2} label="Success Rate" value={`${analytics.successRate}%`} trend={analytics.trend.successRate} />
        <StatCard icon={Hash} label="Total Tokens" value={fmtNumber(analytics.totalTokens)} trend={analytics.trend.tokens} />
        <StatCard icon={DollarSign} label="Est. Cost" value={`$${analytics.totalCost.toFixed(2)}`} trend={analytics.trend.cost} />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-[#12121A] p-5">
          <h2 className="text-sm font-semibold text-slate-200">Runs Over Time</h2>
          <p className="mt-0.5 text-xs text-slate-500">Last 7 days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.runsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(124, 58, 237, 0.06)" }}
                  contentStyle={{
                    background: "#0a0a0f",
                    border: "1px solid #1E1E2E",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#F1F5F9" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                <Bar dataKey="success" name="Success" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-[#12121A] p-5">
          <h2 className="text-sm font-semibold text-slate-200">Status Breakdown</h2>
          <p className="mt-0.5 text-xs text-slate-500">Distribution by outcome</p>
          <div className="mt-4 flex items-center gap-6">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={2}
                    stroke="#0a0a0f"
                    strokeWidth={2}
                  >
                    {analytics.statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0f",
                      border: "1px solid #1E1E2E",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-slate-100 font-mono">{analytics.totalRuns}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">total runs</div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {analytics.statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    <span className="text-slate-300">{s.name}</span>
                  </div>
                  <span className="font-mono text-slate-500">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top workflows table */}
      <div className="mt-6 rounded-lg border border-border bg-[#12121A] overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Top Workflows</h2>
          <p className="mt-0.5 text-xs text-slate-500">Ranked by run volume</p>
        </div>
        <table className="w-full text-sm" data-testid="top-workflows-table">
          <thead className="border-b border-border bg-[#0d0d14]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Workflow</th>
              <th className="px-5 py-3 font-medium">Runs</th>
              <th className="px-5 py-3 font-medium">Success Rate</th>
              <th className="px-5 py-3 font-medium">Avg Duration</th>
              <th className="px-5 py-3 font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {analytics.topWorkflows.map((w) => {
              const barColor = w.successRate >= 95 ? "#10B981" : w.successRate >= 80 ? "#F59E0B" : "#EF4444";
              return (
                <tr key={w.rank} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-slate-400">#{w.rank}</td>
                  <td className="px-5 py-3 text-slate-200 font-medium">{w.name}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{fmtNumber(w.runs)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#0a0a0f]">
                        <div className="h-full rounded-full" style={{ width: `${w.successRate}%`, background: barColor }} />
                      </div>
                      <span className="font-mono text-xs text-slate-400">{w.successRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-300">{fmtDuration(w.avgDurationMs)}</td>
                  <td className="px-5 py-3 font-mono text-slate-300">{fmtNumber(w.tokens)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend }) {
  const up = trend >= 0;
  return (
    <div className="rounded-lg border border-border bg-[#12121A] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <span className={`flex items-center text-[11px] font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </span>
      </div>
      <div className="mt-1.5 text-2xl font-bold text-slate-100 font-mono">{value}</div>
    </div>
  );
}
