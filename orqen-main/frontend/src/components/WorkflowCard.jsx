import { useNavigate } from "react-router-dom";
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
import { fmtRelative, useData } from "@/lib/dataStore";
import { toast } from "sonner";

const TRIGGER_META = {
  manual: { label: "Manual", icon: Hand },
  cron: { label: "Cron", icon: Clock },
  webhook: { label: "Webhook", icon: Webhook },
};

export default function WorkflowCard({ workflow, onDelete, onEdit }) {
  const navigate = useNavigate();
  const { toggleActive, duplicateWorkflow, triggerRun } = useData();
  const TriggerIcon = TRIGGER_META[workflow.trigger]?.icon || Hand;
  const triggerLabel = TRIGGER_META[workflow.trigger]?.label || "Manual";

  const handleRun = (e) => {
    e.stopPropagation();
    const run = triggerRun(workflow.id);
    if (run) {
      toast.success("Run triggered", { description: `${workflow.name} → ${run.id}` });
      navigate(`/runs/${run.id}`);
    }
  };

  return (
    <div
      data-testid={`workflow-card-${workflow.id}`}
      onClick={() => navigate(`/editor/${workflow.id}`)}
      className="group relative flex cursor-pointer flex-col rounded-lg border border-border bg-[#12121A] p-5 transition-all hover:border-violet-500/40 hover:shadow-[inset_3px_0_0_0_#7c3aed] hover:-translate-y-0.5"
    >
      {/* Top row: name + active toggle */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100 leading-tight" data-testid="workflow-name">
          {workflow.name}
        </h3>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <Switch
            checked={workflow.active}
            onCheckedChange={() => {
              toggleActive(workflow.id);
              toast.success(workflow.active ? "Deactivated" : "Activated");
            }}
            className="data-[state=checked]:bg-violet-600"
            data-testid={`workflow-toggle-${workflow.id}`}
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
            <DropdownMenuContent
              align="end"
              className="bg-[#12121A] border-border text-slate-200"
            >
              <DropdownMenuItem onClick={() => navigate(`/editor/${workflow.id}`)} data-testid="menu-edit">
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  duplicateWorkflow(workflow.id);
                  toast.success("Workflow duplicated");
                }}
                data-testid="menu-duplicate"
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
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
      <p
        className="mt-2 text-sm text-slate-500 overflow-hidden"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
      >
        {workflow.description || "No description"}
      </p>

      {/* Trigger + node count */}
      <div className="mt-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-border bg-[#0a0a0f] px-2 py-1 text-xs text-slate-300">
          <TriggerIcon className="h-3 w-3" />
          {triggerLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded border border-border bg-[#0a0a0f] px-2 py-1 text-xs text-slate-400">
          <GitBranch className="h-3 w-3" />
          {(workflow.nodes || []).length} nodes
        </span>
      </div>

      {/* Bottom row */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-slate-500">Updated {fmtRelative(workflow.updatedAt)}</span>
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
