'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Wheat, Thermometer, Flame, Microscope, Scale, Clock, Shuffle, Droplets } from 'lucide-react';
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

function SectionLabel({ label, icon: Icon, iconColor = 'text-text-muted' }: {
  label: string;
  icon?: any;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {Icon && <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />}
      <h4 className="text-xs font-black uppercase tracking-[0.25em] text-text-muted">{label}</h4>
      <div className="h-px bg-surface-hover/80 flex-1" />
    </div>
  );
}

/* ─── MaltView ─── */

function MaltView({ value, factor = 1 }: { value: any; factor?: number }) {
  if (!value || !Array.isArray(value)) return <IngredientView value={value} />;
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface/30">
      <table className="w-full text-sm text-left">
        <thead className="bg-surface border-b border-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Zutat</th>
            <th className="px-4 py-3 font-medium w-24">Farbe</th>
            <th className="px-4 py-3 font-medium text-right w-32">Menge</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {value.map((item: any, i: number) => (
            <tr key={i} className="group hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3">
                <span className="text-text-primary font-medium">{item.name}</span>
              </td>
              <td className="px-4 py-3">
                {item.color_ebc ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-border shrink-0"
                      style={{ backgroundColor: `hsl(35, 100%, ${Math.max(20, 90 - (parseInt(item.color_ebc) * 2))}%)` }}
                      title={`${item.color_ebc} EBC`}
                    />
                    <span className="text-text-disabled text-xs tabular-nums leading-none">{item.color_ebc} EBC</span>
                  </div>
                ) : (
                  <span className="text-text-disabled">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="font-mono tabular-nums">
                  <span className="text-text-primary font-bold text-sm">{scaleAmount(item.amount, factor)}</span>{' '}
                  <span className="text-text-disabled text-xs">{item.unit || 'kg'}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
              ? 'bg-brand-bg border-brand/50 text-brand'
              : 'bg-surface border-border text-text-muted hover:text-text-primary'
          }`}
        >
          <Scale size={11} />
          Alpha anpassen
        </button>
      </div>

      {isCorrectionMode && (
        <p className="text-xs text-brand bg-brand-bg px-3 py-2 rounded-lg border border-brand/30 mb-3">
          Tatsächlichen Alpha-Säure-Gehalt eingeben — die Menge wird angepasst.
        </p>
      )}

      <div className="w-full overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-surface/30">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface border-b border-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Zutat</th>
              <th className="px-4 py-3 font-medium w-32">Alpha</th>
              <th className="px-4 py-3 font-medium w-32">Gabe</th>
              <th className="px-4 py-3 font-medium text-right w-24">Zeit</th>
              <th className="px-4 py-3 font-medium text-right w-32">Menge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
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
                <tr key={i} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-text-primary font-medium">{item.name}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {isCorrectionMode ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          placeholder={String(originalAlpha || '')}
                          className="bg-surface border border-border-hover text-text-primary text-xs px-2 py-1 rounded-lg w-16 focus:border-brand focus:outline-none"
                          onChange={(e) => setAlpha(i, parseFloat(e.target.value))}
                        />
                        <span className="text-text-disabled text-xs">% α</span>
                      </div>
                    ) : item.alpha ? (
                      <span className={isCorrected ? "text-brand font-medium" : ""}>
                        {isCorrected ? `${correctedAlpha}` : item.alpha}% α
                      </span>
                    ) : (
                      <span className="text-text-disabled">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {(item.use || item.usage) || <span className="text-text-disabled">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.time > 0 ? (
                      <span className="font-mono text-text-secondary text-xs font-semibold tabular-nums">{item.time} min</span>
                    ) : (
                      <span className="text-text-disabled">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono tabular-nums">
                      <span className={isCorrectionMode && isCorrected ? "text-brand font-bold text-sm" : "text-text-primary font-bold text-sm"}>
                        {scaleAmount(item.amount, factor * alphaRatio)}
                      </span>{' '}
                      <span className={isCorrectionMode && isCorrected ? "text-brand/70 text-xs" : "text-text-disabled text-xs"}>
                        {item.unit || 'g'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── MashScheduleView ─── */

const DECOCTION_FORM_LABEL: Record<string, string> = { thick: 'Dickmaische', thin: 'Dünnmaische', liquid: 'Flüssig' };
const STEP_TYPE_LABEL: Record<string, string> = { rest: 'Rast', decoction: 'Dekoktion', mashout: 'Abmaischen', strike: 'Einmaischen' };

function MashScheduleView({ steps, mashWater, spargeWater, factor = 1, calculatedMashWater, calculatedSpargeWater, mashProcess }: {
  steps: any;
  mashWater: any;
  spargeWater: any;
  factor?: number;
  calculatedMashWater?: number;
  calculatedSpargeWater?: number;
  mashProcess?: string;
}) {
  const displayMash = calculatedMashWater !== undefined ? calculatedMashWater : scaleAmount(mashWater, factor);
  const displaySparge = calculatedSpargeWater !== undefined ? calculatedSpargeWater : scaleAmount(spargeWater, factor);
  const hasDecoction = mashProcess === 'decoction' || (Array.isArray(steps) && steps.some((s: any) => s.step_type === 'decoction'));

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface/30">
      {(mashWater || spargeWater || calculatedMashWater !== undefined) && (
        <div className="bg-surface border-b border-border/60 px-4 py-4 flex flex-wrap gap-8 sm:gap-16">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Hauptguss</span>
            <span className="font-mono text-text-primary font-bold text-lg tabular-nums">
              {typeof displayMash === 'number' ? displayMash.toFixed(1).replace('.', ',') : displayMash || '–'}
              <span className="text-text-disabled text-xs font-normal ml-1">L</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Nachguss</span>
            <span className="font-mono text-text-primary font-bold text-lg tabular-nums">
              {typeof displaySparge === 'number' ? displaySparge.toFixed(1).replace('.', ',') : displaySparge || '–'}
              <span className="text-text-disabled text-xs font-normal ml-1">L</span>
            </span>
          </div>
        </div>
      )}

      {Array.isArray(steps) && steps.length > 0 && (
        <table className="w-full text-sm text-left">
          <thead className="bg-surface/50 border-b border-border/60 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Schritt</th>
              <th className="px-4 py-3 font-medium text-right w-24">Temp.</th>
              <th className="px-4 py-3 font-medium text-right w-24">Dauer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {steps.map((step: any, i: number) => {
              const isDecoction = step.step_type === 'decoction';
              const isMashout = step.step_type === 'mashout';
              const isStrike = step.step_type === 'strike';

              return (
                <tr key={i} className="group hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 justify-center">
                      <span className="text-sm font-semibold text-text-secondary group-hover:text-text-primary transition-colors flex flex-wrap items-center gap-2">
                        {step.name || (isDecoction ? `Dekoktion ${i + 1}` : isMashout ? 'Abmaischen' : isStrike ? 'Einmaischen' : `Rast ${i + 1}`)}
                        {isDecoction && <Flame className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
                        {step.step_type && step.step_type !== 'rest' && (STEP_TYPE_LABEL[step.step_type] || step.step_type).toLowerCase() !== (step.name || '').toLowerCase() && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                            isDecoction ? 'text-orange-600 dark:text-accent-orange bg-orange-50 dark:bg-orange-950/40' : isMashout ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : isStrike ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40' : 'text-text-muted bg-surface'
                          }`}>
                            {STEP_TYPE_LABEL[step.step_type] || step.step_type}
                          </span>
                        )}
                      </span>
                      {/* Decoction sub-details */}
                      {isDecoction && (step.decoction_form || step.volume_liters || step.decoction_boil_time) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {step.decoction_form && (
                            <span className="text-[10px] text-orange-500 dark:text-orange-300/70 bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded font-medium">
                              {DECOCTION_FORM_LABEL[step.decoction_form] || step.decoction_form}
                            </span>
                          )}
                          {step.volume_liters && (
                            <span className="text-[10px] text-text-secondary bg-surface/60 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                              <Droplets className="w-2.5 h-2.5" /> {typeof step.volume_liters === 'number' ? scaleAmount(step.volume_liters, factor) : step.volume_liters} L
                            </span>
                          )}
                          {step.decoction_boil_time && (
                            <span className="text-[10px] text-text-secondary bg-surface/60 px-1.5 py-0.5 rounded font-mono">
                              Kochen {step.decoction_boil_time} min
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-text-primary text-sm font-semibold tabular-nums">
                      {step.temperature}°C
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {step.duration ? (
                      <span className="font-mono text-text-secondary text-sm font-semibold tabular-nums">
                        {step.duration} min
                      </span>
                    ) : (
                      <span className="text-text-disabled">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── IngredientView ─── */

function IngredientView({ value, factor = 1 }: { value: any; factor?: number }) {
  if (!value) return <span className="text-text-disabled">—</span>;
  if (typeof value === 'string') return <p className="text-sm text-text-secondary font-medium leading-relaxed">{value}</p>;

  if (Array.isArray(value)) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-border bg-surface/30">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface border-b border-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Zutat</th>
              <th className="px-4 py-3 font-medium text-right w-32">Menge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {value.map((item: any, i: number) => (
              <tr key={i} className="group hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <span className="text-text-primary font-medium">{item.name || item.type || item.strain || 'Zutat'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-mono tabular-nums">
                    {item.amount ? (
                      <>
                        <span className="text-text-primary font-bold text-sm">{scaleAmount(item.amount, factor)}</span>{' '}
                        <span className="text-text-disabled text-xs">{item.unit || 'g'}</span>
                      </>
                    ) : (
                      <span className="text-text-disabled">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-border bg-surface/30">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface border-b border-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Zutat</th>
              <th className="px-4 py-3 font-medium text-right w-32">Menge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr className="group hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3">
                <span className="text-text-primary font-medium">{value.name || value.type || value.strain || 'Zutat'}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="font-mono tabular-nums">
                  {value.amount ? (
                    <>
                      <span className="text-text-primary font-bold text-sm">{scaleAmount(value.amount, factor)}</span>{' '}
                      <span className="text-text-disabled text-xs">{value.unit || 'g'}</span>
                    </>
                  ) : (
                    <span className="text-text-disabled">—</span>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
      <span className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${accent ? 'text-brand' : 'text-text-muted'}`}>
        {label}
      </span>
      <span className="text-2xl font-black text-text-primary leading-none tabular-nums">
        {value}
        {unit && <span className="text-text-disabled text-sm font-semibold ml-1">{unit}</span>}
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
    <div className="py-16 text-center text-text-disabled">Kein Rezept verfügbar.</div>
  );

  const isBeer = !brew.brew_type || brew.brew_type === 'beer';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      {/* ── Description ── */}
      {brew.description && (
        <p className="text-text-secondary leading-relaxed text-base font-medium whitespace-pre-wrap">
          {brew.description}
        </p>
      )}

      {/* ── Scaler (Beer only) ── */}
      {isBeer && (
        <div className="py-3 border-t border-b border-border/60">
          {/* Single flex-wrap row: label + inputs stay on same line, wrap only when needed */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* Label + equipment link */}
            <div className="flex items-center gap-2 shrink-0">
              <Shuffle className="w-4 h-4 text-brand shrink-0" />
              <span className="font-semibold text-text-primary text-sm">Skalieren</span>
              {userEquipmentName && (
                <span className="text-[10px] text-cyan-600 font-medium">· {userEquipmentName}</span>
              )}
              {!userEquipmentName && userHasNoProfile && (
                <Link
                  href={userBreweryId ? `/team/${userBreweryId}/settings?tab=equipment` : '/dashboard'}
                  className="text-[10px] text-text-disabled hover:text-brand transition hover:underline"
                >
                  Brauanlage hinterlegen →
                </Link>
              )}
            </div>

            {/* Inputs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-text-disabled whitespace-nowrap">Ausschlag (L)</span>
                <div className="relative">
                  <input
                    type="number" min="1"
                    value={scaleVolume}
                    onChange={(e) => setScaleVolume(parseFloat(e.target.value) || 0)}
                    className="bg-surface text-text-primary font-mono font-bold px-3 py-1.5 rounded-lg border border-border w-20 focus:border-brand focus:outline-none text-sm"
                  />
                  {scaleVolume !== originalVolume && (
                    <button
                      onClick={() => setScaleVolume(originalVolume)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-brand font-bold hover:underline"
                    >↺</button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-text-disabled whitespace-nowrap">SHA (%)</span>
                <div className="relative">
                  <input
                    type="number" min="1" max="100"
                    value={scaleEfficiency}
                    onChange={(e) => setScaleEfficiency(parseFloat(e.target.value) || 0)}
                    className="bg-surface text-text-primary font-mono font-bold px-3 py-1.5 rounded-lg border border-border w-20 focus:border-brand focus:outline-none text-sm"
                  />
                  {scaleEfficiency !== originalEfficiency && (
                    <button
                      onClick={() => setScaleEfficiency(originalEfficiency)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-brand font-bold hover:underline"
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
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <SectionLabel label="Technische Details" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem label="Alkohol" value={brew.data.abv || brew.data.est_abv || '–'} unit="%" accent />
            
            <StatItem
              label="Farbe"
              value={
                <span className="flex items-center gap-3">
                  {brew.data.color && (
                    <span
                      className="w-3 h-3 rounded-full shadow-lg border border-white/10 inline-block shrink-0"
                      style={{ backgroundColor: ebcToHex(parseFloat(brew.data.color)) }}
                    />
                  )}
                  <span className="truncate">{brew.data.color || '–'}</span>
                </span>
              }
              unit="EBC"
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
        <div className="space-y-12 mt-6">
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
                mashProcess={brew.data?.mash_process}
              />
            </section>
          )}

          {/* Hops + Boil */}
          {brew.data.hops && (
            <section>
              <SectionLabel label="Kochen & Hopfen" icon={Flame} iconColor="text-red-500" />
              <HopView value={brew.data.hops} factor={volFactor} />
            </section>
          )}

          {/* Yeast + Fermentation */}
          {(brew.data.yeast || brew.data.carbonation_g_l) && (
            <section>
              <SectionLabel label="Hefe & Gärung" icon={Microscope} iconColor="text-purple-500" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-3">Hefe</p>
                  <IngredientView value={brew.data.yeast} factor={volFactor} />
                </div>
                {brew.data.carbonation_g_l && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Karbonisierung</p>
                    <p className="text-text-primary font-mono text-xl font-black">
                      {brew.data.carbonation_g_l || '–'} <span className="text-text-disabled text-sm font-normal">g/l</span>
                    </p>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Rebsorten</p>
                  <p className="text-lg text-text-primary font-bold leading-relaxed">{brew.data.grapes}</p>
                </div>
              )}
              {brew.data.region && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Region</p>
                  <p className="text-text-secondary font-medium">{brew.data.region}</p>
                </div>
              )}
              {brew.data.vintage && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Jahrgang</p>
                  <p className="text-text-primary font-mono">{brew.data.vintage}</p>
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
                {brew.data.sulfites && <span className="px-3 py-1.5 bg-surface text-text-secondary border border-border rounded-lg text-xs font-bold uppercase tracking-wider">Enthält Sulfite</span>}
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-2">Honig & Zusätze</p>
                  <p className="text-lg text-text-primary font-bold leading-relaxed">{brew.data.honey}</p>
                  {brew.data.adjuncts && <p className="text-sm text-text-muted mt-1">+ {brew.data.adjuncts}</p>}
                </div>
              )}
              {brew.data.yeast && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-2">Hefe</p>
                  <p className="text-sm text-text-primary font-medium">{brew.data.yeast}</p>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-3">Nährstoffplan</p>
                <p className="text-text-secondary font-mono text-xs whitespace-pre-wrap">{brew.data.nutrient_schedule}</p>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Apfelsorten</p>
                  <p className="text-lg text-text-primary font-bold">{brew.data.apples}</p>
                </div>
              )}
              {brew.data.base && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Basis</p>
                  <p className="text-lg text-text-primary font-bold">{brew.data.base}</p>
                </div>
              )}
              {brew.data.yeast && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-1">Hefe</p>
                  <p className="text-text-secondary">{brew.data.yeast}</p>
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
          <div className="relative border-l border-border ml-3 space-y-6 py-2">
            {brew.data.steps.map((step: any, idx: number) => (
              <div key={idx} className="relative pl-8">
                <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-brand-dim border border-brand" />
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-[10px] font-black text-brand bg-brand-bg px-2 py-0.5 rounded border border-brand/40 uppercase tracking-wider">
                    Schritt {idx + 1}
                  </span>
                  {step.title && <span className="text-text-primary font-bold text-base">{step.title}</span>}
                </div>
                <div className="prose prose-sm max-w-none text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary prose-li:text-text-secondary font-medium leading-relaxed [&>p]:my-0">
                  <ReactMarkdown
                    remarkPlugins={[remarkBreaks]}
                    components={{
                      ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-1 marker:text-text-disabled" {...props} />,
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
        <section className="pt-6 border-t border-border/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-disabled mb-3">📝 Notizen</p>
          <p className="text-text-muted whitespace-pre-wrap leading-relaxed text-sm font-mono">{brew.data.notes}</p>
        </section>
      )}
    </div>
  );
}
