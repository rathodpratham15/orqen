/**
 * Workflow Editor — React Flow canvas with node palette and config panel.
 * This is the flagship page.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useEditorStore } from "@/stores/editor-store";
import { NodePalette }     from "@/components/canvas/NodePalette";
import { WorkflowCanvas }  from "@/components/canvas/WorkflowCanvas";
import { ConfigPanel }     from "@/components/canvas/ConfigPanel";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const { loadFromDefinition, setWorkflowId, setWorkflowName, workflowName, isDirty } =
    useEditorStore();

  useEffect(() => {
    api.workflows.get(id)
      .then((wf) => {
        setWorkflowId(wf.id);
        setWorkflowName(wf.name);
        loadFromDefinition(wf.definition);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-zinc-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d0d14] border-b border-[#1a1a28] flex-shrink-0">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <EditableName
          value={workflowName}
          onChange={setWorkflowName}
        />
        {isDirty && (
          <span className="text-[10px] text-zinc-600 bg-[#1a1a2e] px-2 py-0.5 rounded-full">
            unsaved
          </span>
        )}
      </div>

      {/* Three-column layout: palette | canvas | config */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <WorkflowCanvas workflowId={id} />
        <ConfigPanel />
      </div>
    </div>
  );
}

function EditableName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        className="bg-transparent border-b border-[#4a4a70] text-zinc-200 text-sm font-semibold outline-none px-0 py-0.5 min-w-0 max-w-xs"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm font-semibold text-zinc-200 hover:text-white truncate max-w-xs"
    >
      {value}
    </button>
  );
}
