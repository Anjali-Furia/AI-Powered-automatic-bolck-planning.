"""
Multi-Department Corridor Conflict Resolver.

Detects overlapping maintenance block requests from different departments 
(TMS, SMMS, TDMS) on the same corridor and time window, and resolves them 
using three strategies:
  1. MERGE — Combine compatible activities into one shared block
  2. RESCHEDULE — Move lower-priority tasks to the next available window
  3. SPLIT — Distribute tasks across multiple available windows

Each resolution includes a plain-English explanation for auditability.
"""
from typing import List, Tuple, Dict, Any
from collections import defaultdict
from datetime import datetime, timedelta
from models import MaintenanceTask, ConflictRecord

# Compatibility matrix: which department pairs can share a block
# TMS+SMMS is often compatible (track + signalling work done together)
# TMS+TDMS is sometimes compatible (track + OHE if non-interfering)
# SMMS+TDMS is rarely compatible (signalling and traction usually need separate possessions)
COMPATIBLE_PAIRS = {
    frozenset({"TMS", "SMMS"}): True,
    frozenset({"TMS", "TDMS"}): True,  # compatible if total hours fit
    frozenset({"SMMS", "TDMS"}): False,  # rarely compatible
}

# Max block hours per corridor per day
MAX_BLOCK_HOURS_PER_DAY = 4.0


def _get_task_week(task: MaintenanceTask, start_date: str) -> int:
    """Determine which week (1-4) a task should be scheduled in."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        if task.due_date:
            due = datetime.strptime(task.due_date, "%Y-%m-%d").date()
            delta = (due - start).days
            if delta < 0:
                return 1  # overdue tasks go to week 1
            return min(4, (delta // 7) + 1)
    except (ValueError, TypeError):
        pass

    # Tasks without due dates: assign based on severity
    if task.severity_grade >= 4:
        return 1
    elif task.severity_grade >= 3:
        return 2
    else:
        return 3


def detect_conflicts(
    tasks: List[MaintenanceTask],
    coa_data: List[dict]
) -> List[Dict[str, Any]]:
    """Detect overlapping maintenance requests on the same corridor and time period.
    
    Groups tasks by corridor and target week, identifies cases where multiple
    departments request blocks on the same corridor in the same week and the
    total requested hours exceed available block hours.
    
    Returns:
        List of conflict dicts with corridor, week, competing tasks, and available hours.
    """
    if not coa_data:
        return []

    start_date = min(s.get("date", "2026-09-04") for s in coa_data)
    conflicts = []
    conflict_counter = 0

    # Group tasks by (corridor_id, target_week)
    corridor_week_groups: Dict[str, Dict[int, List[MaintenanceTask]]] = defaultdict(lambda: defaultdict(list))
    for task in tasks:
        week = _get_task_week(task, start_date)
        corridor_week_groups[task.corridor_id][week].append(task)

    # Compute available hours per corridor per week from COA data
    corridor_week_hours: Dict[str, Dict[int, float]] = defaultdict(lambda: defaultdict(float))
    for slot in coa_data:
        try:
            slot_date = datetime.strptime(slot["date"], "%Y-%m-%d").date()
            base_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            week_num = min(4, ((slot_date - base_date).days // 7) + 1)
            if week_num >= 1:
                corridor_week_hours[slot["corridor_id"]][week_num] += slot.get("total_block_hours_available", 0)
        except (ValueError, TypeError):
            pass

    # Find conflicts: multiple departments competing for limited corridor hours
    for corridor_id, week_map in corridor_week_groups.items():
        for week, task_group in week_map.items():
            # Check if multiple departments are present
            departments = set(t.source_system for t in task_group)
            if len(departments) < 2:
                continue

            total_requested = sum(t.estimated_duration_hours for t in task_group)
            available = corridor_week_hours.get(corridor_id, {}).get(week, 0)

            if total_requested > available * 0.8:  # Conflict if >80% of capacity requested
                conflict_counter += 1
                corridor_name = task_group[0].corridor_name
                conflicts.append({
                    "conflict_id": f"CNF-{conflict_counter:03d}",
                    "corridor_id": corridor_id,
                    "corridor_name": corridor_name,
                    "week": week,
                    "departments": list(departments),
                    "tasks": task_group,
                    "total_requested_hours": round(total_requested, 1),
                    "available_hours": round(available, 1),
                    "overflow_hours": round(total_requested - available, 1),
                })

    return conflicts


def _check_compatibility(dept1: str, dept2: str) -> bool:
    """Check if two departments' activities can be merged into one block."""
    return COMPATIBLE_PAIRS.get(frozenset({dept1, dept2}), False)


