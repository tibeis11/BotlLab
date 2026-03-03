# Roadmap: Sessions 3.0 (The "Perfect" Brew Log)

> **Design Reference:** `/app/admin/dashboard/page.tsx` — Flat, black, Vercel-inspired.  
> **Status:** Done · Updated 2026-02-19 (v6 — Phase 1+2+3+4+5+6 done)

---

## 1. Vision & Goals

Sessions 3.0 transforms the current monolithic, design-inconsistent session view into a **structured, modular, and highly responsive** experience — anchored in the same clean design language as the Admin Dashboard.

**Core Principles:**

- **One Layout Pattern:** Left sidebar navigation (Desktop) + Bottom tab bar (Mobile). No URL sub-routing per phase.
- **One Data Source:** All fermentation measurements live exclusively in `brew_measurements` linked to `session_id`. The timeline holds annotation markers only — it never drives metric calculations.
- **Bidirectional Phases:** Phases are navigational tabs, not locked gates. The "active" phase is shown with a badge, but all tabs remain accessible at all times. Phase transitions are _suggested_ (e.g., "Alle Schritte erledigt → Wechsle zu Gärung?"), never forced.
- **Scalable Complexity (Progressive Disclosure):** Advanced features (Water Chem, Pressure Fermentation, Yeast Harvesting) are hidden behind "Show Advanced" toggles. Default state = beginner-friendly. Toggle state is persisted in `localStorage` keyed by `userId`.
- **Embedded Knowledge (The "BotlGuide"):** Contextual help explains _why_ specific values matter — powered by static content for Free users, and AI context-aware coaching for paid tiers.

---

## 2. Architecture

### A. Layout: Sidebar + Tabs (No Sub-Routing)

The session page uses a **single URL** (`/team/[breweryId]/sessions/[sessionId]`). Navigation between views is handled entirely client-side via `activeTab` state — exactly as the Admin Dashboard does via `DashboardClient.tsx`.

```
SessionLayout (layout.tsx)
├── SessionHeader (sticky top — compact, collapsible on mobile)
│     └── Metrics: OG · SG · ABV · Attenuation · Volume · pH
│     └── Editable: Session-Name, Batch-Code (Inline Edit on click)
├── Sidebar Navigation (hidden on mobile, w-48 on lg+)  ← like DashboardTabs.tsx
│     ├── 📋 Übersicht        (Dashboard hub)
│     ├── 🧪 Planung          (Recipe, Water, Inventory)
│     ├── 🔥 Brautag          (Mash Steps, Boil Timer, Checklist)
│     ├── 🧬 Gärung           (Measurements, Graph, Annotations)
│     ├── ❄️  Reifung          (Conditioning, Carbonation)
│     └── ✅ Abgeschlossen    (Tasting Notes, Export, Archive)
│
├── Bottom Tab Bar (mobile only — lg:hidden)
│     └── 6 icons with short labels. Active: icon filled + label white.
│         Inactive: icon outline + label zinc-500.
│         Maximum 5 visible; overflow becomes "Mehr ···" drawer.
│
└── Main Content Area (flex-1)
      └── Renders the active tab view — no page navigation
```

### B. State Management (Session Context 2.0)

- Single `useSession()` hook providing: `session`, `measurements`, `metrics`, `loading`, `refreshSession`.
- **Computed metrics** (ABV, Attenuation, estimated FG) derived exclusively from `brew_measurements` + OG from timeline. Zero dual-source logic.
- Optimistic UI updates: mutations update local state immediately, sync to Supabase in background.
- **Offline awareness:** If Supabase is unreachable, a banner "Offline — Änderungen werden gespeichert, sobald du wieder online bist" appears. Data entry is queued in `localStorage` and flushed on reconnect.

### C. Single Data Source Rule

