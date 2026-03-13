/**
 * Algorithm Settings
 * ------------------
 * Liest Algorithmus-Parameter aus der platform_settings-Tabelle.
 * Dient als gemeinsamer Utility für forum-service.ts (Server) und
 * den Admin-Actions (brew-admin-actions.ts).
 *
 * Keine 'use server'-Direktive — kann von beliebigem Server-Code importiert werden.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Defaults — gelten wenn kein DB-Eintrag vorhanden */
export const ALGORITHM_DEFAULTS = {
  // ── Forum Hot Score ────────────────────────────────────────────
  forum_hot_replies_weight: 3,
  forum_hot_views_divisor: 20,
  forum_hot_age_exponent: 1.5,
  forum_hot_window_days: 14,

  // ── Brew Trending Score (DB-Cronjob + JS-Recalc) ─────────────
  trending_likes_weight: 1,
  trending_brewed_weight: 3,
  trending_age_exponent: 1.5,

  // ── Best-Rated Score (Bayesian Average + Recency Decay) ───────
  bestrated_bayesian_m: 3,          // Min-Vote-Anker (Stimmgewicht des Priors)
  bestrated_bayesian_c: 3.5,        // Prior-Schnitt (geschätzter globaler Durchschnitt)
  bestrated_recency_floor: 0.4,     // Untergrenze des Recency-Faktors (0–1)
  bestrated_recency_halflife: 45,   // Alter in Tagen, bei dem der Recency-Faktor auf ~62 % sinkt
  bestrated_min_ratings: 2,         // Mindest-Bewertungsanzahl für Aufnahme

  // ── Personalisierung – Ähnlichkeits-Gewichte (Summe ≈ 1.10) ──
  rec_weight_style_exact: 0.35,     // Exaktes Style-Match (eigene Brews)
  rec_weight_style_family: 0.20,    // Style-Familie (BJCP-Gruppe)
  rec_weight_hop_jaccard: 0.20,     // Hopfen-Überschneidung (Jaccard)
  rec_weight_malt_jaccard: 0.10,    // Malz-Überschneidung (Jaccard)
  rec_weight_abv_proximity: 0.10,   // ABV-Nähe (±5% Toleranz)
  rec_weight_quality: 0.05,         // Quality-Score-Bonus (0–100 normiert)
  rec_weight_liked_style: 0.05,     // Bonus für gelikte Styles
  rec_weight_complexity: 0.03,      // Bonus für Komplexitäts-Match
  rec_weight_viewed_style: 0.02,    // Implizites Signal: angeschauter Style
  rec_weight_collab: 0.15,          // Collaborative-Filtering-Bonus (Stufe C)

  // ── Personalisierung – Diversitäts-Mix ────────────────────────
  rec_diversity_comfort: 0.80,      // Anteil "Comfort"-Ergebnisse (0–1)
  rec_diversity_exploration: 0.10,  // Anteil "Exploration" (neues Style-Family)
  // freshness = rest (1 - comfort - exploration)

  // ── Personalisierung – Schwellen ──────────────────────────────
  rec_needs_data_threshold: 3,      // Min. eigene Brews für Personalisierung
  rec_collab_min_overlap: 2,        // Min. gemeinsame Likes für "ähnlicher User"

  // ── Plausibility Engine (v2) ──────────────────────────────────
  plausibility_max_bottles_window: 3,          // ab wann gilt man als Supermarkt-Troll (Signal 1)
  plausibility_window_hours: 2,                // Window in Stunden (Signal 1)
  plausibility_fast_submit_penalty: 0.30,      // Abzug (Signal 3)
  plausibility_fast_submit_min_ms_complex: 3000,
  plausibility_fast_submit_min_ms_simple: 1500,
  plausibility_unplausible_time_penalty: 0.10, // Abzug (Signal 4)
  plausibility_shadowban_threshold: 0.20,      // Schwelle für is_shadowbanned

  // ── CIS Engine – Kern-Modell ──────────────────────────────────
  cis_base_score:               0.30,   // Startscore jeder QR-Session
  cis_fridge_surfing_penalty:  -0.40,   // Andere Flasche in < session_window gescannt
  cis_dwell_time_bonus:         0.40,   // Verweildauer >= threshold Sekunden
  cis_last_in_session_bonus:    0.20,   // Kein Folgescan in session_window
  cis_session_window_minutes:   15,     // Wie gross das Session-Fenster ist (min)
  cis_dwell_time_threshold_s:   180,    // Verweildauer-Schwelle (Sekunden)

  // ── CIS Engine – Environment-Kontext ─────────────────────────
  cis_dynamic_time_bonus:       0.15,   // Scan in typischer Trinkzeit (±2h)
  cis_dynamic_time_penalty:    -0.15,   // Scan weit weg von typischer Zeit (>5h)
  cis_dynamic_temp_bonus:       0.05,   // Passende Außentemperatur (±5°C)
  cis_dynamic_temp_penalty:    -0.05,   // Unpassende Temp (>12°C Abw.)
  cis_weekend_holiday_bonus:    0.05,   // Freitagabend / Wochenende / Feiertag
  cis_rating_bonus:             0.80,   // Bonus für abgegebenes Rating (skaliert mit Plausibilitäts-Score)
  cis_btb_bonus:                0.80,   // Bonus für Beat The Brewer Teilnahme (skaliert mit Plausibilitäts-Score)
  cis_vibecheck_bonus:          0.30,   // Bonus für VibeCheck (skaliert mit Plausibilitäts-Score)
};

