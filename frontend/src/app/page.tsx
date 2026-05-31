"use client";

import Link from "next/link";
import {
  Bot,
  Zap,
  GitBranch,
  Eye,
  Shield,
  Workflow,
  ArrowRight,
  Check,
  Layers,
  CheckCircle2,
  Activity,
  Sparkles,
  CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Marketing() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-slate-100 overflow-x-hidden" data-testid="marketing-page">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[140px]" />
      <div className="pointer-events-none absolute top-[400px] -right-32 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[140px]" />

      <NavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <ShowcaseBlock />
      <CTA />
      <Footer />
    </div>
  );
}

/* ----------------- Nav ----------------- */
function NavBar() {
  return (
    <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/landing" className="flex items-center gap-2.5" data-testid="brand-logo">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/50">
          <span className="text-sm font-bold text-white">O</span>
        </div>
        <span className="font-display text-xl font-semibold tracking-tight">Orqen</span>
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
        <a href="#features" className="hover:text-slate-200">Features</a>
        <a href="#how" className="hover:text-slate-200">How it works</a>
        <a href="https://docs.orqen.dev" className="hover:text-slate-200">Docs</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="hidden sm:inline text-sm text-slate-300 hover:text-white px-3 py-1.5" data-testid="nav-signin">
          Sign in
        </Link>
        <Link href="/dashboard">
          <Button className="bg-violet-600 hover:bg-violet-500 gap-1.5 h-9" data-testid="nav-cta">
            Open app
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}

/* ----------------- Hero ----------------- */
function Hero() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-10 items-center">
        {/* Left column */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.06] px-3 py-1 text-xs text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            Beta 0.7 — Now with parallel agent execution
          </div>

          <h1 className="font-display mt-6 text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-tight">
            The operating system
            <br />
            for{" "}
            <span className="font-serif-accent text-violet-300">multi-agent</span>{" "}
            AI pipelines.
          </h1>

          <p className="mt-6 max-w-xl text-base md:text-lg text-slate-400 leading-relaxed">
            Compose LLMs, agents, tools and human approvals on a visual canvas.
            Run them as durable workflows. Inspect every token, every cost,
            every decision — in real-time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard">
              <Button
                className="bg-violet-600 hover:bg-violet-500 gap-2 h-11 px-5 text-[15px] shadow-lg shadow-violet-900/40"
                data-testid="hero-cta-primary"
              >
                Start building free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> 1000 free runs / mo</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Self-host ready</div>
          </div>
        </div>

        {/* Right column — node graph visual */}
        <HeroGraph />
      </div>
    </section>
  );
}

