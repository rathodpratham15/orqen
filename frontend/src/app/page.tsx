"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkflowCard } from "@/components/WorkflowCard";
import { NewWorkflowModal } from "@/components/NewWorkflowModal";
import { DeleteWorkflowModal } from "@/components/DeleteWorkflowModal";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Workflow } from "@/lib/types";

const FILTERS = ["All", "Active", "Inactive"] as const;
type Filter = (typeof FILTERS)[number];

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [filter,    setFilter]    = useState<Filter>("All");
  const [showNew,   setShowNew]   = useState(false);
  const [toDelete,  setToDelete]  = useState<Workflow | null>(null);

  useEffect(() => {
    api.workflows.list()
      .then(setWorkflows)
      .catch((e) => toast.error("Could not load workflows", { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return workflows.filter((w) => {
      const q = query.toLowerCase();
      const matchesQuery = !q || w.name.toLowerCase().includes(q) || (w.description ?? "").toLowerCase().includes(q);
      const matchesFilter =
        filter === "All" ||
        (filter === "Active"   && w.is_active) ||
        (filter === "Inactive" && !w.is_active);
      return matchesQuery && matchesFilter;
    });
  }, [workflows, query, filter]);

  async function handleCreate(data: { name: string; description: string; trigger: "manual" | "cron" | "webhook" }) {
    try {
      const wf = await api.workflows.create({
        name:           data.name,
        description:    data.description || undefined,
        trigger_config: { type: data.trigger, config: {} },
      });
      toast.success("Workflow created", { description: wf.name });
      router.push(`/editor/${wf.id}`);
    } catch (e: unknown) {
      toast.error("Failed to create workflow");
    }
  }

  async function handleDelete(wf: Workflow) {
    try {
      await api.workflows.delete(wf.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
      toast.success("Workflow deleted", { description: wf.name });
    } catch {
      toast.error("Failed to delete workflow");
    }
    setToDelete(null);
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-[1400px] mx-auto w-full" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Workflows</h1>
          <p className="mt-1 text-sm text-slate-500">Build and run AI pipelines</p>
        </div>
        <Button
          onClick={() => setShowNew(true)}
          className="gap-2 shadow-lg shadow-violet-900/30"
          data-testid="new-workflow-btn"
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Search + filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows…"
            className="pl-9"
            data-testid="search-workflows"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[#2a2a40] bg-[#12121A] p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-${f.toLowerCase()}`}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-violet-500/15 text-violet-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid / states */}
      {loading ? (
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg shimmer" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" data-testid="workflow-grid">
          {filtered.map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              onDelete={setToDelete}
              onToggle={(id, active) =>
                setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, is_active: active } : w)))
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center justify-center text-center" data-testid="empty-state">
          <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-2xl border border-[#1E1E2E] bg-[#12121A]">
            <WorkflowIcon className="h-14 w-14 text-violet-500/60" strokeWidth={1.2} />
            <span className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-violet-500/60" />
            <span className="absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-violet-500/30" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">
            {query || filter !== "All" ? "No workflows match your filters" : "No workflows yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {query || filter !== "All" ? "Try a different search or filter." : "Create your first AI pipeline"}
          </p>
          {!(query || filter !== "All") && (
            <Button onClick={() => setShowNew(true)} className="mt-6 gap-2" data-testid="empty-new-workflow">
              <Plus className="h-4 w-4" />
              New Workflow
            </Button>
          )}
        </div>
      )}

      <NewWorkflowModal open={showNew} onOpenChange={setShowNew} onCreate={handleCreate} />
      <DeleteWorkflowModal
        workflow={toDelete}
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
