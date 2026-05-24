# Orqen — AI Workflow Operating System

> Visual workflow builder with multi-agent orchestration, async execution engine, approval loops, and full observability.

[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Celery](https://img.shields.io/badge/Celery-5.4-brightgreen)](https://docs.celeryq.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What Is This

Orqen is an AI workflow orchestration platform — think **n8n + agents + observability**. Users visually compose workflows that chain AI agents, tools, and integrations on a drag-and-drop canvas. Every execution is fully traced, retried on failure, and pauseable for human approval.

Built as a real distributed system: not a toy, not a chatbot wrapper. A proper async job queue, stateful execution context, DAG traversal engine, and real-time SSE monitoring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                             │
│  ┌──────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │  Workflow Canvas  │  │  Run Monitor    │  │ Trace Viewer  │  │
│  │  (React Flow)     │  │  (SSE stream)   │  │ (per-node)    │  │
│  └──────────────────┘  └─────────────────┘  └───────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────────┐
│                     FastAPI Backend                              │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Workflow API  │  │  Execution       │  │  Approval        │  │
│  │ (CRUD)        │  │  Engine          │  │  Engine          │  │
│  └──────────────┘  │  ┌────────────┐  │  └──────────────────┘  │
│                    │  │ Graph DAG  │  │                          │
│                    │  │ BFS walk   │  │                          │
│                    │  └────────────┘  │                          │
│                    └────────┬─────────┘                          │
└─────────────────────────────┼──────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                    ▼
   ┌─────────────┐   ┌──────────────────┐  ┌────────────────┐
   │ PostgreSQL  │   │  Celery + Redis  │  │  Claude API    │
   │ + pgvector  │   │  (async workers, │  │  (Sonnet 3.5,  │
   │ (Neon)      │   │   retries, cron) │  │  tool use)     │
   └─────────────┘   │  (Upstash)       │  └────────────────┘
                     └──────────────────┘
```

---

## Node Types

| Node | Color | Description |
|------|-------|-------------|
| `llm` | Purple | Call Claude with prompt templates; optional JSON structured output |
| `http` | Blue | Make HTTP requests to any REST API (all methods, auth headers) |
| `condition` | Amber | Branch workflow on a comparison — true/false fan-out |
| `approval` | Teal | Pause execution and wait for human to approve or reject |
| `slack` | Green | Send messages via Slack Incoming Webhooks + Block Kit |
| `email` | Sky | Send emails via Resend API (HTML or plain text) |
| `code` | Orange | Execute sandboxed Python snippets with configurable timeout |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Flow v12, Zustand |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2 (async), Pydantic v2 |
| Queue | Celery 5.4 + Redis (Upstash) |
| Database | PostgreSQL 16 + pgvector (Neon) |
| AI | Anthropic Claude API (claude-sonnet-3-5) |
| Realtime | Server-Sent Events via Redis pub/sub |
| Deploy | Vercel (frontend) + Railway (backend + workers) |

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- An [Upstash](https://upstash.com) Redis database
- An [Anthropic](https://anthropic.com) API key

### Local development

```bash
# 1. Clone
git clone https://github.com/rathodpratham15/orqen.git
cd orqen

# 2. Configure backend
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, SYNC_DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, etc.

# 3. Install and migrate
cd backend
pip install -r requirements.txt
alembic upgrade head          # creates tables in Neon

# 4. Start FastAPI (terminal 1)
uvicorn main:app --reload

# 5. Start Celery worker (terminal 2)
celery -A workers worker --loglevel=info -Q workflows,default

# 6. Start frontend (terminal 3)
cd ../frontend
npm install
npm run dev
```

Open http://localhost:3000 — the canvas is live.

### Docker Compose (all services)

```bash
cp backend/.env.example backend/.env   # fill in credentials
docker compose up
```

Services: FastAPI on :8000, Next.js on :3000, Flower (Celery UI) on :5555.

Run migrations once:
```bash
docker compose run --rm migrate
```

---

## Demo Workflow

`backend/demo_workflow.json` contains a 6-node "Research & Notify" workflow:

```
[Trigger: topic + email]
       ↓
  [LLM: research]
       ↓
  [Code: word-count]
       ↓
  [LLM: summarize]
       ↓
  [Approval: review]
       ↓
  [Slack] ──── [Email]   (parallel fan-out)
```

To run it, `POST /api/workflows` with the JSON body from that file, then `POST /api/workflows/:id/run` with `{ "trigger_data": { "topic": "...", "email": "..." } }`.

---

## API Reference

```
POST   /api/workflows              Create workflow
GET    /api/workflows              List workflows
GET    /api/workflows/:id          Get workflow
PUT    /api/workflows/:id          Update workflow
DELETE /api/workflows/:id          Delete workflow

POST   /api/workflows/:id/run      Trigger a run  → 202 + run_id
GET    /api/runs                   List runs (filter by workflow, status)
GET    /api/runs/:id               Get run status + full node trace
GET    /api/runs/:id/stream        SSE: live node events

GET    /api/approvals/pending      Pending approvals
POST   /api/approvals/:id/resolve  Approve or reject → resumes run
```

Interactive docs at `/docs` (Swagger UI).

---

## Project Structure

```
orqen/
├── backend/
│   ├── api/                # FastAPI route handlers
│   │   ├── workflows.py    # Workflow CRUD
│   │   ├── runs.py         # Trigger, list, SSE stream
│   │   └── approvals.py    # Approval resolution
│   ├── engine/             # Core execution engine
│   │   ├── graph.py        # DAG parsing, topological sort, BFS
│   │   ├── context.py      # Execution context + {{ template }} resolution
│   │   ├── executor.py     # Celery tasks, run orchestration
│   │   └── nodes/          # Node implementations
│   │       ├── base.py     # NodeStatus, NodeResult, BaseNode ABC
│   │       ├── llm_node.py
│   │       ├── http_node.py
│   │       ├── condition_node.py
│   │       ├── approval_node.py
│   │       ├── slack_node.py
│   │       ├── email_node.py
│   │       └── code_node.py
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic request/response schemas
│   ├── alembic/            # DB migrations
│   ├── main.py             # FastAPI app entrypoint
│   ├── database.py         # Async engine + session factory
│   ├── config.py           # pydantic-settings env loading
│   ├── workers.py          # Celery app config
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   │   └── canvas/     # React Flow canvas, palette, config panel
│   │   ├── stores/         # Zustand state (editor + run)
│   │   └── lib/            # Types, API client
│   └── Dockerfile
├── docker-compose.yml
└── railway.toml
```

---

## System Design Decisions

**Custom orchestration engine vs LangGraph**
Full ownership. Every architectural decision is ours to explain. LangGraph is a dependency; our engine is the project.

**BFS traversal, not recursion**
`deque`-based BFS handles fan-out (parallel branches) naturally and won't stack-overflow on deep workflows.

**Pause/resume across workers**
`ExecutionContext` (all node outputs, run state) serializes to a JSONB column on `ApprovalNode` pause. `resume_workflow_task` rehydrates it — any worker can resume, not just the one that paused.

**Late template resolution**
`{{ node_id.field }}` templates resolve just before each node executes, not at workflow save time. This lets upstream outputs flow into downstream configs dynamically.

**Celery over raw asyncio**
Persistence across restarts, exponential-backoff retries, queue routing (`-Q workflows`), and Celery Beat for cron scheduling — all things asyncio can't provide.

---

## Roadmap

- [x] Execution engine (BFS graph, typed nodes, Celery queue)
- [x] FastAPI REST API + Alembic migrations
- [x] React Flow canvas with drag-and-drop, dark theme
- [x] Real-time SSE run monitor (node-by-node status)
- [x] Slack + Email + Code execution nodes
- [x] Approval (human-in-the-loop) pause/resume
- [x] Demo workflow JSON
- [x] Docker + Railway deployment
- [ ] Observability dashboard (token costs, run history charts)
- [ ] pgvector long-term memory node
- [ ] Real auth (Clerk JWT)
- [ ] AgentNode — multi-step Claude tool use loops
- [ ] AI evaluation layer

---

*Built by [@rathodpratham15](https://github.com/rathodpratham15) · [github.com/rathodpratham15/orqen](https://github.com/rathodpratham15/orqen)*
