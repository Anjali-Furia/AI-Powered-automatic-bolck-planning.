import React, { useState, useEffect } from 'react';
import { fetchConflicts } from '../api';
import { AlertCircle, Merge, SplitSquareHorizontal, CalendarClock, ArrowRight, ShieldCheck } from 'lucide-react';

const ConflictPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const res = await fetchConflicts();
      setData(res);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1a237e] border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Scanning multi-department corridor overlap records...</p>
      </div>
    );
  }

  if (!data) return <div className="text-center text-red-500 p-8">Failed to load conflicts</div>;

  const getResolutionIcon = (type) => {
    switch(type) {
      case 'merged': return <Merge className="w-5 h-5 text-purple-600" />;
      case 'split': return <SplitSquareHorizontal className="w-5 h-5 text-teal-600" />;
      case 'rescheduled': return <CalendarClock className="w-5 h-5 text-amber-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getResolutionBadge = (type) => {
    switch(type) {
      case 'merged':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'split':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'rescheduled':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const mergedCount = data.conflicts?.filter(c => c.resolution_type === 'merged').length || 0;
  const rescheduledCount = data.conflicts?.filter(c => c.resolution_type === 'rescheduled').length || 0;
  const splitCount = data.conflicts?.filter(c => c.resolution_type === 'split').length || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900">Multi-Department Conflict Arbitration Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 100% Automated Resolution
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Cross-department possession collisions (TMS vs SMMS vs TDMS) merged or deconflicted with auditable reasoning
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detected Collisions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data.total_conflicts || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">Overlapping corridor requests</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-purple-200 bg-purple-50/20">
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Merged Blocks</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{mergedCount}</p>
          <p className="text-xs text-purple-600 mt-0.5">Compatible teams joint possession</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-amber-200 bg-amber-50/20">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Rescheduled & Protected</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{rescheduledCount}</p>
          <p className="text-xs text-amber-600 mt-0.5">Shifted with +5 urgency bonus</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-teal-200 bg-teal-50/20">
          <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Split Windows</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{splitCount}</p>
          <p className="text-xs text-teal-600 mt-0.5">Distributed into separate slots</p>
        </div>
      </div>

      {/* Conflict List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/60 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">Arbitration Audit Log</h3>
          <span className="text-xs text-gray-500 font-medium">Sorted by corridor and impact</span>
        </div>

        <ul className="divide-y divide-gray-200">
          {(data.conflicts || []).map(conflict => {
            const beforeRequested = conflict.before_state?.total_hours_requested || 0;
            const beforeAvailable = conflict.before_state?.available_hours || 0;
            const afterAllocated = conflict.after_state?.hours_allocated || 0;
            const afterDeferred = conflict.after_state?.hours_deferred || 0;

            return (
              <li key={conflict.conflict_id} className="p-6 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  
                  {/* Left side: Corridor & Competing Tasks */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-mono text-xs font-bold bg-[#1a237e] text-white px-2 py-0.5 rounded">
                        {conflict.conflict_id}
                      </span>
                      <h4 className="text-base font-bold text-gray-900">{conflict.corridor_name}</h4>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {conflict.date}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3">Competing Work Orders on Same Corridor Window:</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {conflict.competing_tasks?.map(task => (
                        <div
                          key={task.task_id}
                          className="inline-flex items-center border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white shadow-xs"
                        >
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            task.source_system === 'TMS' ? 'bg-amber-500' : 
                            task.source_system === 'SMMS' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`}></span>
                          <span className="text-xs font-bold text-gray-900 mr-1.5">{task.task_id}</span>
                          <span className="text-[11px] text-gray-500 mr-2">({task.source_system})</span>
                          <span className="text-[11px] font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.2 rounded">
                            Score: {task.priority_score?.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right side: Resolution Details */}
                  <div className="flex-1 lg:border-l lg:pl-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getResolutionIcon(conflict.resolution_type)}
                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getResolutionBadge(conflict.resolution_type)}`}>
                          {conflict.resolution_type}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">
                        {conflict.competing_tasks?.length || 0} Departments Reconciled
                      </span>
                    </div>

                    <p className="text-sm text-gray-800 leading-relaxed font-normal mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {conflict.resolution_explanation}
                    </p>
                    
                    {/* Before/After Metrics */}
                    <div className="grid grid-cols-2 gap-3 bg-gray-100/70 p-3 rounded-xl">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">Before Arbitration</div>
                        <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-1.5 rounded text-center">
                          {beforeRequested}h Requested vs {beforeAvailable}h Avail (Overlap)
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-gray-500 mb-1">After Resolution</div>
                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-1.5 rounded text-center">
                          {afterAllocated}h Scheduled • {afterDeferred}h Protected
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </li>
            );
          })}
          {(!data.conflicts || data.conflicts.length === 0) && (
            <li className="p-8 text-center text-gray-500">No conflicts to display.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ConflictPanel;
