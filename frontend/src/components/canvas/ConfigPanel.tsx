/**
 * ConfigPanel — right sidebar showing the selected node's configuration.
 * Edits are written directly to the Zustand editor store.
 */
"use client";

import { X, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";

export function ConfigPanel() {
  const { selectedNode, updateNodeConfig, updateNodeLabel, deleteNode, selectNode } =
    useEditorStore((s) => ({
      selectedNode:     s.selectedNode(),
      updateNodeConfig: s.updateNodeConfig,
      updateNodeLabel:  s.updateNodeLabel,
      deleteNode:       s.deleteNode,
      selectNode:       s.selectNode,
    }));

  if (!selectedNode) {
    return (
      <aside className="w-64 flex-shrink-0 bg-[#13131f] border-l border-[#2a2a40] flex items-center justify-center">
        <p className="text-xs text-zinc-600 text-center px-4">
          Click a node to configure it
        </p>
      </aside>
    );
  }

  const { data, id } = selectedNode;
  const { config, label, nodeType } = data;

  function set(key: string, value: unknown) {
    updateNodeConfig(id, { [key]: value });
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-[#13131f] border-l border-[#2a2a40] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a2a40]">
        <span className="text-xs font-semibold text-zinc-300 capitalize">{nodeType} node</span>
        <div className="flex gap-1">
          <button
            onClick={() => { deleteNode(id); }}
            className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-zinc-500 transition-colors"
            title="Delete node"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => selectNode(null)}
            className="p-1 rounded hover:bg-[#2a2a40] text-zinc-500 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable fields */}
      <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
        {/* Label */}
        <Field label="Label">
          <Input
            value={label}
            onChange={(v) => updateNodeLabel(id, v)}
            placeholder="Node label"
          />
        </Field>

        {/* Type-specific fields */}
        {nodeType === "llm" && (
          <>
            <Field label="Model">
              <select
                value={(config.model as string) ?? "claude-sonnet-4-6"}
                onChange={(e) => set("model", e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#4a4a70]"
              >
                <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                <option value="claude-opus-4-7">claude-opus-4-7</option>
                <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
              </select>
            </Field>
            <Field label="System prompt">
              <Textarea
                value={(config.system_prompt as string) ?? ""}
                onChange={(v) => set("system_prompt", v)}
                placeholder="You are a helpful assistant."
                rows={3}
              />
            </Field>
            <Field label="Prompt" hint="Use {{ node_id.field }} for dynamic values">
              <Textarea
                value={(config.prompt as string) ?? ""}
                onChange={(v) => set("prompt", v)}
                placeholder="Summarize: {{ prev_node.text }}"
                rows={5}
              />
            </Field>
            <Field label="Max tokens">
              <Input
                type="number"
                value={String(config.max_tokens ?? 2048)}
                onChange={(v) => set("max_tokens", parseInt(v) || 2048)}
              />
            </Field>
          </>
        )}

        {nodeType === "http" && (
          <>
            <Field label="Method">
              <select
                value={(config.method as string) ?? "GET"}
                onChange={(e) => set("method", e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#4a4a70]"
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="URL" hint="Supports {{ }} templates">
              <Input
                value={(config.url as string) ?? ""}
                onChange={(v) => set("url", v)}
                placeholder="https://api.example.com/endpoint"
              />
            </Field>
          </>
        )}

        {nodeType === "condition" && (
          <>
            <Field label="Left operand" hint="Supports {{ }} templates">
              <Input
                value={(config.left as string) ?? ""}
                onChange={(v) => set("left", v)}
                placeholder="{{ llm_node.text }}"
              />
            </Field>
            <Field label="Operator">
              <select
                value={(config.operator as string) ?? "=="}
                onChange={(e) => set("operator", e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#4a4a70]"
              >
                {["==", "!=", ">", ">=", "<", "<=", "contains", "not_contains", "is_empty", "is_not_empty"].map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </Field>
            <Field label="Right operand">
              <Input
                value={(config.right as string) ?? ""}
                onChange={(v) => set("right", v)}
                placeholder="approved"
              />
            </Field>
          </>
        )}

        {nodeType === "approval" && (
          <>
            <Field label="Approval message" hint="What the reviewer sees">
              <Textarea
                value={(config.message as string) ?? ""}
                onChange={(v) => set("message", v)}
                placeholder="Please review and approve to continue."
                rows={3}
              />
            </Field>
            <Field label="Summary / context">
              <Textarea
                value={(config.summary as string) ?? ""}
                onChange={(v) => set("summary", v)}
                placeholder="The agent wants to send the following email..."
                rows={3}
              />
            </Field>
            <Field label="Timeout (hours)">
              <Input
                type="number"
                value={String(config.timeout_hours ?? 24)}
                onChange={(v) => set("timeout_hours", parseInt(v) || 24)}
              />
            </Field>
          </>
        )}
      </div>
    </aside>
  );
}

// ─── Mini form components ─────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
        {label}
      </label>
      {hint && <p className="text-[10px] text-zinc-600">{hint}</p>}
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#4a4a70] placeholder:text-zinc-600"
    />
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#4a4a70] placeholder:text-zinc-600 resize-none font-mono leading-relaxed"
    />
  );
}
