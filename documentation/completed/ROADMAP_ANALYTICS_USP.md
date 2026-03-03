# Analytics USP — "Verified Drinker" Roadmap

**Status:** Complete ✅ (Alle Phasen 0–15 abgeschlossen)  
**Erstellt:** 2026-02-28  
**Letztes Update:** 2026-03-07 (Rev. 8 — Phase 15 BotlGuide Analyst abgeschlossen: analytics_ai_insights Migration, Insight CRUD Server Actions, Anomaly Detector Cron-Worker, BotlGuide InsightCards UI, Seed-Daten; alle Phasen complete, tsc --noEmit = 0 errors)  
**Priorität:** Sehr Hoch (USP-kritisch)  
**Geschätzte Laufzeit:** 16–22 Wochen

---

## 🧭 Vision & Konzept

Das Alleinstellungsmerkmal (USP) der Analytics-Seite ist die Fähigkeit, einem Brauer nicht nur zu sagen _wie oft_ seine Flasche gescannt wurde, sondern _wer_ sein Bier wirklich getrunken hat und _wie_ es wahrgenommen wurde.

### Der "Jobs-to-be-Done"-Ansatz (Rev. 4)

Ab Rev. 4 wechseln wir die Perspektive: Anstatt zu fragen _"Welche Daten können wir erheben?"_ fragen wir _"Welches konkrete Problem hat der Brauer, für dessen Lösung er bereit ist zu zahlen?"_

Die drei größten Schmerzpunkte (Pain Points) eines ambitionierten Hobbybrauers oder einer Microbrauerei:

| Schmerz                | Die Frage des Brauers                                                          | BotlLab-Lösung                                                     | Verknüpfte Phasen                                           |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Qualitätssicherung** | "Schmeckt mein neuer Sud schlechter? Hat meine Charge ein Off-Flavor-Problem?" | Off-Flavor Frühwarnsystem + Batch A/B Testing + Shelf-Life Kurve   | Phase 4 (Benchmark), Phase 5 (Trend), Phase 7.4 (Füllalter) |
| **Marktintelligenz**   | "Was sollte ich als nächstes brauen? Wo kann ich mein Bier verkaufen?"         | Local Trend Radar + Cross-Consumption-Analyse + Distribution Leads | Phase 14 (Marktintelligenz)                                 |
| **Kundenbindung**      | "Wie erreiche ich die Leute, die mein Bier lieben, für mein nächstes Event?"   | Loyalitäts-Kohorten + Event-Erkennung + BotlGuide Analyst          | Phase 10, Phase 13, Phase 15 (BotlGuide Analyst)            |

Der **BotlGuide Analyst** (Phase 15) ist die Klammer über allem: Er verknüpft die Rohdaten aus allen Phasen, korreliert sie mit den Brauprotokollen aus dem Session-Log und liefert dem Brauer fertige Handlungsempfehlungen — kein Statistik-Dashboard, sondern eine **Business-Intelligence-Suite mit KI-Berater**.

### Das "Verified Drinker"-Modell

Ein QR-Code-Scan allein ist kein Beweis für Konsum. Jemand kann die Flasche scannen, um das Label anzusehen, ohne das Bier zu trinken. Wir unterscheiden daher drei Qualitätsstufen eines Besuchs:

| Stufe                   | Definition                                                         | Datenbasis                                                                          | Aussagekraft        |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------- |
| **Aufruf**              | Seite wurde aufgerufen (anonym oder eingeloggt)                    | `bottle_scans` (alle)                                                               | Sichtbarkeit        |
| **Eingeloggter Besuch** | Scan mit bekanntem User-Account                                    | `bottle_scans.viewer_user_id IS NOT NULL`                                           | Interesse           |
| **Verified Drinker**    | Scan + Rating ODER Scan + Kronkorken-Claim ODER Nutzer-Bestätigung | `converted_to_rating = true` ODER `collected_caps` ODER `confirmed_drinking = true` | Konsum nachgewiesen |

Dieser Rahmen wird zur Grundlage **aller** Analysen. Kein anderes Craft-Bier-Tool denkt so über Konsumentenverhalten nach — das ist unser echtes USP.

### Scan Intent Classification (SIC)

Nicht jeder Scan ist gleich. Um die Qualität der Daten zu erhöhen, klassifiziert das System automatisch die **Absicht hinter einem Scan** anhand von Verhaltensmustern:

| Kategorie             | Erkennung                                                                                          | Signale                                                      | Gewichtung für Analytics                      |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| **Browse Scan**       | Selber Browser scannt ≥3 verschiedene Flaschen innerhalb von 5 Minuten                             | Kühlschrank-Browsing, Sammlung anschauen, Regal durchstöbern | 🟡 Niedrig — Label-Interesse, kein Konsum     |
| **Single Scan**       | Nur ein Scan in einer Session (normal)                                                             | Typisches Verhalten bei QR-Code auf Flasche in der Hand      | 🟢 Normal — potenzieller Trinker              |
| **Social Scan**       | Scan kommt via Social-Media-Referrer oder UTM                                                      | Neugierig gemacht durch Social-Media-Post                    | 🟡 Mittel — Entdeckung, nicht zwingend Konsum |
| **Event Scan**        | Teil eines Events (Phase 10) — viele verschiedene Sessions scannen dasselbe Brew im selben Bereich | Tasting, Bierfest                                            | 🟢 Hoch — wahrscheinlich Konsum (Verkostung)  |
| **Repeat Scan**       | Eingeloggter User scannt dasselbe Brew an verschiedenen Tagen                                      | Stammtrinker                                                 | 🟢 Sehr hoch — Fan / Loyalität                |
| **Owner Scan**        | `is_owner_scan = true`                                                                             | Brauer testet selbst                                         | ⚪ Neutral — aus Analyse ausschließen         |
| **Confirmed Drinker** | User bestätigt via Popup: "Ja, ich trinke das gerade"                                              | Explizite Bestätigung                                        | 🟢 Garantiert — Ground-Truth für Modell       |

Die Klassifikation wird **nach dem Scan** berechnet (nicht im Scan-Pfad), um keine Latenz hinzuzufügen. Ein Cron-Job oder Batch-Prozess setzt die Kategorie rückwirkend auf bestehende Scans.

---

## 📋 Gesamtfortschritt

### Phase 1 — Kritische Bug Fixes (Fundament)

- [x] **1.1** Supabase-Migration: `increment_daily_stats` reparieren (SECURITY DEFINER + Expression Index) → `20260301000000_fix_increment_daily_stats.sql`
- [x] **1.2** Aggregationstabelle: neue Spalte `logged_in_scans` ergänzen → selbe Migration
- [x] **1.3** `trackBottleScan`: `logged_in_scans` korrekt befüllen → `p_is_logged_in` im RPC-Call
- [x] **1.4** `exportAnalyticsCSV`: Tier-Check-Bug fixen (`tier` → `subscription_tier`)
- [x] **1.5** Heatmap-Zeitraum-Bug fixen
- [x] **1.6** Race Condition `total_profile_views` fixen (`increment_profile_views` DB-Funktion) → selbe Migration
- [x] **1.7** 🔴 KRITISCH: Tier-Bypass fixen — serverseitige Datums-Enforcement in `getBreweryAnalytics()`
- [x] **1.8** NULL `brew_id`-Scans sichtbar machen — Scans ohne Brew-Zuordnung werden aktuell still verworfen
- [x] **1.9** Gelöschte Brews im Top-Brews-Widget abfangen (UUID-Fallback statt Absturz)

### Phase 2 — "Verified Drinker" Funnel

- [x] **2.1** Server Action: `getCapClaimRate()` implementieren
- [x] **2.2** Server Action: `getBreweryAnalyticsSummary()` um `logged_in_scans` + Cap-Rate erweitern
- [x] **2.3** Komponente: `DrinkerFunnelCard` — Haupt-Dashboard
- [x] **2.4** Komponente: Per-Brew-Funnel auf Detail-Seite
  - ⚠️ **Bekannte Einschränkung:** `loggedInScans` wird auf der Brew-Detail-Seite als `0` übergeben. Die `analytics_daily_stats`-Tabelle enthält `logged_in_scans` per Brew, wird aber auf der Detail-Seite noch nicht aggregiert abgefragt. Zu beheben, sobald ein dedizierter `/brew/[brewId]` Stats-Query ergänzt wird (z.B. in Phase 7 als Teil der erweiterten Scan-Datenbasis).
- [x] **2.5** UI-Copy: "Aufrufe / Eingeloggte Besuche / Verified Drinkers" konsequent umsetzen

### Phase 3 — Rater-Demografie

- [x] **3.1** Server Action: `getRaterDemographics()` implementieren
- [x] **3.2** Datenschutz-Kommentar + Opt-out-Filter in Action einbauen
- [x] **3.3** Komponente: `RaterDemographicsPanel` — Altersgruppen, Erfahrungslevel, Aktivitätsgrad
- [x] **3.4** Scanner vs. Verified Drinkers Vergleich in Panel ergänzen

### Phase 4 — Stil-Benchmark

- [x] **4.1** Migration: Materialisierte View `brew_style_averages` erstellen
- [x] **4.2** Migration: Cron-Funktion für tägliches View-Refresh
- [x] **4.3** Server Action: `getStyleBenchmark()` implementieren
- [x] **4.4** Komponente: `StyleBenchmarkCard` — Radar-Chart + Delta-Werte
- [x] **4.5** 🆕 Batch A/B Testing: `getBatchComparison()` Server Action + `BatchComparisonCard` UI
- [x] **4.6** 🆕 Brauer-Qualitätszusammenfassung (BotlGuide-generiert, monatlich) — integriert in E-Mail-Report

### Phase 5 — Geschmacksprofil-Trend auf Haupt-Dashboard

- [x] **5.1** Komponente: `TasteProfileTrendChart` für Haupt-Analytics-Seite (brew-filterbar)
- [x] **5.2** Integration in Haupt-Analytics-Seite mit Brew-Dropdown (Accordion in OverviewView)
- [x] **5.3** 🆕 Off-Flavor Frühwarnsystem: `detectOffFlavorAnomaly()` + `detectBreweryOffFlavors()` + `OffFlavorAlertBanner` UI (E-Mail bei Critical → Phase 15)
- [x] **5.4** 🆕 Degradationskurve (Shelf-Life): `getShelfLifeCurve()` + `ShelfLifeChart` UI

### Phase 6 — Wöchentlicher E-Mail-Report aktivieren

- [x] **6.1** Report-Server-Actions prüfen und vervollständigen
- [x] **6.2** Migration: Cron-Job für Report-Versand
- [x] **6.3** Report-Content um neue Kennzahlen erweitern (Drinker Rate, Peak Hour, Off-Flavor Alerts, Top Flavor Tag) · 🆕 KI-Zusammenfassung → Phase 15

### Phase 7 — Erweiterte Scan-Datenbasis

- [x] **7.1** UTM-Parameter beim Scan erfassen und in `bottle_scans` speichern
- [x] **7.2** Referrer-URL beim Scan erfassen (Social Media, Direct, Web)
- [x] **7.3** `scanSource` dynamisch aus UTM/Referrer ableiten (statt hardcoded `'qr_code'`)
- [x] **7.4** Flaschenfüllalter (`bottles.filled_at`) zum Scan-Kontext ergänzen
- [x] **7.5** ABV/IBU/SRM aus `brews.data` JSON normalisieren → eigene Spalten oder View
- [x] **7.6** UI: Herkunftsquellen-Breakdown auf Analytics-Dashboard

### Phase 8 — Wetter-Korrelation (Forschungsphase)

- [x] **8.1** Konzeptentscheidung: historisch (Open-Meteo) vs. echtzeit (zum Scan-Zeitpunkt)
- [x] **8.2** Datenmodell: `bottle_scans.weather_*` Spalten oder Join-Tabelle `scan_weather`
- [x] **8.3** Open-Meteo API-Integration: Wetterdaten zum Scan-Zeitpunkt abrufen und speichern
- [x] **8.4** Aggregation: Wetter-Kategorien aus Rohdaten berechnen (warm/kühl/Regen/Sonne)
- [x] **8.5** UI: Wetter-Korrelations-Chart auf Analytics-Dashboard
- [x] **8.6** Historische Aufholung: Bestehende Scans mit Wetterdaten anreichern (Open-Meteo historical)

### Phase 9 — Scan Intent Classification + Drinker-Bestätigung

- [x] **9.1** Migration: `bottle_scans.scan_intent` Spalte + `bottle_scans.confirmed_drinking` Spalte
- [x] **9.2** Browse-Scan-Erkennung: Batch-Klassifikation (≥3 Scans / 5 Min / same session)
- [x] **9.3** Repeat-Scan-Erkennung: Loyalty-Klassifikation (same user, same brew, different days)
- [x] **9.4** Drinker-Bestätigungs-Popup: Smart Sampling + Engagement-basiertes Timing
- [x] **9.5** Strukturierter Feedback-Loop: Confusion Matrix, Feature-Logging, EWMA-Kalibrierung
- [x] **9.6** Server Action: `getScanIntentBreakdown()` implementieren
- [x] **9.7** UI: Intent-Breakdown-Chart + gewichtete Metriken auf Dashboard
- [x] **9.8** Admin Model Accuracy Dashboard: Confusion Matrix, Calibration Plot, Drift-Erkennung
- [x] **9.9** Schwellenwert-Auto-Adjustment: Browse/Repeat-Regeln basierend auf Feedback anpassen
- [x] **9.10** Migration: `scan_intent_feedback`-Tabelle für strukturiertes Prediction-Logging
- [x] **9.11** Smoke-Test & Seed-Daten: `seed_analytics.js` erweitern (≥200 `scan_intent_feedback`-Einträge), End-to-End-Test aller Feedback-Loop-Komponenten

### Phase 10 — Event-Scan-Cluster-Erkennung

- [x] **10.1** Migration: `scan_events` Tabelle — erkannte Events speichern
- [x] **10.2** Cluster-Algorithmus: räumlich-zeitliche Gruppierung implementieren
- [x] **10.3** Cron-Job: Stündliche Cluster-Erkennung mit Haversine
- [x] **10.4** Server Action: `getDetectedEvents()` implementieren
- [x] **10.5** UI: Event-Annotationen im Scans-über-Zeit-Chart
- [x] **10.6** UI: Event-Detail-Panel mit Karte, Zeitstrahl und Brew-Verteilung
- [x] **10.7** Push-Notification: Brauer benachrichtigen bei erkanntem Event

### Phase 11 — Drinker Experience Engine (NEU) ✅

> 🚧 Harte Abhängigkeit: `KONZEPT_ZWEI_WELTEN` muss in Produktion sein und `NEXT_PUBLIC_ZWEI_WELTEN_ENABLED=true` gesetzt sein.

- [x] **11.0** Brewer Flavor Intent Setup: Dreistufiger Fallback (Daten-Vorschlag → BotlGuide-Analyse → Manuell) — Migration `brews.flavor_profile JSONB`, `lib/flavor-profile-config.ts`, `FlavorProfileEditor.tsx`, BrewEditor-Tab „Beat the Brewer"
- [x] **11.0.5** Migration: `profiles.tasting_iq` + `tasting_score_events`-Tabelle — wird durch KONZEPT_ZWEI_WELTEN Phase 0.3 angelegt, hier nur verifizieren + RLS-Policy testen
- [x] **11.1** "Beat the Brewer": Gamifizierte Sensorik-Daten (5 Slider, Match-Score → `tasting_score_events` INSERT + `profiles.tasting_iq` UPDATE) — `BeatTheBrewerGame.tsx`, `RadarChart.tsx`, `beat-the-brewer-actions.ts`, eingebunden in `/b/[id]`
- [x] **11.2** "Taste DNA" & Smart Bias Filtering: Differential-Rating (Raw Average vs. Target Audience Average) — `app/my-cellar/taste-dna/page.tsx` + `TasteDNAClient.tsx`, Tab in ConsumerHeader
- [x] **11.3** "Vibe Check": Subtile Kontext-Extraktion (Emoji-basierte Situations-Tags → `tasting_score_events` INSERT) — `VibeCheck.tsx`, `submitVibeCheck()` Server Action, eingebunden in `/b/[id]`
- [x] **11.4** Leaderboard: `GET /my-cellar/leaderboard` — `app/my-cellar/leaderboard/page.tsx` + `LeaderboardClient.tsx`, Tab in ConsumerHeader

### Phase 12 — Viral & Commerce Loops (NEU) ✅ ABGESCHLOSSEN

- [x] **12.1** Shareable "Taste DNA": Social-Export (Spotify-Wrapped-Stil für Instagram/TikTok) — `app/api/taste-dna-share/route.tsx` (OG-Image 1080×1920, Edge Runtime), `app/my-cellar/taste-dna/ShareDNAButton.tsx`, eingebunden in `TasteDNAClient.tsx`
- [x] **12.2** "The Point of Sale" & Stash Check-In: POS-Datenerfassung via Gamification — `lib/actions/stash-actions.ts`, `app/b/[id]/components/StashButton.tsx`, `app/my-cellar/stash/` (page + StashClient), Tab in ConsumerHeader (+5 IQ bei Location-Angabe)
- [x] **12.3** "Brewer Bounties": Phygital Rewards (digitale Challenges → physische Belohnungen) — `lib/actions/bounty-actions.ts`, `app/team/[breweryId]/bounties/` (page + BountiesClient), `app/b/[id]/components/BrewBounties.tsx`, Tab in SquadHeader
- [x] **12.4** Social Challenge "Beat a Friend": Head-to-Head für virale Reichweite (K-Faktor) — `lib/actions/beat-friend-actions.ts`, `app/b/[id]/components/BeatAFriendShare.tsx`, integriert in `BeatTheBrewerGame.tsx`, `/b/[id]?challenge=TOKEN` URL-Param, Head-to-Head Radar-Vergleich

### Phase 13 — Bottle-Reise-Tracking + Loyalty (vormals Phase 11) ✅ ABGESCHLOSSEN

- [x] **13.1** Server Action: `getBottleJourney(bottleId)` implementieren — `lib/actions/analytics-actions.ts` (Haversine-Distanz, Access-Check, Schritt-Berechnung)
- [x] **13.2** UI: Bottle-Reise-Karte mit Scan-Pfad-Animation — `app/team/[breweryId]/analytics/components/BottleJourneyCard.tsx`, neuer Nav-Tab "Flaschen" (`views/JourneyView.tsx`), Enterprise-Gating
- [x] **13.3** Server Action: `getLoyaltyBreakdown(brewId)` implementieren — `lib/actions/analytics-actions.ts` (fan/returning/one_time Klassifikation, Avg-Rating per Segment, Anonymous-Scan-Count)
- [x] **13.4** UI: Loyalty-Segment-Chart (Einmaltrinker / Wiederkommer / Fans) — `app/team/[breweryId]/analytics/components/LoyaltySegmentChart.tsx`, SVG-Donut-Chart, Insight-Text, integriert in `AudienceView`
- [x] **13.5** Saisonalitäts-Index pro Brew: 12-Monats-Sparkline berechnen und anzeigen — `getSeasonalityIndex()` in analytics-actions.ts, `SeasonalitySparkline.tsx` mit Gini-Score, integriert in `AudienceView`

### Phase 14 — Marktintelligenz & Distribution ✅ ABGESCHLOSSEN

- [x] **14.1** Local Trend Radar: Regionale Nachfrage-Analyse (Stil-Trends im Umkreis) — `getLocalTrendRadar(breweryId, radiusKm)` in analytics-actions.ts, `LocalTrendRadarCard.tsx` mit Radius-Picker + Opportunity-Badges (high/medium/low), Tier-Gate: brewery+
- [x] **14.2** Cross-Consumption-Analyse: Distribution Leads ("Deine Trinker kaufen auch bei...") — `getCrossConsumptionInsights(breweryId)` mit viewer_user_id-Overlap, `CrossConsumptionCard.tsx` mit Hotspot-Bars + Privacy-Shield, Tier-Gate: enterprise
- [x] **14.3** Saisonale Stilnachfrage: Timing-Empfehlung für neue Releases — `getStyleSeasonality(style)` plattformweit, `StyleSeasonalityCard.tsx` mit Stil-Suche + 12-Monats-Bars + Release-Empfehlung, Tier-Gate: brewery+

**Navigation:** Neuer Tab "Marktintelligenz" (TrendingUp-Icon) in Sidebar + Mobile-Nav. `MarketView.tsx` als Container-View. `AnalyticsSection` type um `'market'` erweitert.

### Phase 15 — BotlGuide Analyst (vormals Phase 13) ✅ ABGESCHLOSSEN

- [x] **15.1** Migration: `analytics_ai_insights` Tabelle (`20260307100000_phase15_analytics_ai_insights.sql`)
- [x] **15.2** Server Actions: `insights-actions.ts` (getBreweryInsights, markInsightRead, dismissInsight, reactToInsight, getUnreadInsightCount)
- [x] **15.3** Anomaly Detector Worker (Cron-Job): `anomaly-detector/route.ts` — Off-Flavor, Batch-Drift, Taste-Trend, Event-Surge Detektoren mit Z-Score > 2.0
- [x] **15.4** UI: `BotlGuideInsightCards.tsx` Action-Cards auf dem Analytics-Dashboard (über Metrik-Kacheln, max 3, severity-farbcodiert, 👍/👎 Feedback)
- [x] **15.5** Seed-Daten: `seed_insights.js` mit 22 realistischen Insights über alle Kategorien (off_flavor, batch_comparison, trend, market, event_detected, seasonality, shelf_life)

---

## 🏛️ PHASE 0: FRONTEND ARCHITEKTUR & PRIVACY FRAMEWORK

Bevor wir an die Metriken gehen, strukturieren wir das Analytics-Dashboard (`/team/[id]/analytics`) komplett um, um Information-Overload zu vermeiden und den Usern eine klare Story (und extremen Datenschutz) zu bieten.

### Das BotlLab Privacy Shield (Core-Prinzipien)

Alle Endpoint-Abfragen der Folgeschritte müssen diese drei Sicherheitsmechanismen implementieren:

1. **K-Anonymität-Schranke:** Detaillierte demografische/geografische Daten (Alter, Geschlecht, Standorte) werden erst ab einem Traffic-Schwellenwert (z. B. >10 verschiedene Trinker) pro Brew an das Frontend gesendet.
2. **Unscharfe Geodaten:** Private Scans (z.b. Single-Scans von zuhause) werden serverseitig immer auf "Umkreis" ($x \pm \delta, y \pm \delta$) oder PLZ-Ebene gerundet. Exakte Points-of-Interest (POI) werden nur angezeigt, wenn ein Event-Cluster (Phase 10) einen öffentlichen Ort detektiert.
3. **Kohorten statt Identifikation:** Es gibt keine "Top-Sammler-Listen" mit echten Nutzern oder Klarnamen. Loyalität wird ausschließlich aggregiert dargestellt (z.B. "Deine Top 10% Trinker konsumieren im Schnitt 5+ Flaschen").

### Neue Tab-basierte UX/UI-Struktur

Das Dashboard wird in 4 thematische Kategorien (Tabs) unterteilt, analog zum Admin-Dashboard:

- [x] **0.1 Tab: Übersicht (Der 30-Sekunden-Blick)**
  - Metrik-Header (Scans, Ø Rating, Neu gewonnene Trinker, abgefüllte Flaschen)
  - Der "Verified Drinker" Funnel (Phase 2)
  - Live-Heatmap (Letzte 50 chronologische Scans, verpixelt)
  - 🆕 **BotlGuide Action-Cards** (Phase 15): KI-generierte Alerts & Empfehlungen prominent über den Metriken
- [x] **0.2 Tab: Zielgruppe & Loyalität (Wer trinkt mein Bier?)**
  - Trinker-DNA (Donut-Charts für Phase 3)
  - Loyalitäts-Kohorten statt Leaderboards (Aggregiert nach Privacy Shield)
  - Activity-Intent-Analyse (Phase 9)
  - 🆕 **Local Trend Radar** (Phase 14): Welche Stile sind in meinem Umkreis gefragt?
- [x] **0.3 Tab: Geschmack & Qualität (Die Bier-Sensorik)**
  - Style Benchmark Spider/Radar-Chart (Phase 4)
  - 🆕 **Batch A/B Testing** (Phase 4.5): Direkter Sud-gegen-Sud-Vergleich
  - Taste Profile Trend über die Zeit (Phase 5)
  - 🆕 **Off-Flavor Frühwarnsystem** (Phase 5.3): Automatische Anomalie-Erkennung bei Fehlgeschmacks-Tags
  - 🆕 **Degradationskurve / Shelf-Life** (Phase 5.4): Rating-Qualität vs. Flaschenalter
  - Rater Experience-Breakdown (Bier-Geeks vs Casual)
- [x] **0.4 Tab: Kontext & Reise (Wo und Wie?)**
  - Bottle Journey Flow (Phase 13)
  - Event-Scan Radar & Maps (Phase 10)
  - Wetter- / Kontext-Korrelation (Phase 8)
  - 🆕 **Cross-Consumption Leads** (Phase 14): "Deine Trinker kaufen auch bei Shop X"

---

## ✅ PHASE 1: KRITISCHE BUG FIXES

> **Muss als erstes ausgeführt werden.** Ohne Phase 1 zeigt das Dashboard keine Scans, was alle nachfolgenden Phasen wertlos macht.

### Aktueller Stand — Bekannte Bugs

