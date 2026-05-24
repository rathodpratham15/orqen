/**
 * ExecutionTrace — timeline of node executions for a completed run.
 * Used on the /runs/:id page.
 *
 * For "agent" nodes, renders a structured tool-call log instead of raw JSON.
 */
"use client";

import { CheckCircle2, XCircle, Clock, Loader2, PauseCircle, SkipForward, Bot, Wrench } from "lucide-react";
import { cn, formatDuration, formatTokens } from "@/lib/utils";
import type { NodeExecution, NodeStatus } from "@/lib/types";

const STATUS_CONFIG: Record<NodeStatus, {
  icon:  React.ReactNode;
  color: string;
  bg:    string;
}> = {
  pending:  { icon: <Clock   size={14} />, color: "text-zinc-500", bg: "bg-zinc-500/10" },
  running:  { icon: <Loader2 size={14} className="animate-spin" />, color: "text-blue-400",  bg: "bg-blue-500/10" },
  success:  { icon: <CheckCircle2 size={14} />, color: "text-green-400", bg: "bg-green-500/10" },
  failed:   { icon: <XCircle      size={14} />, color: "text-red-400",   bg: "bg-red-500/10"   },
  skipped:  { icon: <SkipForward  size={14} />, color: "text-zinc-600",  bg: "bg-zinc-600/10"  },
  paused:   { icon: <PauseCircle  size={14} />, color: "text-amber-400", bg: "bg-amber-500/10" },
};

interface ExecutionTraceProps {
  executions: NodeExecution[];
}

export function ExecutionTrace({ executions }: ExecutionTraceProps) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600 text-sm">
        No node executions recorded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec, i) => {
        const cfg = STATUS_CONFIG[exec.status];
        return (
          <div
            key={exec.id}
            className={cn(
              "rounded-lg border border-[#2a2a40] overflow-hidden",
              "animate-fade-in",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Row header */}
            <div className={cn("flex items-center gap-3 px-4 py-3", cfg.bg)}>
              <span className={cfg.color}>{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200 truncate">
                    {exec.node_id}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a40] text-zinc-400 font-mono">
                    {exec.node_type}
                  </span>
                </div>
                {exec.error && (
                  <p className="text-xs text-red-400 mt-0.5 truncate">{exec.error}</p>
                )}
              </div>
              {/* Metrics */}
              <div className="flex items-center gap-4 text-[10px] text-zinc-500 flex-shrink-0">
                {exec.tokens_used > 0 && (
                  <span>{formatTokens(exec.tokens_used)} tok</span>
                )}
                {exec.retry_count > 0 && (
                  <span className="text-amber-500">{exec.retry_count}× retry</span>
                )}
                <span>{formatDuration(exec.duration_ms)}</span>
              </div>
            </div>

            {/* Output preview */}
            {exec.output && Object.keys(exec.output).length > 0 && (
              exec.node_type === "agent"
                ? <AgentOutputPanel output={exec.output} />
                : (
                  <details className="group">
                    <summary className="px-4 py-1.5 text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 select-none list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                      Output
                    </summary>
                    <pre className="px-4 pb-3 text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
                      {JSON.stringify(exec.output, null, 2)}
                    </pre>
                  </details>
                )
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent-specific output panel ──────────────────────────────────────────────

interface ToolCallLog {
  tool:        string;
  input:       Record<string, unknown>;
  result:      unknown;
  duration_ms: number;
}

function AgentOutputPanel({ output }: { output: Record<string, unknown> }) {
  const finalAnswer  = output.final_answer as string | undefined;
  const toolCallsLog = (output.tool_calls_log ?? []) as ToolCallLog[];
  const stopReason   = output.stop_reason as string | undefined;

  return (
    <div className="border-t border-[#2a2a40] divide-y divide-[#2a2a40]">
      {/* Final answer */}
      {finalAnswer && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bot size={11} className="text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
              Final answer
              {stopReason && stopReason !== "end_turn" && (
                <span className="ml-2 text-amber-400 normal-case font-normal">
                  ({stopReason})
                </span>
              )}
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{finalAnswer}</p>
        </div>
      )}

      {/* Tool call log */}
      {toolCallsLog.length > 0 && (
        <details className="group">
          <summary className="px-4 py-1.5 text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 select-none list-none flex items-center gap-1.5">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            <Wrench size={10} className="inline" />
            {toolCallsLog.length} tool call{toolCallsLog.length !== 1 ? "s" : ""}
          </summary>
          <div className="px-4 pb-3 space-y-2">
            {toolCallsLog.map((call, i) => (
              <div key={i} className="rounded border border-[#2a2a40] bg-[#13131f] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a2e] border-b border-[#2a2a40]">
                  <span className="text-[10px] font-mono font-semibold text-violet-300">
                    {call.tool}
                  </span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{call.duration_ms}ms</span>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  <details className="group/inner">
                    <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 list-none flex items-center gap-1">
                      <span className="group-open/inner:rotate-90 transition-transform inline-block">▶</span>
                      Input
                    </summary>
                    <pre className="mt-1 text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
                      {JSON.stringify(call.input, null, 2)}
                    </pre>
                  </details>
                  <details className="group/inner">
                    <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 list-none flex items-center gap-1">
                      <span className="group-open/inner:rotate-90 transition-transform inline-block">▶</span>
                      Result
                    </summary>
                    <pre className="mt-1 text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
                      {typeof call.result === "string"
                        ? call.result
                        : JSON.stringify(call.result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
