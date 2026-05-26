import { NODE_TYPES, NODE_SECTIONS } from "@/lib/nodeTypes";
import { GripVertical } from "lucide-react";

export default function NodePalette() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      data-testid="node-palette"
      className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-[#0d0d14] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 border-b border-border bg-[#0d0d14] px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Nodes</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Drag onto the canvas</p>
      </div>

      <div className="p-3 space-y-5">
        {NODE_SECTIONS.map((section) => {
          const items = Object.values(NODE_TYPES).filter((n) => n.section === section);
          return (
            <div key={section}>
              <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section}
              </div>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      data-testid={`palette-${item.type}`}
                      className="group flex cursor-grab items-center gap-2.5 rounded-md border border-border bg-[#12121A] p-2.5 transition-all hover:border-violet-500/40 hover:-translate-y-px active:cursor-grabbing"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400" />
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
                        style={{ background: item.accent, color: item.color }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200">{item.label}</div>
                        <div className="truncate text-[10px] text-slate-500">{item.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
