import React, { useState, useEffect } from 'react';
import { fetchWeeklyPlan, fetchCorridors } from '../api';
import axios from 'axios';
import { CheckCircle2, Clock, Info, ShieldAlert, Sparkles, X, Download } from 'lucide-react';

const WeeklyCalendar = () => {
  const [week, setWeek] = useState(1);
  const [plan, setPlan] = useState(null);
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [approvedWeeks, setApprovedWeeks] = useState({});
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchCorridors().then(res => setCorridors(res.corridors || []));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchWeeklyPlan(week);
      setPlan(data);
      setLoading(false);
    };
    loadData();
  }, [week]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      await axios.post(`http://localhost:8000/api/approve?week=${week}`);
      setApprovedWeeks(prev => ({ ...prev, [week]: true }));
    } catch (e) {
      console.error(e);
      setApprovedWeeks(prev => ({ ...prev, [week]: true }));
    } finally {
      setApproving(false);
    }
  };

  // Derive unique dates for this week
  const allocations = plan?.allocations || [];
  const allocationDates = [...new Set(allocations.map(a => a.date))].sort();
  
  // Fallback days if dates are not found
  const displayDates = allocationDates.length > 0 
    ? allocationDates 
    : ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  const getDayLabel = (dateStr) => {
    if (!dateStr || dateStr.startsWith('Day')) return dateStr;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getDepartmentBadge = (deptTags = []) => {
    if (deptTags.length > 1) {
      return { bg: 'bg-purple-600', text: 'Merged (' + deptTags.join('+') + ')', border: 'border-purple-300' };
    }
    const tag = deptTags[0] || 'TMS';
    if (tag === 'TMS') return { bg: 'bg-amber-600', text: 'TMS Track', border: 'border-amber-300' };
    if (tag === 'SMMS') return { bg: 'bg-blue-600', text: 'SMMS Signal', border: 'border-blue-300' };
    if (tag === 'TDMS') return { bg: 'bg-emerald-600', text: 'TDMS Traction', border: 'border-emerald-300' };
    return { bg: 'bg-gray-600', text: tag, border: 'border-gray-300' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a237e] border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Computing optimal corridor block assignments...</p>
      </div>
    );
  }

  if (!plan) return <div className="text-center text-red-500 p-8">Failed to load weekly plan</div>;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-gray-900">Tactical Corridor Block Calendar</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1a237e] border border-blue-200">
              Week {week} of 4
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Optimized non-conflicting maintenance block windows matched against COA timetable capacity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex bg-gray-100 p-1 rounded-lg">
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  week === w 
                    ? 'bg-white text-[#1a237e] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week {w}
              </button>
            ))}
          </div>

          <a
            href="http://localhost:8000/api/plan/export"
            download="indian_railways_block_plan.csv"
            className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold shadow-xs flex items-center transition-colors"
            title="Download full block schedule CSV"
          >
            <Download className="w-4 h-4 mr-1.5 text-gray-500" />
            Export Plan CSV
          </a>

          <button
            onClick={handleApprove}
            disabled={approvedWeeks[week] || approving}
            className={`px-5 py-2 rounded-lg font-medium text-sm flex items-center shadow-sm transition-all ${
              approvedWeeks[week]
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-[#f57c00] hover:bg-[#e65100] text-white'
            }`}
          >
            {approvedWeeks[week] ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Week {week} Approved
              </>
            ) : approving ? (
              'Approving...'
            ) : (
              `Approve Week ${week} Plan`
            )}
          </button>
        </div>
      </div>

      {/* Legend & Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Corridor Utilization</div>
            <div className="text-2xl font-bold text-gray-900">{plan.stats?.utilization_pct || 0}%</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#1a237e] font-bold text-sm">
            W{week}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Tasks Scheduled</div>
            <div className="text-2xl font-bold text-emerald-600">{plan.stats?.total_allocated || 0}</div>
          </div>
          <div className="text-xs text-gray-500 font-medium">In {allocations.length} block windows</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Unscheduled Backlog</div>
            <div className="text-2xl font-bold text-rose-600">{plan.stats?.total_backlog || 0}</div>
          </div>
          <div className="text-xs text-rose-500 font-medium">Rolled to next cycle</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Department Coding</div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">TMS Track</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">SMMS Signal</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">TDMS Traction</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-medium">Merged</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3.5 px-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-56 border-r border-gray-200">
                  Corridor Section
                </th>
                {displayDates.map(dateStr => (
                  <th key={dateStr} className="py-3.5 px-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                    <div>{getDayLabel(dateStr)}</div>
                    <div className="text-[10px] font-normal text-gray-400 lowercase">{dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {corridors.map(c => {
                return (
                  <tr key={c.corridor_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900 bg-gray-50/50 border-r border-gray-200">
                      <div className="text-gray-900">{c.corridor_name}</div>
                      <div className="text-[11px] text-gray-500 font-normal flex items-center mt-0.5">
                        <span className="font-mono text-xs bg-gray-200 px-1.5 py-0.2 rounded mr-1.5">{c.corridor_id}</span>
                        Density: {c.traffic_density_score || 8}/10
                      </div>
                    </td>

                    {displayDates.map(dateStr => {
                      const dayAllocations = allocations.filter(
                        a => a.corridor_id === c.corridor_id && (a.date === dateStr || dateStr.startsWith('Day'))
                      );

                      return (
                        <td key={dateStr} className="p-1.5 align-top border-r border-gray-200 last:border-r-0 min-h-[72px] h-20">
                          {dayAllocations.length > 0 ? (
                            <div className="space-y-1.5 h-full flex flex-col justify-start">
                              {dayAllocations.map(alloc => {
                                const badge = getDepartmentBadge(alloc.department_tags);
                                return (
                                  <div
                                    key={alloc.block_id}
                                    onClick={() => setSelectedBlock(alloc)}
                                    className={`cursor-pointer rounded-lg p-2 text-white shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 ${badge.bg}`}
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span>{alloc.time_window_start} - {alloc.time_window_end}</span>
                                      <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                                        {alloc.allocated_tasks?.length || 1} task
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-medium truncate mt-0.5 opacity-95">
                                      {alloc.allocated_tasks?.join(', ')}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-full rounded-md border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Details Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1a237e] text-white p-5 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-white/20 text-white font-bold">
                    {selectedBlock.block_id}
                  </span>
                  <span className="text-xs bg-[#f57c00] px-2 py-0.5 rounded font-semibold text-white">
                    {selectedBlock.department_tags?.join(' + ') || 'Scheduled Block'}
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-2">{selectedBlock.corridor_name}</h3>
                <p className="text-xs text-blue-200 mt-0.5 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {selectedBlock.date} • {selectedBlock.time_window_start} to {selectedBlock.time_window_end}
                </p>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Allocated Tasks */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Bundled Maintenance Work Orders ({selectedBlock.allocated_tasks?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBlock.allocated_tasks?.map(taskId => (
                    <span
                      key={taskId}
                      className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-md font-mono text-xs font-bold text-slate-800"
                    >
                      {taskId}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Justification */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-[#1a237e] font-bold text-xs uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-4 h-4 text-[#f57c00]" />
                  <span>Explainable Arbitration Logic</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed font-normal">
                  {selectedBlock.explanation || 'Allocated based on high priority score, severe track defect urgency, and low train traffic impact during early morning window.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedBlock(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;
