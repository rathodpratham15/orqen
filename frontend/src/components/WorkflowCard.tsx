"use client";

import { useRouter } from "next/navigation";
import { Clock, Webhook, Hand, MoreVertical, Play, GitBranch } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Workflow } from "@/lib/types";

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)   return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const TRIGGER_META: Record<string, { label: string; icon: React.ElementType }> = {
  manual:  { label: "Manual",  icon: Hand    },
  cron:    { label: "Cron",    icon: Clock   },
  webhook: { label: "Webhook", icon: Webhook },
};

interface WorkflowCardProps {
  workflow:  Workflow;
  onDelete?: (workflow: Workflow) => void;
  onToggle?: (id: string, active: boolean) => void;
}

export function WorkflowCard({ workflow, onDelete, onToggle }: WorkflowCardProps) {
  const router = useRouter();
  const triggerType = workflow.trigger_config?.type ?? "manual";
  const TriggerIcon = TRIGGER_META[triggerType]?.icon ?? Hand;
  const triggerLabel = TRIGGER_META[triggerType]?.label ?? "Manual";
  const nodeCount = workflow.definition?.nodes?.length ?? 0;

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const run = await api.workflows.triggerRun(workflow.id);
      toast.success("Run triggered", { description: `${workflow.name} → ${run.id.slice(0, 8)}` });
      router.push(`/runs/${run.id}`);
    } catch {
      toast.error("Failed to trigger run");
    }
  }

  return (
    <div
      data-testid={`workflow-card-${workflow.id}`}
      onClick={() => router.push(`/editor/${workflow.id}`)}
      className="group relative flex cursor-pointer flex-col rounded-lg border border-[#1E1E2E] bg-[#12121A] p-5 transition-all hover:border-violet-500/40 hover:shadow-[inset_3px_0_0_0_#7c3aed] hover:-translate-y-0.5"
    >
      {/* Top row: name + active toggle */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100 leading-tight">
          {workflow.name}
        </h3>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <Switch
            checked={workflow.is_active}
            onCheckedChange={async (checked) => {
              try {
                await api.workflows.update(workflow.id, { is_active: checked });
                onToggle?.(workflow.id, checked);
                toast.success(checked ? "Activated" : "Deactivated");
              } catch {
                toast.error("Failed to update");
              }
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`workflow-menu-${workflow.id}`}
                className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/editor/${workflow.id}`)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(workflow)}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                data-testid="menu-delete"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-slate-500 line-clamp-2">
        {workflow.description || "No description"}
      </p>

      {/* Trigger + node count */}
      <div className="mt-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-[#1E1E2E] bg-[#0a0a0f] px-2 py-1 text-xs text-slate-300">
          <TriggerIcon className="h-3 w-3" />
          {triggerLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded border border-[#1E1E2E] bg-[#0a0a0f] px-2 py-1 text-xs text-slate-400">
          <GitBranch className="h-3 w-3" />
          {nodeCount} nodes
        </span>
      </div>

      {/* Bottom row */}
      <div className="mt-5 flex items-center justify-between border-t border-[#1E1E2E] pt-3">
        <span className="text-xs text-slate-500">Updated {fmtRelative(workflow.updated_at)}</span>
        <Button
          size="sm"
          onClick={handleRun}
          className="h-7 gap-1 bg-violet-600 px-2.5 text-xs hover:bg-violet-500"
          data-testid={`workflow-run-${workflow.id}`}
        >
          <Play className="h-3 w-3 fill-current" />
          Run
        </Button>
      </div>
    </div>
  );
}
