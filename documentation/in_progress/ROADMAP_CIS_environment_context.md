# Roadmap: CIS Environment Context — Wetter, Zeit & Feiertage

**Kontext:** Das CIS-Scoring-Modell (Phase 0, eingeführt 08.03.2026) berechnet die `drinking_probability` eines Scans anhand von Verhaltenssignalen wie Session-Struktur, Dwell Time und Scan-Quelle. Wir erheben bereits Wetter- (`weather_condition`, `temperature`) und Zeitdaten (`created_at`) zu jedem Scan — diese fließen bislang aber **nicht in den Score ein**. Diese Roadmap beschreibt, wie wir die CIS Engine um leichte, kontextuelle Modifikatoren erweitern, die den Score in der "Grauzone" präzisieren.

---

## Kernidee

Ein QR-Scan am Freitagabend bei 24°C ist statistisch deutlich wahrscheinlicher ein echter Trinker als ein Scan am Dienstagvormittag bei 5°C. Wir können diese kontextuellen Signale nutzen, um Scans, die verhaltenstechnisch uneindeutig sind (score ~0.3–0.5), genauer einzuordnen.

Um den "Perfekten Score" zu garantieren, müssen diese Signale vollständig datengetrieben und geolokalisations-aware sein (Zeitzonen, produktspezifische Wetterprofile). 

**Wichtig:** Diese Modifikatoren sind nur **Feintuning**. Alle Hard-Rules (kein QR → `drinking_probability = 0.0`) bleiben absolut. Der maximale kumulative Einfluss der neuen Faktoren beträgt ca. **±0.25**.

```
Aktuelles Scoring:
  BASE_SCORE                    +0.30
  FRIDGE_SURFING_PENALTY        −0.40
  LAST_IN_SESSION_BONUS         +0.20
  DWELL_TIME_BONUS              +0.40
  → Clamp [0.0, 1.0]

Erweitertes Scoring (Datengetrieben):
  + DYNAMIC_TEMP_BONUS          +0.05  (Scan-Temperatur entspricht typischer Temperatur für dieses Brew)
  + DYNAMIC_TEMP_PENALTY        −0.05  (Scan-Temperatur weicht stark ab)
  + WEEKEND_HOLIDAY_BONUS       +0.05  (Scan in lokaler Zeitzone am Wochenende / Feiertag)
  + DYNAMIC_TIME_BONUS          +0.15  (Scan fällt in historisch typische Trinkzeit des Brews)
  + DYNAMIC_TIME_PENALTY        −0.15  (Scan weicht stark von historischer Trinkzeit ab)
  → Clamp [0.0, 1.0]
```

---

## Phase 1 — Datenbank-Infrastruktur für dynamische Kontexte

Um den API-Endpoint während der Echtzeit-Klassifizierung zu entlasten und teure SQL-Aggregationen zu vermeiden, verlagern wir die Berechnung der "typischen" Werte in nächtliche Cronjobs (oder Materialized Views).

### 1.1 — Erweiterung der `brews` Tabelle

Wir fügen der `brews` Tabelle Felder für die aggregierten Kontextdaten hinzu. Diese Felder lernen kontinuierlich aus verifizierten Scans.

**Aktion:** Migration erstellen (`supabase/migrations/XXX_add_brew_context_stats.sql`).

```sql
ALTER TABLE brews 
ADD COLUMN typical_scan_hour integer NULL, -- Häufigste Scan-Stunde (0-23)
ADD COLUMN typical_temperature integer NULL; -- Durchschnittliche Wetter-Temperatur beim Scan
```

### 1.2 — Nächtlicher Aggregations-Cronjob

Wir erstellen eine Edge Function (oder ein SQL-Script via `pg_cron`), die jede Nacht die `typical_scan_hour` und `typical_temperature` pro Brew aktualisiert.

