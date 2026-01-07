
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
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl">
        <p className="text-slate-400 text-xs mb-1 font-semibold">{label}</p>
        <p className="text-white text-lg font-bold">
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
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatXAxis} 
          stroke="#475569" 
          fontSize={12}
          minTickGap={30}
        />
        <YAxis 
          stroke="#475569" 
          fontSize={12} 
          tickFormatter={(value) => `$${value / 1000}k`}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="price" 
          stroke="#6366f1" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorPrice)" 
          dot={false}
          isAnimationActive={true}
        />
        
        {/* Draw dots for movement completion events */}
        {movements.map((move, index) => (
          <ReferenceDot
            key={`move-${index}`}
            x={move.endDate}
            y={move.endPrice}
            r={5}
            fill={move.type === MovementType.UP ? "#10b981" : "#f43f5e"}
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* Draw dots for starting reference points */}
        {movements.length > 0 && (
          <ReferenceDot
            x={movements[0].startDate}
            y={movements[0].startPrice}
            r={5}
            fill="#94a3b8"
            stroke="white"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default PriceChart;
