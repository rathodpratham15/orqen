"use client";

import { type NodeProps } from "@xyflow/react";
import { Globe } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import { cn } from "@/lib/utils";
import type { OrqenNodeData } from "@/stores/editor-store";

const METHOD_COLORS: Record<string, string> = {
  GET:    "text-green-400",
  POST:   "text-blue-400",
  PUT:    "text-amber-400",
  PATCH:  "text-orange-400",
  DELETE: "text-red-400",
};

export function HTTPNode({ data, id, selected }: NodeProps<OrqenNodeData & Record<string, unknown>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const method = (config.method as string | undefined) ?? "GET";
  const url = (config.url as string | undefined) ?? "";

  return (
    <BaseNode
      accent="http"
      icon={<Globe size={13} className="text-blue-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      <div className="flex items-center gap-2">
        <span className={cn("font-mono font-bold text-[10px]", METHOD_COLORS[method] ?? "text-zinc-400")}>
          {method}
        </span>
        {nodeStatus?.duration_ms ? (
          <span className="text-[10px] text-zinc-500 ml-auto">{nodeStatus.duration_ms}ms</span>
        ) : null}
      </div>
      {url ? (
        <p className="text-zinc-500 font-mono text-[10px] break-all leading-relaxed">
          {truncate(url, 50)}
        </p>
      ) : (
        <p className="text-zinc-600 italic">No URL set</p>
      )}
    </BaseNode>
  );
}
