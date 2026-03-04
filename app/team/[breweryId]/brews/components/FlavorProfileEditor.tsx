'use client';

import { useState, useCallback } from 'react';
import {
  FLAVOR_DIMENSIONS,
  EMPTY_FLAVOR_PROFILE,
  type FlavorProfile,
  type FlavorDimensionId,
} from '@/lib/flavor-profile-config';
import { Sparkles, Trash2, Loader2, Database, Bot, Pencil, RefreshCw } from 'lucide-react';
import {
  getStyleBasedSuggestion,
  type RecipeDataForAnalysis,
} from '@/lib/actions/flavor-profile-actions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FlavorProfileEditorProps {
  value: FlavorProfile | null;
  onChange: (profile: FlavorProfile | null) => void;
  brewStyle?: string | null;
  /** Show a compact inline version (for summary display) */
  compact?: boolean;
  /** Recipe data for BotlGuide analysis (Stufe B) */
  brewData?: RecipeDataForAnalysis | null;
  /** Brew ID to exclude from Stufe A aggregation */
  brewId?: string;
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
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${dimension.color.replace('text-', 'bg-')}`} />
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
  brewData,
  brewId,
}: FlavorProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(!!value);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionExplanation, setSuggestionExplanation] = useState<string | null>(null);

  const handleEnable = () => {
    const initial = { ...EMPTY_FLAVOR_PROFILE };
    onChange(initial);
    setIsEditing(true);
    setSuggestionExplanation(null);
  };

  const handleClear = () => {
    onChange(null);
    setIsEditing(false);
    setSuggestionExplanation(null);
    setSuggestionError(null);
  };

  const handleSliderChange = (dimId: FlavorDimensionId, val: number) => {
    if (!value) return;
    // When user manually adjusts a suggested profile, change source to manual
    const newSource = value.source === 'manual' ? 'manual' : 'manual';
    onChange({ ...value, [dimId]: val, source: newSource });
  };

  // ── Smart Suggestion: Stufe A → Stufe B Fallback ──────────────────────
  const handleSuggest = useCallback(async () => {
    setIsSuggesting(true);
    setSuggestionError(null);
    setSuggestionExplanation(null);

    try {
      // Stufe A: Data suggestion from similar brews
      if (brewStyle) {
        const dataResult = await getStyleBasedSuggestion(brewStyle, brewId);
        if (dataResult.success) {
          onChange(dataResult.profile);
          setIsEditing(true);
          setSuggestionExplanation(dataResult.explanation);
          setIsSuggesting(false);
          return;
        }
      }

      // Stufe B: BotlGuide LLM analysis
      const recipePayload: RecipeDataForAnalysis = {
        ...brewData,
        style: brewStyle || brewData?.style,
      };

      const hasRecipeData = recipePayload.style || recipePayload.malts || recipePayload.hops ||
        recipePayload.abv || recipePayload.ibu || recipePayload.yeast;

      if (!hasRecipeData) {
        setSuggestionError('Zu wenig Daten: Hinterlege mindestens Bierstil, Zutaten oder Kennwerte für einen Vorschlag.');
        setIsSuggesting(false);
        return;
      }

      const response = await fetch('/api/botlguide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: 'sommelier.flavor_profile', data: recipePayload }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 402) {
          setSuggestionError('AI-Credit-Limit erreicht. Upgrade für mehr BotlGuide Sommelier-Analysen.');
        } else {
          setSuggestionError(err.error || 'BotlGuide Sommelier-Analyse fehlgeschlagen.');
        }
        setIsSuggesting(false);
        return;
      }

      const result = await response.json();
      // New gateway wraps structured data under result.data
      const profileData = result.data ?? result;

      if (profileData.profile) {
        const clamp = (v: unknown) => {
          const n = typeof v === 'number' ? v : parseFloat(String(v));
          return isNaN(n) ? 0.5 : Math.max(0, Math.min(1, n));
        };

        const profile: FlavorProfile = {
          sweetness: clamp(profileData.profile.sweetness),
          bitterness: clamp(profileData.profile.bitterness),
          body: clamp(profileData.profile.body),
          roast: clamp(profileData.profile.roast),
          fruitiness: clamp(profileData.profile.fruitiness),
          source: 'botlguide',
        };

        onChange(profile);
        setIsEditing(true);
        setSuggestionExplanation(profileData.explanation || 'BotlGuide Sommelier hat dein Rezept analysiert.');
      } else {
        setSuggestionError('BotlGuide Sommelier konnte kein Profil generieren.');
      }
    } catch (err: any) {
      console.error('[FlavorProfileEditor] suggest error:', err);
      setSuggestionError('Fehler beim Generieren des Vorschlags.');
    } finally {
      setIsSuggesting(false);
    }
  }, [brewStyle, brewId, brewData, onChange]);

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

        {/* Smart Suggestion + Manual buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-60"
          >
            {isSuggesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysiere...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                Profil vorschlagen
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={isSuggesting}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition border border-zinc-700 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Manuell anlegen
          </button>
        </div>

        <p className="text-[10px] text-zinc-600 mt-4 max-w-sm mx-auto">
          &quot;Profil vorschlagen&quot; analysiert vorhandene Daten ähnlicher Biere oder nutzt BotlGuide
          um ein Geschmacksprofil aus deinem Rezept abzuleiten. Du kannst es danach frei anpassen.
        </p>

        {/* Error message */}
        {suggestionError && (
          <div className="mt-4 bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-3 text-sm text-red-400 max-w-md mx-auto">
            {suggestionError}
          </div>
        )}
      </div>
    );
  }

  // ── Active editor ─────────────────────────────────────────────────────
  const sourceLabel = value?.source === 'data_suggestion'
    ? { icon: <Database className="w-3 h-3" />, text: 'Daten-Vorschlag', cls: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30' }
    : value?.source === 'botlguide'
    ? { icon: <Bot className="w-3 h-3" />, text: 'BotlGuide', cls: 'bg-purple-950/40 text-purple-400 border-purple-800/30' }
    : { icon: <Pencil className="w-3 h-3" />, text: 'Manuell', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Geschmacksprofil
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${sourceLabel.cls}`}>
              {sourceLabel.icon} {sourceLabel.text}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Definiere, wie dein Bier schmecken <em>soll</em>. Trinker treten mit ihrem Gaumen dagegen an.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isSuggesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-800/30 rounded-lg transition disabled:opacity-50"
          >
            {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Neu vorschlagen
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-800/30 rounded-lg transition"
          >
            <Trash2 className="w-3 h-3" />
            Entfernen
          </button>
        </div>
      </div>

      {/* Suggestion explanation banner */}
      {suggestionExplanation && (
        <div className="bg-purple-950/20 border border-purple-800/20 rounded-xl px-4 py-3 text-xs text-purple-300">
          <Bot className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          {suggestionExplanation}
        </div>
      )}

      {/* Suggestion error */}
      {suggestionError && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {suggestionError}
        </div>
      )}

      {/* Live preview card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-44 h-44 flex-shrink-0">
          <MiniRadarPreview profile={value} />
        </div>
        <div className="flex-1 w-full">
          <div className="grid grid-cols-5 gap-2 mb-3">
            {FLAVOR_DIMENSIONS.map((dim) => (
              <div key={dim.id} className="flex flex-col items-center gap-1.5 text-center">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dim.color.replace('text-', 'bg-')}`} />
                <span className={`text-sm font-black font-mono ${dim.color}`}>
                  {Math.round((value[dim.id] ?? 0.5) * 100)}%
                </span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-wide leading-tight">
                  {dim.labelShort}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sliders — 2-column grid so bars stay short and practical */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {FLAVOR_DIMENSIONS.map((dim) => (
          <FlavorSlider
            key={dim.id}
            dimension={dim}
            value={value[dim.id] ?? 0.5}
            onChange={(val) => handleSliderChange(dim.id, val)}
          />
        ))}
      </div>
    </div>
  );
}