| Data type                     | Source                                                                  | Notes                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Fermentation gravity          | `brew_measurements.gravity`                                             | Only source for header + graph                                        |
| Temperature                   | `brew_measurements.temperature`                                         | Same row as gravity                                                   |
| Pressure (advanced)           | `brew_measurements.pressure_bar`                                        | Nullable column — migration required                                  |
| Original Gravity (OG)         | `timeline` event `MEASUREMENT_OG`                                       | Logged at Brautag (post-boil) or manually in Gärung                   |
| Volume, pH                    | `timeline` events                                                       | Log entries only                                                      |
| Timer state                   | `timeline` events                                                       | Serialized start/pause/duration                                       |
| Ad-hoc ingredient adjustments | `timeline` events `INGREDIENT_ACTUAL`                                   | Stores `{ ingredient_id, planned, actual, unit }`                     |
| Tasting notes                 | `timeline` events `TASTING_NOTE`                                        | Logged in Abgeschlossen tab                                           |
| Yeast harvest                 | `timeline` events `YEAST_HARVEST`                                       | Stores `{ generation, volume_ml, date, returned_to_inventory: bool }` |
| Brew efficiency               | Calculated from `MEASUREMENT_PREBOIL_GRAVITY` + `MEASUREMENT_OG` events | Both must exist for efficiency to render                              |

---

## 3. Design Language (Admin Dashboard Reference)

Exact style mapping from `/app/admin/dashboard/`:

| Element                     | Class                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Page background             | `bg-black text-white font-sans antialiased`                                                                            |
| Section panels              | `bg-black border border-zinc-800 rounded-lg p-6`                                                                       |
| Page/section title          | `text-2xl font-black text-white`                                                                                       |
| Subtitle / description      | `text-sm text-zinc-500`                                                                                                |
| Section sub-header          | `text-sm font-medium text-white mb-6`                                                                                  |
| Sidebar nav item (inactive) | `text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 px-3 py-2 rounded-md`                                             |
| Sidebar nav item (active)   | `bg-zinc-800 text-white px-3 py-2 rounded-md`                                                                          |
| Phase "active" badge        | `px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase tracking-wide` |
| Status dot (active)         | `w-1.5 h-1.5 rounded-full bg-green-500`                                                                                |
| Metric values               | `font-mono text-white`                                                                                                 |
| Labels                      | `text-[10px] uppercase font-bold text-zinc-600 tracking-wider`                                                         |
| Accent color (charts)       | `#0070f3` (Vercel Blue)                                                                                                |
| Success color               | `emerald-500`                                                                                                          |
| Warning / Temperature       | `orange-500`                                                                                                           |
| Dividers                    | `border-b border-zinc-800`                                                                                             |
| Inputs                      | `bg-black border border-zinc-800 rounded-md px-3 py-2 text-white text-sm focus:border-white outline-none`              |
| Primary button              | `bg-white text-black font-bold py-2 px-4 rounded-lg hover:bg-zinc-200 transition`                                      |
| Secondary button            | `bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 px-4 py-2 rounded-md text-sm`                         |
| Touch targets               | Minimum `h-12` (48px) on all interactive elements — enforced throughout                                                |
| Empty states                | Dashed border `border-dashed border-zinc-800`, centered icon + short explanation + CTA                                 |

---

## 4. Tab View Specifications

### Tab 1 — Übersicht (Hub)

- **KPI row:** OG · Aktuell · ABV · Vergärung · Volumen · pH  
  → `MetricCard` components styled after Admin Dashboard.
- **Mini graph:** Last 7 days of measurements if in `fermenting` or later phase.
- **Recent activity feed:** Last 5 timeline events with icon + timestamp.
- **"Active Phase" card:** Large CTA button — text adapts to phase, e.g.:
  - Planung: `"Zutaten vorbereiten →"`
  - Brautag: `"Brautag fortsetzen →"`
  - Gärung: `"Messwert eintragen →"`
- **Session Notes:** A freeform textarea at the bottom — auto-saved, unformatted, always visible. The "catch-all" for anything that doesn't fit a structured field.

### Tab 2 — Planung

- **Modus "Einfach" (Default):**
  - Skalierbare Ingredient-Checkliste (Malz, Hopfen, Hefe).
  - Skalierungsfaktor-Input: ändert alle Mengen proportional, berechnet IBU und Farbe neu.
  - **BotlGuide (static):** "Warum genau wiegen? Kleine Abweichungen bei der Stammwürze entstehen oft schon hier."
- **Modus "Erweitert" (Toggle — state in localStorage):**
  - Wasserprofil-Anpassung: Salze, Säure, Restalkalität.
  - Hefe-Management: Starter-Ansatz (Datum, Volumen), Rehydrierungs-Notiz, Vitalitäts-Einschätzung.
  - Inventory deduction preview: "Diese Zutaten werden aus dem Lager abgezogen."
  - **BotlGuide (AI, Brewer tier):** "Für dein Saison empfehle ich ein weiches Profil mit ~50ppm Sulfat."

