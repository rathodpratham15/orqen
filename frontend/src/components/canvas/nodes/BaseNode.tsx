/**
 * BaseNode — shared wrapper for all Orqen node types.
 *
 * Renders:
 *  - Colored left border accent (per node type)
 *  - Header: icon + label + status ring
 *  - Body: children (type-specific content)
 *  - Output preview: expandable section shown after a run completes
 *  - React Flow handles (top = input, bottom = output)
 */
"use client";

import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { NodeStatus } from "@/lib/types";
import type { ReactNode } from "react";

export type NodeAccent = "llm" | "http" | "condition" | "approval" | "slack" | "email" | "code" | "agent" | "memory";

const ACCENT_CLASSES: Record<NodeAccent, string> = {
  llm:       "border-l-[3px] border-l-purple-500",
  http:      "border-l-[3px] border-l-blue-500",
  condition: "border-l-[3px] border-l-amber-500",
  approval:  "border-l-[3px] border-l-teal-500",
  slack:     "border-l-[3px] border-l-green-500",
  email:     "border-l-[3px] border-l-sky-500",
  code:      "border-l-[3px] border-l-orange-500",
  agent:     "border-l-[3px] border-l-violet-500",
  memory:    "border-l-[3px] border-l-pink-500",
};

const STATUS_RING: Record<NodeStatus, string> = {
  pending:  "bg-zinc-500",
  running:  "bg-blue-500 animate-pulse",
  success:  "bg-green-500",
  failed:   "bg-red-500",
  skipped:  "bg-zinc-600",
  paused:   "bg-amber-500 animate-pulse",
};

/** Extract the most meaningful text snippet from a node's output */
function getOutputText(accent: NodeAccent, output: Record<string, unknown>): string | null {
  switch (accent) {
    case "llm":
      return typeof output.text === "string" ? output.text : null;

    case "agent":
      return typeof output.final_answer === "string" ? output.final_answer : null;

    case "http": {
      const code = output.status_code ?? "";
      const body = output.body;
      if (typeof body === "string")
        return `${code}  ${body.slice(0, 200)}`;
      if (body !== null && body !== undefined)
        return `${code}  ${JSON.stringify(body).slice(0, 200)}`;
      return String(code) || null;
    }

    case "code": {
      const r = output.result;
      if (r === null || r === undefined) return null;
      return typeof r === "string" ? r : JSON.stringify(r, null, 2).slice(0, 300);
    }

    case "condition":
      return typeof output.evaluated === "string" ? output.evaluated : null;

    case "memory": {
      const results = output.results as unknown[] | undefined;
      if (Array.isArray(results) && results.length > 0)
        return results
          .map((r, i) => `${i + 1}. ${typeof r === "string" ? r : JSON.stringify(r)}`)
          .join("\n")
          .slice(0, 300);
      return output.stored ? "✓ Stored" : null;
    }

    case "slack":
    case "email":
      return output.message_id
        ? `Sent · id ${output.message_id}`
        : output.ok
          ? "Sent successfully"
          : null;

    case "approval":
      return typeof output.message === "string" ? output.message : null;

    default:
      return null;
  }
}

interface BaseNodeProps {
  nodeId:    string;
  accent:    NodeAccent;
  icon:      ReactNode;
  label:     string;
  status?:   NodeStatus;
  selected?: boolean;
  children:  ReactNode;
  dualSource?: boolean;
}

export function BaseNode({
  nodeId,
  accent,
  icon,
  label,
  status,
  selected,
  children,
  dualSource = false,
}: BaseNodeProps) {
  const output       = useRunStore((s) => s.nodeOutputs[nodeId]);
  const [open, setOpen] = useState(false);

  const outputText = output ? getOutputText(accent, output) : null;

  return (
    <div
      className={cn(
        "relative min-w-[200px] max-w-[240px] rounded-lg",
        "bg-[#1a1a2e] border border-[#2a2a40]",
        ACCENT_CLASSES[accent],
        selected && "border-[#4a4a70] shadow-lg shadow-black/40",
        "transition-all duration-150",
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#3a3a55] !border-2 !border-[#5a5a75] hover:!bg-[#6a6aaa] !transition-colors"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a40]">
        <span className="text-sm opacity-70">{icon}</span>
        <span className="text-xs font-semibold text-zinc-200 tracking-wide flex-1 truncate">
          {label}
        </span>
        {status && (
          <span
            className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_RING[status])}
            title={status}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs text-zinc-400 space-y-1">
        {children}
      </div>

      {/* ── Output preview ──────────────────────────────────────────────────── */}
      {outputText && (
        <div className="border-t border-[#2a2a40]">
          {/* Toggle row */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors select-none"
          >
            {open
              ? <ChevronDown size={10} className="flex-shrink-0" />
              : <ChevronRight size={10} className="flex-shrink-0" />
            }
            <span className="font-medium">Output</span>
            {!open && (
              <span className="ml-1 truncate text-zinc-600 max-w-[140px]">
                {outputText.replace(/\n/g, " ")}
              </span>
            )}
          </button>

          {/* Expanded content */}
          {open && (
            <div className="px-3 pb-2.5">
              <p className="text-[10px] text-zinc-300 leading-relaxed whitespace-pre-wrap break-words max-h-36 overflow-y-auto">
                {outputText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Output handle(s) */}
      {dualSource ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className="!w-3 !h-3 !bg-green-700 !border-2 !border-green-500 hover:!bg-green-500 !transition-colors"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className="!w-3 !h-3 !bg-red-700 !border-2 !border-red-500 hover:!bg-red-500 !transition-colors"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-[#3a3a55] !border-2 !border-[#5a5a75] hover:!bg-[#6a6aaa] !transition-colors"
        />
      )}
    </div>
  );
}
