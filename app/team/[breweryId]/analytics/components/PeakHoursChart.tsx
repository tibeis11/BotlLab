'use client';

import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface PeakHoursChartProps {
  data: Record<string, number>;
}

export default function PeakHoursChart({ data }: PeakHoursChartProps) {
  const chartData = useMemo(() => {
    // Ensure all 24 hours are present
    return Array.from({ length: 24 }).map((_, i) => {
      const hourStr = i.toString();
      const count = data[hourStr] || 0;
      return {
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`,
        scans: count,
        period: getPeriod(i) // Helper to get period name
      };
    });
  }, [data]);

  const maxScans = Math.max(...chartData.map(d => d.scans), 0);

  function getPeriod(hour: number) {
    if (hour >= 5 && hour < 12) return 'Morgen';
    if (hour >= 12 && hour < 17) return 'Nachmittag';
    if (hour >= 17 && hour < 22) return 'Abend/Prime';
    return 'Nacht';
  }

  // Calculate most active period
  const activePeriod = useMemo(() => {
     if (maxScans === 0) return null;
     const periodCounts: Record<string, number> = {};
     chartData.forEach(d => {
       periodCounts[d.period] = (periodCounts[d.period] || 0) + d.scans;
     });
     return Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0];
  }, [chartData, maxScans]);

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-text-muted text-[10px] font-black uppercase tracking-widest">Aktivität nach Uhrzeit</h3>
            {activePeriod && (
                <p className="text-text-muted text-xs mt-1">
                    Hauptzeit: <span className="text-cyan-400 font-medium">{activePeriod[0]}</span> ({activePeriod[1]} Scans)
                </p>
            )}
        </div>
      </div>
      
      <div className="h-[250px] w-full">
         {maxScans === 0 ? (
            <div className="flex items-center justify-center h-full text-text-disabled text-sm italic">
                Noch keine Zeitdaten
            </div>
         ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                    dataKey="hour" 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val % 3 === 0 ? `${val}` : ''} // Show every 3rd hour label
                />
                <YAxis 
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                />
                <Tooltip 
                    cursor={{ fill: 'var(--surface)', opacity: 0.5 }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="bg-surface-hover border border-border p-2 rounded-xl shadow-xl">
                                    <div className="text-center">
                                        <p className="text-text-primary font-bold text-lg">{data.label}</p>
                                        <p className="text-cyan-400 text-sm font-medium">{data.scans} Scans</p>
                                        <p className="text-text-muted text-[10px] uppercase mt-1 tracking-wide">{data.period}</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar dataKey="scans" radius={[2, 2, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={entry.scans === maxScans && maxScans > 0 ? '#22d3ee' : '#1e3a8a'} 
                            fillOpacity={entry.scans === maxScans ? 1 : 0.6}
                        />
                    ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
         )}
      </div>
    </div>
  );
}
