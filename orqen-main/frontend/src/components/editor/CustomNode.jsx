import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Check, X, Loader2 } from "lucide-react";
import { NODE_TYPES, previewConfig } from "@/lib/nodeTypes";

function CustomNode({ data, selected, type, id }) {
  const meta = NODE_TYPES[type] || NODE_TYPES.llm;
  const Icon = meta.icon;
  const status = data.runStatus; // success | failed | running | pending | undefined

  const statusRing =
    status === "running"
      ? "ring-2 ring-cyan-400 pulse-cyan"
      : status === "success"
      ? "ring-1 ring-emerald-500/40"
      : status === "failed"
      ? "ring-1 ring-red-500/60"
      : selected
      ? "ring-2 ring-violet-500"
      : "ring-1 ring-border";

  const isCondition = type === "condition";

  return (
    <div
      data-testid={`node-${id}`}
      className={`relative w-[200px] rounded-lg bg-[#12121A] shadow-lg ${statusRing} transition-shadow`}
    >
      {/* Top accent bar */}
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2"
        style={{ background: meta.accent, borderBottom: `1px solid ${meta.color}30` }}
      >
        <div className="flex h-5 w-5 items-center justify-center rounded" style={{ color: meta.color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>

        {/* status badge */}
        {status === "success" && (
          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
        {status === "failed" && (
          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white" title={data.error}>
            <X className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
        {status === "running" && (
          <span className="ml-auto flex h-4 w-4 items-center justify-center text-cyan-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <div className="text-sm font-semibold text-slate-100 truncate">{data.label}</div>
        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 font-mono">
          {previewConfig(type, data.config)}
        </div>
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="!bg-[#12121A]" style={{ borderColor: meta.color }} />

      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="handle-true !bg-[#12121A]"
            style={{ top: "35%" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="handle-false !bg-[#12121A]"
            style={{ top: "70%" }}
          />
          <span className="absolute -right-1 top-[28%] translate-x-full text-[9px] font-semibold text-emerald-400">
            true
          </span>
          <span className="absolute -right-1 top-[63%] translate-x-full text-[9px] font-semibold text-red-400">
            false
          </span>
        </>
      ) : (
        <Handle type="source" position={Position.Right} className="!bg-[#12121A]" style={{ borderColor: meta.color }} />
      )}
    </div>
  );
}

export default memo(CustomNode);
