// ─── Workflow graph types ─────────────────────────────────────────────────────

export type NodeType = "llm" | "http" | "condition" | "approval";

export interface NodeConfig {
  // LLM
  prompt?:        string;
  system_prompt?: string;
  model?:         string;
  max_tokens?:    number;
  structured?:    boolean;
  // HTTP
  url?:           string;
  method?:        "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?:       Record<string, string>;
  body?:          unknown;
  // Condition
  left?:          string;
  operator?:      string;
  right?:         string;
  // Approval
  message?:       string;
  summary?:       string;
  timeout_hours?: number;
  // Generic
  [key: string]: unknown;
}

export interface WorkflowNode {
  id:       string;
  type:     NodeType;
  label:    string;
  config:   NodeConfig;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id:        string;
  source:    string;
  target:    string;
  condition: "true" | "false" | null;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface TriggerConfig {
  type:   "manual" | "webhook" | "cron";
  config: Record<string, unknown>;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface Workflow {
  id:             string;
  name:           string;
  description:    string | null;
  definition:     WorkflowDefinition;
  trigger_config: TriggerConfig;
  user_id:        string;
  org_id:         string | null;
  is_active:      boolean;
  created_at:     string;
  updated_at:     string;
}

export type RunStatus =
  | "pending" | "queued" | "running"
  | "success" | "failed" | "paused" | "cancelled";

export type NodeStatus =
  | "pending" | "running" | "success" | "failed" | "skipped" | "paused";

export interface NodeExecution {
  id:          string;
  node_id:     string;
  node_type:   string;
  status:      NodeStatus;
  input:       Record<string, unknown>;
  output:      Record<string, unknown> | null;
  started_at:  string | null;
  finished_at: string | null;
  duration_ms: number | null;
  tokens_used: number;
  retry_count: number;
  error:       string | null;
  trace_id:    string | null;
}

export interface WorkflowRun {
  id:                  string;
  workflow_id:         string;
  status:              RunStatus;
  trigger_type:        string;
  trigger_data:        Record<string, unknown>;
  started_at:          string | null;
  finished_at:         string | null;
  duration_ms:         number | null;
  total_tokens:        number;
  estimated_cost_usd:  number | null;
  error:               string | null;
  created_at:          string;
  node_executions:     NodeExecution[];
}

export interface ApprovalRequest {
  id:          string;
  run_id:      string;
  node_id:     string;
  status:      "pending" | "approved" | "rejected" | "expired";
  message:     string;
  context:     Record<string, unknown>;
  created_at:  string;
  resolved_at: string | null;
  resolved_by: string | null;
  expires_at:  string | null;
}

// ─── SSE event types ──────────────────────────────────────────────────────────

export type RunEvent =
  | { type: "run_started";   run_id: string }
  | { type: "node_started";  node_id: string; node_type: string; node_execution_id: string }
  | { type: "node_completed"; node_id: string; status: NodeStatus; tokens: number; duration_ms: number; error: string | null }
  | { type: "run_paused";    node_id: string; approval_id: string; message: string }
  | { type: "run_failed";    error: string }
  | { type: "run_completed"; total_tokens: number; cost_usd: number; duration_ms: number }
  | { type: "stream_end" };
