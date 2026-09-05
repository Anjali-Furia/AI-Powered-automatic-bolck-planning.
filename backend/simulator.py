"""
What-If Simulator for the AI Block Planning System.

Allows section controllers to simulate changes to operating conditions
and see how the block plan re-optimizes:
  - Goods traffic factor: Scale goods train density (0.5x - 2.0x)
  - Corridor closure: Temporarily close a corridor for extra hours
  - Priority weight overrides: Adjust scoring weights to test sensitivity

Returns a delta comparison: original plan vs simulated plan.
"""
import copy
from typing import List, Dict, Any, Optional
from models import MaintenanceTask
from scoring import score_all_tasks
from conflict_resolver import resolve_all_conflicts
from optimizer import allocate_monthly


def _adjust_coa_for_traffic(
    coa_data: List[dict],
    goods_traffic_factor: float
) -> List[dict]:
    """Adjust COA availability based on goods traffic factor.
    
    Higher goods traffic → more occupied slots → fewer available block windows.
    Factor > 1.0: reduces available hours (more goods trains)
    Factor < 1.0: increases available hours (fewer goods trains)
    """
    adjusted = []
    for slot in coa_data:
        new_slot = copy.deepcopy(slot)
        
        # Adjust available hours inversely with goods traffic
        reduction_factor = 1.0 / goods_traffic_factor  # More traffic → less availability
        reduction_factor = max(0.3, min(1.5, reduction_factor))  # Clamp to reasonable range
        
        new_slot["total_block_hours_available"] = round(
            slot.get("total_block_hours_available", 0) * reduction_factor, 1
        )
        
        # Adjust time windows
        new_windows = []
        for window in new_slot.get("time_windows", []):
            if window.get("window_type") == "available":
                new_window = copy.deepcopy(window)
                try:
                    start_h = int(window["start"].split(":")[0])
                    end_h = int(window["end"].split(":")[0])
                    original_hours = end_h - start_h
                    new_hours = max(1, int(original_hours * reduction_factor))
                    new_end_h = start_h + new_hours
                    new_window["end"] = f"{new_end_h:02d}:00"
                except (ValueError, KeyError):
                    pass
                new_windows.append(new_window)
            else:
                new_windows.append(copy.deepcopy(window))
        new_slot["time_windows"] = new_windows
        
        adjusted.append(new_slot)
    
    return adjusted


def _adjust_coa_for_closure(
    coa_data: List[dict],
    corridor_id: str,
    extra_hours: float
) -> List[dict]:
    """Remove availability from a specific corridor to simulate closure.
    
    Reduces available block hours on the specified corridor by extra_hours per day.
    """
    adjusted = []
    for slot in coa_data:
        new_slot = copy.deepcopy(slot)
        
        if slot.get("corridor_id") == corridor_id:
            # Reduce available hours
            new_slot["total_block_hours_available"] = max(
                0, slot.get("total_block_hours_available", 0) - (extra_hours / 7)  # spread across week
            )
            
            # Remove some available windows
            new_windows = []
            hours_removed = 0
            for window in new_slot.get("time_windows", []):
                if window.get("window_type") == "available" and hours_removed < extra_hours / 7:
                    try:
                        start_h = int(window["start"].split(":")[0])
                        end_h = int(window["end"].split(":")[0])
                        window_hours = end_h - start_h
                        if hours_removed + window_hours <= extra_hours / 7 + 1:
                            # Remove this window entirely
                            hours_removed += window_hours
                            continue
                    except (ValueError, KeyError):
                        pass
                new_windows.append(copy.deepcopy(window))
            new_slot["time_windows"] = new_windows
        
        adjusted.append(new_slot)
    
    return adjusted


