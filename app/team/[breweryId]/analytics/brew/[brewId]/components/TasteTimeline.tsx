"use client";

import { TimelineDataPoint } from "@/lib/rating-analytics";

export default function TasteTimeline({
  data,
}: {
  data: TimelineDataPoint[];
}) {
  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-500 text-sm h-64 border border-dashed border-zinc-800 rounded-xl">
        <span className="text-2xl mb-2">📉</span>
        <p>Nicht genügend Daten für eine Zeitachse.</p>
        <p className="text-xs mt-1">Es werden Ratings aus mindestens 2 verschiedenen Monaten benötigt.</p>
      </div>
    );
  }

  // --- SVG Dimensions ---
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // --- Attributes config ---
  const lines = [
    { key: "bitterness", color: "#f59e0b", label: "Bitter" },     // Amber-500
    { key: "sweetness", color: "#ec4899", label: "Süß" },        // Pink-500 
    { key: "body", color: "#3b82f6", label: "Körper" },          // Blue-500
    // Optional: add others if needed, but 3 is cleaner. 
    // Let's add all 5 but make them toggleable in future? For now, render top 3 or all.
    // Let's render "Bitterness", "Sweetness", "Body" as primary.
  ];

  // --- Scales ---
  // Y: 0 to 10
  const getY = (val: number) => padding.top + chartHeight - (val / 10) * chartHeight;
  
  // X: Equally spaced points
  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px] relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid Lines (Y-Axis) - 0, 2.5, 5, 7.5, 10 */}
          {[0, 2.5, 5, 7.5, 10].map((val) => {
             const y = getY(val);
             return (
               <g key={val}>
                 <line 
                    x1={padding.left} y1={y} 
                    x2={width - padding.right} y2={y} 
                    stroke="#27272a" strokeDasharray="4 4" 
                 />
                 <text 
                    x={padding.left - 10} y={y + 4} 
                    fill="#52525b" textAnchor="end" fontSize="10"
                 >
                    {val}
                 </text>
               </g>
             );
          })}

          {/* Lines */}
          {lines.map(line => {
             const points = data.map((d, i) => {
                 // @ts-ignore
                 const val = d[line.key];
                 if (typeof val !== 'number') return null;
                 return `${getX(i)},${getY(val)}`;
             }).filter(Boolean).join(" ");
             
             if (!points) return null;

             return (
                <polyline 
                   key={line.key}
                   points={points}
                   fill="none"
                   stroke={line.color}
                   strokeWidth="3"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   className="drop-shadow-md"
                />
             );
          })}

          {/* Data Points */}
          {lines.map(line => (
             data.map((d, i) => {
                 // @ts-ignore
                 const val = d[line.key];
                 if (typeof val !== 'number') return null;
                 return (
                    <circle 
                       key={`${line.key}-${i}`}
                       cx={getX(i)}
                       cy={getY(val)}
                       r="4"
                       fill="#18181b" // zinc-950
                       stroke={line.color}
                       strokeWidth="2"
                    />
                 );
             })
          ))}

          {/* X Axis Labels */}
          {data.map((d, i) => (
             <text 
               key={d.date}
               x={getX(i)} 
               y={height - 10} 
               fill="#a1a1aa" 
               fontSize="10" 
               textAnchor="middle"
             >
                {d.date}
             </text>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
             {lines.map(line => (
                 <div key={line.key} className="flex items-center gap-2">
                     <span className="w-3 h-1 rounded-full" style={{ backgroundColor: line.color }}></span>
                     <span className="text-sm font-medium text-zinc-400">{line.label}</span>
                 </div>
             ))}
        </div>
      </div>
    </div>
  );
}
