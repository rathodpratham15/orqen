/**
 * WorkflowCanvas — the main React Flow editor.
 *
 * Features:
 *  - Drag nodes from NodePalette onto the canvas
 *  - Connect nodes by dragging handles
 *  - Click to select + configure (opens ConfigPanel)
 *  - Node status overlays during live runs (fed by RunStore)
 *  - Save workflow (PUT /api/workflows/:id)
 *  - Trigger run (POST /api/workflows/:id/run)
 */
"use client";

import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Save, Play, Loader2, CheckCircle2, AlertCircle, PauseCircle } from "lucide-react";

import { useEditorStore } from "@/stores/editor-store";
import { useRunStore } from "@/stores/run-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { LLMNode }       from "./nodes/LLMNode";
import { HTTPNode }      from "./nodes/HTTPNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { ApprovalNode }  from "./nodes/ApprovalNode";
import { SlackNode }     from "./nodes/SlackNode";
import { EmailNode }     from "./nodes/EmailNode";
import { CodeNode }      from "./nodes/CodeNode";
import type { NodeType } from "@/lib/types";

// Register custom node types with React Flow
const nodeTypes: NodeTypes = {
  llm:       LLMNode,
  http:      HTTPNode,
  condition: ConditionNode,
  approval:  ApprovalNode,
  slack:     SlackNode,
  email:     EmailNode,
  code:      CodeNode,
};

interface WorkflowCanvasProps {
  workflowId: string;
}

export function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, selectNode, isDirty, markClean, toDefinition,
  } = useEditorStore();

  const { startRun, handleEvent, runStatus, approvalId, approvalMsg } = useRunStore();

  // ─── Drop handler: node dragged from palette ────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/orqen-node-type") as NodeType;
      if (!type || !reactFlowWrapper.current) return;

      const rect   = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left - 100,
        y: e.clientY - rect.top  - 40,
      };
      addNode(type, position);
    },
    [addNode],
  );

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    try {
      const def = toDefinition();
      await api.workflows.update(workflowId, { definition: def });
      markClean();
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

  // ─── Trigger run ────────────────────────────────────────────────────────────
  async function handleRun() {
    try {
      // Save first if dirty
      if (isDirty) await handleSave();

      const run = await api.workflows.triggerRun(workflowId);
      startRun(run.id);

      // Subscribe to SSE stream
      api.runs.stream(run.id, handleEvent);
    } catch (err) {
      console.error("Run failed:", err);
    }
  }

  // ─── Run status indicator ───────────────────────────────────────────────────
  const statusIcon = {
    queued:    <Loader2 size={14} className="animate-spin text-zinc-400" />,
    running:   <Loader2 size={14} className="animate-spin text-blue-400" />,
    success:   <CheckCircle2 size={14} className="text-green-400" />,
    failed:    <AlertCircle  size={14} className="text-red-400" />,
    paused:    <PauseCircle  size={14} className="text-amber-400 animate-pulse" />,
    pending:   null,
    cancelled: null,
  }[runStatus ?? "pending"];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#13131f] border-b border-[#2a2a40] flex-shrink-0">
        {/* Run status */}
        {statusIcon && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mr-2">
            {statusIcon}
            <span className="capitalize">{runStatus}</span>
          </div>
        )}

        {/* Approval banner */}
        {runStatus === "paused" && approvalId && (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <PauseCircle size={12} />
            <span className="truncate max-w-xs">{approvalMsg}</span>
            <a
              href="/approvals"
              className="underline hover:text-amber-200 whitespace-nowrap"
            >
              Review →
            </a>
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all",
            isDirty
              ? "bg-[#2a2a40] text-zinc-200 hover:bg-[#3a3a55]"
              : "text-zinc-600 cursor-default",
          )}
        >
          <Save size={13} />
          {isDirty ? "Save" : "Saved"}
        </button>

        <button
          onClick={handleRun}
          disabled={runStatus === "running" || runStatus === "queued"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all",
            runStatus === "running" || runStatus === "queued"
              ? "bg-blue-600/30 text-blue-400 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-500",
          )}
        >
          {runStatus === "running" || runStatus === "queued"
            ? <Loader2 size={13} className="animate-spin" />
            : <Play size={13} />
          }
          {runStatus === "running" ? "Running…" : "Run"}
        </button>
      </div>

      {/* ── React Flow canvas ─────────────────────────────────────────────── */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 relative"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode="Delete"
          style={{ background: "#0d0d14" }}
          defaultEdgeOptions={{
            type:     "smoothstep",
            animated: false,
            style:    { stroke: "#3a3a55", strokeWidth: 2 },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#1e1e30"
            gap={20}
            size={1}
          />
          <Controls
            className="!bg-[#13131f] !border-[#2a2a40] !rounded-lg"
            showInteractive={false}
          />
          <MiniMap
            style={{ background: "#13131f", border: "1px solid #2a2a40" }}
            nodeColor={(n) => {
              const typeColors: Record<string, string> = {
                llm:       "#7c3aed",
                http:      "#2563eb",
                condition: "#d97706",
                approval:  "#0d9488",
                slack:     "#16a34a",
                email:     "#0284c7",
                code:      "#ea580c",
              };
              return typeColors[n.type ?? ""] ?? "#3a3a55";
            }}
            maskColor="rgba(0,0,0,0.4)"
          />
        </ReactFlow>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-2">
              <p className="text-zinc-500 text-sm">Drag nodes from the left panel</p>
              <p className="text-zinc-700 text-xs">Connect them to build your workflow</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
