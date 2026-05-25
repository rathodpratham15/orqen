/**
 * Run detail page — full execution trace with per-node timing, tokens, and output.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle,
  Clock, PauseCircle, Zap, DollarSign, Radio,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatDuration, formatTokens, formatCost } from "@/lib/utils";
import { ExecutionTrace } from "@/components/monitor/ExecutionTrace";
import type { WorkflowRun, RunStatus } from "@/lib/types";

const STATUS_CONFIG: Record<RunStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending:   { icon: <Clock   size={14} />, color: "text-zinc-400",  label: "Pending"   },
  queued:    { icon: <Clock   size={14} />, color: "text-zinc-400",  label: "Queued"    },
  running:   { icon: <Loader2 size={14} className="animate-spin" />, color: "text-blue-400", label: "Running" },
  success:   { icon: <CheckCircle2 size={14} />, color: "text-green-400", label: "Success"  },
  failed:    { icon: <XCircle      size={14} />, color: "text-red-400",   label: "Failed"   },
  paused:    { icon: <PauseCircle  size={14} />, color: "text-amber-400", label: "Paused"   },
  cancelled: { icon: <XCircle      size={14} />, color: "text-zinc-500",  label: "Cancelled" },
};

const ACTIVE_STATUSES = new Set(["running", "queued", "pending"]);
const TERMINAL_SSE    = new Set(["run_completed", "run_failed", "run_paused", "stream_end"]);

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const [run,     setRun]     = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive,  setIsLive]  = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Initial fetch
    api.runs.get(id)
      .then((data) => {
        setRun(data);
        setLoading(false);

        if (!ACTIVE_STATUSES.has(data.status)) return; // already terminal — no stream needed

        // Open SSE stream for live updates
        setIsLive(true);
        esRef.current = api.runs.stream(id, (event: Record<string, unknown>) => {
          if (event.type === "node_started") {
            // Mark this node as running in local state
            setRun((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                node_executions: prev.node_executions.map((ne) =>
                  ne.node_id === event.node_id ? { ...ne, status: "running" } : ne,
                ),
              };
            });
          } else if (event.type === "node_completed") {
            // Patch the node with final status/metrics from the SSE event
            setRun((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                node_executions: prev.node_executions.map((ne) =>
                  ne.node_id === event.node_id
                    ? {
                        ...ne,
                        status:      event.status      as string ?? ne.status,
                        tokens_used: event.tokens      as number ?? ne.tokens_used,
                        duration_ms: event.duration_ms as number ?? ne.duration_ms,
                        error:       event.error       as string ?? ne.error,
                      }
                    : ne,
                ),
              };
            });
          } else if (TERMINAL_SSE.has(event.type as string)) {
            // Do a final GET to get the fully-committed DB state, then close
            api.runs.get(id).then(setRun).catch(console.error);
            setIsLive(false);
            esRef.current?.close();
            esRef.current = null;
          }
        });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Run not found
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[run.status];

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
      {/* Back */}
      <Link href="/runs" className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-sm mb-6 transition-colors">
        <ArrowLeft size={14} /> All runs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className={cn("flex items-center gap-2 text-sm font-semibold mb-1", statusCfg.color)}>
            {statusCfg.icon}
            <span>{statusCfg.label}</span>
            {isLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-medium">
                <Radio size={9} className="animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-mono">{run.id}</p>
        </div>
        <div className="text-right text-xs text-zinc-600">
          <p>{formatDate(run.created_at)}</p>
          <p className="mt-0.5">{run.trigger_type} trigger</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Metric icon={<Clock size={13} />} label="Duration" value={formatDuration(run.duration_ms)} />
        <Metric icon={<Zap   size={13} />} label="Tokens"   value={formatTokens(run.total_tokens)} />
        <Metric icon={<DollarSign size={13} />} label="Cost" value={formatCost(run.estimated_cost_usd)} />
        <Metric label="Nodes" value={String(run.node_executions.length)} />
      </div>

      {run.error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {run.error}
        </div>
      )}

      {/* Execution trace */}
      <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
        Execution Trace
      </h2>
      <ExecutionTrace executions={run.node_executions} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#13131f] border border-[#2a2a40] px-4 py-3">
      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] mb-1">
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