### Tab 3 — Brautag

- **Step Sequencer (Maischen):**
  - Rast-Schritte aus dem Rezept geladen: Ziel-Temperatur, Dauer, beschreibender Name.
  - Jeder Schritt: `[Starten]` → läuft Timer → `[Erledigt]`.
  - Timer-Zustand in `timeline` persistent — Seite kann refreshed oder geschlossen und wiedergeöffnet werden.
  - **Embedded Knowledge:** Kurze Erklärung je Schritt-Typ (Maltoserast, Abmaischrast, Läutern).
- **Boil Timeline:**
  - Alle Hopfengaben und Zusätze aus dem Rezept als umgekehrter Countdown.
  - Audio-Alert (Web Audio API, kein externes File) 30 Sekunden vor Fälligkeit.
  - Hinzufügen per "+" für ungeplante Zugaben → als `INGREDIENT_ACTUAL`-Event mit Markierung "Ungeplant" geloggt.
- **Ad-hoc Anpassungen (Toggle):**
  - Neben jeder Zutat ein "Ist"-Feld. Abweichung wird angezeigt und IBU/Farbe neu berechnet.
- **OG & Volumen Einstellung (Das "Landing Zone" Tool):**
  - Eingabe: _Gemessene Dichte_ + _Gemessenes Volumen_.
  - Live-Check gegen Zielwerte: "Du bist 4 Punkte zu hoch (1.054 statt 1.050)".
  - **Korrektur-Rechner (Smart):**
    - Schlägt vor: "Füge **1.2 Liter** Wasser hinzu, um 1.050 zu erreichen."
    - Oder: "Koche **10 Min** länger für 1.058."
  - Button `[Korrektur anwenden]` loggt die Aktion.
  - Button `[Finale Stammwürze loggen]` speichert `MEASUREMENT_OG` und `MEASUREMENT_VOLUME` als fixen Startwert der Gärung.
- **Screen Wake Lock:** `navigator.wakeLock.request('screen')` aktiv solange Tab offen. iOS-Fallback: dezenter Info-Banner.
- **Alle Buttons min. 48px Höhe.**

### Tab 4 — Gärung

- **Graph:** Full-width Recharts `LineChart`.
  - 0 Messungen: Leerer Zustand mit Erklärung + "Ersten Messwert eintragen".
  - 1 Messung: Einzelner Punkt mit Anzeige des Werts — kein Linien-Chart.
  - 2+ Messungen: Vollständiger Graph. Gravity (`#0070f3`) + Temperatur (`orange-500`), dual Y-Axis.
  - **Zielkurve:** Gestrichelte Referenzlinie vom OG bis zum erwarteten FG aus dem Rezept.
  - **Event-Annotations:** `ReferenceArea` oder vertikale Markierung für Timeline-Events (z.B. "Dry Hop").
- **Add Measurement Form:**
  - `datetime-local`, vorausgefüllt mit lokalem "jetzt".
  - SG-Input: `inputmode="decimal"`, Placeholder `"z.B. 1.048"` — nie vorausgefüllt.
  - Temperatur-Input + automatische Temperaturkorrektur inline: `"Korrigiert (20°C): 1.047"`.
  - Toggle: `SG | °Plato` — konvertiert Ein- und Ausgabe.
  - **Erweitert (Toggle):** Druck-Feld in bar (für Druckgärung/Spundung).
  - **BotlGuide (static):** "Warum täglich messen? Gleichbleibende Werte über 2 Tage zeigen das Gärende an."
  - **BotlGuide (AI, Brewer tier):** "Deine Gärung verläuft etwas langsamer als erwartet. Temperatur erhöhen?"
- **Measurement Table:**
  - Jede Zeile: Datum+Zeit · Dichte · Temperatur · Notiz · Edit-Icon · Delete-Icon.
  - Edit: öffnet Inline-Formular in der Zeile — kein Modal.
  - Delete: braucht einen Bestätigungs-Klick direkt in der Zeile.
