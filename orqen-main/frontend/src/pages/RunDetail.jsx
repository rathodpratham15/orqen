import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Clock,
  Hash,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  Pause,
  ChevronDown,
  Radio,
} from "lucide-react";
import { NODE_TYPES } from "@/lib/nodeTypes";
import { useData, fmtDuration, fmtNumber, fmtCost } from "@/lib/dataStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_ICON = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  running: <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-slate-500" />,
  paused: <Pause className="h-4 w-4 text-amber-400" />,
};

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRun, advanceRun, resolveApproval, approvals } = useData();
  const run = getRun(id);
  const [openNode, setOpenNode] = useState(null);
  const [tab, setTab] = useState("output");
  const [sseLive, setSseLive] = useState(false);

  // Mock SSE: poll the data store for advancing the running run
  useEffect(() => {
    if (!run || run.status !== "running") return;
    setSseLive(true);
    const runId = run.id;
    const tick = setInterval(() => advanceRun(runId), 1500);
    return () => {
      clearInterval(tick);
      setSseLive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id, run?.status, advanceRun]);

  const pendingApproval = useMemo(
    () => approvals.find((a) => a.runId === id && a.status === "pending"),
    [approvals, id]
  );

  if (!run) {
    return (
      <div className="px-8 py-8 max-w-[1400px] mx-auto" data-testid="run-detail-empty">
        <p className="text-slate-400">Run not found.</p>
        <Button variant="outline" onClick={() => navigate("/runs")} className="mt-4 border-border bg-transparent">
          Back to Runs
        </Button>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto" data-testid="run-detail-page">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <button onClick={() => navigate("/runs")} className="hover:text-slate-300">Runs</button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate(`/editor/${run.workflowId}`)} className="hover:text-slate-300">
          {run.workflowName}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-300 font-mono">Run #{run.id.replace(/^run_/, "")}</span>

        {sseLive && (
          <span className="ml-auto flex items-center gap-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300" data-testid="sse-live-badge">
            <Radio className="h-3 w-3 pulse-dot" />
            Live
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={Clock} label="Duration" value={fmtDuration(run.durationMs)} />
        <MetricCard icon={Hash} label="Tokens" value={fmtNumber(run.tokens)} />
        <MetricCard icon={DollarSign} label="Cost" value={fmtCost(run.cost)} />
        <MetricCard
          icon={Package}
          label="Nodes"
          value={`${run.nodes.filter((n) => n.status === "success").length}/${run.nodes.length}`}
        />
      </div>

      {/* Status banner */}
      <StatusBanner run={run} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Trace */}
        <div className="rounded-lg border border-border bg-[#12121A] p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Execution Trace</h2>
          <div className="relative">
            {run.nodes.map((n, idx) => {
              const meta = NODE_TYPES[n.type] || NODE_TYPES.llm;
              const Icon = meta.icon;
              const isOpen = openNode === n.id;
              return (
                <div key={n.id} className="relative pl-12 pb-4 last:pb-0">
                  {/* connector line */}
                  {idx < run.nodes.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px border-l border-dashed border-border" />
                  )}

                  {/* circle icon */}
                  <div
                    className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full ${
                      n.status === "running" ? "pulse-cyan" : ""
                    }`}
                    style={{ background: meta.accent, color: meta.color, border: `1px solid ${meta.color}40` }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1">{STATUS_ICON[n.status]}</span>
                  </div>

                  <div className="rounded-md border border-border bg-[#0d0d14]">
                    <button
                      onClick={() => { setOpenNode(isOpen ? null : n.id); setTab("output"); }}
                      data-testid={`trace-node-${n.id}`}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100 truncate">{n.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">{meta.label}</span>
                        </div>
                        {n.status === "running" && (
                          <div className="mt-0.5 text-[11px] text-cyan-400">In progress…</div>
                        )}
                        {n.type === "condition" && n.branch && (
                          <div className="mt-0.5 text-[11px]">
                            <span className={n.branch === "true" ? "text-emerald-400" : "text-red-400"}>
                              → {n.branch} branch
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {n.durationMs != null && (
                          <span className="rounded border border-border bg-[#0a0a0f] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                            {fmtDuration(n.durationMs)}
                          </span>
                        )}
                        {n.tokens > 0 && (
                          <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
                            {fmtNumber(n.tokens)} tokens
                          </span>
                        )}
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border px-3 py-3">
                        <div className="flex items-center gap-1 mb-2">
                          {["input", "output", ...(n.error ? ["error"] : [])].map((t) => (
                            <button
                              key={t}
                              onClick={() => setTab(t)}
                              className={`rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                                tab === t
                                  ? t === "error"
                                    ? "bg-red-500/15 text-red-300"
                                    : "bg-violet-500/15 text-violet-200"
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <pre className="json-block">
                          {tab === "input" && JSON.stringify(n.input, null, 2)}
                          {tab === "output" && JSON.stringify(n.output, null, 2)}
                          {tab === "error" && (n.error || "")}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel for approvals */}
        {pendingApproval && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-5 h-fit" data-testid="approval-side-panel">
            <h3 className="text-sm font-semibold text-amber-200">Awaiting Approval</h3>
            <blockquote className="mt-3 border-l-2 border-amber-500/50 pl-3 text-sm text-slate-300">
              {pendingApproval.message}
            </blockquote>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-200">
                View Context
              </summary>
              <pre className="json-block mt-2">{JSON.stringify(pendingApproval.context, null, 2)}</pre>
            </details>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => { resolveApproval(pendingApproval.id, "approved"); toast.success("Approved"); }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                data-testid="approve-btn"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => { resolveApproval(pendingApproval.id, "rejected"); toast.error("Rejected"); }}
                className="flex-1 border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10"
                data-testid="reject-btn"
              >
                <XCircle className="mr-1 h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-[#12121A] p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold text-slate-100 font-mono">{value}</div>
    </div>
  );
}

function StatusBanner({ run }) {
  const map = {
    running: {
      cls: "border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-200",
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      text: "Workflow is executing…",
    },
    success: {
      cls: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200",
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: `Completed in ${fmtDuration(run.durationMs)}`,
    },
    failed: {
      cls: "border-red-500/30 bg-red-500/[0.06] text-red-200",
      icon: <XCircle className="h-4 w-4" />,
      text: `Failed at node "${run.nodes.find((n) => n.id === run.failedAt)?.name || "unknown"}" — ${run.error || ""}`,
    },
    paused: {
      cls: "border-amber-500/30 bg-amber-500/[0.06] text-amber-200",
      icon: <Pause className="h-4 w-4" />,
      text: "Waiting for human approval",
    },
  };
  const s = map[run.status];
  if (!s) return null;
  return (
    <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${s.cls}`} data-testid="status-banner">
      {s.icon}
      <span>{s.text}</span>
    </div>
  );
}
