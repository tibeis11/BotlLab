# Roadmap: Consumer Intent Score (CIS) & Drinker Funnel — Überarbeitung v2

**Kontext:** Nach dem vollständigen Rollout von Phase 9 (Scan Intent Classification) und Phase 2 (Verified Drinker Funnel) haben sich in der Praxis mehrere konzeptionelle und technische Lücken gezeigt. Diese Roadmap beschreibt die notwendigen Korrekturen und Erweiterungen. Ein zentrales Problem ist, dass die aktuelle **Calculation-Logic des CIS fehlerhaft ist** und die reale Nutzerintention nicht ausreichend genau abbildet, bevor wir den CIS im Frontend sinnvoll einsetzen können.

---

## Aktuelle Probleme (Aufgedeckt 08.03.2026)

| # | Problem | Schwere |
|---|---------|---------|
| P1 | Anonyme Bewertungen wurden nie als `converted_to_rating = true` markiert | 🔴 Gefixed |
| P2 | `ScanSourceBreakdownCard` ignorierte den Zeitrangefilter | 🟠 Gefixed |
| P3 | Direktaufruf `/b/shortCode` ohne QR-Token wurde als `qr_code` klassifiziert | 🟠 Gefixed |
| P4 | Page-Reload mit Token in URL erzeugte Doppel-Scan-Tracking | 🟠 Gefixed |
| P5 | `DrinkerFunnelCard` Guardrail `safeLoggedIn >= safeVerified` war inkorrekt | 🟡 Gefixed |
| P6 | `AudienceView` → `ScanIntentChart` bekommt kein `startDate`/`endDate` | 🟡 Gefixed |
| P7 | **Kritisch:** Die CIS-Klassifizierungslogik in `analytics-actions.ts` ist zu oberflächlich und betrachtet wichtige Indikatoren (Verweildauer, Sessions, Games) nicht richtig. | 🔴 Kritisch |
| P8 | `weightedDrinkerEstimate` (CIS-Output) ist berechnet, aber nirgends im Dashboard nutzbar sichtbar | 🟡 Klein |

---

## Was ist der Consumer Intent Score (CIS) eigentlich?

Der CIS ist der `drinking_probability`-Wert auf jedem `bottle_scans`-Eintrag (0.00–1.00). Er gibt an, **wie wahrscheinlich es ist, dass diese Person das Bier gerade trinkt** — nicht nur schaut.

Die Summe aller `drinking_probability`-Werte eines Zeitraums = **`weightedDrinkerEstimate`** = geschätzte Zahl echter Trinker, inklusive nicht-bestätigter Scans.

```
Verified Drinkers (hart) = converted_to_rating = true  OR  collected_caps  OR  confirmed_drinking = true
Estimated Drinkers (weich) = Σ drinking_probability aller Scans im Zeitraum
```

---

## 🔴 Phase 0 — CIS Logik komplett überarbeiten (Grundvoraussetzung)

Bevor wir den CIS in der UI anzeigen, muss die Engine, die diesen Wert berechnet, repariert werden. Aktuell raten wir nur (`classifyBrowseScans`, etc.).

### 0.1 — Hard-Rules: Nur QR-Scans können "Trinker" sein
- Wenn ein Scan **nicht über den QR Code** kam (also z.B. kein QR-Token, sondern ein geteilter Link, `scan_source != 'qr_code'`), dann ist es nahezu ausgeschlossen, dass die Person die Flasche physisch in der Hand hat.
- **Aktion:** `drinking_probability` in diesen Fällen hart auf `0.0` setzen (oder extrem niedrig).

### 0.2 — "Fridge Surfing" & Sessions verstehen (Multiple Scans)

#### Das Problem
Wer trinkt, greift typischerweise zu _einer_ Flasche und scannt diese. "Fridge Surfing" beginnt dagegen schon bei **2 Flaschen in einer Session** — jemand öffnet seinen Kühlschrank, scannt die erste Flasche, die zweite, vielleicht eine dritte. Er trinkt gerade keine davon (zumindest nicht die ersten N-1).

**5 Scans als Schwelle ist viel zu hoch.** Viele Haushalte haben nur 2–3 Sorten stehen — in diesem Fall wären alle Scans "Fridge Surfing", auch wenn die Schwelle nie erreicht wird.

#### Logik-Ansatz: Additives Scoring-Modell (Indikatoren)

