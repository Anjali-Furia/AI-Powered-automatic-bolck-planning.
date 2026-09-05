from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import date, time

class TMSDefect(BaseModel):
    defect_id: str
    section: str
    corridor_id: str
    corridor_name: str
    defect_type: str
    severity_grade: str
    days_overdue: int
    last_inspection_date: str
    estimated_repair_hours: float
    description: str

class SMMSTask(BaseModel):
    task_id: str
    equipment_type: str
    corridor_id: str
    corridor_name: str
    criticality: str
    due_date: str
    dependency_flag: bool
    estimated_hours: float
    description: str

class TDMSTask(BaseModel):
    task_id: str
    feeder_section: str
    corridor_id: str
    corridor_name: str
    fault_risk_score: int
    due_date: str
    task_type: str
    estimated_hours: float
    description: str

class TimeWindow(BaseModel):
    start: str
    end: str
    window_type: str
    train_count: int

class COASlot(BaseModel):
    corridor_id: str
    corridor_name: str
    date: str
    time_windows: List[TimeWindow]
    total_block_hours_available: float
    traffic_density_score: int

class MaintenanceTask(BaseModel):
    task_id: str
    source_system: str
    corridor_id: str
    corridor_name: str
    section: str
    task_type: str
    description: str
    severity_grade: int
    urgency_score: float = 0.0
    days_overdue: int
    due_date: str
    estimated_duration_hours: float
    dependencies: List[str] = []
    priority_score: float = 0.0
    score_breakdown: Dict[str, float] = {}
    explanation: str = ""
    status: str = "pending"

class BlockAllocation(BaseModel):
    block_id: str
    corridor_id: str
    corridor_name: str
    date: str
    time_window_start: str
    time_window_end: str
    allocated_tasks: List[str]
    department_tags: List[str]
    explanation: str
    week_number: int

class ConflictRecord(BaseModel):
    conflict_id: str
    corridor_id: str
    corridor_name: str
    date: str
    competing_tasks: List[Dict[str, Any]]
    resolution_type: str
    resolution_explanation: str
    before_state: Dict[str, Any]
    after_state: Dict[str, Any]
