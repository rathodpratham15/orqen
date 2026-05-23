# Orqen — AI Workflow Operating System

> Visual workflow builder with multi-agent orchestration, async execution engine, approval loops, and full observability.

[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What Is This

Orqen is an AI workflow orchestration platform — think **n8n + agents + observability**. Users visually compose workflows that chain AI agents, tools, and integrations. Every execution is fully traced, retried on failure, and pauseable for human approval.

Built as a real system: not a toy, not a chatbot wrapper. A distributed execution engine with proper async job queues, state machines, and observable runs.

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
│                    │  │ traversal  │  │                          │
│                    │  └────────────┘  │                          │
│                    └────────┬─────────┘                          │
└─────────────────────────────┼──────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                    ▼
   ┌─────────────┐   ┌──────────────────┐  ┌────────────────┐
   │ PostgreSQL  │   │  Celery + Redis  │  │  Claude API    │
   │ + pgvector  │   │  (async workers, │  │  (tool use,    │
   │ (state,     │   │   retries, cron) │  │  multi-agent)  │
   │  memory)    │   └──────────────────┘  └────────────────┘
   └─────────────┘
```

---

## Node Types

| Node | Description |
|------|-------------|
| `llm` | Call Claude with prompt templates, tool use, structured outputs |
| `http` | Make HTTP requests to any REST API |
| `condition` | Branch workflow based on comparison (if/else) |
| `approval` | Pause execution and wait for human approval |
| `code` | Execute sandboxed Python snippets |
| `delay` | Wait for N seconds/minutes before continuing |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind, React Flow, Zustand |
| Backend | FastAPI, Python 3.11+, SQLAlchemy (async), Pydantic v2 |
| Queue | Celery + Redis |
| Database | PostgreSQL + pgvector (Neon in prod) |
| AI | Anthropic Claude API (tool use, streaming) |
| Auth | Clerk |
| Deploy | Vercel (FE) + Railway (BE + Redis) |

---

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Python 3.11+
- Node.js 20+

### Run locally

```bash
# 1. Clone
git clone https://github.com/rathodpratham15/orqen.git
cd orqen

# 2. Configure environment
cp backend/.env.example backend/.env
# Add your ANTHROPIC_API_KEY

# 3. Start infrastructure
docker-compose up postgres redis -d

# 4. Run backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload

# 5. Run worker (new terminal)
celery -A workers worker --loglevel=info

# 6. Run frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## API Reference

```
POST   /api/workflows              Create workflow
GET    /api/workflows              List workflows
GET    /api/workflows/:id          Get workflow
PUT    /api/workflows/:id          Update workflow
DELETE /api/workflows/:id          Delete workflow

POST   /api/workflows/:id/run      Trigger a run
GET    /api/runs/:id               Get run status + trace
GET    /api/runs/:id/stream        SSE: live execution events
GET    /api/runs                   List runs (filterable)

GET    /api/approvals/pending      Get pending approvals
POST   /api/approvals/:id/resolve  Approve or reject
```

---

## Project Structure

```
flowai/
├── backend/
│   ├── api/              # FastAPI route handlers
│   ├── engine/           # Core execution engine
│   │   ├── graph.py      # DAG traversal, topological sort
│   │   ├── context.py    # Shared execution context + variable resolution
│   │   ├── executor.py   # Celery tasks, run orchestration
│   │   └── nodes/        # Node implementations
│   │       ├── base.py
│   │       ├── llm_node.py
│   │       ├── tool_node.py
│   │       ├── condition_node.py
│   │       └── approval_node.py
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic request/response schemas
│   ├── alembic/          # DB migrations
│   ├── main.py           # FastAPI app entrypoint
│   ├── database.py       # Async DB session factory
│   └── workers.py        # Celery app config
└── frontend/             # Next.js app (coming soon)
```

---

## System Design Decisions

**Why Celery over asyncio tasks?**
Celery gives us persistence across restarts, configurable retry policies with exponential backoff, visibility into the job queue, and scheduled triggers (celery beat) — things raw asyncio can't provide.

**Why a custom orchestration engine instead of LangGraph?**
Ownership. Every architectural decision is ours to explain. LangGraph is a dependency; our engine is the project.

**Why DAG + topological sort?**
Workflows are directed acyclic graphs. Topological sort gives us safe execution order. Condition nodes create branches — edges carry a `condition` label (`true`/`false`) and the executor follows the right branch.

**Why pause on ApprovalNode instead of polling?**
The workflow state (context, position) is serialized to the database on pause. Resume is a new Celery task that rehydrates context and continues from the next node. This is how real workflow engines handle human-in-the-loop.

---

## Roadmap

- [x] Execution engine (graph, nodes, Celery queue)
- [x] FastAPI REST API
- [ ] React Flow frontend canvas
- [ ] Real-time SSE run monitor
- [ ] Slack + Gmail integration nodes
- [ ] Multi-agent workflows (AgentNode)
- [ ] pgvector long-term memory
- [ ] Cost + observability dashboard
- [ ] Scheduling (cron triggers)
- [ ] AI evaluation layer

---

*Built by [@rathodpratham15](https://github.com/rathodpratham15) · [github.com/rathodpratham15/orqen](https://github.com/rathodpratham15/orqen)*
