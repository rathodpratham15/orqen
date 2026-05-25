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

        {nodeType === "slack" && (
          <>
            <Field label="Webhook URL" hint="Slack → Apps → Incoming Webhooks">
              <Input
                value={(config.webhook_url as string) ?? ""}
                onChange={(v) => set("webhook_url", v)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </Field>
            <Field label="Message" hint="Supports {{ }} templates">
              <Textarea
                value={(config.text as string) ?? ""}
                onChange={(v) => set("text", v)}
                placeholder="New insight: {{ llm_node.text }}"
                rows={4}
              />
            </Field>
            <Field label="Bot name">
              <Input
                value={(config.username as string) ?? "Orqen"}
                onChange={(v) => set("username", v)}
                placeholder="Orqen"
              />
            </Field>
            <Field label="Icon emoji">
              <Input
                value={(config.icon_emoji as string) ?? ":robot_face:"}
                onChange={(v) => set("icon_emoji", v)}
                placeholder=":robot_face:"
              />
            </Field>
          </>
        )}

        {nodeType === "email" && (
          <>
            <Field label="To" hint="Supports {{ trigger.email }}">
              <Input
                value={(config.to as string) ?? ""}
                onChange={(v) => set("to", v)}
                placeholder="recipient@example.com"
              />
            </Field>
            <Field label="Subject" hint="Supports {{ }} templates">
              <Input
                value={(config.subject as string) ?? ""}
                onChange={(v) => set("subject", v)}
                placeholder="Research summary: {{ trigger.topic }}"
              />
            </Field>
            <Field label="Body (HTML or plain text)" hint="Supports {{ }} templates">
              <Textarea
                value={(config.body as string) ?? ""}
                onChange={(v) => set("body", v)}
                placeholder="<h2>Summary</h2><p>{{ llm_node.text }}</p>"
                rows={6}
              />
            </Field>
            <Field label="From name">
              <Input
                value={(config.from_name as string) ?? "Orqen"}
                onChange={(v) => set("from_name", v)}
                placeholder="Orqen"
              />
            </Field>
          </>
        )}

        {nodeType === "code" && (
          <>
            <Field
              label="Python code"
              hint="Use `inputs` dict to access prior node outputs. Set `result` to pass data forward."
            >
              <Textarea
                value={(config.code as string) ?? ""}
                onChange={(v) => set("code", v)}
                placeholder={"# inputs = prior node outputs\ntext = inputs.get('llm_node', {}).get('text', '')\nresult = text.upper()"}
                rows={10}
              />
            </Field>
            <Field label="Timeout (seconds, max 30)">
              <Input
                type="number"
                value={String(config.timeout ?? 10)}
                onChange={(v) => set("timeout", Math.min(parseInt(v) || 10, 30))}
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

        {nodeType === "agent" && (
          <>
            <Field label="Goal" hint="What the agent should accomplish. Supports {{ }} templates.">
              <Textarea
                value={(config.goal as string) ?? ""}
                onChange={(v) => set("goal", v)}
                placeholder="Research the latest AI papers on {{ trigger.topic }} and summarize the key findings."
                rows={4}
              />
            </Field>
            <Field label="System prompt" hint="Optional persona / constraints for the agent">
              <Textarea
                value={(config.system_prompt as string) ?? ""}
                onChange={(v) => set("system_prompt", v)}
                placeholder="You are a careful research assistant. Cite sources. Think step by step."
                rows={3}
              />
            </Field>
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
            <Field label="Available tools" hint="Built-in tools the agent can use">
              {(["http_request", "run_python", "search_memory"] as const).map((tool) => {
                const current = (config.available_tools as string[] | undefined) ?? ["http_request", "run_python"];
                const checked = current.includes(tool);
                return (
                  <label key={tool} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        set(
                          "available_tools",
                          checked ? current.filter((t) => t !== tool) : [...current, tool],
                        );
                      }}
                      className="accent-violet-500"
                    />
                    <span className="text-[11px] text-zinc-300 font-mono">{tool}</span>
                  </label>
                );
              })}
            </Field>
            <Field label="Max iterations" hint="Max tool-call rounds before forced stop">
              <Input
                type="number"
                value={String(config.max_iterations ?? 10)}
                onChange={(v) => set("max_iterations", Math.min(parseInt(v) || 10, 50))}
              />
            </Field>
            <Field label="Max tokens per turn">
              <Input
                type="number"
                value={String(config.max_tokens ?? 4096)}
                onChange={(v) => set("max_tokens", parseInt(v) || 4096)}
              />
            </Field>
          </>
        )}

        {nodeType === "memory" && (
          <>
            <Field label="Operation">
              <select
                value={(config.operation as string) ?? "search"}
                onChange={(e) => set("operation", e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#4a4a70]"
              >
                <option value="store">store — embed and save text</option>
                <option value="search">search — find similar memories</option>
              </select>
            </Field>
            <Field label="Collection" hint="Namespace for grouping memories">
              <Input
                value={(config.collection as string) ?? "default"}
                onChange={(v) => set("collection", v)}
                placeholder="default"
              />
            </Field>
            {(config.operation ?? "search") === "store" ? (
              <Field label="Content" hint="Text to embed and store. Supports {{ }} templates.">
                <Textarea
                  value={(config.content as string) ?? ""}
                  onChange={(v) => set("content", v)}
                  placeholder="{{ llm_node.text }}"
                  rows={4}
                />
              </Field>
            ) : (
              <>
                <Field label="Query" hint="Semantic search query. Supports {{ }} templates.">
                  <Textarea
                    value={(config.query as string) ?? ""}
                    onChange={(v) => set("query", v)}
                    placeholder="{{ trigger.question }}"
                    rows={3}
                  />
                </Field>
                <Field label="Top K results">
                  <Input
                    type="number"
                    value={String(config.top_k ?? 5)}
                    onChange={(v) => set("top_k", parseInt(v) || 5)}
                  />
                </Field>
              </>
            )}
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