Die Kernidee: Es gibt keinen einzelnen "Trinker-Beweis" (außer Hard Proofs wie Ratings), sondern ein **Scoring-Modell, bei dem sich verschiedene Indikatoren gegenseitig beeinflussen**.

Für jeden Scan startet die `drinking_probability` bei einem **Base-Score (z.B. 0.3)** und wird durch Modifikatoren (Multiplikatoren oder additive Werte) beeinflusst:

**1. Negativ-Indikatoren (ziehen Probability runter):**
- **Session-Dichte:** Hat der User in einem Zeitfenster von `< 15 Min` danach eine weitere Flasche gescannt?
  - _"Fridge Surfing Penalty" (z.B. -0.4)_
- **Kein QR-Code:** Scan kam über geteilten Link (`scan_source != 'qr_code'`)
  - _Hard Rule: Setzt Score zwingend auf 0.0_

**2. Positiv-Indikatoren (ziehen Probability hoch oder auf 1.0):**
- **Hard Proofs (100% Hit):** Rating verfassen, Cap Claimen oder **Beat The Brewer (BTB)** spielen.
  - _Setzt die Wahrscheinlichkeit sofort und zwingend auf `1.0` (Confirmed)._
- **Hohe Verweildauer (Dwell Time):** War der Nutzer `> 3 Minuten` auf der Seite aktiv?
  - _"Engagement Bonus" (z.B. +0.4)_
- **Soft Proofs / Interaktionen:** Der Nutzer hat einen VibeCheck abgesetzt.
  - _"Interaction Bonus" (z.B. +0.5)_
- **Letzter Scan der Session:** Es folgte kein weiterer Scan in den nächsten 15 Min.
  - _"Decision Bonus" (z.B. +0.2)_

#### Beispiel-Szenarien (Kombination von Faktoren)

Das Punktesystem erlaubt es, komplexe Realitäts-Muster abzubilden, da sich Faktoren neutralisieren können:

**Szenario A — Schnelles Surfen + dann Entscheidung:**
User scannt Bottle X → 3 Min später scannt er Bottle Y → bleibt dort 8 Minuten und spielt VibeCheck.
- **Bottle X:** Basis (0.3) + Session-Penalty (-0.4) = **0.0 (Kein Trinker)**
- **Bottle Y:** Basis (0.3) + Letzter Scan Bonus (+0.2) + Dwell-Time Bonus (+0.4) + VibeCheck Bonus (+0.5) = **1.0 (Sehr sicherer Trinker)**

**Szenario B — Langes Surfen (Das "Leser"-Problem):**
User scannt Bottle Z → liest sich alles sehr genau durch (Dwell-Time > 3 Min) → scannt 10 Minuten später trotzdem noch mal Flasche W, um zu vergleichen.
- **Bottle Z:** Basis (0.3) + Dwell-Time Bonus (+0.4) + Session-Penalty (-0.4) = **0.3 (Unsicher/Neutral)**
  _Hier rettet die hohe Verweildauer den Score davor, komplett auf 0 zu fallen, da ernsthaftes Interesse bestand, auch wenn weitergescannt wurde._

#### Technische Aktion
- `session_hash` bereits vorhanden in `bottle_scans` — dieses Feld nutzen.
- Die Klassifizierungs-Pipeline in `classifyScans()` braucht einen **Session-Kontext-Step**: Alle Scans einer Session laden, sortieren, dann Position und Zeitabstand zum Folgescan berechnen.
- Dieser Step muss **batched** und **nachträglich** laufen (der erste Scan einer Session kann erst klassifiziert werden, wenn die Session "abgeschlossen" ist, d.h. ≥15 Min kein neuer Scan von diesem Hash).

### 0.3 — Verweildauer (Dwell Time) als Bounce-Filter
- Ein Nutzer, der "im Laden" steht, scannt kurz und geht wieder (Bounce / geringe Time-on-Page). Ein echter Trinker bleibt auf der Seite, liest, spielt vielleicht ein Game.
- **Aktion:** Dwell-Time in die CIS-Wahrscheinlichkeit stark einfließen lassen. Extrem kurze Sessions = `drinking_probability` gegen 0.

