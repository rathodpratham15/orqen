import { Trash2, Info, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { NODE_TYPES } from "@/lib/nodeTypes";

const inputCls =
  "bg-[#0a0a0f] border-border focus-visible:ring-violet-500 text-slate-100";
const lbl = "text-[11px] uppercase tracking-wider text-slate-400 font-medium";

export default function ConfigPanel({ node, onChange, onDelete }) {
  if (!node) {
    return (
      <aside
        data-testid="config-panel-empty"
        className="hidden lg:flex w-80 shrink-0 flex-col items-center justify-center border-l border-border bg-[#0d0d14] p-6 text-center"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-[#12121A]">
          <Info className="h-5 w-5 text-slate-500" />
        </div>
        <h3 className="text-sm font-medium text-slate-300">No node selected</h3>
        <p className="mt-1 text-xs text-slate-500">
          Select a node on the canvas to edit its configuration.
        </p>
      </aside>
    );
  }

  const meta = NODE_TYPES[node.type] || NODE_TYPES.llm;
  const Icon = meta.icon;
  const cfg = node.data.config || {};

  const setLabel = (v) => onChange({ ...node, data: { ...node.data, label: v } });
  const setCfg = (patch) =>
    onChange({ ...node, data: { ...node.data, config: { ...cfg, ...patch } } });

  return (
    <aside
      data-testid="config-panel"
      className="hidden lg:flex w-80 shrink-0 flex-col border-l border-border bg-[#0d0d14] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-[#0d0d14] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded"
            style={{ background: meta.accent, color: meta.color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
              {meta.label}
            </div>
            <input
              value={node.data.label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-slate-100 outline-none focus:ring-1 focus:ring-violet-500 rounded"
              data-testid="config-node-name"
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-4 p-4">
        {node.type === "llm" && <LLMForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "http" && <HTTPForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "condition" && <ConditionForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "approval" && <ApprovalForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "code" && <CodeForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "agent" && <AgentForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "memory" && <MemoryForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "slack" && <SlackForm cfg={cfg} setCfg={setCfg} />}
        {node.type === "email" && <EmailForm cfg={cfg} setCfg={setCfg} />}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Button
          variant="outline"
          onClick={() => onDelete(node.id)}
          className="w-full gap-2 border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
          data-testid="delete-node-btn"
        >
          <Trash2 className="h-4 w-4" />
          Delete Node
        </Button>
      </div>
    </aside>
  );
}

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className={lbl}>{label}</Label>
    {children}
  </div>
);

const InfoBox = ({ children }) => (
  <div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-2.5 text-[11px] text-violet-200/80">
    <Info className="mr-1 inline h-3 w-3 -translate-y-px" />
    {children}
  </div>
);

function LLMForm({ cfg, setCfg }) {
  return (
    <>
      <Field label="Model">
        <Select value={cfg.model} onValueChange={(v) => setCfg({ model: v })}>
          <SelectTrigger className={inputCls} data-testid="llm-model"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#12121A] border-border text-slate-200">
            <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
            <SelectItem value="claude-opus-4-7">claude-opus-4-7</SelectItem>
            <SelectItem value="claude-haiku-4-5">claude-haiku-4-5</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Prompt">
        <Textarea
          rows={4}
          value={cfg.prompt || ""}
          onChange={(e) => setCfg({ prompt: e.target.value })}
          placeholder="Use { trigger.field } or { node_id.field }"
          className={`${inputCls} font-mono text-xs`}
          data-testid="llm-prompt"
        />
      </Field>
      <Field label="Max Tokens">
        <Input type="number" value={cfg.maxTokens || 1024} onChange={(e) => setCfg({ maxTokens: +e.target.value })} className={inputCls} />
      </Field>
      <div className="flex items-center justify-between">
        <Label className={lbl}>Structured JSON output</Label>
        <Switch checked={!!cfg.structuredJson} onCheckedChange={(v) => setCfg({ structuredJson: v })} className="data-[state=checked]:bg-violet-600" />
      </div>
      <Field label={`Temperature: ${cfg.temperature ?? 0.7}`}>
        <Slider min={0} max={1} step={0.05} value={[cfg.temperature ?? 0.7]} onValueChange={(v) => setCfg({ temperature: v[0] })} />
      </Field>
      <InfoBox>Use {"{ trigger.field }"} or {"{ node_id.field }"} for dynamic values</InfoBox>
    </>
  );
}

function HTTPForm({ cfg, setCfg }) {
  const headers = cfg.headers || [];
  const updateHeader = (i, patch) => {
    const next = headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
    setCfg({ headers: next });
  };
  const showBody = ["POST", "PUT", "PATCH"].includes(cfg.method);
  return (
    <>
      <Field label="Method">
        <Select value={cfg.method} onValueChange={(v) => setCfg({ method: v })}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#12121A] border-border text-slate-200">
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="URL">
        <Input value={cfg.url || ""} onChange={(e) => setCfg({ url: e.target.value })} placeholder="https://…" className={inputCls} />
      </Field>
      <Field label="Headers">
        <div className="space-y-2">
          {headers.map((h, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input value={h.key} onChange={(e) => updateHeader(i, { key: e.target.value })} placeholder="Key" className={`${inputCls} h-8 text-xs`} />
              <Input value={h.value} onChange={(e) => updateHeader(i, { value: e.target.value })} placeholder="Value" className={`${inputCls} h-8 text-xs`} />
              <button onClick={() => setCfg({ headers: headers.filter((_, idx) => idx !== i) })} className="text-slate-500 hover:text-red-400 p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCfg({ headers: [...headers, { key: "", value: "" }] })} className="w-full gap-1.5 border-border bg-transparent text-slate-300 hover:bg-white/5 text-xs h-7">
            <Plus className="h-3 w-3" /> Add Header
          </Button>
        </div>
      </Field>
      {showBody && (
        <Field label="Body (JSON)">
          <Textarea rows={4} value={cfg.body || ""} onChange={(e) => setCfg({ body: e.target.value })} placeholder='{ "key": "value" }' className={`${inputCls} font-mono text-xs`} />
        </Field>
      )}
      <Field label="Timeout (seconds)">
        <Input type="number" value={cfg.timeout || 30} onChange={(e) => setCfg({ timeout: +e.target.value })} className={inputCls} />
      </Field>
    </>
  );
}

function ConditionForm({ cfg, setCfg }) {
  return (
    <>
      <Field label="Left Operand">
        <Input value={cfg.left || ""} onChange={(e) => setCfg({ left: e.target.value })} placeholder="{ node_id.field }" className={`${inputCls} font-mono text-xs`} />
      </Field>
      <Field label="Operator">
        <Select value={cfg.operator} onValueChange={(v) => setCfg({ operator: v })}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#12121A] border-border text-slate-200">
            {["equals", "not equals", "contains", "greater than", "less than", "is empty", "is not empty"].map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Right Operand">
        <Input value={cfg.right || ""} onChange={(e) => setCfg({ right: e.target.value })} placeholder="value or { … }" className={`${inputCls} font-mono text-xs`} />
      </Field>
      <div className="rounded-md border border-border bg-[#0a0a0f] p-2.5 font-mono text-[11px] text-slate-400">
        IF {cfg.left || "{}"} {cfg.operator || "equals"} {cfg.right || "''"} → <span className="text-emerald-400">true branch</span>
      </div>
    </>
  );
}

function ApprovalForm({ cfg, setCfg }) {
  return (
    <>
      <Field label="Approver Message">
        <Textarea rows={4} value={cfg.message || ""} onChange={(e) => setCfg({ message: e.target.value })} placeholder="What should the approver see?" className={inputCls} />
      </Field>
      <Field label="Timeout (hours)">
        <Input type="number" value={cfg.timeoutHours || 24} onChange={(e) => setCfg({ timeoutHours: +e.target.value })} className={inputCls} />
      </Field>
      <InfoBox>Workflow pauses here until approved or rejected.</InfoBox>
    </>
  );
}

function CodeForm({ cfg, setCfg }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          Python 3.12
        </span>
        <span className="text-[10px] text-slate-500">locked</span>
      </div>
      <Field label="Code">
        <Textarea rows={8} value={cfg.code || ""} onChange={(e) => setCfg({ code: e.target.value })} className={`${inputCls} font-mono text-xs`} />
      </Field>
      <Field label="Timeout (seconds)">
        <Input type="number" value={cfg.timeout || 30} onChange={(e) => setCfg({ timeout: +e.target.value })} className={inputCls} />
      </Field>
      <InfoBox>Return a dict. Access inputs via context['node_id'].</InfoBox>
    </>
  );
}

function AgentForm({ cfg, setCfg }) {
  const tools = cfg.tools || {};
  return (
    <>
      <Field label="System Prompt">
        <Textarea rows={4} value={cfg.systemPrompt || ""} onChange={(e) => setCfg({ systemPrompt: e.target.value })} className={`${inputCls} font-mono text-xs`} />
      </Field>
      <Field label="Max Iterations">
        <Input type="number" value={cfg.maxIterations || 10} onChange={(e) => setCfg({ maxIterations: +e.target.value })} className={inputCls} />
      </Field>
      <Field label="Available Tools">
        <div className="space-y-2 rounded-md border border-border bg-[#0a0a0f] p-2.5">
          {["http_request", "run_python", "search_memory"].map((t) => (
            <label key={t} className="flex items-center gap-2 text-xs text-slate-300">
              <Checkbox
                checked={!!tools[t]}
                onCheckedChange={(v) => setCfg({ tools: { ...tools, [t]: !!v } })}
                className="border-border data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
              />
              <span className="font-mono">{t}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Model">
        <Select value={cfg.model || "claude-sonnet-4-6"} onValueChange={(v) => setCfg({ model: v })}>
          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#12121A] border-border text-slate-200">
            <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
            <SelectItem value="claude-opus-4-7">claude-opus-4-7</SelectItem>
            <SelectItem value="claude-haiku-4-5">claude-haiku-4-5</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

function MemoryForm({ cfg, setCfg }) {
  return (
    <>
      <Field label="Operation">
        <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-[#0a0a0f] p-1">
          {["store", "search"].map((op) => (
            <button
              key={op}
              onClick={() => setCfg({ operation: op })}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                cfg.operation === op ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {op === "store" ? "Store" : "Search"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Collection">
        <Input value={cfg.collection || ""} onChange={(e) => setCfg({ collection: e.target.value })} className={inputCls} />
      </Field>
      {cfg.operation === "store" ? (
        <Field label="Content">
          <Textarea rows={3} value={cfg.content || ""} onChange={(e) => setCfg({ content: e.target.value })} className={inputCls} />
        </Field>
      ) : (
        <>
          <Field label="Query">
            <Input value={cfg.query || ""} onChange={(e) => setCfg({ query: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Top-K Results">
            <Input type="number" value={cfg.topK || 5} onChange={(e) => setCfg({ topK: +e.target.value })} className={inputCls} />
          </Field>
        </>
      )}
    </>
  );
}

function SlackForm({ cfg, setCfg }) {
  return (
    <>
      <Field label="Webhook URL">
        <Input type="password" value={cfg.webhookUrl || ""} onChange={(e) => setCfg({ webhookUrl: e.target.value })} placeholder="https://hooks.slack.com/…" className={inputCls} />
      </Field>
      <Field label="Channel">
        <Input value={cfg.channel || ""} onChange={(e) => setCfg({ channel: e.target.value })} placeholder="#channel-name" className={inputCls} />
      </Field>
      <Field label="Message">
        <Textarea rows={3} value={cfg.message || ""} onChange={(e) => setCfg({ message: e.target.value })} placeholder="Supports { } templates" className={inputCls} />
      </Field>
      <div className="flex items-center justify-between">
        <Label className={lbl}>Use Block Kit formatting</Label>
        <Switch checked={!!cfg.useBlocks} onCheckedChange={(v) => setCfg({ useBlocks: v })} className="data-[state=checked]:bg-violet-600" />
      </div>
    </>
  );
}

function EmailForm({ cfg, setCfg }) {
  return (
    <>
      <Field label="To">
        <Input value={cfg.to || ""} onChange={(e) => setCfg({ to: e.target.value })} placeholder="user@example.com" className={inputCls} />
      </Field>
      <Field label="Subject">
        <Input value={cfg.subject || ""} onChange={(e) => setCfg({ subject: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Body">
        <Textarea rows={5} value={cfg.body || ""} onChange={(e) => setCfg({ body: e.target.value })} className={inputCls} />
      </Field>
      <div className="flex items-center justify-between">
        <Label className={lbl}>HTML mode</Label>
        <Switch checked={!!cfg.htmlMode} onCheckedChange={(v) => setCfg({ htmlMode: v })} className="data-[state=checked]:bg-violet-600" />
      </div>
    </>
  );
}
