"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Trash2, Power, PowerOff, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { WorkflowSchedule } from "@/lib/types";

function cronHuman(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, month, dow] = parts;
  if (min === "0" && dom === "*" && month === "*" && dow === "*")
    return `Daily at ${hour.padStart(2, "0")}:00 UTC`;
  if (min === "0" && dom === "*" && month === "*" && dow === "1-5")
    return `Weekdays at ${hour.padStart(2, "0")}:00 UTC`;
  if (min === "0" && dom === "*" && month === "*")
    return `Every day at ${hour.padStart(2, "0")}:${min.padStart(2, "0")} UTC`;
  return expr;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  const prefix = diff > 0 ? "in " : "";
  const suffix = diff < 0 ? " ago" : "";
  if (mins < 2) return diff > 0 ? "in a moment" : "just now";
  if (hours < 1) return `${prefix}${mins}m${suffix}`;
  if (days < 1) return `${prefix}${hours}h ${mins % 60}m${suffix}`;
  return `${prefix}${days}d${suffix}`;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<WorkflowSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.schedules.list()
      .then(setSchedules)
      .catch((e) => toast.error("Failed to load schedules", { description: e.message }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(schedule: WorkflowSchedule) {
    try {
      const updated = await api.schedules.toggle(schedule.id);
      setSchedules((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      toast.success(updated.is_active ? "Schedule enabled" : "Schedule paused");
    } catch (e: unknown) {
      toast.error("Failed to update schedule");
    }
  }

  async function handleDelete(schedule: WorkflowSchedule) {
    if (!confirm(`Delete schedule for "${schedule.workflow_name}"?`)) return;
    try {
      await api.schedules.delete(schedule.id);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      toast.success("Schedule deleted");
    } catch {
      toast.error("Failed to delete schedule");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-[1000px] mx-auto w-full">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Schedules</h1>
          <p className="mt-1 text-sm text-slate-500">Cron-triggered workflows and their next run times</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-[#1e1e2e] bg-[#12121a] shimmer" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#1e1e2e] bg-[#12121a]">
            <Calendar className="h-9 w-9 text-violet-500/50" strokeWidth={1.2} />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No schedules yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a workflow with a <strong className="text-slate-400">Cron</strong> trigger to see it here.
          </p>
          <Link
            href="/"
            className="mt-5 text-xs text-violet-400 hover:text-violet-300 underline"
          >
            Go to Workflows →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                s.is_active
                  ? "border-[#1e1e2e] bg-[#12121a]"
                  : "border-[#1a1a28] bg-[#0d0d14] opacity-60"
              }`}
            >
              {/* Status dot */}
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.is_active ? "bg-violet-500" : "bg-slate-600"}`} />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200 truncate">{s.workflow_name}</span>
                  <Link
                    href={`/editor/${s.workflow_id}`}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <code className="font-mono">{s.cron_expr}</code>
                    <span className="text-slate-600">·</span>
                    <span>{cronHuman(s.cron_expr)}</span>
                  </span>
                </div>
              </div>

              {/* Timing */}
              <div className="hidden sm:flex flex-col items-end text-xs text-slate-500 gap-0.5 min-w-[120px]">
                <span>
                  Next: <span className="text-slate-300">{formatRelative(s.next_run_at)}</span>
                </span>
                <span>
                  Last: <span className="text-slate-400">{formatRelative(s.last_run_at)}</span>
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(s)}
                  title={s.is_active ? "Pause schedule" : "Enable schedule"}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                >
                  {s.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  title="Delete schedule"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
