"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Terminal } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function CodeNode({ data, id, selected }: NodeProps<Node<OrqenNodeData>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const code    = (config.code    as string | undefined) ?? "";
  const timeout = (config.timeout as number | undefined) ?? 10;

  // Show first non-comment, non-empty line as preview
  const preview = code
    .split("\n")
    .find((l) => l.trim() && !l.trim().startsWith("#"))
    ?? "";

  return (
    <BaseNode
      nodeId={id}
      accent="code"
      icon={<Terminal size={13} className="text-orange-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      <div className="flex items-center justify-between">
        <span className="text-orange-400/60 text-[10px]">Python</span>
        <span className="text-zinc-600 text-[10px]">{timeout}s timeout</span>
      </div>
      {preview ? (
        <p className="text-zinc-500 font-mono text-[10px] leading-relaxed">
          {truncate(preview, 50)}
        </p>
      ) : (
        <p className="text-zinc-600 italic">No code written</p>
      )}
    </BaseNode>
  );
}
