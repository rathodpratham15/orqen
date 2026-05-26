"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Play, CheckSquare, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV = [
  { href: "/",          icon: Layers,      label: "Workflows",    testid: "nav-workflows" },
  { href: "/runs",      icon: Play,        label: "Runs",         testid: "nav-runs"      },
  { href: "/approvals", icon: CheckSquare, label: "Approvals",    testid: "nav-approvals" },
  { href: "/analytics", icon: BarChart2,   label: "Observability",testid: "nav-analytics" },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside
      data-testid="sidebar"
      className="fixed left-0 top-0 z-30 h-screen w-16 flex flex-col items-center justify-between border-r border-[#1E1E2E] bg-[#0d0d14] py-4"
    >
      <div className="flex flex-col items-center gap-1">
        {/* Brand mark */}
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/40">
          <span className="text-sm font-bold text-white">O</span>
        </div>

        <TooltipProvider delayDuration={120}>
          {NAV.map(({ href, icon: Icon, label, testid }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    data-testid={testid}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                      active
                        ? "bg-violet-500/10 text-violet-400"
                        : "text-slate-500 hover:text-slate-200 hover:bg-white/5",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-violet-500" />
                    )}
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
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
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </aside>
  );
}
