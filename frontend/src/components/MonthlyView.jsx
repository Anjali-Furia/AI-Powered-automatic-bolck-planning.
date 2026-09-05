import React, { useState, useEffect } from 'react';
import { fetchMonthlyPlan, fetchCorridors } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

const MonthlyView = () => {
  const [plan, setPlan] = useState(null);
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [monthlyData, corridorData] = await Promise.all([
        fetchMonthlyPlan(),
        fetchCorridors()
      ]);
      setPlan(monthlyData);
      setCorridors(corridorData.corridors || []);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a237e] border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Aggregating 4-week strategic maintenance rollup...</p>
      </div>
    );
  }

  if (!plan) return <div className="text-center text-red-500 p-8">Failed to load monthly plan</div>;

  const chartData = (plan.weeks || []).map((w) => ({
    week: `Week ${w.week_number}`,
    allocated: w.stats?.total_allocated || 0,
    backlog: w.stats?.total_backlog || 0,
    utilization: w.stats?.utilization_pct || 0
  }));

  // Calculate corridor load per week from actual week allocations
  const getCorridorTaskCount = (weekIndex, corridorId) => {
    const weekData = plan.weeks?.[weekIndex];
    if (!weekData || !weekData.allocations) return 0;
    return weekData.allocations
      .filter(a => a.corridor_id === corridorId)
      .reduce((sum, a) => sum + (a.allocated_tasks?.length || 1), 0);
  };

  return (
    <div className="space-y-6">
      {/* Monthly KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Work Orders</p>
          <p className="text-2xl font-bold text-[#1a237e] mt-1">{plan.monthly_stats?.total_tasks || 0}</p>
          <p className="text-xs text-gray-500 mt-1">3 Departments (TMS+SMMS+TDMS)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Scheduled</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{plan.monthly_stats?.total_allocated || 0}</p>
          <p className="text-xs text-emerald-600 mt-1">Allocated across 4 weeks</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining Backlog</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{plan.monthly_stats?.total_backlog || 0}</p>
          <p className="text-xs text-rose-600 mt-1">Carried to next month</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Plan Coverage</p>
          <p className="text-2xl font-bold text-[#f57c00] mt-1">{plan.monthly_stats?.avg_utilization || 0}%</p>
          <p className="text-xs text-amber-600 mt-1">Capacity utilization</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Carry-Forward Protect</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{plan.monthly_stats?.carry_forward_count || 0}</p>
          <p className="text-xs text-purple-600 mt-1">"Never lose a defect"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap/Grid Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">4-Week Corridor Allocation Load</h3>
              <p className="text-sm text-gray-500">Distribution of allocated maintenance blocks across all 8 major corridors</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>Low</span>
              <div className="flex h-3 w-16 rounded overflow-hidden">
                <div className="bg-blue-100 flex-1"></div>
                <div className="bg-blue-300 flex-1"></div>
                <div className="bg-blue-600 flex-1"></div>
                <div className="bg-[#1a237e] flex-1"></div>
              </div>
              <span>High</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(wIndex => {
              const weekNum = wIndex + 1;
              const weekBacklog = plan.weeks?.[wIndex]?.stats?.total_backlog || 0;
              const weekAllocated = plan.weeks?.[wIndex]?.stats?.total_allocated || 0;

              return (
                <div key={weekNum} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 relative">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                    <span className="text-xs font-bold text-[#1a237e]">Week {weekNum}</span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                      {weekAllocated} tasks
                    </span>
                  </div>

                  <div className="space-y-2">
                    {corridors.map(c => {
                      const count = getCorridorTaskCount(wIndex, c.corridor_id);
                      const intensity = Math.min(100, count * 20);

                      return (
                        <div key={c.corridor_id} className="flex items-center text-xs">
                          <span className="w-8 font-mono text-[11px] text-gray-500">{c.corridor_id}</span>
                          <div className="flex-1 bg-gray-200 h-4 rounded overflow-hidden relative">
                            <div
                              className="h-full bg-[#1a237e] transition-all"
                              style={{ width: `${Math.max(8, intensity)}%`, opacity: count > 0 ? 0.4 + (count * 0.12) : 0.1 }}
                            ></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-800">
                              {count > 0 ? count : 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rollover badge */}
                  {weekNum < 4 && weekBacklog > 0 && (
                    <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 bg-purple-100 text-purple-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-purple-300 z-10 shadow-sm flex items-center">
                      +{weekBacklog} <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Backlog Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Workload Execution Trend</h3>
          <p className="text-sm text-gray-500 mb-4">Allocated vs backlog per weekly planning cycle</p>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="allocated" name="Allocated Tasks" fill="#1a237e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="backlog" name="Rollover Backlog" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyView;
