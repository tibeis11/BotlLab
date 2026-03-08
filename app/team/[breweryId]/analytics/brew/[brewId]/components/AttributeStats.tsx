'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DistributionData } from "@/lib/rating-analytics";

const ATTRIBUTES = [
  { key: "bitterness", label: "Bitterkeit" },
  { key: "sweetness", label: "Süße" },
  { key: "body", label: "Körper" },
  { key: "carbonation", label: "Kohlensäure" },
  { key: "acidity", label: "Säure" },
];

export default function AttributeStats({ data }: { data: DistributionData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ATTRIBUTES.map(attr => {
        const counts = data[attr.key]; 
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) return null;
        
        const chartData = Array.from({ length: 10 }, (_, i) => ({
             val: i + 1,
             count: counts[i + 1] || 0
        }));

        const maxCount = Math.max(...chartData.map(d => d.count));

        return (
          <div key={attr.key} className="bg-surface border border-border p-4 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-text-secondary">{attr.label}</h4>
                <span className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border-hover">{total} Votes</span>
            </div>
            
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip 
                        cursor={{ fill: 'var(--border)' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-surface-hover text-[10px] text-text-primary px-2 py-1 rounded border border-border-hover shadow-md">
                                        Note {payload[0].payload.val}: <b>{payload[0].value}</b> Bewertungen
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                       {chartData.map((entry, index) => (
                           <Cell 
                                key={`cell-${index}`} 
                                fill={entry.count === maxCount ? '#06b6d4' : 'var(--border-hover)'} // Highlight mode
                           />
                       ))}
                    </Bar>
                    <XAxis dataKey="val" hide />
                 </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Axis Labels */}
            <div className="flex justify-between mt-1 text-[9px] text-text-disabled font-mono px-0.5">
                <span>1</span>
                <span>5</span>
                <span>10</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
