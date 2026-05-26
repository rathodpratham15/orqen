/**
 * Dashboard — list all workflows, create new ones.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Play, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { Workflow } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    api.workflows.list()
      .then(setWorkflows)
      .catch((err) => setError(err.message ?? "Could not reach the server"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const wf = await api.workflows.create({ name: "Untitled Workflow" });
      router.push(`/editor/${wf.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap size={22} className="text-purple-400" />
            Workflows
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Build and run AI agent workflows
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          <Plus size={16} />
          {creating ? "Creating…" : "New Workflow"}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-[#13131f] border border-[#2a2a40] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <Zap size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-300">Could not load workflows</h2>
          <p className="text-sm text-zinc-500 mt-1 mb-2 max-w-xs">{error}</p>
          <p className="text-xs text-zinc-600">Make sure the backend server is running on port 8000</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-4">
            <Zap size={24} className="text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-300">No workflows yet</h2>
          <p className="text-sm text-zinc-600 mt-1 mb-6">
            Create your first AI workflow to get started
          </p>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} /> New Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const nodeCount = workflow.definition?.nodes?.length ?? 0;

  return (
    <Link href={`/editor/${workflow.id}`}>
      <div className="group h-36 rounded-xl bg-[#13131f] border border-[#2a2a40] hover:border-[#4a4a70] p-5 flex flex-col justify-between transition-all cursor-pointer hover:bg-[#15151f]">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-zinc-200 text-sm leading-snug group-hover:text-white transition-colors">
              {workflow.name}
            </h3>
            <span className={cn(
              "flex-shrink-0 w-2 h-2 rounded-full mt-1",
              workflow.is_active ? "bg-green-500" : "bg-zinc-600",
            )} />
          </div>
          {workflow.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-600">
          <span>{nodeCount} node{nodeCount !== 1 ? "s" : ""}</span>
          <span>{formatDate(workflow.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