- **Smart Prediction (Brewer tier):** "Gärende voraussichtlich: Freitag, 21. Feb." — dezent, kein Popup.
- **Hefe-Ernte (Erweitert):**
  - Button "Hefe ernten" → Modal mit Felder: Generation, Volumen (ml), Datum.
  - Option: "In Inventory zurücklegen (Generation X)" → bucht Hefe-Bestand per bestehender Inventory-API zurück.
  - Wird als `YEAST_HARVEST`-Event in Timeline geloggt.

### Tab 5 — Reifung

- Karbonisierungsrechner: CO₂-Volumen, Zucker/Speise-Menge, Karbonisierungstyp (Flasche/Keg).
- Abfüll-Log: Datum, Menge (Flaschen/Liter), Methode.
- Conditioning-Notizen (Freitext).
- **BotlGuide:** "Lass das Bier mindestens 2 Wochen bei ~20°C karbonisieren, bevor du es kalt lagerst."

### Tab 6 — Abgeschlossen

- **Tasting Notes:** Farbe (SRM-Farbswatch), Klarheit, Schaum, Aroma, Geschmack, Karbonisierung, Gesamt-Bewertung (1–5 Sterne), Freitext.
- **Final Stats:** OG → FG → ABV → Scheinbarer Endvergärungsgrad → Sudhausausbeute (nur wenn Pre-Boil-Daten existieren, sonst "–").
- **Export:** PDF-Logbuch · CSV-Messwerte.
- **Session archivieren:** Setzt Status auf `archived`, erscheint nicht mehr in "Aktive Sessions".

---

## 5. BotlGuide — Vollständige Architektur & Implementierungsplan

### 5.1 Konzept

BotlGuide ist ein **kontextueller Brauwissens-Assistent**, der sich organisch in den Workflow einfügt. Er erklärt nicht, wenn man nicht fragt. Er stört nicht.  
Das Erlebnis muss auf dem ersten Kontakt eine "Wow"-Reaktion auslösen: Die AI kennt das eigene Bier.

### 5.2 Herausforderungen & Lösungen

**🔴 Problem 1: Latenz tötet den Flow**  
Ein Brauer beim Maischen kann nicht 2-3 Sekunden auf eine AI-Antwort warten.  
**Lösung → Static-First, AI-on-Demand:**

- Das `?`-Icon öffnet **sofort** einen Side-Sheet mit statischem Text (aus `botlguide-content.json`, 0ms).
- Ein `✨ KI-Coaching anfordern` Button _innerhalb_ des Sheets lädt die AI-Antwort — mit **Streaming** (Text erscheint Wort für Wort, kein Spinner-Warten).
- Statischer Text ist immer da. KI ist ein optionales Upgrade, das nie blockiert.

**🔴 Problem 2: Credits werden durch mehrfaches Öffnen verbrannt**  
Dasselbe `?` zweimal zu öffnen soll keinen Credit kosten.  
**Lösung → `sessionStorage`-Cache:**

- Jede AI-Antwort wird gecacht unter `botlguide_{sessionId}_{contextKey}`.
- Bei erneutem Öffnen kommt die Antwort aus dem Cache — augenblicklich.
- Cache-Lifetime: Browser-Session (Tab schließen löscht Cache → frische Antwort beim nächsten Besuch).

**🔴 Problem 3: Die AI kennt das Rezept nicht**  
Die aktuelle `generate-text` Route ist generisch. Für BotlGuide brauchen wir tiefen Kontext.  
**Lösung → Neuer API-Typ `"guide"` in `generate-text/route.ts`:**

```json
{
  "type": "guide",
  "contextKey": "rast.maltoserast",
  "sessionContext": {
    "brewStyle": "German Weizen",
    "targetOG": 1.052,
    "currentGravity": 1.038,
    "mashTempC": 63,
    "mashDurationMin": 45,
    "yeast": "Wyeast 3068 Weihenstephan"
  }
}
```

Prompt-Struktur:  
`"Du bist ein erfahrener Braumeister. Der Brauer macht gerade eine [Maltoserast] bei [63°C] für [45 Min] für ein [German Weizen] (Ziel-OG: [1.052]). Erkläre kurz auf Deutsch (max. 80 Wörter), was gerade im Enzymprozess passiert und warum diese Rast für genau diesen Stil wichtig ist."`

