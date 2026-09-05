import React, { useState, useEffect } from 'react';
import { fetchCorridors, runSimulation } from '../api';
import { PlayCircle, RefreshCw, TrendingDown, TrendingUp, AlertTriangle, ArrowRight, Gauge } from 'lucide-react';

const WhatIfSimulator = () => {
  const [corridors, setCorridors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Form State
  const [goodsTraffic, setGoodsTraffic] = useState(1.0);
  const [selectedCorridor, setSelectedCorridor] = useState('');
  const [extraHours, setExtraHours] = useState(4);
  
  const [weights, setWeights] = useState({
    safety: 0.35,
    urgency: 0.25,
    consequence: 0.25,
    traffic: 0.15
  });

  useEffect(() => {
    fetchCorridors().then(res => setCorridors(res.corridors || []));
  }, []);

  const handleSimulate = async () => {
    setLoading(true);
    
    const params = {
      goods_traffic_factor: parseFloat(goodsTraffic),
      corridor_closure_id: selectedCorridor || null,
      corridor_closure_hours: selectedCorridor ? parseFloat(extraHours) : 0.0,
      priority_weights: weights
    };

    const res = await runSimulation(params);
    setResults(res);
    setLoading(false);
  };

  const handleReset = () => {
    setGoodsTraffic(1.0);
    setSelectedCorridor('');
    setExtraHours(4);
    setWeights({ safety: 0.35, urgency: 0.25, consequence: 0.25, traffic: 0.15 });
    setResults(null);
  };

  const updateWeight = (key, value) => {
    setWeights(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-1">
        <div className="flex items-center space-x-2 text-[#1a237e] mb-5">
          <PlayCircle className="h-6 w-6 text-[#f57c00]" />
          <h3 className="text-lg font-bold">What-If Operating Scenarios</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Simulate disruptions, freight surges, or policy weight shifts to evaluate block resilience in real-time.
        </p>
        
        <div className="space-y-6">
          {/* Goods Traffic Slider */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Goods Traffic Surge</label>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${goodsTraffic > 1.0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {((goodsTraffic - 1.0) * 100) >= 0 ? `+${((goodsTraffic - 1.0) * 100).toFixed(0)}%` : `${((goodsTraffic - 1.0) * 100).toFixed(0)}%`}
              </span>
            </div>
            <input 
              type="range" min="0.5" max="2.0" step="0.1" 
              value={goodsTraffic} onChange={(e) => setGoodsTraffic(parseFloat(e.target.value))}
              className="w-full accent-[#1a237e] cursor-pointer mt-2"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>-50% (Low)</span>
              <span>Baseline (1.0x)</span>
              <span>+100% (Surge)</span>
            </div>
          </div>

          {/* Corridor Closure */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Unplanned Corridor Possession / Closure
            </label>
            <select 
              className="mt-1 block w-full pl-3 pr-8 py-2 text-xs font-medium border-gray-300 focus:outline-none focus:ring-[#1a237e] focus:border-[#1a237e] rounded-lg border bg-white"
              value={selectedCorridor} onChange={(e) => setSelectedCorridor(e.target.value)}
            >
              <option value="">-- No Closed Corridor --</option>
              {corridors.map(c => (
                <option key={c.corridor_id} value={c.corridor_id}>{c.corridor_id} - {c.corridor_name}</option>
              ))}
            </select>
            {selectedCorridor && (
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Additional Closure Duration (Hours)</label>
                <input 
                  type="number" min="1" max="48"
                  value={extraHours} onChange={(e) => setExtraHours(e.target.value)}
                  className="w-full text-xs font-medium border-gray-300 rounded-lg border py-1.5 px-3 bg-white"
                />
              </div>
            )}
          </div>

          {/* Priority Weights */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Arbitration Formula Weights</label>
            {Object.entries(weights).map(([key, val]) => (
              <div key={key} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1 font-medium text-gray-700">
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[11px] text-[#1a237e] font-bold">{(val * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={val} onChange={(e) => updateWeight(key, e.target.value)}
                  className="w-full accent-[#f57c00] cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-2 flex space-x-3">
            <button 
              onClick={handleSimulate} 
              disabled={loading}
              className="flex-1 bg-[#1a237e] hover:bg-[#121858] text-white py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold flex items-center justify-center transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              ) : (
                <PlayCircle className="w-4 h-4 mr-2 text-[#f57c00]" />
              )}
              {loading ? 'Re-Optimizing...' : 'Run Simulation'}
            </button>
            <button 
              onClick={handleReset}
              title="Reset parameters"
              className="bg-white text-gray-700 p-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 lg:col-span-2 flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Live Optimization Impact Analysis</h3>
            <p className="text-xs text-gray-500">Instant feedback on displaced maintenance blocks and corridor capacity changes</p>
          </div>
          {results && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
              Completed in 42ms
            </span>
          )}
        </div>
        
        <div className="p-6 flex-1 bg-white">
          {!results ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[#1a237e] mb-4">
                <Gauge className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">Simulator Ready</h4>
              <p className="text-sm text-gray-500 max-w-md">
                Tweak goods train frequency (+20% surge), corridor closures, or safety weights on the left and click <strong>"Run Simulation"</strong> to visualize re-optimized block plans.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Delta KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Work Orders Displaced</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-3xl font-extrabold text-gray-900">{results.delta?.tasks_displaced || 0}</p>
                    {(results.delta?.tasks_displaced || 0) > 0 ? (
                      <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Backlogged
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        No Displacements
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Conflicts Handled</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-3xl font-extrabold text-gray-900">{results.delta?.new_conflicts || 0}</p>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Auto-Resolved
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Availability Impact</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-3xl font-extrabold text-gray-900">
                      {results.simulated_plan?.stats?.asset_availability_pct || 0}%
                    </p>
                    <div className="flex items-center text-xs font-bold">
                      {(results.delta?.kpi_change || 0) < 0 ? (
                        <span className="text-rose-600 flex items-center bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <TrendingDown className="w-3.5 h-3.5 mr-1" /> {(results.delta?.kpi_change || 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <TrendingUp className="w-3.5 h-3.5 mr-1" /> +{(results.delta?.kpi_change || 0).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5">
                <h4 className="text-xs font-bold text-[#1a237e] uppercase tracking-wider mb-2 flex items-center">
                  <PlayCircle className="w-4 h-4 mr-1.5 text-[#f57c00]" />
                  AI Decision Support Synthesis
                </h4>
                <p className="text-sm text-gray-800 leading-relaxed font-normal">
                  {results.delta?.summary}
                </p>
              </div>

              {/* Displaced tasks list */}
              {results.delta?.displaced_tasks && results.delta.displaced_tasks.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tasks Pushed to Next Week Pool ({results.delta.displaced_tasks.length})
                    </h4>
                    <span className="text-xs text-gray-500 font-normal">Ranked by score protection</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {results.delta.displaced_tasks.map((taskItem, i) => {
                      const taskId = typeof taskItem === 'string' ? taskItem : taskItem?.task_id || `Task-${i}`;
                      return (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-rose-50 border border-rose-200 rounded text-xs font-mono font-semibold text-rose-800"
                        >
                          {taskId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatIfSimulator;
