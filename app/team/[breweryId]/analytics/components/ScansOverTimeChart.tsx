'use client';

import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';

interface ScansOverTimeChartProps {
  data: Record<string, { scans: number; unique: number }>;
}

export default function ScansOverTimeChart({ data }: ScansOverTimeChartProps) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, values]) => ({
        date,
        formattedDate: formatDate(new Date(date), 'dd. MMM', { locale: de }),
        fullDate: formatDate(new Date(date), 'dd. MMMM yyyy', { locale: de }),
        scans: values.scans,
        unique: values.unique
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        Keine Daten für diesen Zeitraum verfügbar
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg p-6 border border-zinc-800">
      <div className="mb-6">
        <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Scans & Besucher Trend</h3>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
                      <p className="text-zinc-300 text-xs mb-2 font-medium">{payload[0].payload.fullDate}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                          <span className="text-zinc-400">Total Scans:</span>
                          <span className="text-white font-mono font-medium">{payload[0].value}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                          <span className="text-zinc-400">Unique Visitors:</span>
                          <span className="text-white font-mono font-medium">{payload[1].value}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
               wrapperStyle={{ paddingTop: '20px' }}
               iconType="circle"
               formatter={(value) => <span className="text-zinc-400 text-xs font-medium ml-1">{value}</span>}
            />
            <Area 
              type="monotone" 
              dataKey="scans" 
              name="Total Scans"
              stroke="#06b6d4" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorScans)" 
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area 
              type="monotone" 
              dataKey="unique" 
              name="Unique Visitors"
              stroke="#8b5cf6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorUnique)" 
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
