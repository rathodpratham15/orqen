/**
 * Approvals page — list and resolve pending human-in-the-loop requests.
 */
"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { ApprovalRequest } from "@/lib/types";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.approvals.listPending();
      setApprovals(data);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck size={20} className="text-teal-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Approvals</h1>
          {approvals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              {approvals.length} pending
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-zinc-600" size={24} />
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-24">
            <ShieldCheck size={40} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">No pending approvals</p>
            <p className="text-zinc-700 text-xs mt-1">
              Approval nodes will appear here when a workflow pauses for review
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                isResolving={resolving === approval.id}
                onApprove={() => resolve(approval.id, "approved")}
                onReject={() => resolve(approval.id, "rejected")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({
  approval, isResolving, onApprove, onReject,
}: {
  approval:    ApprovalRequest;
  isResolving: boolean;
  onApprove:   () => void;
  onReject:    () => void;
}) {
  return (
    <div className="rounded-xl bg-[#13131f] border border-[#2a2a40] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#2a2a40]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-200">Waiting for approval</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
          <Clock size={10} />
          <span>{formatDate(approval.created_at)}</span>
        </div>
      </div>

      {/* Message */}
      <div className="px-5 py-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{approval.message}</p>
        {approval.context?.summary != null && (
          <div className="mt-3 px-3 py-2.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a40]">
            <p className="text-xs text-zinc-400 leading-relaxed">
              {String(approval.context.summary)}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-600">
          <span className="font-mono">run: {approval.run_id.slice(0, 8)}…</span>
          <span>·</span>
          <span>node: {approval.node_id}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-4">
        <button
          onClick={onApprove}
          disabled={isResolving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-400 text-xs font-semibold transition-all disabled:opacity-50"
        >
          {isResolving
            ? <Loader2 size={13} className="animate-spin" />
            : <CheckCircle2 size={13} />
          }
          Approve
        </button>
        <button
          onClick={onReject}
          disabled={isResolving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-50"
        >
          <XCircle size={13} />
          Reject
        </button>
      </div>
    </div>
  );
}