**🔴 Problem 4: Free-User sehen nichts und verstehen den Mehrwert nicht**  
Wenn KI-Features unsichtbar sind, gibt es keinen Kaufanreiz.  
**Lösung → Teaser-Pattern:**

- Free-User sehen den statischen Text vollständig.
- Darunter: eine **absichtlich unscharf/geleakte** Vorschau der AI-Antwort (`blur-sm`, abgedunkelt).
- Text: `"✨ BotlGuide Pro wäre jetzt: 'Für dein Weizen bei 63°C empfehle ich...' — Upgrade für das volle Coaching."`
- Sie sehen exakt **wofür sie zahlen**.

**🟠 Problem 5: Schlechte AI-Antworten ruinieren das Trust**  
Gemini kann manchmal falsche Brauergebnisse liefern.  
**Lösung → Guardrails im Prompt + Feedback-Button:**

- Jeder KI-Antwort folgt ein dezentes `👍 / 👎`-Feedback (speichert zu Supabase zur qualitativen Verbesserung).
- Prompt enthält immer: `"Wenn du dir unsicher bist, sage das explizit. Keine Erfindungen."`.
- Antworten werden mit einer Disclaimer-Zeile geschlossen: `"Basierend auf allgemeinen Brau-Grundsätzen · Nicht als professionelle Beratung."`.

---

### 5.3 UI-Komponente: Der BotlGuide Side-Sheet

```
┌──────────────────────────────────────────────┐
│ 📖 Maltoserast                        [×]    │
├──────────────────────────────────────────────┤
│                                              │
│  [Static Text — immer sofort sichtbar]       │
│  Beta-Amylase baut bei 62–67°C               │
│  vergärbare Maltose ab. Je länger            │
│  die Rast, desto trockener das Bier.         │
│                                              │
├──────────────────────────────────────────────┤
│  ✨ KI-Coaching (Brewer Plan)                │
│  ┌──────────────────────────────────────┐    │
│  │ Für dein Weizen mit Wyeast 3068...   │    │  ← Streaming Text
│  │ empfehle ich 67°C für ein etwas...   │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  War das hilfreich?  👍  👎                   │
│                                              │
│  [Mehr zu Maischrast-Temperaturen →]         │  ← (Link zur Wissensbase)
└──────────────────────────────────────────────┘
```

Für **Free-Tier**:

```
├──────────────────────────────────────────────┤
│  ✨ KI-Coaching                              │
│  ┌──────────────────────────────────────┐    │
│  │ ██████ ████ ██ ██████████ ██████    │    │  ← blur-sm + opacity-40
│  │ ████████ ███ ██████ ██ ████ ███     │    │
│  └──────────────────────────────────────┘    │
│  → Upgrade auf Brewer Plan                   │
└──────────────────────────────────────────────┘
```

---

### 5.4 Static Content: `botlguide-content.json` (Initial-Einträge)

| Key                           | Titel                  | Wann gezeigt                          |
| ----------------------------- | ---------------------- | ------------------------------------- |
| `rast.maltoserast`            | Maltoserast            | Mash-Step Typ "Maltoserast" aktiv     |
| `rast.verzuckerungsrast`      | Verzuckerungsrast      | Mash-Step Typ "Verzuckerung"          |
| `rast.abmaischrast`           | Abmaischrast           | Letzter Mash-Step                     |
| `brautag.og_messen`           | Stammwürze messen      | Nach-Kochen-Block im Brautag          |
| `brautag.kuehlkurve`          | Würzekühlung           | Step "Abkühlen auf Anstelltemperatur" |
| `gaerung.sg_eingabe`          | Dichte messen — Warum? | SG-Eingabefeld im Gärung-Tab          |
| `gaerung.temperaturkorrektur` | Temperaturkorrektur    | Temp + SG beide ausgefüllt            |
| `gaerung.endverwaerungsgrad`  | Scheinbarer EVG        | ABV-Karte im Header                   |
| `gaerung.gaerende_erkennen`   | Gärende erkennen       | Nach 3+ gleichen Messwerten           |
| `gaerung.druck`               | Druckgärung            | Druck-Feld (Advanced Toggle)          |
| `reifung.karbonisierung`      | Karbonisierung         | Karbonisierungsrechner                |
| `hefe.harvest`                | Hefe ernten            | Hefe-Ernte Modal                      |
| `wasser.restalkalitaet`       | Restalkalität          | Wasser-Tab (Advanced Toggle)          |
| `effizienz.sudhausausbeute`   | Sudhausausbeute        | Efficiency-Karte Abschluss-Tab        |

