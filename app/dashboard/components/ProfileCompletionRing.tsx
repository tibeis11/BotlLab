'use client';

import React from 'react';

interface ProfileCompletionRingProps {
  completed: number; // number of completed fields
  total: number;     // total number of fields
  size?: number;     // pixel size of the ring
  label?: string;
  pendingLabels?: string[]; // names of remaining fields to encourage completion
}

export default function ProfileCompletionRing({
  completed,
  total,
  size = 96,
  label = 'Profil vollständig',
  pendingLabels = [],
}: ProfileCompletionRingProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const angle = Math.min(100, Math.max(0, pct)) * 3.6; // 0-360deg

  const ringStyle: React.CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `conic-gradient(rgb(34 197 94) ${angle}deg, rgb(39 39 42) ${angle}deg 360deg)`,
  };

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: size, height: size }}>
          <div className="rounded-full" style={ringStyle} />
          <div
            className="absolute inset-0 m-2 rounded-full bg-zinc-950 flex items-center justify-center text-sm font-bold text-white"
            style={{ inset: 8 }}
          >
            {pct}%
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white mb-1">{label}</div>
          <div className="text-xs text-zinc-400 mb-2">
            {completed} von {total} Angaben ausgefüllt
          </div>
          {pendingLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingLabels.map((p) => (
                <span key={p} className="text-[11px] px-2 py-1 rounded-full border border-zinc-700 text-zinc-300">
                  Fehlt: {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
