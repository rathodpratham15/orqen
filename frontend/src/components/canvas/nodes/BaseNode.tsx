/**
 * BaseNode — shared wrapper for all Orqen node types.
 *
 * Renders:
 *  - Colored left border accent (per node type)
 *  - Header: icon + label + status ring
 *  - Body: children (type-specific content)
 *  - React Flow handles (top = input, bottom = output)
 *  - Running pulse animation via Tailwind
 */
"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/types";
import type { ReactNode } from "react";

export type NodeAccent = "llm" | "http" | "condition" | "approval";

const ACCENT_CLASSES: Record<NodeAccent, string> = {
  llm:       "border-l-[3px] border-l-purple-500",
  http:      "border-l-[3px] border-l-blue-500",
  condition: "border-l-[3px] border-l-amber-500",
  approval:  "border-l-[3px] border-l-teal-500",
};

const STATUS_RING: Record<NodeStatus, string> = {
  pending:  "bg-zinc-500",
  running:  "bg-blue-500 animate-pulse",
  success:  "bg-green-500",
  failed:   "bg-red-500",
  skipped:  "bg-zinc-600",
  paused:   "bg-amber-500 animate-pulse",
};

interface BaseNodeProps {
  accent:   NodeAccent;
  icon:     ReactNode;
  label:    string;
  status?:  NodeStatus;
  selected?: boolean;
  children: ReactNode;
  // For condition nodes that need two source handles
  dualSource?: boolean;
}

export function BaseNode({
  accent,
  icon,
  label,
  status,
  selected,
  children,
  dualSource = false,
}: BaseNodeProps) {
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
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              STATUS_RING[status],
            )}
            title={status}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs text-zinc-400 space-y-1">
        {children}
      </div>

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