---

### 5.5 Implementation Checklist (Gehört zu Phase 4 & 5)

**Phase 4 — Static BotlGuide:**

- [ ] `botlguide-content.json` mit allen Initial-Einträgen in `/lib/botlguide/content.json`.
- [ ] `BotlGuideProvider.tsx` + `useGuide(contextKey)` Hook.
- [ ] `GuideSheet.tsx` Side-Sheet Komponente (animiert, `framer-motion` slide-in from right).
- [ ] `GuideIcon.tsx` — das `?`-Icon, akzeptiert `contextKey` und öffnet Sheet.
- [ ] Static-Content anzeigen, Tier-Check für AI-Button.
- [ ] `?`-Icons an allen 14 definierten Stellen einbauen.

**Phase 5 — AI BotlGuide:**

- [ ] Neuen Prompt-Typ `"guide"` in `/api/generate-text/route.ts` implementieren.
- [ ] Prompt-Builder-Funktion `buildGuidePrompt(contextKey, sessionContext)`.
- [ ] Streaming-Response mit `ReadableStream` — kein JSON-Batch.
- [ ] `sessionStorage`-Cache-Layer vor dem API-Call.
- [ ] Teaser-Blur für Free-Tier implementieren.
- [ ] `👍 / 👎`-Feedback speichert in Supabase-Tabelle `botlguide_feedback`.
- [ ] Rate-Limit: BotlGuide-Calls zählen zum `ai_credits_used_this_month` Zähler.
- [ ] Disclaimer-Zeile an jede AI-Antwort anhängen.

---

## 6. AI Integration & Monetization

| Feature Level      | Free            | Brewer (AI)                                            | Brewery / Enterprise                      |
| ------------------ | --------------- | ------------------------------------------------------ | ----------------------------------------- |
| **BotlGuide**      | Statische Texte | Rezept-spezifisches Kontext-Coaching                   | Team-SOPs (Standard Operating Procedures) |
| **Fehleranalyse**  | —               | Live-Troubleshooting bei Anomalien                     | Root Cause Analysis über mehrere Sude     |
| **Vorhersagen**    | —               | Gär-Ende Prognose                                      | Predictive Quality (Hefe-Generationen)    |
| **Effizienz-Tips** | —               | "Deine Sudhausausbeute ist 62% — Tipps zum Verbessern" | Trend-Analyse über alle Sude der Brauerei |

**Technisch:**

- API-Route `/api/botlguide` nimmt `{ contextKey, sessionId, brewStyle }` entgegen.
- Prompt-Builder: Reichert mit Rezept-Target-Values und letzten 5 Messungen an.
- Rate-Limiting: Max. 10 AI-Anfragen/Tag für Brewer Tier, unbegrenzt für Brewery+.
- Fallback: Bei API-Fehler zeigt immer der statische Text.

---

## 7. Implementation Phases

### Phase 1 — Fundament & Data Fix ✅

- [x] Migration: `brew_measurements` um `pressure`, `is_og`, `session_id` (FK) erweitern.
- [x] Metrics auf Single Source konsolidieren: Dual-Source-Logik aus `SessionClient.tsx` entfernen.
- [x] `SessionTabs.tsx` bauen (Sidebar lg+, Bottom Bar mobile) nach `DashboardTabs.tsx`-Pattern.
- [x] Tab-Views extrahieren: Je eigene Datei in `_components/tabs/`:
      `OverviewTab.tsx`, `PlanningTab.tsx`, `BrewDayTab.tsx`, `FermentationTab.tsx`, `ConditioningTab.tsx`, `CompletedTab.tsx`
- [x] Phasen-Sperre entfernen — aktive Phase = Badge, nicht gesperrte Navigation.
- [x] Measurement Edit + Delete mit Inline-Formular.
- [x] Session Notes (Freitext) in Übersicht-Tab mit Debounce-Autosave.
- [x] Batch-Code als Inline-Edit im Header (Klick → Input → Enter/Blur speichert).

