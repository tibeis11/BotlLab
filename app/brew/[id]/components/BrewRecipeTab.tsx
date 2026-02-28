'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Wheat, Thermometer, Flame, Microscope, Scale, Clock, Shuffle } from 'lucide-react';
import { ebcToHex, sgToPlato } from '@/lib/brewing-calculations';

/* ─── Helpers ─── */

const formatMarkdown = (text: string) => {
  if (!text) return '';
  return text.replace(/([^\n])\n(\s*-[ \t])/g, '$1\n\n$2');
};

const scaleAmount = (amount: any, factor: number) => {
  if (factor === 1) return amount;
  if (!amount) return amount;
  const num = parseFloat(String(amount).replace(',', '.'));
  if (isNaN(num)) return amount;
  const result = num * factor;
  if (result < 10) return result.toFixed(2).replace('.', ',');
  if (result < 100) return result.toFixed(1).replace('.', ',');
  return Math.round(result).toString();
};

/* ─── Section Header ─── */

function SectionLabel({ label, icon: Icon, iconColor = 'text-zinc-500' }: {
  label: string;
  icon?: any;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {Icon && <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />}
      <h4 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">{label}</h4>
      <div className="h-px bg-zinc-800/80 flex-1" />
    </div>
  );
}

/* ─── MaltView ─── */

