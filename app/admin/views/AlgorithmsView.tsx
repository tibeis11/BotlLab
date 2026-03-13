'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAlgorithmSettings,
  saveAlgorithmSettings,
  recalcTrendingWithCustomWeights,
} from '@/lib/actions/brew-admin-actions';
import { ALGORITHM_DEFAULTS, AlgorithmSettings } from '@/lib/algorithm-settings';
import { Cpu, MessageSquare, TrendingUp, RotateCcw, Info, Star, Sparkles, Settings2, BarChart3 } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function previewForumScore(
  replies: number,
  views: number,
  ageHours: number,
  settings: AlgorithmSettings,
): number {
  return (
    (replies * settings.forum_hot_replies_weight + views / settings.forum_hot_views_divisor)
    / Math.pow(ageHours + 2, settings.forum_hot_age_exponent)
  );
}

function previewTrendingScore(
  likes: number,
  timesBrewed: number,
  ageDays: number,
  settings: AlgorithmSettings,
): number {
  return (
    (likes * settings.trending_likes_weight + timesBrewed * settings.trending_brewed_weight)
    / Math.pow(ageDays + 2, settings.trending_age_exponent)
  );
}

function previewBestRatedScore(
  n: number,
  avg: number,
  ageDays: number,
  settings: AlgorithmSettings,
): number {
  const M = settings.bestrated_bayesian_m;
  const C = settings.bestrated_bayesian_c;
  const floor = settings.bestrated_recency_floor;
  const hl    = settings.bestrated_recency_halflife;
  const bayesianAvg = (M * C + n * avg) / (M + n);
  const recency = floor + (1 - floor) * Math.exp(-ageDays / hl);
  return bayesianAvg * recency;
}