### Phase 2 — Brautag-Erlebnis ✅

- [x] Step Sequencer mit persistenten Timer-Events in Timeline.
- [x] Boil-Timeline Countdown mit Audio-Alert (Web Audio API).
- [x] OG + Pre-Boil-Gravity Erfassungsfelder am Ende des Brautags.
- [x] Ad-hoc Ist-Menge für Hopfengaben mit IBU-Delta-Anzeige (`+X% IBU`), persistiert in `measurements.actual_amounts`.
- [x] Screen Wake Lock + iOS Fallback Banner.

### Phase 3 — Gärung & Analyse ✅

- [x] Temperaturkorrektur (SG + gemessene Temp → korrigierter SG).
- [x] Plato/SG Umschalttoggle.
- [x] Edit + Delete für Messwert-Zeilen (inline, mit Bestätigung).
- [x] Leerer-Zustand (0 Messungen) und Einzel-Punkt-Zustand (1 Messung) für Graph.
- [x] Zielkurve als gestrichelte Referenzlinie im Graph.
- [x] Event-Annotations im Graph (Timeline-Marker).
- [x] Hefe-Ernte Workflow (Loggen als Event).

### Phase 4 — BotlGuide (Static Layer) ✅

- [x] `BotlGuideProvider` + `useGuide()` Hook.
- [x] `botlguide-content.json` mit allen Initial-Einträgen.
- [x] `GuideSheet` Side-Sheet Komponente.
- [x] `?`-Icons an allen definierten Stellen einbauen.

### Phase 5 — BotlGuide (AI Layer) + Monetization ✅

- [x] Neuen Prompt-Typ `"guide"` in `/api/generate-text/route.ts` implementieren.
- [x] Prompt-Builder-Funktion `buildGuidePrompt(contextKey, sessionContext)`.
- [x] API-Response (aktuell JSON-Batch, Streaming optional für v2).
- [x] `sessionStorage`-Cache-Layer vor dem API-Call.
- [x] Teaser-Blur für Free-Tier implementieren (UI vorbereitet).
- [x] `👍 / 👎`-Feedback speichert in Supabase-Tabelle `botlguide_feedback`.
- [x] Rate-Limit: BotlGuide-Calls zählen zum `ai_credits_used_this_month` Zähler.
- [x] Disclaimer-Zeile an jede AI-Antwort anhängen.

### Phase 6 — Abschluss & Polish

- [x] Tasting Notes Form mit SRM-Farbswatch und Sterne-Rating.
- [x] Karbonisierungsrechner (in Reifung-Tab integriert).
- [x] PDF-Session-Export (Client-side jsPDF).
- [x] Session archivieren.
- [x] Offline-Queue (localStorage) + Sync-Banner.
- [x] Touch-Target Audit (alle interaktiven Elemente ≥ 48px).
- [x] Mobile Bottom Bar "Mehr ···" Drawer für 5+ Tabs.

---

## 8. Known Issues Resolved in This Plan

| Issue                            | Solution                                      |
| -------------------------------- | --------------------------------------------- |
| Dual gravity source              | Single source: `brew_measurements` only       |
| Sub-routing per Phase            | Tab-State, single URL                         |
| Phases forward-locked            | All tabs accessible, badge shows active phase |
| No measurement edit/delete       | Inline edit + delete per row                  |
| No temperature correction        | Auto-correction shown inline                  |
| Wake Lock — iOS Safari           | Progressive enhancement + Banner              |
| SG input pre-filled              | Placeholder only, never pre-filled            |
| Tasting notes missing            | Dedicated "Abgeschlossen" tab                 |
| Design inconsistency             | Full Admin Dashboard token alignment          |
| Hefe-Ernte missing               | Dedicated workflow in Gärung (Advanced)       |
| BotlGuide had no build plan      | Dedicated Phase 4 + 5                         |
| `pressure` column missing in DB  | Migration in Phase 1                          |
| OG logging flow undefined        | Brautag-Tab Ende + Gärung manuell             |
| Efficiency had no data source    | Pre-Boil Gravity event defined                |
| Advanced toggle not persisted    | `localStorage` keyed by `userId`              |
| Session notes / freeform missing | Session Notes in Übersicht-Tab                |
| Section numbering conflict       | Fixed — 8 distinct sections                   |

---