def simulate(
    tasks: List[MaintenanceTask],
    coa_data: List[dict],
    params: Dict[str, Any]
) -> Dict[str, Any]:
    """Run a what-if simulation with modified parameters.
    
    Args:
        tasks: Original scored maintenance tasks.
        coa_data: Original COA corridor availability data.
        params: Simulation parameters:
            - goods_traffic_factor (float, 0.5-2.0): Scale goods traffic density
            - corridor_closure_id (str): Corridor ID to close
            - corridor_closure_hours (float): Extra hours of closure
            - priority_weight_overrides (dict): Custom scoring weights
    
    Returns:
        Dict with original_plan, simulated_plan, and delta comparison.
    """
    # Step 1: Compute original plan
    original_tasks = copy.deepcopy(tasks)
    original_plan = allocate_monthly(original_tasks, coa_data)
    
    # Step 2: Adjust COA data based on simulation parameters
    adjusted_coa = copy.deepcopy(coa_data)
    
    goods_factor = params.get("goods_traffic_factor", 1.0)
    if goods_factor != 1.0:
        adjusted_coa = _adjust_coa_for_traffic(adjusted_coa, goods_factor)
    
    closure_id = params.get("corridor_closure_id")
    closure_hours = params.get("corridor_closure_hours", 0)
    if closure_id and closure_hours > 0:
        adjusted_coa = _adjust_coa_for_closure(adjusted_coa, closure_id, closure_hours)
    
    # Step 3: Re-score tasks with optional weight overrides
    sim_tasks = copy.deepcopy(tasks)
    # Reset task states
    for t in sim_tasks:
        t.status = "pending"
        t.priority_score = 0
        t.score_breakdown = {}
        t.explanation = ""
    
    custom_weights = params.get("priority_weight_overrides") or params.get("priority_weights")
    score_all_tasks(sim_tasks, adjusted_coa, custom_weights)
    
    # Step 4: Resolve conflicts with adjusted data
    sim_tasks, sim_conflicts = resolve_all_conflicts(sim_tasks, adjusted_coa)
    
    # Step 5: Run optimizer with adjusted data
    simulated_plan = allocate_monthly(sim_tasks, adjusted_coa)
    
    # Step 6: Compute delta
    orig_allocated = original_plan.get("monthly_stats", {}).get("total_allocated", 0)
    sim_allocated = simulated_plan.get("monthly_stats", {}).get("total_allocated", 0)
    
    orig_kpi = original_plan.get("stats", {}).get("asset_availability_pct", 0)
    sim_kpi = simulated_plan.get("stats", {}).get("asset_availability_pct", 0)
    
    tasks_displaced = max(0, orig_allocated - sim_allocated)
    kpi_change = round(sim_kpi - orig_kpi, 1)
    
    # Find displaced task IDs
    orig_task_ids = set()
    for week in original_plan.get("weeks", []):
        for alloc in week.get("allocations", []):
            if isinstance(alloc, dict):
                orig_task_ids.update(alloc.get("allocated_tasks", []))
    
    sim_task_ids = set()
    for week in simulated_plan.get("weeks", []):
        for alloc in week.get("allocations", []):
            if isinstance(alloc, dict):
                sim_task_ids.update(alloc.get("allocated_tasks", []))
    
    displaced_ids = list(orig_task_ids - sim_task_ids)
    
    # Generate summary
    summary_parts = []
    if goods_factor != 1.0:
        direction = "increase" if goods_factor > 1.0 else "decrease"
        pct = abs(round((goods_factor - 1.0) * 100))
        summary_parts.append(f"A {pct}% {direction} in goods traffic")
    if closure_id and closure_hours > 0:
        corridor_name = closure_id
        for slot in coa_data:
            if slot.get("corridor_id") == closure_id:
                corridor_name = slot.get("corridor_name", closure_id)
                break
        summary_parts.append(f"closure of {corridor_name} for {closure_hours} extra hours")
    
    if summary_parts:
        summary = " and ".join(summary_parts) + f" would displace {tasks_displaced} tasks, "
        summary += f"{'reducing' if kpi_change < 0 else 'improving'} asset availability by {abs(kpi_change)}%."
        if displaced_ids:
            summary += f" Affected tasks: {', '.join(displaced_ids[:5])}"
            if len(displaced_ids) > 5:
                summary += f" and {len(displaced_ids) - 5} more."
    else:
        summary = "No changes applied — simulation matches current plan."
    
    return {
        "original_plan": {
            "monthly_stats": original_plan.get("monthly_stats", {}),
            "stats": original_plan.get("stats", {}),
        },
        "simulated_plan": {
            "monthly_stats": simulated_plan.get("monthly_stats", {}),
            "stats": simulated_plan.get("stats", {}),
            "weeks": simulated_plan.get("weeks", []),
        },
        "delta": {
            "tasks_displaced": tasks_displaced,
            "new_conflicts": len(sim_conflicts),
            "kpi_change": kpi_change,
            "displaced_tasks": displaced_ids[:20],
            "summary": summary,
        },
    }
