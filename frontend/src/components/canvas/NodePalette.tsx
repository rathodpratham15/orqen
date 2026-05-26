"use client";

import {
  Sparkles, Globe, GitBranch, ShieldCheck,
  MessageSquare, Mail, Terminal, Bot, Database, GripVertical,
} from "lucide-react";
import type { NodeType } from "@/lib/types";

interface PaletteItem {
  type:        NodeType;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;  // icon foreground
  accent:      string;  // icon background
  section:     string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // AI & Agents
  { type: "llm",      label: "LLM",      description: "Call Claude with a prompt",       icon: Sparkles,     color: "#a78bfa", accent: "rgba(124,58,237,0.2)",  section: "AI & Agents" },
  { type: "agent",    label: "Agent",    description: "ReAct agent with tools",           icon: Bot,          color: "#c4b5fd", accent: "rgba(109,40,217,0.2)",  section: "AI & Agents" },
  { type: "memory",   label: "Memory",   description: "Store/search vector memory",       icon: Database,     color: "#f0abfc", accent: "rgba(168,85,247,0.2)",  section: "AI & Agents" },
  // Logic
  { type: "condition",label: "Condition",description: "Branch on a comparison",           icon: GitBranch,    color: "#fcd34d", accent: "rgba(217,119,6,0.2)",   section: "Logic" },
  { type: "approval", label: "Approval", description: "Pause for human review",           icon: ShieldCheck,  color: "#5eead4", accent: "rgba(13,148,136,0.2)",  section: "Logic" },
  { type: "code",     label: "Code",     description: "Run a Python snippet",             icon: Terminal,     color: "#fb923c", accent: "rgba(234,88,12,0.2)",   section: "Logic" },
  // Integrations
  { type: "http",     label: "HTTP",     description: "Call any REST API",                icon: Globe,        color: "#60a5fa", accent: "rgba(37,99,235,0.2)",   section: "Integrations" },
  { type: "slack",    label: "Slack",    description: "Post to a Slack channel",          icon: MessageSquare,color: "#4ade80", accent: "rgba(22,163,74,0.2)",   section: "Integrations" },
  { type: "email",    label: "Email",    description: "Send an email via Resend",         icon: Mail,         color: "#38bdf8", accent: "rgba(2,132,199,0.2)",   section: "Integrations" },
];

const SECTIONS = ["AI & Agents", "Logic", "Integrations"];

export function NodePalette() {
  function onDragStart(e: React.DragEvent, type: NodeType) {
    e.dataTransfer.setData("application/orqen-node-type", type);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside
      data-testid="node-palette"
      className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#1E1E2E] bg-[#0d0d14] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 border-b border-[#1E1E2E] bg-[#0d0d14] px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Nodes</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Drag onto the canvas</p>
      </div>

      <div className="p-3 space-y-5">
        {SECTIONS.map((section) => {
          const items = PALETTE_ITEMS.filter((n) => n.section === section);
          return (
            <div key={section}>
              <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section}
              </div>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      data-testid={`palette-${item.type}`}
                      className="group flex cursor-grab items-center gap-2.5 rounded-md border border-[#1E1E2E] bg-[#12121A] p-2.5 transition-all hover:border-violet-500/40 hover:-translate-y-px active:cursor-grabbing select-none"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
                        style={{ background: item.accent }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} style={{ color: item.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200">{item.label}</div>
                        <div className="truncate text-[10px] text-slate-500">{item.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
