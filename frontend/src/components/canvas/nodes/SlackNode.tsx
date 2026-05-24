"use client";

import { type NodeProps, type Node } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function SlackNode({ data, id, selected }: NodeProps<Node<OrqenNodeData>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const text       = (config.text        as string | undefined) ?? "";
  const webhookSet = Boolean(config.webhook_url);

  return (
    <BaseNode
      accent="slack"
      icon={<MessageSquare size={13} className="text-green-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      <div className="flex items-center gap-1.5">
        <span className={webhookSet ? "text-green-500 text-[10px]" : "text-zinc-600 text-[10px]"}>
          {webhookSet ? "● webhook set" : "○ no webhook"}
        </span>
      </div>
      {text ? (
        <p className="text-zinc-500 leading-relaxed">{truncate(text, 55)}</p>
      ) : (
        <p className="text-zinc-600 italic">No message set</p>
      )}
    </BaseNode>
  );
}
