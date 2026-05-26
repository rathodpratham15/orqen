"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Hand, Clock, Webhook } from "lucide-react";

interface CreateData {
  name:        string;
  description: string;
  trigger:     "manual" | "cron" | "webhook";
  cron_expr?:  string;
}

interface NewWorkflowModalProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onCreate:     (data: CreateData) => void;
}

export function NewWorkflowModal({ open, onOpenChange, onCreate }: NewWorkflowModalProps) {
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [trigger,     setTrigger]     = useState<"manual" | "cron" | "webhook">("manual");
  const [cronExpr,    setCronExpr]    = useState("0 9 * * *");

  function reset() {
    setName(""); setDescription(""); setTrigger("manual"); setCronExpr("0 9 * * *");
  }

  function submit() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), trigger, cron_expr: cronExpr });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md" data-testid="new-workflow-modal">
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
          <DialogDescription>Give your pipeline a name and pick how it should be triggered.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name" className="text-xs uppercase tracking-wide text-slate-400">Name</Label>
            <Input
              id="wf-name"
              data-testid="new-wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead Enrichment"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wf-desc" className="text-xs uppercase tracking-wide text-slate-400">Description</Label>
            <Textarea
              id="wf-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-slate-400">Trigger</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "manual",  label: "Manual",  icon: Hand    },
                { v: "cron",    label: "Cron",    icon: Clock   },
                { v: "webhook", label: "Webhook", icon: Webhook },
              ] as const).map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  type="button"
                  data-testid={`trigger-${v}`}
                  onClick={() => setTrigger(v)}
                  className={`flex flex-col items-center gap-1 rounded-md border px-3 py-2.5 text-xs transition-colors ${
                    trigger === v
                      ? "border-violet-500/60 bg-violet-500/10 text-violet-200"
                      : "border-[#2a2a40] bg-[#0a0a0f] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {trigger === "cron" && (
              <Input
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="0 9 * * *"
                className="mt-2 font-mono text-xs"
                data-testid="cron-expr"
              />
            )}
            {trigger === "webhook" && (
              <div className="mt-2 rounded-md border border-[#2a2a40] bg-[#0a0a0f] p-2 font-mono text-xs text-slate-400">
                POST https://orqen.app/hooks/&lt;workflow-id&gt;
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="new-wf-cancel">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()} data-testid="new-wf-create">
            Create Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