Das System hat **fünf Bugs** die gemeinsam zu unvollständigen oder falsch gesicherten Analytics-Daten führen. Die ersten beiden sind kritisch (kein Scan erscheint im Dashboard), die anderen drei sind moderat.

> **Neu hinzugefügt:** Bug 1.7 (Tier-Bypass), 1.8 (NULL-Scans), 1.9 (gelöschte Brews)

---

### 1.1 — Supabase-Migration: `increment_daily_stats` reparieren

**Dateipfad:** Neue Datei `botllab-app/supabase/migrations/20260228200000_fix_increment_daily_stats.sql`

**Bug A — Fehlende `SECURITY DEFINER`:**  
Die Funktion `increment_daily_stats` wurde in der Migration `20260209120000_fix_unique_visitors_logic.sql` ohne `SECURITY DEFINER` neu erstellt. Ohne diesen Modifier läuft die Funktion mit den Rechten des aufrufenden anonymen Besuchers, der keine Schreibrechte auf `analytics_daily_stats` hat (RLS). Der Fehler wird in `trackBottleScan` mit `console.error` still abgefangen — `bottle_scans` erhält Einträge, `analytics_daily_stats` bleibt leer, das Dashboard zeigt 0.

**Bug B — Expression-Index fehlt:**  
Die Funktion verwendet `ON CONFLICT (date, brewery_id, COALESCE(brew_id, ...), COALESCE(country_code, ''), COALESCE(device_type, ''))`. PostgreSQL verlangt für expression-basiertes `ON CONFLICT` einen passenden **Expression Unique Index**. Die Tabelle hat nur eine einfache `UNIQUE(date, brewery_id, brew_id, country_code, device_type)`-Constraint, die nicht matcht. PostgreSQL wirft daher entweder einen Fehler oder ignoriert die Klausel.

**Migration-Inhalt:**

```sql
-- 1. Expression Unique Index erstellen (passend zur ON CONFLICT-Klausel)
CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_stats_conflict_idx
  ON analytics_daily_stats (
    date,
    brewery_id,
    COALESCE(brew_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(country_code, ''),
    COALESCE(device_type, '')
  );

-- 2. Funktion neu erstellen MIT SECURITY DEFINER
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_date           date,
  p_brewery_id     uuid,
  p_brew_id        uuid,
  p_country_code   text,
  p_device_type    text,
  p_is_unique      boolean,
  p_is_logged_in   boolean  -- NEU (Phase 1.2)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO analytics_daily_stats (
    date, brewery_id, brew_id, country_code, device_type,
    total_scans, unique_visitors, logged_in_scans
  )
  VALUES (
    p_date, p_brewery_id, p_brew_id, p_country_code, p_device_type,
    1,
    CASE WHEN p_is_unique THEN 1 ELSE 0 END,
    CASE WHEN p_is_logged_in THEN 1 ELSE 0 END
  )
  ON CONFLICT (
    date,
    brewery_id,
    COALESCE(brew_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(country_code, ''),
    COALESCE(device_type, '')
  )
  DO UPDATE SET
    total_scans     = analytics_daily_stats.total_scans + 1,
    unique_visitors = analytics_daily_stats.unique_visitors
                      + CASE WHEN p_is_unique THEN 1 ELSE 0 END,
    logged_in_scans = analytics_daily_stats.logged_in_scans
                      + CASE WHEN p_is_logged_in THEN 1 ELSE 0 END;
END;
$$;

-- 3. increment_profile_views Hilfsfunktion (Phase 1.6)
CREATE OR REPLACE FUNCTION increment_profile_views(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET total_profile_views = COALESCE(total_profile_views, 0) + 1
  WHERE id = p_profile_id;
END;
$$;
```

**Verifikation nach Migration:**  
Flasche scannen → prüfen ob `analytics_daily_stats` neuen Eintrag hat → Dashboard muss Scans zeigen.

---

### 1.2 — `analytics_daily_stats`: Neue Spalte `logged_in_scans`

**Datei:** Dieselbe Migration wie 1.1 (`20260228200000_fix_increment_daily_stats.sql`)

**Warum:** Um eingeloggte Besuche von anonymen Scans zu unterscheiden — Grundlage für den Verified-Drinker-Funnel in Phase 2.

**Migration-Zusatz:**

```sql
ALTER TABLE analytics_daily_stats
  ADD COLUMN IF NOT EXISTS logged_in_scans INTEGER NOT NULL DEFAULT 0;
```

---

### 1.3 — `trackBottleScan`: `logged_in_scans` befüllen

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Änderung:** Im `increment_daily_stats`-RPC-Aufruf einen neuen Parameter `p_is_logged_in` übergeben:

```typescript
// Vorher:
await supabase.rpc("increment_daily_stats", {
  p_date: today,
  p_brewery_id: payload.breweryId,
  p_brew_id: payload.brewId,
  p_country_code: countryCode,
  p_device_type: deviceType,
  p_is_unique: isUniqueDaily,
});

// Nachher:
await supabase.rpc("increment_daily_stats", {
  p_date: today,
  p_brewery_id: payload.breweryId,
  p_brew_id: payload.brewId,
  p_country_code: countryCode,
  p_device_type: deviceType,
  p_is_unique: isUniqueDaily,
  p_is_logged_in: payload.viewerUserId != null, // NEU
});
```

---

### 1.4 — `exportAnalyticsCSV`: Tier-Check-Bug fixen

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Bug:** Die Funktion prüft `profiles.tier` statt `profiles.subscription_tier`. Die gesamte restliche Anwendung nutzt `subscription_tier` für Zugangsgating. `profiles.tier` ist eine veraltete/andere Spalte — Nutzer mit gültigem `subscription_tier = 'brewery'` können möglicherweise keinen CSV-Export durchführen.

**Änderung:** Im `exportAnalyticsCSV`-Select:

```typescript
// Vorher:
const { data: ownerProfile } = await supabase.from('profiles').select('tier')...
const tier = ownerProfile?.tier || 'free';

// Nachher:
const { data: ownerProfile } = await supabase.from('profiles').select('subscription_tier')...
const tier = ownerProfile?.subscription_tier || 'free';
```

---

### 1.5 — Heatmap-Zeitraum-Bug fixen

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Bug:** In `getBreweryAnalyticsSummary()` nutzt der `bottle_scans`-Query für Geo-Koordinaten immer einen 30-Tage-Fallback, unabhängig vom gewählten `timeRange`. Wenn ein Nutzer "7 Tage" gewählt hat und `startDate` korrekt übergeben wird, aber `endDate` fehlt (z.B. bei "Alle Zeit"), zeigt die Heatmap trotzdem nur 30 Tage.

**Änderung:** Den Geo-Query so anpassen, dass er exakt denselben `startDate`/`endDate` nutzt wie der Rest der Abfrage:

```typescript
// Vorher:
.gte('created_at', options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

// Nachher:
const heatmapStart = options?.startDate
  ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const heatmapEnd = options?.endDate ?? new Date().toISOString();
// ...
.gte('created_at', heatmapStart)
.lte('created_at', heatmapEnd)
```

---

### 1.6 — Race Condition `total_profile_views` fixen

**Datei:** `botllab-app/app/b/[id]/page.tsx`

**Bug:** Das aktuelle Muster liest `profiles.total_profile_views`, addiert 1 und schreibt zurück. Bei parallelen Scans derselben Flasche durch mehrere Nutzer (z.B. Bier wird auf einer Party herumgereicht) können Zähler verloren gehen — zwei Requests lesen denselben Wert, addieren 1, schreiben beide denselben Wert zurück.

**Änderung:** Die bereits in Migration 1.1 erstellte `increment_profile_views`-Funktion aufrufen:

```typescript
// Vorher:
await supabase
  .from("profiles")
  .update({
    total_profile_views: (profileData?.total_profile_views || 0) + 1,
  })
  .eq("id", brewerProfile.id);

// Nachher:
await supabase.rpc("increment_profile_views", {
  p_profile_id: brewerProfile.id,
});
```

---

## 🔶 PHASE 2: "VERIFIED DRINKER" FUNNEL

> **Voraussetzung:** Phase 1 vollständig abgeschlossen. Das Dashboard muss Scan-Daten zeigen, bevor der Funnel sinnvoll dargestellt werden kann.

**Kernkonzept:** Der Funnel ist die zentrale neue Element des Dashboards. Er beantwortet primär die Frage: "Wie viele der Menschen, die meine Flasche gescannt haben, haben das Bier wirklich getrunken?"

```
Aufrufe gesamt  →  Eingeloggte Besuche  →  Verified Drinkers  →  Cap Collectors
     1.240               340 (27%)              89 (26%)              34 (38%)
```

### 2.1 — Server Action: `getCapClaimRate()`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Zweck:** Zählt, wie viele Kronkorken-Claims für eine Brauerei (oder einzelnes Brew) im Zeitraum vergeben wurden, die auf einen Scan zurückzuführen sind.

**Implementierungslogik:**

- `SELECT COUNT(*) FROM collected_caps` WHERE `brew_id IN (brews der Brauerei)` AND `claimed_via IN ('rating', 'direct')` AND `collected_at BETWEEN startDate AND endDate`
- Optional: JOIN auf `bottle_scans` via `(user_id, brew_id)` um sicherzugehen, dass ein Scan dem Claim vorausging (macht den Zusammenhang explizit)
- Rückgabe: `{ totalCapsClaimed: number, uniqueCapCollectors: number }`
- Auch als per-Brew-Variante `getBrewCapClaimRate(brewId, options)` implementieren

---

### 2.2 — `getBreweryAnalyticsSummary()` erweitern

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Änderung:** Die bestehende Funktion ruft bereits `getConversionRate()` auf. Ergänzen:

1. `logged_in_scans` aus `analytics_daily_stats` summieren und als `loggedInScans` zurückgeben
2. `getCapClaimRate()` aufrufen und als `capsClaimed`, `capCollectors` zurückgeben
3. Rückgabe-Typ `BreweryAnalyticsSummary` um die neuen Felder erweitern:
   ```typescript
   loggedInScans: number;
   capsClaimed: number;
   capCollectors: number;
   ```

---

### 2.3 — Komponente: `DrinkerFunnelCard`

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/DrinkerFunnelCard.tsx` (neu)

**Props:**

```typescript
interface DrinkerFunnelCardProps {
  totalScans: number;
  loggedInScans: number;
  verifiedDrinkers: number; // = convertedScans (existing)
  capCollectors: number;
  isLoading?: boolean;
}
```

**UI-Design:**

- Horizontaler Funnel mit 4 Stufen, je in einem abgestuften Farbverlauf (hell → satt)
- Pro Stufe: große Zahl, Label, prozentualer Anteil zur vorherigen Stufe
- Tooltip bei Hover erklärt jede Stufe ("Verified Drinkers = Scans gefolgt von einer Bewertung oder einem Kronkorken")
- Auf kleinen Screens: vertikal gestapelt
- Tier-Gating: ab `brewer`-Tier; darunter: Blur-Overlay mit Upgrade-Hinweis

**Platzierung:** Zwischen den 4 KPI-Karten oben und dem Scans-über-Zeit-Chart, volle Breite.

---

### 2.4 — Per-Brew-Funnel auf der Detail-Seite

**Datei:** `botllab-app/app/team/[breweryId]/analytics/brew/[brewId]/page.tsx`

**Änderung:**

- `getBrewCapClaimRate(brewId, options)` aufrufen (aus Phase 2.1)
- Bestehenden `getConversionRate`-Call durch brew-spezifische Variante ersetzen (falls noch nicht vorhanden)
- Neue `DrinkerFunnelCard`-Komponente (aus Phase 2.3) am oberen Seitenbereich einfügen — brew-spezifische Zahlen
- Klartextzeile darunter: "Von **${totalScans}** Menschen, die dieses Bier gescannt haben, haben **${verifiedDrinkers}** es nachweislich getrunken."

---

### 2.5 — UI-Copy: Konsistente Sprache im gesamten Dashboard

**Dateien:** `analytics/page.tsx`, `analytics/brew/[brewId]/page.tsx`, alle Analytics-Komponenten

**Änderungen:**

- Karten-Label "Scans" → "Aufrufe" (zur Klarheit, da nicht alle Scans vom QR-Code kommen)
- "Unique Visitors" → "Einzigartige Besucher" (war ggf. englisch)
- "Konversionsrate" → "Drinker Rate" mit Tooltip-Erklärung
- Alle Tooltips und Info-Icons aktualisieren, um das Verified-Drinker-Konzept zu erklären
- In der Top-Brews-Tabelle: neue Spalte "Drinker Rate" statt oder zusätzlich zur bisherigen Conversion-Spalte

---

## 🟡 PHASE 3: RATER-DEMOGRAFIE

> **Voraussetzung:** Phase 1 abgeschlossen (Scans sichtbar). Phase 2 kann parallel laufen.

### DSGVO-Einschätzung (vor Implementierung zu beachten)

- **Rechtsgrundlage:** Art. 6(1)(f) DSGVO — berechtigtes Interesse des Brauers, seine Zielgruppe zu verstehen
- **Datensparsamkeit:** Es werden ausschließlich **aggregierte Gruppenverteilungen** gezeigt, keine Einzelpersonen
- **Altersangabe:** `profiles.birthdate` wird bei Registrierung vom Nutzer selbst freiwillig angegeben (18+ Pflichtprüfung) — kein Problem
- **Opt-out:** `analytics_opt_out = true` schließt einen Nutzer aus allen demografischen Abfragen aus
- **Anonyme Scans:** (`viewer_user_id IS NULL`) werden als eigene Kategorie "Anonym / nicht eingeloggt" gezählt, nicht aus der Statistik entfernt (das wäre statistisch unehrlich)
- **Mindestgruppengröße:** Gruppen mit `n < 5` werden als "< 5 (zu wenige Daten)" angezeigt, nie als absolute Zahlen — verhindert Re-Identifizierung

---

### 3.1 — Server Action: `getRaterDemographics()`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Signatur:**

```typescript
type DemographicsOptions = {
  startDate?: string;
  endDate?: string;
  forVerifiedDrinkersOnly?: boolean; // true = nur converted_to_rating
};

type AgeGroup = "18-25" | "26-35" | "36-50" | "50+" | "unknown";
type ExperienceLevel = "newcomer" | "experienced" | "expert" | "anonymous";
type ActivityLevel = "casual" | "explorer" | "enthusiast" | "anonymous";

type DemographicsResult = {
  totalProfilesAnalyzed: number;
  anonymousScans: number;
  ageGroups: Record<AgeGroup, number>;
  experienceLevels: Record<ExperienceLevel, number>;
  activityLevels: Record<ActivityLevel, number>;
  topLocations: { location: string; count: number }[]; // Top 5, Freitext
};

async function getRaterDemographics(
  scope: { brewId: string } | { breweryId: string },
  options?: DemographicsOptions,
): Promise<DemographicsResult>;
```

**Implementierungslogik Schritt für Schritt:**

1. `bottle_scans` abfragen mit `brew_id = brewId` (oder `brewery_id = breweryId`) + Zeitraum-Filter + `converted_to_rating = true` falls `forVerifiedDrinkersOnly`
2. `viewer_user_id` aus allen Scans extrahieren — anonyme (`null`) separat zählen
3. `profiles` laden WHERE `id IN (viewer_user_ids)` AND `analytics_opt_out IS NOT TRUE` — nur Felder: `id, birthdate, joined_at, total_bottle_fills, location`
4. Pro Profil berechnen:
   - **Altersgruppe:** `(CURRENT_DATE - birthdate) / 365` → Gruppe; `null` → `'unknown'`
   - **Erfahrungslevel:** `(NOW() - joined_at)` → < 6 Monate = `'newcomer'`, 6–24 Monate = `'experienced'`, > 24 Monate = `'expert'`
   - **Aktivitätsgrad:** `total_bottle_fills` → < 5 = `'casual'`, 5–20 = `'explorer'`, > 20 = `'enthusiast'`
5. Top-5-Locations: `location`-Freitext trimmen, case-insensitive, häufigste 5 nehmen — `null`/leer überspringen
6. Mindestgröße-Regel: Gruppen mit `count < 5` werden mit `count: -1` zurückgegeben (UI zeigt "< 5")
7. Ergebnis für **Scanner gesamt** und **Verified Drinkers** separat zurückgeben (zwei Aufrufe mit unterschiedlichem `forVerifiedDrinkersOnly`)

---

### 3.2 — Komponente: `RaterDemographicsPanel`

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/RaterDemographicsPanel.tsx` (neu)

**UI-Aufbau:**

```
┌─ Wer trinkt dein Bier? ──────────────────────────────────â”
│  Datenbasis: nur eingeloggte Nutzer ohne Analytics-Opt-out │
│                                                           │
│  ┌─ Altersgruppen ─â”  ┌─ Erfahrung ───â”  ┌─ Aktivität ─â” │
│  │  Donut-Chart    │  │  Donut-Chart  │  │ Donut-Chart │ │
│  └─────────────────┘  └───────────────┘  └─────────────┘ │
│                                                           │
│  Scanner   vs.   Verified Drinkers  [Toggle]              │
│  [Vergleichs-Balken pro Gruppe]                           │
│                                                           │
│  Top Locations: Berlin • München • Hamburg • Wien • ...   │
│                                                           │
│  ℹ️ Anonyme Scans: 340 (nicht dargestellt, da kein Profil) │
└───────────────────────────────────────────────────────────┘
```

**Komponenten-Details:**

- Toggle "Alle Scanner / Verified Drinkers" schaltet zwischen den zwei Demografie-Datensätzen
- Donut-Charts mit Recharts (`PieChart` + `Cell`)
- Gruppen mit `count === -1` (< 5): grau mit Label "< 5"
- Tier-Gating: ab `brewery`-Tier (höher als Funnel, da sensitivere Daten)
- Datenschutz-Hinweis-Icon mit Tooltip: "Zeigt nur aggregierte Gruppen. Individuelle Nutzer sind nicht identifizierbar."

---

### 3.3 — Integration auf Per-Brew-Seite

**Datei:** `botllab-app/app/team/[breweryId]/analytics/brew/[brewId]/page.tsx`

**Änderung:** `getRaterDemographics({ brewId })` parallel zu den anderen Data-Fetches aufrufen (Server Component → `Promise.all`). `RaterDemographicsPanel` nach dem Taste-Profile-Bereich einfügen, vor dem Rating-Timeline-Chart.

---

## 🔵 PHASE 4: BIERSTIL-BENCHMARK

> **Voraussetzung:** Phase 1 abgeschlossen. Phases 2 und 3 können parallel beginnen.

**Kernkonzept:** Ein Brauer soll wissen, ob sein IPA bitterer, süßer oder ausgewogener ist als der Durchschnitt aller IPAs in BotlLab. Das setzt voraus, dass wir über alle öffentlichen Brews mit Bewertungen einen Stil-Durchschnitt berechnen.

### 4.1 — Migration: Materialisierte View `brew_style_averages`

**Datei:** `botllab-app/supabase/migrations/20260228210000_brew_style_benchmarks.sql`

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS brew_style_averages AS
SELECT
  LOWER(TRIM(b.style))              AS style_normalized,
  b.style                           AS style_display,     -- häufigster Originalname
  COUNT(DISTINCT b.id)              AS brew_count,
  COUNT(r.id)                       AS rating_count,
  ROUND(AVG(r.overall_score), 2)    AS avg_overall,
  ROUND(AVG(r.taste_bitterness), 2) AS avg_bitterness,
  ROUND(AVG(r.taste_sweetness), 2)  AS avg_sweetness,
  ROUND(AVG(r.taste_body), 2)       AS avg_body,
  ROUND(AVG(r.taste_carbonation), 2)AS avg_carbonation,
  ROUND(AVG(r.taste_acidity), 2)    AS avg_acidity,
  ROUND(AVG(r.taste_finish), 2)     AS avg_finish
FROM brews b
JOIN ratings r ON r.brew_id = b.id
WHERE
  b.is_public = true
  AND b.style IS NOT NULL
  AND TRIM(b.style) != ''
  AND TRIM(b.style) != 'Unbekannt'
  AND r.moderation_status = 'auto_approved'
GROUP BY LOWER(TRIM(b.style)), b.style
HAVING COUNT(DISTINCT b.id) >= 3   -- Mindestens 3 verschiedene Brews für Benchmark
WITH DATA;

-- Index für schnellen Lookup per Stil
CREATE UNIQUE INDEX IF NOT EXISTS brew_style_averages_style_idx
  ON brew_style_averages (style_normalized);

-- Zugriff für eingeloggte Nutzer erlauben
GRANT SELECT ON brew_style_averages TO authenticated;
```

---

### 4.2 — Migration: Cron-Job für tägliches View-Refresh

**Datei:** Dieselbe Migration wie 4.1

```sql
-- Funktion, die die View täglich aktualisiert
CREATE OR REPLACE FUNCTION refresh_brew_style_averages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY brew_style_averages;
END;
$$;

-- Cron-Job: täglich um 03:00 UTC
SELECT cron.schedule(
  'refresh-brew-style-averages',
  '0 3 * * *',
  'SELECT refresh_brew_style_averages()'
);
```

---

### 4.3 — Server Action: `getStyleBenchmark()`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Signatur:**

```typescript
type StyleBenchmarkResult = {
  brewStyle: string;
  brewStyleNormalized: string;
  brewValues: TasteProfile; // Eigenes Brew (aus get_brew_taste_profile)
  benchmarkValues: TasteProfile; // View-Durchschnitt
  deltas: Partial<TasteProfile>; // brewValues - benchmarkValues
  benchmarkBrewCount: number;
  benchmarkRatingCount: number;
  hasEnoughData: boolean; // false wenn brew_count < 3
};

async function getStyleBenchmark(
  brewId: string,
): Promise<StyleBenchmarkResult | null>;
```

**Implementierungslogik:**

1. `brews` laden für `brewId` → `style`-Spalte auslesen
2. `LOWER(TRIM(style))` → als `style_normalized` für den View-Lookup
3. View `brew_style_averages` WHERE `style_normalized = ?` abfragen
4. Wenn kein Ergebnis oder `has_enough_data = false`: `{ hasEnoughData: false }` zurückgeben
5. Eigenes Taste-Profile laden via RPC `get_brew_taste_profile(brewId)` (existiert bereits in `lib/rating-analytics.ts`)
6. Deltas berechnen: `delta.bitterness = own.bitterness - benchmark.avg_bitterness`, etc.
7. Alles zusammen zurückgeben

---

### 4.4 — Komponente: `StyleBenchmarkCard`

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/StyleBenchmarkCard.tsx` (neu)

**UI-Design:**

```
┌─ Dein IPA im Vergleich ──────────────────────────────────â”
│  Basierend auf 47 IPAs und 312 Bewertungen in BotlLab     │
│                                                           │
│  Bitterness  ████████░░  7.8  vs  6.9  +0.9 ↑            │
│  Sweetness   █████░░░░░  4.2  vs  5.1  -0.9 ↓            │
│  Body        ███████░░░  6.5  vs  6.8  -0.3 ~             │
│  Carbonation ██████████  8.1  vs  7.2  +0.9 ↑            │
│  Acidity     ████░░░░░░  3.8  vs  4.5  -0.7 ↓            │
│  Finish      ███████░░░  7.0  vs  6.5  +0.5 ↑            │
│                                                           │
│  ── Oder als Radar-Chart ──                               │
│  [Recharts RadarChart: eigenes vs. Durchschnitt]          │
└───────────────────────────────────────────────────────────┘
```

**Komponenten-Details:**

- Toggle zwischen Balken-Ansicht und Radar-Chart
- Delta-Anzeige: `> +0.5` = Aufwärtspfeil grün, `< -0.5` = Abwärtspfeil rot, dazwischen = neutral grau
- Wenn `hasEnoughData = false`: "Für den Stil '[style]' liegen noch zu wenig Vergleichsdaten vor (mind. 3 Brews erforderlich)"
- Wenn `style` leer oder 'Unbekannt': "Weise deinem Brew einen Bierstil zu, um den Benchmark zu sehen"
- Tier-Gating: ab `brewer`
- Platzierung: Auf Per-Brew-Detail-Seite, nach Taste-Profile, vor Rater-Demografie

---

### 4.5 — Batch A/B Testing: Sud-gegen-Sud-Vergleich

**Datei:** `botllab-app/lib/actions/analytics-actions.ts` + neue Komponente

