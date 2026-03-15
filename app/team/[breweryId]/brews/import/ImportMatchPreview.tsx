'use client';

import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ProcessedRecipe, MatchedIngredient } from '@/lib/actions/recipe-import';

// match_level codes from match_ingredient RPC:
// 1=Exakt (Produkt), 2=Alias (Master/Alias), 3=Alias-Substring,
// 4=Fuzzy Produkt, 5=Fuzzy Master
const MATCH_LEVEL_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: 'Exakt',  className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  2: { label: 'Alias',  className: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30' },
  3: { label: 'Alias',  className: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30' },
  4: { label: 'Fuzzy',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  5: { label: 'Fuzzy',  className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

const TYPE_FALLBACK: Record<string, string> = {
  malt:  'Unbekanntes Malz',
  hop:   'Unbekannter Hopfen',
  yeast: 'Unbekannte Hefe',
  misc:  'Unbekannte Zutat',
};

interface Props {
  recipe: ProcessedRecipe;
  onConfirm: () => void;
  onCancel: () => void;
}

function IngredientRow({ ing }: { ing: MatchedIngredient }) {
  if (ing.status === 'matched') {
    const cfg = MATCH_LEVEL_CONFIG[ing.match.match_level] ?? MATCH_LEVEL_CONFIG[3];
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50">
        <div className="flex-1 min-w-0">
          <p className="text-zinc-500 text-xs truncate">{ing.raw_name}</p>
          <p className="text-white text-sm font-medium truncate">{ing.match.name}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
      <div className="flex-1 min-w-0">
        <p className="text-amber-200/70 text-sm font-medium truncate">{ing.raw_name}</p>
        <p className="text-zinc-500 text-xs">{TYPE_FALLBACK[ing.type] ?? 'Unbekannte Zutat'}</p>
      </div>
    </div>
  );
}

export default function ImportMatchPreview({ recipe, onConfirm, onCancel }: Props) {
  // Water-Einträge werden grundsätzlich nicht gematcht — aus den Stats herausrechnen
  const ingredients = recipe.ingredients.filter(i => i.type !== 'water');
  const matched = ingredients.filter(i => i.status === 'matched');
  const unmatched = ingredients.filter(i => i.status === 'unmatched');
  const total = ingredients.length;
  const pct = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  const progressColor =
    pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-cyan-500' : 'bg-amber-500';
  const pctColor =
    pct === 100 ? 'text-emerald-400' : pct >= 70 ? 'text-cyan-400' : 'text-amber-400';

  return (
    <div className="space-y-5">

      {/* Zusammenfassungs-Banner */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white font-bold truncate">{recipe.name}</p>
            <p className="text-zinc-400 text-sm mt-0.5">
              <span className="text-white font-bold">{matched.length}</span>
              {' '}von{' '}
              <span className="font-bold">{total}</span>
              {' '}Zutaten erkannt
              {unmatched.length > 0 && (
                <span className="text-zinc-600 ml-1.5">
                  · {unmatched.length} werden generisch importiert
                </span>
              )}
            </p>
          </div>
          <span className={`text-2xl font-black tabular-nums shrink-0 ${pctColor}`}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Zutatenlisten */}
      <div className={`grid grid-cols-1 gap-4 ${unmatched.length > 0 ? 'md:grid-cols-2' : ''}`}>

        {/* Erkannte Zutaten */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-white">Erkannt ({matched.length})</span>
          </div>
          {matched.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/50">
              <p className="text-zinc-500 font-medium text-sm">Keine Zutaten erkannt</p>
              <p className="text-zinc-700 text-xs max-w-xs mx-auto text-center">
                Alle Zutaten werden als generisch importiert. Du kannst sie später in der Admin-Queue verknüpfen.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {matched.map((ing, i) => <IngredientRow key={`${ing.type}-${ing.raw_name}-${i}`} ing={ing} />)}
            </div>
          )}
        </div>

        {/* Nicht erkannte Zutaten */}
        {unmatched.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm font-bold text-white">Nicht erkannt ({unmatched.length})</span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {unmatched.map((ing, i) => <IngredientRow key={`${ing.type}-${ing.raw_name}-${i}`} ing={ing} />)}
            </div>
            <p className="text-amber-500/60 text-xs mt-2.5 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              Nicht erkannte Zutaten landen in der Admin-Queue zur manuellen Zuordnung.
            </p>
          </div>
        )}
      </div>

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm font-bold"
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-sm hover:opacity-90 active:scale-95 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
        >
          Import bestätigen
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
