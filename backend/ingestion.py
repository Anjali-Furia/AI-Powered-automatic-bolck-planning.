import json
import os
from typing import List
from models import MaintenanceTask

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def _load_json(filename: str) -> List[dict]:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)

def load_tms_data(): return _load_json("tms.json")
def load_smms_data(): return _load_json("smms.json")
def load_tdms_data(): return _load_json("tdms.json")
def load_coa_data(): return _load_json("coa.json")

def normalize_to_unified_tasks(tms_data, smms_data, tdms_data) -> List[MaintenanceTask]:
    tasks = []
    
    tms_map = {"A": 5, "B": 4, "C": 3, "D": 2}
    for t in tms_data:
        tasks.append(MaintenanceTask(
            task_id=t["defect_id"],
            source_system="TMS",
            corridor_id=t["corridor_id"],
            corridor_name=t["corridor_name"],
            section=t["section"],
            task_type=t["defect_type"],
            description=t["description"],
            severity_grade=tms_map.get(t["severity_grade"], 1),
            days_overdue=t["days_overdue"],
            due_date="",
            estimated_duration_hours=t["estimated_repair_hours"],
        ))
        
    smms_map = {"critical": 5, "high": 4, "medium": 3, "low": 2}
    for s in smms_data:
        tasks.append(MaintenanceTask(
            task_id=s["task_id"],
            source_system="SMMS",
            corridor_id=s["corridor_id"],
            corridor_name=s["corridor_name"],
            section="",
            task_type=s["equipment_type"],
            description=s["description"],
            severity_grade=smms_map.get(s["criticality"], 1),
            days_overdue=0,
            due_date=s["due_date"],
            estimated_duration_hours=s["estimated_hours"],
            dependencies=["dep"] if s["dependency_flag"] else []
        ))
        
    for d in tdms_data:
        tasks.append(MaintenanceTask(
            task_id=d["task_id"],
            source_system="TDMS",
            corridor_id=d["corridor_id"],
            corridor_name=d["corridor_name"],
            section=d["feeder_section"],
            task_type=d["task_type"],
            description=d["description"],
            severity_grade=max(1, min(5, round(d["fault_risk_score"] / 20.0))),
            days_overdue=0,
            due_date=d["due_date"],
            estimated_duration_hours=d["estimated_hours"],
        ))
        
    return tasks

def get_all_tasks() -> List[MaintenanceTask]:
    return normalize_to_unified_tasks(
        load_tms_data(),
        load_smms_data(),
        load_tdms_data()
    )
