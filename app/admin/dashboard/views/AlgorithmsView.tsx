'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAlgorithmSettings,
  saveAlgorithmSettings,
  recalcTrendingWithCustomWeights,
} from '@/lib/actions/brew-admin-actions';
import { ALGORITHM_DEFAULTS, AlgorithmSettings } from '@/lib/algorithm-settings';
import { Cpu, MessageSquare, TrendingUp, BarChart3, RotateCcw, Info, Star, Sparkles } from 'lucide-react';

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
  n: number,          // Anzahl Bewertungen
  avg: number,        // Durchschnittsbewertung
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
  score += settings.rec_weight_quality * 0.8;  // assume good quality
  if (collabBonus) score += settings.rec_weight_collab;
  return score;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SliderRow({
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
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 py-3 border-b border-zinc-800 last:border-0">
      <div className="sm:w-60 shrink-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3 flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-500"
        />
        <span className="font-mono text-cyan-400 text-sm w-12 text-right shrink-0">
          {display ? display(value) : value}
        </span>
      </div>
    </div>
  );
}

function ScorePreviewRow({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, score * 10);
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-400">
      <span className="w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-zinc-300 w-10 text-right">{score.toFixed(3)}</span>
    </div>
  );
}

// ─── Quality Score breakdown (static, read-only) ─────────────────────────────

const QUALITY_CATEGORIES = [
  { label: 'A) Kennzahlen (ABV, IBU, EBC, OG, FG, Volumen)', max: 30, fields: ['ABV', 'IBU', 'EBC', 'OG', 'FG', 'Ausschlag'] },
  { label: 'B) Dokumentation (Beschreibung, Stil, Notizen, Hops, Hefe)', max: 30, fields: ['Beschr. >50', 'Beschr. >200', 'Braustil', 'Braunotizen', 'Hopfen (2+)', 'Hefe-Name'] },
  { label: 'C) Zutaten (Malze, Hopfen, Hefe, Wasser)', max: 20, fields: ['Malze (2+)', 'Hopfen (1+)', 'Hefe', 'Wasserprofil'] },
  { label: 'D) Community (Bild, Bewertungen, Likes, Gebraut)', max: 30, fields: ['Eigenes Bild', 'Bew. ≥1', 'Bew. ≥3', 'Likes ≥1', 'Gebraut ≥1', 'Gebraut ≥3'] },
];

