import React, { useEffect, useState } from 'react';
import { fetchKPI, fetchTasks, fetchConflicts } from '../api';
import KPIChart from './KPIChart';
import { CheckCircle, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

const Dashboard = () => {
  const [kpi, setKpi] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [conflicts, setConflicts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [kpiData, taskData, conflictData] = await Promise.all([
        fetchKPI(),
        fetchTasks(),
        fetchConflicts()
      ]);
      setKpi(kpiData);
      setTasks(taskData.tasks || []);
      setConflicts(conflictData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a237e]"></div></div>;
  if (!kpi) return <div className="text-center text-red-500">Failed to load API data</div>;

  const topTasks = [...tasks].sort((a, b) => b.priority_score - a.priority_score).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-[#1a237e]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 truncate">Asset Availability</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{(kpi.asset_availability_pct || 0).toFixed(1)}%</p>
            </div>
            <Activity className="h-8 w-8 text-[#1a237e]" />
          </div>
          <div className="mt-2 text-sm">
            <span className="text-green-600 font-medium">↑ +{(kpi.asset_availability_pct - (kpi.manual_baseline_pct || 0)).toFixed(1)}%</span>
            <span className="text-gray-500 ml-2">vs manual</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-[#f57c00]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 truncate">Tasks Scheduled</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{kpi.tasks_scheduled_pct || 0}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-[#f57c00]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 truncate">Conflicts Resolved</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{kpi.conflicts_resolved_pct || 0}%</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {conflicts?.resolved_count || 0} / {conflicts?.total_conflicts || 0} resolved
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 truncate">Avg Priority Score</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{(kpi.avg_priority_score || 0).toFixed(1)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Availability Trend (Weekly)</h3>
        <KPIChart data={kpi.weekly_trend || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tasks */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Top Priority Pending Tasks</h3>
          </div>
          <ul className="divide-y divide-gray-200 p-0 m-0 list-none">
            {topTasks.map(task => (
              <li key={task.task_id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1a237e]">{task.task_id} - {task.task_type}</p>
                    <p className="text-sm text-gray-500">{task.corridor_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Score: {(task.priority_score || 0).toFixed(1)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{task.source_system}</p>
                  </div>
                </div>
              </li>
            ))}
            {topTasks.length === 0 && <li className="p-4 text-gray-500 text-center">No tasks found.</li>}
          </ul>
        </div>

        {/* Conflicts Summary */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Conflict Resolutions</h3>
          </div>
          <ul className="divide-y divide-gray-200 p-0 m-0 list-none">
            {(conflicts?.conflicts || []).slice(0, 5).map(c => (
              <li key={c.conflict_id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.corridor_name} ({c.date})</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.competing_tasks?.map(t => t.task_id).join(' vs ')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    c.resolution_type === 'merged' ? 'bg-purple-100 text-purple-800' :
                    c.resolution_type === 'rescheduled' ? 'bg-amber-100 text-amber-800' :
                    'bg-teal-100 text-teal-800'
                  }`}>
                    {c.resolution_type}
                  </span>
                </div>
              </li>
            ))}
            {(!conflicts?.conflicts || conflicts.conflicts.length === 0) && <li className="p-4 text-gray-500 text-center">No conflicts found.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
