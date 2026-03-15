'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, Thermometer, Search, X } from 'lucide-react';
import { useSupabase } from '@/lib/hooks/useSupabase';
import type { ProcessedRecipe, MatchedIngredient } from '@/lib/actions/recipe-import';
import type { ParsedMashStep } from '@/lib/ingredient-parser/types';

// match_level codes from match_ingredient RPC:
// 0=Manuell, 1=Exakt (Produkt), 2=Alias (Master/Alias), 3=Alias-Substring,
// 4=Fuzzy Produkt, 5=Fuzzy Master
const MATCH_LEVEL_CONFIG: Record<number, { label: string; className: string }> = {
  0:  { label: 'Manuell', className: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  1:  { label: 'Exakt',   className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  2:  { label: 'Alias',   className: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30' },
  3:  { label: 'Alias',   className: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30' },
  4:  { label: 'Fuzzy',   className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  5:  { label: 'Fuzzy',   className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  99: { label: 'Gewürz',  className: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

const TYPE_FALLBACK: Record<string, string> = {
  malt:  'Unbekanntes Malz',
  hop:   'Unbekannter Hopfen',
  yeast: 'Unbekannte Hefe',
  misc:  'Unbekannte Zutat',
  spice: 'Gewürz',
};

interface MasterOption {
  id: string;
  name: string;
  type: string;
  color_ebc: number | null;
  potential_pts: number | null;
  alpha_pct: number | null;
  ingredient_products: { attenuation_pct: number | null }[];
}

interface Props {
  recipe: ProcessedRecipe;
  onConfirm: () => void;
  onCancel: () => void;
  onIngredientUpdate: (index: number, updated: MatchedIngredient) => void;
}

// ── ManualMatchRow ──────────────────────────────────────────────────────────

function ManualMatchRow({
  ing, idx, onAssign,
}: {
  ing: MatchedIngredient & { status: 'unmatched' };
  idx: number;
  onAssign: (idx: number, updated: MatchedIngredient) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<MasterOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();

  const openSearch = async () => {
    setIsEditing(true);
    if (options !== null) return;
    setLoading(true);
    const { data } = await supabase
      .from('ingredient_master')
      .select('id, name, type, color_ebc, potential_pts, alpha_pct, ingredient_products(attenuation_pct)')
      .eq('type', ing.type)
      .order('name');
    setOptions((data as MasterOption[]) ?? []);
    setLoading(false);
  };

  const filtered = options
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const assign = (opt: MasterOption) => {
    const updated: MatchedIngredient = {
      ...ing,
      status: 'matched',
      match: {
        master_id: opt.id,
        name: opt.name,
        type: opt.type,
        match_score: 1.0,
        match_level: 0,
        color_ebc: opt.color_ebc ?? null,
        potential_pts: opt.potential_pts ?? null,
        alpha_pct: opt.alpha_pct ?? null,
        attenuation_pct: opt.ingredient_products?.[0]?.attenuation_pct ?? null,
      },
    };
    onAssign(idx, updated);
    setIsEditing(false);
    setQuery('');
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
        <div className="flex-1 min-w-0">
          <p className="text-amber-200/70 text-sm font-medium truncate">{ing.raw_name}</p>
          <p className="text-zinc-500 text-xs">{ing.usage === 'spice' ? 'Gewürz' : (TYPE_FALLBACK[ing.type] ?? 'Unbekannte Zutat')}</p>
        </div>
        <button
          onClick={openSearch}
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
        >
          Zuweisen
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-violet-500/30 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`${ing.raw_name} suchen…`}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
        />
        <button
          onClick={() => setIsEditing(false)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {loading && (
          <p className="text-zinc-500 text-xs px-3 py-3">Lädt…</p>
        )}
        {!loading && options !== null && filtered.length === 0 && (
          <p className="text-zinc-500 text-xs px-3 py-3">
            {query.length > 0 ? `Keine Treffer für „${query}"` : 'Tippe zum Suchen…'}
          </p>
        )}
        {filtered.slice(0, 10).map(opt => (
          <button
            key={opt.id}
            onClick={() => assign(opt)}
            className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            <span className="truncate flex-1">{opt.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MashPlanCard ────────────────────────────────────────────────────────────

function MashPlanCard({ steps }: { steps: ParsedMashStep[] }) {
  const visible = steps.slice(0, 5);
  const hidden = steps.length - visible.length;
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Thermometer className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className="text-sm font-bold text-white">
          Maischeplan ({steps.length} {steps.length === 1 ? 'Rast' : 'Rasten'})
        </span>
      </div>
      <div className="space-y-1.5">
        {visible.map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-sm px-2 py-1.5 rounded-lg bg-zinc-800/50">
            <span className="text-zinc-400 font-medium min-w-0 flex-1 truncate">{s.name || `Rast ${i + 1}`}</span>
            <span className="text-white font-bold tabular-nums shrink-0">{s.temperature_c}°C</span>
            <span className="text-zinc-500 tabular-nums shrink-0">{s.duration_minutes} min</span>
          </div>
        ))}
        {hidden > 0 && (
          <p className="text-zinc-600 text-xs px-2 pt-0.5">… {hidden} weitere {hidden === 1 ? 'Rast' : 'Rasten'}</p>
        )}
      </div>
    </div>
  );
}

// ── IngredientRow (matched only) ────────────────────────────────────────────

function IngredientRow({ ing }: { ing: MatchedIngredient & { status: 'matched' } }) {
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

// ── ImportMatchPreview ──────────────────────────────────────────────────────

export default function ImportMatchPreview({ recipe, onConfirm, onCancel, onIngredientUpdate }: Props) {
  const ingredients = recipe.ingredients.filter(i => i.type !== 'water');
  const matched    = ingredients.filter(i => i.status === 'matched') as (MatchedIngredient & { status: 'matched' })[];
  const total      = ingredients.length;
  const pct        = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  // Unmatched items with their original index in recipe.ingredients (for the callback)
  const unmatchedWithIdx = recipe.ingredients
    .map((ing, idx) => ({ ing, idx }))
    .filter(({ ing }) => ing.status === 'unmatched' && ing.type !== 'water') as
      { ing: MatchedIngredient & { status: 'unmatched' }; idx: number }[];

  const progressColor = pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-cyan-500' : 'bg-amber-500';
  const pctColor      = pct === 100 ? 'text-emerald-400' : pct >= 70 ? 'text-cyan-400' : 'text-amber-400';

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
              {unmatchedWithIdx.length > 0 && (
                <span className="text-zinc-600 ml-1.5">
                  · {unmatchedWithIdx.length} manuell zuweisbar
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

      {/* Maischeplan */}
      {recipe.mash_steps && recipe.mash_steps.length > 0 && (
        <MashPlanCard steps={recipe.mash_steps} />
      )}

      {/* Zutatenlisten */}
      <div className={`grid grid-cols-1 gap-4 ${unmatchedWithIdx.length > 0 ? 'md:grid-cols-2' : ''}`}>

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
                Weise Zutaten manuell zu oder importiere generisch.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {matched.map((ing, i) => (
                <IngredientRow key={`${ing.type}-${ing.raw_name}-${i}`} ing={ing} />
              ))}
            </div>
          )}
        </div>

        {/* Nicht erkannte Zutaten — mit manuellem Zuweisen */}
        {unmatchedWithIdx.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm font-bold text-white">Nicht erkannt ({unmatchedWithIdx.length})</span>
            </div>
            <div className="space-y-1.5">
              {unmatchedWithIdx.map(({ ing, idx }) => (
                <ManualMatchRow
                  key={`${ing.type}-${ing.raw_name}-${idx}`}
                  ing={ing}
                  idx={idx}
                  onAssign={onIngredientUpdate}
                />
              ))}
            </div>
            <p className="text-amber-500/60 text-xs mt-2.5 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              Nicht zugewiesene Zutaten landen in der Admin-Queue.
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
