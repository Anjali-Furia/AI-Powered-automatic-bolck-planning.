# 🚂 RailBlock AI — Smart Block Planning System

### SIH Problem Statement: Maximize Asset Availability for Train Operations on Indian Railways

> An AI-powered system that automates maintenance block planning across three railway departments, resolving scheduling conflicts and maximizing asset availability through explainable priority scoring and intelligent corridor allocation.

---

## 🎯 Problem

Indian Railways maintenance involves three siloed departments that independently request track blocks (maintenance windows):

| Department | System | Responsibility |
|---|---|---|
| **Engineering** | TMS (Track Management System) | Track defects, rail fractures, gauge issues |
| **Signal & Telecom** | SMMS (Signal Maintenance & Management System) | Signals, point machines, track circuits |
| **Traction Distribution** | TDMS (Traction Distribution Management System) | OHE, transformers, cables, insulators |

Currently, a section controller manually cross-references three spreadsheets against train timetables (COA) to create block schedules — a slow, error-prone process that leads to:
- Conflicting block requests on the same corridor
- Delayed safety-critical maintenance
- Poor asset availability and train disruptions

## 💡 Solution

**RailBlock AI** automates this entire workflow:

1. **Unified Ingestion** — Pulls maintenance requests from all 3 departments into a single normalized schema
2. **Explainable Priority Scoring** — Ranks every task using a transparent composite score:
   - `Score = 0.35 × Safety Risk + 0.25 × Urgency + 0.25 × Consequence of Failure + 0.15 × Traffic Density Impact`
   - Plain-English explanations: *"Track defect #TMS-042 outranks Signal PM #SMMS-015 because it is 12 days overdue on a Grade-A safety category on the high-density Delhi-Howrah corridor"*
3. **Multi-Department Conflict Resolution** — Detects overlapping requests and either merges compatible activities or reschedules with minimal disruption
4. **Greedy Block Allocation** — Fills available corridor windows by priority, respecting daily block-hour budgets
5. **Two-Horizon Planning** — Weekly tactical plans + monthly strategic rollup with automatic backlog carry-forward ("never lose a defect")
6. **What-If Simulation** — Interactive sliders to model traffic changes and corridor closures with live re-optimization

## 🏗️ Architecture

```
Data Layer (simulated TMS/SMMS/TDMS/COA)
         │
    Ingestion & Normalization
         │
    Priority Scoring Engine (weighted, explainable)
         │
    Corridor Conflict Resolver (merge / reschedule / split)
         │
    Greedy Block Optimizer (weekly + monthly)
         │
    Dashboard (React — calendar, KPIs, what-if simulator)
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI, Pydantic |
| Data | Simulated JSON datasets (generated via Faker) |
| Optimizer | Greedy priority-fill algorithm |
| Frontend | React (Vite), Tailwind CSS, Recharts |
| AI/ML Split | Rule-based scoring + optimization (transparent, explainable) |

> **Note on AI/ML**: The priority scoring uses a transparent weighted formula — not a black-box ML model — because explainability is critical for railway safety decisions. The "AI" value is in the *automated arbitration* across departments and the *optimization* of block allocation, not in opaque predictions.

## 📊 Simulated Data

Since real TMS/SMMS/TDMS/COA system access is unavailable for prototyping, we generate realistic synthetic data:

| Dataset | Records | Mimics |
|---|---|---|
| `tms_defects.json` | ~100 | Track Management System |
| `smms_tasks.json` | ~80 | Signal Maintenance & Management System |
| `tdms_tasks.json` | ~60 | Traction Distribution Management System |
| `coa_corridor_availability.json` | ~200+ | Control Office Application |

Data covers **8 corridors** across 4 weeks with realistic severity distributions and ~15–20% conflict density.

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
python generate_data.py        # Generate synthetic datasets
uvicorn app:app --reload       # Start API server on :8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # Start dev server on :5173
```

Open **http://localhost:5173** in your browser.

## 📁 Project Structure

```
PS27/
├── backend/
│   ├── data/                  # Generated synthetic datasets
│   ├── generate_data.py       # Data generator
│   ├── models.py              # Pydantic schemas
│   ├── ingestion.py           # Data loading & normalization
│   ├── scoring.py             # Priority scoring engine
│   ├── conflict_resolver.py   # Conflict detection & resolution
│   ├── optimizer.py           # Greedy block allocator
│   ├── simulator.py           # What-if simulation
│   ├── app.py                 # FastAPI server
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── api.js             # API client
│   │   ├── App.jsx            # Main app shell
│   │   └── main.jsx           # Entry point
│   ├── package.json
│   └── index.html
└── README.md
```

## 👥 Team

Built for Smart India Hackathon 2024

---

*Simulated data based on realistic Indian Railways maintenance data structures. No live system integration.*
