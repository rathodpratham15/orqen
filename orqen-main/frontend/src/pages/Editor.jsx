import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
} from "reactflow";
import { toast } from "sonner";
import { useData } from "@/lib/dataStore";
import { NODE_TYPES, defaultConfig } from "@/lib/nodeTypes";
import NodePalette from "@/components/editor/NodePalette";
import CustomNode from "@/components/editor/CustomNode";
import ConfigPanel from "@/components/editor/ConfigPanel";
import TopToolbar from "@/components/editor/TopToolbar";

const nodeTypeKeys = Object.keys(NODE_TYPES);
const nodeTypes = nodeTypeKeys.reduce((acc, k) => {
  acc[k] = CustomNode;
  return acc;
}, {});

function EditorInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getWorkflow, upsertWorkflow } = useData();
  const wf = getWorkflow(id);

  const wrapperRef = useRef(null);
  const rfInstanceRef = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(wf?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(wf?.edges || []);
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState(wf?.name || "");
  const [dirty, setDirty] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const runTimer = useRef(null);

  useEffect(() => {
    if (!wf) navigate("/");
  }, [wf, navigate]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            label: params.sourceHandle || undefined,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
          },
          eds
        )
      );
      setDirty(true);
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !rfInstanceRef.current) return;

      const position = rfInstanceRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newId = `n_${Math.random().toString(36).slice(2, 7)}`;
      const newNode = {
        id: newId,
        type,
        position,
        data: {
          label: `New ${NODE_TYPES[type].label}`,
          config: defaultConfig(type),
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setSelectedId(newId);
      setDirty(true);
    },
    [setNodes]
  );

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId]);

  useEffect(() => () => runTimer.current && clearInterval(runTimer.current), []);

  if (!wf) return null;

  // Mark dirty on any change after initial load
  const handleNodesChange = (changes) => {
    onNodesChange(changes);
    if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) setDirty(true);
  };
  const handleEdgesChange = (changes) => {
    onEdgesChange(changes);
    if (changes.length) setDirty(true);
  };

  const updateNode = (updated) => {
    setNodes((nds) => nds.map((n) => (n.id === updated.id ? updated : n)));
    setDirty(true);
  };
  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedId(null);
    setDirty(true);
    toast.success("Node deleted");
  };

  const handleSave = () => {
    upsertWorkflow({ ...wf, name, nodes, edges });
    setDirty(false);
    toast.success("Workflow saved");
  };

  // Mock SSE-like simulated run
  const handleRun = () => {
    if (nodes.length === 0) {
      toast.error("Add nodes before running");
      return;
    }
    setRunStatus("running");
    // mark first node running
    const sequence = [...nodes];
    let i = 0;
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: n.id === sequence[0].id ? "running" : "pending" } })));
    if (runTimer.current) clearInterval(runTimer.current);
    runTimer.current = setInterval(() => {
      i++;
      if (i >= sequence.length) {
        clearInterval(runTimer.current);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: "success" } })));
        setEdges((eds) => eds.map((e) => ({ ...e, animated: false })));
        setRunStatus("success");
        toast.success("Run completed");
        return;
      }
      const doneId = sequence[i - 1].id;
      const nextId = sequence[i].id;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === doneId) return { ...n, data: { ...n.data, runStatus: "success" } };
          if (n.id === nextId) return { ...n, data: { ...n.data, runStatus: "running" } };
          return n;
        })
      );
      setEdges((eds) =>
        eds.map((e) => ({ ...e, animated: e.target === nextId }))
      );
    }, 900);
    toast.info("Run queued…");
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0f] text-slate-100" data-testid="editor-page">
      {/* Mobile warning */}
      <div className="md:hidden flex h-full w-full items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-lg font-semibold">Use a larger screen</h2>
          <p className="mt-2 text-sm text-slate-500">The workflow editor requires a desktop screen.</p>
          <button onClick={() => navigate("/")} className="mt-4 rounded bg-violet-600 px-4 py-2 text-sm">Back to Workflows</button>
        </div>
      </div>

      <div className="hidden md:flex w-full h-full">
        <NodePalette />

        <div className="relative flex-1" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
          <TopToolbar
            workflowName={name}
            onRename={(v) => { setName(v); setDirty(true); }}
            dirty={dirty}
            onSave={handleSave}
            onRun={handleRun}
            runStatus={runStatus}
          />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            onInit={(inst) => (rfInstanceRef.current = inst)}
            fitView
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: "#7c3aed" },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1a1a2e" gap={20} size={1.5} />
            <MiniMap
              maskColor="rgba(10,10,15,0.85)"
              nodeColor={(n) => NODE_TYPES[n.type]?.color || "#7c3aed"}
              nodeStrokeWidth={2}
              pannable
              zoomable
            />
            <Controls />
          </ReactFlow>
        </div>

        <ConfigPanel node={selectedNode} onChange={updateNode} onDelete={deleteNode} />
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
