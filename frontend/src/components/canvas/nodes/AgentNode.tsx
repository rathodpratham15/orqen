"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Bot } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function AgentNode({ data, id, selected }: NodeProps<Node<OrqenNodeData>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const goal       = (config.goal as string | undefined) ?? "";
  const maxIter    = (config.max_iterations as number | undefined) ?? 10;
  const tools      = (config.available_tools as string[] | undefined) ?? ["http_request", "run_python"];

  return (
    <BaseNode
      accent="agent"
      icon={<Bot size={13} className="text-violet-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      <div className="flex items-center justify-between">
        <span className="text-violet-400/70 font-mono text-[10px]">
          {tools.length} tool{tools.length !== 1 ? "s" : ""} · max {maxIter}
        </span>
        {nodeStatus?.tokens ? (
          <span className="text-[10px] text-zinc-500">{nodeStatus.tokens} tok</span>
        ) : null}
      </div>
      {goal ? (
        <p className="text-zinc-500 leading-relaxed">{truncate(goal, 55)}</p>
      ) : (
        <p className="text-zinc-600 italic">No goal set</p>
      )}
    </BaseNode>
  );
}
