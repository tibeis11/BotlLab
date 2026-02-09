'use client';

import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { TasteProfile } from "@/lib/rating-analytics";

const ATTRIBUTES = [
  { key: "bitterness", label: "Bitter", fullLabel: "Bitterkeit" },
  { key: "sweetness", label: "Süß", fullLabel: "Süße" },
  { key: "body", label: "Körper", fullLabel: "Körper" },
  { key: "carbonation", label: "Kohlensäure", fullLabel: "Kohlensäure" },
  { key: "acidity", label: "Säure", fullLabel: "Säure" },
];

export default function TasteProfileRadar({ profile }: { profile: TasteProfile }) {
  const data = ATTRIBUTES.map(attr => ({
    subject: attr.label,
    fullLabel: attr.fullLabel,
    value: profile[attr.key as keyof TasteProfile] as number,
    fullMark: 10,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#27272a" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="Profil"
            dataKey="value"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="#06b6d4"
            fillOpacity={0.3}
          />
          <Tooltip 
             content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-xl">
                      <p className="text-zinc-400 text-xs mb-1">{data.fullLabel}</p>
                      <p className="text-cyan-400 font-bold font-mono text-lg">{data.value.toFixed(1)} <span className="text-zinc-600 text-xs font-normal">/ 10</span></p>
                    </div>
                  );
                }
                return null;
              }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
