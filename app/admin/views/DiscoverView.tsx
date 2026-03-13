'use client';

import { useState, useEffect } from 'react';
import { getDiscoverSettings, saveDiscoverSettings, getTotalPublicBrewCount } from '@/lib/actions/brew-admin-actions';
import { Settings2, Sparkles, Filter, LayoutTemplate, Layers } from 'lucide-react';

function SettingRow({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display?: (v: number) => string;
}) {
  const isDecimal = step < 1;
  const formatted = display ? display(value) : (isDecimal ? value.toFixed(2) : value.toString());
  
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="space-y-1 py-1">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs text-(--text-secondary) font-medium">{label}</span>
          {description && (
            <span className="text-[10px] text-(--text-disabled)">{description}</span>
          )}
        </div>
        <span className="text-xs font-mono tabular-nums pl-4 shrink-0 text-(--brand)">
          {formatted}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-(--brand)"
        style={{
          background: `linear-gradient(to right, rgba(56, 189, 248, 0.35) 0%, rgba(56, 189, 248, 0.35) ${pct}%, var(--surface-hover) ${pct}%, var(--surface-hover) 100%)`
        }}
      />
    </div>
  );
}

export default function DiscoverView() {
  const [discoverMinQuality, setDiscoverMinQuality] = useState(0);
  const [discoverFeaturedLabel, setDiscoverFeaturedLabel] = useState('Empfohlen');
  const [collabDiversityCap, setCollabDiversityCap] = useState(3);
  const [totalPublicBrews, setTotalPublicBrews] = useState<number | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDiscoverSettings(),
      getTotalPublicBrewCount(),
    ]).then(([s, count]) => {
      setDiscoverMinQuality(s.discover_min_quality_score);
      setDiscoverFeaturedLabel(s.discover_featured_section_label);
      setCollabDiversityCap(s.collab_diversity_cap);
      setTotalPublicBrews(count);
      setSettingsLoading(false);
    }).catch(console.error);
  }, []);

  /** Auto-Formel: max(2, round(totalBrews / 30)) */
  function suggestedCap(total: number) {
    return Math.max(2, Math.round(total / 30));
  }

  async function handleSaveDiscoverSettings() {
    setSettingsSaving(true);
    setSettingsMsg(null);
    try {
      await saveDiscoverSettings({
        discover_min_quality_score: discoverMinQuality,
        discover_featured_section_label: discoverFeaturedLabel,
        collab_diversity_cap: collabDiversityCap,
      });
      setSettingsMsg('✓ Gespeichert');
      setTimeout(() => setSettingsMsg(null), 3000);
    } catch (e: any) {
      setSettingsMsg(`Fehler: ${e.message}`);
    } finally {
      setSettingsSaving(false);
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-(--brand) border-t-transparent rounded-full animate-spin" />
          <p>Lade Discover-Einstellungen…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Discover Page</h1>
          <p className="text-(--text-muted) text-sm mt-1">Einstellungen für die öffentliche Discover-Ansicht</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Filter & Sichtbarkeit ─────────────────────────────────────────── */}
        <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-cyan-400" />Filter & Sichtbarkeit
              </h2>
              <p className="text-[11px] text-(--text-muted) leading-relaxed">
                Steuere, ab welchem Qualitätsniveau Rezepte öffentlich sichtbar sind.
              </p>
            </div>
          </div>

          <div className="space-y-6 grow">
            <SettingRow
              label="Mindest-Quality-Score"
              description="Brews darunter erscheinen nicht auf der Discover Page."
              value={discoverMinQuality}
              onChange={setDiscoverMinQuality}
              min={0}
              max={80}
              step={5}
              display={v => `${v} / 100`}
            />
          </div>

          <div className="p-4 bg-(--surface-sunken) rounded-xl border border-(--border) flex items-center gap-3 mt-4">
             <div className="w-10 h-10 rounded-full bg-cyan-950/30 flex items-center justify-center shrink-0 border border-cyan-900/50 hidden sm:flex">
                <LayoutTemplate className="w-5 h-5 text-cyan-500" />
             </div>
             <div className="grow">
               <h3 className="text-xs font-semibold text-(--text-primary)">Featured-Bereich Titel</h3>
               <p className="text-[10px] text-(--text-muted) mb-2">Die Überschrift für redaktionelle oder empfohlene Inhalte.</p>
               <input
                  type="text"
                  value={discoverFeaturedLabel}
                  onChange={e => setDiscoverFeaturedLabel(e.target.value)}
                  maxLength={30}
                  className="bg-(--surface) border border-(--border-hover) rounded-lg px-3 py-1.5 text-(--text-primary) text-xs focus:outline-none focus:border-(--brand) w-full"
                />
             </div>
          </div>

          <div className="pt-4 border-t border-(--border) flex items-center justify-between mt-auto gap-3">
            <div className="h-6 flex items-center">
              {/* Using a common state for save just to notify on this card too, though it technically applies to everything right now */}
            </div>
            <button
              onClick={handleSaveDiscoverSettings}
              disabled={settingsSaving}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50"
            >
              {settingsSaving ? 'Lädt...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* ── Diversity / Collaborative Filter ─────────────────────────────────────────── */}
        <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />Kollaborativer Diversity-Cap
              </h2>
              <p className="text-[11px] text-(--text-muted) leading-relaxed">
                Max. Brews pro Stil in den personalisierten Empfehlungen.
              </p>
            </div>
          </div>

          <div className="space-y-6 grow flex flex-col justify-center">
            
            <div className="bg-(--surface-sunken) rounded-xl border border-(--border) p-5 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-mono bg-(--surface-hover) text-(--brand) px-2 py-0.5 rounded border border-(--border-hover) mb-4">
                 Max. Brews / Stil
               </span>
               <input
                  type="number"
                  min={1}
                  max={50}
                  value={collabDiversityCap}
                  onChange={e => setCollabDiversityCap(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="bg-(--surface) border border-(--border-hover) rounded-xl px-4 py-3 text-(--text-primary) text-3xl font-black text-center focus:outline-none focus:border-(--brand) w-24 font-mono mb-2"
                />
                
                <p className="text-[10px] text-(--text-muted) max-w-[200px]">
                  Zu niedrig → enge Auswahl.<br/>Zu hoch → ein Stil dominiert.
                </p>
            </div>

            {totalPublicBrews !== null && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] text-(--text-secondary)">
                  Öffentliche Rezepte: <span className="font-mono text-(--text-primary)">{totalPublicBrews}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setCollabDiversityCap(suggestedCap(totalPublicBrews))}
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 px-3 py-1.5 rounded-full transition-colors w-fit border border-purple-900/30 bg-purple-950/10"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Cap setzen: {suggestedCap(totalPublicBrews)}
                </button>
              </div>
            )}
            
          </div>

          <div className="pt-4 border-t border-(--border) flex items-center justify-between mt-auto">
            <div className="h-6 flex items-center">
              {settingsMsg && (
                <span className={`text-xs font-semibold ${settingsMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                  {settingsMsg}
                </span>
              )}
            </div>
            <button
              onClick={handleSaveDiscoverSettings}
              disabled={settingsSaving}
              className="px-4 py-1.5 bg-(--surface-hover) hover:bg-purple-500/10 hover:text-purple-400 border border-(--border) rounded-lg font-semibold text-xs transition disabled:opacity-50"
            >
              {settingsSaving ? 'Lädt...' : 'Speichern'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