function HeroGraph() {
  return (
    <div className="relative">
      <div className="relative rounded-2xl border border-border bg-[#0d0d14] p-5 glow-violet">
        {/* Top tab bar mimicking the editor */}
        <div className="flex items-center justify-between rounded-md border border-border bg-[#12121A] px-3 py-1.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
            <span className="ml-2 font-mono">orqen / Customer Support Triage</span>
          </div>
          <span className="font-mono text-cyan-300 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot" />
            Running
          </span>
        </div>

        {/* Canvas */}
        <div
          className="relative mt-3 h-[360px] rounded-md border border-border overflow-hidden"
          style={{
            backgroundColor: "#0a0a0f",
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #1a1a2e 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        >
          {/* SVG edges */}
          <svg className="absolute inset-0 h-full w-full">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
              </marker>
            </defs>
            <path d="M 88,180 C 130,180 130,180 168,180" stroke="#475569" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
            <path d="M 270,180 C 312,180 312,180 350,180" stroke="#475569" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
            <path d="M 452,180 C 490,180 490,140 528,118" stroke="#475569" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
            <path
              d="M 452,180 C 490,180 490,220 528,242"
              stroke="#06b6d4"
              strokeWidth="1.6"
              fill="none"
              strokeDasharray="5"
              markerEnd="url(#arrow)"
            >
              <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.6s" repeatCount="indefinite" />
            </path>
          </svg>

          {/* Nodes */}
          <MiniNode style={{ left: 8, top: 158 }} color="#3B82F6" type="HTTP" label="Webhook In" status="success" />
          <MiniNode style={{ left: 170, top: 158 }} color="#7C3AED" type="LLM" label="Classify Intent" status="success" />
          <MiniNode style={{ left: 352, top: 158 }} color="#F59E0B" type="Condition" label="Is Urgent?" status="success" />
          <MiniNode style={{ left: 528, top: 96 }} color="#F97316" type="Approval" label="Manager" status="pending" small />
          <MiniNode style={{ left: 528, top: 220 }} color="#22C55E" type="Slack" label="Notify Team" status="running" small />
        </div>

        {/* Bottom stat row */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
          {[
            { l: "Duration", v: "12.4s", c: "text-slate-200" },
            { l: "Tokens", v: "2,840", c: "text-violet-300" },
            { l: "Cost", v: "$0.008", c: "text-emerald-300" },
            { l: "Nodes", v: "4/5", c: "text-cyan-300" },
          ].map((s) => (
            <div key={s.l} className="rounded border border-border bg-[#12121A] px-2.5 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">{s.l}</div>
              <div className={`font-mono text-sm font-semibold ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating chips
      <div className="absolute -left-4 top-8 rotate-[-6deg] hidden md:flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-[#0d0d14] px-2.5 py-1.5 text-xs text-violet-200 shadow-xl">
        <Sparkles className="h-3.5 w-3.5" />
        claude-sonnet-4-6
      </div>
      <div className="absolute -right-3 -bottom-3 rotate-[4deg] hidden md:flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-[#0d0d14] px-2.5 py-1.5 text-xs text-cyan-200 shadow-xl">
        <Activity className="h-3.5 w-3.5" />
        Live SSE stream
      </div> */}
    </div>
  );
}

interface MiniNodeProps {
  style: React.CSSProperties;
  color: string;
  type: string;
  label: string;
  status: "running" | "success" | "pending";
  small?: boolean;
}

function MiniNode({ style, color, type, label, status, small }: MiniNodeProps) {
  const ring =
    status === "running"
      ? "ring-2 ring-cyan-400/70 pulse-cyan"
      : status === "success"
      ? "ring-1 ring-emerald-500/40"
      : "ring-1 ring-border";
  return (
    <div
      style={style}
      className={`absolute ${small ? "w-[120px]" : "w-[150px]"} rounded-md bg-[#12121A] ${ring}`}
    >
      <div
        className="flex items-center gap-1.5 rounded-t-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
        style={{ background: `${color}22`, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {type}
      </div>
      <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-100 truncate">{label}</div>
    </div>
  );
}

/* ----------------- Features ----------------- */
const FEATURES = [
  {
    icon: Workflow,
    title: "Visual workflow canvas",
    body: "Drag, connect, snap. Build complex DAGs with LLMs, agents, tools, conditions and human-in-the-loop nodes — no YAML required.",
    accent: "#7C3AED",
  },
  {
    icon: Bot,
    title: "Multi-agent ready",
    body: "First-class ReAct agents with tool access, memory, and recursion limits. Plug Claude, GPT-5 or your own endpoint.",
    accent: "#9333EA",
  },
  {
    icon: Zap,
    title: "Durable execution",
    body: "Workflows survive restarts, retries, and 7-day pauses. Resume exactly where they left off — guaranteed.",
    accent: "#F59E0B",
  },
  {
    icon: Eye,
    title: "Token-level observability",
    body: "Every run is a replayable trace. See per-node inputs, outputs, latency and cost. Stream events live via SSE.",
    accent: "#06B6D4",
  },
  {
    icon: Shield,
    title: "Approvals & guardrails",
    body: "Pause for human review, route by policy, expire after timeout. Compliance-ready audit trail out of the box.",
    accent: "#F97316",
  },
  {
    icon: GitBranch,
    title: "Branch & merge",
    body: "Conditional branching, parallel forks and joins. Compose pipelines like you compose code.",
    accent: "#10B981",
  },
];

function Features() {
  return (
    <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
      <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400">Capabilities</div>
          <h2 className="font-display mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
            Built for teams shipping{" "}
            <span className="font-serif-accent text-slate-300">serious</span>{" "}
            AI products.
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Orqen replaces brittle scripts and ad-hoc orchestration code with a
            unified platform — so your engineers focus on the logic that
            matters, not the plumbing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative rounded-xl border border-border bg-[#12121A] p-6 transition-all hover:-translate-y-0.5 hover:border-violet-500/40"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${f.accent}1a`, color: f.accent }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-slate-100">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------- How it works ----------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Compose",
      body: "Drag nodes onto the canvas. Wire them into a DAG. Configure prompts, tools and conditions.",
      icon: Layers,
    },
    {
      n: "02",
      title: "Trigger",
      body: "Run manually, on a cron schedule, or via webhook. Each run is a durable, replayable execution.",
      icon: Zap,
    },
    {
      n: "03",
      title: "Observe",
      body: "Watch tokens stream in real-time. Inspect every node. Approve, replay or fork failed runs.",
      icon: Eye,
    },
  ];
  return (
    <section id="how" className="relative z-10 border-y border-border bg-[#0b0b12]">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400">Workflow</div>
          <h2 className="font-display mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
            From idea to running pipeline in three steps.
          </h2>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="relative bg-[#0b0b12] p-8 hover:bg-[#101019] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-violet-400">{s.n}</span>
                  <Icon className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="font-display mt-8 text-2xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
                <CornerDownRight className="absolute right-4 bottom-4 h-3.5 w-3.5 text-slate-700" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------- Showcase ----------------- */
function ShowcaseBlock() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-400">Observability</div>
          <h2 className="font-display mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
            Every run, fully{" "}
            <span className="font-serif-accent text-violet-300">replayable.</span>
          </h2>
          <p className="mt-5 text-slate-400 leading-relaxed">
            Stop guessing why your agent did what it did. Orqen records every
            input, every output, every tool call — and lets you step through
            the trace like a debugger.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            {[
              "Per-node input/output JSON, syntax-highlighted",
              "Live SSE streaming for in-flight runs",
              "Filter by status, workflow or date range",
              "One-click replay with modified inputs",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trace mockup */}
        <div className="relative">
          <div className="rounded-xl border border-border bg-[#12121A] p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">run_a92f1</span>
              <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Success · 14.2s
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: "Fetch Tickets", type: "HTTP", color: "#3B82F6", dur: "412ms", status: "success" },
                { label: "Classify Urgency", type: "LLM", color: "#7C3AED", dur: "2.87s", status: "success", tokens: "840" },
                { label: "Is Urgent?", type: "Condition", color: "#F59E0B", dur: "12ms", status: "success", branch: "true" },
                { label: "Notify Team", type: "Slack", color: "#22C55E", dur: "410ms", status: "running" },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-[#0d0d14] px-3 py-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${
                      row.status === "running" ? "pulse-cyan" : ""
                    }`}
                    style={{ background: `${row.color}22`, color: row.color }}
                  >
                    {row.type.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{row.label}</div>
                    {row.branch && (
                      <div className="text-[10px] text-emerald-400">→ {row.branch} branch</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {row.tokens && (
                      <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-mono text-violet-300">
                        {row.tokens} tok
                      </span>
                    )}
                    <span className="rounded border border-border bg-[#0a0a0f] px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                      {row.dur}
                    </span>
                    {row.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 pulse-dot" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------- Final CTA ----------------- */
function CTA() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/[0.18] via-[#12121A] to-[#0a0a0f] p-10 md:p-16 text-center grain">
        <div className="relative">
          <h2 className="font-display mx-auto max-w-3xl text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
            Stop gluing scripts together.{" "}
            <span className="font-serif-accent text-violet-300">Start shipping.</span>
          </h2>
          <p className="mt-5 text-slate-300/80 max-w-xl mx-auto">
            Free to start. 1,000 runs a month. No credit card. Open the app and
            build your first pipeline in under 90 seconds.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard">
              <Button className="bg-violet-600 hover:bg-violet-500 gap-2 h-11 px-6 text-[15px] shadow-lg shadow-violet-900/40" data-testid="cta-primary">
                Open the app
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------- Footer ----------------- */
function Footer() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700">
              <span className="text-sm font-bold text-white">O</span>
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">Orqen</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-200">Features</a>
            <a href="#how" className="hover:text-slate-200">How it works</a>
            <a href="https://docs.orqen.dev" className="hover:text-slate-200">Docs</a>
            <Link href="/dashboard" className="hover:text-slate-200">Open app</Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-xs text-slate-600">
          © 2026 Orqen Labs, Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