export interface AlgorithmSettings {
  forum_hot_replies_weight: number;
  forum_hot_views_divisor: number;
  forum_hot_age_exponent: number;
  forum_hot_window_days: number;
  trending_likes_weight: number;
  trending_brewed_weight: number;
  trending_age_exponent: number;
  bestrated_bayesian_m: number;
  bestrated_bayesian_c: number;
  bestrated_recency_floor: number;
  bestrated_recency_halflife: number;
  bestrated_min_ratings: number;
  rec_weight_style_exact: number;
  rec_weight_style_family: number;
  rec_weight_hop_jaccard: number;
  rec_weight_malt_jaccard: number;
  rec_weight_abv_proximity: number;
  rec_weight_quality: number;
  rec_weight_liked_style: number;
  rec_weight_complexity: number;
  rec_weight_viewed_style: number;
  rec_weight_collab: number;
  rec_diversity_comfort: number;
  rec_diversity_exploration: number;
  rec_needs_data_threshold: number;
  rec_collab_min_overlap: number;
  // Plausibility Engine
  plausibility_max_bottles_window: number;
  plausibility_window_hours: number;
  plausibility_fast_submit_penalty: number;
  plausibility_fast_submit_min_ms_complex: number;
  plausibility_fast_submit_min_ms_simple: number;
  plausibility_unplausible_time_penalty: number;
  plausibility_shadowban_threshold: number;
  // CIS Engine
  cis_base_score: number;
  cis_fridge_surfing_penalty: number;
  cis_dwell_time_bonus: number;
  cis_last_in_session_bonus: number;
  cis_session_window_minutes: number;
  cis_dwell_time_threshold_s: number;
  cis_dynamic_time_bonus: number;
  cis_dynamic_time_penalty: number;
  cis_dynamic_temp_bonus: number;
  cis_dynamic_temp_penalty: number;
  cis_weekend_holiday_bonus: number;
  cis_rating_bonus: number;
  cis_btb_bonus: number;
  cis_vibecheck_bonus: number;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role credentials');
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Liest alle Algorithmus-Parameter aus platform_settings. Fehlende Keys → Defaults. */
export async function getAlgorithmSettings(): Promise<AlgorithmSettings> {
  try {
    const db = getServiceRoleClient();
    const keys = Object.keys(ALGORITHM_DEFAULTS) as (keyof AlgorithmSettings)[];
    const { data } = await db
      .from('platform_settings')
      .select('key,value')
      .in('key', keys);

    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;

    const p = (key: keyof typeof ALGORITHM_DEFAULTS) =>
      parseFloat(map[key] ?? '') || ALGORITHM_DEFAULTS[key];
    const i = (key: keyof typeof ALGORITHM_DEFAULTS) =>
      parseInt(map[key] ?? '') || ALGORITHM_DEFAULTS[key];

    return {
      forum_hot_replies_weight:   p('forum_hot_replies_weight'),
      forum_hot_views_divisor:    p('forum_hot_views_divisor'),
      forum_hot_age_exponent:     p('forum_hot_age_exponent'),
      forum_hot_window_days:      i('forum_hot_window_days'),
      trending_likes_weight:      p('trending_likes_weight'),
      trending_brewed_weight:     p('trending_brewed_weight'),
      trending_age_exponent:      p('trending_age_exponent'),
      bestrated_bayesian_m:       p('bestrated_bayesian_m'),
      bestrated_bayesian_c:       p('bestrated_bayesian_c'),
      bestrated_recency_floor:    p('bestrated_recency_floor'),
      bestrated_recency_halflife: p('bestrated_recency_halflife'),
      bestrated_min_ratings:      i('bestrated_min_ratings'),
      rec_weight_style_exact:     p('rec_weight_style_exact'),
      rec_weight_style_family:    p('rec_weight_style_family'),
      rec_weight_hop_jaccard:     p('rec_weight_hop_jaccard'),
      rec_weight_malt_jaccard:    p('rec_weight_malt_jaccard'),
      rec_weight_abv_proximity:   p('rec_weight_abv_proximity'),
      rec_weight_quality:         p('rec_weight_quality'),
      rec_weight_liked_style:     p('rec_weight_liked_style'),
      rec_weight_complexity:      p('rec_weight_complexity'),
      rec_weight_viewed_style:    p('rec_weight_viewed_style'),
      rec_weight_collab:          p('rec_weight_collab'),
      rec_diversity_comfort:      p('rec_diversity_comfort'),
      rec_diversity_exploration:  p('rec_diversity_exploration'),
      rec_needs_data_threshold:   i('rec_needs_data_threshold'),
      rec_collab_min_overlap:     i('rec_collab_min_overlap'),
      // Plausibility Engine
      plausibility_max_bottles_window: i('plausibility_max_bottles_window'),
      plausibility_window_hours: i('plausibility_window_hours'),
      plausibility_fast_submit_penalty: p('plausibility_fast_submit_penalty'),
      plausibility_fast_submit_min_ms_complex: i('plausibility_fast_submit_min_ms_complex'),
      plausibility_fast_submit_min_ms_simple: i('plausibility_fast_submit_min_ms_simple'),
      plausibility_unplausible_time_penalty: p('plausibility_unplausible_time_penalty'),
      plausibility_shadowban_threshold: p('plausibility_shadowban_threshold'),
      // CIS Engine
      cis_base_score:               p('cis_base_score'),
      cis_fridge_surfing_penalty:   p('cis_fridge_surfing_penalty'),
      cis_dwell_time_bonus:         p('cis_dwell_time_bonus'),
      cis_last_in_session_bonus:    p('cis_last_in_session_bonus'),
      cis_session_window_minutes:   i('cis_session_window_minutes'),
      cis_dwell_time_threshold_s:   i('cis_dwell_time_threshold_s'),
      cis_dynamic_time_bonus:       p('cis_dynamic_time_bonus'),
      cis_dynamic_time_penalty:     p('cis_dynamic_time_penalty'),
      cis_dynamic_temp_bonus:       p('cis_dynamic_temp_bonus'),
      cis_dynamic_temp_penalty:     p('cis_dynamic_temp_penalty'),
      cis_weekend_holiday_bonus:    p('cis_weekend_holiday_bonus'),
      cis_rating_bonus:             p('cis_rating_bonus'),
      cis_btb_bonus:                p('cis_btb_bonus'),
      cis_vibecheck_bonus:          p('cis_vibecheck_bonus'),
    };
  } catch {
    // Fallback auf Defaults wenn DB nicht erreichbar
    return { ...ALGORITHM_DEFAULTS };
  }
}
