import {
  Bot,
  UserSearch,
  Brain,
  Zap,
  CheckCircle2,
  Code2,
  Globe,
  MessageSquare,
  Mail,
} from "lucide-react";

// Node type registry: icon, label, description, color, section
export const NODE_TYPES = {
  llm: {
    type: "llm",
    label: "LLM",
    description: "Call Claude with a prompt",
    section: "AI & Agents",
    icon: Bot,
    color: "#7C3AED", // violet
    accent: "rgba(124, 58, 237, 0.15)",
  },
  agent: {
    type: "agent",
    label: "Agent",
    description: "ReAct agent with tools",
    section: "AI & Agents",
    icon: UserSearch,
    color: "#9333EA", // purple
    accent: "rgba(147, 51, 234, 0.15)",
  },
  memory: {
    type: "memory",
    label: "Memory",
    description: "Store/search vector memory",
    section: "AI & Agents",
    icon: Brain,
    color: "#6366F1", // indigo
    accent: "rgba(99, 102, 241, 0.15)",
  },
  condition: {
    type: "condition",
    label: "Condition",
    description: "Branch on true/false",
    section: "Logic",
    icon: Zap,
    color: "#F59E0B", // amber
    accent: "rgba(245, 158, 11, 0.15)",
  },
  approval: {
    type: "approval",
    label: "Approval",
    description: "Pause for human review",
    section: "Logic",
    icon: CheckCircle2,
    color: "#F97316", // orange
    accent: "rgba(249, 115, 22, 0.15)",
  },
  code: {
    type: "code",
    label: "Code",
    description: "Run Python snippet",
    section: "Logic",
    icon: Code2,
    color: "#10B981", // emerald
    accent: "rgba(16, 185, 129, 0.15)",
  },
  http: {
    type: "http",
    label: "HTTP",
    description: "Make API requests",
    section: "Integrations",
    icon: Globe,
    color: "#3B82F6", // blue
    accent: "rgba(59, 130, 246, 0.15)",
  },
  slack: {
    type: "slack",
    label: "Slack",
    description: "Send Slack message",
    section: "Integrations",
    icon: MessageSquare,
    color: "#22C55E", // green
    accent: "rgba(34, 197, 94, 0.15)",
  },
  email: {
    type: "email",
    label: "Email",
    description: "Send email via Resend",
    section: "Integrations",
    icon: Mail,
    color: "#14B8A6", // teal
    accent: "rgba(20, 184, 166, 0.15)",
  },
};

export const NODE_SECTIONS = ["AI & Agents", "Logic", "Integrations"];

// Default config when creating a new node
export const defaultConfig = (type) => {
  switch (type) {
    case "llm":
      return {
        model: "claude-sonnet-4-6",
        prompt: "",
        maxTokens: 1024,
        structuredJson: false,
        temperature: 0.7,
      };
    case "http":
      return {
        method: "GET",
        url: "",
        headers: [],
        body: "",
        timeout: 30,
      };
    case "condition":
      return { left: "", operator: "equals", right: "" };
    case "approval":
      return { message: "", timeoutHours: 24 };
    case "code":
      return { code: "def run(context):\n    return {}\n", timeout: 30 };
    case "agent":
      return {
        systemPrompt: "",
        maxIterations: 10,
        tools: { http_request: true, run_python: false, search_memory: true },
        model: "claude-sonnet-4-6",
      };
    case "memory":
      return { operation: "store", collection: "", content: "", query: "", topK: 5 };
    case "slack":
      return { webhookUrl: "", channel: "", message: "", useBlocks: false };
    case "email":
      return { to: "", subject: "", body: "", htmlMode: false };
    default:
      return {};
  }
};

// Short preview text for node cards
export const previewConfig = (type, config = {}) => {
  switch (type) {
    case "llm":
      return `Model: ${config.model || "claude-sonnet-4-6"}`;
    case "http":
      return `${config.method || "GET"} ${config.url || "<no url>"}`;
    case "condition":
      return `IF ${config.left || "{}"} ${config.operator || "equals"} ${config.right || "{}"}`;
    case "approval":
      return config.message ? config.message.slice(0, 40) + "…" : "Awaiting message";
    case "code":
      return "Python 3.12";
    case "agent":
      return `Iter: ${config.maxIterations || 10}`;
    case "memory":
      return `${(config.operation || "store").toUpperCase()} • ${config.collection || "default"}`;
    case "slack":
      return config.channel || "#channel";
    case "email":
      return config.to || "no-recipient";
    default:
      return "";
  }
};
