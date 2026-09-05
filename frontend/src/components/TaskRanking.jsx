import React, { useState, useEffect } from 'react';
import { fetchTasks } from '../api';
import { Search, ChevronDown, ChevronUp, Download } from 'lucide-react';

const TaskRanking = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchTasks();
      // Sort by priority desc
      const sorted = (data.tasks || []).sort((a, b) => b.priority_score - a.priority_score);
      setTasks(sorted);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a237e]"></div></div>;

  const filteredTasks = tasks.filter(t => {
    if (filterDept !== 'All' && t.source_system !== filterDept) return false;
    if (search && !t.task_id.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getSourceColor = (source) => {
    switch (source) {
      case 'TMS': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'SMMS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TDMS': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'backlog': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col">
      {/* Filter Bar */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-2">
          {['All', 'TMS', 'SMMS', 'TDMS'].map(dept => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterDept === dept ? 'bg-[#1a237e] text-white border-[#1a237e]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {dept}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-[#f57c00] focus:ring-[#f57c00] sm:text-sm border py-2"
            />
          </div>
          <a
            href="http://localhost:8000/api/tasks/export"
            download="prioritized_maintenance_tasks.csv"
            className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold shadow-xs flex items-center transition-colors whitespace-nowrap"
            title="Download full task register CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank / ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corridor / Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority Score</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.map((task, index) => (
              <React.Fragment key={task.task_id}>
                <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setExpandedId(expandedId === task.task_id ? null : task.task_id)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-gray-500 font-bold mr-3">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{task.task_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSourceColor(task.source_system)}`}>
                      {task.source_system}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{task.corridor_name}</div>
                    <div className="text-sm text-gray-500">{task.task_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-gray-900 mr-2">{(task.priority_score || 0).toFixed(1)}</span>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${task.priority_score > 80 ? 'bg-red-500' : task.priority_score > 50 ? 'bg-orange-500' : 'bg-green-500'}`} style={{width: `${task.priority_score || 0}%`}}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.days_overdue > 0 ? <span className="text-red-600 font-medium">{task.days_overdue} days</span> : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {expandedId === task.task_id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </td>
                </tr>
                {expandedId === task.task_id && (
                  <tr className="bg-gray-50">
                    <td colSpan="7" className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-2">Task Details</h4>
                          <p className="text-sm text-gray-700 mb-2">{task.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-4">
                            <div><span className="font-medium">Severity Grade:</span> {task.severity_grade}/5</div>
                            <div><span className="font-medium">Urgency Score:</span> {task.urgency_score}/100</div>
                            <div><span className="font-medium">Due Date:</span> {task.due_date || 'N/A'}</div>
                            <div><span className="font-medium">Est. Duration:</span> {task.estimated_duration_hours}h</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-2">Priority Score Breakdown</h4>
                          <div className="space-y-3">
                            {Object.entries(task.score_breakdown || {}).map(([key, value]) => (
                              <div key={key}>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                  <span>{value}/10</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-[#1a237e] h-1.5 rounded-full" style={{width: `${value * 10}%`}}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100 text-xs text-blue-800">
                            <strong>AI Explanation:</strong> {task.explanation || 'No explanation provided.'}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="text-center p-8 text-gray-500">No tasks found matching your filters.</div>
        )}
      </div>
    </div>
  );
};

export default TaskRanking;
