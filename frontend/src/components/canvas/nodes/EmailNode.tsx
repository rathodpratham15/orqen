"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { Mail } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function EmailNode({ data, id, selected }: NodeProps<Node<OrqenNodeData>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const to      = (config.to      as string | undefined) ?? "";
  const subject = (config.subject as string | undefined) ?? "";

  return (
    <BaseNode
      accent="email"
      icon={<Mail size={13} className="text-sky-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      {to ? (
        <p className="text-sky-400/70 text-[10px] font-mono truncate">→ {to}</p>
      ) : (
        <p className="text-zinc-600 text-[10px] italic">No recipient</p>
      )}
      {subject ? (
        <p className="text-zinc-500 leading-relaxed">{truncate(subject, 50)}</p>
      ) : (
        <p className="text-zinc-600 italic">No subject</p>
      )}
    </BaseNode>
  );
}
