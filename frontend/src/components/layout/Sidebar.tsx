"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layers, Play, CheckSquare, BarChart2, Settings, LogOut, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
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
  { href: "/schedules", icon: Calendar,    label: "Schedules",    testid: "nav-schedules" },
  { href: "/analytics", icon: BarChart2,   label: "Observability",testid: "nav-analytics" },
  { href: "/settings",  icon: Settings,    label: "Settings",     testid: "nav-settings"  },
];

export function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

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

      {/* Bottom: user avatar + logout */}
      <TooltipProvider delayDuration={120}>
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-violet-800 cursor-default select-none">
                <span className="text-xs font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </aside>
  );
}
