import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock, Inbox, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtRelative, useData } from "@/lib/dataStore";
import { toast } from "sonner";

export default function Approvals() {
  const { approvals, resolveApproval } = useData();
  const [tab, setTab] = useState("pending");
  const [expanded, setExpanded] = useState({});

  const pending = useMemo(() => approvals.filter((a) => a.status === "pending"), [approvals]);
  const resolved = useMemo(
    () => approvals.filter((a) => a.status === "approved" || a.status === "rejected" || a.status === "expired"),
    [approvals]
  );
  const list = tab === "pending" ? pending : resolved;

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto" data-testid="approvals-page">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Approvals</h1>
        {pending.length > 0 && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300" data-testid="pending-count">
            {pending.length} Pending
          </span>
        )}
      </div>

      <div className="mt-6 flex items-center gap-1 rounded-md border border-border bg-[#12121A] p-1 w-fit">
        {[
          { v: "pending", label: "Pending" },
          { v: "resolved", label: "Resolved" },
        ].map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            data-testid={`approvals-tab-${v}`}
            className={`rounded px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === v ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="approvals-empty">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-[#12121A]">
              {tab === "pending" ? (
                <CheckCircle className="h-6 w-6 text-emerald-500/70" />
              ) : (
                <Inbox className="h-6 w-6 text-slate-500" />
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              {tab === "pending" ? "No pending approvals" : "No resolved approvals"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {tab === "pending"
                ? "You're all caught up."
                : "Approved or rejected items will appear here."}
            </p>
          </div>
        ) : (
          list.map((a) => {
            const isPending = a.status === "pending";
            const expiresMs = a.expiresAt - Date.now();
            const expired = expiresMs <= 0;
            return (
              <div
                key={a.id}
                data-testid={`approval-${a.id}`}
                className="rounded-lg border border-border bg-[#12121A] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-200">{a.workflowName}</span>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-slate-500">{a.runId}</span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-100">{a.nodeName}</h3>
                  </div>

                  {isPending ? (
                    <span className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${
                      expired ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"
                    }`}>
                      <Clock className="h-3 w-3" />
                      {expired ? "Expired" : `Expires ${fmtRelative(a.expiresAt)}`}
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium capitalize ${
                      a.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : a.status === "rejected"
                        ? "bg-red-500/10 text-red-300"
                        : "bg-slate-500/10 text-slate-300"
                    }`}>
                      {a.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                      {a.status === "rejected" && <XCircle className="h-3 w-3" />}
                      {a.status}
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-3 text-sm text-slate-200">
                  {a.message}
                </div>

                <details
                  open={expanded[a.id]}
                  onToggle={(e) => setExpanded((s) => ({ ...s, [a.id]: e.target.open }))}
                  className="mt-3"
                >
                  <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-200">
                    View Context
                  </summary>
                  <pre className="json-block mt-2">{JSON.stringify(a.context, null, 2)}</pre>
                </details>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">Created {fmtRelative(a.createdAt)}</span>
                  {isPending && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { resolveApproval(a.id, "approved"); toast.success("Approved", { description: a.nodeName }); }}
                        className="bg-emerald-600 hover:bg-emerald-500"
                        data-testid={`approve-${a.id}`}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { resolveApproval(a.id, "rejected"); toast.error("Rejected", { description: a.nodeName }); }}
                        className="border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10"
                        data-testid={`reject-${a.id}`}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
