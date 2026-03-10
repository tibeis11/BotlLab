
'use client';

import { useState, useEffect } from 'react';
import { getDiscoverSettings, saveDiscoverSettings, getTotalPublicBrewCount } from '@/lib/actions/brew-admin-actions';
import { Settings2, Sparkles } from 'lucide-react';

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
      setSettingsMsg('Einstellungen gespeichert!');
    } catch (e: any) {
      setSettingsMsg(`Fehler: ${e.message}`);
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-(--text-primary)">Discover Page</h2>
          <p className="text-(--text-muted) text-sm">Einstellungen für die öffentliche Discover-Ansicht</p>
        </div>
      </div>

      {/* Discover Page Settings */}
      <div className="bg-(--surface) rounded-xl p-6 border border-(--border)">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-(--text-primary)">Discover Page Einstellungen</h3>
        </div>
        <p className="text-sm text-(--text-secondary) mb-6 max-w-2xl">
          Steuere, welche Brews in der Discover Page erscheinen und wie der Featured-Bereich beschriftet wird.
        </p>

        {settingsLoading ? (
          <div className="flex items-center gap-2 text-(--text-muted) text-sm">
            <div className="w-4 h-4 border-2 border-(--brand) border-t-transparent rounded-full animate-spin" />
            Lade Einstellungen...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Min Quality Score */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <label className="text-sm font-medium text-(--text-primary) w-56 shrink-0">
                Mindest-Quality-Score
                <p className="text-xs text-(--text-muted) font-normal mt-0.5">
                  Brews unter diesem Score werden auf der Discover Page nicht angezeigt.
                </p>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0" max="80" step="5"
                  value={discoverMinQuality}
                  onChange={e => setDiscoverMinQuality(Number(e.target.value))}
                  className="w-40 accent-cyan-500"
                />
                <span className="font-mono text-(--text-primary) text-sm w-8 text-right">{discoverMinQuality}</span>
                <span className="text-(--text-muted) text-xs">/ 100</span>
              </div>
            </div>

            {/* Featured Section Label */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <label className="text-sm font-medium text-(--text-primary) w-56 shrink-0">
                Featured-Bereich Titel
                <p className="text-xs text-(--text-muted) font-normal mt-0.5">
                  Überschrift des &quot;Empfohlen&quot;-Reiters in der Discover Page.
                </p>
              </label>
              <input
                type="text"
                value={discoverFeaturedLabel}
                onChange={e => setDiscoverFeaturedLabel(e.target.value)}
                maxLength={30}
                className="bg-(--surface-sunken) border border-(--border-hover) rounded-lg px-3 py-2 text-(--text-primary) text-sm focus:outline-none focus:border-(--brand) w-48"
              />
            </div>

            {/* Kollab Diversity-Cap */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6 pt-2 border-t border-(--border)">
              <div className="w-56 shrink-0">
                <p className="text-sm font-medium text-(--text-primary)">
                  Kollaborativer Diversity-Cap
                </p>
                <p className="text-xs text-(--text-muted) mt-0.5">
                  Max. Brews <em>pro Stil</em> in den personalisierten Empfehlungen.<br />
                  Zu niedrig → enge Auswahl. Zu hoch → ein Stil dominiert.
                </p>
                {totalPublicBrews !== null && (
                  <p className="text-xs text-(--text-disabled) mt-2">
                    Öffentliche Rezepte: <span className="text-(--text-primary) font-mono">{totalPublicBrews}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={collabDiversityCap}
                    onChange={e => setCollabDiversityCap(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="bg-(--surface-sunken) border border-(--border-hover) rounded-lg px-3 py-2 text-(--text-primary) text-sm focus:outline-none focus:border-(--brand) w-20 font-mono"
                  />
                  <span className="text-(--text-muted) text-xs">Brews / Stil</span>
                </div>
                {totalPublicBrews !== null && (
                  <button
                    type="button"
                    onClick={() => setCollabDiversityCap(suggestedCap(totalPublicBrews))}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors w-fit"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto: {suggestedCap(totalPublicBrews)} (= max(2, round({totalPublicBrews} / 30)))
                  </button>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSaveDiscoverSettings}
                disabled={settingsSaving}
                className="px-4 py-2 bg-(--brand) hover:bg-(--brand-hover) disabled:opacity-50 disabled:cursor-not-allowed text-(--text-primary) rounded-lg font-bold transition text-sm"
              >
                {settingsSaving ? 'Speichere...' : 'Speichern'}
              </button>
              {settingsMsg && (
                <span className={`text-sm font-bold ${
                  settingsMsg.startsWith('Fehler') ? 'text-red-400' : 'text-green-400'
                }`}>{settingsMsg}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
