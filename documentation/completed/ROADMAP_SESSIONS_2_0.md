# Roadmap: Sessions 2.0 – Das interaktive Brau-Logbuch

**Status:** ✅ **Abgeschlossen** (Live)
**Datum:** 22.01.2026
**Ziel:** Transformation der Sudverwaltung von einer statischen "Dateneingabe" zu einem lebendigen, geführten Brauprozess-Begleiter.

---

## 1. Vision & Philosophie

Aktuell ist eine "Session" in BotlLab im Wesentlichen ein Formular, das man am Ende des Brautags ausfüllt. Das spiegelt nicht die Realität des Brauens wider. Brauen ist ein Prozess, der über Wochen dauert.

**Sessions 2.0** ändert das Paradigma:

1.  **Vom Formular zum Feed:** Der Sud ist eine Sammlung von Ereignissen (Events) auf einem Zeitstrahl.
2.  **Geführter Prozess:** Die App weiß, in welcher Phase sich das Bier befindet, und fragt nur nach relevanten Daten (z.B. "Gärung läuft seit 3 Tagen – Zeit für eine Messung?").
3.  **Lebendige Daten:** Messwerte wie Alkoholgehalt (ABV) werden nicht starr eingetragen, sondern dynamisch aus dem Logbuch (Stammwürze vs. aktuelle Dichte) errechnet.

---

## 2. Datenbank-Architektur

Wir nutzen ein "Event Sourcing Light" Modell. Der aktuelle Zustand (z.B. aktueller Alkoholgehalt) wird weiterhin in der `brewing_sessions` gecacht, aber die Quelle der Wahrheit sind die Einträge in `session_logs`.

### 2.1 Tabelle: `brewing_sessions` (Erweiterung)

Die Haupttabelle wurde um Status-Logik erweitert, um den Prozess zu steuern.

| Spalte                 | Typ           | Beschreibung                                                                                                                 |
| :--------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| `phase`                | `text` (Enum) | Aktuelle Phase: `planning`, `brewing`, `fermenting`, `conditioning`, `completed`                                             |
| `status`               | `text`        | Feingranularer Status: `scheduled`, `mashing`, `boiling`, `cooling`, `fermenting_primary`, `cold_crash`, `bottled`, `kegged` |
| `current_gravity`      | `numeric`     | Die zuletzt gemessene Dichte (Cache)                                                                                         |
| `apparent_attenuation` | `numeric`     | Aktueller Vergärungsgrad in % (Cache)                                                                                        |
| `started_at`           | `timestamptz` | Beginn des Brautags                                                                                                          |
| `completed_at`         | `timestamptz` | Datum der Fertigstellung/Austrinken                                                                                          |

### 2.2 Neue Tabelle: `session_logs` / `timeline` (JSONB)

Statt einer eigenen Tabelle wurde der Ansatz gewählt, die `timeline` als JSONB-Array direkt in `brewing_sessions` zu speichern, was die Performance und einfache Abfrage begünstigt.

```sql
ALTER TABLE brewing_sessions ADD COLUMN timeline JSONB DEFAULT '[]'::jsonb;
```

Der Typ bestimmt, wie das Frontend den Eintrag rendert:

- 'NOTE', -- Freitext Notiz
- 'MEASUREMENT_OG', -- Stammwürze Messung (Start)
- 'MEASUREMENT_SG', -- Laufende Messung (Spindel/Refraktometer)
- 'MEASUREMENT_FG', -- Endvergärung Messung (Ziel)
- 'MEASUREMENT_PH', -- pH Wert Messung
- 'INGREDIENT_ADD', -- Z.B. Dry Hop, Zucker, Gewürze
- 'STATUS_CHANGE', -- Z.B. "Abfüllung gestartet"
- 'IMAGE' -- Foto-Upload

### 2.3 Datensicherheit & Concurrency (WICHTIG)

Da wir ein JSON-Array in einer einzigen Spalte nutzen, müssen wir **Race Conditions** verhindern.

Lösung: **Postgres RPC Funktion "Atomic Append"**.
Wir nutzen eine serverseitige Funktion `append_timeline_entry`, die `UPDATE ... SET timeline = timeline || new_entry` ausführt. Da Postgres Updates auf Zeilenebene lockt, ist das atomar und sicher.

### 2.4 Policies & Permissions (Review)

- **RLS Policies**: Die existierenden Policies auf `brewing_sessions` (`Enable update for brewery members`) greifen automatisch auch für die neue `timeline`-Spalte sowie die RPC-Funktion (bei `SECURITY INVOKER`).

## 3. Der Pahsengesteuerte Ablauf (The Journey)

