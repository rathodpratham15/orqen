"use client";

import { type NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { truncate } from "@/lib/utils";
import { useRunStore } from "@/stores/run-store";
import type { OrqenNodeData } from "@/stores/editor-store";

export function LLMNode({ data, id, selected }: NodeProps<OrqenNodeData & Record<string, unknown>>) {
  const nodeStatus = useRunStore((s) => s.nodeStatuses[id]);
  const { config, label } = data as OrqenNodeData;

  const model = (config.model as string | undefined)?.replace("claude-", "") ?? "claude";
  const prompt = (config.prompt as string | undefined) ?? "";

  return (
    <BaseNode
      accent="llm"
      icon={<Sparkles size={13} className="text-purple-400" />}
      label={label}
      status={nodeStatus?.status}
      selected={selected}
    >
      <div className="flex items-center justify-between">
        <span className="text-purple-400/70 font-mono text-[10px]">{model}</span>
        {nodeStatus?.tokens ? (
          <span className="text-[10px] text-zinc-500">{nodeStatus.tokens} tok</span>
        ) : null}
      </div>
      {prompt ? (
        <p className="text-zinc-500 leading-relaxed">
          {truncate(prompt, 55)}
        </p>
      ) : (
        <p className="text-zinc-600 italic">No prompt set</p>
      )}
    </BaseNode>
  );
}
