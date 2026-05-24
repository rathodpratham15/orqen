"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow, Play, ShieldCheck, Zap, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",           icon: Workflow,   label: "Workflows"    },
  { href: "/runs",       icon: Play,       label: "Runs"         },
  { href: "/approvals",  icon: ShieldCheck,label: "Approvals"    },
  { href: "/analytics",  icon: BarChart2,  label: "Observability"},
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-14 flex-shrink-0 bg-[#0a0a10] border-r border-[#1a1a28] flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <div className="mb-4 p-2 rounded-lg bg-purple-600/20">
        <Zap size={18} className="text-purple-400" />
      </div>

      {NAV.map(({ href, icon: Icon, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              active
                ? "bg-purple-600/20 text-purple-400"
                : "text-zinc-600 hover:text-zinc-300 hover:bg-[#1a1a2e]",
            )}
          >
            <Icon size={18} />
          </Link>
        );
      })}
    </aside>
  );
}