function MaltView({ value, factor = 1 }: { value: any; factor?: number }) {
  if (!value || !Array.isArray(value)) return <IngredientView value={value} />;
  return (
    <ul className="space-y-3">
      {value.map((item: any, i: number) => (
        <li key={i} className="flex justify-between items-center text-sm group hover:bg-zinc-900/30 rounded-lg px-2 -mx-2 py-1.5 transition-colors">
          <div className="flex items-center gap-3">
            {item.color_ebc && (
              <div
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/10 shrink-0"
                style={{ backgroundColor: `hsl(35, 100%, ${Math.max(20, 90 - (parseInt(item.color_ebc) * 2))}%)` }}
                title={`${item.color_ebc} EBC`}
              />
            )}
            <div className="flex flex-col">
              <span className="text-zinc-200 font-medium">{item.name}</span>
              {item.color_ebc && <span className="text-[10px] text-zinc-600">{item.color_ebc} EBC</span>}
            </div>
          </div>
          <div className="text-right font-mono text-zinc-500 shrink-0 ml-4">
            <span className="text-white font-bold">{scaleAmount(item.amount, factor)}</span>{' '}
            <span className="text-zinc-600 text-xs">{item.unit || 'kg'}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── HopView ─── */

function HopView({ value, factor = 1 }: { value: any; factor?: number }) {
  const [corrections, setCorrections] = useState<{ [key: number]: number | null }>({});
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  if (!value || !Array.isArray(value)) return <IngredientView value={value} />;

  const setAlpha = (i: number, alpha: number) => {
    setCorrections(prev => ({ ...prev, [i]: alpha }));
  };

  const hasCorrections = Object.values(corrections).some(v => v !== null);

  return (
    <div className="w-full">
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setIsCorrectionMode(!isCorrectionMode)}
          className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors ${
            isCorrectionMode || hasCorrections
              ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'
          }`}
        >
          <Scale size={11} />
          Alpha anpassen
        </button>
      </div>

      {isCorrectionMode && (
        <p className="text-xs text-cyan-500/80 bg-cyan-950/20 px-3 py-2 rounded-lg border border-cyan-900/30 mb-3">
          Tatsächlichen Alpha-Säure-Gehalt eingeben — die Menge wird angepasst.
        </p>
      )}

      <ul className="space-y-3">
        {value.map((item: any, i: number) => {
          const correctedAlpha = corrections[i];
          const originalAlpha = typeof item.alpha === 'string'
            ? parseFloat(item.alpha.replace(',', '.'))
            : item.alpha;
          const alphaRatio = correctedAlpha && originalAlpha
            ? originalAlpha / correctedAlpha
            : 1;
          const isCorrected = correctedAlpha !== null && correctedAlpha !== undefined && correctedAlpha !== originalAlpha;

          return (
            <li key={i} className="group hover:bg-zinc-900/30 rounded-lg px-2 -mx-2 py-1.5 transition-colors">
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">{item.name}</span>
                  <span className="text-[10px] text-zinc-600">
                    {item.use && <span>{item.use} · </span>}
                    {item.alpha && <span>{item.alpha}% α</span>}
                    {isCorrected && <span className="text-cyan-500 ml-1">→ {correctedAlpha}% α (korrigiert)</span>}
                  </span>
                </div>
                <div className="text-right font-mono shrink-0 ml-4">
                  {isCorrectionMode ? (
                    <input
                      type="number"
                      step="0.1"
                      placeholder={String(originalAlpha || '')}
                      className="bg-zinc-900 border border-zinc-700 text-white text-xs px-2 py-1 rounded-lg w-20 text-right focus:border-cyan-500 focus:outline-none"
                      onChange={(e) => setAlpha(i, parseFloat(e.target.value))}
                    />
                  ) : (
                    <>
                      <span className="text-white font-bold">{scaleAmount(item.amount, factor * alphaRatio)}</span>{' '}
                      <span className="text-zinc-600 text-xs">{item.unit || 'g'}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── MashScheduleView ─── */

function MashScheduleView({ steps, mashWater, spargeWater, factor = 1, calculatedMashWater, calculatedSpargeWater }: {
  steps: any;
  mashWater: any;
  spargeWater: any;
  factor?: number;
  calculatedMashWater?: number;
  calculatedSpargeWater?: number;
}) {
  const displayMash = calculatedMashWater !== undefined ? calculatedMashWater : scaleAmount(mashWater, factor);
  const displaySparge = calculatedSpargeWater !== undefined ? calculatedSpargeWater : scaleAmount(spargeWater, factor);

  return (
    <div className="space-y-6">
      {(mashWater || spargeWater || calculatedMashWater !== undefined) && (
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Hauptguss</span>
            <span className="font-mono text-white font-black text-2xl">
              {typeof displayMash === 'number' ? displayMash.toFixed(1).replace('.', ',') : displayMash || '–'}
              <span className="text-zinc-600 text-sm font-normal ml-1">L</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Nachguss</span>
            <span className="font-mono text-white font-black text-2xl">
              {typeof displaySparge === 'number' ? displaySparge.toFixed(1).replace('.', ',') : displaySparge || '–'}
              <span className="text-zinc-600 text-sm font-normal ml-1">L</span>
            </span>
          </div>
        </div>
      )}

      {Array.isArray(steps) && steps.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
            <Thermometer className="w-3 h-3" /> Rasten
          </p>
          <div className="relative border-l border-zinc-800 ml-2.5 space-y-1">
            {steps.map((step: any, i: number) => (
              <div key={i} className="relative pl-5 py-1.5 group">
                <span className={`absolute -left-[5px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 group-hover:bg-cyan-500 transition-colors ${i === 0 ? 'bg-zinc-500' : 'bg-zinc-800'}`} />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">
                    {step.name || `Rast ${i + 1}`}
                  </span>
                  <div className="flex gap-2 text-xs items-center">
                    <span className="font-mono text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded">
                      {step.temperature}°C
                    </span>
                    {step.duration && (
                      <span className="font-mono text-zinc-500 bg-zinc-900/40 px-2 py-0.5 rounded">
                        {step.duration} min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── IngredientView ─── */

function IngredientView({ value, factor = 1 }: { value: any; factor?: number }) {
  if (!value) return <span className="text-zinc-600">–</span>;
  if (typeof value === 'string') return <p className="text-sm text-zinc-300 font-medium leading-relaxed">{value}</p>;

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-3">
        {value.map((item: any, i: number) => (
          <li key={i} className="flex justify-between items-center text-sm border-b border-zinc-900 pb-2 last:border-0 last:pb-0 group hover:bg-zinc-900/30 -mx-2 px-2 rounded-lg py-1 transition-colors">
            <span className="text-zinc-300 font-medium group-hover:text-white transition-colors">{item.name}</span>
            <span className="text-zinc-500 font-mono text-xs whitespace-nowrap ml-4 flex items-baseline gap-1">
              {item.amount && <span className="text-white font-bold text-base">{scaleAmount(item.amount, factor)}</span>}
              {item.unit && <span className="opacity-70">{item.unit}</span>}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="flex justify-between items-center text-sm">
        <span className="text-zinc-300 font-medium">{value.name}</span>
        <span className="text-zinc-500 font-mono text-xs whitespace-nowrap ml-4 flex items-baseline gap-1">
          {value.amount && <span className="text-white font-bold text-base">{scaleAmount(value.amount, factor)}</span>}
          {value.unit && <span className="opacity-70">{value.unit}</span>}
        </span>
      </div>
    );
  }

  return null;
}

/* ─── Stat Box ─── */

function StatItem({ label, value, unit, accent, colorHex }: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  accent?: boolean;
  colorHex?: string;
}) {
  return (
    <div className="flex flex-col relative overflow-hidden">
      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${accent ? 'text-cyan-500' : 'text-zinc-500'}`}>
        {label}
      </span>
      <span className="text-2xl font-black text-white leading-none tabular-nums">
        {value}
        {unit && <span className="text-zinc-600 text-sm font-semibold ml-1">{unit}</span>}
      </span>
    </div>
  );
}

/* ─── Main component ─── */

interface BrewRecipeTabProps {
  brew: any;
  scaleVolume: number;
  scaleEfficiency: number;
  originalVolume: number;
  originalEfficiency: number;
  setScaleVolume: (v: number) => void;
  setScaleEfficiency: (v: number) => void;
  userEquipmentName: string | null;
  userHasNoProfile: boolean;
  userBreweryId: string | null;
  waterProfile: { mashWater: number; spargeWater: number };
  maltFactor: number;
  volFactor: number;
}

export default function BrewRecipeTab({
  brew,
  scaleVolume,
  scaleEfficiency,
  originalVolume,
  originalEfficiency,
  setScaleVolume,
  setScaleEfficiency,
  userEquipmentName,
  userHasNoProfile,
  userBreweryId,
  waterProfile,
  maltFactor,
  volFactor,
}: BrewRecipeTabProps) {
  if (!brew.data) return (
    <div className="py-16 text-center text-zinc-600">Kein Rezept verfügbar.</div>
  );

  const isBeer = !brew.brew_type || brew.brew_type === 'beer';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      {/* ── Description ── */}
      {brew.description && (
        <p className="text-zinc-400 leading-relaxed text-base font-medium whitespace-pre-wrap">
          {brew.description}
        </p>
      )}

      {/* ── Scaler (Beer only) ── */}
      {isBeer && (
        <div className="py-3 border-t border-b border-zinc-800/60">
          {/* Single flex-wrap row: label + inputs stay on same line, wrap only when needed */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* Label + equipment link */}
            <div className="flex items-center gap-2 shrink-0">
              <Shuffle className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className="font-semibold text-white text-sm">Skalieren</span>
              {userEquipmentName && (
                <span className="text-[10px] text-cyan-600 font-medium">· {userEquipmentName}</span>
              )}
              {!userEquipmentName && userHasNoProfile && (
                <Link
                  href={userBreweryId ? `/team/${userBreweryId}/settings?tab=equipment` : '/dashboard'}
                  className="text-[10px] text-zinc-600 hover:text-cyan-500 transition hover:underline"
                >
                  Brauanlage hinterlegen →
                </Link>
              )}
            </div>

            {/* Inputs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-zinc-600 whitespace-nowrap">Ausschlag (L)</span>
                <div className="relative">
                  <input
                    type="number" min="1"
                    value={scaleVolume}
                    onChange={(e) => setScaleVolume(parseFloat(e.target.value) || 0)}
                    className="bg-zinc-900 text-white font-mono font-bold px-3 py-1.5 rounded-lg border border-zinc-800 w-20 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  {scaleVolume !== originalVolume && (
                    <button
                      onClick={() => setScaleVolume(originalVolume)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-cyan-500 font-bold hover:underline"
                    >↺</button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-zinc-600 whitespace-nowrap">SHA (%)</span>
                <div className="relative">
                  <input
                    type="number" min="1" max="100"
                    value={scaleEfficiency}
                    onChange={(e) => setScaleEfficiency(parseFloat(e.target.value) || 0)}
                    className="bg-zinc-900 text-white font-mono font-bold px-3 py-1.5 rounded-lg border border-zinc-800 w-20 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  {scaleEfficiency !== originalEfficiency && (
                    <button
                      onClick={() => setScaleEfficiency(originalEfficiency)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-cyan-500 font-bold hover:underline"
                    >↺</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Spec Stats ── */}
      {isBeer && (
        <div>
          <SectionLabel label="Technische Details" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem label="Alkohol" value={brew.data.abv || brew.data.est_abv || '–'} unit="%" accent />
            <StatItem
              label="Farbe"
              value={
                <span className="flex items-center gap-3">
                  {brew.data.color && (
                    <span
                      className="w-3 h-3 rounded-full shadow-lg border border-white/10 inline-block"
                      style={{ backgroundColor: ebcToHex(parseFloat(brew.data.color)) }}
                    />
                  )}
                  {brew.data.color || '–'}
                </span>
              }
              unit="EBC"
              colorHex={brew.data.color ? ebcToHex(parseFloat(brew.data.color)) : undefined}
            />
            <StatItem label="Bittere" value={brew.data.ibu || '–'} unit="IBU" />
            <StatItem
              label="Stammwürze"
              value={(() => {
                const val = brew.data.og;
                if (!val) return '–';
                const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
                if (isNaN(num)) return '–';
                if (num > 1.000 && num < 1.200) return sgToPlato(num).toFixed(1);
                return num;
              })()}
              unit="°P"
            />
          </div>
        </div>
      )}

      {/* ── BEER Recipe sections ── */}
      {isBeer && (
        <div className="space-y-12">
          {/* Malts */}
          {brew.data.malts && (
            <section>
              <SectionLabel label="Schüttung" icon={Wheat} iconColor="text-amber-500" />
              <MaltView value={brew.data.malts} factor={maltFactor} />
            </section>
          )}

          {/* Mash + Water */}
          {(brew.data.mash_steps || brew.data.mash_water_liters) && (
            <section>
              <SectionLabel label="Maischen & Wasser" icon={Thermometer} iconColor="text-blue-500" />
              <MashScheduleView
                steps={brew.data.mash_steps}
                mashWater={brew.data.mash_water_liters}
                spargeWater={brew.data.sparge_water_liters}
                factor={volFactor}
                calculatedMashWater={waterProfile.mashWater}
                calculatedSpargeWater={waterProfile.spargeWater}
              />
            </section>
          )}

          {/* Hops + Boil */}
          {brew.data.hops && (
            <section>
              <SectionLabel label="Kochen & Hopfen" icon={Flame} iconColor="text-red-500" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Kochzeit
                  </p>
                  <p className="text-white font-mono text-xl font-black">{brew.data.boil_time || 60} <span className="text-zinc-600 text-sm font-normal">min</span></p>
                </div>
                <div className="md:col-span-3">
                  <HopView value={brew.data.hops} factor={volFactor} />
                </div>
              </div>
            </section>
          )}

          {/* Yeast + Fermentation */}
          {(brew.data.yeast || brew.data.carbonation_g_l) && (
            <section>
              <SectionLabel label="Hefe & Gärung" icon={Microscope} iconColor="text-purple-500" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {brew.data.yeast && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Hefe</p>
                    <IngredientView value={brew.data.yeast} factor={volFactor} />
                  </div>
                )}
                {brew.data.carbonation_g_l && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Karbonisierung</p>
                    <p className="text-white font-mono text-xl font-black">{brew.data.carbonation_g_l} <span className="text-zinc-600 text-sm font-normal">g/l</span></p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── WINE ── */}
      {brew.brew_type === 'wine' && (
        <div className="space-y-12">
          <section>
            <SectionLabel label="Reben & Terroir" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {brew.data.grapes && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Rebsorten</p>
                  <p className="text-lg text-white font-bold leading-relaxed">{brew.data.grapes}</p>
                </div>
              )}
              {brew.data.region && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Region</p>
                  <p className="text-zinc-300 font-medium">{brew.data.region}</p>
                </div>
              )}
              {brew.data.vintage && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Jahrgang</p>
                  <p className="text-white font-mono">{brew.data.vintage}</p>
                </div>
              )}
            </div>
          </section>
          <section>
            <SectionLabel label="Ausbau & Balance" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {brew.data.residual_sugar_g_l && <StatItem label="Restzucker" value={brew.data.residual_sugar_g_l} unit="g/l" />}
              {brew.data.acidity_g_l && <StatItem label="Säure" value={brew.data.acidity_g_l} unit="g/l" />}
              {brew.data.original_gravity && <StatItem label="Start-Dichte" value={brew.data.original_gravity} unit="°Oe" />}
              {brew.data.oak_months && <StatItem label="Fasslager" value={brew.data.oak_months} unit="Monate" />}
            </div>
            {(brew.data.oak_aged || brew.data.sulfites) && (
              <div className="flex flex-wrap gap-2 mt-6">
                {brew.data.oak_aged && <span className="px-3 py-1.5 bg-amber-950/40 text-amber-500 border border-amber-900/50 rounded-lg text-xs font-bold uppercase tracking-wider">Barrique</span>}
                {brew.data.sulfites && <span className="px-3 py-1.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider">Enthält Sulfite</span>}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── MEAD ── */}
      {brew.brew_type === 'mead' && (
        <div className="space-y-12">
          <section>
            <SectionLabel label="Zutaten" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {brew.data.honey && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Honig & Zusätze</p>
                  <p className="text-lg text-white font-bold leading-relaxed">{brew.data.honey}</p>
                  {brew.data.adjuncts && <p className="text-sm text-zinc-500 mt-1">+ {brew.data.adjuncts}</p>}
                </div>
              )}
              {brew.data.yeast && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Hefe</p>
                  <p className="text-sm text-white font-medium">{brew.data.yeast}</p>
                </div>
              )}
            </div>
          </section>
          <section>
            <SectionLabel label="Werte" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {brew.data.original_gravity && <StatItem label="OG (Start)" value={brew.data.original_gravity} unit="SG" />}
              {brew.data.final_gravity && <StatItem label="FG (End)" value={brew.data.final_gravity} unit="SG" />}
              {brew.data.aging_months && <StatItem label="Reifezeit" value={brew.data.aging_months} unit="Monate" />}
            </div>
            {brew.data.nutrient_schedule && (
              <div className="mt-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Nährstoffplan</p>
                <p className="text-zinc-400 font-mono text-xs whitespace-pre-wrap">{brew.data.nutrient_schedule}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── CIDER / SOFTDRINK ── */}
      {(brew.brew_type === 'cider' || brew.brew_type === 'softdrink') && (
        <div className="space-y-12">
          <section>
            <SectionLabel label="Zutaten" />
            <div className="space-y-6">
              {brew.data.apples && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Apfelsorten</p>
                  <p className="text-lg text-white font-bold">{brew.data.apples}</p>
                </div>
              )}
              {brew.data.base && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Basis</p>
                  <p className="text-lg text-white font-bold">{brew.data.base}</p>
                </div>
              )}
              {brew.data.yeast && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Hefe</p>
                  <p className="text-zinc-300">{brew.data.yeast}</p>
                </div>
              )}
            </div>
          </section>
          <section>
            <SectionLabel label="Werte" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {brew.data.original_gravity && <StatItem label="Start-Dichte" value={brew.data.original_gravity} />}
              {brew.data.carbonation_g_l && <StatItem label="Karbonisierung" value={brew.data.carbonation_g_l} unit="g/l" />}
              {brew.data.pH && <StatItem label="pH" value={brew.data.pH} />}
              {brew.data.sugar_g_l && <StatItem label="Zucker" value={brew.data.sugar_g_l} unit="g/l" />}
              {brew.data.sweetness && <StatItem label="Süße" value={<span className="capitalize">{brew.data.sweetness}</span>} />}
            </div>
          </section>
        </div>
      )}

      {/* ── Recipe Steps ── */}
      {brew.data.steps && brew.data.steps.length > 0 && (
        <section>
          <SectionLabel label="Brauanleitung" />
          <div className="relative border-l border-zinc-800 ml-3 space-y-6 py-2">
            {brew.data.steps.map((step: any, idx: number) => (
              <div key={idx} className="relative pl-8">
                <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-cyan-900 border border-cyan-600" />
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-[10px] font-black text-cyan-500 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/40 uppercase tracking-wider">
                    Schritt {idx + 1}
                  </span>
                  {step.title && <span className="text-white font-bold text-base">{step.title}</span>}
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-zinc-400 font-medium leading-relaxed [&>p]:my-0">
                  <ReactMarkdown
                    remarkPlugins={[remarkBreaks]}
                    components={{
                      ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-1 marker:text-zinc-600" {...props} />,
                    }}
                  >
                    {formatMarkdown(step.instruction)}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Notes ── */}
      {brew.data.notes && (
        <section className="pt-6 border-t border-zinc-800/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">📝 Notizen</p>
          <p className="text-zinc-500 whitespace-pre-wrap leading-relaxed text-sm font-mono">{brew.data.notes}</p>
        </section>
      )}
    </div>
  );
}
