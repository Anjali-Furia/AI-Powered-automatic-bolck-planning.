import React, { useState } from 'react';

const ExplanationTooltip = ({ children, task }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block w-full h-full flex items-center justify-center" 
         onMouseEnter={() => setShow(true)} 
         onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-10 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-xl text-left">
          <h4 className="font-bold text-sm text-[#1a237e] mb-1">{task.task_id || task.block_id || 'Details'}</h4>
          <p className="text-xs text-gray-600 mb-2">{task.description || task.explanation || 'No description available'}</p>
          
          {task.score_breakdown && (
            <div className="space-y-1 mt-2 border-t pt-2">
              <div className="flex justify-between text-[10px]"><span>Safety</span><span>{task.score_breakdown.safety_risk || 0}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-1"><div className="bg-red-500 h-1 rounded-full" style={{width: `${(task.score_breakdown.safety_risk || 0)*10}%`}}></div></div>
              
              <div className="flex justify-between text-[10px]"><span>Urgency</span><span>{task.score_breakdown.urgency || 0}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-1"><div className="bg-orange-500 h-1 rounded-full" style={{width: `${(task.score_breakdown.urgency || 0)*10}%`}}></div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExplanationTooltip;
