"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ApprovalRequest } from "@/lib/types";

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function timeUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setApprovals(await api.approvals.listPending());
    } catch (e: unknown) {
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id: string, decision: "approved" | "rejected") {
    setResolving(id);
    try {
      await api.approvals.resolve(id, decision);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      toast.success(decision === "approved" ? "Approved" : "Rejected");
    } catch {
      toast.error("Failed to resolve approval");
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-[1400px] mx-auto w-full" data-testid="approvals-page">
      {/* Header */}
      <div className="flex items-end gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">Human-in-the-loop review requests</p>
        </div>
        {approvals.length > 0 && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            {approvals.length} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[#1E1E2E] bg-[#12121A]">
            <ShieldCheck className="h-10 w-10 text-zinc-600" strokeWidth={1.2} />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">No pending approvals</h3>
          <p className="mt-1 text-sm text-slate-500">
            Approval nodes will appear here when a workflow pauses for review
          </p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {approvals.map((approval) => {
            const expiry = timeUntil(approval.expires_at ?? null);
            return (
              <div
                key={approval.id}
                data-testid={`approval-card-${approval.id}`}
                className="overflow-hidden rounded-lg border border-[#1E1E2E] bg-[#12121A]"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-[#1E1E2E] px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 pulse-dot" />
                    <span className="text-xs font-semibold text-slate-200">Waiting for approval</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    {expiry && (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <Clock className="h-3 w-3" />
                        {expiry}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {fmtRelative(approval.created_at)}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{approval.message}</p>
                  {approval.context?.summary != null && (
                    <div className="mt-3 rounded-lg border border-[#2a2a40] bg-[#0a0a0f] px-3 py-2.5">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {String(approval.context.summary)}
                      </p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                    <span>run: {approval.run_id.slice(0, 8)}…</span>
                    <span>·</span>
                    <span>node: {approval.node_id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-5 pb-4">
                  <Button
                    size="sm"
                    onClick={() => resolve(approval.id, "approved")}
                    disabled={resolving === approval.id}
                    className="gap-1.5 bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-400 hover:text-green-300"
                    variant="outline"
                    data-testid={`approve-${approval.id}`}
                  >
                    {resolving === approval.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />
                    }
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => resolve(approval.id, "rejected")}
                    disabled={resolving === approval.id}
                    className="gap-1.5 bg-red-600/10 border-red-500/20 hover:bg-red-600/20 text-red-400 hover:text-red-300"
                    variant="outline"
                    data-testid={`reject-${approval.id}`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
