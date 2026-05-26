import { NavLink } from "react-router-dom";
import { Layers, Play, CheckSquare, BarChart2, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { to: "/", icon: Layers, label: "Workflows", testid: "nav-workflows" },
  { to: "/runs", icon: Play, label: "Runs", testid: "nav-runs" },
  { to: "/approvals", icon: CheckSquare, label: "Approvals", testid: "nav-approvals" },
  { to: "/analytics", icon: BarChart2, label: "Analytics", testid: "nav-analytics" },
];

export default function Sidebar() {
  return (
    <aside
      data-testid="sidebar"
      className="fixed left-0 top-0 z-30 h-screen w-16 flex flex-col items-center justify-between border-r border-border bg-[#0d0d14] py-4"
    >
      <div className="flex flex-col items-center gap-1">
        {/* Brand mark */}
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/40">
          <span className="text-sm font-bold text-white">O</span>
        </div>

        <TooltipProvider delayDuration={120}>
          {NAV_ITEMS.map(({ to, icon: Icon, label, testid }) => (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={to}
                  end={to === "/"}
                  data-testid={testid}
                  className={({ isActive }) =>
                    `group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-violet-500/10 text-violet-400"
                        : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-violet-500" />
                      )}
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </>
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#12121A] border-border text-foreground">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              data-testid="nav-settings"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              <Settings className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#12121A] border-border text-foreground">
            Settings
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </aside>
  );
}