**Die Logik muss zyklische Stunden (Mitternachts-Problem) korrekt verarbeiten.** Statt einem fehlerhaften arithmetischen Mittel (`AVG`) nutzen wir den Modus (`MODE()`), also den *häufigsten* Wert.

```sql
-- Beispiel-Logik für den nächtlichen Update-Job
UPDATE brews b
SET 
  -- Finde die absolut häufigste Stunde (Modus) der letzten 90 Tage
  typical_scan_hour = (
    SELECT MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM s.local_time))
    FROM bottle_scans s
    WHERE s.brew_id = b.id AND (s.converted_to_rating = true OR s.confirmed_drinking = true)
      AND s.created_at > NOW() - INTERVAL '90 days'
  ),
  -- Finde die Durchschnittstemperatur
  typical_temperature = (
    SELECT AVG(s.temperature)
    FROM bottle_scans s
    WHERE s.brew_id = b.id AND (s.converted_to_rating = true OR s.confirmed_drinking = true)
      AND s.temperature IS NOT NULL
      AND s.created_at > NOW() - INTERVAL '90 days'
  );
```

---

## Phase 2 — Scan-Payload & `bottle_scans` Selektion anpassen

### 2.1 — Zeitzonen-Awareness (Das UTC-Problem lösen)

Die Backend-Uhr läuft auf UTC. Ein Scan um 21:00 Uhr in Berlin ist im System 19:00 oder 20:00 Uhr. Für "Typische Zeit" und Feiertage brauchen wir die lokale Zeit des Nutzers.

**Aktion:** Wenn das Frontend den Scan ans Backend sendet, muss es die lokale Zeit `locale_time` auslesen (z.B. per JS `new Date().getTimezoneOffset()`) und/oder wir berechnen beim Einfügen in die DB anhand von Geo-Koordinaten die `local_time`.
*Ergänzung in `bottle_scans`: Feld `local_time timestamp with time zone` hinzufügen, falls noch nicht vorhanden, andernfalls `timezone_offset` speichern.*

### 2.2 — `bottle_scans` Select um Kontext-Felder erweitern

In `classifyCisScans()` (`lib/actions/analytics-actions.ts`) holen wir nun auch die aggregierten Brew-Daten per Join.

```ts
.select(`
  id, session_hash, bottle_id, brew_id, scan_source, dwell_seconds, created_at, local_time, weather_condition, temperature,
  brews ( typical_scan_hour, typical_temperature )
`)
```

---

## Phase 3 — Scoring-Logik in der CIS Engine (`classifyCisScans`)

### 3.1 — Bibliotheken & Konstanten

`date-holidays` installieren (`npm install date-holidays`) für Feiertage.

```ts
// Phase 1: Context Modifiers
DYNAMIC_TIME_BONUS:       0.15,
DYNAMIC_TIME_PENALTY:    -0.15,
DYNAMIC_TEMP_BONUS:       0.05,
DYNAMIC_TEMP_PENALTY:    -0.05,
WEEKEND_HOLIDAY_BONUS:    0.05,
```

### 3.2 — Dynamischer Zeit-Modifikator

Wir vergleichen die `local_time` des Scans mit der `typical_scan_hour` des Brews. Damit lösen wir das Problem, dass sich Wein-Scans, Frühstücks-Stouts und Club-Biere zeitlich stark unterscheiden.

```ts
if (scan.brews?.typical_scan_hour != null && scan.local_time != null) {
  const scanHour = new Date(scan.local_time).getHours();
  const peakHour = scan.brews.typical_scan_hour;
  
  // Distanz berechnen (zyklisch für 24h, z.b. Abstand zwischen 23 Uhr und 1 Uhr)
  let hourDiff = Math.abs(scanHour - peakHour);
  if (hourDiff > 12) hourDiff = 24 - hourDiff;

  if (hourDiff <= 2) {
    score += CIS_SCORING.DYNAMIC_TIME_BONUS;    // Perfektes Zeitfenster
  } else if (hourDiff > 5) {
    score += CIS_SCORING.DYNAMIC_TIME_PENALTY;  // Völlig untypische Zeit
  }
}
```