**Schnittpunkt mit Phase 4:** Die Benchmark-Logik (Radar-Chart, Delta-Berechnung) ist identisch — nur wird nicht Brew-vs-Stil-Durchschnitt verglichen, sondern Brew A (z.B. Sud #41) gegen Brew B (z.B. Sud #42) desselben Rezepts.

**Server Action: `getBatchComparison(brewIdA, brewIdB)`**

```typescript
type BatchComparisonResult = {
  brewA: {
    id: string;
    name: string;
    batchNumber?: string;
    ratings: number;
    tasteProfile: TasteProfile;
    avgOverall: number;
  };
  brewB: {
    id: string;
    name: string;
    batchNumber?: string;
    ratings: number;
    tasteProfile: TasteProfile;
    avgOverall: number;
  };
  deltas: TasteProfile; // B minus A für jede Dimension
  significantDifferences: string[]; // z.B. ['bitterness', 'carbonation'] wenn |delta| > 0.5
  overallRatingChange: number; // Δ Overall Rating
  sampleSizeWarning: boolean; // true wenn einer der Sude < 10 Ratings hat
};
```

**Verbindung zu Phase 9 (Intent Classification):**
Nur `scan_intent IN ('single', 'repeat', 'confirmed')` Scans werden für den A/B Test berücksichtigt — Browse-Scans (Kühlschrank-Stöberer) verfälschen den Vergleich, da sie nie getrunken haben.

**Verbindung zu Phase 15 (BotlGuide Analyst):**
BotlGuide bekommt beide Taste-Profiles + die Brauprotokolle (Gärtemperatur, Hefestamm, Nachgärzeit) aus dem Session-Log und kann korrelieren: _"Sud B wurde an 2 Tagen statt 5 Tagen trockengehopft. Das korreliert mit dem 30% niedrigeren Frucht-Tag."_

**UI: `BatchComparisonCard`** — Zwei nebeneinander gelegte Radar-Charts, Delta-Pfeile, und eine Signifikanz-Anzeige ("Statistisch messbar" ab ≥10 Ratings pro Sud).

**Platzierung:** Tab _Geschmack & Qualität_ → eigener Abschnitt "Sud-Vergleich" mit Brew-Dropdown A + B.

Tier-Gating: ab `brewery`.

---

### 4.6 — Brauer-Sichtbarkeit: "Wie schneidet mein Bier ab?" Zusammenfassung

**Verbindung zu Phase 15 (BotlGuide Analyst):**
Aus Phase 4.3 (Style Benchmark) + Phase 4.5 (Batch Comparison) + Phase 5 (Taste Trend) generiert BotlGuide eine monatliche Qualitäts-Zusammenfassung:

> _"Dein Helles lag im März mit 4.3★ über dem BotlLab-Durchschnitt aller Hellen (3.9★). Im Vergleich zu deinem letzten Sud ist die Carbonation um 0.8 Punkte gestiegen. 2 Trinker meldeten den Tag 'Diacetyl' — prüfe die Nachgärzeit."_

Diese Zusammenfassung wird in der `analytics_ai_insights`-Tabelle (Phase 15) gespeichert und auf dem Dashboard als Action-Card angezeigt.

---

## 🟢 PHASE 5: GESCHMACKSPROFIL-TREND AUF HAUPT-DASHBOARD

> **Voraussetzung:** Keine — Phase 5 kann unabhängig begonnen werden, sobald Phase 1 abgeschlossen ist.

**Hintergrund:** `getTasteTimeline()` aus `lib/rating-analytics.ts` liefert bereits monatliche Durchschnitte der 6 Geschmacksdimensionen pro Brew. Es wird aktuell nur auf der Per-Brew-Detailseite visualisiert. Brauer mit mehreren Brews können nicht auf der Haupt-Seite sehen, welches Brew in welche Richtung driftet.

---

### 5.1 — Komponente: `TasteProfileTrendChart` (Haupt-Dashboard-Version)

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/TasteProfileTrendChart.tsx` (neu oder bestehende Komponente erweitern)

**Props:**

```typescript
interface TasteProfileTrendProps {
  brewId: string | null; // null = Brew-Auswahl zeigen
  brewOptions: { id: string; name: string }[];
  onBrewChange: (brewId: string) => void;
}
```

**UI-Design:**

- Dropdown oben rechts: "Brew auswählen" → bei Auswahl wird der Chart geladen
- Multi-Line-Chart (Recharts `LineChart`) mit bis zu 6 Linien (eine pro Geschmacksdimension)
- Toggle: "Alle Dimensionen" vs. ausgewählte Dimension(en) (Checkbox-Gruppe)
- X-Achse: Monate, Y-Achse: 1–10
- Auf < 3 Monate Datenpunkte: "Noch zu wenige Bewertungen für einen Trend"
- Tier-Gating: ab `brewer`

---

### 5.2 — Integration auf Haupt-Analytics-Seite

**Datei:** `botllab-app/app/team/[breweryId]/analytics/page.tsx`

**Änderung:**

- `loadAnalytics()` bereits vorhanden — Brew-Liste wird bereits geladen für Top-Brews-Tabelle. Dieselbe Liste an `TasteProfileTrendChart` übergeben.
- Wenn Brew im Dropdown gewählt wird → `getTasteTimeline(selectedBrewId)` aufrufen (server action) → State updaten
- Platzierung: Nach den Charts für Scans-über-Zeit und Peak-Hours, in einem neuen Accordion-Abschnitt "Geschmackstrend" — optional expandierbar, damit die Seite nicht überladen wirkt

---

### 5.3 — Off-Flavor Frühwarnsystem (Anomalie-Erkennung)

**Schnittpunkt mit Phase 5:** Der Taste Profile Trend (Phase 5.1) zeigt bereits die Entwicklung der 6 Geschmacksdimensionen. Das Off-Flavor-System ist ein **intelligenter Alert-Layer darüber**, der spezifisch nach Fehlgeschmacks-Spikes sucht.

**Schnittpunkt mit Phase 9:** Nur Ratings von Nutzern mit `scan_intent IN ('single', 'repeat', 'confirmed')` werden berücksichtigt. Browse-Scanner, die nie getrunken haben, können keine Off-Flavors melden.

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Server Action: `detectOffFlavorAnomaly(brewId)`**

```typescript
type OffFlavorAlert = {
  brewId: string;
  brewName: string;
  flaggedTags: string[]; // z.B. ['sauer', 'butter', 'pappe']
  occurrences: number; // Wie viele unabhängige Trinker haben den Tag vergeben
  threshold: number; // Ab wie vielen Meldungen wird alarmiert (default: 3)
  recentRatingIds: string[]; // Die konkreten Ratings (für Brauer-Nachforschung)
  severity: "warning" | "critical"; // warning: 3-4 Meldungen, critical: 5+
  comparisonToBaseline: number; // Prozentuale Abweichung vom historischen Durchschnitt dieses Brews
};
```

**Algorithmus:**

1. Lade alle Ratings der letzten 30 Tage für `brewId` mit `scan_intent != 'browse'`
2. Extrahiere die Flavor-Tags (z.B. aus `ratings.flavor_tags` JSONB-Array)
3. Bekannte Off-Flavor-Tags: `['sauer', 'butter', 'diacetyl', 'pappe', 'lösungsmittel', 'grüner apfel', 'acetaldehyd', 'metallisch', 'papier', 'nass', 'seifig', 'phenolisch']`
4. Zähle Vorkommen jedes Off-Flavor-Tags von **verschiedenen** `viewer_user_id`s (gleicher User zählt nur 1×)
5. Wenn ≥3 verschiedene Nutzer denselben Off-Flavor melden → `severity: 'warning'`
6. Wenn ≥5 → `severity: 'critical'`

**Verbindung zu Phase 6 (E-Mail-Report):**
Off-Flavor-Alerts der Stufe `critical` werden als **Sofort-Notification** per E-Mail gesendet, nicht erst im Wochenbericht. Template: `off-flavor-alert.html`.

**Verbindung zu Phase 15 (BotlGuide Analyst):**
BotlGuide bekommt den Alert + das Brauprotokoll und generiert eine Ursachen-Hypothese:

> _"3 Trinker melden 'Grüner Apfel/Acetaldehyd' bei Sud #42. In deinem Brauprotokoll sehe ich eine Nachgärzeit von 9 Tagen (Sud #41 hatte 14 Tage). Empfehlung: Verlängere die Nachgärung um mindestens 3 Tage."_

**UI:** Alert-Banner auf dem Tab _Geschmack & Qualität_, rot hinterlegt bei `critical`:

```
⚠️ OFF-FLAVOR ALERT: 3 unabhängige Trinker melden "Grüner Apfel" bei Sud #42
   Letzte 30 Tage | Severity: Warning | [Details anzeigen →]
```

Tier-Gating: ab `brewer` (Qualitätssicherung ist Kernfunktion).

---

### 5.4 — Degradationskurve (Shelf-Life Tracking)

**Schnittpunkt mit Phase 7.4:** Das Feld `bottle_age_days` wird dort bereits geplant und beim Scan befüllt. Die Degradationskurve ist die **analytische Visualisierung** dieser Daten.

**Server Action: `getShelfLifeCurve(brewId)`**

```typescript
type ShelfLifeDataPoint = {
  ageBucket: string; // '0-7', '8-14', '15-30', '31-60', '60+'
  avgRating: number; // Durchschnittsbewertung in diesem Altersbereich
  ratingCount: number; // Anzahl Ratings
  avgFruitiness: number | null; // Speziell für hopfenbetonte Biere: Frucht-Wahrnehmung
  avgBitterness: number | null;
};

type ShelfLifeResult = {
  dataPoints: ShelfLifeDataPoint[];
  peakAgeBucket: string; // Altersbereich mit der höchsten Bewertung
  dropOffAge: number | null; // Tage, ab denen die Bewertung signifikant sinkt (>0.5 Punkte)
  insight: string; // Automatischer Text
  hasEnoughData: boolean;
};
```

**Automatischer Insight-Text (Phase 15 BotlGuide):**

> _"Dein IPA wird am besten bewertet, wenn es 8-14 Tage alt ist. Ab Tag 45 sinkt die wahrgenommene Fruchtigkeit um 40%. Empfehlung: Kommuniziere an Händler, dass die Flasche innerhalb von 6 Wochen verkauft werden sollte."_

**UI: `ShelfLifeChart`** — Liniendiagramm mit X-Achse = Flaschenalter (Tage), Y-Achse = Ø Rating. Zusätzliche Overlay-Linie für spezifische Geschmacksdimensionen (z.B. Fruchtigkeit bei IPAs).

**Platzierung:** Tab _Geschmack & Qualität_ → nach dem Taste Trend.

Tier-Gating: ab `brewery`.

---

## ⚪ PHASE 6: WÖCHENTLICHER E-MAIL-REPORT

> **Voraussetzung:** Phase 1 abgeschlossen. Phase 2 empfohlen (damit der Funnel im Report auftaucht).

**Stand:** `ReportSettingsPanel`-Komponente ist vollständig implementiert. `sendAnalyticsReportEmail`-Funktion in `lib/email.ts` existiert. Es fehlt: Server Actions hinter den Buttons, Cron-Job-Infrastruktur.

---

### 6.1 — Report-Server-Actions prüfen und vervollständigen

**Datei:** Wahrscheinlich `botllab-app/lib/actions/report-actions.ts` (ggf. erstellen)

**Benötigte Funktionen (alle bereits vom `ReportSettingsPanel` aufgerufen):**

| Funktion                                    | Status | Aufgabe                                                |
| ------------------------------------------- | ------ | ------------------------------------------------------ |
| `getReportSettings(breweryId)`              | prüfen | Einstellungen aus DB laden (`report_settings` Tabelle) |
| `upsertReportSettings(breweryId, settings)` | prüfen | Einstellungen speichern                                |
| `sendTestReport(breweryId, email)`          | prüfen | Sofort einen Test-Report-Email senden                  |
| `generateReportData(breweryId, start, end)` | prüfen | Vorschau-Daten für Panel-Modal generieren              |
| `getReportLogs(breweryId)`                  | prüfen | Letzte 5 Versand-Logs laden                            |

Falls Tabelle `report_settings` fehlt: Migration erstellen mit Spalten `brewery_id, enabled, frequency, email, send_day, include_top_brews, include_geographic, include_device_stats`.

**Report-Content-Erweiterung:** `generateReportData` und `sendTestReport` um folgende Kennzahlen erweitern:

- `drinkerRate`: Verified-Drinker-Rate vs. Vorwoche
- `topFlavorTag`: häufigster Flavor-Tag der Woche
- `peakHour`: Stunde mit den meisten Scans
- `newVerifiedDrinkers`: Neue Verified Drinkers in diesem Zeitraum
- 🆕 `offFlavorAlerts`: Anzahl aktiver Off-Flavor-Warnungen (Phase 5.3) — bei `severity: 'critical'` wird der Report sofort verschickt, nicht erst am Wochentag
- 🆕 `batchComparisonHighlight`: Wenn ein neuer Sud signifikant besser/schlechter als der vorherige abschneidet (Phase 4.5)
- 🆕 `botlguideInsight`: KI-generierte Zusammenfassung der Woche aus Phase 15 (1–2 Sätze, z.B. _"Dein Helles war diese Woche das meistgescannte Bier auf BotlLab in München. 3 neue Stammtrinker gewonnen."_)

**Wichtig (Rechtlich):** Das E-Mail-Template in `lib/email.ts` (`analytics-report.html`) **muss zwingend** einen sofort erkennbaren 1-Click-Unsubscribe-Link erhalten. Das Fehlen dieses Links in regelmäßigen System-Mails führt selbst im B2B-Umfeld zur Markierung als Spam und kann nach UWG abgemahnt werden.

---

### 6.2 — Migration: Cron-Job für Report-Versand

**Datei:** `botllab-app/supabase/migrations/20260228220000_report_cron_job.sql`

**Logik:**

```sql
-- Funktion: prüft täglich, welche Brauereien einen Report fällig haben
CREATE OR REPLACE FUNCTION dispatch_pending_analytics_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rs.brewery_id, rs.email, rs.frequency, rs.send_day,
           rs.include_top_brews, rs.include_geographic
    FROM report_settings rs
    WHERE rs.enabled = true
      AND (
        -- Wöchentlich: today ist der konfigurierte Wochentag
        (rs.frequency = 'weekly'  AND EXTRACT(DOW FROM NOW()) = rs.send_day)
        OR
        -- Monatlich: today ist der konfigurierte Monatstag
        (rs.frequency = 'monthly' AND EXTRACT(DAY FROM NOW()) = rs.send_day)
      )
      -- Nicht noch heute schon gesendet
      AND NOT EXISTS (
        SELECT 1 FROM report_logs
        WHERE brewery_id = rs.brewery_id
          AND DATE(sent_at) = CURRENT_DATE
      )
  LOOP
    -- Next.js API Route aufrufen (via pg_net Extension oder http Extension)
    PERFORM net.http_post(
      url    := current_setting('app.site_url') || '/api/reports/dispatch',
      body   := json_build_object('brewery_id', r.brewery_id)::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END LOOP;
END;
$$;

-- Täglich um 07:00 UTC ausführen
SELECT cron.schedule(
  'dispatch-analytics-reports',
  '0 7 * * *',
  'SELECT dispatch_pending_analytics_reports()'
);
```

**API Route:** `botllab-app/app/api/reports/dispatch/route.ts` — nimmt `{ brewery_id }` entgegen, ruft `generateReportData()` auf, sendet via `sendAnalyticsReportEmail()`, schreibt Log-Eintrag in `report_logs`.

---

## 🟣 PHASE 7: ERWEITERTE SCAN-DATENBASIS

> **Voraussetzung:** Phase 1 abgeschlossen. Diese Phase erweitert den Daten-Input — die Ergebnisse fließen in Phase 2–5 ein und machen die bestehenden Analysen aussagekräftiger.

**Kernproblem:** Aktuell werden am Scan-Zeitpunkt verfügbare Kontextdaten nicht erfasst. `scanSource` ist hardcoded als `'qr_code'`, UTM-Parameter und Referrer werden ignoriert, und das Alter der Flasche (wie lange nach dem Abfüllen wurde gescannt?) bleibt ungenutzt. Um Geolocations lokal zu testen fehlen Vercel Mock Header.

---

### 7.1 — Vercel-Header Mock für lokale Entwicklung

**Datei:** `botllab-app/lib/actions/analytics-actions.ts` (in `trackBottleScan`)

**Problem:** Vercel IP-Header (`x-vercel-ip-country`, `x-vercel-ip-city`, `x-vercel-ip-latitude`, `x-vercel-ip-longitude`) existieren lokal unter Windows/Mac nicht. `trackBottleScan` empfängt lokal immer `undefined`. Um die Karten- und Regionalfunktionen (Phase 10 & 11) bauen und testen zu können, braucht die Action einen Development-Mock:

```typescript
// Fallback im Dev-Mode
if (process.env.NODE_ENV === "development") {
  countryCode = countryCode || "DE";
  city = city || "München";
  latitude = latitude || "48.1351";
  longitude = longitude || "11.5820";
}
```

---

### 7.2 — UTM-Parameter beim Scan erfassen

**Datei:** `botllab-app/app/b/[id]/page.tsx` + `botllab-app/lib/actions/analytics-actions.ts`

**Was sind UTM-Parameter?** Wenn ein Brauer einen QR-Code auf Instagram postet und `?utm_source=instagram&utm_medium=social` anhängt, kann er nachvollziehen, welcher Kanal die meisten Scans bringt. Aktuell werden diese Informationen verworfen.

**Neue `bottle_scans`-Spalten (Migration nötig):**

```sql
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer_domain text;  -- normalisiert, z.B. 'instagram.com'
```

**Änderung in `app/b/[id]/page.tsx`:**

```typescript
const searchParams = useSearchParams();
const utmSource = searchParams.get("utm_source") ?? undefined;
const utmMedium = searchParams.get("utm_medium") ?? undefined;
const utmCampaign = searchParams.get("utm_campaign") ?? undefined;

await trackBottleScan(bottle.id, {
  // ...bestehend...
  utmSource,
  utmMedium,
  utmCampaign,
});
```

---

### 7.2 — Referrer-URL erfassen

**Datei:** `botllab-app/app/b/[id]/page.tsx`

**Was ist der Referrer?** `document.referrer` gibt die URL zurück, von der der Nutzer kam — z.B. `https://www.instagram.com` wenn der Link über Instagram geöffnet wurde, oder leer bei direktem QR-Scan.

```typescript
// Im useEffect nach Page-Load:
const referrerDomain = document.referrer
  ? new URL(document.referrer).hostname.replace("www.", "")
  : "direct";

await trackBottleScan(bottle.id, {
  // ...bestehend...
  referrerDomain,
});
```

**Normalisierung:** Nur die Domain speichern (`instagram.com`, `facebook.com`, `untappd.com`, `direct`), nie die vollständige URL — Datensparsamkeit.

---

### 7.3 — `scanSource` dynamisch ableiten

**Datei:** `botllab-app/app/b/[id]/page.tsx`

**Aktueller Stand:** `scanSource` ist immer hardcoded `'qr_code'`. Das ist faktisch falsch — wenn jemand den Link per WhatsApp geteilt bekommt und klickt, ist es kein QR-Scan.

**Logik:**

```typescript
function deriveScanSource(
  searchParams: URLSearchParams,
  referrerDomain: string,
): "qr_code" | "direct_link" | "social" | "share" {
  if (searchParams.get("utm_medium") === "qr") return "qr_code";
  if (referrerDomain === "direct") {
    // Kein Referrer + kein UTM = wahrscheinlich echter QR-Code-Scan
    // (Mobile-Browser öffnen QR-Code-Links ohne Referrer)
    return "qr_code";
  }
  if (
    ["instagram.com", "facebook.com", "twitter.com", "tiktok.com"].includes(
      referrerDomain,
    )
  ) {
    return "social";
  }
  return "direct_link";
}
```

---

### 7.4 — Flaschenfüllalter zum Scan-Kontext ergänzen (Datenbasis für Shelf-Life)

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Idee:** Wenn eine Flasche gescannt wird, kann berechnet werden, wie alt sie zum Zeitpunkt des Scans war (`scanned_at - filled_at` in Tagen). Das erlaubt spätere Analysen wie: "Wird mein IPA hauptsächlich frisch (< 2 Wochen) oder gelagert (> 4 Wochen) getrunken?"

**Neue `bottle_scans`-Spalte:**

```sql
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS bottle_age_days integer;  -- NULL wenn filled_at fehlt
```

**In `trackBottleScan()`:** Beim Scan die `bottles.filled_at` laden (der Scan lädt den Bottle-Record sowieso bereits für den Owner-Check) und die Differenz in Tagen berechnen und speichern.

**🔗 Verbindung zu Phase 5.4 (Degradationskurve):** Dieses Feld ist die direkte Datenbasis für die Shelf-Life-Analyse. Ohne `bottle_age_days` kann Phase 5.4 nicht funktionieren. Erst das Feld anlegen (hier), dann die Analyse-Komponente bauen (Phase 5.4).

**🔗 Verbindung zu Phase 15 (BotlGuide Analyst):** BotlGuide korreliert das Flaschenalter mit Geschmackstags: _"Dein IPA verliert ab Tag 45 messbar an Fruchtigkeit. Empfehlung an Händler: Innerhalb von 6 Wochen abverkaufen."_

**Analytics-Use-Case:** Neues Widget "Wie frisch wird dein Bier getrunken?" — Histogram: 0–7 Tage / 8–14 / 15–30 / > 30 Tage nach Abfüllung. Zeigt dem Brauer, ob sein Bier frisch oder als gereiftes Bier konsumiert wird.

---

### 7.5 — ABV/IBU/SRM aus `brews.data` normalisieren

**Datei:** `botllab-app/supabase/migrations/` + `botllab-app/lib/actions/analytics-actions.ts`

**Problem:** `brews.abv`, `brews.ibu`, `brews.srm` existieren **nicht als eigenständige Spalten** in der `brews`-Tabelle. Alle Rezept-Werte sind im JSONB-Blob `brews.data` vergraben. Das macht SQL-basierte Analysen (z.B. "Welche ABV-Klasse bekommt die besten Bewertungen?") unmöglich ohne JSON-Parsing in der Query.

**Lösung — Generated Columns (PostgreSQL 12+):**

```sql
ALTER TABLE brews
  ADD COLUMN IF NOT EXISTS abv_calculated numeric(5,2)
    GENERATED ALWAYS AS ((data->>'abv')::numeric) STORED,
  ADD COLUMN IF NOT EXISTS ibu_calculated integer
    GENERATED ALWAYS AS ((data->>'ibu')::integer) STORED,
  ADD COLUMN IF NOT EXISTS srm_calculated numeric(5,1)
    GENERATED ALWAYS AS ((data->>'srm')::numeric) STORED;
```

**Vorteil:** Keine Datenmigration nötig, immer synchron mit `data`, indizierbar.

**Analytics-Use-Case:** Im Stil-Benchmark (Phase 4) können jetzt ABV-Bereiche (z.B. "Dein IPA hat 6.8% ABV — der Stil-Durchschnitt liegt bei 6.2%") mit angezeigt werden. Außerdem: Korrelation Bewertung vs. ABV möglich.

---

### 7.6 — UI: Herkunftsquellen-Breakdown

**Datei:** `botllab-app/app/team/[breweryId]/analytics/page.tsx`

**Neue Komponente:** `ScanSourceBreakdownCard` — zeigt wo die Scans herkommen:

```
QR-Code (direkt)   ████████████  68%
Instagram          ████░░░░░░░░  18%
Direkt-Link        ██░░░░░░░░░░   9%
Facebook           █░░░░░░░░░░░   5%
```

**Daten:** `bottle_scans` gruppiert nach `scan_source` + `referrer_domain`. Tier-Gating: ab `brewer`.

---

## 🌤️ PHASE 8: WETTER-KORRELATION

> ⚠️ **Niedrigste Priorität — Nice-to-Know-Feature.** Wetter-Korrelation ist intellektuell spannend, löst aber keinen direkten Pain Point für Brauer. Kein Brauer wird BotlLab wegen Wetter-Daten kaufen. Diese Phase wird nur umgesetzt, wenn alle höherwertigen Phasen (insb. Phase 9, 11, 15) abgeschlossen und stabil sind. Im Zweifelsfall wird Phase 8 gestrichen.

> **Voraussetzung:** Phase 7 (Scan-Kontext) abgeschlossen. Die Geo-Daten (lat/lng) aus Phase 1 sind die Grundlage.

**Kernfrage:** Gibt es einen Zusammenhang zwischen Wetter und Bierkonsum? Wird mein Weizen öfter gescannt wenn es warm und sonnig ist? Wird mein Schwarzbier eher bei kühlem Wetter getrunken? Das ist für einen Brauer sowohl marketingtechnisch ("Wann kommunizieren?") als auch rezepttechnisch ("Welchen Stil brauche ich für den Sommer?") relevant.

**Kein anderes Craft-Bier-Analytics-Tool der Welt korreliert Wetter mit Konsumverhalten.** Das ist ein echter, einzigartiger USP.

---

### 8.1 — Konzeptentscheidung: Erfassungsstrategie

Es gibt zwei Ansätze:

| Ansatz                                | Beschreibung                                                                                                           | Vor                                        | Nachteil                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| **A — Echtzeit (zum Scan-Zeitpunkt)** | Beim Scan wird die Open-Meteo API mit lat/lng + timestamp aufgerufen, Wetterdaten direkt in `bottle_scans` gespeichert | Exakte Daten, keine Aufholung nötig        | +~100ms Latenz pro Scan, API-Abhängigkeit im Scan-Pfad, Kosten bei vielen Scans |
| **B — Historisch (nachträglich)**     | Cron-Job liest `bottle_scans` ohne Wetterdaten und ruft Open-Meteo Historical Weather API auf                          | Scan-Pfad unberührt, keine Latenz, günstig | Verzögerung 1–24h, Daten nur für vergangene Scans                               |
| **C — Hybrid**                        | Für neue Scans: async (Fire-and-forget nach dem Scan-Insert), für alte Scans: historischer Cron                        | Beste Balance                              | Komplexer                                                                       |

**Empfehlung: Ansatz C (Hybrid)** — Neue Scans erhalten Wetter asynchron (via Supabase Edge Function oder Background Job, nicht im Scan-kritischen Pfad), bestehende Scans werden rückwirkend aufgefüllt.

---

### 8.2 — Datenmodell

**Option A — Spalten direkt in `bottle_scans`:**

```sql
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS weather_temp_c        numeric(4,1),   -- z.B. 18.5
  ADD COLUMN IF NOT EXISTS weather_condition     text,           -- 'sunny', 'cloudy', 'rainy', 'snowy'
  ADD COLUMN IF NOT EXISTS weather_category      text,           -- 'hot' (>25°C), 'warm' (15-25°C), 'cool' (5-15°C), 'cold' (<5°C)
  ADD COLUMN IF NOT EXISTS weather_is_outdoor    boolean,        -- Schätzung: temp > 15°C AND kein Regen → outdoor-freundlich
  ADD COLUMN IF NOT EXISTS weather_fetched_at    timestamptz;    -- NULL = noch nicht abgerufen
```

**Option B — Separate Tabelle `scan_weather`** (JOIN über `scan_id`): Sauberer, aber komplexere Queries.

**Empfehlung: Option A** — Analytics-Queries bleiben einfach, keine JOIN-Komplexität. Die Wetter-Spalten sind nullable, `weather_fetched_at IS NULL` kennzeichnet noch nicht verarbeitete Scans.

---

### 8.3 — Open-Meteo API Integration

**Warum Open-Meteo?**

- Kostenlos, keine API-Key erforderlich für Basis-Nutzung
- Historical Weather API: Stündliche Wetterdaten der Vergangenheit für jeden Koordinatenpunkt
- GDPR-konform (Server in Europa, keine Nutzer-PII wird übertragen — nur lat/lng + Timestamp)
- Rate Limit: 10.000 Requests/Tag kostenlos → reicht für typisches Scan-Volumen

**API-Endpunkt (Historical):**

```
https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}
  &longitude={lng}
  &start_date={YYYY-MM-DD}
  &end_date={YYYY-MM-DD}
  &hourly=temperature_2m,weathercode,precipitation
  &timezone=auto
```

**WMO Weather Code → Kategorie Mapping:**

```typescript
function weatherCodeToCondition(code: number): string {
  if (code === 0) return "sunny"; // Clear sky
  if (code <= 3) return "partly_cloudy"; // Mainly clear / partly cloudy
  if (code <= 49) return "foggy";
  if (code <= 67) return "rainy";
  if (code <= 77) return "snowy";
  if (code <= 82) return "rainy"; // Rain showers
  return "stormy";
}

function tempToCategory(temp: number): string {
  if (temp > 25) return "hot";
  if (temp > 15) return "warm";
  if (temp > 5) return "cool";
  return "cold";
}
```

**Neue Datei:** `botllab-app/lib/weather-service.ts` — kapselt den Open-Meteo-Aufruf, Fehlerbehandlung und Mapping.

---

### 8.4 — Aggregation: Wetter-Cron-Job

**Neue Supabase Migration:** Cron-Job läuft stündlich und füllt `weather_fetched_at IS NULL`-Scans auf:

```sql
SELECT cron.schedule(
  'fetch-scan-weather',
  '0 * * * *',   -- jede Stunde
  $$
  SELECT net.http_post(
    url := current_setting('app.site_url') || '/api/analytics/fetch-weather',
    body := '{}',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
```

**API Route `app/api/analytics/fetch-weather/route.ts`:**

1. `SELECT id, latitude, longitude, scanned_at FROM bottle_scans WHERE weather_fetched_at IS NULL AND latitude IS NOT NULL LIMIT 50`
2. Gruppiere nach (lat_rounded_1dec, lng_rounded_1dec, date) → max. 1 Open-Meteo-Call pro Gruppe
3. Updatee alle Scans der Gruppe mit den Wetterdaten
4. Bei API-Fehler: `weather_fetched_at = NOW()`, `weather_condition = 'unavailable'` — verhindert endlose Retry-Loops

---

### 8.5 — UI: Wetter-Korrelations-Chart

**Neue Komponente:** `WeatherCorrelationChart` auf der Analytics-Hauptseite

**Ansicht 1 — Scans nach Wetter-Kategorie:**

```
☀️ Sonnig / warm    ████████████████  52%  (342 Scans)
⛅ Bewölkt / mild   ████████░░░░░░░░  28%  (184 Scans)
🌧️ Regen / kühl    ████░░░░░░░░░░░░  14%  (92 Scans)
â„️ Kalt / Winter   ██░░░░░░░░░░░░░░   6%  (39 Scans)
```

**Ansicht 2 — Temperatur-Histogram:**
Scans nach Temperaturbereich (5°C-Buckets), Overlay mit Bewertungs-Durchschnitt in jedem Bucket.

**Ansicht 3 — Korrelations-Insight-Text (automatisch generiert):**

> "Dein Weizen wird zu 78% bei warmem oder heißem Wetter gescannt — deutlich über dem Durchschnitt aller Brews (54%). Perfekt für Sommer-Marketing."

Tier-Gating: ab `brewery` (da neue Datenquelle, Premium-Wert).

---

### 8.6 — Historische Aufholung bestehender Scans

**Einmalige Migration:** API-Route oder Admin-Script, das alle bestehenden Scans mit `latitude IS NOT NULL AND weather_fetched_at IS NULL` rückwirkend über Open-Meteo Historical API befüllt. Rate-Limited auf 100 Scans/Minute um die kostenlose API-Quota nicht zu überschreiten.

**Hinweis:** Open-Meteo Historical reicht Jahre zurück — alle bisherigen Scans können theoretical rückwirkend mit Wetterdaten versehen werden.

---

## 🧠 PHASE 9: SCAN INTENT CLASSIFICATION + DRINKER-BESTÄTIGUNG

> **Voraussetzung:** Phase 1 + Phase 7 (UTM/Referrer für Social-Scan-Erkennung). Die Klassifikation macht das Verified-Drinker-Modell aus Phase 2 deutlich präziser.

**Kernproblem:** Das aktuelle Modell kennt nur binäre Zustände: "hat gescannt" vs. "hat bewertet". Aber ein Scan hat einen **Kontext**, der die Wahrscheinlichkeit eines tatsächlichen Konsums stark verändert. Beispiel: Jemand steht vor seinem Kühlschrank und scannt 5 Biere in 3 Minuten, um sich zu entscheiden — nur eines wird getrunken. Im aktuellen Modell zählen alle 5 als gleichwertige Scans. Das verfälscht die Drinker Rate.

---

### Verhaltens-Szenarien, die wir erkennen können

| Szenario                 | Verhalten                                                                               | Erkennungsmuster                                                                                      | Scan-Intent         |
| ------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| **Kühlschrank-Browsing** | Nutzer scannt mehrere Etiketten schnell hintereinander, um sich ein Bild zu machen      | ≥3 Scans von **verschiedenen** Flaschen/Brews, selbe Session (`session_hash`), ≤5 Minuten Gesamtdauer | `browse`            |
| **Sammler-Check**        | Nutzer scannt seine Sammlung durch (z.B. Kronkorken-Kollektion)                         | ≥5 Scans verschiedener Brews/Flaschen, selbe Session, ≤10 Minuten                                     | `collection_browse` |
| **Wiederholungskäufer**  | Eingeloggter Nutzer scannt dasselbe Brew an einem anderen Tag erneut                    | Selber `viewer_user_id` + selber `brew_id`, ≥2 verschiedene Kalendertage                              | `repeat`            |
| **Party-Scan**           | Mehrere verschiedene Sessions scannen dasselbe Brew am selben Ort innerhalb kurzer Zeit | ≥3 verschiedene `session_hash`, selber `brew_id`, Radius < 1km, Zeitfenster < 3h                      | `event`             |
| **Social-Entdeckung**    | Scan kommt über Social-Media-Referrer oder UTM                                          | `referrer_domain` ist Social oder `utm_source` ist Social                                             | `social_discovery`  |
| **Einzelscan**           | Ein einziger Scan in einer Session, kein Folge-Scan                                     | 1 Scan, kein weiterer Scan desselben `session_hash` innerhalb von 30 Min                              | `single`            |
| **Bestätigter Konsum**   | Nutzer klickt aktiv "Ja, ich trinke das gerade"                                         | `confirmed_drinking = true`                                                                           | `confirmed`         |

---

### 9.1 — Migration: Neue Spalten auf `bottle_scans`

**Datei:** `botllab-app/supabase/migrations/20260228240000_scan_intent_classification.sql`

```sql
-- Scan-Intent-Klassifikation (wird nachträglich per Batch gesetzt)
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS scan_intent text DEFAULT NULL;
  -- Werte: 'browse', 'collection_browse', 'repeat', 'event',
  --        'social_discovery', 'single', 'confirmed', NULL (=noch nicht klassifiziert)

-- Drinker-Bestätigung (explizite Nutzer-Aktion)
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS confirmed_drinking boolean DEFAULT NULL;
  -- NULL = nicht gefragt, true = bestätigt, false = verneint

-- Drinker-Wahrscheinlichkeit (berechneter Score basierend auf Intent)
ALTER TABLE bottle_scans
  ADD COLUMN IF NOT EXISTS drinking_probability numeric(3,2) DEFAULT NULL;
  -- 0.00–1.00 — wie wahrscheinlich ist es, dass dieser Scan zu Konsum geführt hat

-- Index für Batch-Klassifikation
CREATE INDEX IF NOT EXISTS idx_bottle_scans_intent_null
  ON bottle_scans (created_at)
  WHERE scan_intent IS NULL;
```

**Zusätzlicher Backend-Trigger (Rückwirkende Garantie):**
Wenn ein Nutzer ein Rating hinterlässt oder einen Kronkorken einlöst (der absolute Konsumbeweis), muss der zugrundeliegende Scan in der `bottle_scans` Tabelle rückwirkend auf `scan_intent = 'confirmed'` und `drinking_probability = 1.0` geupdatet werden. Das geschieht idealerweise in den jeweiligen Server Actions (`createRating`, `claimCap`).

**Probability-Mapping (Startwerte, werden über Feedback-Loop kalibriert):**

| Intent              | `drinking_probability` | Begründung                                            |
| ------------------- | ---------------------- | ----------------------------------------------------- |
| `confirmed`         | 1.00                   | Nutzer hat bestätigt                                  |
| `repeat`            | 0.85                   | Stammtrinker — sehr wahrscheinlich Konsum             |
| `event`             | 0.70                   | Verkostung/Event — hohe Wahrscheinlichkeit            |
| `single`            | 0.50                   | Unbekannt — Basis-Annahme                             |
| `social_discovery`  | 0.30                   | Neugierig, aber nicht zwingend physisch beim Bier     |
| `browse`            | 0.15                   | Kühlschrank-Durchstöbern — nur 1 von N wird getrunken |
| `collection_browse` | 0.05                   | Sammlung anschauen — kaum Konsum                      |

---

### 9.2 — Browse-Scan-Erkennung (Batch-Klassifikation)

**Datei:** `botllab-app/lib/actions/analytics-actions.ts` + Cron-Job-Migration

**Algorithmus:**

```typescript
async function classifyBrowseScans(): Promise<number> {
  // 1. Hole alle noch nicht klassifizierten Scans, gruppiert nach session_hash + Datum
  // 2. Für jede (session_hash, date)-Gruppe:
  //    a) Zähle verschiedene bottle_id/brew_id innerhalb eines 5-Minuten-Fensters
  //    b) Wenn count >= 3 verschiedene Brews in ≤5 Min:
  //       → Alle Scans dieser Burst-Gruppe = 'browse'
  //    c) Wenn count >= 5 verschiedene Brews in ≤10 Min:
  //       → Alle Scans = 'collection_browse'
  //    d) Sonst: 'single'
  // 3. Setze scan_intent + drinking_probability für jede klassifizierte Zeile
  // Rückgabe: Anzahl klassifizierter Scans
}
```

**PostgreSQL-optimierte Query (im Cron-Job):**

```sql
-- Finde Browse-Bursts: Sessions mit >= 3 verschiedenen Brews in 5 Minuten
WITH scan_windows AS (
  SELECT
    id,
    session_hash,
    brew_id,
    created_at,
    COUNT(DISTINCT brew_id) OVER (
      PARTITION BY session_hash
      ORDER BY created_at
      RANGE BETWEEN INTERVAL '5 minutes' PRECEDING AND CURRENT ROW
    ) AS distinct_brews_in_window
  FROM bottle_scans
  WHERE scan_intent IS NULL
    AND session_hash IS NOT NULL
    AND created_at > NOW() - INTERVAL '24 hours'
)
UPDATE bottle_scans bs
SET
  scan_intent = CASE
    WHEN sw.distinct_brews_in_window >= 5 THEN 'collection_browse'
    WHEN sw.distinct_brews_in_window >= 3 THEN 'browse'
    ELSE NULL  -- später von anderem Classifier behandelt
  END,
  drinking_probability = CASE
    WHEN sw.distinct_brews_in_window >= 5 THEN 0.05
    WHEN sw.distinct_brews_in_window >= 3 THEN 0.15
    ELSE NULL
  END
FROM scan_windows sw
WHERE bs.id = sw.id
  AND sw.distinct_brews_in_window >= 3;
```

**Cron:** Läuft alle 15 Minuten, verarbeitet maximal die letzten 24 Stunden unklassifizierter Scans.

---

### 9.3 — Repeat-Scan-Erkennung (Loyalty-Klassifikation)

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Algorithmus:** Nur für eingeloggte Nutzer (`viewer_user_id IS NOT NULL`) möglich, da anonyme Sessions täglich rotieren.

```sql
-- Finde Repeat-Scanner: Selber User hat verschiedene physische Flaschen desselben Brews an mind. 2 verschiedenen Tagen gescannt
WITH user_brew_days AS (
  SELECT
    viewer_user_id,
    brew_id,
    COUNT(DISTINCT DATE(created_at)) AS distinct_days,
    COUNT(DISTINCT bottle_id) AS distinct_bottles,
    ARRAY_AGG(DISTINCT id) AS scan_ids
  FROM bottle_scans
  WHERE scan_intent IS NULL
    AND viewer_user_id IS NOT NULL
    AND brew_id IS NOT NULL
  GROUP BY viewer_user_id, brew_id
  HAVING COUNT(DISTINCT DATE(created_at)) >= 2
     AND COUNT(DISTINCT bottle_id) >= 2 -- WICHTIG: Muss eine andere Flasche sein!
)
UPDATE bottle_scans bs
SET
  scan_intent = 'repeat',
  drinking_probability = LEAST(0.85 + (ubd.distinct_days - 2) * 0.03, 0.95)
  -- Steigt leicht mit jedem weiteren Tag, max 0.95 (nie 1.0 ohne Bestätigung)
FROM user_brew_days ubd
WHERE bs.id = ANY(ubd.scan_ids)
  AND bs.scan_intent IS NULL;  -- Nicht überschreiben wenn schon klassifiziert
```

---

### 9.4 — Drinker-Bestätigungs-Popup: Smart Sampling + Engagement-basiertes Timing

**Datei:** `botllab-app/app/b/[id]/page.tsx` + neue Komponente `DrinkingConfirmationPrompt`

**Konzept:** Nachdem der Scan getrackt und die Flaschenseite geladen wurde, wird dem Nutzer ein **nicht-aufdringliches Popup** gezeigt, das fragt: "Trinkst du dieses Bier gerade?" — aber **nicht jedem Nutzer, nicht jedes Mal, und nicht sofort.**

**Design:**

```
┌───────────────────────────────────────â”
│  🍺 Trinkst du dieses Bier gerade?  │
│                                       │
│  Hilft dem Brauer zu verstehen,        │
│  wie beliebt sein Bier wirklich ist.    │
│                                       │
│  [ Ja, Prost! 🍻 ]  [ Nein, nur schauen ] │
│                                       │
│  â˜ Nicht mehr fragen                    │
└───────────────────────────────────────┘
```

---

#### 9.4.1 — Best Practices: Warum "einfach alle fragen" falsch ist

**Problem mit dem naiven Ansatz:** Jede Unterbrechung kostet User-Engagement. Und: Wenn wir _jedem_ Nutzer die Frage stellen, erhalten wir zwar viele Antworten, aber der **Informationsgewinn pro Frage ist ungleich verteilt**. Nutzer, deren Verhalten eindeutig ist (5 Scans in 2 Minuten = offensichtlich Browse), liefern wenig Neues. Nutzer mit ambigem Verhalten (einzelner Scan, 45 Sekunden auf der Seite) liefern viel.

**Bekannte Herangehensweisen aus der Praxis:**

| Methode                                    | Anwendung                                                                                                                     | Für uns                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Uncertainty Sampling** (Active Learning) | ML-Labeling: Frage nur dort, wo das Modell unsicher ist. Standard in NLP/CV-Annotation-Tools (Prodigy, Label Studio).         | Frage bevorzugt bei `drinking_probability` nahe 0.5                                  |
| **Thompson Sampling** (Multi-Armed Bandit) | A/B-Testing (Optimizely, VWO): Frage mehr bei hoher Varianz, weniger bei Sicherheit. Balanciert Exploration vs. Exploitation. | Frage mehr in Intent-Kategorien mit wenig Daten                                      |
| **Engagement-triggered Prompts**           | Hotjar, Qualaroo, Apple Permission Dialogs: Frage erst, wenn der Nutzer aktiv interagiert hat.                                | Warte auf Scroll, Verweildauer >30s, oder Tap auf Details                            |
| **Progressive Disclosure**                 | LinkedIn Profil-Vervollständigung, Duolingo: Baue Vertrauen auf, frage schrittweise mehr.                                     | Erste Nutzung: nie fragen. Ab 3. Scan: vielleicht. Ab 5.: häufiger.                  |
| **Micro-Survey-Prinzip**                   | Pendo, Appcues: 1 Frage hat 10-20× höhere Antwortrate als 3 Fragen.                                                           | Immer nur 1 Frage. Nie mehr.                                                         |
| **Implicit > Explicit**                    | Netflix ("Still watching?"), Spotify (Skip = dislike): Verhaltenssignale sind wertvoller als Antworten.                       | Verweildauer, Scroll-Tiefe, Rating-Abgabe sind stärkere Signale als Popup-Antworten. |

**Kernlektion:** Die wertvollste Frage ist die, die wir **nicht** stellen müssen, weil wir die Antwort bereits aus dem Verhalten ableiten können. Das Popup ist der _Fallback_, nicht der Hauptkanal.

---

#### 9.4.2 — Smart Sampling: Wen fragen wir? (Uncertainty-basiert)

**Prinzip:** Nicht jeder Scan hat denselben Informationswert. Wir berechnen pro Scan einen **Information Gain Score** und fragen nur, wenn dieser Score hoch genug ist.

```typescript
type SamplingDecision = {
  shouldAsk: boolean;
  reason: string; // Für Debugging & Admin-Dashboard
};

function shouldAskForConfirmation(
  scan: BottleScan,
  userHistory: UserScanHistory,
): SamplingDecision {
  // 1. Hard-Excludes (niemals fragen)
  if (scan.is_owner_scan) return { shouldAsk: false, reason: "owner_scan" };
  if (scan.scan_intent === "browse")
    return { shouldAsk: false, reason: "browse_burst" };
  if (scan.scan_intent === "collection_browse")
    return { shouldAsk: false, reason: "collection" };
  if (userHistory.optedOut) return { shouldAsk: false, reason: "opted_out" };
  if (userHistory.askedInThisSession)
    return { shouldAsk: false, reason: "already_asked_session" };
  if (userHistory.confirmedThisBrewToday)
    return { shouldAsk: false, reason: "already_confirmed_today" };
  if (userHistory.totalScans <= 2)
    return { shouldAsk: false, reason: "new_user_trust_building" };

  // 2. Cold-Start-Bonus: Wenige bisherige Feedbacks → höhere Sampling-Rate
  const coldStartBonus = userHistory.totalFeedbacks < 3 ? 0.2 : 0;

  // 3. Uncertainty Score: Je näher an 0.5, desto wertvoller die Antwort
  const uncertainty = 1 - Math.abs(2 * (scan.drinking_probability ?? 0.5) - 1);
  // uncertainty = 1.0 bei prob=0.5 (maximale Unsicherheit)
  // uncertainty = 0.0 bei prob=0.0 oder prob=1.0 (keine Unsicherheit)

  // 4. Kategorie-Coverage: Frage häufiger in Kategorien mit wenig Feedback-Daten
  const categoryN = getCategoryFeedbackCount(scan.scan_intent);
  const coverageBonus = categoryN < 50 ? 0.2 : categoryN < 200 ? 0.05 : 0;

  // 5. Finale Sampling-Wahrscheinlichkeit
  const samplingRate = Math.min(
    BASE_SAMPLING_RATES[scan.scan_intent ?? "single"] +
      coldStartBonus +
      uncertainty * 0.15 + // Max +15% für hohe Unsicherheit
      coverageBonus,
    0.5, // Nie mehr als 50% der Nutzer fragen
  );

  const shouldAsk = Math.random() < samplingRate;
  return {
    shouldAsk,
    reason: shouldAsk
      ? `sampled_at_${(samplingRate * 100).toFixed(0)}pct`
      : "not_sampled",
  };
}
```

**Base Sampling Rates pro Intent-Kategorie:**

| Intent                         | Base Rate | Begründung                                                      |
| ------------------------------ | --------- | --------------------------------------------------------------- |
| `single` (prob 0.50)           | 20%       | Höchste Unsicherheit → höchster Informationsgewinn              |
| `social_discovery` (prob 0.30) | 15%       | Mittlere Unsicherheit                                           |
| `event` (prob 0.70)            | 10%       | Mittlere Sicherheit, aber Events sind selten → mehr Daten nötig |
| `repeat` (prob 0.85)           | 5%        | Hohe Sicherheit, selten fragen                                  |
| `browse` / `collection_browse` | 0%        | Nie fragen (Hard-Exclude, würde Browse-Flow stören)             |
| `confirmed`                    | 0%        | Bereits bestätigt (via Rating/Cap)                              |

**Dynamische Anpassung:** Sobald eine Kategorie ≥200 Feedbacks hat UND die Accuracy >90% ist, wird die Base Rate auf 2% reduziert ("Maintenance Mode"). Sinkt die Accuracy unter 75%, steigt die Rate auf 30% ("Re-Learning Mode").

---

#### 9.4.3 — Engagement-basiertes Timing: Wann fragen?

**Problem mit der bisherigen "10 Sekunden nach Seitenlade"-Regel:** Der Nutzer könnte die Seite geöffnet haben und sofort zum nächsten Tab gewechselt. 10 Sekunden sind keine Garantie für Engagement.

**Neuer Ansatz: Engagement-Signale statt Timer.**

```typescript
type EngagementSignal = {
  scrolledPast50Percent: boolean; // Hat über die Hälfte der Seite gescrollt
  dwellTimeSeconds: number; // Aktive Verweildauer (Tab im Fokus)
  interacted: boolean; // Hat auf irgendein Element geklickt/getappt
  readingRatings: boolean; // Scrollt im Ratings-Bereich
};

const ENGAGEMENT_THRESHOLDS = {
  minDwellTime: 15, // Mindestens 15 Sekunden aktive Verweildauer
  minScrollDepth: 0.3, // Mindestens 30% der Seite gesehen
  exitIntentDelay: 3, // 3 Sekunden bevor Banner eingeblendet wird
};

function isUserEngaged(signals: EngagementSignal): boolean {
  // Mindestens EINES der folgenden Signale:
  return (
    signals.dwellTimeSeconds >= ENGAGEMENT_THRESHOLDS.minDwellTime ||
    signals.scrolledPast50Percent ||
    signals.interacted
  );
}
```

**Timing-Hierarchie (beste → schlechteste Gelegenheit):**

1. **🥇 Nach Rating-Abgabe** — Der Nutzer hat gerade bewertet → "Du hast bewertet, d.h. du trinkst das gerade? [Ja/Nein]" → Natürlichster Moment, höchste Antwortbereitschaft. Aber: Rating _ist_ bereits ein Konsum-Signal. Trotzdem fragen, weil die explizite Bestätigung den Datensatz für's Modell-Training validiert.
2. **🥈 Scroll in den Ratings-Bereich** — Der Nutzer liest Bewertungen anderer Leute → stark engagiert → guter Zeitpunkt.
3. **🥉 30 Sekunden aktive Verweildauer** — Nutzer liest die Bier-Details → mäßig engagiert → akzeptabler Zeitpunkt.
4. **⚠️ Exit-Intent** — Nutzer scrollt zum Seitenanfang zurück / drückt Back → letzte Chance, aber riskant (kann als aufdringlich empfunden werden). Nur bei `single`-Scans verwenden.

**Implementierung:** `IntersectionObserver` auf den Ratings-Abschnitt + `visibilitychange` Event für Tab-Fokus-Tracking + Scroll-Listener mit Debouncing.

---

#### 9.4.4 — Trigger-Regeln (konsolidiert)

1. Erst nach **Engagement-Signal** anzeigen (ersetzt den starren 10-Sekunden-Timer)
2. **Nie anzeigen** wenn:
   - Nutzer hat "Nicht mehr fragen" gewählt (`localStorage: botllab_no_drinking_prompt = true`)
   - Nutzer ist der Owner der Flasche (`is_owner_scan = true`)
   - Dasselbe Brew wurde in den letzten 24h schon bestätigt (per `localStorage`)
   - Der Scan wurde als `browse` oder `collection_browse` klassifiziert
   - Smart Sampling hat entschieden, _nicht_ zu fragen (→ `shouldAsk: false`)
3. **Maximal 1× pro Session** (auch wenn mehrere Flaschen gescannt werden)
4. Automatisch nach 15 Sekunden ausblenden wenn keine Interaktion
5. **Neue Regel:** Bei Erstnutzern (≤2 Scans total) **nie** fragen — erst Vertrauen aufbauen

---

#### 9.4.5 — Server-Aktion bei Klick (erweitert für Feedback-Loop)

```typescript
async function confirmDrinking(
  scanId: string,
  confirmed: boolean,
  context: {
    engagementSignal: string; // 'after_rating' | 'scroll_ratings' | 'dwell_30s' | 'exit_intent'
    dwellTimeSeconds: number; // Wie lange war der User auf der Seite
    scrollDepth: number; // 0.0 – 1.0
    samplingRate: number; // Mit welcher Wahrscheinlichkeit wurde gefragt
    samplingReason: string; // 'uncertainty' | 'cold_start' | 'coverage' etc.
  },
): Promise<void> {
  const scan = await getScanById(scanId);

  // 1. Scan-Record aktualisieren (Intent bleibt erhalten für Analyse!)
  await supabase
    .from("bottle_scans")
    .update({
      confirmed_drinking: confirmed,
      scan_intent: confirmed ? "confirmed" : scan.scan_intent,
      drinking_probability: confirmed ? 1.0 : 0.1,
    })
    .eq("id", scanId);

  // 2. 🆕 Feedback-Record für Modell-Training loggen (→ Phase 9.5)
  await supabase.from("scan_intent_feedback").insert({
    scan_id: scanId,
    // Was hat das Modell vorhergesagt?
    predicted_intent: scan.scan_intent,
    predicted_probability: scan.drinking_probability,
    // Was hat der Nutzer gesagt?
    actual_drinking: confirmed,
    // Kontext-Features für Feature-Importance-Analyse
    context_features: {
      engagement_signal: context.engagementSignal,
      dwell_time_seconds: context.dwellTimeSeconds,
      scroll_depth: context.scrollDepth,
      referrer_source: scan.referrer_domain,
      device_type: scan.device_type,
      scans_in_session: scan.session_scan_count,
      is_logged_in: !!scan.viewer_user_id,
      hour_of_day: new Date(scan.created_at).getHours(),
      day_of_week: new Date(scan.created_at).getDay(),
    },
    sampling_rate: context.samplingRate,
    sampling_reason: context.samplingReason,
  });
}
```

**Kritischer Unterschied zum alten System:** Der alte `confirmDrinking` hat nur den Scan-Record geändert ("Daten korrigieren"). Der neue loggt **zusätzlich** einen Feedback-Record mit dem vollständigen Kontext — _warum_ wir gefragt haben, _was_ wir vorhergesagt hatten, und _was_ der Nutzer geantwortet hat. Damit schließen wir die Lücke: **Wir korrigieren nicht nur — wir lernen.**

---

**UX-Überlegungen:**

- Der Prompt ist **kein Modal** — er ist ein kleines Slide-In-Banner am unteren Bildschirmrand (wie ein Cookie-Banner)
- "Ja, Prost!" ist die primäre Aktion (größer, farblich hervorgehoben)
- "Nein, nur schauen" ist dezent, keine Wertung
- Gamification-Anreiz möglich: "Trink-Bestätigung = +5 XP" (wenn XP-System existiert)
- **Reciprocity-Prinzip:** Nach Bestätigung ein kurzes "Danke! 🍻" mit Micro-Animation (kein Toast, kein Dialog — nur inline Bestätigung im selben Banner, dann Slide-Out)

---

### 9.5 — Strukturierter Feedback-Loop: Von "Daten korrigieren" zu "Modell verbessern"

**Das zentrale Problem (und der Grund für diese Überarbeitung):**

Das alte System (Rev. 3) hat nur gefragt: "Trinkst du das?" → Ja/Nein → Update des einzelnen Scan-Records. Das ist **Datenkorrektur**, aber kein **Lernen**. Die Frage "Warum lag unsere Vorhersage falsch?" wurde nie gestellt. Drei konkrete Lücken:

1. **Keine Confusion Matrix** — Wir wissen nicht, wie oft wir richtig/falsch lagen, aufgeschlüsselt nach Kategorie
2. **Keine Feature-Analyse** — Wenn ein `single`-Scan fälschlicherweise als "kein Trinker" klassifiziert wird, wissen wir nicht, ob es an der Verweildauer, dem Referrer, oder der Tageszeit liegt
3. **Keine Schwellenwert-Anpassung** — Die Browse-Erkennung (≥3 Scans in 5 Min) ist ein Startwert, der nie angepasst wird

---

#### 9.5.1 — Migration: `scan_intent_feedback`-Tabelle (Prediction Log)

**Datei:** `botllab-app/supabase/migrations/20260301_scan_intent_feedback.sql`

```sql
CREATE TABLE IF NOT EXISTS scan_intent_feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               uuid NOT NULL REFERENCES bottle_scans(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- Was hat das Modell vorhergesagt?
  predicted_intent      text NOT NULL,           -- 'single', 'browse', 'repeat', etc.
  predicted_probability numeric(3,2) NOT NULL,   -- 0.00–1.00

  -- Was hat der Nutzer geantwortet?
  actual_drinking       boolean NOT NULL,         -- true = ja, false = nein

  -- Kontext-Features (für Feature-Importance-Analyse)
  context_features      jsonb NOT NULL DEFAULT '{}',
  -- Enthält: engagement_signal, dwell_time_seconds, scroll_depth,
  --          referrer_source, device_type, scans_in_session,
  --          is_logged_in, hour_of_day, day_of_week,
  --          time_since_scan_seconds, brew_style, brewery_id

  -- Meta: Warum wurde dieser Nutzer gefragt?
  sampling_rate         numeric(3,2),             -- Mit welcher Rate wurde gesampled
  sampling_reason       text,                     -- 'uncertainty', 'cold_start', 'coverage', 'maintenance'

  -- Klassifikation des Ergebnisses (wird im Cron berechnet, nicht beim Insert)
  prediction_correct    boolean,                  -- true wenn predicted_intent mit actual_drinking konsistent
  error_type            text                      -- 'true_positive', 'true_negative', 'false_positive', 'false_negative'
);

-- Index für schnelles Confusion-Matrix-Querying
CREATE INDEX idx_feedback_intent ON scan_intent_feedback (predicted_intent, actual_drinking);
-- Index für zeitliche Drift-Analyse
CREATE INDEX idx_feedback_time ON scan_intent_feedback (created_at DESC);
-- Kein doppeltes Feedback pro Scan
CREATE UNIQUE INDEX idx_feedback_scan ON scan_intent_feedback (scan_id);
```

**Warum eine eigene Tabelle statt Spalten auf `bottle_scans`?**

- Trennung von Concerns: `bottle_scans` = Rohdaten, `scan_intent_feedback` = Modell-Training-Daten
- Die Context-Features (Verweildauer, Scroll-Tiefe) sind Metadaten über die _Frage_, nicht über den _Scan_
- Ermöglicht saubere JOINs für die Confusion Matrix ohne `bottle_scans` zu belasten

---

#### 9.5.2 — Confusion Matrix: Wie gut ist unser Modell wirklich?

**Konzept:** Für jede Intent-Kategorie berechnen wir, wie oft unsere Vorhersage korrekt war. Das ist die Grundlage für jede Verbesserung.

**Definition der Korrektheit:**

| Predicted Intent               | User sagt "Ja, trinke"                                         | User sagt "Nein"                                   | Korrekt?                                     |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `browse` (prob 0.15)           | âŒ False Negative (wir dachten kein Konsum, war aber einer)    | ✅ True Negative                                   |                                              |
| `single` (prob 0.50)           | ✅ True Positive (Unsicherheit, aber in die richtige Richtung) | ✅ True Negative                                   | Threshold: prob ≥ 0.5 → Vorhersage "Trinker" |
| `repeat` (prob 0.85)           | ✅ True Positive                                               | âŒ False Positive (wir dachten Konsum, war keiner) |                                              |
| `social_discovery` (prob 0.30) | âŒ False Negative                                              | ✅ True Negative                                   |                                              |

**Threshold für "Vorhersage = Trinker":** `drinking_probability ≥ 0.50`. Alles darunter = "Vorhersage: Kein Konsum".

**SQL: Confusion Matrix berechnen**

```sql
SELECT
  predicted_intent,
  -- Absolute Zahlen
  COUNT(*) FILTER (WHERE actual_drinking = true AND predicted_probability >= 0.5)  AS true_positives,
  COUNT(*) FILTER (WHERE actual_drinking = false AND predicted_probability < 0.5)  AS true_negatives,
  COUNT(*) FILTER (WHERE actual_drinking = true AND predicted_probability < 0.5)   AS false_negatives,
  COUNT(*) FILTER (WHERE actual_drinking = false AND predicted_probability >= 0.5) AS false_positives,
  -- Raten
  ROUND(
    COUNT(*) FILTER (WHERE
      (actual_drinking = true AND predicted_probability >= 0.5) OR
      (actual_drinking = false AND predicted_probability < 0.5)
    )::numeric / NULLIF(COUNT(*), 0), 3
  ) AS accuracy,
  -- Precision: Wenn wir "Trinker" sagen, wie oft stimmt das?
  ROUND(
    COUNT(*) FILTER (WHERE actual_drinking = true AND predicted_probability >= 0.5)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE predicted_probability >= 0.5), 0), 3
  ) AS precision,
  -- Recall: Von allen echten Trinkern, wie viele erkennen wir?
  ROUND(
    COUNT(*) FILTER (WHERE actual_drinking = true AND predicted_probability >= 0.5)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE actual_drinking = true), 0), 3
  ) AS recall,
  -- Stichprobengröße
  COUNT(*) AS total_feedbacks
FROM scan_intent_feedback
GROUP BY predicted_intent
ORDER BY total_feedbacks DESC;
```

**Ergebnis-Beispiel:**

```
 intent           | TP  | TN  | FN | FP | accuracy | precision | recall | N
 -----------------+-----+-----+----+----+----------+-----------+--------+----
 single           | 145 |  67 | 23 | 12 | 0.858    | 0.923     | 0.863  | 247
 browse           |   0 |  89 | 12 |  0 | 0.881    |   —       | 0.000  | 101
 repeat           |  78 |   0 |  0 |  5 | 0.940    | 0.940     | 1.000  |  83
 social_discovery |   8 |  41 | 15 |  2 | 0.742    | 0.800     | 0.348  |  66
```

**Interpretation:** Die Tabelle zeigt sofort: `social_discovery` hat eine miserable **Recall** von 34.8% — das heißt, 65% der Trinker mit Social-Referrer werden als "kein Konsum" klassifiziert. Das ist ein klarer Hinweis, dass die Default-Probability von 0.30 zu niedrig ist. → Muss auf ~0.45 angehoben werden.

---

#### 9.5.3 — EWMA-Kalibrierung: Sanfte, kontinuierliche Modell-Verbesserung

**Problem mit dem alten Ansatz (Batch-Recalibration):** Die alte 9.5 hat einfach alle Feedbacks zusammengezählt und einen neuen Durchschnitt berechnet. Das hat zwei Probleme:

1. **Keine Gewichtung nach Aktualität** — Ein 6 Monate altes Feedback zählt genauso wie ein frisches
2. **Sprunghaft** — Wenn der Durchschnitt bei 100 Feedbacks 0.68 war und bei 101 Feedbacks plötzlich 0.65, springt die Probability

**Lösung: Exponentially Weighted Moving Average (EWMA)**

```typescript
// Wird im Cron-Job (z.B. wöchentlich) berechnet
function updateCalibratedProbability(
  intent: string,
  newFeedbacks: { actual_drinking: boolean }[],
  currentProbability: number,
): number {
  const α = 0.05; // Learning Rate — niedrig = stabil, hoch = reaktiv

  let prob = currentProbability;
  for (const fb of newFeedbacks) {
    const observed = fb.actual_drinking ? 1.0 : 0.0;
    prob = α * observed + (1 - α) * prob;
    // Jedes Feedback verschiebt die Probability um maximal 5% Richtung Realität
  }

  return Math.round(prob * 100) / 100; // Auf 2 Dezimalstellen runden
}
```

**Beispiel:** `single`-Intent hat Startwahrscheinlichkeit 0.50. Nach 100 Feedbacks (68% "Ja"):

- Batch: sofort 0.68
- EWMA (α=0.05): konvergiert langsam → nach 100 Feedbacks ca. 0.62, nach 200 ca. 0.66

**Vorteil:** Kein Sprung, keine Instabilität, reagiert trotzdem auf Veränderungen im Nutzerverhalten.

---

#### 9.5.4 — Feature-Importance: Warum lag das Modell falsch?

**Konzept:** Wenn wir genügend Feedback-Daten haben (≥500), können wir analysieren, welche Kontext-Features mit Fehlklassifikationen korrelieren. Das ermöglicht **gezielte Regelverbesserungen** statt blinder Wahrscheinlichkeits-Anpassungen.

```sql
-- Welche Features korrelieren mit False Negatives bei 'single'?
-- (Scans klassifiziert als "kein Trinker" die doch Trinker waren)
SELECT
  context_features->>'engagement_signal' AS engagement_signal,
  context_features->>'device_type' AS device_type,
  (context_features->>'hour_of_day')::int AS hour,
  (context_features->>'dwell_time_seconds')::int AS dwell_time,
  COUNT(*) AS occurrences,
  ROUND(AVG(CASE WHEN actual_drinking THEN 1 ELSE 0 END)::numeric, 2) AS actual_drink_rate
FROM scan_intent_feedback
WHERE predicted_intent = 'single'
  AND predicted_probability < 0.5  -- Modell sagte "kein Trinker"
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) >= 10
ORDER BY actual_drink_rate DESC;
```

**Mögliches Ergebnis:**

```
 engagement_signal | device | hour | dwell_time | N  | actual_drink_rate
 ------------------+--------+------+------------+----+------------------
 scroll_ratings    | mobile | 19   |        45  | 23 | 0.87  â† Abends, am Handy, liest Ratings = fast sicher Trinker!
 dwell_30s         | mobile | 20   |        35  | 18 | 0.78
 after_rating      | mobile | 18   |        60  | 12 | 0.92  â† Hat sogar bewertet!
 exit_intent       | desktop| 14   |         8  | 15 | 0.13  â† Mittags, Desktop, kurz → kein Trinker
```

**Daraus ableitbare Verbesserungen:**

- Scans am Abend (18-22h) auf mobilem Gerät mit Verweildauer >30s → Probability sollte auf 0.70+ steigen
- Scans mittags am Desktop mit Verweildauer <10s → Probability sollte auf 0.20 sinken
- **Langfristig:** Diese Features können in eine logistische Regression oder einen einfachen Decision Tree einfließen, der die statischen Wahrscheinlichkeiten ersetzt

---

#### 9.5.5 — Calibration Curve: Sind unsere Wahrscheinlichkeiten kalibriert?

**Konzept:** Eine Wahrscheinlichkeit von 0.50 sollte bedeuten, dass 50% der so klassifizierten Scans tatsächlich zum Konsum führen. Wenn unsere 0.50-Vorhersagen in Wirklichkeit zu 68% korrekt sind, ist unser Modell **unterkonfident** und muss nach oben korrigiert werden.

```sql
-- Calibration Curve: Predicted vs. Actual in 10%-Bins
SELECT
  FLOOR(predicted_probability * 10) / 10 AS prob_bin,  -- 0.0, 0.1, ..., 0.9
  COUNT(*) AS n,
  ROUND(AVG(CASE WHEN actual_drinking THEN 1 ELSE 0 END)::numeric, 3) AS actual_rate,
  ROUND(AVG(predicted_probability)::numeric, 3) AS avg_predicted
FROM scan_intent_feedback
GROUP BY 1
HAVING COUNT(*) >= 10
ORDER BY 1;
```

**Ergebnis-Beispiel:**

```
 prob_bin | n   | actual_rate | avg_predicted
 ---------+-----+-------------+---------------
 0.0      |  45 | 0.044       | 0.050         â† Gut kalibriert
 0.1      | 112 | 0.143       | 0.150         â† Gut kalibriert
 0.3      |  78 | 0.410       | 0.300         â† Unterkonfident! (30% vorhergesagt, 41% real)
 0.5      | 247 | 0.680       | 0.500         â† Stark unterkonfident!
 0.7      |  34 | 0.735       | 0.700         â† Gut kalibriert
 0.8      |  83 | 0.940       | 0.850         â† Leicht unterkonfident
```

**Visualisierung auf dem Admin-Dashboard:** Diagonale Linie (perfekte Kalibrierung) + tatsächliche Punkte. Punkte über der Diagonale = unterkonfident, unter der Diagonale = überkonfident. → Phase 9.8.

**Ablauf:** Wenn empirische Daten verfügbar, werden die `drinking_probability`-Defaults via EWMA aktualisiert. Der alte Startwert wird als Fallback beibehalten bis N ≥ 50 für die jeweilige Kategorie.

---

### 9.6 — Server Action: `getScanIntentBreakdown()`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Signatur:**

```typescript
type IntentBreakdown = {
  intents: {
    intent: string; // 'single', 'browse', 'repeat', ...
    count: number;
    percentage: number;
    avgDrinkingProbability: number;
  }[];
  weightedDrinkerEstimate: number; // Summe(count * probability) → geschätzte echte Trinker
  confirmedDrinkers: number; // count WHERE confirmed_drinking = true
  modelAccuracy: number | null; // % korrekt vorhergesagt vs. bestätigt (null wenn <50 Bestätigungen)
};

async function getScanIntentBreakdown(
  scope: { brewId: string } | { breweryId: string },
  options?: { startDate?: string; endDate?: string },
): Promise<IntentBreakdown>;
```

**Neue Metrik "Gewichtete Drinker-Schätzung":**
Statt nur binär `converted_to_rating` zu zählen, berechnen wir:
`∑ (drinking_probability für alle Scans)` = geschätzte Anzahl echter Trinker.

Beispiel: 100 Scans, davon 20× browse (prob 0.15), 70× single (prob 0.50), 10× repeat (prob 0.85) → 3 + 35 + 8.5 = **46.5 geschätzte Trinker** (statt 100 rohe Scans).

---

### 9.7 — UI: Intent-Breakdown-Chart + gewichtete Metriken

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/ScanIntentChart.tsx` (neu)

**Design:**

```
┌─ Scan-Qualität: Was steckt hinter den Scans? ──────────â”
│                                                    │
│  Einzelscans          ████████████  62%  (311)   │
│  Browse (Kühlschrank) ████░░░░░░░░  18%  (91)    │
│  Wiederkommer         ██░░░░░░░░░░   8%  (42)    │
│  Social-Entdeckung    █░░░░░░░░░░░   7%  (34)    │
│  Bestätigt (✅)        █░░░░░░░░░░░   5%  (24)    │
│                                                    │
│  ─────────────────────────────────────────────────  │
│  Rohe Scans:       502                             │
│  Geschätzte Trinker: ~234 (46.7%)                  │
│  Bestätigte Trinker: 24 (4.8%)                     │
│                                                    │
│  ℹ️ Modell-Genauigkeit: 78% (basierend auf 124      │
│     Nutzer-Bestätigungen)                           │
└────────────────────────────────────────────────────┘
```

**Integration in den Funnel (Phase 2):**
Der `DrinkerFunnelCard` erhält eine zweite Zeile unter den rohen Zahlen:

```
Aufrufe    →  Eingeloggt   →  Verified Drinkers  →  Cap Collectors
   502          182 (36%)         89 (49%)              34 (38%)
                              ~234 geschätzt (inkl. Browse-Korrektur)
```

Tier-Gating: ab `brewery` (SIC ist ein Premium-Insight).

---

### 9.8 — Admin Model Accuracy Dashboard

**Datei:** `botllab-app/app/admin/dashboard/views/ScanAnalyticsView.tsx` (erweitern) oder eigene View `ModelAccuracyView.tsx`

**Platzierung:** Neuer Tab "Model Health" in der Admin-Dashboard-Sidebar, unter "Analytics" eingehängt. Alternativ als Sub-View innerhalb der bestehenden `ScanAnalyticsView`.

**Warum auf dem Admin-Dashboard und nicht auf dem Brauer-Dashboard?**

- Die Modell-Genauigkeit ist eine **systemweite** Metrik, keine brauereispezifische
- Falsche Klassifikationen betreffen alle Brauer gleichzeitig
- Nur Admin-User (wir) können die Schwellenwerte anpassen
- Ein Brauer profitiert indirekt: Er sieht bessere Daten, weil wir das Modell überwachen

---

#### 9.8.1 — Dashboard-Übersicht: 4 KPI-Kacheln

```
┌─ 🎯 Model Health: Scan Intent Classification ──────────────────────────â”
│                                                                          │
│  ┌──────────────â”  ┌──────────────â”  ┌──────────────â”  ┌──────────────â” │
│  │ Accuracy     │  │ Precision    │  │ Recall       │  │ Feedbacks    │ │
│  │    85.8%     │  │    91.2%     │  │    78.4%     │  │     524      │ │
│  │ ▲ +2.1% 30d │  │ ▲ +1.3% 30d │  │ ▼ -0.8% 30d │  │ +67 letzte W │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ⚠️ Alert: 'social_discovery' Recall unter 35% — Kalibrierung prüfen    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Alert-Regeln:**

- 🔴 **Kritisch:** Gesamt-Accuracy < 70% ODER eine Kategorie hat N ≥ 50 und Accuracy < 60%
- 🟡 **Warnung:** Eine Kategorie hat Precision oder Recall < 50%
- 🟢 **Gesund:** Alle Kategorien Accuracy ≥ 75%

---

#### 9.8.2 — Confusion Matrix (Heatmap)

```
┌─ Confusion Matrix (letzte 90 Tage) ────────────────────────────────────â”
│                                                                          │
│                          Nutzer sagt:                                    │
│                     "Ja, trinke"    "Nein"                               │
│  Modell sagt:    ┌──────────────┬──────────────â”                        │
│  "Trinker"       │  TP: 231     │  FP: 19      │  Precision: 92.4%     │
│  (prob ≥0.5)     │  (grün)      │  (rot)       │                        │
│                  ├──────────────┼──────────────┤                        │
│  "Kein Trinker"  │  FN: 50      │  TN: 197     │  NPV: 79.8%          │
│  (prob <0.5)     │  (orange)    │  (grün)      │                        │
│                  └──────────────┴──────────────┘                        │
│                     Recall: 82.2%   Specificity: 91.2%                  │
│                                                                          │
│  Gesamt-Accuracy: 86.1%  (428/497 korrekt)                             │
│  F1-Score: 0.870                                                         │
│                                                                          │
│  📊 Aufschlüsselung nach Intent:                                        │
│  ┌───────────────────┬────┬────┬────┬────┬──────┬──────┬────────┬─────â” │
│  │ Intent            │ TP │ TN │ FN │ FP │ Acc  │ Prec │ Recall │  N  │ │
│  ├───────────────────┼────┼────┼────┼────┼──────┼──────┼────────┼─────┤ │
│  │ single            │145 │ 67 │ 23 │ 12 │ .858 │ .923 │  .863  │ 247 │ │
│  │ browse            │  0 │ 89 │ 12 │  0 │ .881 │  —   │  —     │ 101 │ │
│  │ repeat            │ 78 │  0 │  0 │  5 │ .940 │ .940 │ 1.000  │  83 │ │
│  │ social_discovery  │  8 │ 41 │ 15 │  2 │ .742 │ .800 │  .348  │  66 │ │
│  └───────────────────┴────┴────┴────┴────┴──────┴──────┴────────┴─────┘ │
│                                                                          │
│  🔴 social_discovery: Recall kritisch niedrig (34.8%)                    │
│     → 65% der Trinker mit Social-Referrer werden nicht erkannt           │
│     → Empfehlung: Default-Probability von 0.30 auf 0.45 anheben         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

#### 9.8.3 — Calibration Plot (Predicted vs. Actual)

Diagramm mit X-Achse = vorhergesagte Probability (0.0–1.0 in 10%-Bins) und Y-Achse = tatsächliche Trinkrate. Die Diagonale (45°-Linie) = perfekte Kalibrierung.

```
  Actual Rate
  1.0 │                                              â—  (0.9: 94%)
      │                                         â—       (0.85: 94%)
  0.8 │                                    â—            (0.7: 74%)
      │                              â—                  (0.5: 68% â† unterkonfident!)
  0.6 │                         ·                       (Diagonale)
      │                    â—                            (0.3: 41% â† unterkonfident!)
  0.4 │               ·
      │          ·
  0.2 │     â— (0.15: 14%)
      │â— (0.05: 4%)
  0.0 └──────────────────────────────────────────────
      0.0  0.1  0.2  0.3  0.4  0.5  0.6  0.7  0.8  0.9  1.0
                        Predicted Probability
```

**Interpretation:** Punkte über der Diagonale = Modell ist unterkonfident (sagt 50%, Realität ist 68%). Punkte unter der Diagonale = überkonfident. Das Calibration Plot zeigt auf einen Blick, ob die EWMA-Kalibrierung wirkt.

---

#### 9.8.4 — Temporal Drift Chart (Accuracy über Zeit)

Rolling-Window (7 Tage) Accuracy, Precision, Recall als Zeitreihe. Zeigt:

- Ob das Modell sich über Wochen verbessert (EWMA wirkt)
- Ob ein plötzlicher Drift auftritt (z.B. neues Feature deployed, Nutzerverhalten ändert sich)
- Saisonale Effekte (Sommer: mehr Outdoor-Events → mehr `event`-Scans → andere Verteilung)

**Alert bei Drift:** Wenn die 7-Tage-Accuracy ≥ 10 Prozentpunkte unter dem 90-Tage-Durchschnitt fällt → automatische E-Mail an Admin.

---

#### 9.8.5 — Sample Coverage (Stichproben-Abdeckung)

Tabelle: Wie viele Feedbacks haben wir pro Intent-Kategorie? Minimum für statistische Signifikanz: N ≥ 50 (markiert grün/rot).

**Warum das wichtig ist:** Wenn `event`-Scans nur 12 Feedbacks haben, ist die Accuracy-Zahl bedeutungslos. Das Dashboard muss zeigen, wo wir **blind** sind.

```
┌─ Stichproben-Abdeckung ──────────────────────────────────────────â”
│                                                                    │
│  Intent             │ Feedbacks │ Status      │ Sampling-Rate     │
│  ───────────────────┼───────────┼─────────────┼─────────────────  │
│  single             │   247     │ ✅ Robust   │ 20% (Maintenance) │
│  browse             │   101     │ ✅ Robust   │ Hard-Exclude      │
│  repeat             │    83     │ ✅ Robust   │  5% (Maintenance) │
│  social_discovery   │    66     │ ✅ Ausreichend│ 15% (Standard)  │
│  event              │    12     │ 🔴 Zu wenig │ 10% → 25% (↑)    │
│  collection_browse  │     5     │ 🔴 Zu wenig │ Hard-Exclude      │
│                                                                    │
│  ⚠️ 'event': Nur 12 Feedbacks — Accuracy nicht aussagekräftig.    │
│     Sampling-Rate wird automatisch auf 25% erhöht.                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

#### 9.8.6 — Server Action: `getModelAccuracyMetrics()`

**Datei:** `botllab-app/lib/actions/analytics-admin-actions.ts`

```typescript
type ModelAccuracyMetrics = {
  overall: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    totalFeedbacks: number;
  };
  perIntent: {
    intent: string;
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    accuracy: number;
    precision: number | null;
    recall: number | null;
    feedbackCount: number;
    currentProbability: number; // Aktueller Default
    empiricalProbability: number; // Aus Feedbacks berechnet
    samplingRate: number;
    samplingMode: "standard" | "maintenance" | "re-learning";
  }[];
  calibrationCurve: {
    bin: number; // 0.0, 0.1, ..., 0.9
    predicted: number; // Durchschnittliche vorhergesagte Probability
    actual: number; // Tatsächliche Trinkrate
    n: number; // Stichprobengröße
  }[];
  drift: {
    date: string;
    accuracy: number;
    precision: number;
    recall: number;
  }[]; // Letzte 90 Tage, 7-Tage-Rolling-Window
  alerts: {
    severity: "critical" | "warning" | "info";
    message: string;
    intent?: string; // Betroffene Kategorie
    recommendation: string;
  }[];
};

async function getModelAccuracyMetrics(): Promise<ModelAccuracyMetrics>;
```

---

### 9.9 — Schwellenwert-Auto-Adjustment

**Datei:** Cron-Job (wöchentlich) + Admin-Aktion (manuell)

**Konzept:** Die Klassifikationsregeln (z.B. "≥3 verschiedene Brews in 5 Minuten = Browse") verwenden statische Schwellenwerte. Diese können über die Feedback-Daten validiert und angepasst werden.

**Welche Schwellenwerte sind anpassbar?**

| Regel                    | Parameter                  | Startwert      | Anpassbar?          |
| ------------------------ | -------------------------- | -------------- | ------------------- |
| Browse-Burst-Erkennung   | Min. verschiedene Brews    | 3              | ✅                  |
| Browse-Burst-Zeitfenster | Max. Zeitfenster           | 5 Minuten      | ✅                  |
| Collection-Browse        | Min. verschiedene Brews    | 5              | ✅                  |
| Repeat-Erkennung         | Min. verschiedene Tage     | 2              | âŒ (semantisch fix) |
| Repeat-Erkennung         | Min. verschiedene Flaschen | 2              | ✅                  |
| Default-Probabilities    | Pro Intent                 | s. Tabelle 9.1 | ✅ (via EWMA)       |

**Algorithmus: Schwellenwert-Validierung**

```typescript
// Beispiel: Soll die Browse-Schwelle von ≥3 auf ≥4 Brews erhöht werden?
async function validateBrowseThreshold(): Promise<ThresholdRecommendation> {
  // 1. Finde alle Browse-klassifizierten Scans die Nutzer-Feedback haben
  const browseFeedbacks = await getFeedbacksForIntent("browse");

  // 2. Berechne False-Negative-Rate (User sagte "Ja, trinke" obwohl wir "Browse" sagten)
  const falseNegativeRate =
    browseFeedbacks.filter((f) => f.actual_drinking === true).length /
    browseFeedbacks.length;

  // 3. Wenn FN-Rate > 15% → Schwelle ist zu aggressiv
  if (falseNegativeRate > 0.15) {
    // 4. Simuliere: Was wäre die FN-Rate mit Schwelle ≥4 statt ≥3?
    // Dafür: Hole alle Scans die aktuell als Browse klassifiziert sind mit genau 3 Brews
    const marginalBrowse = browseFeedbacks.filter(
      (f) => f.context_features.scans_in_session === 3,
    );
    const marginalFNRate =
      marginalBrowse.filter((f) => f.actual_drinking === true).length /
      marginalBrowse.length;

    // Wenn die 3-Brew-Grenzfälle eine hohe Trinkrate haben → Schwelle auf 4 erhöhen
    if (marginalFNRate > 0.3) {
      return {
        parameter: "browse_min_brews",
        currentValue: 3,
        recommendedValue: 4,
        confidence: "high",
        reason: `Grenzfälle (genau 3 Brews) haben ${(marginalFNRate * 100).toFixed(0)}% Trinkrate — zu hoch für Browse.`,
      };
    }
  }

  return {
    parameter: "browse_min_brews",
    currentValue: 3,
    recommendedValue: 3,
    confidence: "high",
    reason: "Schwelle passt.",
  };
}
```

**Admin-UI:** Das Admin-Dashboard zeigt Empfehlungen an ("Schwelle ≥3 → ≥4 empfohlen"). Der Admin kann mit einem Klick bestätigen oder ablehnen. **Kein automatisches Deployment** — alle Schwellenwert-Änderungen müssen manuell bestätigt werden (Design Decision 21).

---

### 9.11 — Smoke-Test & Seed-Daten für Scan Intent

**Ziel:** Bevor Phase 9 als "fertig" gilt, muss das gesamte Feedback-Loop-System end-to-end testbar sein — auch ohne echte Nutzer.

**Seed-Daten-Skript:** Erweiterung des bestehenden `seed_analytics.js` um eine Funktion `seedScanIntentFeedback()`, die **≥200 realistische `scan_intent_feedback`-Einträge** generiert. Die Einträge müssen alle Intent-Kategorien abdecken (browse, single, repeat, social, event) und plausible Kontext-Features enthalten (engagement_time, scroll_depth, referrer, etc.). Ziel: Das Admin Model Accuracy Dashboard (Phase 9.8) zeigt sofort eine Confusion Matrix, Accuracy-Trend und Threshold-Empfehlungen.

**Smoke-Test-Checkliste (Phase 9):**

- [ ] Scan-Intent wird bei neuem Scan korrekt klassifiziert (alle 5 Kategorien)
- [ ] Drinker-Bestätigungs-Popup erscheint nach Smart-Sampling-Regeln
- [ ] `scan_intent_feedback`-Eintrag wird beim Popup-Klick korrekt geloggt
- [ ] Admin Model Accuracy Dashboard zeigt Confusion Matrix (mit Seed-Daten)
- [ ] Cold-Start-Bootstrap-Modus ("Bootstrap" Label) wird bei <200 Labels angezeigt
- [ ] Schwellenwert-Empfehlung erscheint im Admin-Dashboard

---

## 📍 PHASE 10: EVENT-SCAN-CLUSTER-ERKENNUNG

> **Voraussetzung:** Phase 1 (funktionierende Scans) + Phase 9 (Intent-Klassifikation als Grundlage für Event-Intent). Geo-Daten müssen in `bottle_scans` vorhanden sein.

**Das Mobile-IP-Problem:** Bisher basierten unsere Geolocations auf der Vercel-IP (`x-vercel-ip-city`). Wenn ein Nutzer im 4G/5G-Netz surft, führt diese IP oft zum Exit-Node des Providers (z.B. Frankfurt, München), völlig unabhängig davon, wo der Nutzer wirklich ist. Dadurch entstehen massive, falsche "Fake-Events" in Großstädten, während echte Events auf dem Land unsichtbar bleiben.

**Die Lösung (Privacy by Design):** Wir nutzen `navigator.geolocation` (Opt-in), ABER wir speichern **niemals** exakte Koordinaten. Wir nutzen das Uber H3-Grid-System: Das Frontend sendet die Koordinaten, das Backend "snappt" diese sofort auf das Zentrum eines H3-Hexagons (Auflösung 8, ca. 450m Kantenlänge). Der ursprüngliche Punkt wird verworfen. So entsteht perfekte räumliche K-Anonymität — wir wissen, dass der Nutzer in diesem ~500m-Radius war, aber nicht an welcher Hausnummer. Alle Scans mit reiner IP-Location werden aus dem Event-Clustering ausgeschlossen.

**Kernkonzept:** Wenn innerhalb eines kurzen Zeitfensters mehrere verschiedene Menschen dasselbe Bier im selben Hexagon/Umfeld scannen, findet dort wahrscheinlich ein Event statt — Bierfest, Tasting, Hausparty, Stammtisch. Diese Events automatisch zu erkennen gibt dem Brauer ein einzigartiges Bild: "Dein IPA wurde am 15. März auf einem Event in Berlin von 23 Personen verkostet."

---

### 10.0 — Privacy-First Geolocation (H3 Snapping)

**Kosten-Nutzen-Abwägung & UX-Strategie ("Soft-Prompting")**:

- **Monetäre Kosten:** `€0,00` - Die `h3-js` Bibliothek läuft komplett lokal im Server/Browser. Es fallen keine API-Gebühren für Google Maps oder Mapbox an.
- **UX Kosten (Risiko):** Ein plötzlicher Browser-Dialog ("BotlLab möchte deinen Standort verwenden") führt oft zu hohen Absprungraten (Bounces).
- **Lösung (Double Opt-In):** Wir fragen **nicht** beim ersten App-Start nach dem GPS-Standort. Der Standort ist eine reine _Progressive Enhancement_ (Erweiterung) für Power-User.

**Datei:** `botllab-app/app/api/scan/route.ts` (oder Server Action)

1. **Frontend (Der Soft-Prompt):** Nach einem erfolgreichen Scan (oder auf dem User-Profil) wird ein unaufdringliches UI-Element angezeigt: _"Möchtest du sehen, ob dein Bier gerade auf einem lokalen Event getrunken wird? Aktiviere den Event-Radar (Standort)."_
2. **Erst wenn der User hier klickt**, triggern wir den nativen Browser-Dialog `navigator.geolocation.getCurrentPosition()`.
3. **Backend:**

```typescript
import { latLngToCell, cellToLatLng } from "h3-js";

// Ankommende, exakte (aber private!) GPS-Koordinate vom Browser
const exactLat = request.body.lat;
const exactLng = request.body.lng;

// 1. In Hexagon-Index umwandeln (Resolution 8 = ~461m Kantenlänge)
const h3Index = latLngToCell(exactLat, exactLng, 8);

// 2. Zentrum des Hexagons zurückrechnen
const [snappedLat, snappedLng] = cellToLatLng(h3Index);

// 3. NUR die snapped Koordinaten in der DB speichern
await insertScan({
  latitude: snappedLat,
  longitude: snappedLng,
  geo_source: exactLat ? "gps_snapped_h3" : "ip_vercel", // Flag für Event-Clustering, verbietet IP-Nutzung!
});
```

---

### 10.1 — Migration: `scan_events` Tabelle

**Datei:** `botllab-app/supabase/migrations/20260228250000_scan_event_clusters.sql`

```sql
-- Neues Flag auf bottle_scans
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS geo_source text DEFAULT 'ip_vercel';

CREATE TABLE IF NOT EXISTS scan_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Zeitfenster
  event_start   timestamptz NOT NULL,
  event_end     timestamptz NOT NULL,

  -- Ort (Schwerpunkt des Clusters)
  center_lat    numeric(10,7) NOT NULL,
  center_lng    numeric(10,7) NOT NULL,
  radius_m      integer,            -- geschätzter Radius in Metern
  city          text,               -- Rückwärts-Geocoding oder häufigste City aus Scans
  country_code  text,

  -- Cluster-Metriken
  total_scans      integer NOT NULL,
  unique_sessions  integer NOT NULL,  -- verschiedene session_hash
  unique_brews     integer NOT NULL,  -- verschiedene brew_id im Cluster
  breweries        uuid[],           -- Array der beteiligten brewery_ids
  brew_ids         uuid[],           -- Array der beteiligten brew_ids

  -- Klassifikation
  event_type    text DEFAULT 'unknown',
  -- 'tasting', 'festival', 'party', 'meetup', 'unknown'
  confidence    numeric(3,2) DEFAULT 0.50,
  -- Wie sicher ist die Erkennung? (abhängig von Cluster-Größe + Radius)

  -- Brauer-Annotation (optional, Phase 10.6)
  brewer_label  text,               -- Brauer kann benennen: "Brauerei-Tag der offenen Tür"
  brewer_notes  text                -- Freitext-Notiz
);

-- JOIN-Tabelle: Welche Scans gehören zu welchem Event
CREATE TABLE IF NOT EXISTS scan_event_members (
  event_id  uuid NOT NULL REFERENCES scan_events(id) ON DELETE CASCADE,
  scan_id   uuid NOT NULL REFERENCES bottle_scans(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, scan_id)
);

-- RLS
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brewery_owners_read_their_events" ON scan_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brewery_members bm
      WHERE bm.brewery_id = ANY(scan_events.breweries)
        AND bm.user_id = auth.uid()
        AND bm.role = 'owner'
    )
  );
```

---

### 10.2 — Cluster-Algorithmus (PostGIS ST_ClusterDBSCAN)

**Vorbereitung (Zukunftssicherheit):** Ein serverseitiger NodeJS-Algorithmus hat eine Laufzeit von $O(N^2)$ für Distanzvergleiche. Bei 1.000 Scans kein Problem, bei 100.000 Scans (Mega-Event) crasht der Server. Da Supabase out-of-the-box `PostGIS` bietet, nutzen wir sofort die performanteste Methode direkt auf der Datenbank.

**Datei:** `botllab-app/supabase/migrations/20260228260000_postgis_clustering.sql`

**PostGIS Aktivierung & SQL-DBSCAN-Funktion:**

```sql
-- 1. PostGIS Extension aktivieren
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Scans mit geometry Spalte ausstatten
ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_geom ON bottle_scans USING GIST (geom);

-- 3. Trigger zum automatischen Setzen der Geometrie bei Insert
CREATE OR REPLACE FUNCTION update_scan_geom() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scan_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON bottle_scans
FOR EACH ROW EXECUTE FUNCTION update_scan_geom();

-- 4. DB-Funktion für Clustering (via API/Cron aufrufbar)
CREATE OR REPLACE FUNCTION execute_event_clustering() RETURNS void AS $$
BEGIN
  -- WICHTIG: Nur gps_snapped_h3 verwenden! IP-basierte (Vercel) Scans verzerren das Clustering
  -- Nutzt PostGIS ST_ClusterDBSCAN (z.B. max 1km Distanz, min 4 Punkte)
  -- Zeitliche Fenster können über Partitions im Window-Call integriert werden (z.B. DATE(created_at))

  -- 1. Hole alle Scans der letzten 24h WHERE geo_source = 'gps_snapped_h3'
  -- 2. Wende ST_ClusterDBSCAN an (eps := distanz_in_grad, minpoints := 4)
  -- 3. Filtere Cluster heraus, die < 3 verschiedene session_hash haben (Anti-Bot-Schutz)
  -- 4. Berechne ST_Centroid für den Schwerpunkt (center_lat/center_lng)
  -- 5. Speichere in scan_events und scan_event_members
  -- (Details in Implementierung)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
```

---

### 10.3 — Cron-Job: Stündliche Cluster-Erkennung

**Datei:** Migration + `botllab-app/app/api/analytics/detect-events/route.ts`

```sql
SELECT cron.schedule(
  'detect-scan-events',
  '30 * * * *',   -- jede Stunde um :30 (versetzt zu anderen Crons)
  $$
  SELECT net.http_post(
    url := current_setting('app.site_url') || '/api/analytics/detect-events',
    body := '{}',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
```

**API Route:** Ruft `detectEventClusters()` auf, insertet neue Events in `scan_events` + `scan_event_members`, updated `scan_intent = 'event'` für alle zugeordneten Scans.

---

### 10.4 — Server Action: `getDetectedEvents()`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

```typescript
type DetectedEvent = {
  id: string;
  eventStart: string;
  eventEnd: string;
  city: string | null;
  countryCode: string | null;
  totalScans: number;
  uniqueSessions: number;
  uniqueBrews: number;
  eventType: "tasting" | "festival" | "party" | "meetup" | "unknown";
  confidence: number;
  brewerLabel: string | null; // vom Brauer benannt
  centerLat: number;
  centerLng: number;
};

async function getDetectedEvents(
  breweryId: string,
  options?: { startDate?: string; endDate?: string; limit?: number },
): Promise<DetectedEvent[]>;
```

---

### 10.5 — UI: Event-Annotationen im Scans-über-Zeit-Chart

**Datei:** `botllab-app/app/team/[breweryId]/analytics/page.tsx`

**Änderung am bestehenden `ScansOverTimeChart`:** Erkannte Events werden als vertikale gestrichelte Linien mit Icon + Tooltip über dem Chart eingeblendet:

```
 Scans
   │
 50 │         ┌─â”       🍻         🎉
 40 │    ┌────┘ │  ┌────┤      ┌────┤
 30 │┌───┘    └──┘   └───┤ ┌────┘   │
 20 │┘                 └─┘         │
    └────────────────────────────────
    5.3   6.3   7.3   8.3   9.3  10.3
                🍻 Tasting München (23 Personen)
                🎉 Festival Berlin (47 Personen)
```

**Tooltip bei Hover über Event-Marker:**

- Zeitraum (z.B. "15.03.2026, 14:30–17:15")
- Ort (z.B. "München, DE")
- Teilnehmer (unique sessions)
- Brews gescannt: Liste der Brews mit jeweiligem Count
- Event-Typ + Confidence ("Tasting — 86% sicher")
- Button: "âœ️ Event benennen" → öffnet Inline-Editor für `brewer_label`

---

### 10.6 — UI: Event-Detail-Panel

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/EventDetailPanel.tsx` (neu)

**Erreichbar via:** Klick auf einen Event-Marker im Chart oder über eine Event-Liste im Dashboard.

**Inhalte:**

- **Karte** (Leaflet oder Mapbox): Zeigt den Event-Standort als Kreis mit dem berechneten Radius
- **Zeitstrahl:** Scans über die Event-Dauer als Mini-Timeline (z.B. "Erster Scan 14:32, Peak 15:45, Letzter 17:12")
- **Brew-Verteilung:** Welches Brew wurde wie oft gescannt (Donut-Chart falls mehrere Brews)
- **Wetter** (wenn Phase 8 aktiv): Wetterbedingungen während des Events
- **Vergleich:** "Dieses Event brachte 23 Scans — das sind 4.6% deiner monatlichen Scans an einem einzigen Nachmittag."
- **Brauer-Notiz:** Editierbares Textfeld + Label-Feld (z.B. "Tag der offenen Tür")

Tier-Gating: `enterprise` (rechenintensiv + hoher Mehrwert).

---

### 10.7 — Brauer-Benachrichtigung bei neuem Event

**Datei:** `botllab-app/lib/email.ts` + Cron-Job

**Konzept:** Wenn der Cron-Job ein neues Event erkennt, wird der Brauerei-Owner per E-Mail benachrichtigt:

> **Betreff:** 🍻 Event erkannt: 23 Personen haben dein Bier in München probiert!
>
> Hallo [Name],
>
> Am 15. März zwischen 14:30 und 17:15 Uhr wurden 23 Scans deines [Brew-Name] in München registriert. Das sieht nach einem Tasting oder Event aus!
>
> [Event im Dashboard ansehen →]

**Template:** Neuer E-Mail-Template-Key `event-detected` in `lib/email.ts`.

---

## 🎯 PHASE 11: DRINKER EXPERIENCE ENGINE ("Stealth Data Extraction")

**Ziel:** Massive Erhöhung der qualitativen Datenmenge durch intrinsische Motivation des "Trinkers" (Konsumenten).

> 🚧 **Harte Abhängigkeit: `KONZEPT_ZWEI_WELTEN` muss vor Phase 11 implementiert und deployed sein.** Ohne die Trennung von Brewer World (B2B, `team_id`-basiert) und Drinker World (B2C, `user_id`-basiert) können die Features dieser Phase nicht gebaut werden. Der gesamte B2C-Flow (`/b/[id]`, `/my-cellar`, Taste DNA) setzt voraus, dass User ohne `team_id` existieren und interagieren können. Phase 11 darf erst beginnen, wenn das `KONZEPT_ZWEI_WELTEN` in Produktion ist und `NEXT_PUBLIC_ZWEI_WELTEN_ENABLED=true` gesetzt ist.

> **Wichtiger Kontext (Architektur-Zukunft):** Phase 11 ist streng nach dem **`KONZEPT_ZWEI_WELTEN`** ausgerichtet. Es gibt keinen Zwang mehr, für den Trinker eine "Brauerei/Team" anzulegen. Alle Features dieser Phase leben im B2C-Bereich (`/b/[id]` und dem zukünftigen `/my-cellar` Profil) und sind an die nackte `user_id` gebunden.

---

### 11.0 — Brewer Flavor Intent Setup (Voraussetzung für Beat the Brewer)

**Problem:** "Beat the Brewer" funktioniert nur, wenn der Brauer ein Flavor-Profil (Zielprofil) für seinen Brew hinterlegt hat. Ohne dieses Profil gibt es nichts, wogegen der Trinker antreten kann. Wir können nicht davon ausgehen, dass jeder Brauer manuell 5 Slider einstellt — das ist Friction.

**Lösung: Dreistufiger Fallback (automatisch → assistiert → manuell)**

| Stufe | Methode               | Beschreibung                                                                                                                                                                                                              | Wann?                                                      |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **A** | **Daten-Vorschlag**   | Aggregierte Ratings ähnlicher Rezepte (gleicher Stil, ähnliche Zutaten) werden als vorausgefüllter Vorschlag angezeigt. Der Brauer sieht: _"Basierend auf 47 Bewertungen ähnlicher IPAs schlagen wir dieses Profil vor."_ | Wenn ≥20 Ratings für den Bierstil in der DB existieren     |
| **B** | **BotlGuide-Analyse** | Der bestehende BotlGuide LLM analysiert das Rezept (Malz, Hopfen, Hefe, Verfahren) und generiert ein Flavor-Profil als editierbaren Vorschlag. _"BotlGuide hat dein Rezept analysiert — passt das so?"_                   | Wenn Stufe A nicht verfügbar UND ein Rezept hinterlegt ist |
| **C** | **Manuelle Eingabe**  | Klassische 5-Slider-Eingabe (Süße, Bitterkeit, Körper, Röstmalz, Fruchtigkeit) ohne Vorschläge.                                                                                                                           | Fallback, immer verfügbar                                  |

**UX-Flow im B2B-Dashboard (Brew-Setup):**

1. Brauer erstellt/editiert einen Brew
2. Neuer Abschnitt: _"Geschmacksprofil für Beat the Brewer"_
3. System prüft Fallback-Kette: A → B → C
4. Vorschlag wird als editierbare Slider angezeigt (nie blind übernommen)
5. Brauer bestätigt oder passt an → `flavor_profile` wird gespeichert

**Ohne Flavor-Profil:** Beat the Brewer ist für diesen Brew ausgegraut. Der Trinker sieht: _"Der Brauer hat noch kein Geschmacksprofil hinterlegt. Du kannst trotzdem ein klassisches Rating abgeben."_ Klassisches 5-Sterne-Rating bleibt immer verfügbar.

**Datenmodell:** Erweiterung der `brews`-Tabelle um `flavor_profile JSONB` (Struktur: `{ sweetness: 0.6, bitterness: 0.8, body: 0.5, roast: 0.1, fruitiness: 0.7, source: 'data_suggestion' | 'botlguide' | 'manual' }`).

---

### 11.1 — "Beat the Brewer" (Gamifizierte Sensorik-Daten)

Anstatt den Trinker zu bitten, einen trockenen 5-Sterne-Fragebogen auszufüllen, fordern wir ihn heraus.

- **Der UX-Flow:** Auf der Bier-Scan-Seite (`/b/[id]`) sieht der Trinker einen Button: _"Wie gut ist dein Gaumen? Triff das Profil des Braumeisters!"_
- **Das Minigame:** Der Trinker stellt blind 5 Slider ein (Süße, Bitterkeit, Körper, Röstmalz, Fruchtigkeit).
- **Der "Aha!"-Moment:** Nach dem Absenden legt sich in einer coolen Animation das vom Trinker erstellte Spinnennetz-Diagramm über das verdeckte Original-Profil des Brauers (eingestellt im B2B-Dashboard beim Rezept-Setup).
- **Der Reward (Drinker):** Der Trinker erhält einen Match-Score (z.B. 85% Übereinstimmung) und sammelt „Tasting IQ"-Punkte. Bei >90% Match gibt es sofort ein Badge (z.B. „Master Sommelier" via `lib/achievements.ts`). **Architektur:** Tasting IQ wird in `profiles.tasting_iq` (INTEGER, kumulativ) gespeichert. Jedes Spiel schreibt einen Eintrag in `tasting_score_events` (Punkte = `ROUND(match_score * 10)`). `user_achievements` bleibt unberührt — es speichert One-Shot-Badges, nicht den kontinuierlichen Score. Diese Trennung ermöglicht saubere Leaderboards via `ORDER BY tasting_iq DESC` ohne Aggregation über Achievement-Tabellen.
- **Der USP (Brewer):** Der Brauer erhält hochpräzise, unvoreingenommene **"Perceived vs. Intended"** Daten (Wahrnehmung vs. Absicht). Er sieht im Analytics-Dashboard exakt, ob sein Bier vom Markt so verstanden wird, wie er es gebraut hat (oder ob z.B. die Bitterkeit aufgrund von Alterung im Markt abnimmt).

### 11.2 — "Taste DNA" & Smart Bias Filtering (Differential-Rating)

Jedes gespielte "Beat the Brewer" und jede abgegebene Bewertung füttert im Hintergrund das algorithmische Geschmacksprofil des Trinkers.

- **Die Taste DNA (B2C-UI):** Auf der neuen Sub-Route `/my-cellar/taste-dna` (als Platzhalter bereits in KONZEPT_ZWEI_WELTEN Phase 2.1 vorgesehen; ConsumerHeader bekommt dabei einen neuen Tab) sieht der Trinker eine visuelle Heatmap (ähnlich Spotify Wrapped). „Du bist zu 80% ein HopHead, hasst aber Röst-Aromen". Dies animiert zum Weiterscannen, um das Profil zu verfeinern („Complete your DNA"). **Datenbasis:** `tasting_score_events` JOIN `brews` → aggregierte Slider-Werte aus `metadata.slider_values` über alle Beat-the-Brewer-Spiele des Users, grupssiert nach Bierstil (`brews.style`).
- **Das Smart Bias Filtering (B2B-Analytics):** Wir nutzen diese DNA aktiv für die Berechnung von Ratings. Ein 1-Sterne Rating eines Stout-Hassers für ein Stout wird **nicht** wie bisher geplant gedämpft manipuliert (Gefahr der Vertuschung echter Produktionsfehler!), sondern separat ausgewiesen.
  - Wir berechnen für den Brauer zwei Werte:
    1. **Raw Average:** Der echte Markt-Durchschnitt (z.B. 3.2 Sterne - Bier infiziert/schlecht).
    2. **Target Audience Average:** Der Durchschnitt der Leute, deren Taste-DNA exakt auf dieses Bier passt (Core-Fans).
  - _Resultat:_ Der Brauer sieht die Differenzial-Metrik und weiß immer exakt Bescheid. Wahrhaftigkeit wird geschützt.

### 11.3 — "Vibe Check" (Subtile Kontext-Extraktion)

Brauer wollen wissen: "Wann und wo wird mein Bier getrunken?" (Marktdaten). Konsumenten wollen keine Umfragen ausfüllen.

- **Der UX-Flow:** Auf der Scan-Seite (`/b/[id]`) platzieren wir einen spielerischen Bereich: _"Pass den Vibe an."_
- **Die Mechanik:** Statt Checkboxen wählen Nutzer Emojis oder Mood-Bilder (Pizza Night, Gipfelbier, Gaming, BBQ). Mit einem Klick auf ihren aktuellen Vibe schalten sie frei, _was andere_ bei diesem Vibe trinken (Social Proof).
- **Der Reward (Drinker):** Gefühl von Community ("73% trinken dieses IPA ebenfalls beim BBQ").
- **Der USP (Brewer):** Perfekte, authentische Heatmaps von Konsum-Situationen im Analytics-Dashboard für gezieltes Marketing.

---

## 🚀 PHASE 12: VIRAL & COMMERCE LOOPS (Das Wachstumsprogramm)

**Ziel:** Virale, organische B2C-Aquise und den "Point of Sale" (Kauf) als stärkste B2B-Hardware aufbauen. Die Trinker-Seite zur Suchtmaschine machen.

### 12.1 — Shareable "Taste DNA" (Der Growth-Hack)

- **Das Problem:** Die mühsam gewonnene Taste DNA verschwindet im Nutzer-Profil.
- **Der MVP-Hack:** Ein Button-Export, der ein formatiertes Bild (wie Spotify Wrapped) generiert.
  - _Copy:_ "Mein Tasting IQ ist in den besten 5%. Ich bin zu 85% ein Hazy-Stout-Head. Check deine BotlLab DNA."
  - _Distribution:_ Optimiert für Instagram Stories / TikTok native. So holen wir ohne Ad-Spend User ins `ZWEI_WELTEN` System.

### 12.2 — "The Point of Sale" & Stash Check-In

- **Das Problem:** Wir kennen den Trink-Moment (Phase 11.3), aber nicht den Kauf-Moment (Wo hat er es gekauft?). Vertriebler der Brauerei brauchen diese POS-Information brennend.
- **Die Mechanik:** User können gescannte Biere in ihren digitalen Kühlschrank ("Stash") legen.
  - Beim Hinzufügen fragen wir: _"Wo hast du diesen Schatz gehoben?"_ (Dropdown: Regionaler Supermarkt, Spezialitäten-Store, Online-Shop, Direkt am Taproom).
  - _Gamification-Trigger:_ Es gibt Bonus-Punkte/Badges ("Local Supporter", "Supermarket Hunter") für die Angabe der Quelle.

### 12.3 — "Brewer Bounties" (Phygital Rewards)

- **Das Konzept:** Es reicht nicht, nur digitale Badges zu vergeben (Nutzen sich ab). Wir verbinden die App mit der echten Welt.
- **Der Flow für Brauereien:** Brauereien können im B2B-Dashboard eine Bounty ausrufen, z.B. 10 Pints Freibier.
- **Der Flow für Konsumenten:**
  - _Aktion:_ "Triff beim neuen Imperial Stout in Beat the Brewer einen Match von >95%."
  - _Reward:_ Der Trinker schaltet in seiner App automatisch einen QR-Code für ein Free-Beer / Rabattcode beim nächsten Onlineshop-Einkauf der Brauerei frei.
  - _Vorteil:_ Schließt die Schleife zwischen digitaler Analytics und physischem Brauerei-Umsatz.

### 12.4 — Social Challenge: "Beat a Friend"

- **Das Konzept:** "Beat the Brewer" macht Spaß, aber "Beat a Friend" baut Reichweite (K-Faktor).
- **Die Execution:** Nach dem Absenden eines Ratings oder einer Flavor-Auswertung erscheint ein Button: _"Fordere einen Freund heraus! Wer hat den besseren Gaumen?"_
- **Der Flow:** Versendet einen WhatsApp/Telegram-Link. Der Freund klickt -> öffnet BotlLab (ggf. auch aus der Erinnerung an das Bier) -> rated -> die App zeigt das Head-to-Head Spinnennetz der beiden User. -> Onboarding-Erfolg.

---

## 📸 PHASE 13: BOTTLE-REISE-TRACKING + LOYALTY

> **Voraussetzung:** Phase 1 (funktionierende Scans). Phase 9 (Loyalty benötigt Repeat-Erkennung).

---

### 13.1 — Server Action: `getBottleJourney(bottleId)`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

**Signatur:**

```typescript
type JourneyStep = {
  scanId: string;
  scannedAt: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  countryCode: string | null;
  isOwnerScan: boolean;
  scanIntent: string | null;
  deviceType: string | null;
  distanceFromPreviousKm: number | null; // Distanz zum vorherigen Scan in km
  daysFromPrevious: number | null; // Tage seit dem vorherigen Scan
};

type BottleJourney = {
  bottleId: string;
  brewId: string | null;
  brewName: string | null;
  filledAt: string | null;
  totalScans: number;
  totalDistanceKm: number; // Gesamtdistanz die die Flasche "gereist" ist
  totalDaysInCirculation: number; // Tage zwischen erstem und letztem Scan
  steps: JourneyStep[];
};

async function getBottleJourney(
  bottleId: string,
): Promise<BottleJourney | null>;
```

**Logik:**

1. Verifiziere Ownership: `bottles.user_id = auth.uid()` ODER `bottles.brewery_id` + brewery_members role = 'owner'
2. `SELECT * FROM bottle_scans WHERE bottle_id = ? ORDER BY created_at ASC`
3. Für jeden Schritt: Haversine-Distanz zum vorherigen Scan berechnen
4. Gesamtdistanz summieren, Laufzeit berechnen

---

### 13.2 — UI: Bottle-Reise-Karte

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/BottleJourneyMap.tsx` (neu)

**Erreichbar via:** Auf der Analytics-Seite: Neuer Tab "Flaschen" mit Suchleiste/Dropdown für Flaschen-Auswahl. Alternativ: Link von der Flaschen-Detail-Seite.

**Design:**

```
┌─ Reise von Flasche #045 — "Rauensteiner IPA" ────────â”
│                                                       │
│  🗺️ [Karte mit Pfad-Animation: Linie von Punkt zu Punkt]  │
│                                                       │
│  â¶ 21.01.2026 — Berlin (Brauer, Abfüllung)              │
│  │  ↓ 342 km                                           │
│  â· 28.01.2026 — München (Geschenk angekommen?)          │
│  │  ↓ 12 km                                            │
│  â¸ 02.02.2026 — München (Party — Event-Cluster)         │
│  │  ↓ 0.3 km                                           │
│  â¹ 02.02.2026 — München (2. Scan auf der Party)         │
│                                                       │
│  Gesamtdistanz: 354 km │ 12 Tage in Umlauf             │
│  4 Scans │ 2 Städte │ 1 Event erkannt                   │
│                                                       │
│  [📱 Als Bild teilen]  [📄 Als PDF exportieren]         │
└───────────────────────────────────────────────────────┘
```

**Features:**

- Animated Polyline auf der Karte (Leaflet/Mapbox) — Linie zeichnet sich von Scan zu Scan
- Jeder Scan-Punkt ist ein nummerierter Marker mit Popup: Datum, Stadt, Device, Intent
- Owner-Scans in anderem Farbton (grau) markiert
- Event-Cluster-Scans mit Event-Badge markiert
- "Als Bild teilen" → generiert ein Social-Media-freundliches Bild (Canvas API oder html2canvas)
- Tier-Gating: `enterprise`

---

### 13.3 — Server Action: `getLoyaltyBreakdown(brewId | breweryId)`

**Datei:** `botllab-app/lib/actions/analytics-actions.ts`

```typescript
type LoyaltySegment = "one_time" | "returning" | "fan";

type LoyaltyBreakdown = {
  segments: {
    segment: LoyaltySegment;
    label: string; // 'Einmaltrinker', 'Wiederkommer', 'Fan'
    userCount: number; // Anzahl eingeloggter Nutzer
    avgRating: number | null; // Durchschnittsbewertung dieses Segments
    scanCount: number; // Gesamtscans dieses Segments
  }[];
  anonymousScans: number; // Scans ohne viewer_user_id (keine Loyalty-Zuordnung möglich)
  totalTrackedUsers: number;
};
```

**Klassifikations-Logik:**

```sql
SELECT
  viewer_user_id,
  COUNT(DISTINCT DATE(created_at)) AS distinct_days,
  CASE
    WHEN COUNT(DISTINCT DATE(created_at)) >= 5 THEN 'fan'
    WHEN COUNT(DISTINCT DATE(created_at)) >= 2 THEN 'returning'
    ELSE 'one_time'
  END AS loyalty_segment
FROM bottle_scans
WHERE brew_id = $1
  AND viewer_user_id IS NOT NULL
  AND is_owner_scan != true
GROUP BY viewer_user_id;
```

Optional: Cross-Join mit `ratings` um die durchschnittliche Bewertung pro Segment zu zeigen.

---

### 13.4 — UI: Loyalty-Segment-Chart

**Datei:** `botllab-app/app/team/[breweryId]/analytics/components/LoyaltySegmentChart.tsx` (neu)

**Design (auf der Per-Brew-Seite, nach Rater-Demografie):**

```
┌─ Trinker-Treue für "Rauensteiner IPA" ─────────────────â”
│                                                      │
│  [Donut-Chart: 3 Segmente]                           │
│                                                      │
│  🟢 Fans (5+ Tage)        3 Nutzer   ★ 4.7   42 Scans  │
│  🟡 Wiederkommer (2-4)   12 Nutzer   ★ 4.2   31 Scans  │
│  ⚪ Einmaltrinker (1)    78 Nutzer   ★ 3.8   78 Scans  │
│  │ (davon 340 anonyme Scans ohne Nutzer-Zuordnung)    │
│                                                      │
│  💡 Insight: Fans bewerten dein Bier 0.9 Punkte        │
│     höher als Einmaltrinker. Setze auf Kundenbindung! │
└─────────────────────────────────────────────────────────┘
```

**Automatischer Insight-Text:**

- "Fans bewerten dein Bier X Punkte höher als Einmaltrinker" → Argument für Kundenbindung
- "Du hast Y% Wiederkommer — das ist [besser/schlechter] als der Durchschnitt deiner anderen Brews"

Tier-Gating: ab `brewery`.

---

### 13.5 — Saisonalitäts-Index pro Brew

**Datei:** `botllab-app/lib/actions/analytics-actions.ts` + UI-Komponente

**Server Action: `getSeasonalityIndex(brewId)`**

```typescript
type MonthlyDistribution = {
  month: number; // 1–12
  scans: number;
  percentage: number;
};

type SeasonalityResult = {
  distribution: MonthlyDistribution[];
  peakMonth: number; // Monat mit den meisten Scans
  peakMonthName: string; // z.B. "Juli"
  seasonalityScore: number; // 0–1: 0 = gleichmäßig übers Jahr, 1 = extrem saisonal
  insight: string; // Automatischer Hinweis
  hasEnoughData: boolean; // mind. 6 Monate mit Scans erforderlich
};
```

**Saisonalitäts-Score-Berechnung:**

```typescript
// Gini-ähnlicher Koeffizient: Wie ungleich verteilt sind die Scans übers Jahr?
function calculateSeasonalityScore(
  distribution: MonthlyDistribution[],
): number {
  const counts = distribution.map((d) => d.scans);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const evenShare = total / 12;
  const deviation = counts.reduce((acc, c) => acc + Math.abs(c - evenShare), 0);
  return Math.min(deviation / (2 * total), 1); // Normalisiert 0–1
}
```

**UI:** 12-Monats-Sparkline-Balkendiagramm neben jedem Brew in der Top-Brews-Tabelle des Haupt-Dashboards. Bei Hover: "Dieses Bier hat einen starken Sommer-Peak (Saisonalitäts-Score: 0.72). Erwäge saisonales Marketing."

Tier-Gating: ab `brewer`.

---

## 🧭 PHASE 14: MARKTINTELLIGENZ & DISTRIBUTION

> **Voraussetzung:** Phase 4 (Style-Aggregation), Phase 10 (Geo-Infrastruktur), Phase 13 (Loyalty/Cross-User-Daten). Diese Phase nutzt aggregierte BotlLab-weite Daten — nicht nur die der eigenen Brauerei.

**Kernfrage:** _"Ich weiß jetzt, wer mein Bier trinkt. Aber was brauen die Wettbewerber? Wo kann ich mein Bier verkaufen? Welcher Stil ist gerade im Trend?"_

Diese Phase verwandelt BotlLab von einem reinen Brauerei-Tool in eine **Marktforschungs-Plattform**. Kein Hobbybrauer-Tool weltweit bietet das.

**Privacy Shield für Phase 14 (Erweiterte Regeln):**

- Brauerei-übergreifende Daten sind **immer anonymisiert** — ein Brauer sieht nie, welche andere Brauerei die Daten liefert
- Trend-Daten werden erst ab ≥10 verschiedenen Brauereien in einem Stil angezeigt (K-Anonymität auf Brauer-Ebene)
- Keine exakten Nutzerzahlen von Konkurrenz-Brauereien — nur prozentuale Trends

---

### 14.1 — Local Trend Radar (Regionale Nachfrage-Analyse)

**Schnittpunkt mit Phase 4 (Style Benchmark):** Die materialisierte View `brew_style_averages` liefert bereits die Datenbasis aller Stile. Phase 14.1 **erweitert diese View um eine Geo- und Zeitdimension.**

**Server Action: `getLocalTrendRadar(breweryId, radiusKm)`**

```typescript
type LocalTrend = {
  style: string; // z.B. 'IPA', 'Sour Ale'
  scanChangePercent: number; // +23% = Nachfrage steigt
  avgRatingInRadius: number; // Wie gut werden diese Stile bewertet
  competitorCount: number; // Wie viele andere Brauereien diesen Stil brauen (≥3 für Anzeige)
  opportunity: "high" | "medium" | "low"; // Hohe Nachfrage + wenig Konkurrenz = high
};
```

**Datenquelle:** `bottle_scans` (mit Geo) JOIN `brews` (mit Stil) → gruppiert nach `style_normalized` + PLZ-Radius um die Brauerei des anfragenden Users.

**🔗 Verbindung zu Phase 13 (BotlGuide Analyst):**

> _"In deinem 50km-Radius ist die Nachfrage nach Sour Ales um 23% gestiegen, aber nur 2 lokale Brauereien brauen diesen Stil. Das ist eine Marktlücke — BotlGuide empfiehlt, ein Berliner Weisse als Einstieg zu brauen."_

**Platzierung:** Tab _Zielgruppe & Loyalität_.

Tier-Gating: ab `brewery`.

---

### 14.2 — Cross-Consumption-Analyse (Distribution Leads)

**Schnittpunkt mit Phase 13 (Loyalty):** Die Loyalty-Daten zeigen, wer Stammtrinker ist. Die Cross-Consumption-Analyse zeigt, **was diese Stammtrinker sonst noch scannen.**

**Ehemals Brainstorming Idee D — jetzt zu einer konkreten Phase promoviert.**

**Server Action: `getCrossConsumptionInsights(breweryId)`**

```typescript
type CrossConsumptionInsight = {
  overlapBreweryCount: number; // "X% deiner Trinker scannen auch Biere von Y anderen Brauereien"
  topOverlapStyles: string[]; // Welche Stile trinken deine Kunden außerdem
  geographicHotspots: {
    // Wo scannen deine Trinker die anderen Biere
    city: string;
    scanPercentage: number;
  }[];
};
```

**Privacy Shield:** Der anfragende Brauer sieht **nie** die Namen der anderen Brauereien, nur: _"60% deiner Trinker scannen auch Biere in der Kategorie 'Pale Ale', häufig im Umkreis von Leipzig."_

**Verbindung zum Business-Pain "Distribution":**

> _"Deine Trinker scannen auffällig oft Biere, die im Bereich Leipzig-Connewitz verkauft werden. Es gibt dort 3 Craft-Beer-Shops mit hoher Aktivität. Erwäge, dein Bier dort anzubieten."_

Tier-Gating: `enterprise`.

---

### 14.3 — Saisonale Stilnachfrage (Timing-Empfehlung)

**Schnittpunkt mit Phase 13.5 (Saisonalitäts-Index):** Der Index zeigt die Saisonalität eines einzelnen Brews. Phase 14.3 zeigt die Saisonalität **ganzer Stile** plattformweit.

**Server Action: `getStyleSeasonality(style)`**

Liefert: _"IPAs werden auf BotlLab zu 45% im Sommer gescannt, Stouts zu 62% im Winter. Dein bestes Zeitfenster für ein neues Stout-Release ist Oktober."_

Tier-Gating: ab `brewery`.

---

## 🤖 PHASE 15: BOTLGUIDE ANALYST (KI-INSIGHTS ENGINE)

> **Voraussetzung:** Phase 5.3 (Off-Flavor), Phase 4.5 (Batch A/B), Phase 14 (Marktintelligenz). BotlGuide-Infrastruktur (`BotlGuideProvider`, `ai_usage_logs`, `botlguide_feedback`) existiert bereits im Session-Modul.

### Smoke-Test & Seed-Daten für BotlGuide Analyst

**Ziel:** Phase 15 ist die höchstriskante Phase (LLM-Integration + Cron + Multi-Phasen-Datenquellen). Ein End-to-End-Smoke-Test ist Pflicht.

**Seed-Daten:** Erweiterung von `seed_analytics.js` um `seedAnalyticsInsights()` — generiert ≥20 realistische `analytics_ai_insights`-Einträge über verschiedene `insight_type`-Kategorien (off_flavor, batch_comparison, trend, market, seasonality, shelf_life) mit plausiblen `trigger_data`-JSONBs.

**Smoke-Test-Checkliste (Phase 15):**

- [ ] Anomaly Detector Cron-Job erkennt mindestens 1 Anomalie in Seed-Daten
- [ ] LLM-Call wird nur bei Z-Score > 2.0 ausgelöst (nicht bei Normalwerten)
- [ ] BotlGuide Action-Card erscheint auf dem Analytics-Dashboard
- [ ] Brauer kann Insight up-/downvoten (Feedback-Loop)
- [ ] `ai_usage_logs`-Eintrag wird korrekt geschrieben (Credit-Tracking)
- [ ] Insights mit `expires_at` in der Vergangenheit werden nicht angezeigt

**Kernkonzept:** BotlGuide Analyst ist **kein neues Chat-Fenster**, sondern ein proaktiver KI-Layer, der im Hintergrund die Analytics-Daten überwacht und dem Brauer fertige Handlungsempfehlungen auf das Dashboard legt. Der Brauer muss keine Fragen stellen — die Antworten kommen zu ihm.

**Schnittpunkt mit bestehender BotlGuide-Infrastruktur:**

- `BotlGuideProvider` (existiert in Sessions): Wird erweitert um einen `analytics`-Context
- `ai_usage_logs`: Trackt die AI-Credits für Analytics-Insights (Monetarisierung)
- `botlguide_feedback`: Brauer können Insights up-/downvoten → Feedback-Loop zur Verbesserung

---

### 15.1 — Migration: `analytics_ai_insights` Tabelle

```sql
CREATE TABLE IF NOT EXISTS analytics_ai_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id      uuid NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  brew_id         uuid REFERENCES brews(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,                           -- Insights veralten (z.B. nach 30 Tagen)

  -- Klassifikation
  insight_type    text NOT NULL,                         -- 'off_flavor', 'batch_comparison', 'trend', 'market', 'seasonality', 'shelf_life'
  severity        text NOT NULL DEFAULT 'info',          -- 'info', 'warning', 'critical'

  -- Inhalt
  title           text NOT NULL,                         -- Kurztitel für Action-Card
  body            text NOT NULL,                         -- Markdown-formatierter Insight-Text
  action_suggestion text,                                -- Konkrete Handlungsempfehlung

  -- Datengrundlage (für Transparenz)
  trigger_data    jsonb NOT NULL DEFAULT '{}',           -- Die Rohdaten, die den Insight ausgelöst haben
  source_phases   text[],                                -- z.B. ['phase_4', 'phase_5'] — Herkunft

  -- Brauer-Feedback
  brewer_reaction text,                                  -- 'helpful', 'not_helpful', NULL
  brewer_notes    text,                                  -- Optionaler Kommentar

  -- Status
  is_read         boolean NOT NULL DEFAULT false,
  is_dismissed    boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_insights_brewery ON analytics_ai_insights (brewery_id, created_at DESC);
CREATE INDEX idx_insights_unread ON analytics_ai_insights (brewery_id) WHERE is_read = false AND is_dismissed = false;
```

---

### 15.2 — Anomaly Detector Worker (Cron-Job)

**Schnittpunkte:** Dieser Worker liest Daten aus **allen vorherigen Phasen** und triggert BotlGuide nur bei signifikanten Abweichungen:

| Quelle                     | Trigger                                            | Insight-Typ                               |
| -------------------------- | -------------------------------------------------- | ----------------------------------------- |
| **Phase 5.3** (Off-Flavor) | ≥3 unabhängige Off-Flavor-Meldungen in 30 Tagen    | `off_flavor` (severity: warning/critical) |
| **Phase 4.5** (Batch A/B)  | Neuer Sud weicht ≥0.5 Punkte im Overall-Rating ab  | `batch_comparison`                        |
| **Phase 5** (Taste Trend)  | Rating-Durchschnitt sinkt ≥0.3 Punkte vs. Vormonat | `trend`                                   |
| **Phase 5.4** (Shelf-Life) | Klarer Drop-Off erkannt (Rating sinkt ab Tag X)    | `shelf_life`                              |
| **Phase 10** (Events)      | Neues Event erkannt mit ≥10 Scans                  | `event_detected`                          |
| **Phase 14** (Markt)       | Marktlücke erkannt (hohe Nachfrage, wenig Angebot) | `market`                                  |

**Cron:** Einmal täglich um 04:00 UTC. Liest Kennzahlen, prüft auf Schwellenwerte, generiert Insights via LLM nur bei echten Anomalien (spart API-Kosten).

---

### 15.3 — BotlGuide Prompt-Engineering (Analytics-Kontext)

**Das Einzigartige:** BotlGuide bekommt sowohl die **Konsumenten-Daten** (Scans, Ratings, Tags) als auch die **Produktionsdaten** (Brauprotokoll aus dem Session-Log: Malzschüttung, Hopfengabe, Gärtemperatur, Hefestamm, Nachgärzeit). Kein anderes Tool auf der Welt kann beides zusammen auswerten.

**System-Prompt-Struktur:**

```
Du bist der BotlGuide Analyst, ein KI-Braumeister-Berater.
Du erhältst zwei Datenquellen und musst sie miteinander korrelieren:

1. KONSUMENTEN-FEEDBACK:
   - Taste-Profile der letzten 30 Tage (Ratings, Flavor-Tags)
   - Off-Flavor-Meldungen
   - Vergleich zum vorherigen Sud (wenn vorhanden)

2. PRODUKTIONSDATEN (aus dem Brauprotokoll/Session-Log):
   - Rezept (Malz, Hopfen, Hefe)
   - Prozessparameter (Maischtemperaturen, Gärdauer, Nachgärzeit)
   - Abfülldatum

Deine Aufgabe:
- Korreliere das Konsumenten-Feedback mit den Produktionsänderungen
- Identifiziere die wahrscheinlichste Ursache für Qualitätsänderungen
- Gib eine konkrete, umsetzbare Handlungsempfehlung
- Antworte auf Deutsch, maximal 3 Sätze
```

---

### 15.4 — UI: BotlGuide Action-Cards auf dem Analytics-Dashboard

**Platzierung:** Ganz oben auf dem Tab _Übersicht_, **über** den Metrik-Kacheln. Maximal 3 aktive Insights gleichzeitig sichtbar.

```
┌─ 🤖 BotlGuide Analyst ─────────────────────────────────────────────â”
│                                                                     │
│  ⚠️ Off-Flavor Alert: "Grüner Apfel" bei Sud #42                   │
│  3 unabhängige Trinker melden Acetaldehyd. Dein Brauprotokoll       │
│  zeigt 9 Tage Nachgärung (Sud #41 hatte 14). Verlängere um 3 Tage. │
│  [👍 Hilfreich]  [👎 Nicht relevant]  [Details →]                    │
│                                                                     │
│  📊 Marktchance: Sour Ales in deiner Region                         │
│  +23% Scan-Nachfrage im Umkreis von 50km, nur 2 lokale Anbieter.   │
│  [👍 Hilfreich]  [👎 Nicht relevant]  [Details →]                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Feedback-Loop:** Klickt der Brauer auf 👍/👎, wird das in `analytics_ai_insights.brewer_reaction` gespeichert und fließt in `botlguide_feedback` ein → verbessert zukünftige Insights.

Tier-Gating: ab `brewery` (Basis-Insights wie Off-Flavor). Erweiterte Insights (Marktintelligenz) ab `enterprise`.

---

## 💡 BRAINSTORMING: ZUKÜNFTIGE IDEEN (nicht eingeplant)

> Ideen für spätere Roadmap-Revisionen. Keine feste Phase.

### Idee A — NFC-Tap als paralleles Scan-Signal

BotlLab-Flaschen mit NFC-Tags. Stärkeres Konsumations-Signal als QR (Flasche physisch in der Hand). Bestehende `scan_source`-Spalte ist vorbereitet (`'nfc_tap'`). Infrastruktur-Aufwand: Labels + Tags.

### Idee B — Time-to-Glass-Metrik

Wie lange dauert es von der Abfüllung bis zum Konsum? Kombination aus `bottles.filled_at` + `bottle_scans.created_at` WHERE `scan_intent = 'confirmed'`. Zeigt dem Brauer ob sein Bier frisch oder gelagert getrunken wird. → Teilweise umgesetzt durch Phase 5.4 (Shelf-Life). Erweiterung: Nur `confirmed`-Scans nutzen statt aller Scans.

### Idee C — Hyper-Local Push-Marketing (Braucht "Zwei Welten"-Konzept)

Der Brauer veranstaltet einen Taproom-Event. Über BotlLab kann er eine Push-Nachricht an alle Trinker senden, die im 30km-Radius leben UND eines seiner Biere mit ≥4★ bewertet haben. Der Brauer sieht **nie**, wer diese Leute sind — BotlLab agiert als anonymer Vermittler. **Voraussetzung:** Die B2C-App (`/my-cellar`) aus dem "Zwei Welten"-Konzept muss existieren, damit Trinker überhaupt Push-Nachrichten empfangen können. Extrem hohe Zahlungsbereitschaft, da 0% Streuverlust.

### Idee D — Brauerei-Kooperationen via Cross-Consumption

Erweiterung von Phase 14.2: Wenn zwei Brauereien eine hohe Trinker-Überlappung haben, schlägt BotlLab eine Kooperation vor ("Collaboration Brew"). Beide Brauereien müssen opt-in. Revenue-Modell: BotlLab erhält eine Vermittlungsgebühr.

---

## 📍 Tier-Gating-Übersicht (nach Umsetzung)

| Feature                               | free | brewer (€4.99) | brewery (€14.99) | enterprise   |
| ------------------------------------- | ---- | -------------- | ---------------- | ------------ |
| Analytics-Zugang                      | ❌   | ✅ 30 Tage     | ✅ 90 Tage       | ✅ 365 Tage  |
| **Tier-Enforcement (serverseitig)**   | —    | ✅ erzwungen   | ✅ erzwungen     | ✅ erzwungen |
| **Verified Drinker Funnel**           | ❌   | ✅             | ✅               | ✅           |
| **Scan→Drinker Rate pro Brew**        | ❌   | ✅             | ✅               | ✅           |
| **Stil-Benchmark**                    | ❌   | ✅             | ✅               | ✅           |
| **Geschmacksprofil-Trend**            | ❌   | ✅             | ✅               | ✅           |
| **Off-Flavor Frühwarnsystem** 🆕      | ❌   | ✅             | ✅               | ✅           |
| **Herkunftsquellen (UTM/Referrer)**   | ❌   | ✅             | ✅               | ✅           |
| **Flaschenfüllalter-Analyse**         | ❌   | ✅             | ✅               | ✅           |
| **Saisonalitäts-Index**               | ❌   | ✅             | ✅               | ✅           |
| CSV-Export                            | ❌   | ❌             | ✅               | ✅           |
| Erweiterte Filter                     | ❌   | ❌             | ✅               | ✅           |
| **Batch A/B Testing** 🆕              | ❌   | ❌             | ✅               | ✅           |
| **Degradationskurve (Shelf-Life)** 🆕 | ❌   | ❌             | ✅               | ✅           |
| **Rater-Demografie**                  | ❌   | ❌             | ✅               | ✅           |
| **Wetter-Korrelation**                | ❌   | ❌             | ✅               | ✅           |
| **Wöchentlicher E-Mail-Report**       | ❌   | ❌             | ✅               | ✅           |
| **Scan Intent Classification**        | ❌   | ❌             | ✅               | ✅           |
| **Loyalty-Segmente**                  | ❌   | ❌             | ✅               | ✅           |
| **Drinker-Bestätigungs-Popup**        | ❌   | ❌             | ✅               | ✅           |
| **BotlGuide Analyst (Basis)** 🆕      | ❌   | ❌             | ✅               | ✅           |
| **Local Trend Radar** 🆕              | ❌   | ❌             | ✅               | ✅           |
| **Beat the Brewer (Minigame)** 🆕     | ✅   | ✅             | ✅               | ✅           |
| **Taste DNA (B2C-Profil)** 🆕         | ✅   | ✅             | ✅               | ✅           |
| **Vibe Check (B2C-Minigame)** 🆕      | ✅   | ✅             | ✅               | ✅           |
| **Perceived vs. Intended (B2B)** 🆕   | ❌   | ❌             | ✅               | ✅           |
| **Differential Rating (B2B)** 🆕      | ❌   | ❌             | ✅               | ✅           |
| **Shareable Taste DNA** 🆕            | ❌   | ❌             | ✅               | ✅           |
| **Stash / POS Check-In** 🆕           | ❌   | ❌             | ✅               | ✅           |
| Geo-Heatmap                           | ❌   | ❌             | ❌               | ✅           |
| **Event-Cluster-Erkennung**           | ❌   | ❌             | ❌               | ✅           |
| **Event-Benachrichtigungen**          | ❌   | ❌             | ❌               | ✅           |
| **Bottle-Reise-Tracking**             | ❌   | ❌             | ❌               | ✅           |
| **Cross-Consumption-Analyse** 🆕      | ❌   | ❌             | ❌               | ✅           |
| **Brewer Bounties** 🆕                | ❌   | ❌             | ❌               | ✅           |
| **Beat a Friend** 🆕                  | ❌   | ❌             | ❌               | ✅           |
| **BotlGuide Analyst (Erweitert)** 🆕  | ❌   | ❌             | ❌               | ✅           |

## 🗓️ Zeitplanung (Schätzung)

| Phase      | Beschreibung                                     | Komplexität                            | Geschätzte Dauer | Abhängigkeiten                            |
| ---------- | ------------------------------------------------ | -------------------------------------- | ---------------- | ----------------------------------------- |
| Phase 0    | Frontend-Architektur & Privacy Shield            | Mittel (UI-Refactor)                   | 2–3 Tage         | —                                         |
| Phase 1    | Kritische Bug Fixes                              | Mittel (DB + Backend)                  | 2–3 Tage         | —                                         |
| Phase 2    | Verified Drinker Funnel                          | Mittel (Backend + UI)                  | 2–3 Tage         | Phase 1                                   |
| Phase 3    | Rater-Demografie                                 | Hoch (Backend + UI + DSGVO)            | 3–4 Tage         | Phase 1                                   |
| Phase 4    | Stil-Benchmark + 🆕 Batch A/B Testing            | Hoch (DB + Backend + UI)               | 3–4 Tage         | Phase 1                                   |
| Phase 5    | Geschmackstrend + 🆕 Off-Flavor + 🆕 Shelf-Life  | Hoch (Algorithmus + Alert + UI)        | 4–5 Tage         | Phase 1, Phase 7.4                        |
| Phase 6    | E-Mail-Report + 🆕 KI-Zusammenfassung            | Mittel (Backend + Cron)                | 2–3 Tage         | Phase 1, Phase 2                          |
| Phase 7    | Erweiterte Scan-Datenbasis                       | Mittel (DB + Backend + UI)             | 2–3 Tage         | Phase 1                                   |
| Phase 8    | Wetter-Korrelation ⚠️ _Niedrigste Prio_          | Hoch (API-Integration + Cron + UI)     | 4–5 Tage         | Phase 1, Phase 7                          |
| Phase 9    | Scan Intent + 🔄 Smart Sampling + Admin Accuracy | Sehr Hoch (ML-Feedback + Admin-UI)     | 6–8 Tage         | Phase 1, Phase 7                          |
| Phase 10   | Event-Cluster-Erkennung                          | Hoch (Geo-Algorithmus + Cron + UI)     | 4–6 Tage         | Phase 1, Phase 9                          |
| Phase 11   | 🆕 Drinker Experience Engine                     | Hoch (Gamification + B2C-UI + DNA)     | 5–7 Tage         | Phase 2, Phase 9, **KONZEPT_ZWEI_WELTEN** |
| Phase 12   | 🆕 Viral & Commerce Loops                        | Hoch (Social + POS + Rewards)          | 5–7 Tage         | Phase 11                                  |
| Phase 13   | Bottle-Reise + Loyalty                           | Mittel (Backend + UI + Karte)          | 3–4 Tage         | Phase 1, Phase 9                          |
| Phase 14   | Marktintelligenz & Distribution                  | Hoch (Cross-Brewery-Queries + Privacy) | 5–7 Tage         | Phase 4, Phase 10, 13                     |
| Phase 15   | BotlGuide Analyst (KI-Insights Engine)           | Sehr Hoch (LLM-Integration + Cron)     | 5–7 Tage         | Phase 5.3, Phase 4.5, 14                  |
| **Gesamt** |                                                  |                                        | **57–79 Tage**   |                                           |

## ⚠️ Wichtige Designentscheidungen

1. **"Verified Drinker" = Rating ODER Kronkorken-Claim ODER Drinker-Bestätigung** — alle drei Aktionen setzen einen nachweisbaren Konsum voraus. Das Rating erfordert eine inhaltliche Auseinandersetzung mit dem Bier. Der Kronkorken-Claim setzt physischen Besitz voraus. Die Drinker-Bestätigung (Phase 9) ist das direkte "Ja, ich trinke das"-Signal am Point of Sale/Consumption.

2. **Anonyme Scans bleiben im Funnel** — sie werden nicht entfernt, sondern klar als "Anonym / Nicht eingeloggt" gekennzeichnet. Das ist statistisch ehrlich und zeigt dem Brauer, wie groß das Dunkel-Segment ist.

3. **Demografie zeigt nur Gruppen, nie Individuen** — Mindestgruppengröße 5. Gruppen unter 5 werden als "< 5" angezeigt. Kein Feature erlaubt das Identifizieren einzelner Nutzer.

4. **Analytics Opt-out wird immer respektiert** — Alle neuen Server Actions filtern `analytics_opt_out IS TRUE` heraus, bevor Profile gelesen werden.

5. **Stil ist Freitext** — `brews.style` ist eine freitextliche Eingabe. Beim Benchmark wird `LOWER(TRIM(style))` normalisiert. Stile mit weniger als 3 Brews erhalten keinen Benchmark-Wert. Stile "Unbekannt" und Leerstring werden ausgeschlossen.

6. **Phase-Reihenfolge ist verbindlich** — Phase 1 muss deployed und verifiziert sein, bevor Phase 2 beginnt. Ohne funktionierende `analytics_daily_stats`-Befüllung haben alle Funnel-Werte keine Grundlage.

7. **Tier-Bypass: Kappen, nicht ablehnen** — Wenn ein `brewer`-User einen zu langen Zeitraum anfordert, wird der Start-Datum auf das erlaubte Maximum gesetzt, kein Fehler geworfen. Die UI zeigt einen Hinweis "Zeitraum auf 30 Tage begrenzt". Fairness vor Frustration.

8. **Datenschutz & Geolocations (H3 Spatial K-Anonymity)** — (Update Rev. 5). Wir nutzen `navigator.geolocation` via Opt-In, aber pushen **niemals** die private Heimadresse in die DB! Jeder GPS-Punkt wird serverseitig in ein H3-Hexagon (Resolver 8 = ~450m Kantenlänge) übersetzt. Die Originalkoordinate wird gelöscht, gespeichert wird nur das Zentrum des Hexagons (`geo_source = 'gps_snapped_h3'`). Lehnt der Nutzer GPS ab, nutzen wir `x-vercel-ip-country/city` (`geo_source = 'ip_vercel'`). IP-Locations werden für grobe Analytics genutzt, aber radikal aus dem App-Clustering (Phase 10) gefiltert, da Mobile-Provider-Exits sonst Fake-Events in Großstädten erzeugen ("Das Frankfurt-Problem").

9. **Open-Meteo für Wetter** — Kostenlos, keine API-Key-Pflicht für < 10.000 Requests/Tag, GDPR-konform (europäische Server, kein User-PII). PII wird nie an Open-Meteo übertragen — nur anonyme lat/lng-Koordinaten gerundet auf 1 Dezimalstelle (~11km Auflösung). Wetterdaten werden per `weather_fetched_at IS NULL` lazy nachgeladen, nicht im Scan-Pfad.

10. **ABV/IBU als Generated Columns** — Keine Datenmigration, kein ETL-Job. PostgreSQL berechnet die Werte automatisch aus dem `data`-JSONB-Blob. Falls `data->>'abv'` leer oder kein valider Float ist, gibt die Column NULL zurück — sicher.

11. **Event-Cluster & Bottle-Reise sind Enterprise-Features** — erhöhter Rechenaufwand (räumliche Abfragen via PostGIS). Um zukünftig die abgerufenen Datenserien der "Enterprise"-Tier im Dashboard (365 Tage Historie) in Echtzeit zu performen, werden später für das Backend Materialized Views eingeführt. Für den MVP Start reicht Raw-Table-Querying.

12. **Scan Intent Classification ist ein lernfähiges System mit strukturiertem Feedback-Loop** — Die Startwahrscheinlichkeiten (0.15 für Browse, 0.50 für Single, 0.85 für Repeat) sind initiale Schätzungen. Die Kalibrierung erfolgt via EWMA (Exponentially Weighted Moving Average, α=0.05) für sanfte, sprungfreie Anpassungen. Jede Nutzer-Bestätigung wird in `scan_intent_feedback` mit vollständigem Kontext (Verweildauer, Scroll-Tiefe, Gerät, Tageszeit) geloggt — nicht nur "richtig/falsch", sondern **warum** die Vorhersage richtig oder falsch war. Das Admin-Dashboard zeigt Confusion Matrix, Calibration Plot und Drift-Erkennung.

13. **Drinker-Bestätigungs-Popup nutzt Smart Sampling und Engagement-basiertes Timing** — Nicht jeder Nutzer wird gefragt: Uncertainty Sampling priorisiert Scans mit `drinking_probability` nahe 0.5 (höchster Informationsgewinn). Engagement-Signale (Scroll-Tiefe, Verweildauer, Rating-Abgabe) ersetzen den starren 10-Sekunden-Timer. Maximal 1× pro Session, automatisches Ausblenden nach 15 Sekunden, "Nicht mehr fragen"-Checkbox, Owner-/Browse-Scans nie gefragt, Erstnutzer (≤2 Scans) nie gefragt. Der Prompt ist ein Slide-In-Banner, kein Modal. Sampling-Rates werden dynamisch angepasst: "Maintenance Mode" (2%) bei hoher Accuracy, "Re-Learning Mode" (30%) bei niedriger.

14. **Browse-Scan-Erkennung basiert auf Session, nicht auf User** — Auch anonyme Kühlschrank-Browser werden erkannt (via `session_hash`), nicht nur eingeloggte Nutzer. Das verbessert die Datenqualität für alle Tiers.

15. **Event-Cluster-Parameter sind konservativ** — Default: ≥5 Scans, ≥3 verschiedene Sessions, ≤1km Radius, ≤3h Zeitfenster. Lieber ein Event verpassen als false positives melden. Brauer können manuell Events annotieren die das System nicht erkannt hat.

16. **BotlGuide Analyst generiert Insights nur bei statistisch signifikanten Anomalien (Z-Score)** — Der Cron-Job verwendet keine absoluten Schwellenwerte (z.B. "≥3 Off-Flavor-Meldungen"), da diese bei wachsender Datenmenge nicht skalieren. Stattdessen berechnet er den **Z-Score** jeder Metrik relativ zum historischen Moving Average des jeweiligen Brews/Brauerei. Nur wenn Z > 2.0 (≈ 95. Perzentil) überschritten wird, wird ein LLM-Call ausgelöst. Das spart API-Kosten und verhindert "Insight-Fatigue" beim Brauer. Lieber 1 hilfreicher Insight pro Woche als 10 irrelevante pro Tag.

17. **Off-Flavor-Tags sind eine kuratierte Whitelist** — Es gibt keine Freitext-Eingabe für Off-Flavors. Die Tags basieren auf den Standardfehlern der BJCP-Richtlinien (Acetaldehyd, Diacetyl, DMS, Oxidation, Lichtfehler, etc.). Das verhindert Spam und macht Meldungen vergleichbar. Die Whitelist wird als `off_flavor_tags`-Array in der `ratings`-Tabelle gespeichert.

18. **Batch A/B Testing erfordert manuelle Rezeptzuweisung** — BotlLab kann nicht automatisch erkennen, ob zwei Brews "derselbe Sud mit anderem Rezept" sind. Der Brauer muss aktiv einen Vergleichs-Brew auswählen. Das verhindert unsinnige Vergleiche (z.B. IPA vs. Stout) und gibt dem Brauer die Kontrolle.

19. **Cross-Consumption zeigt nie Konkurrenz-Namen** — Aus Datenschutz- und Wettbewerbsgründen sieht ein Brauer nie, welche spezifischen anderen Brauereien seine Trinker besuchen. Nur aggregierte Kategorien: "60% deiner Trinker scannen auch [Stil]", "Häufig in [Region]". Die Anonymität der teilnehmenden Brauereien ist unverhandelbar.

20. **Marktintelligenz-Daten sind 7 Tage verzögert** — Trend-Radar und Cross-Consumption-Daten basieren auf rollierenden 30-Tage-Fenstern, aber die letzten 7 Tage werden ausgeblendet. Das verhindert, dass ein Brauer tagesaktuelle Konkurrenz-Aktivitäten tracken kann, und gibt neu registrierten Brauereien eine "Schonfrist" bevor ihre Daten in die Aggregation einfließen.

21. **Schwellenwert-Änderungen erfordern manuelle Admin-Bestätigung** — Auch wenn das System automatisch erkennt, dass eine Browse-Schwelle von ≥3 auf ≥4 geändert werden sollte, wird diese Änderung **nie** automatisch deployed. Der Admin sieht die Empfehlung auf dem Model Accuracy Dashboard und bestätigt oder lehnt ab. Grund: Ein falscher Schwellenwert verändert sofort die Datenqualität aller Brauereien. Menschliche Kontrolle ist Pflicht.

22. **Smart Sampling fragt Erstnutzer (≤2 Scans) nie** — Ein Nutzer, der BotlLab zum ersten Mal benutzt, soll nicht sofort mit einer Frage konfrontiert werden. Das "Progressive Disclosure"-Prinzip (bekannt aus LinkedIn, Duolingo) besagt: Erst Wert liefern, dann Daten einfordern. Erst ab dem 3. Scan ist genug Vertrauen aufgebaut.

23. **Feedback-Loop-Daten werden in einer eigenen Tabelle (`scan_intent_feedback`) gespeichert, nicht auf `bottle_scans`** — Trennung von Concerns: `bottle_scans` enthält Rohdaten über physische Scan-Events, `scan_intent_feedback` enthält Metadaten über das Machine-Learning-Modell (Vorhersage, Kontext-Features, Korrektheit). Diese Trennung verhindert, dass die `bottle_scans`-Tabelle mit ML-spezifischen Spalten aufgebläht wird und ermöglicht saubere JOINs für die Confusion Matrix.

24. **Differential Rating statt Bias-Manipulation** — Wir manipulieren niemals die Roh-Bewertungen eines Trinkers. Stattdessen zeigt das Analytics-Dashboard dem Brauer zwei Kennzahlen nebeneinander: (1) **Raw Average** — der echte, ungewichtete Markt-Durchschnitt, und (2) **Target Audience Average** — der Durchschnitt nur derjenigen Trinker, deren Taste-DNA auf den jeweiligen Bierstil passt. Der Brauer sieht die Differenz und kann selbst entscheiden, ob ein niedriges Rating ein echtes Qualitätsproblem oder ein Zielgruppen-Mismatch ist. Die Wahrhaftigkeit der Roh-Daten ist unverhandelbar.

25. **Cold Start Bootstrap (Phase 9.10)** — Bevor genug Feedback-Daten für die Scan-Intent-Kalibrierung vorliegen (< 200 bestätigte Labels), nutzt das System einen regelbasierten Fallback statt des ML-Modells. Regeln: `engagement_time > 45s AND scroll_depth > 60%` → `drinking_probability = 0.80`. Erst ab 200 Labels wird auf das EWMA-kalibrierte Modell umgeschaltet. Der Admin sieht auf dem Model Accuracy Dashboard den aktuellen Modus ("Bootstrap" vs. "Calibrated") und die Label-Count-Fortschrittsanzeige.

26. **H3 Privacy "Wohnzimmer-Falle" — N≥3 Threshold** — Ein einzelner Scan in einem H3-Hexagon (Resolution 8) kann auf eine Privatadresse zurückgeführt werden. Deshalb gilt: Ein Hexagon wird **nur** in Visualisierungen und Clustering verwendet, wenn es ≥3 verschiedene `session_hash`-Werte enthält. Hexagone mit N<3 werden auf Resolution 7 (~1.2km) hochaggregiert. Diese Regel ist in der PostGIS-Query und in der UI-Heatmap fest verankert und kann nicht per Config deaktiviert werden.

27. **B2C-Minigames sind immer kostenlos (alle Tiers inkl. Free)** — Beat the Brewer, Taste DNA und Vibe Check sind auf **allen** Tiers verfügbar, einschließlich des kostenlosen Plans. Begründung: Maximale Datenerfassung erfordert maximale Teilnahme. Jede Paywall auf der B2C-Seite reduziert die Datenmenge, die für die B2B-Analytics (der eigentliche Monetarisierungskanal) zur Verfügung steht. Die Minigames sind das **Daten-Sammel-Instrument**, nicht das Produkt. Nur die B2B-Auswertung dieser Daten (Perceived vs. Intended Dashboard, Differential Rating, Konsum-Situations-Heatmaps) ist tier-gated ab `brewery`. Analogie: Spotify lässt jeden Nutzer Musik hören (= Daten generieren), monetarisiert aber die Insights für Labels und Künstler.

28. **Tasting IQ ist ein eigenständiges Schema — kein Missbrauch von `user_achievements`** — `user_achievements` bleibt für one-shot Meilensteine (erster Scan, 10 Ratings, erstes Beat-the-Brewer). `profiles.tasting_iq` ist der kontinuierliche Kompetenz-Score, jede Punkt-Änderung wird in `tasting_score_events` protokolliert. Diese Trennung ist bewusst: (1) Leaderboards sind trivial (`ORDER BY tasting_iq DESC`), keine Aggregation über Badges, (2) Score-Korrekturen sind möglich ohne Achievements zu invalidieren, (3) die `metadata JSONB`-Spalte in `tasting_score_events` speichert die Slider-Werte aus Beat the Brewer und ist damit die rohe Datenbasis für Taste DNA — ein Missbrauch von `user_achievements` für diesen Zweck wäre ein fundamentaler Architektur-Fehler gewesen.