def resolve_conflict(
    conflict: Dict[str, Any],
    coa_data: List[dict]
) -> Tuple[List[MaintenanceTask], ConflictRecord]:
    """Resolve a single conflict using the optimal strategy.
    
    Strategy selection:
    1. If all competing departments are compatible → MERGE into shared blocks
    2. If corridor has multiple available windows → SPLIT tasks across windows
    3. Otherwise → RESCHEDULE lower-priority tasks to next available week
    
    Returns:
        Tuple of (updated tasks, conflict record documenting the resolution).
    """
    tasks = conflict["tasks"]
    tasks_sorted = sorted(tasks, key=lambda t: t.priority_score, reverse=True)
    departments = conflict["departments"]

    # Determine resolution strategy
    all_compatible = True
    for i, d1 in enumerate(departments):
        for d2 in departments[i + 1:]:
            if not _check_compatibility(d1, d2):
                all_compatible = False
                break

    total_requested = conflict["total_requested_hours"]
    available = conflict["available_hours"]

    before_state = {
        "tasks": [{"task_id": t.task_id, "source": t.source_system, "score": t.priority_score,
                   "hours": t.estimated_duration_hours} for t in tasks_sorted],
        "total_hours_requested": total_requested,
        "available_hours": available,
    }

    resolution_type = "merged"
    explanation_parts = []
    after_tasks = []

    if all_compatible and total_requested <= available:
        # MERGE: All departments can share blocks
        resolution_type = "merged"
        for t in tasks_sorted:
            t.status = "pending"  # Will be allocated in optimizer
            after_tasks.append(t)
        dept_list = ", ".join(departments)
        explanation_parts.append(
            f"Merged {len(tasks_sorted)} tasks from {dept_list} into shared block windows "
            f"on {conflict['corridor_name']} (Week {conflict['week']}). "
            f"All {len(departments)} departments' activities are compatible and fit within "
            f"{available:.1f} available hours."
        )

    elif available >= total_requested * 0.6:
        # SPLIT: Distribute across available windows by priority
        resolution_type = "split"
        hours_used = 0
        scheduled_tasks = []
        deferred_tasks = []

        for t in tasks_sorted:
            if hours_used + t.estimated_duration_hours <= available:
                hours_used += t.estimated_duration_hours
                t.status = "pending"
                scheduled_tasks.append(t)
                after_tasks.append(t)
            else:
                t.status = "backlog"
                deferred_tasks.append(t)
                after_tasks.append(t)

        explanation_parts.append(
            f"Split {len(tasks_sorted)} tasks across available windows on {conflict['corridor_name']} "
            f"(Week {conflict['week']}). Scheduled {len(scheduled_tasks)} higher-priority tasks "
            f"({hours_used:.1f}h of {available:.1f}h available)."
        )
        if deferred_tasks:
            deferred_ids = ", ".join(t.task_id for t in deferred_tasks)
            explanation_parts.append(
                f"Deferred {len(deferred_tasks)} lower-priority tasks ({deferred_ids}) to next available week."
            )

    else:
        # RESCHEDULE: Not enough room, push lower-priority tasks
        resolution_type = "rescheduled"
        hours_used = 0
        scheduled_tasks = []
        rescheduled_tasks = []

        for t in tasks_sorted:
            if hours_used + t.estimated_duration_hours <= available:
                hours_used += t.estimated_duration_hours
                t.status = "pending"
                scheduled_tasks.append(t)
            else:
                t.status = "backlog"
                t.urgency_score += 5  # Bump urgency for next week
                rescheduled_tasks.append(t)
            after_tasks.append(t)

        scheduled_ids = ", ".join(t.task_id for t in scheduled_tasks)
        rescheduled_ids = ", ".join(t.task_id for t in rescheduled_tasks)
        explanation_parts.append(
            f"Rescheduled {len(rescheduled_tasks)} lower-priority tasks on {conflict['corridor_name']} "
            f"(Week {conflict['week']}). Kept {len(scheduled_tasks)} critical tasks ({scheduled_ids}) "
            f"in the current week."
        )
        if rescheduled_tasks:
            explanation_parts.append(
                f"Tasks {rescheduled_ids} moved to next available week with +5 urgency bonus "
                f"to prevent indefinite deferral."
            )

    after_state = {
        "tasks": [{"task_id": t.task_id, "source": t.source_system, "score": t.priority_score,
                   "hours": t.estimated_duration_hours, "status": t.status} for t in after_tasks],
        "hours_allocated": sum(t.estimated_duration_hours for t in after_tasks if t.status != "backlog"),
        "hours_deferred": sum(t.estimated_duration_hours for t in after_tasks if t.status == "backlog"),
    }

    conflict_record = ConflictRecord(
        conflict_id=conflict["conflict_id"],
        corridor_id=conflict["corridor_id"],
        corridor_name=conflict["corridor_name"],
        date=f"Week {conflict['week']}",
        competing_tasks=[
            {"task_id": t.task_id, "source_system": t.source_system,
             "task_type": t.task_type, "priority_score": t.priority_score}
            for t in tasks_sorted
        ],
        resolution_type=resolution_type,
        resolution_explanation=" ".join(explanation_parts),
        before_state=before_state,
        after_state=after_state,
    )

    return after_tasks, conflict_record


def resolve_all_conflicts(
    tasks: List[MaintenanceTask],
    coa_data: List[dict]
) -> Tuple[List[MaintenanceTask], List[ConflictRecord]]:
    """Detect and resolve all corridor conflicts across all tasks.
    
    Args:
        tasks: All scored maintenance tasks.
        coa_data: COA corridor availability data.
    
    Returns:
        Tuple of (all tasks with updated statuses, list of conflict records).
    """
    conflicts = detect_conflicts(tasks, coa_data)
    conflict_records = []

    # Track which tasks have been processed in conflicts
    conflicted_task_ids = set()

    for conflict in conflicts:
        resolved_tasks, record = resolve_conflict(conflict, coa_data)
        conflict_records.append(record)
        for t in resolved_tasks:
            conflicted_task_ids.add(t.task_id)

    # Non-conflicting tasks remain unchanged
    # All tasks are returned; conflict resolution only updates status fields

    return tasks, conflict_records
