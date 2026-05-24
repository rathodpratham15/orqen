"""
Orqen Execution Engine

The engine is the core of the system. It:
  1. Parses a workflow definition into a typed DAG (graph.py)
  2. Maintains shared state between nodes (context.py)
  3. Dispatches each node to the right executor (nodes/)
  4. Orchestrates the full run via Celery tasks (executor.py)
"""