Die UI passt sich der aktuellen Phase an ("Smart Actions").

### Phase 0: Planung (`planning`)

- **Kontext:** Das Bier ist nur eine Idee.
- **Anzeige:** Zutatenliste, erwartete Werte (Plan-IBU, Plan-EBC).
- **Smart Actions:**
  - "Inventar prüfen"
  - "Brautag starten" (Übergang zu Phase 1)

### Phase 1: Brautag (`brewing`)

- **Kontext:** Es wird heiß! Wasser kocht, Maische rührt.
- **Anzeige:** Timer, Maischeplan-Steps zum Abhaken.
- **Smart Actions:**
  - "Einmaischen (Start Timer)"
  - "Jodprobe (OK/Nicht OK)"
  - "Kochbeginn (Start Timer)"
  - **"Stammwürze messen (OG)"** -> **Kritischer Punkt!** Setzt den Referenzwert für Alkoholberechnung.
  - "Hefe anstellen (Pitching)" -> Beendet Phase 1, startet Phase 2.

### Phase 2: Gärung (`fermenting`)

- **Kontext:** Das Bier arbeitet im Tank. Geduld ist gefragt.
- **Anzeige:** Gärverlauf-Chart (Gravity über Zeit), Tage seit Brautag.
- **Smart Actions:**
  - "Messwert erfassen" (Schnelleingabe SG/Brix)
  - "Temperatur loggen"
  - "Stopfhopfen hinzufügen" (Erinnerung basierend auf Rezept?)
  - "Cold Crash starten"
  - "Abfüllung starten" -> Übergang zu Phase 3.

### Phase 3: Abfüllung & Konditionierung (`conditioning`)

- **Kontext:** Das Bier kommt in Flaschen/Kegs.
- **Anzeige:** Karbonisierungsrechner.
- **Smart Actions:**
  - **"Final Gravity (FG) bestätigen"** -> Berechnet finalen Alkoholgehalt.
  - "Abfülldatum setzen"
  - "Karbonisierung berechnen" (Eingabe: Gewünschte CO2 -> Ausgabe: Zucker in g).
  - QR-Code Labels generieren.

### Phase 4: Genuss (`completed`)

- **Kontext:** Das Bier wird getrunken.
- **Anzeige:** Öffentliches Profil, Bewertungen, Badges.
- **Smart Actions:**
  - "Tasting Note schreiben"
  - "Sud archivieren"

---

## 4. UI-Design Konzept

### 4.1 Der "Session Header"

Immer sichtbar. Enthält:

- **Großer Status-Monitor:** "Tag 4 der Gärung" oder "Reift seit 2 Wochen".
- **Live Metrics:** Aktueller Alkoholgehalt (berechnet aus letztem Log), Aktuelle Dichte.
- **Phasen-Stepper:** Visuelle Kette `Planung > Brauen > Gärung > Abfüllung`.

### 4.2 Der Feed (Timeline)

Unter dem Header befindet sich der chronologische Verlauf.

- Sieht aus wie ein Social Media Feed oder Chat-Verlauf.
- Kombiniert Systemnachrichten ("Status gewechselt zu Gärung") mit User-Inhalten ("Riecht extrem fruchtig heute!").
- Bilder werden groß und ansprechend dargestellt.

### 4.3 Das "Action Sheet" (Mobile First)

Ein auffälliger "+" Button (FAB) unten rechts öffnet je nach Phase die passenden Aktionen.

- Ist Phase == Gärung? -> Zeige Buttons: "Messen", "Stopfen", "Notiz".

---

## 5. Implementierungs-Schritte (✅ Erledigt)

### Schritt 1: Migration (Backend)

- ✅ `brewing_sessions` um `phase`, `status` und `timeline` (JSONB) erweitert.
- ✅ `append_timeline_entry` RPC Funktion implementiert.

### Schritt 2: Logik-Layer (Frontend/Hooks)

- ✅ **TypeScript Interfaces:** `TimelineEvent`, `MeasurementLogEntry`, etc. in `lib/types/session-log.ts` definiert.
- ✅ **Supabase RPC Integration:** `SessionClient.tsx` nutzt RPC calls.

### Schritt 3: Frontend Umbau

- ✅ Neue Page `/team/[id]/sessions/[sessionId]/page.tsx` und Komponenten implementiert.
- ✅ `TimelineFeed`: Rendert das JSON-Array.
- ✅ `PhaseControl`: Update der Phase via `PhaseViews.tsx`.
- ✅ `SmartActions`: `SmartActions.tsx` Komponente für kontextsensitive Buttons.
