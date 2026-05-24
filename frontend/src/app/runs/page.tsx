"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, Clock, PauseCircle, Play } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatDuration, formatTokens } from "@/lib/utils";
import type { WorkflowRun, RunStatus } from "@/lib/types";

const STATUS_DOT: Record<RunStatus, string> = {
  pending:   "bg-zinc-500",
  queued:    "bg-zinc-500 animate-pulse",
  running:   "bg-blue-500 animate-pulse",
  success:   "bg-green-500",
  failed:    "bg-red-500",
  paused:    "bg-amber-500 animate-pulse",
  cancelled: "bg-zinc-600",
};

export default function RunsPage() {
  const [runs, setRuns]       = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.runs.list({ limit: 50 })
      .then(setRuns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Play size={20} className="text-zinc-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Runs</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-zinc-600" size={24} />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-24 text-zinc-600 text-sm">
            No runs yet — trigger a workflow to see executions here
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-[#13131f] border border-[#2a2a40] hover:border-[#3a3a55] hover:bg-[#15151f] transition-all">
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[run.status])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-zinc-400 truncate">{run.id}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 capitalize">
                      {run.trigger_type} · {run.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-600 flex-shrink-0">
                    <span>{formatTokens(run.total_tokens)} tok</span>
                    <span>{formatDuration(run.duration_ms)}</span>
                    <span>{formatDate(run.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
