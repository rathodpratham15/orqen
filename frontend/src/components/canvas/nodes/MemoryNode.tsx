"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Database } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function MemoryNode({ data, id, selected }: NodeProps<Node<OrqenNodeData>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const operation  = (config.operation as string | undefined) ?? "search";
  const collection = (config.collection as string | undefined) ?? "default";
  const query      = (config.query as string | undefined) ?? "";
  const content    = (config.content as string | undefined) ?? "";
  const preview    = operation === "store" ? content : query;

  return (
    <BaseNode
      nodeId={id}
      accent="memory"
      icon={<Database size={13} className="text-pink-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            operation === "store"
              ? "bg-pink-500/20 text-pink-400"
              : "bg-sky-500/20 text-sky-400"
          }`}
        >
          {operation}
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">{collection}</span>
      </div>
      {preview ? (
        <p className="text-zinc-500 leading-relaxed">{truncate(preview, 50)}</p>
      ) : (
        <p className="text-zinc-600 italic">
          {operation === "store" ? "No content set" : "No query set"}
        </p>
      )}
    </BaseNode>
  );
}