// ─── Main View ────────────────────────────────────────────────────────────────

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
      setForumMsg('✅ Forum-Parameter gespeichert!');
    } catch (e: any) {
      setForumMsg(`❌ Fehler: ${e.message}`);
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
      setTrendingMsg('✅ Parameter gespeichert!');
    } catch (e: any) {
      setTrendingMsg(`❌ Fehler: ${e.message}`);
      setTrendingSaving(false);
      return;
    }
    // Recalc
    setRecalcRunning(true);
    try {
      const result = await recalcTrendingWithCustomWeights(
        settings.trending_likes_weight,
        settings.trending_brewed_weight,
        settings.trending_age_exponent,
      );
      setRecalcMsg(`✅ ${result.updated} Brews neu berechnet.`);
    } catch (e: any) {
      setRecalcMsg(`❌ Fehler beim Neuberechnen: ${e.message}`);
    } finally {
      setTrendingSaving(false);
      setRecalcRunning(false);
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
      setBestratedMsg('✅ Best-Rated-Parameter gespeichert!');
    } catch (e: any) {
      setBestratedMsg(`❌ Fehler: ${e.message}`);
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
      setRecMsg('✅ Personalisierungs-Parameter gespeichert!');
    } catch (e: any) {
      setRecMsg(`❌ Fehler: ${e.message}`);
    } finally {
      setRecSaving(false);
    }
  }

  // Live preview examples
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
    { label: 'Exakter Style-Match + Collab', score: previewRecScore(true, 0.5, true, settings) },
    { label: 'Style-Match, kein Collab', score: previewRecScore(true, 0.3, false, settings) },
    { label: 'Nur Hop-Ähnlichkeit (50%)', score: previewRecScore(false, 0.5, false, settings) },
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
      <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
        <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        Lade Algorithmus-Parameter…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Algorithmen & Scores
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Anpassbare Parameter für Forum- und Discover-Ranking
          </p>
        </div>
        <button
          onClick={() => setSettings({ ...ALGORITHM_DEFAULTS })}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Defaults
        </button>
      </div>

      {/* ── Forum Hot Score ──────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Forum Hot Score</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl">
            Bestimmt welche Threads als „trending" im Forum-Sidebar erscheinen.
          </p>
          <code className="mt-2 inline-block text-xs font-mono bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300">
            score = (replies × W<sub>r</sub> + views ÷ D<sub>v</sub>) / (ageH + 2)<sup>E</sup>
          </code>
        </div>

        <div className="p-5 space-y-0">
          <SliderRow
            label="Replies-Gewicht (Wᵣ)"
            description="Multiplikator für Antworten. Höher = aktive Diskussionen bevorzugt."
            value={settings.forum_hot_replies_weight}
            onChange={v => update('forum_hot_replies_weight', v)}
            min={0.5} max={10} step={0.5}
          />
          <SliderRow
            label="Views-Teiler (Dᵥ)"
            description="Teiling der View-Anzahl. Kleiner = Aufrufe zählen mehr."
            value={settings.forum_hot_views_divisor}
            onChange={v => update('forum_hot_views_divisor', v)}
            min={1} max={100} step={1}
          />
          <SliderRow
            label="Zerfalls-Exponent (E)"
            description="Zeitverfall. Größer = ältere Threads werden schneller irrelevant."
            value={settings.forum_hot_age_exponent}
            onChange={v => update('forum_hot_age_exponent', v)}
            min={0.5} max={3} step={0.1}
            display={v => v.toFixed(1)}
          />
          <SliderRow
            label="Look-Back-Fenster (Tage)"
            description={'Nur Threads aus diesem Zeitraum werden fuer "Trending" beruecksichtigt.'}
            value={settings.forum_hot_window_days}
            onChange={v => update('forum_hot_window_days', v)}
            min={3} max={60} step={1}
          />
        </div>

        {/* Preview */}
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Live-Vorschau (L = Likes, R = Replies, V = Views, B = Gebraut)</p>
          {forumPreviews.map(p => <ScorePreviewRow key={p.label} {...p} />)}
        </div>

        {/* Save */}
        <div className="px-5 pb-5 flex items-center gap-4 border-t border-zinc-800 pt-4">
          <button
            onClick={handleSaveForum}
            disabled={forumSaving}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition"
          >
            {forumSaving ? 'Speichere…' : '💾 Forum-Parameter speichern'}
          </button>
          {forumMsg && (
            <span className={`text-sm font-bold ${forumMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {forumMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Discover Trending Score ──────────────────────────────────────────── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Discover Trending Score</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl">
            Bestimmt die Reihenfolge der „Trending"-Rezepte auf der Discover Page.
          </p>
          <code className="mt-2 inline-block text-xs font-mono bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300">
            score = (likes × W<sub>L</sub> + times_brewed × W<sub>B</sub>) / (ageDays + 2)<sup>E</sup>
          </code>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500/80">
              „Speichern & Neu berechnen" aktualisiert alle öffentlichen Brews sofort.
              Manuell gesetzte Trending-Overrides (im Content-Tab) bleiben unberührt.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-0">
          <SliderRow
            label="Likes-Gewicht (W_L)"
            description="Einfluss von Likes auf den Trending Score."
            value={settings.trending_likes_weight}
            onChange={v => update('trending_likes_weight', v)}
            min={0} max={10} step={0.5}
          />
          <SliderRow
            label="Gebraut-Gewicht (W_B)"
            description="Einfluss von 'Gebraut von anderen' auf Trending. Höher = Praxis-Beweis belohnen."
            value={settings.trending_brewed_weight}
            onChange={v => update('trending_brewed_weight', v)}
            min={0} max={20} step={0.5}
          />
          <SliderRow
            label="Zerfalls-Exponent (E)"
            description="Zeitverfall. Größer = ältere Rezepte verlieren schneller an Sichtbarkeit."
            value={settings.trending_age_exponent}
            onChange={v => update('trending_age_exponent', v)}
            min={0.5} max={3} step={0.1}
            display={v => v.toFixed(1)}
          />
        </div>

        {/* Preview */}
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Live-Vorschau (L = Likes, B = Gebraut, d = Tage alt)</p>
          {trendingPreviews.map(p => <ScorePreviewRow key={p.label} {...p} />)}
        </div>

        {/* Save & Recalc */}
        <div className="px-5 pb-5 flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-4">
          <button
            onClick={handleSaveAndRecalcTrending}
            disabled={trendingSaving || recalcRunning}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition flex items-center gap-2"
          >
            {(trendingSaving || recalcRunning)
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Berechne…</>
              : '⚡ Speichern & Trending neu berechnen'
            }
          </button>
          <div className="flex flex-col gap-1">
            {trendingMsg && (
              <span className={`text-sm font-bold ${trendingMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {trendingMsg}
              </span>
            )}
            {recalcMsg && (
              <span className={`text-sm font-bold ${recalcMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {recalcMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Best-Rated Score (Bayesian) ──────────────────────────────────────── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Best-Rated Score (Bayesian)</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl">
            Gewichteter Durchschnitt mit Bayesian Smoothing und Recency-Decay.
            Brews mit wenigen Bewertungen werden zum globalen Mittelwert gezogen.
          </p>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-8">
          {/* Sliders */}
          <div className="space-y-5">
            {/* Bayesian M */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Bayesian M (Mindest-Votes)</span>
                <span className="text-amber-400 font-mono">{settings.bestrated_bayesian_m}</span>
              </div>
              <input type="range" min={1} max={100} step={1}
                value={settings.bestrated_bayesian_m}
                onChange={e => setSettings(s => ({ ...s, bestrated_bayesian_m: +e.target.value }))}
                className="w-full accent-amber-500" />
              <p className="text-xs text-zinc-500 mt-1">Anzahl Votes, ab denen ein Brew &quot;vertrauenswürdig&quot; ist</p>
            </div>
            {/* Bayesian C */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Bayesian C (Prior-Mittelwert)</span>
                <span className="text-amber-400 font-mono">{settings.bestrated_bayesian_c.toFixed(2)}</span>
              </div>
              <input type="range" min={1} max={5} step={0.05}
                value={settings.bestrated_bayesian_c}
                onChange={e => setSettings(s => ({ ...s, bestrated_bayesian_c: +e.target.value }))}
                className="w-full accent-amber-500" />
              <p className="text-xs text-zinc-500 mt-1">Globaler &quot;Prior&quot; Mittelwert für neue Brews</p>
            </div>
            {/* Recency Floor */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Recency Floor (Min-Gewicht)</span>
                <span className="text-amber-400 font-mono">{settings.bestrated_recency_floor.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01}
                value={settings.bestrated_recency_floor}
                onChange={e => setSettings(s => ({ ...s, bestrated_recency_floor: +e.target.value }))}
                className="w-full accent-amber-500" />
              <p className="text-xs text-zinc-500 mt-1">Minimalgewicht für sehr alte Brews</p>
            </div>
            {/* Recency Halflife */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Recency Halflife (Tage)</span>
                <span className="text-amber-400 font-mono">{settings.bestrated_recency_halflife}d</span>
              </div>
              <input type="range" min={30} max={730} step={10}
                value={settings.bestrated_recency_halflife}
                onChange={e => setSettings(s => ({ ...s, bestrated_recency_halflife: +e.target.value }))}
                className="w-full accent-amber-500" />
              <p className="text-xs text-zinc-500 mt-1">Nach dieser Zeit hat Recency-Gewicht 50 % verloren</p>
            </div>
            {/* Min Ratings */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">Min. Bewertungen (Sichtbarkeit)</span>
                <span className="text-amber-400 font-mono">{settings.bestrated_min_ratings}</span>
              </div>
              <input type="range" min={1} max={20} step={1}
                value={settings.bestrated_min_ratings}
                onChange={e => setSettings(s => ({ ...s, bestrated_min_ratings: +e.target.value }))}
                className="w-full accent-amber-500" />
              <p className="text-xs text-zinc-500 mt-1">Mindestanzahl Bewertungen für Best-Rated Liste</p>
            </div>
          </div>
          {/* Preview */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Live-Vorschau</p>
            <div className="space-y-2">
              {bestratedPreviews.map(p => (
                <div key={p.label} className="flex justify-between items-center bg-zinc-800 rounded px-3 py-2">
                  <span className="text-xs text-zinc-400">{p.label}</span>
                  <span className="text-sm font-mono text-amber-400">{p.score.toFixed(3)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button
                onClick={handleSaveBestRated}
                disabled={bestratedSaving}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {bestratedSaving ? 'Speichere…' : 'Best-Rated Parameter speichern'}
              </button>
              {bestratedMsg && (
                <span className={`mt-2 block text-sm font-bold ${bestratedMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                  {bestratedMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Personalisierung / Empfehlungs-Engine ────────────────────────────── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Personalisierung (Empfehlungs-Engine)</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl">
            3-stufige Engine: Content-based → Implicit Signals → Collaborative Filtering.
            Gewichte steuern, welche Ähnlichkeitssignale wie stark einflussreich sind.
          </p>
        </div>
        <div className="p-5 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Weight sliders */}
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Gewichte (Summe: {recWeightTotal.toFixed(2)})</p>
              {([
                ['rec_weight_style_exact',    'Exakter Style-Match',    'text-purple-400'],
                ['rec_weight_style_family',   'Style-Familie',          'text-purple-400'],
                ['rec_weight_hop_jaccard',    'Hop-Jaccard',            'text-green-400'],
                ['rec_weight_malt_jaccard',   'Malz-Jaccard',           'text-green-400'],
                ['rec_weight_abv_proximity',  'ABV-Nähe',               'text-yellow-400'],
                ['rec_weight_quality',        'Quality Score',          'text-amber-400'],
                ['rec_weight_liked_style',    'Liked-Style Bonus',      'text-pink-400'],
                ['rec_weight_complexity',     'Komplexitäts-Match',     'text-blue-400'],
                ['rec_weight_viewed_style',   'Viewed-Style Bonus',     'text-indigo-400'],
                ['rec_weight_collab',         'Collaborative Filtering','text-cyan-400'],
              ] as [keyof typeof settings, string, string][]).map(([key, label, color]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{label}</span>
                    <span className={`font-mono ${color}`}>{(settings[key] as number).toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={2} step={0.05}
                    value={settings[key] as number}
                    onChange={e => setSettings(s => ({ ...s, [key]: +e.target.value }))}
                    className="w-full accent-purple-500" />
                </div>
              ))}
            </div>
            {/* Diversity + threshold sliders + preview */}
            <div className="space-y-5">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Ergebnis-Mix</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Comfort-Anteil (%)</span>
                      <span className="text-cyan-400 font-mono">{Math.round(settings.rec_diversity_comfort * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={1} step={0.05}
                      value={settings.rec_diversity_comfort}
                      onChange={e => setSettings(s => ({ ...s, rec_diversity_comfort: +e.target.value }))}
                      className="w-full accent-cyan-500" />
                    <p className="text-xs text-zinc-500 mt-1">Anteil bekannter Styles (Comfort Zone)</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Exploration-Anteil (%)</span>
                      <span className="text-cyan-400 font-mono">{Math.round(settings.rec_diversity_exploration * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={1} step={0.05}
                      value={settings.rec_diversity_exploration}
                      onChange={e => setSettings(s => ({ ...s, rec_diversity_exploration: +e.target.value }))}
                      className="w-full accent-cyan-500" />
                    <p className="text-xs text-zinc-500 mt-1">Anteil neuer / unbekannter Styles</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Schwellenwerte</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Needs-Data Threshold</span>
                      <span className="text-zinc-300 font-mono">{settings.rec_needs_data_threshold}</span>
                    </div>
                    <input type="range" min={1} max={20} step={1}
                      value={settings.rec_needs_data_threshold}
                      onChange={e => setSettings(s => ({ ...s, rec_needs_data_threshold: +e.target.value }))}
                      className="w-full accent-zinc-500" />
                    <p className="text-xs text-zinc-500 mt-1">Min. Ratings bevor personalisiert wird</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">Collab Min-Overlap</span>
                      <span className="text-zinc-300 font-mono">{settings.rec_collab_min_overlap}</span>
                    </div>
                    <input type="range" min={1} max={10} step={1}
                      value={settings.rec_collab_min_overlap}
                      onChange={e => setSettings(s => ({ ...s, rec_collab_min_overlap: +e.target.value }))}
                      className="w-full accent-zinc-500" />
                    <p className="text-xs text-zinc-500 mt-1">Gemeinsame Brews für Collab Filtering</p>
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Live-Vorschau</p>
                <div className="space-y-2">
                  {recPreviews.map(p => (
                    <div key={p.label} className="flex justify-between items-center bg-zinc-800 rounded px-3 py-2">
                      <span className="text-xs text-zinc-400">{p.label}</span>
                      <span className="text-sm font-mono text-cyan-400">{p.score.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveRec}
                disabled={recSaving}
                className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {recSaving ? 'Speichere…' : 'Personalisierungs-Parameter speichern'}
              </button>
              {recMsg && (
                <span className={`block text-sm font-bold ${recMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                  {recMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quality Score Übersicht (read-only) ──────────────────────────────── */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Quality Score Aufbau</h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl">
            Der Quality Score (0–100) berechnet sich aus 4 Kategorien mit je 5 Punkten pro Kriterium.
            Maximum: 110 Punkte → normalisiert auf 100.
          </p>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500">
              Diese Parameter sind in der Datenbank-Funktion definiert. Für Änderungen
              wäre eine DB-Migration notwendig. Den <strong className="text-white">Mindest-Score</strong> für
              die Discover Page kannst du in <em>Einstellungen → Discover Page</em> anpassen.
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUALITY_CATEGORIES.map(cat => (
            <div key={cat.label} className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">{cat.label.split(' ')[0]}</p>
                <span className="text-xs font-mono bg-zinc-800 text-cyan-400 px-2 py-0.5 rounded">
                  max. {cat.max} Pkt.
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-3">{cat.label.replace(/^[A-D]\) /, '')}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.fields.map(f => (
                  <span key={f} className="text-[10px] font-medium bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
                    {f} +5
                  </span>
                ))}
              </div>
              <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500/60 rounded-full"
                  style={{ width: `${(cat.max / 110) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Normalisierungsformel</p>
              <code className="text-xs font-mono text-zinc-400">
                quality_score = LEAST(100, ROUND(raw_score / 110.0 × 100))
              </code>
            </div>
            <span className="text-2xl font-black text-amber-400">= 0–100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
