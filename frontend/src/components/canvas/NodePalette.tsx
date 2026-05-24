/**
 * NodePalette — left sidebar with draggable node types.
 * Drag a node onto the canvas to add it to the workflow.
 */
"use client";

import { Sparkles, Globe, GitBranch, ShieldCheck, MessageSquare, Mail, Terminal } from "lucide-react";
import type { NodeType } from "@/lib/types";

interface PaletteItem {
  type:        NodeType;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  accent:      string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type:        "llm",
    label:       "LLM",
    description: "Call Claude with a prompt",
    icon:        <Sparkles size={14} />,
    accent:      "border-l-purple-500 text-purple-400",
  },
  {
    type:        "http",
    label:       "HTTP Request",
    description: "Call any REST API",
    icon:        <Globe size={14} />,
    accent:      "border-l-blue-500 text-blue-400",
  },
  {
    type:        "condition",
    label:       "Condition",
    description: "Branch on a comparison",
    icon:        <GitBranch size={14} />,
    accent:      "border-l-amber-500 text-amber-400",
  },
  {
    type:        "approval",
    label:       "Approval",
    description: "Pause for human review",
    icon:        <ShieldCheck size={14} />,
    accent:      "border-l-teal-500 text-teal-400",
  },
  {
    type:        "slack",
    label:       "Slack",
    description: "Post to a Slack channel",
    icon:        <MessageSquare size={14} />,
    accent:      "border-l-green-500 text-green-400",
  },
  {
    type:        "email",
    label:       "Email",
    description: "Send an email via Resend",
    icon:        <Mail size={14} />,
    accent:      "border-l-sky-500 text-sky-400",
  },
  {
    type:        "code",
    label:       "Code",
    description: "Run a Python snippet",
    icon:        <Terminal size={14} />,
    accent:      "border-l-orange-500 text-orange-400",
  },
];

export function NodePalette() {
  function onDragStart(e: React.DragEvent, type: NodeType) {
    e.dataTransfer.setData("application/orqen-node-type", type);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-[#13131f] border-r border-[#2a2a40] flex flex-col">
      <div className="px-3 py-3 border-b border-[#2a2a40]">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
          Nodes
        </p>
      </div>
      <div className="flex flex-col gap-1 p-2 overflow-y-auto flex-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className={`
              flex items-start gap-2 px-3 py-2.5 rounded-md cursor-grab active:cursor-grabbing
              bg-[#1a1a2e] border border-[#2a2a40] border-l-[3px]
              hover:border-[#3a3a55] hover:bg-[#1e1e35]
              transition-all duration-150 select-none
              ${item.accent}
            `}
          >
            <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200">{item.label}</p>
              <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-3 border-t border-[#2a2a40] text-[10px] text-zinc-600">
        Drag nodes onto the canvas
      </div>
    </aside>
  );
}
