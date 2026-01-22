"use client";

import { TasteProfile } from "@/lib/rating-analytics";

export default function TasteRadarChart({
  profile,
}: {
  profile: TasteProfile;
}) {
  // Simple SVG-based Radar Chart (Pentagon for 5 dimensions)
  const dimensions = [
    { key: "bitterness", label: "Bitter", angle: 0 },
    { key: "sweetness", label: "Süß", angle: 72 },
    { key: "body", label: "Körper", angle: 144 },
    { key: "carbonation", label: "Kohlensäure", angle: 216 },
    { key: "acidity", label: "Säure", angle: 288 },
  ];

  const size = 300;
  const center = size / 2;
  const maxRadius = size / 2 - 40;

  const getPoint = (value: number, angle: number) => {
    const radius = (value / 10) * maxRadius;
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const dataPoints = dimensions.map((dim) =>
    getPoint(profile[dim.key as keyof TasteProfile] as number, dim.angle),
  );

  const pathData =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto overflow-visible">
        {/* Background Grid (circles for 2, 4, 6, 8, 10) */}
        {[2, 4, 6, 8, 10].map((val) => {
          const r = (val / 10) * maxRadius;
          return (
            <circle
              key={val}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="rgb(39 39 42)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Lines */}
        {dimensions.map((dim) => {
          const end = getPoint(10, dim.angle);
          return (
            <line
              key={dim.key}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="rgb(63 63 70)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon */}
        <path
          d={pathData}
          fill="rgba(6, 182, 212, 0.2)"
          stroke="rgb(6, 182, 212)"
          strokeWidth="2"
        />

        {/* Data Points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="rgb(6, 182, 212)" />
        ))}

        {/* Labels */}
        {dimensions.map((dim) => {
          const labelPos = getPoint(11.5, dim.angle);
          return (
            <text
              key={dim.label}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-bold fill-zinc-400 uppercase tracking-wider"
            >
              {dim.label}
            </text>
          );
        })}
      </svg>

      <div className="text-center text-xs text-zinc-500 mt-2">
        Basierend auf {profile.count} Bewertungen
      </div>
    </div>
  );
}
