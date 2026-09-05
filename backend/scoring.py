"""
Priority Scoring Engine for the AI Block Planning System.

Computes a composite priority score for each maintenance task using a 
weighted formula across four dimensions:
  Score = w1 × SafetyRisk + w2 × Urgency + w3 × ConsequenceOfFailure + w4 × TrafficDensityImpact

Each task receives a human-readable explanation justifying its rank.
"""
from typing import List, Dict, Optional
from datetime import datetime, date
from models import MaintenanceTask

# Default scoring weights (must sum to 1.0)
SAFETY_WEIGHT = 0.35
URGENCY_WEIGHT = 0.25
COF_WEIGHT = 0.25
TRAFFIC_WEIGHT = 0.15

# Consequence-of-failure lookup by task type
COF_LOOKUP = {
    # TMS defect types — high consequence for structural failures
    "rail_fracture": 95,
    "gauge_deviation": 85,
    "weld_defect": 80,
    "sleeper_damage": 60,
    "ballast_deficiency": 50,
    # SMMS equipment types — signalling failures affect safety
    "signal": 90,
    "point_machine": 88,
    "track_circuit": 85,
    "axle_counter": 75,
    "level_crossing": 92,
    # TDMS task types — traction distribution
    "OHE_inspection": 70,
    "transformer_maintenance": 78,
    "cable_replacement": 72,
    "insulator_cleaning": 45,
}

# Labels for severity grades
SEVERITY_LABELS = {5: "A (Critical)", 4: "B (High)", 3: "C (Medium)", 2: "D (Low)", 1: "E (Minimal)"}


def compute_safety_risk(task: MaintenanceTask) -> float:
    """Compute safety risk score (0-100) from normalized severity grade (1-5)."""
    return (task.severity_grade / 5.0) * 100.0


def compute_urgency(task: MaintenanceTask) -> float:
    """Compute urgency score (0-100) from days overdue and due date proximity."""
    score = 0.0

    # Overdue component: each day overdue adds urgency, capped at 100
    if task.days_overdue > 0:
        score += min(60.0, task.days_overdue * 4.0)  # 15 days overdue → 60

    # Due date proximity component
    if task.due_date:
        try:
            due = datetime.strptime(task.due_date, "%Y-%m-%d").date()
            today = date.today()
            days_until = (due - today).days
            if days_until < 0:
                # Past due
                score += min(40.0, abs(days_until) * 3.0)
            elif days_until <= 3:
                score += 30.0  # Due within 3 days
            elif days_until <= 7:
                score += 15.0  # Due within a week
            elif days_until <= 14:
                score += 5.0   # Due within 2 weeks
        except (ValueError, TypeError):
            pass

    # Add any existing urgency bonus (from backlog carry-forward)
    score += task.urgency_score

    return min(100.0, score)


def compute_consequence_of_failure(task: MaintenanceTask) -> float:
    """Compute consequence-of-failure score (0-100) based on task type.
    
    Uses a domain-expert lookup table that rates the impact of failing
    to perform each type of maintenance activity.
    """
    base_score = COF_LOOKUP.get(task.task_type, 50.0)

    # Amplify consequence for high-severity items
    if task.severity_grade >= 4:
        base_score = min(100.0, base_score * 1.15)

    return min(100.0, base_score)


def compute_traffic_density_impact(task: MaintenanceTask, coa_data: List[dict]) -> float:
    """Compute traffic density impact (0-100) from corridor traffic density.
    
    Higher traffic density means more trains affected by the block,
    but also means the maintenance is more critical to perform.
    """
    # Find the corridor's traffic density score (1-10)
    density = 5  # default mid-range
    for slot in coa_data:
        if slot.get("corridor_id") == task.corridor_id:
            density = slot.get("traffic_density_score", 5)
            break

    return (density / 10.0) * 100.0


