"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { ShieldCheck } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function ApprovalNode({ data, id, selected }: NodeProps<Node<OrqenNodeData>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const message = (config.message as string | undefined) ?? "";
  const timeout = (config.timeout_hours as number | undefined) ?? 24;

  const isPaused = nodeStatus?.status === "paused";

  return (
    <BaseNode
      nodeId={id}
      accent="approval"
      icon={<ShieldCheck size={13} className="text-teal-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      {message ? (
        <p className={isPaused ? "text-amber-300" : "text-zinc-500"}>
          {truncate(message, 55)}
        </p>
      ) : (
        <p className="text-zinc-600 italic">No message set</p>
      )}
      <p className="text-zinc-600 text-[10px]">Timeout: {timeout}h</p>
      {isPaused && (
        <div className="mt-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium text-center">
          ⏸ Waiting for approval
        </div>
      )}
    </BaseNode>
  );
}
