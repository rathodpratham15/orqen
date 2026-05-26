import { useNavigate } from "react-router-dom";
import { Save, Play, ChevronRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopToolbar({
  workflowName,
  onRename,
  dirty,
  onSave,
  onRun,
  runStatus, // null | 'running' | 'success' | 'failed'
}) {
  const navigate = useNavigate();

  const statusBadge = runStatus && (
    <div
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
        runStatus === "running"
          ? "bg-cyan-500/10 text-cyan-300"
          : runStatus === "success"
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-red-500/10 text-red-300"
      }`}
      data-testid="run-status-badge"
    >
      {runStatus === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {runStatus === "success" && <CheckCircle2 className="h-3 w-3" />}
      {runStatus === "failed" && <XCircle className="h-3 w-3" />}
      {runStatus === "running" ? "Running" : runStatus === "success" ? "Success" : "Failed"}
    </div>
  );

  return (
    <div
      data-testid="editor-toolbar"
      className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-[#12121A]/95 px-3 py-2 shadow-xl backdrop-blur"
    >
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("/")}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        data-testid="breadcrumb-workflows"
      >
        Workflows
      </button>
      <ChevronRight className="h-3 w-3 text-slate-600" />

      {/* Editable name */}
      <input
        value={workflowName}
        onChange={(e) => onRename(e.target.value)}
        className="bg-transparent text-sm font-semibold text-slate-100 outline-none focus:bg-[#0a0a0f] focus:ring-1 focus:ring-violet-500 rounded px-2 py-0.5 min-w-[120px] max-w-[260px]"
        data-testid="workflow-name-input"
      />

      <div className="ml-2 h-5 w-px bg-border" />

      {statusBadge}

      <Button
        size="sm"
        variant="outline"
        disabled={!dirty}
        onClick={onSave}
        className="h-7 gap-1.5 border-border bg-transparent text-slate-200 hover:bg-white/5 disabled:opacity-40"
        data-testid="save-btn"
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </Button>

      <Button
        size="sm"
        onClick={onRun}
        className="h-7 gap-1.5 bg-violet-600 hover:bg-violet-500"
        data-testid="run-btn"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        Run
      </Button>
    </div>
  );
}