### 3.3 — Dynamischer Temperatur-Modifikator

Statt fix "20°C ist gut" zu sagen, lernen wir. Ein Glühwein oder Eisbock hat vielleicht `typical_temperature = 4°C`. Ein Helles `22°C`.

```ts
if (scan.brews?.typical_temperature != null && scan.temperature != null) {
  const tempDiff = Math.abs(scan.temperature - scan.brews.typical_temperature);
  
  if (tempDiff <= 5) { // ±5 Grad vom historischen Schnitt
    score += CIS_SCORING.DYNAMIC_TEMP_BONUS;
  } else if (tempDiff > 12) { // Völlig falsches Wetter für dieses Getränk
    score += CIS_SCORING.DYNAMIC_TEMP_PENALTY;
  }
}
```

### 3.4 — Wochenend- & Feiertags-Modifikator (Lokalisiert)

Mit der `local_time` können wir präzise bestimmen, ob lokal Wochenende oder Feiertag ist.

```ts
import Holidays from 'date-holidays';
const hd = new Holidays('DE'); // TODO: Sobald Land aus Geo-IP bekannt ist, hier dynamisieren

const localDate = new Date(scan.local_time || scan.created_at);
const dayOfWeek = localDate.getDay(); // 0=So, 5=Fr, 6=Sa
const hour = localDate.getHours();
const isHoliday = hd.isHoliday(localDate) !== false;
const isFridayEvening = dayOfWeek === 5 && hour >= 17;
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

if (isHoliday || isFridayEvening || isWeekend) {
  score += CIS_SCORING.WEEKEND_HOLIDAY_BONUS;
}
```

---

## Phase 4 — Admin UI Transparenz

Datei: `app/admin/dashboard/views/ModelAccuracyView.tsx`

Im bestehenden "Phase-0 Scoring-Modell"-Grid die neuen Konstanten sichtbar machen:

| Label | Wert | Farbe | Beschreibung |
|---|---|---|---|
| Dynamic Time Bonus | +0.15 | green | Scan (lokale Zeit) liegt nahe typischer Getränke-Zeit (≤ 2h) |
| Dynamic Time Penalty | −0.15 | red | Scan weicht stark von typischer Getränke-Zeit ab (> 5h) |
| Dynamic Temp Bonus | +0.05 | green | Scan-Wetter entspricht typischem Getränke-Wetter (±5°C) |
| Dynamic Temp Penalty | −0.05 | red | Scan-Wetter völlig untypisch für dieses Getränk (>12°C Abw.) |
| Weekend / Holiday Bonus | +0.05 | green | Scan am Freitagabend, Wochenende oder Feiertag |

---

## Abhängigkeiten & Reihenfolge

```
Phase 1: DB Migration (`local_time`, `typical_scan_hour`, `typical_temp`)
  └─▶ Phase 2: Tracker/Frontend anpassen (lokale Zeit erfassen)
        └─▶ Phase 1.2: Nächtlicher Aggregator-Cronjob (MODE statt AVG)
              └─▶ Phase 3: `classifyCisScans` erweitern (Modifikatoren)
                        └─▶ Phase 4: ModelAccuracyView anpassen
```

## Priorisierung

| Priorität | Phase | Effort | Datei(en) |
|---|---|---|---|
| 🔴 Hoch | **1.1 & 1.2** DB-Migration & Cronjob | M | `migrations/*.sql`, neue Supabase Edge Function |
| 🔴 Hoch | **2.1** `local_time` / Timezone-Tracking | M | Frontend Tracker, `bottle_scans` Tabelle |
| 🟠 Mittel | **3.1-3.4** Scoring-Engine Modifikatoren | M | `analytics-actions.ts`, `package.json` |
| 🟡 Niedrig | **4.1** Admin UI Transparenz | S | `ModelAccuracyView.tsx` |
