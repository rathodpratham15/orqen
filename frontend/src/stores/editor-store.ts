/**
 * Zustand store for the workflow editor.
 *
 * Owns the React Flow node/edge state and the selected node for the config panel.
 * Converts between our backend WorkflowDefinition format and React Flow format.
 */
import { create } from "zustand";
import {
  type Node,
  type Edge,
  addEdge,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type { WorkflowDefinition, WorkflowNode, NodeConfig, NodeType } from "@/lib/types";

// ─── React Flow node data ─────────────────────────────────────────────────────

export interface OrqenNodeData extends Record<string, unknown> {
  label:    string;
  nodeType: NodeType;
  config:   NodeConfig;
}

export type OrqenNode = Node<OrqenNodeData>;

// ─── Store ────────────────────────────────────────────────────────────────────

interface EditorStore {
  workflowId:   string | null;
  workflowName: string;
  isDirty:      boolean;

  nodes: OrqenNode[];
  edges: Edge[];

  selectedNodeId: string | null;

  // Node / edge mutation
  setNodes:         (nodes: OrqenNode[]) => void;
  setEdges:         (edges: Edge[]) => void;
  onNodesChange:    (changes: NodeChange[]) => void;
  onEdgesChange:    (changes: EdgeChange[]) => void;
  onConnect:        (connection: Connection) => void;
  addNode:          (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeConfig: (nodeId: string, config: Partial<NodeConfig>) => void;
  updateNodeLabel:  (nodeId: string, label: string) => void;
  deleteNode:       (nodeId: string) => void;

  // Selection
  selectNode:   (nodeId: string | null) => void;
  selectedNode: () => OrqenNode | null;

  // Workflow metadata
  setWorkflowName: (name: string) => void;
  setWorkflowId:   (id: string) => void;

  // Serialization
  loadFromDefinition: (def: WorkflowDefinition) => void;
  toDefinition:       () => WorkflowDefinition;
  markClean:          () => void;
}

// Default configs per node type
const DEFAULT_CONFIGS: Record<NodeType, NodeConfig> = {
  llm:       { prompt: "", system_prompt: "You are a helpful assistant.", model: "claude-sonnet-4-6", max_tokens: 2048 },
  http:      { url: "", method: "GET", headers: {} },
  condition: { left: "", operator: "==", right: "" },
  approval:  { message: "Please review and approve to continue.", timeout_hours: 24 },
  slack:     { webhook_url: "", text: "", username: "Orqen", icon_emoji: ":robot_face:" },
  email:     { to: "", subject: "", body: "", from_name: "Orqen" },
  code:      { code: "# Access prior node outputs via `inputs` dict\n# e.g. text = inputs.get('llm_node', {}).get('text', '')\n\nresult = inputs", timeout: 10 },
  agent:     { goal: "", system_prompt: "You are a capable AI agent. Think step by step.", model: "claude-sonnet-4-6", max_iterations: 10, max_tokens: 4096, available_tools: ["http_request", "run_python"], inject_context: true },
  memory:    { operation: "search", collection: "default", query: "", top_k: 5 },
};

const DEFAULT_LABELS: Record<NodeType, string> = {
  llm:       "LLM",
  http:      "HTTP Request",
  condition: "Condition",
  approval:  "Approval",
  slack:     "Slack",
  email:     "Email",
  code:      "Code",
  agent:     "AI Agent",
  memory:    "Memory",
};

let _nodeCounter = 1;
function genNodeId() {
  return `node_${Date.now()}_${_nodeCounter++}`;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  workflowId:     null,
  workflowName:   "Untitled Workflow",
  isDirty:        false,
  nodes:          [],
  edges:          [],
  selectedNodeId: null,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) =>
    set((s) => ({
      nodes:   applyNodeChanges(changes, s.nodes) as OrqenNode[],
      isDirty: true,
    })),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges:   applyEdgeChanges(changes, s.edges),
      isDirty: true,
    })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(
        {
          ...connection,
          id:   `edge_${Date.now()}`,
          type: "smoothstep",
          animated: false,
          style: { stroke: "#3a3a55", strokeWidth: 2 },
          data: { condition: null },
        },
        s.edges,
      ),
      isDirty: true,
    })),

  addNode: (type, position) => {
    const id = genNodeId();
    const newNode: OrqenNode = {
      id,
      type,           // maps to custom node component in nodeTypes
      position,
      data: {
        label:    DEFAULT_LABELS[type],
        nodeType: type,
        config:   { ...DEFAULT_CONFIGS[type] },
      },
    };
    set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }));
    return id;
  },

  updateNodeConfig: (nodeId, config) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } }
          : n,
      ),
      isDirty: true,
    })),

  updateNodeLabel: (nodeId, label) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
      ),
      isDirty: true,
    })),

  deleteNode: (nodeId) =>
    set((s) => ({
      nodes:          s.nodes.filter((n) => n.id !== nodeId),
      edges:          s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      isDirty:        true,
    })),

  selectNode:   (nodeId) => set({ selectedNodeId: nodeId }),
  selectedNode: () => {
    const { nodes, selectedNodeId } = get();
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  },

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),
  setWorkflowId:   (id)   => set({ workflowId: id }),

  loadFromDefinition: (def) => {
    const nodes: OrqenNode[] = def.nodes.map((n) => ({
      id:       n.id,
      type:     n.type,
      position: n.position,
      data: {
        label:    n.label || DEFAULT_LABELS[n.type] || n.type,
        nodeType: n.type,
        config:   n.config,
      },
    }));

    const edges: Edge[] = def.edges.map((e) => ({
      id:       e.id,
      source:   e.source,
      target:   e.target,
      type:     "smoothstep",
      animated: false,
      label:    e.condition ?? undefined,
      style:    { stroke: "#3a3a55", strokeWidth: 2 },
      data:     { condition: e.condition },
    }));

    set({ nodes, edges, isDirty: false });
  },

  toDefinition: (): WorkflowDefinition => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map((n) => ({
        id:       n.id,
        type:     n.data.nodeType,
        label:    n.data.label,
        config:   n.data.config,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id:        e.id,
        source:    e.source,
        target:    e.target,
        condition: (e.data as { condition?: "true" | "false" | null })?.condition ?? null,
      })),
    };
  },

  markClean: () => set({ isDirty: false }),
}));