def compute_priority_score(
    task: MaintenanceTask,
    coa_data: List[dict],
    weights: Optional[Dict[str, float]] = None
) -> None:
    """Compute composite priority score and store breakdown on the task object.
    
    Args:
        task: The maintenance task to score.
        coa_data: COA corridor availability data for traffic density lookup.
        weights: Optional custom weights dict with keys: safety, urgency, consequence, traffic.
    """
    w_safety = (weights or {}).get("safety", SAFETY_WEIGHT)
    w_urgency = (weights or {}).get("urgency", URGENCY_WEIGHT)
    w_cof = (weights or {}).get("consequence", COF_WEIGHT)
    w_traffic = (weights or {}).get("traffic", TRAFFIC_WEIGHT)

    safety = compute_safety_risk(task)
    urgency = compute_urgency(task)
    cof = compute_consequence_of_failure(task)
    traffic = compute_traffic_density_impact(task, coa_data)

    score = (safety * w_safety + urgency * w_urgency + cof * w_cof + traffic * w_traffic)

    task.priority_score = round(min(100.0, score), 1)
    task.score_breakdown = {
        "safety_risk": round(safety, 1),
        "urgency": round(urgency, 1),
        "consequence_of_failure": round(cof, 1),
        "traffic_density_impact": round(traffic, 1),
    }


def generate_explanation(task: MaintenanceTask, rank: int, all_tasks: List[MaintenanceTask]) -> None:
    """Generate a plain-English explanation for why this task has its rank.
    
    Includes comparative reasoning against adjacent-ranked tasks to make
    the AI's decision-making transparent and auditable.
    """
    severity_label = SEVERITY_LABELS.get(task.severity_grade, "Unknown")
    source_names = {"TMS": "Track Engineering", "SMMS": "Signal & Telecom", "TDMS": "Traction Distribution"}
    source_name = source_names.get(task.source_system, task.source_system)

    # Base explanation
    parts = [
        f"#{rank} - {task.task_type.replace('_', ' ').title()} "
        f"[{task.task_id}] on {task.corridor_name} corridor."
    ]

    # Dominant scoring factor
    breakdown = task.score_breakdown
    factors = [
        ("safety_risk", "safety risk", f"Grade-{severity_label} severity"),
        ("urgency", "urgency", f"{task.days_overdue} days overdue" if task.days_overdue > 0 else "approaching due date"),
        ("consequence_of_failure", "consequence of failure", f"high-impact {task.task_type.replace('_', ' ')}"),
        ("traffic_density_impact", "traffic density", f"high-density corridor"),
    ]
    dominant = max(factors, key=lambda f: breakdown.get(f[0], 0))
    parts.append(f"Primary driver: {dominant[1]} ({dominant[2]}).")

    # Comparative explanation against the next-ranked task
    if rank < len(all_tasks):
        next_task = all_tasks[rank]  # 0-indexed, rank is 1-indexed, so all_tasks[rank] is rank+1
        if task.priority_score > next_task.priority_score:
            diff = round(task.priority_score - next_task.priority_score, 1)
            # Find what makes this task rank higher
            reasons = []
            if breakdown.get("safety_risk", 0) > next_task.score_breakdown.get("safety_risk", 0):
                reasons.append(f"higher safety risk (Grade-{severity_label})")
            if breakdown.get("urgency", 0) > next_task.score_breakdown.get("urgency", 0):
                reasons.append(f"greater urgency ({task.days_overdue} days overdue)")
            if breakdown.get("consequence_of_failure", 0) > next_task.score_breakdown.get("consequence_of_failure", 0):
                reasons.append(f"higher failure consequence")
            if breakdown.get("traffic_density_impact", 0) > next_task.score_breakdown.get("traffic_density_impact", 0):
                reasons.append(f"higher traffic density impact")

            if reasons:
                reason_text = " and ".join(reasons[:2])
                parts.append(
                    f"Outranks {next_task.task_id} (score: {next_task.priority_score}) "
                    f"by {diff} points due to {reason_text}."
                )

    # Department context
    parts.append(f"Department: {source_name}. Score: {task.priority_score}/100.")

    task.explanation = " ".join(parts)


def score_all_tasks(
    tasks: List[MaintenanceTask],
    coa_data: List[dict],
    weights: Optional[Dict[str, float]] = None
) -> List[MaintenanceTask]:
    """Score all tasks, sort by priority, and generate explanations.
    
    Args:
        tasks: List of unified maintenance tasks.
        coa_data: COA corridor availability data.
        weights: Optional custom scoring weights.
    
    Returns:
        Tasks sorted by priority_score descending, each with score_breakdown and explanation.
    """
    # Step 1: Compute raw scores
    for task in tasks:
        compute_priority_score(task, coa_data, weights)

    # Step 2: Sort by priority score descending
    tasks.sort(key=lambda t: t.priority_score, reverse=True)

    # Step 3: Generate explanations with rank context
    for rank_idx, task in enumerate(tasks):
        generate_explanation(task, rank_idx + 1, tasks)

    return tasks
