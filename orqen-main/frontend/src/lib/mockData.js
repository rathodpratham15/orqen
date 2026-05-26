// Mock data for Orqen UI. All ids are stable strings.

export const SAMPLE_WORKFLOWS = [
  {
    id: "wf_support_triage",
    name: "Customer Support Triage",
    description:
      "Auto-classifies incoming support tickets, escalates urgent ones to the team, and replies to the rest.",
    trigger: "cron",
    active: true,
    updatedAt: Date.now() - 10 * 60 * 1000,
    nodes: [
      {
        id: "n_fetch",
        type: "http",
        position: { x: 40, y: 160 },
        data: {
          label: "Fetch Tickets",
          config: {
            method: "GET",
            url: "https://api.helpdesk.io/tickets?status=open",
            headers: [{ key: "Authorization", value: "Bearer ***" }],
            timeout: 30,
          },
        },
      },
      {
        id: "n_classify",
        type: "llm",
        position: { x: 280, y: 160 },
        data: {
          label: "Classify Urgency",
          config: {
            model: "claude-sonnet-4-6",
            prompt:
              "Classify the urgency of the following ticket as one of: urgent, normal, low.\n\n{ n_fetch.body }",
            maxTokens: 512,
            structuredJson: true,
            temperature: 0.2,
          },
        },
      },
      {
        id: "n_cond",
        type: "condition",
        position: { x: 540, y: 160 },
        data: {
          label: "Is Urgent?",
          config: {
            left: "{ n_classify.urgency }",
            operator: "equals",
            right: "urgent",
          },
        },
      },
      {
        id: "n_approve",
        type: "approval",
        position: { x: 800, y: 60 },
        data: {
          label: "Escalate to Manager",
          config: {
            message:
              "Ticket flagged as urgent — escalate to on-call manager?",
            timeoutHours: 4,
          },
        },
      },
      {
        id: "n_slack",
        type: "slack",
        position: { x: 1060, y: 60 },
        data: {
          label: "Notify Team",
          config: {
            webhookUrl: "https://hooks.slack.com/services/***",
            channel: "#support-urgent",
            message: "🚨 New urgent ticket: { n_fetch.subject }",
            useBlocks: false,
          },
        },
      },
      {
        id: "n_email",
        type: "email",
        position: { x: 800, y: 280 },
        data: {
          label: "Send Auto-Reply",
          config: {
            to: "{ n_fetch.requester_email }",
            subject: "We received your ticket",
            body:
              "Hi { n_fetch.requester_name },\n\nWe got your message and will be in touch shortly.",
            htmlMode: false,
          },
        },
      },
    ],
    edges: [
      { id: "e1", source: "n_fetch", target: "n_classify", animated: false },
      { id: "e2", source: "n_classify", target: "n_cond", animated: false },
      {
        id: "e3",
        source: "n_cond",
        sourceHandle: "true",
        target: "n_approve",
        label: "true",
        animated: false,
      },
      { id: "e4", source: "n_approve", target: "n_slack", animated: false },
      {
        id: "e5",
        source: "n_cond",
        sourceHandle: "false",
        target: "n_email",
        label: "false",
        animated: false,
      },
    ],
  },
  {
    id: "wf_daily_digest",
    name: "Daily Research Digest",
    description:
      "Scrapes industry news every morning, summarizes top stories with Claude, and sends an email digest to the team.",
    trigger: "cron",
    active: true,
    updatedAt: Date.now() - 3 * 60 * 60 * 1000,
    nodes: [
      {
        id: "n1",
        type: "http",
        position: { x: 60, y: 140 },
        data: {
          label: "Fetch News Feed",
          config: { method: "GET", url: "https://news.api/top", headers: [], timeout: 30 },
        },
      },
      {
        id: "n2",
        type: "llm",
        position: { x: 320, y: 140 },
        data: {
          label: "Summarize",
          config: {
            model: "claude-sonnet-4-6",
            prompt: "Summarize the top 10 stories in 3 bullets each.",
            maxTokens: 2048,
            structuredJson: false,
            temperature: 0.4,
          },
        },
      },
      {
        id: "n3",
        type: "memory",
        position: { x: 580, y: 140 },
        data: {
          label: "Cache to Memory",
          config: { operation: "store", collection: "daily_digest", content: "{ n2.text }", query: "", topK: 5 },
        },
      },
      {
        id: "n4",
        type: "email",
        position: { x: 840, y: 140 },
        data: {
          label: "Send Digest",
          config: {
            to: "team@orqen.dev",
            subject: "Daily Digest — { date }",
            body: "{ n2.text }",
            htmlMode: true,
          },
        },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: false },
      { id: "e2", source: "n2", target: "n3", animated: false },
      { id: "e3", source: "n3", target: "n4", animated: false },
    ],
  },
  {
    id: "wf_invoice",
    name: "Invoice Approval Flow",
    description:
      "Webhook-driven invoice approval: parses the invoice, routes to a manager for review, and posts to accounting.",
    trigger: "webhook",
    active: false,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    nodes: [
      {
        id: "n1",
        type: "code",
        position: { x: 60, y: 140 },
        data: {
          label: "Parse Invoice",
          config: { code: "def run(context):\n    return context['trigger']['invoice']\n", timeout: 30 },
        },
      },
      {
        id: "n2",
        type: "approval",
        position: { x: 320, y: 140 },
        data: {
          label: "Manager Review",
          config: {
            message:
              "Please review invoice { n1.invoice_id } for { n1.amount } from { n1.vendor }.",
            timeoutHours: 24,
          },
        },
      },
      {
        id: "n3",
        type: "http",
        position: { x: 580, y: 140 },
        data: {
          label: "Post to Accounting",
          config: {
            method: "POST",
            url: "https://erp.internal/api/invoices",
            headers: [{ key: "X-API-KEY", value: "***" }],
            body: '{ "id": "{ n1.invoice_id }" }',
            timeout: 30,
          },
        },
      },
      {
        id: "n4",
        type: "slack",
        position: { x: 840, y: 140 },
        data: {
          label: "Notify Finance",
          config: {
            webhookUrl: "https://hooks.slack.com/services/***",
            channel: "#finance",
            message: "Invoice { n1.invoice_id } approved & posted.",
            useBlocks: false,
          },
        },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2", animated: false },
      { id: "e2", source: "n2", target: "n3", animated: false },
      { id: "e3", source: "n3", target: "n4", animated: false },
    ],
  },
];

export const SAMPLE_RUNS = [
  {
    id: "run_abc123",
    workflowId: "wf_support_triage",
    workflowName: "Customer Support Triage",
    trigger: "cron",
    status: "success",
    startedAt: Date.now() - 2 * 60 * 1000,
    durationMs: 14200,
    tokens: 2840,
    cost: 0.008,
    nodes: [
      { id: "n_fetch", name: "Fetch Tickets", type: "http", status: "success", durationMs: 410, input: { url: "https://api.helpdesk.io/tickets?status=open" }, output: { tickets: 3, status: 200 } },
      { id: "n_classify", name: "Classify Urgency", type: "llm", status: "success", durationMs: 2870, tokens: 840, input: { prompt: "Classify…" }, output: { urgency: "urgent", confidence: 0.93 } },
      { id: "n_cond", name: "Is Urgent?", type: "condition", status: "success", durationMs: 12, branch: "true", input: { left: "urgent", op: "equals", right: "urgent" }, output: { result: true } },
      { id: "n_approve", name: "Escalate to Manager", type: "approval", status: "success", durationMs: 9800, input: { message: "Escalate?" }, output: { decision: "approved" } },
      { id: "n_slack", name: "Notify Team", type: "slack", status: "success", durationMs: 410, input: { channel: "#support-urgent" }, output: { ok: true, ts: "1701..." } },
    ],
  },
  {
    id: "run_live01",
    workflowId: "wf_daily_digest",
    workflowName: "Daily Research Digest",
    trigger: "cron",
    status: "running",
    startedAt: Date.now() - 60 * 1000,
    durationMs: null,
    tokens: 0,
    cost: 0.0,
    nodes: [
      { id: "n1", name: "Fetch News Feed", type: "http", status: "success", durationMs: 380, input: { url: "https://news.api/top" }, output: { count: 42 } },
      { id: "n2", name: "Summarize", type: "llm", status: "running", durationMs: null, tokens: 0, input: { model: "claude-sonnet-4-6" }, output: null },
      { id: "n3", name: "Cache to Memory", type: "memory", status: "pending", durationMs: null, input: null, output: null },
      { id: "n4", name: "Send Digest", type: "email", status: "pending", durationMs: null, input: null, output: null },
    ],
  },
  {
    id: "run_paused1",
    workflowId: "wf_invoice",
    workflowName: "Invoice Approval Flow",
    trigger: "webhook",
    status: "paused",
    startedAt: Date.now() - 15 * 60 * 1000,
    durationMs: 45100,
    tokens: 320,
    cost: 0.003,
    pausedAt: "n2",
    nodes: [
      { id: "n1", name: "Parse Invoice", type: "code", status: "success", durationMs: 80, input: { invoice_id: "INV-2024-0891" }, output: { invoice_id: "INV-2024-0891", amount: 12400, vendor: "Acme Corp", due: "2024-12-01" } },
      { id: "n2", name: "Manager Review", type: "approval", status: "paused", durationMs: null, input: { message: "Please review invoice INV-2024-0891 for $12,400 from Acme Corp." }, output: null },
      { id: "n3", name: "Post to Accounting", type: "http", status: "pending", durationMs: null, input: null, output: null },
      { id: "n4", name: "Notify Finance", type: "slack", status: "pending", durationMs: null, input: null, output: null },
    ],
  },
  {
    id: "run_failed1",
    workflowId: "wf_support_triage",
    workflowName: "Customer Support Triage",
    trigger: "manual",
    status: "failed",
    startedAt: Date.now() - 60 * 60 * 1000,
    durationMs: 3200,
    tokens: 410,
    cost: 0.001,
    failedAt: "n_cond",
    error: "Operand missing: { n_classify.urgency } resolved to undefined",
    nodes: [
      { id: "n_fetch", name: "Fetch Tickets", type: "http", status: "success", durationMs: 390, input: { url: "https://api.helpdesk.io/tickets" }, output: { tickets: 1, status: 200 } },
      { id: "n_classify", name: "Classify Urgency", type: "llm", status: "success", durationMs: 2700, tokens: 410, input: { prompt: "Classify…" }, output: { text: "I think this is urgent" } },
      { id: "n_cond", name: "Is Urgent?", type: "condition", status: "failed", durationMs: 110, input: { left: "undefined" }, output: null, error: "Operand missing: { n_classify.urgency } resolved to undefined\n  at evaluateOperand (engine.js:142)\n  at Condition.run (nodes/condition.js:38)" },
      { id: "n_approve", name: "Escalate to Manager", type: "approval", status: "pending", durationMs: null, input: null, output: null },
      { id: "n_slack", name: "Notify Team", type: "slack", status: "pending", durationMs: null, input: null, output: null },
    ],
  },
];

export const SAMPLE_APPROVALS = [
  {
    id: "appr_001",
    runId: "run_paused1",
    workflowName: "Invoice Approval Flow",
    nodeName: "Escalate to Manager",
    message:
      "Invoice #INV-2024-0891 for $12,400 requires manager approval. Vendor: Acme Corp. Due: 2024-12-01.",
    createdAt: Date.now() - 15 * 60 * 1000,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000,
    status: "pending",
    context: {
      invoice_id: "INV-2024-0891",
      amount: 12400,
      currency: "USD",
      vendor: "Acme Corp",
      due: "2024-12-01",
      submitted_by: "ana@acme.example",
    },
  },
  {
    id: "appr_002",
    runId: "run_old01",
    workflowName: "Customer Support Triage",
    nodeName: "Escalate?",
    message: "Escalate ticket #4421 to on-call manager?",
    createdAt: Date.now() - 4 * 60 * 60 * 1000,
    expiresAt: Date.now() + 30 * 60 * 1000,
    status: "pending",
    context: { ticket_id: 4421, severity: "high" },
  },
  {
    id: "appr_003",
    runId: "run_resolved01",
    workflowName: "Invoice Approval Flow",
    nodeName: "Manager Review",
    message: "Approve invoice #INV-2024-0820 for $4,200?",
    createdAt: Date.now() - 26 * 60 * 60 * 1000,
    expiresAt: Date.now() - 2 * 60 * 60 * 1000,
    status: "approved",
    resolvedAt: Date.now() - 24 * 60 * 60 * 1000,
    context: { invoice_id: "INV-2024-0820", amount: 4200, vendor: "Widgets Inc" },
  },
  {
    id: "appr_004",
    runId: "run_resolved02",
    workflowName: "Customer Support Triage",
    nodeName: "Escalate?",
    message: "Escalate ticket #4118?",
    createdAt: Date.now() - 30 * 60 * 60 * 1000,
    expiresAt: Date.now() - 26 * 60 * 60 * 1000,
    status: "rejected",
    resolvedAt: Date.now() - 28 * 60 * 60 * 1000,
    context: { ticket_id: 4118 },
  },
];

export const SAMPLE_ANALYTICS = {
  totalRuns: 142,
  successRate: 94.3,
  totalTokens: 284120,
  totalCost: 0.82,
  trend: { runs: +12.4, successRate: +1.2, tokens: +8.1, cost: -3.6 },
  runsByDay: [
    { day: "Mon", success: 18, failed: 1 },
    { day: "Tue", success: 22, failed: 2 },
    { day: "Wed", success: 17, failed: 0 },
    { day: "Thu", success: 25, failed: 3 },
    { day: "Fri", success: 21, failed: 1 },
    { day: "Sat", success: 12, failed: 0 },
    { day: "Sun", success: 19, failed: 1 },
  ],
  statusBreakdown: [
    { name: "Success", value: 134, color: "#10B981" },
    { name: "Failed", value: 6, color: "#EF4444" },
    { name: "Paused", value: 1, color: "#F59E0B" },
    { name: "Cancelled", value: 1, color: "#64748B" },
  ],
  topWorkflows: [
    { rank: 1, name: "Customer Support Triage", runs: 78, successRate: 96.1, avgDurationMs: 12400, tokens: 161200 },
    { rank: 2, name: "Daily Research Digest", runs: 41, successRate: 97.5, avgDurationMs: 28100, tokens: 98300 },
    { rank: 3, name: "Invoice Approval Flow", runs: 18, successRate: 83.3, avgDurationMs: 45800, tokens: 18420 },
    { rank: 4, name: "Lead Enrichment", runs: 4, successRate: 75.0, avgDurationMs: 8200, tokens: 4900 },
    { rank: 5, name: "PR Reviewer", runs: 1, successRate: 100.0, avgDurationMs: 3100, tokens: 1300 },
  ],
};
