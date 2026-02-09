'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { TimelineDataPoint } from "@/lib/rating-analytics";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function TasteEvolutionChart({ data }: { data: TimelineDataPoint[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
        <span className="text-2xl mb-2 grayscale opacity-50">📉</span>
        <p>Nicht genügend Zeitdaten.</p>
        <p className="text-xs mt-1 text-zinc-600">Mindestens 2 Monate mit Bewertungen benötigt.</p>
      </div>
    );
  }

  const chartData = data.map(point => ({
    ...point,
    formattedDate: format(new Date(point.date), 'MMM yy', { locale: de }),
    fullDate: format(new Date(point.date), 'MMMM yyyy', { locale: de }),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="formattedDate" 
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 10]} 
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
                      <p className="text-zinc-300 text-xs mb-2 font-medium">{payload[0].payload.fullDate}</p>
                      {payload.map((entry: any) => (
                        <div key={entry.name} className="flex items-center gap-2 text-xs mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }}></div>
                          <span className="text-zinc-400 w-16">{entry.name}:</span>
                          <span className="text-white font-mono font-medium">{entry.value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
          
          <Line type="monotone" dataKey="bitterness" name="Bitter" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} />
          <Line type="monotone" dataKey="sweetness" name="Süß" stroke="#d946ef" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} />
          <Line type="monotone" dataKey="body" name="Körper" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
