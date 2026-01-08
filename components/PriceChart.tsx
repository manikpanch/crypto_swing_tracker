
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceDot 
} from 'recharts';
import { PricePoint, MovementEvent, MovementType } from '../types';

interface PriceChartProps {
  data: PricePoint[];
  movements: MovementEvent[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl ring-1 ring-slate-800">
        <p className="text-slate-500 text-[10px] mb-1 font-black uppercase tracking-widest">{label}</p>
        <p className="text-white text-lg font-black">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const PriceChart: React.FC<PriceChartProps> = ({ data, movements }) => {
  // Format data for X-Axis labels (monthly)
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleString('default', { month: 'short' });
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
      >
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#1e293b" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatXAxis} 
          stroke="#475569" 
          fontSize={10}
          fontWeight="bold"
          minTickGap={60}
          interval="preserveStart"
        />
        <YAxis 
          stroke="#475569" 
          fontSize={10} 
          fontWeight="bold"
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          domain={['auto', 'auto']}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="price" 
          stroke="#6366f1" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorPrice)" 
          dot={false}
          activeDot={{ r: 6, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={true}
        />
        
        {/* Completion points */}
        {movements.map((move, index) => (
          <ReferenceDot
            key={`move-${index}`}
            x={move.endDate}
            y={move.endPrice}
            r={6}
            fill={move.type === MovementType.UP ? "#10b981" : "#f43f5e"}
            stroke="#020617"
            strokeWidth={2}
          />
        ))}

        {/* Start point */}
        {movements.length > 0 && (
          <ReferenceDot
            x={movements[0].startDate}
            y={movements[0].startPrice}
            r={5}
            fill="#94a3b8"
            stroke="#020617"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default PriceChart;
