import json
import random
from datetime import datetime, timedelta
import os

from faker import Faker

fake = Faker()

CORRIDORS = [
    {"id": "C1", "name": "Delhi-Howrah Rajdhani", "density": 10},
    {"id": "C2", "name": "Mumbai-Pune Deccan", "density": 8},
    {"id": "C3", "name": "Chennai-Bangalore Main", "density": 9},
    {"id": "C4", "name": "Howrah-Mumbai via Nagpur", "density": 7},
    {"id": "C5", "name": "Delhi-Mumbai Western", "density": 9},
    {"id": "C6", "name": "Secunderabad-Vijayawada", "density": 6},
    {"id": "C7", "name": "Lucknow-Varanasi", "density": 5},
    {"id": "C8", "name": "Jaipur-Ahmedabad", "density": 6}
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def get_weights():
    # 60% low severity, 25% medium, 10% high, 5% critical
    return [0.60, 0.25, 0.10, 0.05]

def generate_tms():
    tasks = []
    for i in range(100):
        corridor = random.choice(CORRIDORS)
        severity = random.choices(["D", "C", "B", "A"], weights=get_weights())[0]
        t = {
            "defect_id": f"TMS-{i+1:03d}",
            "section": f"Sec-{random.randint(1, 20)}",
            "corridor_id": corridor["id"],
            "corridor_name": corridor["name"],
            "defect_type": random.choice(["rail_fracture", "gauge_deviation", "weld_defect", "sleeper_damage", "ballast_deficiency"]),
            "severity_grade": severity,
            "days_overdue": random.randint(0, 30),
            "last_inspection_date": (datetime.now() - timedelta(days=random.randint(1, 60))).strftime("%Y-%m-%d"),
            "estimated_repair_hours": round(random.uniform(1.0, 4.0), 1),
            "description": fake.sentence()
        }
        tasks.append(t)
    return tasks

def generate_smms():
    tasks = []
    for i in range(80):
        corridor = random.choice(CORRIDORS)
        criticality = random.choices(["low", "medium", "high", "critical"], weights=get_weights())[0]
        due_date = datetime.now() + timedelta(days=random.randint(-10, 20))
        t = {
            "task_id": f"SMMS-{i+1:03d}",
            "equipment_type": random.choice(["signal", "point_machine", "track_circuit", "axle_counter", "level_crossing"]),
            "corridor_id": corridor["id"],
            "corridor_name": corridor["name"],
            "criticality": criticality,
            "due_date": due_date.strftime("%Y-%m-%d"),
            "dependency_flag": random.choice([True, False]),
            "estimated_hours": round(random.uniform(0.5, 3.0), 1),
            "description": fake.sentence()
        }
        tasks.append(t)
    return tasks

def generate_tdms():
    tasks = []
    for i in range(60):
        corridor = random.choice(CORRIDORS)
        risk = random.choices([20, 50, 75, 95], weights=get_weights())[0]
        due_date = datetime.now() + timedelta(days=random.randint(-5, 25))
        t = {
            "task_id": f"TDMS-{i+1:03d}",
            "feeder_section": f"FS-{random.randint(1, 10)}",
            "corridor_id": corridor["id"],
            "corridor_name": corridor["name"],
            "fault_risk_score": min(100, risk + random.randint(-5, 5)),
            "due_date": due_date.strftime("%Y-%m-%d"),
            "task_type": random.choice(["OHE_inspection", "transformer_maintenance", "cable_replacement", "insulator_cleaning"]),
            "estimated_hours": round(random.uniform(1.0, 5.0), 1),
            "description": fake.sentence()
        }
        tasks.append(t)
    return tasks

def generate_coa():
    slots = []
    start_date = datetime.now().date()
    for day in range(28):
        current_date = start_date + timedelta(days=day)
        for corridor in CORRIDORS:
            windows = []
            if random.random() > 0.1:
                windows.append({
                    "start": "01:00",
                    "end": "05:00",
                    "window_type": "available",
                    "train_count": 0
                })
            if random.random() > 0.5:
                windows.append({
                    "start": "11:00",
                    "end": "14:00",
                    "window_type": "available",
                    "train_count": 0
                })
            total_hours = sum([float(w["end"].split(":")[0]) - float(w["start"].split(":")[0]) for w in windows])
            slots.append({
                "corridor_id": corridor["id"],
                "corridor_name": corridor["name"],
                "date": current_date.strftime("%Y-%m-%d"),
                "time_windows": windows,
                "total_block_hours_available": total_hours,
                "traffic_density_score": corridor["density"]
            })
    return slots

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, "tms.json"), "w") as f:
        json.dump(generate_tms(), f, indent=2)
    with open(os.path.join(DATA_DIR, "smms.json"), "w") as f:
        json.dump(generate_smms(), f, indent=2)
    with open(os.path.join(DATA_DIR, "tdms.json"), "w") as f:
        json.dump(generate_tdms(), f, indent=2)
    with open(os.path.join(DATA_DIR, "coa.json"), "w") as f:
        json.dump(generate_coa(), f, indent=2)
    print("Data generation complete.")
