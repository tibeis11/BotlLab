// ============================================================================
// Phase 15 — Seed BotlGuide Analyst Insights
//
// Inserts ≥20 realistic analytics_ai_insights entries across all insight_type
// categories with plausible trigger_data JSONBs.
//
// Usage: node seed_insights.js
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BREWERY_ID = 'bbbbbbbb-cccc-dddd-eeee-000000000001';
const BREW_IPA = 'cccccccc-dddd-eeee-ffff-000000000001';
const BREW_LAGER = 'cccccccc-dddd-eeee-ffff-000000000002';

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
}

async function seedAnalyticsInsights() {
  console.log('🤖 Seeding BotlGuide Analyst insights...\n');

  const insights = [
    // ── off_flavor (4 entries) ────────────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'off_flavor',
      severity: 'critical',
      title: 'Off-Flavor Alert: „Acetaldehyd" bei Test IPA',
      body: '5 unabhängige Trinker melden Acetaldehyd (grüner Apfel) in den letzten 30 Tagen (18 Bewertungen total). Z-Score: 3.2 — das ist statistisch hochsignifikant.',
      action_suggestion: 'Überprüfe dein Brauprotokoll für Test IPA: Nachgärzeit (aktuell 9 Tage, empfohlen ≥14), Gärtemperatur, und Hefevitalität. Vergleiche mit dem vorherigen, problemfreien Sud.',
      trigger_data: { zScore: 3.2, offFlavorCount: 5, totalRatings: 18, tagCounts: { acetaldehyd: 4, diacetyl: 1 } },
      source_phases: ['phase_5.3'],
      expires_at: daysFromNow(30),
      created_at: daysAgo(1),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_LAGER,
      insight_type: 'off_flavor',
      severity: 'warning',
      title: 'Off-Flavor Hinweis: „Diacetyl" bei Test Lager',
      body: '3 Trinker berichten über butterige Noten in den letzten 30 Tagen (12 Bewertungen). Z-Score: 2.4 — über der Alarmschwelle.',
      action_suggestion: 'Führe eine Diacetyl-Rast bei 18°C für 48h durch, bevor du den nächsten Sud abfüllst.',
      trigger_data: { zScore: 2.4, offFlavorCount: 3, totalRatings: 12, tagCounts: { diacetyl: 3 } },
      source_phases: ['phase_5.3'],
      expires_at: daysFromNow(25),
      created_at: daysAgo(3),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'off_flavor',
      severity: 'info',
      title: 'Off-Flavor behoben: „Oxidation" bei Test IPA',
      body: 'Die Oxidations-Meldungen sind von 4 auf 0 zurückgegangen seit deinem letzten Keg-Purge. Gut gemacht!',
      action_suggestion: null,
      trigger_data: { zScore: 0.3, offFlavorCount: 0, previousCount: 4, resolved: true },
      source_phases: ['phase_5.3'],
      expires_at: daysFromNow(15),
      created_at: daysAgo(5),
      brewer_reaction: 'helpful',
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_LAGER,
      insight_type: 'off_flavor',
      severity: 'warning',
      title: 'Off-Flavor: „DMS" bei Test Lager',
      body: '3 Berichte über Dosenmais-Geschmack. Z-Score: 2.1. Häufig bei zu kurzem Kochen.',
      action_suggestion: 'Verlängere die Kochzeit auf mindestens 75 Minuten und prüfe, ob der Deckel offen war.',
      trigger_data: { zScore: 2.1, offFlavorCount: 3, totalRatings: 15, tagCounts: { dms: 3 } },
      source_phases: ['phase_5.3'],
      expires_at: daysFromNow(28),
      created_at: daysAgo(7),
      is_dismissed: true,
    },

    // ── batch_comparison (4 entries) ──────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'batch_comparison',
      severity: 'warning',
      title: 'Batch-Vergleich: Test IPA ist gesunken',
      body: 'Der aktuelle Sud hat eine Durchschnittsbewertung von 3.6★ (15 Bewertungen), der vorherige lag bei 4.2★ (22). Differenz: -0.6 Punkte.',
      action_suggestion: 'Vergleiche die Rezeptänderungen zwischen den letzten beiden Chargen. Prüfe besonders Gärtemperatur und Hefevitalität.',
      trigger_data: { latestAvg: 3.6, previousAvg: 4.2, drift: -0.6 },
      source_phases: ['phase_4.5'],
      expires_at: daysFromNow(20),
      created_at: daysAgo(2),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_LAGER,
      insight_type: 'batch_comparison',
      severity: 'info',
      title: 'Batch-Vergleich: Test Lager ist gestiegen',
      body: 'Der aktuelle Sud hat 4.4★ (10 Bewertungen) vs. 3.8★ (14) beim Vorgänger. +0.6 Punkte Verbesserung!',
      action_suggestion: 'Die letzte Charge kommt besser an! Dokumentiere die Änderungen, damit du den Erfolg reproduzieren kannst.',
      trigger_data: { latestAvg: 4.4, previousAvg: 3.8, drift: 0.6 },
      source_phases: ['phase_4.5'],
      expires_at: daysFromNow(25),
      created_at: daysAgo(4),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'batch_comparison',
      severity: 'warning',
      title: 'Batch #3 vs. #2: Hopfenaroma schwächer',
      body: 'Aroma-Intensität sank von 4.1 auf 3.3 (-0.8). 8 von 12 Trinkern bewerten das Hopfenaroma als „zu mild".',
      action_suggestion: 'Prüfe Hopfenmenge und Stammwürze. Erwäge Late-Hopping oder Dry-Hopping zu erhöhen.',
      trigger_data: { latestAvg: 3.3, previousAvg: 4.1, drift: -0.8, metric: 'aroma_intensity' },
      source_phases: ['phase_4.5'],
      expires_at: daysFromNow(18),
      created_at: daysAgo(6),
      is_read: true,
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_LAGER,
      insight_type: 'batch_comparison',
      severity: 'info',
      title: 'Konsistenz: Test Lager stabil über 3 Chargen',
      body: 'Die letzten 3 Chargen liegen zwischen 4.0★ und 4.2★. Dein Prozess scheint gut reproduzierbar zu sein.',
      action_suggestion: null,
      trigger_data: { chargesAvgs: [4.0, 4.1, 4.2], stable: true },
      source_phases: ['phase_4.5'],
      expires_at: daysFromNow(30),
      created_at: daysAgo(8),
      brewer_reaction: 'helpful',
    },

    // ── trend (3 entries) ────────────────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'trend',
      severity: 'warning',
      title: 'Rating-Trend: Durchschnitt sinkt um 0.4 Punkte',
      body: 'Dein Brauerei-Durchschnitt liegt diesen Monat bei 3.7★ (28 Bewertungen), letzten Monat waren es 4.1★ (35). Rückgang von 0.4 Punkten.',
      action_suggestion: 'Prüfe, ob ein bestimmter Sud den Durchschnitt nach unten zieht. Nutze den Batch-Vergleich für Details.',
      trigger_data: { currentAvg: 3.7, prevAvg: 4.1, diff: -0.4, currentCount: 28, prevCount: 35 },
      source_phases: ['phase_5'],
      expires_at: daysFromNow(22),
      created_at: daysAgo(1),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'trend',
      severity: 'info',
      title: 'Positiver Trend: Mehr Bewertungen diese Woche',
      body: 'Du hast diese Woche 40% mehr Bewertungen erhalten als im Wochendurchschnitt (14 vs. 10). Die Sichtbarkeit deiner Biere steigt.',
      action_suggestion: null,
      trigger_data: { thisWeek: 14, weeklyAvg: 10, increase: 40 },
      source_phases: ['phase_5'],
      expires_at: daysFromNow(10),
      created_at: daysAgo(2),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'trend',
      severity: 'info',
      title: 'Geschmacksprofil-Shift bei Test IPA',
      body: 'Trinker bewerten die Bitterkeit diesen Monat im Schnitt mit 3.8 (vorher 4.3). Der Bitter-Trend geht nach unten.',
      action_suggestion: 'Falls beabsichtigt, ignoriere diesen Hinweis. Falls nicht, prüfe die Hopfengabe.',
      trigger_data: { metric: 'taste_bitterness', current: 3.8, previous: 4.3, diff: -0.5 },
      source_phases: ['phase_5'],
      expires_at: daysFromNow(20),
      created_at: daysAgo(4),
    },

    // ── market (3 entries) ───────────────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'market',
      severity: 'info',
      title: 'Marktchance: Sour Ales in deiner Region',
      body: '+23% Scan-Nachfrage für Sour Ales im Umkreis von 50km, aber nur 2 lokale Anbieter. Eine Nische mit Potenzial.',
      action_suggestion: 'Erwäge ein experimentelles Sour Ale. Die Nachfrage in deiner Region ist signifikant höher als das Angebot.',
      trigger_data: { style: 'Sour Ale', demandIncrease: 23, localSuppliers: 2, radiusKm: 50 },
      source_phases: ['phase_14'],
      expires_at: daysFromNow(30),
      created_at: daysAgo(3),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'market',
      severity: 'info',
      title: 'Cross-Consumption: 40% trinken auch Weizen',
      body: '40% deiner IPA-Trinker scannen auch Weizenbiere anderer Brauereien. Das deutet auf eine breite Geschmackspräferenz hin.',
      action_suggestion: 'Ein Wheat IPA oder American Wheat könnte diese Zielgruppe besonders ansprechen.',
      trigger_data: { sourceStyle: 'IPA', targetStyle: 'Weizen', overlap: 40 },
      source_phases: ['phase_14'],
      expires_at: daysFromNow(30),
      created_at: daysAgo(5),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'market',
      severity: 'warning',
      title: 'Wettbewerb: Neuer Anbieter in deiner IPA-Nische',
      body: 'Im Umkreis von 30km sind +3 neue IPA-Anbieter seit letztem Monat aktiv. Dein Marktanteil (Scan-basiert) sank von 45% auf 32%.',
      action_suggestion: 'Differenziere dein IPA-Angebot: einzigartige Hopfensorten, lokale Zutaten oder Limited Editions heben dich ab.',
      trigger_data: { style: 'IPA', newCompetitors: 3, marketShareBefore: 45, marketShareAfter: 32, radiusKm: 30 },
      source_phases: ['phase_14'],
      expires_at: daysFromNow(25),
      created_at: daysAgo(6),
    },

    // ── event_detected (3 entries) ───────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'event_detected',
      severity: 'info',
      title: 'Event erkannt: 18 Scans in Berlin',
      body: 'Ein Scan-Cluster mit 18 Scans wurde erkannt (06.03.2026, Berlin-Kreuzberg). Das deutet auf ein Event oder eine Verkostung hin.',
      action_suggestion: 'Überprüfe, ob ein Event stattfand. Falls ja, markiere es im Dashboard für bessere Analyse deiner Event-Performance.',
      trigger_data: { eventId: 'ev-001', scanCount: 18, city: 'Berlin', startedAt: daysAgo(2) },
      source_phases: ['phase_10'],
      expires_at: daysFromNow(14),
      created_at: daysAgo(2),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'event_detected',
      severity: 'warning',
      title: 'Event erkannt: 32 Scans in München',
      body: 'Ein großer Scan-Cluster mit 32 Scans (08.03.2026, München-Haidhausen). 4 verschiedene Biere gescannt, 12 einzigartige Sessions.',
      action_suggestion: 'Das war ein größeres Event! Kontaktiere den Veranstalter für zukünftige Kooperationen.',
      trigger_data: { eventId: 'ev-002', scanCount: 32, city: 'München', uniqueBrews: 4, uniqueSessions: 12 },
      source_phases: ['phase_10'],
      expires_at: daysFromNow(14),
      created_at: daysAgo(5),
      brewer_reaction: 'helpful',
      brewer_notes: 'Das war unser Taproom-Opening!',
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: null,
      insight_type: 'event_detected',
      severity: 'info',
      title: 'Event erkannt: 11 Scans in Wien',
      body: 'Kleiner Scan-Cluster mit 11 Scans in Wien (2. Bezirk). Könnte eine private Verkostung sein.',
      action_suggestion: 'Prüfe, ob du einen Vertriebspartner in Wien hast, der ein Tasting veranstaltet hat.',
      trigger_data: { eventId: 'ev-003', scanCount: 11, city: 'Wien' },
      source_phases: ['phase_10'],
      expires_at: daysFromNow(10),
      created_at: daysAgo(7),
    },

    // ── seasonality (2 entries) ──────────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'seasonality',
      severity: 'info',
      title: 'Saisonalität: IPA-Peak beginnt',
      body: 'Historisch steigen deine IPA-Scans ab März um ~35% gegenüber dem Winter. Jetzt ist der richtige Zeitpunkt für eine neue Charge.',
      action_suggestion: 'Plane jetzt die Produktion, damit dein IPA rechtzeitig zum Sommer-Peak verfügbar ist.',
      trigger_data: { style: 'IPA', monthlyIncrease: 35, peakMonths: ['Mai', 'Juni', 'Juli'] },
      source_phases: ['phase_14'],
      expires_at: daysFromNow(60),
      created_at: daysAgo(1),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_LAGER,
      insight_type: 'seasonality',
      severity: 'info',
      title: 'Saisonalität: Lager ganzjährig stabil',
      body: 'Dein Lager zeigt kaum saisonale Schwankungen (<8% Varianz). Ein verlässlicher Umsatzträger.',
      action_suggestion: null,
      trigger_data: { style: 'Lager', variance: 8, stable: true },
      source_phases: ['phase_14'],
      expires_at: daysFromNow(60),
      created_at: daysAgo(3),
    },

    // ── shelf_life (2 entries) ───────────────────────────────────────────
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_IPA,
      insight_type: 'shelf_life',
      severity: 'warning',
      title: 'Shelf-Life: Rating-Drop ab Tag 45 bei Test IPA',
      body: 'Ab einem Flaschenalter von 45 Tagen sinkt die Bewertung um durchschnittlich 0.7 Punkte. Das deutet auf Oxidation oder Hopfenabbau hin.',
      action_suggestion: 'Prüfe deine Abfülltechnik (O2-Eintrag) und empfehle Trinkern, das IPA innerhalb von 6 Wochen zu genießen.',
      trigger_data: { dropOffDay: 45, ratingDrop: 0.7, beforeAvg: 4.2, afterAvg: 3.5, sampleSize: 24 },
      source_phases: ['phase_5.4'],
      expires_at: daysFromNow(30),
      created_at: daysAgo(2),
    },
    {
      brewery_id: BREWERY_ID,
      brew_id: BREW_LAGER,
      insight_type: 'shelf_life',
      severity: 'info',
      title: 'Shelf-Life: Test Lager hält sich gut',
      body: 'Kein signifikanter Rating-Drop bis Tag 90 erkennbar. Dein Lager ist lagerstabil.',
      action_suggestion: null,
      trigger_data: { maxDayTested: 90, ratingDrop: 0.1, stable: true },
      source_phases: ['phase_5.4'],
      expires_at: daysFromNow(30),
      created_at: daysAgo(4),
      brewer_reaction: 'helpful',
    },
  ];

  // Insert all insights
  let insertedCount = 0;
  for (const insight of insights) {
    const { error } = await supabase.from('analytics_ai_insights').insert(insight);
    if (error) {
      console.error(`  ❌ Failed: ${insight.title}`, error.message);
    } else {
      insertedCount++;
    }
  }

  console.log(`\n✅ Inserted ${insertedCount}/${insights.length} insights`);

  // Summary by type
  const { data: summary } = await supabase
    .from('analytics_ai_insights')
    .select('insight_type')
    .eq('brewery_id', BREWERY_ID);

  if (summary) {
    const counts = {};
    for (const row of summary) {
      counts[row.insight_type] = (counts[row.insight_type] || 0) + 1;
    }
    console.log('\n📊 Insights by type:');
    for (const [type, count] of Object.entries(counts)) {
      console.log(`   ${type}: ${count}`);
    }
  }

  console.log('\n🌐 View at: http://localhost:3000/team/' + BREWERY_ID + '/analytics');
  console.log('   (BotlGuide Analyst cards appear at the top of the Overview tab)');
}

seedAnalyticsInsights().catch(console.error);
