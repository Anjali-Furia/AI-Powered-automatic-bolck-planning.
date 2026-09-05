import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyView from './components/MonthlyView';
import TaskRanking from './components/TaskRanking';
import ConflictPanel from './components/ConflictPanel';
import WhatIfSimulator from './components/WhatIfSimulator';
import { Train, Calendar, CalendarDays, ListOrdered, AlertTriangle, PlayCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <Dashboard />;
      case 'weekly': return <WeeklyCalendar />;
      case 'monthly': return <MonthlyView />;
      case 'tasks': return <TaskRanking />;
      case 'conflicts': return <ConflictPanel />;
      case 'whatif': return <WhatIfSimulator />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a237e] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Train className="h-8 w-8 text-[#f57c00]" />
          <h1 className="text-2xl font-bold">RailBlock AI</h1>
          <span className="text-sm font-light ml-4 border-l pl-4 border-gray-400">Smart Block Planning System</span>
        </div>
        <div className="text-sm">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button onClick={() => setActiveTab('overview')} className={`flex items-center px-3 py-4 border-b-2 text-sm font-medium ${activeTab === 'overview' ? 'border-[#f57c00] text-[#1a237e]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              Overview
            </button>
            <button onClick={() => setActiveTab('weekly')} className={`flex items-center px-3 py-4 border-b-2 text-sm font-medium ${activeTab === 'weekly' ? 'border-[#f57c00] text-[#1a237e]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Calendar className="mr-2 h-4 w-4" /> Weekly Plan
            </button>
            <button onClick={() => setActiveTab('monthly')} className={`flex items-center px-3 py-4 border-b-2 text-sm font-medium ${activeTab === 'monthly' ? 'border-[#f57c00] text-[#1a237e]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <CalendarDays className="mr-2 h-4 w-4" /> Monthly Plan
            </button>
            <button onClick={() => setActiveTab('tasks')} className={`flex items-center px-3 py-4 border-b-2 text-sm font-medium ${activeTab === 'tasks' ? 'border-[#f57c00] text-[#1a237e]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <ListOrdered className="mr-2 h-4 w-4" /> Task Ranking
            </button>
            <button onClick={() => setActiveTab('conflicts')} className={`flex items-center px-3 py-4 border-b-2 text-sm font-medium ${activeTab === 'conflicts' ? 'border-[#f57c00] text-[#1a237e]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Conflicts
            </button>
            <button onClick={() => setActiveTab('whatif')} className={`flex items-center px-3 py-4 border-b-2 text-sm font-medium ${activeTab === 'whatif' ? 'border-[#f57c00] text-[#1a237e]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <PlayCircle className="mr-2 h-4 w-4" /> What-If Simulator
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-auto">
        {renderTab()}
      </main>
    </div>
  );
}

export default App;
