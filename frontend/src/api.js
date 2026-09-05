import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api'
});

export const fetchTasks = async () => {
  try {
    const res = await api.get('/tasks');
    return res.data;
  } catch (error) {
    console.error("Error fetching tasks", error);
    return { tasks: [] };
  }
};

export const fetchConflicts = async () => {
  try {
    const res = await api.get('/conflicts');
    return res.data;
  } catch (error) {
    console.error("Error fetching conflicts", error);
    return { conflicts: [], total_conflicts: 0, resolved_count: 0 };
  }
};

export const fetchWeeklyPlan = async (week = 1) => {
  try {
    const res = await api.get(`/plan/weekly?week=${week}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching weekly plan", error);
    return { allocations: [], backlog: [], stats: { total_allocated: 0, total_backlog: 0, utilization_pct: 0 } };
  }
};

export const fetchMonthlyPlan = async () => {
  try {
    const res = await api.get('/plan/monthly');
    return res.data;
  } catch (error) {
    console.error("Error fetching monthly plan", error);
    return { weeks: [], monthly_stats: {}, backlog_trend: [] };
  }
};

export const fetchKPI = async () => {
  try {
    const res = await api.get('/kpi');
    return res.data;
  } catch (error) {
    console.error("Error fetching KPI", error);
    return { asset_availability_pct: 0, manual_baseline_pct: 0, tasks_scheduled_pct: 0, conflicts_resolved_pct: 0, avg_priority_score: 0, weekly_trend: [] };
  }
};

export const runSimulation = async (params) => {
  try {
    const res = await api.post('/simulate', params);
    return res.data;
  } catch (error) {
    console.error("Error running simulation", error);
    return null;
  }
};

export const fetchCorridors = async () => {
  try {
    const res = await api.get('/corridors');
    return res.data;
  } catch (error) {
    console.error("Error fetching corridors", error);
    return { corridors: [] };
  }
};
