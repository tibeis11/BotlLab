# ROADMAP: Vollständige Maischverfahren-Engine

**Status:** In Planung  
**Priorität:** 🔴 Hoch — Kernfunktion des Rezept-Editors  
**Ziel:** BotlLab soll alle praxisrelevanten Maischverfahren (Infusion, Dekoktion, Step-Mash) vollständig abbilden — im Rezept-Editor, in der Physik-Engine **und** im interaktiven Brautag.  
**Philosophie:** Kein Half-Feature. Brauen mit Dekoktion ist eine handwerkliche Disziplin. Wer ein solches Rezept in BotlLab anlegt, muss am Brautag eine vollständige, interaktive Schritt-für-Schritt-Anleitung bekommen — mit korrekten Volumina, Zeiten und Temperaturen.

---

## Inhalt

1. [Das Problem heute](#das-problem-heute)
2. [Neues Datenmodell](#neues-datenmodell)
3. [Phase 1 — Datenmodell & Rezept-Editor](#phase-1--datenmodell--rezept-editor)
4. [Phase 2 — Physik-Engine](#phase-2--physik-engine)
5. [Phase 3 — Interaktiver Brautag (BrewDayTab)](#phase-3--interaktiver-brautag-brewdaytab)
6. [Phase 4 — Session-Ansicht & PhaseViews](#phase-4--session-ansicht--phaseviews)
7. [Phase 5 — Import & Export](#phase-5--import--export)
8. [Phase 6 — PDF-Export](#phase-6--pdf-export)
9. [Phase 7 — Inferenz & Validierung](#phase-7--inferenz--validierung)
10. [Phase 8 — Öffentliche Rezeptseite (brew/page)](#phase-8--öffentliche-rezeptseite-brewpage)
11. [Phase 9 — Wassermanagement-Kohärenz](#phase-9--wassermanagement-kohärenz)
12. [Betroffene Dateien (Impact-Matrix)](#betroffene-dateien-impact-matrix)
13. [Implementierungs-Reihenfolge](#implementierungs-reihenfolge)
14. [Erfolgskriterien / Done-Definition](#erfolgskriterien--done-definition)
15. [Offene Fragen / Future Work](#offene-fragen--future-work)

---

## Das Problem heute

Das aktuelle Datenmodell für `mash_steps` ist ausschließlich auf Infusion ausgelegt:

```ts
interface MashStep {
  name: string;
  temperature: string;  // Rast-Zieltemperatur
  duration: string;     // Rastzeit
}
```

### Was fehlt

| Benötigtes Feld | Infusion | Step-Mash | Dekoktion |
|---|---|---|---|
| Rast-Temperatur | ✅ | ✅ | ✅ (Zieltemp nach Rückschüttung) |
| Rastzeit | ✅ | ✅ | ✅ |
| Schritttyp (`rest` / `decoction` / `mashout`) | ❌ | ❌ | ❌ |
| Gezogenes Teilmaische-Volumen (L) | – | – | ❌ |
| Form der Teilmaische (Dick / Dünn / Kochwasser) | – | – | ❌ |
| Rast-Temperatur der Teilmaische vor dem Kochen | – | – | ❌ |
| Rastzeit der Teilmaische | – | – | ❌ |
| Kochzeit der Teilmaische (min) | – | – | ❌ |
| Einmaisch-Zubrühwasser gesamt (L) | – | – | ❌ |
| Einmaischtemperatur | ❌ | ❌ | ❌ |

### Betroffene Systeme (vollständig)

- **Physik-Engine** (`calculateWaterProfile`) — kennt keine Dekoktions-Verdampfung
- **BrewDayTab** — rendert für Dekoktions-Schritte denselben simplen Timer wie für Infusion
- **PhaseViews** — zeigt `72°C für 30 min` auch für Dekoktions-Schritte, ohne Volumen/Form/Kochzeit
- **BotlGuide-Kontext** (`BrewEditor.tsx` L1146) — serialisiert Maischplan nur als `Name: Temp°C (Dauer min)`, Dekoktions-Informationen gehen für den AI-Coach verloren
- **Import-Script** — bildet `Dekoktionen`-Arrays auf einfache Rasten ab, verliert alle Kerndaten
- **PDF-Export** (`pdf-session-export.ts`) — enthält **gar keinen** Maischplan im Session-Report
- **Recommendation-Engine** (`recommendation-engine.ts`) — nutzt nur `mash_steps.length`, kein Verfahrenstyp
- **Discover-Migration** (`discover_page_schema.sql`) — Trigger `sync_mash_steps_count` und `mash_process` Inferenz kennen kein `step_type`-Feld
- **Brew-Type-Lookup** (`brew-type-lookup.ts`) — `inferMashProcess()` erkennt Dekoktion nur durch Namens-Heuristik, nicht durch Datenstruktur
- **Zod-Validierung** (`brew-schemas.ts`) — `data` ist `z.record(z.string(), z.any())`, es gibt kein Schema für `mash_steps` — jede Fehlstruktur wird still akzeptiert

---

## Neues Datenmodell

### Erweiterter `MashStep`-Typ (`MashStepsEditor.tsx`)

```ts
export type MashStepType = 'rest' | 'decoction' | 'mashout' | 'strike';

export interface MashStep {
  // Pflichtfelder (alle Verfahren)
  name: string;
  temperature: string;        // Zieltemperatur der Hauptmaische nach diesem Schritt
  duration: string;           // Rastzeit der Hauptmaische in Min

  // Optionale Metadaten (alle Verfahren)
  step_type?: MashStepType;   // expliziter Typ; wenn leer: 'rest'
  resulting_temp?: string;    // alias für temperature (Import-Kompatibilität)

  // Nur für Dekoktion relevant
  volume_liters?: string;           // gezogenes Teilmaische-Volumen (L)
  decoction_form?: 'thick' | 'thin' | 'liquid';  // Dickmaische / Dünnmaische / Kochwasser
  decoction_rest_temp?: string;     // Temperatur der Teilmaische vor dem Kochen (°C)
  decoction_rest_time?: string;     // Rastzeit der Teilmaische vor dem Kochen (min)
  decoction_boil_time?: string;     // Kochzeit der Teilmaische (min)
}
```

### Neue Top-Level-Felder in `brew.data`

```ts
mash_strike_temp?: string;          // Einmaischtemperatur (°C)
mash_infusion_total?: string;       // Gesamtes Zubrühwasser bei Dekoktion (L)
                                    // (entspricht Einmaisch_Zubruehwasser_gesamt aus MMuM)
```

> **Rückwärtskompatibilität:** Alle neuen Felder sind optional. Jedes bestehende Rezept ohne diese Felder funktioniert unverändert. Die Typing bleibt „weich" — der Zod-Validator wird parallel erweitert (siehe Phase 7), aber alte Daten passieren auch ohne die neuen Felder.

---

## Phase 1 — Datenmodell & Rezept-Editor

### 1.1 TypeScript-Interfaces erweitern
**Datei:** `app/team/[breweryId]/brews/components/MashStepsEditor.tsx`

- `MashStep`-Interface um alle neuen Felder erweitern (siehe oben)
- Export des `MashStep`-Typs, damit andere Dateien (PhaseViews, BrewDayTab, PDF-Export) ihn importieren können
- `MashStepsEditorProps` um `mashProcess?: string` erweitern, damit der Editor weiß, welches Verfahren gerade aktiv ist

### 1.2 Desktop-View: Adaptives Grid

Das Desktop-Grid passt sich dem aktiven `mashProcess` an:

- **Infusion / Step-Mash:** `[1fr_80px_80px_30px]` — unverändert (Name | Temp | Dauer | ✕)
- **Dekoktion:** Tabellenspalten sind zu viele für ein Grid. Statt 7 Spalten zu quetschen, nutzen wir ein **expandierbares Row-Design:**
  - **Collapsed Row** (Standard): `[Typ-Badge | Name | Zieltemp | Rastzeit | ✕]`
  - **Expanded Row** (Klick auf Zeile oder Chevron): Unter der Zeile klappt ein Detail-Panel auf mit:
    ```
    ┌──────────────────────────────────────────────────┐
    │  Form: [Dickmaische ▼]  Volumen: [6.0] L        │
    │  Teilmaische-Rast: [72]°C für [10] min           │
    │  Kochzeit: [15] min                              │
    │  ℹ️ Empfohlenes Volumen: ~6.8 L (berechnet)      │
    └──────────────────────────────────────────────────┘
    ```
  - Der Badge vor dem Namen zeigt den Typ: `🔥 Dekoktion` / `⏸ Rast` / `🏁 Abmaischen`

### 1.3 Mobile-Modal: Konditioneller Dekoktion-Bereich

Im bestehenden Edit-Modal einen zweiten Abschnitt ergänzen:

```
─── Schritt ────────────────────────────
  Typ: [ Rast ▼ ] [ Dekoktion ▼ ] [ Abmaischen ▼ ]
  Temperatur (Ziel Hauptmaische): [___]
  Rastzeit Hauptmaische:          [___]

─── Teilmaische (nur wenn Typ=Dekoktion) ─
  Form: [ Dickmaische ▼ ] [ Dünnmaische ▼ ] [ Kochwasser ▼ ]
  Volumen (L):             [___]  ℹ️ Empfohlen: ~6.8 L
  Rast vor Kochen (°C):    [___]
  Rast vor Kochen (min):   [___]
  Kochzeit (min):          [___]
```

Der Dekoktion-Bereich ist nur sichtbar wenn `step_type === 'decoction'`.
Die Volumen-Empfehlung wird live über `calculateDecoctionVolume()` berechnet (siehe Phase 2.3).

### 1.4 BrewEditor: Props und neue Felder

**Datei:** `app/team/[breweryId]/brews/components/BrewEditor.tsx`

- `<MashStepsEditor mashProcess={brew.data?.mash_process} .../>` — neues Prop durchreichen
- Neue Input-Felder unterhalb des Maischplan-Editors wenn `mash_process === 'decoction'`:
  - **Einmaischtemperatur** (`mash_strike_temp`)
  - **Gesamtes Zubrühwasser** (`mash_infusion_total`) mit Hinweis-Label „Gesamtes Wasser vor Dekoktionen"
- Default-State um beide neuen Felder ergänzen

### 1.5 BotlGuide-Kontext anpassen

**Datei:** `app/team/[breweryId]/brews/components/BrewEditor.tsx` (ca. L1146)

Aktuell serialisiert der BotlGuide-Kontext den Maischplan als:
```ts
recipeData.mashSchedule = d.mash_steps.map((s: any) => `${s.name}: ${s.temperature}°C (${s.duration}min)`).join(' -> ');
```

Das muss erweitert werden:
```ts
recipeData.mashSchedule = d.mash_steps.map((s: any) => {
  let desc = `${s.name}: ${s.temperature}°C (${s.duration}min)`;
  if (s.step_type === 'decoction') {
    const formLabel = { thick: 'Dickmaische', thin: 'Dünnmaische', liquid: 'Kochwasser' }[s.decoction_form] || '';
    desc += ` [Dekoktion: ${s.volume_liters}L ${formLabel}, Kochzeit ${s.decoction_boil_time}min]`;
  }
  return desc;
}).join(' -> ');
```

Damit hat der AI-Coach vollständigen Kontext über das Maischverfahren.

---

## Phase 2 — Physik-Engine

### 2.1 Dekoktions-Verdampfung (`calculateWaterProfile`)

**Datei:** `lib/brewing-calculations.ts`

Aktuell geht die Engine davon aus, dass Wasser nur beim Hopfenkochen verdampft. Bei Dekoktion kocht ein Teil der Maische schon währenddessen.

Neue optionale Parameter für `calculateWaterProfile`:

```ts
interface WaterProfileParams {
  // ... bestehende Felder ...
  decoction_steps?: {
    volume_liters: number;
    boil_time_minutes: number;
    form: 'thick' | 'thin' | 'liquid';
  }[];
}
```

Berechnung mit formabhängiger Verdampfung:
```
// Dünnmaische verdampft schneller als Dickmaische (mehr freies Wasser)
FORM_FACTOR = { thick: 0.6, thin: 1.0, liquid: 1.0 }

decoction_evaporation = SUM(
  BOIL_OFF_RATE_MASH * (step.boil_time / 60) * FORM_FACTOR[step.form]
)
// BOIL_OFF_RATE_MASH = 2.0 L/h (Standard; geringer als Würzekochen weil kleinerer Topf)
```

Dieser Wert wird zum benötigten Hauptguss addiert, damit das Zielvolumen nach Maische + Würzekochen trotzdem stimmt.

### 2.2 Dekoktions-Farbvertiefung (Maillard bei Teilmaische)

Bei Dekoktion entsteht durch Kochen der Teilmaische zusätzliche Farbe (Maillard-Reaktion). Einfaches Modell:

```
extra_ebc = SUM(step.volume / mash_total_volume * step.boil_time * 0.1)
```

Dieser Wert wird zu `calculateColor()` additiv hinzugerechnet. Der Koeffizient `0.1` ist ein Näherungswert — er kann in einem späteren Update durch gesammelte Session-Daten kalibriert werden.

### 2.3 Dekoktions-Volumenrechner (NEU — Lücke 1)

**Problem:** Wenn ein Brauer in BotlLab ein eigenes Dekoktions-Rezept erstellt (statt eins zu importieren), weiß er nicht automatisch, wie viel Liter Teilmaische er ziehen muss, um eine bestimmte Temperaturerhöhung zu erzielen.

**Lösung:** Neue Funktion in `lib/brewing-calculations.ts`:

```ts
/**
 * Berechnet das benötigte Teilmaische-Volumen für eine Dekoktion.
 * Basiert auf der Wärmebilanz-Gleichung:
 *   V_pull = V_total * (T_target - T_current) / (T_boil - T_current)
 *
 * @param totalVolume   Gesamtes Maischevolumen (L)
 * @param currentTemp   Aktuelle Temp der Hauptmaische (°C)
 * @param targetTemp    Gewünschte Zieltemp nach Rückschüttung (°C)
 * @param boilTemp      Kochtemperatur der Teilmaische (Standard: 100°C)
 * @param form          Maischeform (dick/dünn) — beeinflusst spez. Wärmekapazität
 * @returns             Empfohlenes Zugvolumen in Litern
 */
export function calculateDecoctionVolume(
  totalVolume: number,
  currentTemp: number,
  targetTemp: number,
  boilTemp: number = 100,
  form: 'thick' | 'thin' | 'liquid' = 'thick'
): number {
  // Korrekturfaktor: Dickmaische hat niedrigere spez. Wärmekapazität als reine Flüssigkeit
  // → man braucht mehr Volumen für denselben Temperaturhub
  const CAPACITY_FACTOR = { thick: 1.15, thin: 1.0, liquid: 0.95 };
  const corrected = (targetTemp - currentTemp) * CAPACITY_FACTOR[form];
  const volume = totalVolume * corrected / (boilTemp - currentTemp);
  return Math.round(volume * 10) / 10;  // auf 0.1 L runden
}
```

**Integration in den Editor:**
- Im `MashStepsEditor` wird für jeden Dekoktion-Schritt automatisch ein Empfehlungs-Label angezeigt: `ℹ️ Empfohlen: ~6.8 L`
- Berechnung erfolgt aus: `totalVolume` = `mash_infusion_total`, `currentTemp` = Temperatur des vorherigen Schritts, `targetTemp` = Temperatur dieses Schritts
- Der Nutzer kann den Wert überschreiben — die Empfehlung ist immer nur ein Vorschlag

---

## Phase 3 — Interaktiver Brautag (`BrewDayTab`)

Das ist der aufwändigste Teil — und der wichtigste, da der Brauer am Brautag Echtzeit-Guidance braucht.

### 3.1 Event-Modell für Dekoktions-Schritte

**Datei:** `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/BrewDayTab.tsx`

Aktuell wird aus jedem `mash_step` ein einzelner Timer-Event erzeugt (L169-182). Bei Dekoktion muss ein einzelner `MashStep` zu einer **Sequenz von Sub-Events** expandiert werden:

```
MashStep (step_type='decoction', volume=6L, decoction_rest_temp=72°C, 
          decoction_rest_time=10min, decoction_boil_time=15min,
          temperature=72°C, duration=30min)

↓ expandiert zu:

Sub-Event 1: "6L Dickmaische ziehen"        [Info-Karte, kein Timer]
Sub-Event 2: "Teilmaische auf 72°C aufheizen" [Stoppuhr ohne Zeitlimit, Temp-Ziel]
Sub-Event 3: "Teilmaische 15 min kochen"    [Timer: 15 min]
Sub-Event 4: "Zurückschütten → Ziel: 72°C" [Info-Karte mit Zieltemp + Eingabefeld]
Sub-Event 5: "Rast bei 72°C"                [Timer: 30 min]

*(Hinweis: Für den Sonderfall `decoction_form === 'liquid'` heißt das Pull-Event nicht "ziehen", sondern "Frischwasser aufkochen".)*

### 3.2 Das Parallel-Timer-Problem & Deadlocks (NEU — Lücke 2)

**Problem 1 (Parallel Racing):** Bei der Dekoktion passieren Dinge gleichzeitig. Während die Teilmaische gekocht wird (~25 min), rastet die Hauptmaische weiter. Die aktuelle Timeline ist rein sequentiell — wenn wir Sub-Events einfach stapeln, wird die *Gesamt-Maischzeit* fälschlicherweise addiert statt überlappend dargestellt.

**Problem 2 (Deadlocks):** Was passiert, wenn die eigentliche Hauptmaische-Rast im Rezept 30 Minuten hat, der Brauer für die Dekoktion (Ziehen, Heizen, Kochen, Verzweifeln) aber 45 Minuten braucht? Das System würde die Hauptmaische ins nächste Event schieben wollen, obwohl die Teilmaische noch kocht.

**Lösung — Dual-Track-Timeline mit Event-Locking:**

Statt einer linearen Event-Liste bekommt der Brautag ein **Zwei-Spur-Modell** für Dekoktions-Blöcke:

```
┌──────────────────────────────────────────────────────────────────┐
│  HAUPTMAISCHE                   │  TEILMAISCHE                  │
│  ════════════════════════════    │  ════════════════════════════  │
│  Rast bei 63°C                  │                                │
│  ████████████░░░░░░  18:22      │  🪣 6L Dickmaische ziehen      │
│                                 │  🔥 Aufheizen auf 72°C  05:00  │
│                                 │  🔥 Kochen        ██░░  12:34  │
│                                 │  ↩️ Zurückschütten              │
│  ──────────────────────────────────────────────────────────────  │
│  Rast bei 72°C (🔒 Wartet auf Rückschütten!)                     │
│  ████████░░░░░░░░░░  24:10                                       │
└──────────────────────────────────────────────────────────────────┘
```

**Technische Umsetzung:**
- Neue Prop `parallel?: boolean` auf BrewEvents
- **Event-Locking:** Der Hauptmaische-Timer zählt runter bis 00:00, wechselt aber **nicht** automatisch in den nächsten Schritt (z.B. Abmaischen oder nächste Rast), solange das Event `decoction_return` nicht auf `done` gesetzt wurde. Die Hauptmaische "friert" bei 00:00 (oder zeigt fortlaufende Extrazeit)
- **State Recovery:** Die UI muss so gebaut sein, dass ein App-Hard-Reload (Session-Status wird neu aus DB gelesen) beide Parallel-Spuren im exakten State wieder aufbaut
- Auf Mobile: Tab-Toggle `[Hauptmaische | Teilmaische]` oben. Beide Timer laufen weiter, egal welcher Track sichtbar ist

### 3.3 Neue Event-Typen im Timeline-System

Zur bestehenden `type: 'mash' | 'hop' | 'sparge' | ...` Enumeration neue Typen ergänzen:

```ts
type BrewEventType =
  | 'mash'               // bestehend: einfache Infusions-Rast
  | 'decoction_pull'     // NEU: Teilmaische ziehen (Info, kein Timer)
  | 'decoction_heat'     // NEU: Teilmaische aufheizen (Timer mit Temp-Ziel)
  | 'decoction_boil'     // NEU: Teilmaische kochen (Timer)
  | 'decoction_return'   // NEU: Zurückschütten (Info + Temperatur-Eingabe)
  | 'hop'
  | 'sparge'
  | ...
```

### 3.4 UI für Dekoktions-Events

Für die neuen Event-Typen eigene Karten-Designs:

**`decoction_pull`-Karte ("Teilmaische ziehen")**
```
┌─────────────────────────────────────────────────────────┐
│  🪣  6,0 L Dickmaische ziehen                            │
│  Aus der Gesamtmaische die dickeren Anteile schöpfen.   │
│  In separaten Topf umfüllen.                            │
│                                        [Erledigt ✓]     │
└─────────────────────────────────────────────────────────┘
```

**`decoction_boil`-Karte mit Timer**
```
┌─────────────────────────────────────────────────────────┐
│  🔥 Teilmaische kochen  ████████░░  12:34               │
│  Rast bei 72°C → 10 min → dann aufkochen → 15 min kochen│
└─────────────────────────────────────────────────────────┘
```

**`decoction_return`-Karte (mit Temperatur-Logging)**
```
┌─────────────────────────────────────────────────────────┐
│  🌡️  Zurückschütten → Ziel: 72°C                        │
│  Langsam unter Rühren zurückschütten. Temperatur messen. │
│  Erreichter Wert: [___] °C   [Bestätigen]               │
│                                                         │
│  ⚠️ Abweichung > 2°C? Du kannst vorsichtig nachheizen.   │
└─────────────────────────────────────────────────────────┘
```

Das `[Bestätigen]`-Feld erlaubt es dem Brauer, die tatsächlich erreichte Temperatur einzutragen — sie wird in der Session unter `measurements.decoction_temps[]` geloggt (für zukünftige Brautag-Analyse und BotlGuide-Coaching).

---

## Phase 4 — Session-Ansicht & PhaseViews (NEU — Lücke 3)

### 4.1 Maischplan-Rendering in `PhaseViews.tsx`

**Datei:** `app/team/[breweryId]/sessions/[sessionId]/_components/PhaseViews.tsx`

Aktuell rendert die Session-Ansicht (L825ff) den Maischplan als einfache Liste:
```
72°C für 30 min
```

Das muss erweitert werden, damit der Betrachter einer abgeschlossenen Session die vollständige Dekoktions-Info sieht:

**Für `step_type === 'rest'` (unverändert):**
```
⏸ Maltoserast — 63°C für 45 min
```

**Für `step_type === 'decoction'`:**
```
🔥 Dekoktion 3 — Ziel: 72°C, Rast 30 min
   └─ 6 L Dickmaische · Rast 72°C / 10 min · Kochen 10 min
```

**Für `step_type === 'mashout'`:**
```
🏁 Abmaischen — 77°C
```

### 4.2 BrewTimer-Integration für Dekoktionen

Die `timerMashSteps`-Berechnung (L767) muss Dekoktions-Schritte in Sub-Timer aufteilen, analog zur `BrewDayTab`-Logik. Der bestehende `BrewTimer`-Modus `MASH` muss Dekoktionsschritte als **gruppierte Sub-Steps** anzeigen.

---

## Phase 5 — Import & Export

### 5.1 SQL-Script aktualisieren (`recipes/import_maischemalz.sql`)

Das bestehende Script erkennt aktuell nur `Rasten[]`. Es muss um die `Dekoktionen[]`-Struktur erweitert werden:

**Infusions-Rezepte (haben `Rasten` + `Hauptguss`):**
```sql
-- Bestehende Logik bleibt: Rasten → mash_steps mit step_type='rest'
-- NEU: Einmaischtemperatur → mash_strike_temp
-- NEU: Hauptguss → mash_water_liters (unverändert, schon implementiert)
```

**Dekoktions-Rezepte (haben `Dekoktionen` statt `Rasten`, kein `Hauptguss`):**
```sql
-- NEU: Dekoktionen[] → mash_steps[] mit step_type='decoction'
-- Mapping:
--   Volumen → volume_liters
--   Form ("Dickmaische"→'thick', "Dünnmaische"→'thin', "Kochendes Wasser"→'liquid')
--   Temperatur_resultierend → temperature
--   Rastzeit → duration
--   Teilmaische_Temperatur → decoction_rest_temp
--   Teilmaische_Rastzeit → decoction_rest_time
--   Teilmaische_Kochzeit → decoction_boil_time
--   Temperatur_ist (erster Schritt) → Fallback für initialen Temp-Kontext
-- NEU: Einmaisch_Zubruehwasser_gesamt → mash_infusion_total
-- NEU: Einmaischtemperatur → mash_strike_temp
-- NEU: Abmaischtemperatur → letzter Schritt mit step_type='mashout'
```

**Erkennung:** Das Script prüft ob `Dekoktionen` existiert und nicht leer ist:
```sql
CASE 
  WHEN jsonb_array_length(COALESCE(data->'Dekoktionen', '[]'::jsonb)) > 0 
    THEN -- Dekoktions-Pfad
  ELSE 
    -- Infusions-Pfad (bestehende Logik)
END
```

### 5.2 Böhmisches Pilsner — Referenz-Mapping

Erwartetes Ergebnis nach Import des Böhmisches-Pilsner-JSONs:

```json
{
  "mash_strike_temp": "57",
  "mash_infusion_total": "17.5",
  "mash_steps": [
    {
      "name": "Dekoktion 1 (Einmaischen)",
      "step_type": "decoction",
      "temperature": "50",
      "duration": "10",
      "volume_liters": "11",
      "decoction_form": "thick",
      "decoction_boil_time": "0"
    },
    {
      "name": "Dekoktion 2 (Kochwasser)",
      "step_type": "decoction",
      "temperature": "64",
      "duration": "30",
      "volume_liters": "6.5",
      "decoction_form": "liquid",
      "decoction_boil_time": "0"
    },
    {
      "name": "Dekoktion 3 (Dickmaische)",
      "step_type": "decoction",
      "temperature": "72",
      "duration": "30",
      "volume_liters": "6",
      "decoction_form": "thick",
      "decoction_rest_temp": "72",
      "decoction_rest_time": "10",
      "decoction_boil_time": "10"
    },
    {
      "name": "Dekoktion 4 (Dünnmaische)",
      "step_type": "decoction",
      "temperature": "77",
      "duration": "10",
      "volume_liters": "6",
      "decoction_form": "thin",
      "decoction_boil_time": "10"
    },
    {
      "name": "Abmaischen",
      "step_type": "mashout",
      "temperature": "77",
      "duration": "5"
    }
  ]
}
```

### 5.3 Maibock — Referenz-Mapping (Infusion, Kontrollgruppe)

Erwartetes Ergebnis nach Import des Maibock-JSONs (bestätigt Rückwärtskompatibilität):

```json
{
  "mash_strike_temp": "60",
  "mash_steps": [
    { "name": "Rast 1", "step_type": "rest", "temperature": "57", "duration": "10" },
    { "name": "Rast 2", "step_type": "rest", "temperature": "63", "duration": "45" },
    { "name": "Rast 3", "step_type": "rest", "temperature": "73", "duration": "20" },
    { "name": "Abmaischen", "step_type": "mashout", "temperature": "78", "duration": "5" }
  ]
}
```

---

## Phase 6 — PDF-Export (NEU — Lücke 4)

### 6.1 Session-Report um Maischplan erweitern

**Datei:** `lib/pdf-session-export.ts`

Aktuell fehlt der Maischplan komplett im PDF-Export eines Session-Reports.

**Erweiterung des `SessionReportData`-Interface:**
```ts
recipe: {
  malts: any[];
  hops: any[];
  yeast: string;
  mash_steps: MashStep[];       // NEU
  mash_method?: string;         // NEU
  mash_strike_temp?: string;    // NEU
};
```

**Neuer Abschnitt im PDF** (nach „REZEPTUR", vor „MESSWERTE"):
```
── MAISCHPLAN ──────────────────────────────
Verfahren: Dekoktion
Einmaischtemperatur: 57°C

  1. Dekoktion 1 — 50°C (10 min)
     └ 11 L Dickmaische, Kochzeit 0 min

  2. Dekoktion 2 — 64°C (30 min)
     └ 6.5 L Kochwasser

  3. Dekoktion 3 — 72°C (30 min)
     └ 6 L Dickmaische, Rast 72°C / 10 min, Kochzeit 10 min

  4. Abmaischen — 77°C
```

### 6.2 Daten durchreichen

**Datei:** `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/CompletedTab.tsx`

Der Aufruf zur PDF-Generierung muss um die `mash_steps` aus `brew.data` ergänzt werden, damit die Daten im Report ankommen.

---

## Phase 7 — Inferenz & Validierung (NEU — Lücke 5)

### 7.1 `inferMashProcess()` verbessern

**Datei:** `lib/brew-type-lookup.ts`

Aktuell erkennt `inferMashProcess()` Dekoktion nur über Namens-Heuristik (`allNames` enthält "dekokti"/"decoct"). Mit dem neuen `step_type`-Feld wird die Erkennung verlässlich:

```ts
export function inferMashProcess(mashSteps: MashStep[]): MashProcess | null {
  if (!Array.isArray(mashSteps) || mashSteps.length === 0) return null;

  // Explizite Erkennung über step_type (neues Datenmodell)
  const hasDecoction = mashSteps.some(s => s.step_type === 'decoction');
  if (hasDecoction) return 'decoction';

  // Fallback: Namens-Heuristik (Rückwärtskompatibilität für alte Daten)
  const allNames = mashSteps.map(s => (s?.name || '')).join(' ');
  if (/dekokti|decoct/i.test(allNames)) return 'decoction';

  if (mashSteps.length === 1) return 'infusion';
  return 'step_mash';
}
```

### 7.2 Discover-Migration-Trigger anpassen

**Datei:** `supabase/migrations/20260220120000_discover_page_schema.sql`

Der Trigger `sync_mash_steps_count` und die `mash_process`-Inferenz in der Migration nutzen aktuell nur `jsonb_array_length(data->'mash_steps')`. Sie sollten zusätzlich prüfen, ob `step_type = 'decoction'` existiert:

```sql
-- Aktuell:
WHEN jsonb_array_length(data->'mash_steps') >= 2 THEN 'step_mash'

-- Neu:
WHEN EXISTS (
  SELECT 1 FROM jsonb_array_elements(data->'mash_steps') AS s 
  WHERE s->>'step_type' = 'decoction'
) THEN 'decoction'
WHEN jsonb_array_length(data->'mash_steps') >= 2 THEN 'step_mash'
```

> Ob das als neue Migration oder als Inplace-Update passiert, entscheiden wir in der Implementierung.

### 7.3 Zod-Validierung für `mash_steps`

**Datei:** `lib/validations/brew-schemas.ts`

Aktuell ist `data` ein untypiertes `z.record(z.string(), z.any())`. Wir ersetzen das NICHT komplett (zu riskant für bestehende Daten), aber fügen eine **runtime-soft-validation** hinzu:

```ts
const mashStepSchema = z.object({
  name: z.string(),
  temperature: z.string(),
  duration: z.string(),
  step_type: z.enum(['rest', 'decoction', 'mashout', 'strike']).optional(),
  volume_liters: z.string().optional(),
  decoction_form: z.enum(['thick', 'thin', 'liquid']).optional(),
  decoction_rest_temp: z.string().optional(),
  decoction_rest_time: z.string().optional(),
  decoction_boil_time: z.string().optional(),
}).passthrough();  // passthrough: unbekannte Felder ignorieren statt ablehnen

// Utility-Funktion, kein harter Validator — kann für Warnings genutzt werden
export function validateMashSteps(steps: unknown[]): z.SafeParseReturnType<...> {
  return z.array(mashStepSchema).safeParse(steps);
}
```

### 7.4 Supabase-Event-Typen Check (Architektur-Risiko)

Bevor Phase 3 live geht, **muss** überprüft werden, wie `BrewDayTab` Events an die Supabase loggt. Falls es in der Supabase eine Tabelle für Timeline-Events gibt, die auf einen Postgres-`ENUM` oder Type-Constraints vertraut, müssen die neuen Event-Typen (`decoction_pull`, `decoction_heat`, `decoction_boil`, `decoction_return`) per Migration hinzugefügt werden, sonst löst der erste Insert-Versuch einen 500er Serverfehler aus.

Diese Funktion wird **nicht** als Gate beim Speichern eingebaut, sondern nur für:
- Warnanzeigen im Editor ("Dekoktions-Schritt ohne Volumen — bitte ergänzen")
- Import-Validierung (SQL-Script → prüft ob Output korrekt ist)

---

## Phase 8 — Rezeptseite (`/brew/[id]`) (NEU — Lücke 6)

### 8.1 `MashScheduleView` für Dekoktion erweitern

**Datei:** `app/brew/[id]/components/BrewRecipeTab.tsx`

Die Rezeptdetailseite (`/brew/:id`) hat bereits eine `MashScheduleView`-Komponente (L158-217) mit Timeline-Darstellung. Sie rendert aktuell jeden Schritt nur als `name · temperature°C · duration min` — ohne Verfahrens-Label, ohne `step_type`, ohne Dekoktions-Felder.

**Was zu ändern ist:**
1. **Verfahrens-Label** über der Step-Liste: `Infusion / Stufenmaische / Dekoktion` — aus `mash_process` oder per `inferMashProcess(steps)`
2. **Schritttyp-Icon auf dem Timeline-Punkt**: Aktuell einheitlich `bg-zinc-800`. Dekoktions-Schritte → `bg-amber-500`, Mashout → `bg-red-600`
3. **Dekoktions-Details** rechts neben Temp/Dauer — als Pill-Badge:
```tsx
{step.step_type === 'decoction' && step.volume_liters && (
  <span className="font-mono text-amber-500/80 bg-amber-950/30 text-xs px-2 py-0.5 rounded">
    {scaleAmount(step.volume_liters, factor)} L
    {step.decoction_form === 'thick' ? ' Dick' 
     : step.decoction_form === 'thin' ? ' Dünn' 
     : step.decoction_form === 'liquid' ? ' HW' : ''}
  </span>
)}
{step.step_type === 'decoction' && step.decoction_boil_time && step.decoction_boil_time !== '0' && (
  <span className="font-mono text-orange-600/70 text-xs px-2 py-0.5 rounded bg-zinc-900/40">
    {step.decoction_boil_time} min Kochen
  </span>
)}
```
4. **Skalierung:** `volume_liters` muss durch `scaleAmount()` laufen, damit die Batch-Scale-Funktion der Rezeptseite auch die Dekoktions-Volumina korrekt skaliert

### 8.3 Skalierung im BrewEditor (NEU)

**Datei:** `app/team/[breweryId]/brews/components/BrewEditor.tsx`

Wenn der Brauer im Rezept-Editor die Ausschlagwürze verändert, skaliert der `BrewEditor` per `scaleRecipe()` die Malz- und Hopfengaben linear mit.
**Kritisch:** `scaleRecipe()` muss zwingend auch auf die `mash_steps` angewendet werden!
- Für jeden Schritt, der `volume_liters` hat, muss das Volumen mit dem Rezept-Faktor multipliziert werden.
- Sonst hat der Brauer bei doppelter Batch-Size plötzlich die halbe Dekoktionsmenge und verfehlt alle Ziel-Temperaturen.

---

## Phase 9 — Wassermanagement-Kohärenz (NEU — Lücke 7)

### 9.1 Das Kohärenzproblem

Das aktuelle Wassermanagement im Rezept-Editor arbeitet so:

```
┌─────────────────────────────────────────────────────────────────┐
│  Nutzer gibt EIN: batch_size_liters (Ziel-Ausschlagwürze)      │
│                                                                 │
│  → calculateWaterProfile() berechnet:                           │
│     mashWater (Hauptguss)     = totalGrain × mashThickness      │
│     spargeWater (Nachguss)    = preBoilVol - mashWater + absorp │
│     preBoilVolume             = batch + boilOff + trub + shrink │
│                                                                 │
│  → Ergebnis: mash_water_liters + sparge_water_liters            │
│                                                                 │
│  → UMGEKEHRT: Wenn Nutzer HG+NG manuell eingibt:               │
│     batch_size wird rückwärts berechnet via                     │
│     calculateBatchSizeFromWater()                               │
└─────────────────────────────────────────────────────────────────┘
```

Bei **Dekoktion** entsteht ein neues Problem: Es gibt jetzt **drei** Wasserquellen statt zwei:

| Feld | Infusion | Dekoktion |
|---|---|---|
| `mash_water_liters` (Hauptguss) | Gesamt-Maischwasser | ❓ Unklar |
| `sparge_water_liters` (Nachguss) | Nachguss | ✅ Unverändert |
| `mash_infusion_total` (NEU) | – | Zubrühwasser-Gesamtmenge |

**Die zentrale Frage:** Ist `mash_water_liters` bei Dekoktion dasselbe wie `mash_infusion_total`?

### 9.2 Analyse: Wie verhält sich das Wasser bei Dekoktion?

Bei der Dekoktion gibt es **kein separates Zubrühwasser**, das von außen hinzukommt. Der Brauer schüttet einmalig das komplette Maischwasser ein (= `mash_infusion_total` = `Hauptguss`). Die Dekoktionen ziehen dann aus dieser vorhandenen Maische Teilmengen heraus, kochen sie, und schütten sie zurück. Es kommt kein zusätzliches Wasser hinzu (außer beim Typ `Kochwasser`, wo kochendes Wasser statt gezogener Maische zugegeben wird).

**Ergebnis:** Bei Dekoktion gilt:
```
mash_water_liters ≈ mash_infusion_total
```

BEI DER AUSNAHME `decoction_form === 'liquid'` (Kochwasser-Zugabe):
Das Kochwasser wird zusätzlich zum Hauptguss erhitzt und eingeschüttet. Es ist technisch gesehen eine zweite Wasserquelle, die **zur Gesamtmaische hinzukommt**.

### 9.3 Lösung: Wasserberechnung für Dekoktion

**Datei:** `lib/brewing-calculations.ts` + `BrewEditor.tsx`

**Regel 1: Hauptguss vs. Dekoktions-Verluste (Korrektur)**
```
Hauptguss_dekoktion = Getreide × Maischedicke + Kochwasser-Zugaben

Nachguss_dekoktion  = PreBoilVolume
                    - (Hauptguss) 
                    + Korn_Absorption 
                    + Dekoktions_Verdampfung (Kochverluste der Teilmaischen)
```

**Kritisch:** Wasser, das beim Maische-Kochen verdampft, darf **nicht** vorab in den Hauptguss gegeben werden (sonst wird das Einmaisch-Verhältnis falsch). Der Verlust muss im **Nachguss** ausgeglichen werden, um vor dem Hopfenkochen das korrekte Zielvolumen zu erreichen.

**Regel 2: `mash_infusion_total` vs. `mash_water_liters`**
- `mash_infusion_total` wird nur bei Dekoktion angezeigt und gespeichert
- Bei Dekoktion: `mash_water_liters = mash_infusion_total + additional_liquid_water`
- Der Wert in `mash_water_liters` bleibt die **Gesamtmenge an Wasser, die in der Maische landet** (damit `calculateBatchSizeFromWater()` kohärent rechnet)
- `mash_infusion_total` ist ein **Anzeige-Feld für den Brauer**: „So viel Wasser brauchst du zum initialen Einmaischen"

**Regel 3: Nachguss bleibt unverändert**
Der Nachguss (`sparge_water_liters`) hat mit Dekoktion nichts zu tun. Er wird nach wie vor über `preBoilVolume - postMashVolume` berechnet.

### 9.4 Der `calculateBatchSizeFromWater()` Effect

**Datei:** `BrewEditor.tsx` (L478-520)

Der bestehende `useEffect` berechnet die `batch_size` rückwärts aus HG+NG. Dieser Mechanismus muss bei Dekoktion die Verdampfung berücksichtigen:

```ts
// NEU: Dekoktions-Verdampfung aus mash_steps extrahieren
const decoctionSteps = (d.mash_steps || []).filter(
  (s: any) => s.step_type === 'decoction' && s.decoction_boil_time
);
const decoctionEvaporation = decoctionSteps.reduce((sum: number, s: any) => {
  const boilTime = parseFloat(s.decoction_boil_time || '0');
  const formFactor = s.decoction_form === 'thick' ? 0.6 : 1.0;
  return sum + (2.0 * (boilTime / 60) * formFactor); // 2 L/h Boil-Off bei Maische
}, 0);

// Angepasster Aufruf:
const calcBatch = calculateBatchSizeFromWater(
  mashWater, spargeWater, d.malts, boilTime,
  { ...config, decoctionEvaporation }
);
```

Ohne diese Anpassung würde die Rückwärtsberechnung bei Dekoktions-Rezepten eine **falsch niedrige `batch_size`** ergeben — weil sie die Verdampfung während des Maischens nicht einkalkuliert.

### 9.5 UI: Wasserbereich im Editor für Dekoktion

Wenn `mash_process === 'decoction'`, zeigt der Wasser-Bereich im Editor an:

```
┌────────────────────────────────────────────────────┐
│  Ausschlagwürze (Ziel / L)     [ 20.0 ]            │
│                                                    │
│  Zubrühwasser (Einmaischen)    [ 17.5 ] L          │
│  ├ davon Kochwasser-Zugaben:   [ 6.5 ] L  (auto)  │
│  Hauptguss (gesamt):           [ 24.0 ] L (calc)  │
│                                                    │
│  Nachguss (inkl. Kompensation) [ 18.7 ] L         │
│  ├ Dekoktions-Verdampfung:     [ ~0.7 ] L (auto)  │
│                                                    │
│  Gesamtwasser:                 [ 42.7 ] L         │
└────────────────────────────────────────────────────┘
```

Die Felder `Kochwasser-Zugaben` und `Dekoktions-Verdampfung` werden automatisch aus den `mash_steps` berechnet und sind read-only. Der Verlust der Verdampfung wird visuell unter dem Nachguss ausgewiesen. Bei **Infusion** bleibt alles wie gehabt — die zusätzlichen Felder werden ausgeblendet.

---

## Betroffene Dateien (Impact-Matrix)

Vollständige Liste aller Dateien, die für dieses Feature angepasst werden müssen:

| Datei | Phase | Änderungstyp | Risiko |
|---|---|---|---|
| `app/team/[breweryId]/brews/components/MashStepsEditor.tsx` | 1.1–1.3 | Interface + UI komplett | 🔴 Hoch |
| `app/team/[breweryId]/brews/components/BrewEditor.tsx` | 1.4–1.5 | Props, Felder, BotlGuide | 🟡 Mittel |
| `lib/brewing-calculations.ts` | 2.1–2.3 | Neue Funktionen + Parameter | 🟡 Mittel |
| `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/BrewDayTab.tsx` | 3.1–3.4 | Event-Expansion, Dual-Track | 🔴 Hoch |
| `app/team/[breweryId]/sessions/[sessionId]/_components/PhaseViews.tsx` | 4.1–4.2 | Rendering + Timer | 🟡 Mittel |
| `recipes/import_maischemalz.sql` | 5.1 | Dekoktions-Branch | 🟢 Niedrig |
| `lib/pdf-session-export.ts` | 6.1 | Neuer Abschnitt | 🟢 Niedrig |
| `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/CompletedTab.tsx` | 6.2 | Daten durchreichen | 🟢 Niedrig |
| `lib/brew-type-lookup.ts` | 7.1 | Inferenz verbessern | 🟢 Niedrig |
| `lib/validations/brew-schemas.ts` | 7.3 | Optionaler Validator | 🟢 Niedrig |
| `supabase/migrations/` (neue Migration) | 7.2 | Trigger anpassen | 🟡 Mittel |
| `lib/utils/recommendation-engine.ts` | 7.1 | Ggf. `step_type` nutzen | 🟢 Niedrig |
| `app/brew/[id]/components/BrewRecipeTab.tsx` | 8.1–8.2 | MashScheduleView Dekoktions-Details + Badge | 🟡 Mittel |
| `app/seed/page.tsx` | – | Seed-Daten ergänzen | 🟢 Niedrig |
| `scripts/add_brew_template.js` | – | Template anpassen | 🟢 Niedrig |

---

## Implementierungs-Reihenfolge

| # | Phase | Beschreibung | Aufwand | Abhängigkeiten |
|---|---|---|---|---|
| 1 | 1.1 | TypeScript-Interfaces erweitern | 0.5h | – |
| 2 | 2.3 | `calculateDecoctionVolume()` implementieren | 1h | – |
| 3 | 1.2 + 1.3 | `MashStepsEditor` (Desktop Expand + Mobile Modal) | 3.5h | #1 |
| 4 | 1.4 + 1.5 | `BrewEditor` Props, Felder, BotlGuide-Kontext | 1.5h | #1, #3 |
| 5 | 5.1 | SQL-Script für beide JSON-Strukturen | 2h | #1 |
| 6 | 2.1 | Wasserberechnung mit Dekoktions-Verdampfung | 2h | #1 |
| 7 | 2.2 | Farbberechnung Dekoktion | 0.5h | #6 |
| 8 | 7.1 + 7.3 + 7.4 | Inferenz + Validator + Typen-Check | 1h | #1 |
| 9 | 4.1 + 4.2 | PhaseViews Rendering + Timer | 2h | #1 |
| 10 | 3.1 + 3.2 + 3.3 | BrewDayTab Event-Expansion + Dual-Track | 4h | #1 |
| 11 | 3.4 | Dekoktions-Event-Karten-UI | 2.5h | #10 |
| 12 | 6.1 + 6.2 | PDF-Export Maischplan | 1.5h | #1 |
| 13 | 7.2 | Migration-Trigger anpassen | 1h | #1 |
| 14 | 8.1 + 8.3 | BrewRecipeTab Display + Editor Auto-Scale | 1.5h | #1 |
| 15 | 9.3 + 9.4 | Wassermanagement-Kohärenz (Engine + Effect) | 2.5h | #1, #6 |
| 16 | 9.5 | Wasser-UI bei Dekoktion | 1h | #15 |

**Geschätzter Gesamtaufwand:** ~28h

---

## Erfolgskriterien / Done-Definition

### Rezept-Editor
- [ ] Ein via SQL importiertes Dekoktions-Rezept (Böhmisches Pilsner) zeigt im Editor alle 4 Dekoktions-Schritte mit Volumen, Form und Kochzeit korrekt an
- [ ] Ein Infusions-Rezept (Maibock) zeigt im Editor unverändert die einfache Rastenliste — keine visuellen Regressions
- [ ] Beim Anlegen eines neuen Dekoktions-Schritts im Editor wird ein empfohlenes Volumen berechnet und angezeigt
- [ ] Der BotlGuide-Kontext enthält bei Dekoktions-Rezepten Infos zu Volumen, Form und Kochzeit

### Physik-Engine
- [ ] Die Wasserberechnung (Button „Berechnen") liefert bei einem Dekoktions-Rezept einen höheren Hauptguss-Wert als bei gleichem Infusions-Rezept (wegen Verdampfung)
- [ ] `calculateDecoctionVolume()` liefert für Böhmisches Pilsner Dekoktion 3 (63→72°C, ~17L Gesamtmaische) ein Ergebnis nahe 6 L
- [ ] Farbberechnung bei Dekoktion ergibt höhere EBC als bei reiner Infusion

### Interaktiver Brautag
- [ ] Im Brautag-Tab erscheinen für jeden Dekoktions-Schritt die Sub-Events: Pull → Heat → Boil → Return → Rest
- [ ] Die Hauptmaische-Rast und die Teilmaische-Timer laufen parallel (Dual-Track-Layout auf Desktop / Tab-Toggle auf Mobile)
- [ ] Der Brauer kann am `decoction_return`-Event die tatsächlich erreichte Temperatur eintippen
- [ ] Der Temperaturwert wird in der Session unter `measurements.decoction_temps[]` gespeichert

### Session-Ansicht
- [ ] `PhaseViews.tsx` zeigt bei Dekoktions-Schritten Volumen, Form und Kochzeit an
- [ ] Das BrewTimer-System in PhaseViews unterstützt Dekoktions-Sub-Steps

### Import
- [ ] Böhmisches Pilsner JSON importiert mit `step_type: 'decoction'` und allen Feldern
- [ ] Maibock JSON importiert unverändert als `step_type: 'rest'`
- [ ] `mash_strike_temp` und `mash_infusion_total` werden korrekt befüllt

### PDF-Export
- [ ] Der Session-Report-PDF enthält den vollständigen Maischplan mit Dekoktions-Details

### Öffentliche Rezeptseite (`/brew/:id`)
- [ ] `MashScheduleView` zeigt für Dekoktions-Schritte Volumen, Form und Kochzeit als Pill-Badge an
- [ ] Timeline-Punkte sind für `decoction`-Schritte amber, für `mashout` rot, für `rest` grau
- [ ] Dekoktions-Volumina werden durch `scaleAmount()` korrekt skaliert
- [ ] Infusions-Schritte sehen identisch wie bisher aus (keine visuelle Regression)

### Wassermanagement
- [ ] `calculateWaterProfile()` berücksichtigt Dekoktions-Verdampfung + Kochwasser-Zugaben im Hauptguss
- [ ] `calculateBatchSizeFromWater()` (Rückwärtsberechnung) liefert bei Dekoktion korrekte batch_size trotz Verdampfung
- [ ] Der Editor zeigt bei `mash_process === 'decoction'` aufgeschlüsselte Wasserfelder (Zubrühwasser, Kochwasser-Zugaben, Verdampfung)
- [ ] Bei Infusion bleibt die Wasser-UI unverändert (keine Regression)
- [ ] `mash_infusion_total` und `mash_water_liters` stehen in konsistenter Beziehung (HG ≥ Zubrühwasser)

### Inferenz & Validierung
- [ ] `inferMashProcess()` erkennt Dekoktion über `step_type`-Feld (statt nur Namens-Heuristik)
- [ ] Der Discover-Trigger setzt `mash_process = 'decoction'` korrekt
- [ ] Alle bestehenden Tests und kein Build-Fehler auf Vercel

---

## Offene Fragen / Future Work

- **Koeffizient Dekoktions-Farbvertiefung:** `0.1 EBC/min/Volumenverhältnis` ist eine grobe Näherung. Kann durch gesammelte Session-Daten (gemessene vs. berechnete Farbe) in Zukunft kalibriert werden
- **BotlGuide / AI-Coach:** Der AI-Assistent sollte Dekoktions-Sub-Events kennen und kontextbezogene Hinweise geben ("Du kochst gerade Dickmaische — Rühren wichtig, um Anbrennen zu vermeiden")
- **Dekoktions-Effizienz:** Dekoktion steigert die Sudhausausbeute gegenüber Infusion (~2-5%). Aktuell können wir das nicht modellieren, da wir nur einen globalen `efficiency`-Wert haben
- **Zubrühwasser-Temperaturberechnung:** Wie heiß muss das Zubrühwasser sein, um bei einer bestimmten Schüttung und Wasservolumen die gewünschte Einmaischtemperatur zu erreichen? (Strike-Water-Calculator) — sinnvolle Ergänzung für fortgeschrittene Brauer
- **`Temperatur_ist` Feld aus MMuM:** Der erste Dekoktions-Eintrag im Böhmischen Pilsner hat ein `Temperatur_ist: 57`-Feld. Das ist die IST-Temperatur vor der Dekoktion. Diese könnten wir als `pre_temperature` speichern, um im Editor eine visuelle Temp-Kurve zu zeichnen
