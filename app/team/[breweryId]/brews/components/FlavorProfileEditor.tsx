'use client';

import { useState } from 'react';
import {
  FLAVOR_DIMENSIONS,
  EMPTY_FLAVOR_PROFILE,
  type FlavorProfile,
  type FlavorDimensionId,
} from '@/lib/flavor-profile-config';
import { Sparkles, Trash2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FlavorProfileEditorProps {
  value: FlavorProfile | null;
  onChange: (profile: FlavorProfile | null) => void;
  brewStyle?: string | null;
  /** Show a compact inline version (for summary display) */
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// FlavorSlider (single dimension)
// ─────────────────────────────────────────────────────────────────────────────

function FlavorSlider({
  dimension,
  value,
  onChange,
}: {
  dimension: (typeof FLAVOR_DIMENSIONS)[number];
  value: number;
  onChange: (val: number) => void;
}) {
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{dimension.icon}</span>
          <span className="text-sm font-bold text-white">{dimension.label}</span>
        </div>
        <span className={`text-sm font-mono font-bold ${dimension.color}`}>
          {percentage}%
        </span>
      </div>
      <p className="text-[11px] text-zinc-500 -mt-1">{dimension.description}</p>
      <div className="relative h-8 flex items-center group">
        {/* Track background */}
        <div className="absolute w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-800 transition-all duration-100 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Native range input */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percentage}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          className="absolute w-full h-8 opacity-0 cursor-pointer z-10"
        />
        {/* Visual thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-cyan-400 border-2 border-zinc-900 shadow-lg pointer-events-none transition-all duration-100 ease-out"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-wide">
        <span>{dimension.minLabel}</span>
        <span>{dimension.maxLabel}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Radar Preview (inline SVG)
// ─────────────────────────────────────────────────────────────────────────────

function MiniRadarPreview({ profile }: { profile: FlavorProfile }) {
  const size = 120;
  const center = size / 2;
  const radius = 45;
  const dims: FlavorDimensionId[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / dims.length - Math.PI / 2;
    const r = radius * value;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Background grid
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      {/* Grid circles */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={dims
            .map((_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            })
            .join(' ')}
          fill="none"
          stroke="rgb(63, 63, 70)"
          strokeWidth={0.5}
        />
      ))}
      {/* Axis lines */}
      {dims.map((_, i) => {
        const p = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgb(63, 63, 70)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={dims
          .map((dim, i) => {
            const p = getPoint(i, profile[dim]);
            return `${p.x},${p.y}`;
          })
          .join(' ')}
        fill="rgba(34, 211, 238, 0.15)"
        stroke="rgb(34, 211, 238)"
        strokeWidth={1.5}
      />
      {/* Data dots */}
      {dims.map((dim, i) => {
        const p = getPoint(i, profile[dim]);
        return (
          <circle key={dim} cx={p.x} cy={p.y} r={2.5} fill="rgb(34, 211, 238)" />
        );
      })}
      {/* Labels */}
      {dims.map((dim, i) => {
        const labelDim = FLAVOR_DIMENSIONS.find((d) => d.id === dim);
        const p = getPoint(i, 1.25);
        return (
          <text
            key={dim}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-zinc-400 text-[8px] font-bold"
          >
            {labelDim?.icon} {labelDim?.labelShort}
          </text>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Editor Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FlavorProfileEditor({
  value,
  onChange,
  brewStyle,
  compact,
}: FlavorProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(!!value);

  const handleEnable = () => {
    const initial = { ...EMPTY_FLAVOR_PROFILE };
    onChange(initial);
    setIsEditing(true);
  };

  const handleClear = () => {
    onChange(null);
    setIsEditing(false);
  };

  const handleSliderChange = (dimId: FlavorDimensionId, val: number) => {
    if (!value) return;
    onChange({ ...value, [dimId]: val });
  };

  // ── Compact display (summary in tab header, etc.) ─────────────────────
  if (compact && value) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-16 h-16">
          <MiniRadarPreview profile={value} />
        </div>
        <div className="text-xs text-zinc-400">
          {FLAVOR_DIMENSIONS.map((d) => (
            <span key={d.id} className="inline-block mr-2">
              {d.icon} {Math.round((value[d.id] ?? 0.5) * 100)}%
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── No profile yet — CTA to enable ────────────────────────────────────
  if (!isEditing || !value) {
    return (
      <div className="bg-zinc-900/50 border border-dashed border-zinc-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-cyan-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-800/30">
          <Sparkles className="w-7 h-7 text-cyan-400" />
        </div>
        <h3 className="text-lg font-black text-white mb-2">Beat the Brewer aktivieren</h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
          Hinterlege dein gewünschtes Geschmacksprofil für dieses Bier. Trinker können dann versuchen,
          dein Profil blind zu treffen — und du erhältst wertvolle &quot;Perceived vs. Intended&quot;-Daten.
        </p>
        {brewStyle && (
          <p className="text-xs text-zinc-500 mb-4">
            Bierstil: <span className="text-white font-bold">{brewStyle}</span>
          </p>
        )}
        <button
          type="button"
          onClick={handleEnable}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition"
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Geschmacksprofil anlegen
        </button>
      </div>
    );
  }

  // ── Active editor ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Geschmacksprofil
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Definiere, wie dein Bier schmecken <em>soll</em>. Trinker treten mit ihrem Gaumen dagegen an.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-800/30 rounded-lg transition"
        >
          <Trash2 className="w-3 h-3" />
          Entfernen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-8">
        {/* Sliders */}
        <div className="space-y-6">
          {FLAVOR_DIMENSIONS.map((dim) => (
            <FlavorSlider
              key={dim.id}
              dimension={dim}
              value={value[dim.id] ?? 0.5}
              onChange={(val) => handleSliderChange(dim.id, val)}
            />
          ))}
        </div>

        {/* Radar Preview */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            Vorschau
          </p>
          <div className="w-full max-w-[200px] aspect-square">
            <MiniRadarPreview profile={value} />
          </div>
          <div className="text-center">
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
              {value.source === 'manual' ? '✏️ Manuell' : value.source === 'data_suggestion' ? '📊 Vorschlag' : '🤖 BotlGuide'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
