"use client";

import { type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function ConditionNode({ data, id, selected }: NodeProps<OrqenNodeData & Record<string, unknown>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const left  = (config.left  as string | undefined) ?? "";
  const op    = (config.operator as string | undefined) ?? "==";
  const right = (config.right as string | undefined) ?? "";

  return (
    <BaseNode
      accent="condition"
      icon={<GitBranch size={13} className="text-amber-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
      dualSource
    >
      {left || right ? (
        <p className="text-zinc-400 font-mono text-[10px] leading-relaxed">
          <span className="text-zinc-300">{truncate(left, 18)}</span>
          {" "}
          <span className="text-amber-400">{op}</span>
          {" "}
          <span className="text-zinc-300">{truncate(right, 18)}</span>
        </p>
      ) : (
        <p className="text-zinc-600 italic">No condition set</p>
      )}
      {/* Branch handle labels */}
      <div className="flex justify-between text-[9px] text-zinc-600 pt-1">
        <span className="text-green-600">true</span>
        <span className="text-red-600">false</span>
      </div>
    </BaseNode>
  );
}
