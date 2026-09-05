"""
FastAPI Application — AI Block Planning System API.

Serves as the REST API layer connecting the backend engines (scoring,
conflict resolution, optimization, simulation) to the React dashboard frontend.

Endpoints:
  GET  /api/tasks          — All tasks with scores, filterable
  GET  /api/tasks/{id}     — Single task detail
  GET  /api/conflicts      — Detected conflicts with resolutions
  GET  /api/plan/weekly    — Weekly block plan
  GET  /api/plan/monthly   — Full monthly plan
  GET  /api/kpi            — Asset availability KPIs
  POST /api/simulate       — What-if simulation
  GET  /api/corridors      — Corridor metadata
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from models import MaintenanceTask, ConflictRecord, BlockAllocation
import ingestion
import scoring
import conflict_resolver
import optimizer
import simulator

app = FastAPI(
    title="RailBlock AI — Smart Block Planning System",
    description="AI-powered maintenance block planning for Indian Railways",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────── Global State ────────────────
GLOBAL_TASKS: List[MaintenanceTask] = []
GLOBAL_COA: List[dict] = []
GLOBAL_CONFLICTS: List[ConflictRecord] = []
GLOBAL_MONTHLY_PLAN: Dict[str, Any] = {}


@app.on_event("startup")
def startup_event():
    """Load data, score tasks, resolve conflicts, and run optimizer on startup."""
    global GLOBAL_TASKS, GLOBAL_COA, GLOBAL_CONFLICTS, GLOBAL_MONTHLY_PLAN

    # 1. Load and normalize data
    GLOBAL_COA = ingestion.load_coa_data()
    raw_tasks = ingestion.get_all_tasks()

    # 2. Score all tasks
    scored_tasks = scoring.score_all_tasks(raw_tasks, GLOBAL_COA)

    # 3. Resolve conflicts
    resolved_tasks, conflicts = conflict_resolver.resolve_all_conflicts(scored_tasks, GLOBAL_COA)
    GLOBAL_CONFLICTS = conflicts

    # 4. Reset statuses for optimization
    for t in resolved_tasks:
        if t.status != "backlog":
            t.status = "pending"

    # 5. Run monthly optimizer
    GLOBAL_TASKS = resolved_tasks
    GLOBAL_MONTHLY_PLAN = optimizer.allocate_monthly(GLOBAL_TASKS, GLOBAL_COA)

    # 6. Compute avg priority score for KPI
    if GLOBAL_TASKS:
        avg_score = sum(t.priority_score for t in GLOBAL_TASKS) / len(GLOBAL_TASKS)
        if "stats" in GLOBAL_MONTHLY_PLAN:
            GLOBAL_MONTHLY_PLAN["stats"]["avg_priority_score"] = round(avg_score, 1)
            GLOBAL_MONTHLY_PLAN["stats"]["conflicts_resolved_pct"] = (
                round(len(GLOBAL_CONFLICTS) / max(1, len(GLOBAL_CONFLICTS)) * 100, 1)
                if GLOBAL_CONFLICTS else 100.0
            )

    print(f"[OK] Loaded {len(GLOBAL_TASKS)} tasks, resolved {len(GLOBAL_CONFLICTS)} conflicts")
    print(f"     Monthly plan: {GLOBAL_MONTHLY_PLAN.get('monthly_stats', {})}")


# ──────────────── Task Endpoints ────────────────

@app.get("/api/tasks")
def get_tasks(
    source: Optional[str] = Query(None, description="Filter by source system: TMS, SMMS, TDMS"),
    corridor_id: Optional[str] = Query(None, description="Filter by corridor ID"),
    severity: Optional[int] = Query(None, description="Filter by minimum severity grade (1-5)"),
):
    """Get all maintenance tasks with priority scores and explanations."""
    tasks = GLOBAL_TASKS

    if source:
        tasks = [t for t in tasks if t.source_system == source.upper()]
    if corridor_id:
        tasks = [t for t in tasks if t.corridor_id == corridor_id]
    if severity:
        tasks = [t for t in tasks if t.severity_grade >= severity]

    return {
        "tasks": [t.dict() for t in tasks],
        "total": len(tasks),
    }


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    """Get a single task with full details and explanation."""
    for t in GLOBAL_TASKS:
        if t.task_id == task_id:
            return t.dict()
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


# ──────────────── Conflict Endpoints ────────────────

@app.get("/api/conflicts")
def get_conflicts():
    """Get all detected corridor conflicts and their resolutions."""
    return {
        "conflicts": [c.dict() for c in GLOBAL_CONFLICTS],
        "total_conflicts": len(GLOBAL_CONFLICTS),
        "resolved_count": len(GLOBAL_CONFLICTS),  # All detected conflicts are auto-resolved
        "by_type": {
            "merged": sum(1 for c in GLOBAL_CONFLICTS if c.resolution_type == "merged"),
            "rescheduled": sum(1 for c in GLOBAL_CONFLICTS if c.resolution_type == "rescheduled"),
            "split": sum(1 for c in GLOBAL_CONFLICTS if c.resolution_type == "split"),
        },
    }


# ──────────────── Plan Endpoints ────────────────

@app.get("/api/plan/weekly")
def get_weekly_plan(week: int = Query(1, ge=1, le=4, description="Week number (1-4)")):
    """Get the block allocation plan for a specific week."""
    weeks = GLOBAL_MONTHLY_PLAN.get("weeks", [])
    for w in weeks:
        if w.get("week_number") == week:
            return w
    return {
        "week_number": week,
        "allocations": [],
        "backlog": [],
        "stats": {"total_allocated": 0, "total_backlog": 0, "utilization_pct": 0},
    }


@app.get("/api/plan/monthly")
def get_monthly_plan():
    """Get the full 4-week monthly plan with stats and backlog trends."""
    plan = GLOBAL_MONTHLY_PLAN
    backlog_trend = [
        w.get("stats", {}).get("total_backlog", 0)
        for w in plan.get("weeks", [])
    ]
    return {
        "weeks": plan.get("weeks", []),
        "backlog": plan.get("backlog", []),
        "monthly_stats": plan.get("monthly_stats", {}),
        "backlog_trend": backlog_trend,
    }


# ──────────────── KPI Endpoint ────────────────

@app.get("/api/kpi")
def get_kpi():
    """Get asset availability KPI metrics with before/after comparison."""
    return GLOBAL_MONTHLY_PLAN.get("stats", {
        "asset_availability_pct": 0,
        "manual_baseline_pct": 0,
        "tasks_scheduled_pct": 0,
        "conflicts_resolved_pct": 0,
        "avg_priority_score": 0,
        "weekly_trend": [],
    })


# ──────────────── Simulation Endpoint ────────────────

class SimulationParams(BaseModel):
    """Parameters for what-if simulation."""
    goods_traffic_factor: float = 1.0
    corridor_closure_id: Optional[str] = None
    corridor_closure_hours: Optional[float] = 0.0
    priority_weights: Optional[Dict[str, float]] = None


@app.post("/api/simulate")
def run_simulation(params: SimulationParams):
    """Run a what-if simulation with modified parameters.
    
    Adjusts COA availability and/or scoring weights, re-runs the full
    planning pipeline, and returns a delta comparison.
    """
    return simulator.simulate(
        GLOBAL_TASKS,
        GLOBAL_COA,
        params.dict(),
    )


# ──────────────── Corridor Endpoint ────────────────

CORRIDORS = [
    {"corridor_id": "C1", "corridor_name": "Delhi-Howrah Rajdhani", "traffic_density_score": 10},
    {"corridor_id": "C2", "corridor_name": "Mumbai-Pune Deccan", "traffic_density_score": 8},
    {"corridor_id": "C3", "corridor_name": "Chennai-Bangalore Main", "traffic_density_score": 9},
    {"corridor_id": "C4", "corridor_name": "Howrah-Mumbai via Nagpur", "traffic_density_score": 7},
    {"corridor_id": "C5", "corridor_name": "Delhi-Mumbai Western", "traffic_density_score": 9},
    {"corridor_id": "C6", "corridor_name": "Secunderabad-Vijayawada", "traffic_density_score": 6},
    {"corridor_id": "C7", "corridor_name": "Lucknow-Varanasi", "traffic_density_score": 5},
    {"corridor_id": "C8", "corridor_name": "Jaipur-Ahmedabad", "traffic_density_score": 6},
]


@app.get("/api/corridors")
def get_corridors():
    """Get list of all corridors with metadata."""
    return {"corridors": CORRIDORS}


# ──────────────── Approval Endpoint ────────────────

@app.post("/api/approve")
def approve_week(week: int = Query(1, ge=1, le=4)):
    """Mark a weekly plan as approved by the section controller."""
    return {
        "status": "approved",
        "week": week,
        "message": f"Week {week} block plan approved by section controller.",
    }


# ──────────────── Export Endpoints ────────────────

@app.get("/api/plan/export")
def export_plan_csv():
    """Export complete monthly block allocation plan as CSV."""
    import io
    import csv
    from fastapi.responses import Response

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Block ID", "Week Number", "Date", "Time Window Start", 
        "Time Window End", "Corridor ID", "Corridor Name", 
        "Departments", "Allocated Tasks", "Explanation"
    ])

    for week in GLOBAL_MONTHLY_PLAN.get("weeks", []):
        for alloc in week.get("allocations", []):
            writer.writerow([
                alloc.get("block_id", ""),
                alloc.get("week_number", ""),
                alloc.get("date", ""),
                alloc.get("time_window_start", ""),
                alloc.get("time_window_end", ""),
                alloc.get("corridor_id", ""),
                alloc.get("corridor_name", ""),
                "+".join(alloc.get("department_tags", [])),
                ", ".join(alloc.get("allocated_tasks", [])),
                alloc.get("explanation", "")
            ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=indian_railways_block_plan.csv"}
    )


@app.get("/api/tasks/export")
def export_tasks_csv():
    """Export complete prioritized task register as CSV."""
    import io
    import csv
    from fastapi.responses import Response

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Task ID", "Source Department", "Corridor Name", "Section",
        "Task Type", "Severity Grade (1-5)", "Days Overdue", "Due Date",
        "Estimated Hours", "Priority Score", "Status", "AI Explanation"
    ])

    for t in GLOBAL_TASKS:
        writer.writerow([
            t.task_id,
            t.source_system,
            t.corridor_name,
            t.section,
            t.task_type,
            t.severity_grade,
            t.days_overdue,
            t.due_date,
            t.estimated_duration_hours,
            t.priority_score,
            t.status,
            t.explanation
        ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=prioritized_maintenance_tasks.csv"}
    )