function previewRecScore(
  styleExactHit: boolean,
  hopJaccard: number,
  collabBonus: boolean,
  settings: AlgorithmSettings,
): number {
  let score = 0;
  if (styleExactHit) score += settings.rec_weight_style_exact;
  score += settings.rec_weight_hop_jaccard * hopJaccard;
  score += settings.rec_weight_quality * 0.8;
  if (collabBonus) score += settings.rec_weight_collab;
  return score;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
  const formatted = display ? display(value) : (isDecimal ? (value > 0 ? '+' : '') + value.toFixed(2) : (value > 0 ? '+' : '') + value.toString());
  
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
        <span className={`text-xs font-mono tabular-nums pl-4 shrink-0 ${value > 0 ? 'text-success' : value < 0 ? 'text-error' : 'text-(--text-muted)'}`}>
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

function ScorePreviewRow({ label, score, highlightColor = 'bg-(--brand)' }: { label: string; score: number; highlightColor?: string }) {
  const pct = Math.min(100, score * 10);
  return (
    <div className="flex items-center justify-between text-xs text-(--text-secondary) bg-(--surface-sunken) px-3 py-1.5 rounded-lg border border-(--border)">
      <span className="w-40 shrink-0 font-medium">{label}</span>
      <div className="flex-1 mx-3 h-1.5 bg-(--surface-hover) rounded-full overflow-hidden">
        <div
          className={`h-full ${highlightColor} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-(--text-primary) w-12 text-right">{score.toFixed(3)}</span>
    </div>
  );
}

const QUALITY_CATEGORIES = [
  { label: 'A) Kennzahlen', max: 30, fields: ['ABV', 'IBU', 'EBC', 'OG', 'FG', 'Ausschlag'] },
  { label: 'B) Dokumentation', max: 30, fields: ['Beschr. >50', 'Beschr. >200', 'Braustil', 'Braunotizen', 'Hopfen (2+)', 'Hefe-Name'] },
  { label: 'C) Zutaten', max: 20, fields: ['Malze (2+)', 'Hopfen (1+)', 'Hefe', 'Wasserprofil'] },
  { label: 'D) Community', max: 30, fields: ['Eigenes Bild', 'Bew. ≥1', 'Bew. ≥3', 'Likes ≥1', 'Gebraut ≥1', 'Gebraut ≥3'] },
];

// ─── Main View ───────────────────────────────────────────────────────────────

export default function AlgorithmsView() {
  const [settings, setSettings] = useState<AlgorithmSettings>({ ...ALGORITHM_DEFAULTS });
  const [loading, setLoading] = useState(true);
  
  const [forumSaving, setForumSaving] = useState(false);
  const [forumMsg, setForumMsg] = useState<string | null>(null);
  const [trendingSaving, setTrendingSaving] = useState(false);
  const [trendingMsg, setTrendingMsg] = useState<string | null>(null);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const [recalcRunning, setRecalcRunning] = useState(false);
  const [bestratedSaving, setBestratedSaving] = useState(false);
  const [bestratedMsg, setBestratedMsg] = useState<string | null>(null);
  const [recSaving, setRecSaving] = useState(false);
  const [recMsg, setRecMsg] = useState<string | null>(null);

  useEffect(() => {
    getAlgorithmSettings()
      .then(s => { setSettings(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const update = useCallback(<K extends keyof AlgorithmSettings>(key: K, value: AlgorithmSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  async function handleSaveForum() {
    setForumSaving(true);
    setForumMsg(null);
    try {
      await saveAlgorithmSettings({
        forum_hot_replies_weight: settings.forum_hot_replies_weight,
        forum_hot_views_divisor:  settings.forum_hot_views_divisor,
        forum_hot_age_exponent:   settings.forum_hot_age_exponent,
        forum_hot_window_days:    settings.forum_hot_window_days,
      });
      setForumMsg('✓ Gespeichert');
      setTimeout(() => setForumMsg(null), 3000);
    } catch (e: any) {
      setForumMsg(`Fehler: ${e.message}`);
    } finally {
      setForumSaving(false);
    }
  }

  async function handleSaveAndRecalcTrending() {
    setTrendingSaving(true);
    setTrendingMsg(null);
    setRecalcMsg(null);
    try {
      await saveAlgorithmSettings({
        trending_likes_weight:  settings.trending_likes_weight,
        trending_brewed_weight: settings.trending_brewed_weight,
        trending_age_exponent:  settings.trending_age_exponent,
      });
      setTrendingMsg('✓ Gespeichert');
    } catch (e: any) {
      setTrendingMsg(`Fehler: ${e.message}`);
      setTrendingSaving(false);
      return;
    }
    
    setRecalcRunning(true);
    try {
      const result = await recalcTrendingWithCustomWeights(
        settings.trending_likes_weight,
        settings.trending_brewed_weight,
        settings.trending_age_exponent,
      );
      if (result) {
         setRecalcMsg(`✓ ${result.updated || 0} Brews rec.`);
      }
    } catch (e: any) {
      setRecalcMsg(`Fehler: ${e.message}`);
    } finally {
      setTrendingSaving(false);
      setRecalcRunning(false);
      setTimeout(() => { setTrendingMsg(null); setRecalcMsg(null); }, 4000);
    }
  }

  async function handleSaveBestRated() {
    setBestratedSaving(true);
    setBestratedMsg(null);
    try {
      await saveAlgorithmSettings({
        bestrated_bayesian_m:       settings.bestrated_bayesian_m,
        bestrated_bayesian_c:       settings.bestrated_bayesian_c,
        bestrated_recency_floor:    settings.bestrated_recency_floor,
        bestrated_recency_halflife: settings.bestrated_recency_halflife,
        bestrated_min_ratings:      settings.bestrated_min_ratings,
      });
      setBestratedMsg('✓ Gespeichert');
      setTimeout(() => setBestratedMsg(null), 3000);
    } catch (e: any) {
      setBestratedMsg(`Fehler: ${e.message}`);
    } finally {
      setBestratedSaving(false);
    }
  }

  async function handleSaveRec() {
    setRecSaving(true);
    setRecMsg(null);
    try {
      await saveAlgorithmSettings({
        rec_weight_style_exact:    settings.rec_weight_style_exact,
        rec_weight_style_family:   settings.rec_weight_style_family,
        rec_weight_hop_jaccard:    settings.rec_weight_hop_jaccard,
        rec_weight_malt_jaccard:   settings.rec_weight_malt_jaccard,
        rec_weight_abv_proximity:  settings.rec_weight_abv_proximity,
        rec_weight_quality:        settings.rec_weight_quality,
        rec_weight_liked_style:    settings.rec_weight_liked_style,
        rec_weight_complexity:     settings.rec_weight_complexity,
        rec_weight_viewed_style:   settings.rec_weight_viewed_style,
        rec_weight_collab:         settings.rec_weight_collab,
        rec_diversity_comfort:     settings.rec_diversity_comfort,
        rec_diversity_exploration: settings.rec_diversity_exploration,
        rec_needs_data_threshold:  settings.rec_needs_data_threshold,
        rec_collab_min_overlap:    settings.rec_collab_min_overlap,
      });
      setRecMsg('✓ Parameter gespeichert');
      setTimeout(() => setRecMsg(null), 3000);
    } catch (e: any) {
      setRecMsg(`Fehler: ${e.message}`);
    } finally {
      setRecSaving(false);
    }
  }

  // Previews
  const forumPreviews = [
    { label: 'Neu (0h, 2R, 50V)', score: previewForumScore(2, 50, 0, settings) },
    { label: 'Jung (12h, 5R, 100V)', score: previewForumScore(5, 100, 12, settings) },
    { label: 'Mittel (48h, 10R, 300V)', score: previewForumScore(10, 300, 48, settings) },
    { label: 'Alt (168h, 20R, 800V)', score: previewForumScore(20, 800, 168, settings) },
  ];

  const trendingPreviews = [
    { label: 'Neu (0d, 3L, 1B)', score: previewTrendingScore(3, 1, 0, settings) },
    { label: 'Jung (7d, 10L, 2B)', score: previewTrendingScore(10, 2, 7, settings) },
    { label: 'Mittel (30d, 30L, 5B)', score: previewTrendingScore(30, 5, 30, settings) },
    { label: 'Alt (180d, 80L, 15B)', score: previewTrendingScore(80, 15, 180, settings) },
  ];

  const bestratedPreviews = [
    { label: 'Neu (0d) 4★ × 3', score: previewBestRatedScore(3, 4.0, 0, settings) },
    { label: '3 Monate 4.5★ × 10', score: previewBestRatedScore(10, 4.5, 90, settings) },
    { label: '1 Jahr 4.8★ × 20', score: previewBestRatedScore(20, 4.8, 365, settings) },
    { label: '3 Jahre 5★ × 50', score: previewBestRatedScore(50, 5.0, 1095, settings) },
  ];

  const recPreviews = [
    { label: 'Exakter Match + Collab', score: previewRecScore(true, 0.5, true, settings) },
    { label: 'Style-Match, kein Collab', score: previewRecScore(true, 0.3, false, settings) },
    { label: 'Nur Hop-Match (50%)', score: previewRecScore(false, 0.5, false, settings) },
    { label: 'Kein Match, kein Collab', score: previewRecScore(false, 0.0, false, settings) },
  ];

  const recWeightTotal = (
    settings.rec_weight_style_exact + settings.rec_weight_style_family +
    settings.rec_weight_hop_jaccard + settings.rec_weight_malt_jaccard +
    settings.rec_weight_abv_proximity + settings.rec_weight_quality +
    settings.rec_weight_liked_style + settings.rec_weight_complexity +
    settings.rec_weight_viewed_style + settings.rec_weight_collab
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-(--brand) border-t-transparent rounded-full animate-spin" />
          <p>Lade Algorithmus-Parameter…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-(--text-primary) tracking-tight">Algorithmen & Scores</h1>
          <p className="text-(--text-muted) text-sm mt-1">
            Anpassbare globale Weightings, Decay-Faktoren & Bayesian Priors
          </p>
        </div>
        <button
          onClick={() => setSettings({ ...ALGORITHM_DEFAULTS })}
          className="flex items-center gap-2 text-xs font-semibold text-(--text-secondary) bg-(--surface) hover:bg-(--surface-hover) border border-(--border) px-3 py-1.5 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Forum Hot Score ─────────────────────────────────────────── */}
        <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-purple-400" />Forum Hot Score
              </h2>
              <p className="text-[11px] text-(--text-muted) leading-relaxed">
                Bestimmt welche Threads als „trending“ im Forum-Sidebar erscheinen.
              </p>
            </div>
            <code className="text-[10px] whitespace-nowrap font-mono bg-(--surface-sunken) text-(--text-secondary) px-2 py-1 rounded hidden sm:block border border-(--border)">
              (R·W + V/D) / (h+2)^E
            </code>
          </div>

          <div className="space-y-3 grow">
            <SettingRow
              label="Replies-Gewicht (Wᵣ)"
              description="Höher = aktive Diskussionen bevorzugt."
              value={settings.forum_hot_replies_weight} onChange={v => update('forum_hot_replies_weight', v)}
              min={0.5} max={10} step={0.5}
            />
            <SettingRow
              label="Views-Teiler (Dᵥ)"
              description="Kleiner = Aufrufe zählen mehr."
              value={settings.forum_hot_views_divisor} onChange={v => update('forum_hot_views_divisor', v)}
              min={1} max={100} step={1}
            />
            <SettingRow
              label="Zerfalls-Exponent (E)"
              description="Größer = ältere Threads verfallen schneller."
              value={settings.forum_hot_age_exponent} onChange={v => update('forum_hot_age_exponent', v)}
              min={0.5} max={3} step={0.1}
            />
            <SettingRow
              label="Look-Back-Fenster"
              description="Max. Alter für Trending-Berücksichtigung."
              value={settings.forum_hot_window_days} onChange={v => update('forum_hot_window_days', v)}
              min={3} max={60} step={1} display={v => '+' + v + 'd'}
            />
          </div>

          <div>
            <h3 className="text-[10px] text-(--text-disabled) uppercase tracking-wider font-bold mb-3">Live-Vorschau</h3>
            <div className="space-y-1.5">
              {forumPreviews.map(p => <ScorePreviewRow key={p.label} {...p} highlightColor="bg-purple-500" />)}
            </div>
          </div>

          <div className="pt-4 border-t border-(--border) flex items-center justify-between mt-auto">
            <div className="h-6 flex items-center">
              {forumMsg && (
                <span className={`text-xs font-semibold ${forumMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                  {forumMsg}
                </span>
              )}
            </div>
            <button
              onClick={handleSaveForum}
              disabled={forumSaving}
              className="px-4 py-1.5 bg-(--surface-hover) hover:bg-purple-500/10 hover:text-purple-400 border border-(--border) rounded-lg font-semibold text-xs transition disabled:opacity-50"
            >
              {forumSaving ? 'Lädt...' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* ── Discover Trending Score ─────────────────────────────────────────── */}
        <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />Discover Trending Score
              </h2>
              <p className="text-[11px] text-(--text-muted) leading-relaxed">
                Ranking der „Trending“-Rezepte auf der Discover Page.
              </p>
            </div>
            <code className="text-[10px] whitespace-nowrap font-mono bg-(--surface-sunken) text-(--text-secondary) px-2 py-1 rounded hidden sm:block border border-(--border)">
              (L·W + B·W) / (d+2)^E
            </code>
          </div>

          <div className="space-y-3 grow">
            <SettingRow
              label="Likes-Gewicht (W_L)"
              description="Einfluss von Likes auf den Trending Score."
              value={settings.trending_likes_weight} onChange={v => update('trending_likes_weight', v)}
              min={0} max={10} step={0.5}
            />
            <SettingRow
              label="Gebraut-Gewicht (W_B)"
              description="Höher = Praxis-Beweis belohnen."
              value={settings.trending_brewed_weight} onChange={v => update('trending_brewed_weight', v)}
              min={0} max={20} step={0.5}
            />
            <SettingRow
              label="Zerfalls-Exponent (E)"
              description="Größer = ältere Rezepte verfallen schneller."
              value={settings.trending_age_exponent} onChange={v => update('trending_age_exponent', v)}
              min={0.5} max={3} step={0.1}
            />
          </div>

          <div>
            <h3 className="text-[10px] text-(--text-disabled) uppercase tracking-wider font-bold mb-3">Live-Vorschau</h3>
            <div className="space-y-1.5">
              {trendingPreviews.map(p => <ScorePreviewRow key={p.label} {...p} highlightColor="bg-cyan-500" />)}
            </div>
          </div>

          <div className="pt-4 border-t border-(--border) flex items-center justify-between mt-auto gap-2">
            <div className="flex flex-col h-8 justify-center">
              {trendingMsg && (
                <span className={`text-xs font-semibold ${trendingMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                  {trendingMsg}
                </span>
              )}
              {recalcMsg && (
                <span className={`text-xs font-semibold ${recalcMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                  {recalcMsg}
                </span>
              )}
            </div>
            <button
              onClick={handleSaveAndRecalcTrending}
              disabled={trendingSaving || recalcRunning}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {(trendingSaving || recalcRunning) ? (
                <><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />Lädt...</>
              ) : 'Speichern & Recalc'}
            </button>
          </div>
        </div>

      </div>

      {/* ── Best-Rated Score ─────────────────────────────────────────── */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" />Best-Rated Score (Bayesian)
            </h2>
            <p className="text-[11px] text-(--text-muted) leading-relaxed">
              Gewichteter Durchschnitt mit Bayesian Smoothing und Recency-Decay.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-3">
            <SettingRow
                label="Bayesian M (Mindest-Votes)" description="Anzahl Votes ab der ein Brew valid ist."
                value={settings.bestrated_bayesian_m} onChange={v => update('bestrated_bayesian_m', v)}
                min={1} max={100} step={1}
            />
            <SettingRow
                label="Bayesian C (Prior)" description="Globaler Prior-Mittelwert."
                value={settings.bestrated_bayesian_c} onChange={v => update('bestrated_bayesian_c', v)}
                min={1} max={5} step={0.05}
            />
            <SettingRow
                label="Recency Floor" description="Minimalgewicht für sehr alte Brews."
                value={settings.bestrated_recency_floor} onChange={v => update('bestrated_recency_floor', v)}
                min={0} max={1} step={0.01}
            />
            <SettingRow
                label="Recency Halflife" description="Tage bis 50% Decay erreicht ist."
                value={settings.bestrated_recency_halflife} onChange={v => update('bestrated_recency_halflife', v)}
                min={30} max={730} step={10} display={v => '+' + v + 'd'}
            />
            <SettingRow
                label="Min. Bewertungen" description="Für die Sichtbarkeit in Listen."
                value={settings.bestrated_min_ratings} onChange={v => update('bestrated_min_ratings', v)}
                min={1} max={20} step={1}
            />
          </div>

          <div className="flex flex-col">
            <h3 className="text-[10px] text-(--text-disabled) uppercase tracking-wider font-bold mb-3">Live-Vorschau</h3>
            <div className="space-y-1.5 grow">
              {bestratedPreviews.map(p => <ScorePreviewRow key={p.label} {...p} highlightColor="bg-amber-500" />)}
            </div>

            <div className="pt-4 mt-6 border-t border-(--border) flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="h-6 flex items-center">
                {bestratedMsg && (
                  <span className={`text-xs font-semibold ${bestratedMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                    {bestratedMsg}
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveBestRated}
                disabled={bestratedSaving}
                className="w-full lg:w-auto px-4 py-1.5 bg-(--surface-hover) hover:bg-amber-500/10 hover:text-amber-500 border border-(--border) rounded-lg font-semibold text-xs transition disabled:opacity-50"
              >
                {bestratedSaving ? 'Lädt...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Personalisierung ─────────────────────────────────────────── */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-(--brand)" />Personalisierungs-Engine
            </h2>
            <p className="text-[11px] text-(--text-muted) leading-relaxed">
              3-stufige Engine: Content-based → Implicit Signals → Collaborative Filtering.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h3 className="text-[10px] text-(--text-disabled) uppercase tracking-wider font-bold mb-4 flex items-center justify-between">
              <span>Feature Weights</span>
              <span className="text-(--brand) font-mono">Sum: {recWeightTotal.toFixed(2)}</span>
            </h3>
            <div className="space-y-2">
              <SettingRow label="Exakter Style-Match" value={settings.rec_weight_style_exact} onChange={v => update('rec_weight_style_exact', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Style-Familie" value={settings.rec_weight_style_family} onChange={v => update('rec_weight_style_family', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Hopfen-Jaccard" value={settings.rec_weight_hop_jaccard} onChange={v => update('rec_weight_hop_jaccard', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Malz-Jaccard" value={settings.rec_weight_malt_jaccard} onChange={v => update('rec_weight_malt_jaccard', v)} min={0} max={2} step={0.05} />
              <SettingRow label="ABV-Nähe" value={settings.rec_weight_abv_proximity} onChange={v => update('rec_weight_abv_proximity', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Quality Score Base" value={settings.rec_weight_quality} onChange={v => update('rec_weight_quality', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Liked-Style Bonus" value={settings.rec_weight_liked_style} onChange={v => update('rec_weight_liked_style', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Viewed-Style Bonus" value={settings.rec_weight_viewed_style} onChange={v => update('rec_weight_viewed_style', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Komplexitäts-Match" value={settings.rec_weight_complexity} onChange={v => update('rec_weight_complexity', v)} min={0} max={2} step={0.05} />
              <SettingRow label="Collaborative Filt." value={settings.rec_weight_collab} onChange={v => update('rec_weight_collab', v)} min={0} max={2} step={0.05} />
            </div>
          </div>

          <div className="flex flex-col h-full bg-(--surface-sunken) p-5 rounded-xl border border-(--border)">
            <h3 className="text-[10px] text-(--text-disabled) uppercase tracking-wider font-bold mb-4">Ergebnis-Mix & Thresholds</h3>
            <div className="space-y-4 mb-8">
              <SettingRow
                label="Comfort-Anteil (%)" description="Bekannte Styles (Comfort Zone)."
                value={settings.rec_diversity_comfort} onChange={v => update('rec_diversity_comfort', v)}
                min={0} max={1} step={0.05} display={v => Math.round(v * 100) + '%'}
              />
              <SettingRow
                label="Exploration-Anteil (%)" description="Anteil neuer/entfernter Styles."
                value={settings.rec_diversity_exploration} onChange={v => update('rec_diversity_exploration', v)}
                min={0} max={1} step={0.05} display={v => Math.round(v * 100) + '%'}
              />
              <SettingRow
                label="Needs-Data Thresh." description="Min. Aktionen bevor Empfehlungen starten."
                value={settings.rec_needs_data_threshold} onChange={v => update('rec_needs_data_threshold', v)}
                min={1} max={20} step={1} display={v => '+' + v}
              />
              <SettingRow
                label="Collab Min Overlap" description="Min. gemeinsame Biere für Matches."
                value={settings.rec_collab_min_overlap} onChange={v => update('rec_collab_min_overlap', v)}
                min={1} max={10} step={1} display={v => '+' + v}
              />
            </div>
            
            <div className="mb-4">
              <h3 className="text-[10px] text-(--text-disabled) uppercase tracking-wider font-bold mb-3">Live-Vorschau</h3>
              <div className="space-y-1.5">
                {recPreviews.map(p => <ScorePreviewRow key={p.label} {...p} highlightColor="bg-(--brand)" />)}
              </div>
            </div>

            <div className="pt-4 border-t border-(--border) flex items-center justify-between mt-auto">
              <div className="h-6 flex items-center">
                {recMsg && (
                  <span className={`text-xs font-semibold ${recMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                    {recMsg}
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveRec}
                disabled={recSaving}
                className="px-4 py-1.5 bg-(--brand) hover:opacity-90 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50"
              >
                {recSaving ? 'Lädt...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quality Score Allgemein ─────────────────────────────────────────── */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-(--text-primary) mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-400" />Quality Score Aufbau
            </h2>
            <p className="text-[11px] text-(--text-muted) leading-relaxed">
               Maximum: 110 Punkte → normalisiert auf 100 (in DB-Funktion fest definiert).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUALITY_CATEGORIES.map(cat => (
            <div key={cat.label} className="bg-(--surface-sunken) rounded-lg p-4 border border-(--border) flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-(--text-primary)">{cat.label}</p>
                <span className="text-[10px] font-mono bg-(--surface-hover) text-(--brand) px-1.5 py-0.5 rounded">max. {cat.max}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 grow">
                {cat.fields.map(f => (
                  <span key={f} className="text-[10px] font-medium bg-(--surface-hover) text-(--text-secondary) px-2 py-0.5 rounded border border-(--border-hover)">
                    {f} +5
                  </span>
                ))}
              </div>
              <div className="h-1 bg-(--surface-hover) rounded-full overflow-hidden mt-auto">
                <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${(cat.max / 110) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-(--surface-sunken) rounded-lg p-3 border border-(--border) flex items-center justify-between">
          <code className="text-[10px] font-mono text-(--text-secondary)">quality_score = LEAST(100, ROUND(raw_score / 110.0 × 100))</code>
        </div>
      </div>
    </div>
  );
}