### 0.4 — Interaktionen & Games: BTB als "Hard Proof", VibeCheck als "Soft Proof"
- **Hard Proofs (100% Trinker):** Bewertet jemand die Flasche, claimt einen Cap **oder spielt Beat The Brewer (BTB)**, wird dies als 100% Beweis gewertet. BTB erfordert ausreichend Beschäftigung mit dem Bier (Werte schätzen, Label lesen), um als klarer Konsumbeweis zu gelten. Die `drinking_probability` wird hier hart auf `1.0` gesetzt und der Intent auf `confirmed`.
- **Soft Proofs (VibeCheck):** Ein VibeCheck ist sehr leicht abzugeben (nur ein Emoji-Klick). Es ist ein starkes Indiz (man ist engagiert), aber kein hundertprozentiger Trink-Beweis.
- **Aktion:** BTB-Teilnahmen im Backend verlässlich als `confirmed` markieren. VibeChecks erfassen und die `drinking_probability` des Scans massiv anheben (Engagement Bonus + Interaction Bonus).

---

## Phase A — CIS im Drinker Funnel sichtbar machen
*(Voraussetzung: Phase 0 ist abgeschlossen)*

### A.1 — `weightedDrinkerEstimate` in OverviewView ergänzen
- In der Metric-Grid-Row eine 5. Karte ergänzen: **"Geschätzte Trinker"**
- Run-Rate-Vergleich: `weightedDrinkerEstimate` vs. `verifiedDrinkers` als Confidence-Indikator

### A.2 — DrinkerFunnelCard um CIS-Ebene erweitern
- Den Funnel auf 5 Stufen ändern: Aufrufe gesamt -> Eingeloggte Besuche -> **Geschätzte Trinker (gestrichelt)** -> Verified Drinkers -> Cap Collectors.

---

## Phase B — ScanIntentChart: Datum & Platzierung

### B.1 — `startDate`/`endDate` in AudienceView durchreichen
- `AudienceView` Props-Interface anpassen und Filter an Charts weitergeben.

### B.2 — ScanIntentChart: weighted estimate / Confirmed-Rate
- Dashboard Widget verfeinern und als Qualitätsindikator für die Modelle anzeigen.

---

## Phase C — Drinker Rate Metrik konsolidieren

### C.1 — Einheitliche Definition festlegen im UI
Eine einzige Funktion `getVerifiedDrinkerCount()` definieren:
```typescript
verifiedDrinkers = COUNT(DISTINCT scan_id) WHERE
  converted_to_rating = true
  OR confirmed_drinking = true
  OR cap_exists_for_(viewer_user_id, brew_id)
```

### C.2 — Bugfix auf Brew-Detail-Seite
- `loggedInScans = 0` Bug beheben.

---

## Phase D — Admin Dashboard: CIS-Überwachung erweitern

Da wir uns in der Beta-/Entwicklungsphase befinden, wissen die angebundenen Brauereien, dass Daten teilweise experimentell sind. Daher rollen wir die Brauerei-Ansichten (Phase A/B) _gleichzeitig_ mit dem Admin-Monitoring aus.

### Bestehende Admin-Infrastruktur (bereits vorhanden)

Nach Audit des Admin-Dashboards (`app/admin/dashboard/`) gibt es bereits zwei relevante Views:

| View | Pfad | Was es zeigt |
|---|---|---|
| **Scan-Analyse** (`scans`) | `ScanAnalyticsView.tsx` | Volume-KPIs (Gesamt-Scans, Unique Visitors, Geografie, Device-Split, Top-Brews) — aber **kein CIS/Intent-Kontext** |
| **Model Health** (`modelhealth`) | `ModelAccuracyView.tsx` | Vollwertige Confusion Matrix (TP/TN/FP/FN), Accuracy/Precision/Recall pro `scan_intent`, Calibration Curve, empirischer vs. konfigurierter Wahrscheinlichkeits-Vergleich pro Intent |

### D.1 — `ScanAnalyticsView` um CIS-Block erweitern

Datei: `app/admin/dashboard/views/ScanAnalyticsView.tsx`

Aktuell zeigt der View nur reine Volume-Daten. Wir ergänzen einen neuen Abschnitt **"Consumer Intent Score (CIS)"** unterhalb der bestehenden KPI-Kacheln:

- **`scan_source`-Verteilung:** Tortendiagramm | `qr_code` vs. `direct_link` vs. `social` vs. `share` — zeigt, wie viele Scans durch Hard-Rule 0.1 direkt auf `drinking_probability = 0.0` gesetzt werden.
- **`weightedDrinkerEstimate` (platformweit):** Eine dedizierte KPI-Karte mit `Σ drinking_probability` aller QR-Scans im gewählten Zeitraum — der CIS-Wert auf Plattformebene.
- **Unklassifizierte Scans (Backlog):** Anzahl der Scans, die noch im 15-Minuten-Wartezeitfenster liegen (d.h. `scan_intent IS NULL` AND `created_at > NOW() - 15 Min`).

