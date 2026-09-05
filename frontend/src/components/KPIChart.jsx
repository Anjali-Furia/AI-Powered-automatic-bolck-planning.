import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const KPIChart = ({ data }) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="manual_availability" name="Manual Baseline" stroke="#9ca3af" fill="#f3f4f6" strokeDasharray="5 5" />
          <Area type="monotone" dataKey="ai_availability" name="AI-Planned" stroke="#1a237e" fill="#e8eaf6" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KPIChart;