Neue Backend-Funktion: `getCisOverview(dateRange)` in `lib/actions/analytics-admin-actions.ts`

### D.2 — `ModelAccuracyView` um Phase-0-Kalibrierung erweitern

Datei: `app/admin/dashboard/views/ModelAccuracyView.tsx`

Der bestehende View ist exzellent für Feedback-basierte Accuracy. Er fehlt aber für die neue Phase-0-Regeln. Wir ergänzen:

- **Scoring-Regeln Dashboard:** Visualisierung der aktuell konfigurierten Boni/Penalties aus unserem additiven Modell (`BASE_SCORE`, `FRIDGE_SURFING_PENALTY`, `DWELL_TIME_BONUS`, `INTERACTION_BONUS`). Macht die "Maschine unter der Haube" transparent.
- **False-Negative Tracker:** Scans, bei denen `drinking_probability < 0.3` war, der User aber **danach** ein Rating geschrieben oder BTB gespielt hat. Diese Fälle sind unsere wichtigsten Kalibrierungs-Datenpunkte.
- **Hard-Rule Wirksamkeit:** Wie viele Scans wurden durch Hard-Rule 0.1 (nicht `qr_code`) auf 0.0 gesetzt? Dieser Prozentsatz sollte plausibel sein (z.B. 30–50% aller Aufrufe).

### D.3 — Feedback-Loop & Confirmed-Scan Backfill (Backend)

- Wenn ein User ein Rating abgibt, BTB spielt oder einen Cap claimt: Den ursprünglichen Scan-Record rückwirkend auf `scan_intent = 'confirmed'` und `drinking_probability = 1.0` updaten.
- Dies versorgt den `ModelAccuracyView` automatisch mit mehr Kalibrierungsdaten und verbessert die "False-Negative"-Erkennung selbstständig über Zeit.
- Implementierungsort: `app/api/ratings/submit/route.ts`, `lib/actions/beat-the-brewer-actions.ts`, Cap-Claim API.

---

## Abhängigkeiten & Reihenfolge

```
Phase 0           →  Grundvoraussetzung: Neue Engine & 15-Min-Regel. Muss als Erstes stehen.
Phase A + B + D   →  Parallele Implementierung: Brauerei-Dashboard (A+B) und Admin-Monitoring (D)
                      können gleichzeitig erfolgen, da Beta-Brauereien über den experimentellen
                      Charakter der Daten informiert sind.
Phase C           →  Code-Cleanup (Einheitliche Drinker Rate / Bugfix Detail-Seite).
                      Kann jederzeit eingeschoben werden, ist vom Rest unabhängig.
```

## Priorisierung (überarbeitet)

| Priorität | Phase | Effort | Datei(en) |
|---|---|---|---|
| 🔴 Hoch | **0.1** Hard-Rule QR-Only | S | `analytics-actions.ts` |
| 🔴 Hoch | **0.2** Session Queue + Additive Scoring | L | `analytics-actions.ts` |
| 🔴 Hoch | **0.4** BTB als Hard Proof / VibeCheck Bonus | S | `beat-the-brewer-actions.ts`, Classify-Pipeline |
| 🟠 Mittel | **D.1** CIS-Block in `ScanAnalyticsView` | M | `ScanAnalyticsView.tsx`, `analytics-admin-actions.ts` |
| 🟠 Mittel | **D.2** Phase-0-Kalibrierung in `ModelAccuracyView` | M | `ModelAccuracyView.tsx`, `analytics-admin-actions.ts` |
| 🟠 Mittel | **D.3** Backfill-Logik in Rating/BTB/Cap-APIs | S | `submit/route.ts`, `beat-the-brewer-actions.ts` |
| 🟠 Mittel | **A.1 + A.2** CIS im Brauerei-Drinker-Funnel | M | `DrinkerFunnelCard.tsx`, `OverviewView.tsx` |
| 🟡 Niedrig | **B.1** Datum-Filter in AudienceView | S | `AudienceView.tsx`, `page.tsx` |
| 🟡 Niedrig | **C.1 + C.2** Code-Cleanup Drinker Rate | M | `analytics-actions.ts`, Brew-Detail |
