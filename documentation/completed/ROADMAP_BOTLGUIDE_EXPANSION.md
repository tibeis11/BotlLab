# Roadmap: BotlGuide 2.0 — Die universelle Brau-Intelligenz
> **Vision:** "Mehr als ein Chatbot — Dein digitaler Braumeister."
> BotlGuide ist die zentrale KI-Marke in BotlLab. Jede intelligente Aktion — vom Etiketten-Design über Rezept-Optimierung bis hin zu proaktivem Gär-Coaching — trägt den Namen BotlGuide. Kein verstreutes "AI-Feature", sondern ein kohärentes Produkt-Erlebnis das Nutzer bindet und Premium-Upgrades antreibt.
> **Status:** ✅ Stages 0–6 vollständig abgeschlossen · Alle Phasen deployed · Letzte Aktualisierung: 2026-03-14

---

## 0. Analyse: Was wir von den Großen lernen

Wir haben die KI-Strategien führender Plattformen analysiert, um Best Practices für BotlGuide abzuleiten.

| Plattform | KI-Marke | Das wichtigste Prinzip |
|---|---|---|
| **HubSpot** | **Breeze** | 3 Schichten: *Assistant* (immer da) → *Agents* (autonom arbeitend) → *Features* (überall eingebettet). Klare Trennung von reaktiv vs. proaktiv. |
| **Canva** | **Magic Studio** | KI nie separat, sondern *"woven through the Visual Suite"* — verwoben in jeden Workflow. Kein eigenes KI-Menü, sondern kontextuelle Buttons (Magic Write, Magic Design, etc.). |
| **Figma** | **Figma AI** | KI als *Beschleuniger*, nie als *Ersatz*. Fokus auf Routine-Aufgaben die nerven, plus generative Features für Kreativität. Credits-System pro Plan. |
| **GitHub** | **Copilot** | Cross-Agent Memory System. KI kennt dein Repository. Konsistentes `✨`-Icon überall. Custom Agents durch Drittanbieter erweiterbar. |
| **Grammarly** | **Go** + Agents | Spezialisierte Agents mit klar definierten Aufgaben (Proofreader, Reader Reactions, Expert Review). Kein "mach alles"-Chat. |

### Unsere 6 Design-Prinzipien für BotlGuide

1. **Ein Name, viele Fähigkeiten** — Nicht "AI-Generator", sondern "BotlGuide Artist". Einheitliche Marke für alle KI-Interaktionen.
2. **Verwoben, nicht isoliert** — Wie Canva: KI-Entry-Points direkt im Context, nicht in einem separaten `/ai`-Bereich.
3. **Kontext ist König** — Wie GitHub Copilot: BotlGuide muss den Nutzer *kennen* — seine Rezepte, Gärhistorie, Inventar, Bierstil. Das ist unser Moat gegenüber jedem generischen KI-Tool.
4. **Spezialisiert, nicht generisch** — Wie Grammarly: Jede Capability hat eine klar definierte Aufgabe. Keine unstrukturierte Chat-Box.
5. **Progressive Disclosure & Monetization** — Wie Figma: Statischer Content kostenlos. KI-Tiefe hinter Credits. Der Wert muss *spürbar* sein, bevor der User zahlt (Teaser-Pattern bereits in `BotlGuideSheet.tsx`).
6. **Trust & Transparency** — Feedback-Loop. Klare Kommunikation was KI kann. Keine Halluzinationen bei Braudaten ("Überprüfe Werte immer manuell").

---

## 1. Core Identity & Branding

### Die Persona
- **Name:** BotlGuide
- **Claim:** "Dein digitaler Braumeister"
- **Tone of Voice:** Professionell, ermutigend, präzise. Kollegiales "Du". Nie belehrend. *"Der erfahrene Braumeister-Kollege der dir über die Schulter schaut — aber nie ungefragt das Wort ergreift."*
- **Sprache:** Primär Deutsch. System-Prompts können Englisch sein (bessere LLM-Performance).

### Visuelles System (passt ins bestehende `DESIGN_SYSTEM.md`)

| Element | Spezifikation | Bestehender Code |
|---|---|---|
| **Primärfarbe** | `from-purple-600 to-indigo-600` Gradient | Bereits in `BotlGuideSheet.tsx` |
| **Badge-Hintergrund** | `bg-purple-950/40 border border-purple-500/20 rounded-full` | Bereits in `BotlGuideSheet.tsx` |
| **Icon** | `Sparkles` (lucide-react) — einheitlich für **alle** BotlGuide-Entry-Points | Bereits in `BotlGuideSheet.tsx` |
| **AI-Content-Marker** | `border-l-2 border-purple-500/50` links von KI-generiertem Inhalt | **NEU** — unterscheidet KI-Output klar von Nutzer-Content |
| **Capability-Farbe** | Purple = KI allgemein. Die Primärfarben des Design Systems bleiben für reguläre UI-Elemente. | Konsistent mit `DESIGN_SYSTEM.md` |

### Naming Convention der Capabilities

| Capability | User-Facing Name | Zuständigkeit | Lucide Icon |
|---|---|---|---|
| `coach` | **BotlGuide Coach** | Brau-Coaching, Fermentations-Analyse, Prozessschritte | `BookOpen` |
| `artist` | **BotlGuide Artist** | Etiketten-Design, Cap-Design, Bild-Generierung (Imagen 4.0) | `Palette` |
| `architect` | **BotlGuide Architect** | Rezept-Entwicklung, Hopfen-Vorschläge, BJCP-Check, Skalierung | `FlaskConical` |
| `copywriter` | **BotlGuide Copywriter** | Namen, Beschreibungen, Social-Media-Posts | `PenTool` |
| `sommelier` | **BotlGuide Sommelier** | Geschmacksprofil-Analyse, Food-Pairing | `Wine` |
| `auditor` | **BotlGuide Auditor** | Inventar-Intelligenz, Rohstoff-Vorhersage *(Future)* | `PackageSearch` |

---

## 2. Ist-Zustand: Was haben wir bereits?

Eine genaue Analyse des bestehenden Codes zeigt: Die Grundlagen sind solider als gedacht. Wir bauen auf einer funktionierenden Infrastruktur auf.

### Bestehende Code-Assets

| Asset | Pfad | Status | Benötigte Aktion |
|---|---|---|---|
| **BotlGuideContext** | `lib/botlguide/BotlGuideContext.tsx` | ✅ Funktional | Erweitern um `capability`-State |
| **Static Content** | `lib/botlguide/content.json` | ✅ 15 Guides | Ausbauen auf 40+ Themen |
| **BotlGuideSheet** | `app/components/BotlGuideSheet.tsx` | ✅ Side-Sheet mit Tier-Gating & Feedback | Refaktor: Multi-Capability |
| **BotlGuideTrigger** | `app/components/BotlGuideTrigger.tsx` | ✅ Kontextueller Help-Button | Erweitern: Capability-Prop |
| **Text-Generation** | `app/api/generate-text/route.ts` | ✅ 6 Types (name, guide, description, label_prompt, optimization, flavor_profile) | Migration ins Unified Gateway |
| **Image-Generation** | `app/api/generate-image/route.ts` | ✅ Labels + Caps via Imagen 4.0 | Migration ins Unified Gateway |
| **Feedback API** | `app/api/botlguide/feedback/route.ts` | ✅ Thumbs Up/Down | Erweitern um Capability-Type |
| **Premium-Check** | `lib/premium-checks.ts` → `canUseAI()` | ✅ Atomares Credit-System (race-condition-sicher via RPC) | Erweitern: Credit-Kosten pro Capability |
| **Credit Display** | `app/components/AICreditsDisplay.tsx` | ✅ Battery-Level UI | Erweitern: Aufschlüsselung nach Capability |
| **Premium Config** | `lib/premium-config.ts` → `SUBSCRIPTION_TIERS` | ✅ 4 Tiers: free/brewer(€4.99)/brewery(€14.99)/enterprise | Granulare Limits ergänzen |
| **Feature Lock** | `app/components/PremiumFeatureLock.tsx` | ✅ Blur-Overlay + Upgrade-CTA | Beibehalten |

### Mapping: Bestehende API-Calls → Neue Capabilities

```
/api/generate-text  (type=name)          → BotlGuide Copywriter  (action: generate_name)
/api/generate-text  (type=description)   → BotlGuide Copywriter  (action: generate_description)
/api/generate-text  (type=guide)         → BotlGuide Coach       (action: explain_step)
/api/generate-text  (type=label_prompt)  → BotlGuide Artist      (action: generate_prompt)
/api/generate-text  (type=optimization)  → BotlGuide Architect   (action: optimize_recipe)
/api/generate-text  (type=flavor_profile)→ BotlGuide Sommelier   (action: analyze_flavor)
/api/generate-image (type=label)         → BotlGuide Artist      (action: generate_label)
/api/generate-image (type=cap)           → BotlGuide Artist      (action: generate_cap)
```

**Wichtig:** Die alten Routen bleiben initial erhalten (Backward Compatibility). Sie werden intern ans neue Gateway delegiert.

---

## 3. Die vier UX-Patterns

### Pattern A: The Side-Coach *(bereits implementiert)*
**Wo:** Session-View, Rezept-Editor, Gärungsverlauf — überall wo der Nutzer Hilfe braucht.
**Trigger:** `BotlGuideTrigger` (❓/ℹ️) Icon neben relevanten Feldern.
**Flow:** Tap → Side-Sheet mit statischem Content (Free) → "BotlGuide AI" Button → KI-Analyse (1-2 Credits).

### Pattern B: The Creator *(teilweise implementiert, nicht einheitlich)*
**Wo:** Label-Erstellung, Rezept-Name, Bierbeschreibung, Cap-Design.
**Trigger:** Expliziter "✨ BotlGuide [Capability]" Button in der Erstellungs-UI.
**Flow:** Tap → `BotlGuideCreator` Modal → KI generiert Output → Annehmen / Regenerieren / Manuell bearbeiten.
**Problem heute:** Logic ist über mehrere Seiten verstreut, kein einheitliches Pattern.

### Pattern C: The Ambient Analyst *(noch nicht implementiert)*
**Wo:** Dashboard, Session-Übersicht, Gärungsverlauf.
**Trigger:** Automatisch — BotlGuide erkennt Muster und zeigt ein unaufdringliches Banner.
**Flow:** Edge Function erkennt Anomalie → Schreibt in `botlguide_insights` → UI zeigt dismissbares Banner ("⚠️ BotlGuide: Deine Gärung stagniert. Analyse ansehen?") → Tap → Side-Sheet.
**Wichtig:** Nie erzwungen. Immer dismissbar. Kein Notification-Overload.

### Pattern D: The Sommelier *(bereits implementiert, aber nicht als eigene Marke)*
**Wo:** Rezept-Detailseite, Brew-Profil.
**Trigger:** "✨ Geschmacksprofil analysieren" Button.
**Flow:** Analysiert Rezeptdaten → Gibt Radar-Chart-Profil zurück (sweetness, bitterness, body, roast, fruitiness). Bereits via `type=flavor_profile` funktional, aber ohne BotlGuide-Branding.

---

## 4. Technische Architektur (Unified Gateway)

### 4.1 Systemarchitektur

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│                                                              │
│  useBotlGuide() Hook                                         │
│  ├── capability, action, context                             │
│  ├── state: idle | loading | streaming | error | complete    │
│  ├── canUse: boolean (premium check via API)                 │
│  ├── creditsRemaining: number                                │
│  └── feedback(vote, text?)                                   │
│                                                              │
│  Komponenten:                                                │
│  ├── <BotlGuideTrigger />   Pattern A: Kontextueller Button  │
│  ├── <BotlGuideSheet />     Pattern A: Side-Sheet Panel      │
│  ├── <BotlGuideCreator />   Pattern B: Generatives Modal     │
│  ├── <BotlGuideInsight />   Pattern C: Proaktives Banner     │
│  ├── <BotlGuideResponse />  Einheitliche Antwort-Darstellung │
│  └── <BotlGuideBadge />     Brand-Element (Sparkles + Name)  │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST /api/botlguide
                     ▼
┌──────────────────────────────────────────────────────────────┐
│            NEXT.JS API ROUTE (app/api/botlguide/route.ts)    │
│                                                              │
│  1. Auth via Supabase                                        │
│  2. canUseAI() → atomares Credit-Check + Increment via RPC   │
│  3. Route zu Capability-Handler (lib/botlguide/capabilities/)│
│  4. Track: ai_usage_logs + analytics_events                  │
│  5. Return: BotlGuideResponse JSON                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│          CAPABILITY HANDLERS (lib/botlguide/capabilities/)   │
│                                                              │
│  coach.ts      Gemini 2.5 Flash + brew_measurements + brew history
│  artist.ts     Gemini Flash (Prompt-Gen) + Imagen 4.0 (Bild)
│  architect.ts  Gemini Flash + BJCP-RAG + Inventar-/Hop-Kontext
│  copywriter.ts Gemini Flash
│  sommelier.ts  Gemini Flash → Radar-Chart JSON
└────────────────────┌─────────────────────────────────────────┘
                     │ (RAG-Queries via pgvector)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   SUPABASE (Data Layer)                      │
│                                                              │
│  Foundation:                                                 │
│  ├── profiles (subscription_tier, ai_credits_*, tier)        │
│  ├── ai_usage_logs                                           │
│  ├── botlguide_feedback                                      │
│  └── check_and_increment_ai_credits (RPC)                    │
│                                                              │
│  Stage 3 ✅ (deployed):                                       │
│  ├── botlguide_embeddings  (pgvector, 768-dim, 24 BJCP seeds)│
│  └── get_user_brew_context (RPC — letzte 5 Sude + Messwerte) │
│                                                              │
│  Stage 4 ✅ (deployed):                                       │
│  └── botlguide_insights  (Proactive Findings, pg_cron)       │
│                                                              │
│  Stage 5 ✅ (deployed):                                          │
│  ├── brews.data JSONB → Rezept-DNA (OG/FG/Batch aus JSONB)    │
│  ├── equipment_profiles → Anlagen-Kontext                    │
│  ├── flavor_profiles → Community Flavor DNA (per Brew)       │
│  ├── ratings → avg-Rating + topRatedBrew                     │
│  └── profiles.tier → Experience-Level in Prompts             │
│                                                              │
│  Edge Functions (✅ alle deployed):                           │
│  ├── aggregate-analytics                                     │
│  ├── evaluate-alerts                                         │
│  ├── expire-subscriptions                                    │
│  ├── botlguide-proactive-check  (Cron alle 6h)               │
│  └── botlguide-embed            (bei Rezept-INSERT/UPDATE)   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Unified Request/Response Schema

```typescript
// POST /api/botlguide
interface BotlGuideRequest {
  capability: 'coach' | 'artist' | 'architect' | 'copywriter' | 'sommelier';
  action: string;
  context: {
    brewId?: string;
    recipeId?: string;
    sessionId?: string;
    breweryId?: string;
    guideKey?: string;        // Coach: key aus content.json
    sessionContext?: object;  // Coach: live Brautags-/Gärdaten
    recipeData?: object;      // Architect/Sommelier: Rezept-Details
    brewType?: string;        // Copywriter/Artist: beer/wine/cider/mead
    style?: string;           // Stil-Angabe
    imageType?: 'label' | 'cap';
    prompt?: string;
  };
}

interface BotlGuideResponse {
  success: boolean;
  capability: string;
  data: {
    text?: string;
    suggestions?: string[];
    imageUrl?: string;
    profile?: { sweetness: number; bitterness: number; body: number; roast: number; fruitiness: number };
    explanation?: string;
  };
  meta: {
    model: string;
    creditsUsed: number;
    creditsRemaining: number;
    responseTimeMs: number;
  };
}
```

### 4.3 Action-Matrix & Credit-Kosten

| Capability | Action | Credits | Beschreibung |
|---|---|---|---|
| `coach` | `explain_step` | 1 | Kontextueller Guide (content.json-Key + Session-Daten) |
| `coach` | `analyze_fermentation` | 2 | Liest `brew_measurements`, erkennt Anomalien |
| `coach` | `predict_fg` | 2 | Gravity-Trend → geschätzte Restdichte + ABV |
| `artist` | `generate_prompt` | 1 | Text-Prompt für Imagen aus Rezeptdaten |
| `artist` | `generate_label` | 3 | Imagen 4.0 → Upload Supabase Storage → URL |
| `artist` | `generate_cap` | 3 | Wie generate_label, Typ=cap |
| `architect` | `optimize_recipe` | 2 | 3-5 Verbesserungsvorschläge als JSON-Array |
| `architect` | `suggest_hops` | 1 | Hopfen-Kombi basierend auf Stil + Lager |
| ~~`architect`~~ | ~~`scale_recipe`~~ | — | *(entfernt — reines Mathe-Tool, kein KI-Mehrwert)* |
| `architect` | `check_bjcp` | 2 | Style-Konformitätsprüfung gegen BJCP |
| `copywriter` | `generate_name` | 1 | Kreativer Bier-/Produkt-Name |
| `copywriter` | `generate_description` | 1 | Sensorische Bierbeschreibung (DE) |
| `copywriter` | `generate_social` | 1 | Social-Media-Post (Instagram/Facebook) |
| `sommelier` | `analyze_flavor` | 2 | Radar-Chart-Profil + Begründung |
| `sommelier` | `suggest_pairing` | 1 | Food-Pairing-Empfehlungen |

*Statischer Guide-Content aus `content.json` ist immer **0 Credits** (Free Tier).*

### 4.4 Ziel-Dateistruktur

```
lib/botlguide/
├── BotlGuideContext.tsx          # ERWEITERN: capability-State, useBotlGuide Hook
├── content.json                  # ERWEITERN: 15 → 40+ Guides
├── types.ts                      # NEU: BotlGuideRequest, Response, Capability-Types
├── constants.ts                  # NEU: System-Prompts, Credit-Kosten Map
├── capabilities/
│   ├── coach.ts                  # NEU: extrahiert aus generate-text (type=guide)
│   ├── artist.ts                 # NEU: merged aus generate-text (label_prompt) + generate-image
│   ├── architect.ts              # NEU: extrahiert aus generate-text (type=optimization)
│   ├── copywriter.ts             # NEU: extrahiert aus generate-text (name, description)
│   └── sommelier.ts              # NEU: extrahiert aus generate-text (flavor_profile)
└── hooks/
    └── useBotlGuide.ts           # NEU: zentraler Frontend-Hook

app/api/botlguide/
├── route.ts                      # NEU: Unified Gateway
└── feedback/
    └── route.ts                  # BEHALTEN

app/components/
├── BotlGuideSheet.tsx            # REFAKTOR: Multi-Capability, BotlGuideResponse nutzen
├── BotlGuideTrigger.tsx          # ERWEITERN: capability-Prop, bessere Sichtbarkeit
├── BotlGuideCreator.tsx          # NEU: Pattern B — Generatives Modal
├── BotlGuideInsight.tsx          # NEU: Pattern C — Proaktives Banner
├── BotlGuideResponse.tsx         # NEU: Einheitliche formatierte KI-Antwort
├── BotlGuideBadge.tsx            # NEU: Wiederverwendbares Brand-Element
└── AICreditsDisplay.tsx          # ERWEITERN: Capability-Aufschlüsselung
```

---

## 5. Implementation Stages

### Stage 0: Infrastruktur & Refactoring *(Woche 1—2)* ✅ Abgeschlossen
> Fundament legen ohne bestehende Features zu brechen. Rein additive Änderungen.

- Alle TypeScript-Interfaces in `lib/botlguide/types.ts` definieren
- System-Prompts + Credit-Kosten in `lib/botlguide/constants.ts` zentralisieren
- Capability-Handler aus `generate-text/route.ts` und `generate-image/route.ts` extrahieren
- Neuen unified `app/api/botlguide/route.ts` Endpoint erstellen
- `lib/botlguide/hooks/useBotlGuide.ts` implementieren
- Alte Routen intern auf neues Gateway delegieren (Backward Compatibility)
- **Deliverable:** Unified Gateway live. Alte Routen als Proxies. Kein Funktionsverlust.

---

### Stage 1: Brand Unification & UX Sweep *(Woche 3—4)* ✅ Abgeschlossen
> Aus "AI generieren" wird "BotlGuide". Sofort sichtbar für User, minimaler Backend-Aufwand.

- `BotlGuideBadge.tsx` als wiederverwendbares Brand-Element
- `BotlGuideResponse.tsx` als einheitliche Antwort-Darstellung (Markdown, `border-l-purple`, Feedback-Buttons)
- `BotlGuideCreator.tsx` als Pattern-B-Modal-Komponente (ersetzt verstreute "Generate"-Buttons)
- **Label-Gen UI** → "BotlGuide Artist" — Creator-Modal mit Kontext-Inputs
- **Recipe Optimize** → "BotlGuide Architect" Badge + einheitlicher Entry-Point
- **Name/Description-Gen** → "BotlGuide Copywriter" Badge
- **Flavor Profile** → "BotlGuide Sommelier" Badge + Food-Pairing CTA
- `content.json` ausbauen: +10 neue Guides (Wasserchemie, Cold Crash, Dry Hopping, Druckgärung, Karbonisierung-Berechnung, Hefe-Harvesting, Läutern, Würzekochen, pH-Einstellung, Auschlagwürze)
- **Deliverable:** Alle KI-Touchpoints tragen BotlGuide-Brand. Einheitliches UX-Pattern.

---

### Stage 2: Enhanced Coach & Sommelier *(Woche 5—7)* ✅ Abgeschlossen
> Die Killer-Features für zahlende Nutzer. Echter Mehrwert durch Daten-Integration.

- **Coach `analyze_fermentation`:** Liest `brew_measurements` aus Supabase, erkennt Stuck Fermentation, Temperatur-Anomalien, zu schnelle/langsame Gärung → konkrete Handlungsempfehlungen
- **Coach `predict_fg`:** Gravity-Trend-Analyse → geschätzte Restdichte + Alkohol + Vergleich BJCP-Zielwerte
- **Architect `suggest_hops`:** Hopfen-Vorschläge basierend auf Stil, Ziel-IBU, ggf. Lagerbestand
- ~~**Architect `scale_recipe`:**~~ *(entfernt — reines Mathe-Tool, kein KI-Mehrwert)*
- **Sommelier `suggest_pairing`:** Food-Pairing als strukturiertes JSON, Integration in Brew-Profil-Seite
- **Copywriter `generate_social`:** Social-Media-Post für Instagram/Facebook aus Bier-Daten
- **Supabase RPC `get_user_brew_context`:** Aggregiert last-5-Sude + aktuelle Session-Messpunkte für Kontext
- Integration in **Session-View** (Gärungs-Tab): BotlGuide Coach Button + Fermentations-Analyse CTA
- **Deliverable:** BotlGuide Coach und Sommelier als klare Premium-Argumente live. ✅

---

### Stage 3: The Context Engine — RAG *(Woche 8—11)* ✅ Abgeschlossen
> BotlGuide kennt DICH. Nicht generisch — personalisiert. Das ist unser Moat.

- **Supabase pgvector Migration:** `CREATE EXTENSION IF NOT EXISTS vector;` + `botlguide_embeddings` Tabelle
- **BJCP Style Guide Embeddings:** 100+ Bierstil-Definitionen als statische Embeddings (initialer Seed-Run)
- **Supabase Edge Function `botlguide-embed`:** Trigger bei Rezept-CRUD → generiert Embedding via Gemini Embedding API → speichert in `botlguide_embeddings`
- **Architect RAG-Integration:** Bei `check_bjcp` und `optimize_recipe` → Top-3 ähnliche Embeddings als Prompt-Kontext
- **Coach Kontext-Erweiterung:** Historische Gärdaten + Rezepthistorie als Kontext-Layer
- **Inventar-Integration:** Architect kennt vorhandene Rohstoffe → "Du hast noch Citra auf Lager, verwende den statt Amarillo"
- `premium-config.ts` erweitern: `rag_access: boolean` per Tier (nur Brewery + Enterprise)
- **Deliverable:** BotlGuide kennt Inventar und Rezepthistorie. Antworten sind spürbar besser.

---

### Stage 4: Proactive Insights — Ambient AI *(Woche 12—14)* ✅ Abgeschlossen
> BotlGuide kommt zu DIR. Nicht du zu ihm. Der "Wow"-Effekt für Premium-Retention.

- **Supabase Edge Function `botlguide-proactive-check`** (Cron alle 6h):
  - Prüft alle aktiven Sessions: Gravity-Stagnation > 48h, Temperatur außerhalb Zielbereich, Session-Dauer vs. Bierstil-Norm
  - Schreibt Findings in neue `botlguide_insights` Tabelle
  - Nur für Premium-User (Brewery/Enterprise)
- **`BotlGuideInsight.tsx`** (Pattern C): Dismissbares Banner auf Dashboard + Session-View
- **Dashboard-Integration:** Neuer "BotlGuide sagt..." Abschnitt mit letzten 3 Insights
- **Settings-Toggle:** "Proaktive BotlGuide Insights" opt-out Option
- **Notification-Bridge:** Kritische Findings → `NotificationBell` + optional E-Mail
- **Deliverable:** BotlGuide warnt proaktiv bei Problemen. Drastische Retention-Verbesserung.

---

### Stage 5: Context-Anreicherung — Brewing DNA *(aktuell in Planung)*
> BotlGuide kennt nicht nur deine letzten 5 Sude — er soll deine Brauer-DNA verstehen: Ausrüstung, Geschmacksprofil, Bewertungshistorie, Equipment-Parameter. Keine Änderung am API-Vertrag nötig — nur tiefere Kontextschichten im bestehenden Gateway.

**Daten-Audit-Ergebnis (abgeschlossen 2026-03-04)**

| Tabelle | Relevante Felder | Priorität | Nutzungspotenzial für BotlGuide |
|---|---|---|---|
| `brews.data` JSONB | Malze, Hopfen, Hefe-Arrays | 🔥 Sofort | Rezept-DNA in `get_user_brew_context` → Coach & Architect |
| `profiles.tier` | hobby/geselle/meister/… | 🔥 Sofort | `experienceLevel` → Erklärungstiefe aller Prompts anpassen |
| `equipment_profiles` | `batch_volume_l`, `brew_method`, `boil_off_rate`, `grain_absorption` | ✅ Deployed | Anlagen-Kontext für alle Architect-Prompts (Mengen in Gramm statt %) |
| `flavor_profiles` | `sweetness`, `bitterness`, `body`, `roast`, `fruitiness` (0–1) | ✅ Deployed | Community Flavor DNA: aggregiert alle Profile die über die Brews dieses Brauers abgegeben wurden (Beat the Brewer / Ratings) |
| `likes` (auf fremde Brews) | `user_id`, `brew_id` → JOIN `brews.style/data` | ✅ Deployed | Inspirations-Signal: Top-3 Stile + Top-3 Hopfen aus geliketen Fremd-Rezepten → `inspirationSignal` RPC-Key, `buildInspirationContext()` in route.ts, injiziert in Architect + Sommelier Prompts (`20260314150000_stage5_inspiration_signal.sql`) |
| `botlguide_feedback` | `context_key` (Guide-Key, z.B. `rast.maltoserast`), `feedback` (up/down) | ✅ Deployed | Prompt-Stil-Adapter via neuem `capability` Feld: `feedbackProfile` RPC-Key aggregiert Up/Down pro Capability → `buildFeedbackContext()` injiziert Kalibrierungshinweis wenn ≥50% Down-Votes (≥3 Stimmen). `BotlGuideResponse` sendet Feedback jetzt selbst an API wenn `capability` Prop gesetzt. (`20260314170000_stage5_feedback_capability.sql`) |
| `ratings` | `rating` (1–5), `comment`, `brew_id` | ✅ Deployed | Rezept-Erfolgs-Score: avg-Rating + ratingCount in Brew History, `topRatedBrew` Highlight |
| `breweries.description` | Freitext | ✅ Deployed | Brand Voice direkt in Copywriter-Prompts injiziert (max. 300 Chars) |
| `brewing_sessions.timeline` | Vollständiges Sudtagebuch (JSONB) | ✅ Deployed | Prozess-Kontext: phase/status, Session-Notizen, Brautag-NOTE-Events → Coach-Prompts angereichert (`20260314160000_stage5_location_session_context.sql`) |
| `breweries.location` | Standort-Text | ✅ Deployed | Wasserchemie-Proxy: `inferWaterChemistry()` mappt bekannte Städte auf Hinweise (München → weiches Wasser/Weizen, Burton → Sulfat/IPA etc.) → Equipment-Kontext angereichert (`20260314160000_stage5_location_session_context.sql`) |

**Kontext-Architektur (Zwei-Schichten-Modell)**
- **Layer 1 — Brewery-Ebene (primär):** Equipment-Profil, Community Flavor DNA (aggregiert aus `flavor_profiles` über die Brews des Brauers), Brand Voice, Wasserchemie-Proxy
- **Layer 2 — User-Ebene (Multiplikator):** Experience Level via `profiles.tier`, Insprations-Signal via `likes` (gelikte Fremd-Rezepte), Feedback-Präferenzen via `botlguide_feedback`
- **Hobbybrauer ohne Team:** Brewery-Ebene = User-Ebene (dieselbe Person) → Layer 1+2 werden zusammengeführt

**Implementierungs-Reihenfolge**
1. `brews.data` JSONB in `get_user_brew_context` einbeziehen (Malze/Hopfen/Hefe-Arrays)
2. `profiles.tier` → `experienceLevel` in alle Prompt-Builder übergeben
3. `equipment_profiles` per `brewery_id` laden → Architect-Prompts anreichern
4. `flavor_profiles` aggregieren → Community Flavor DNA: alle Bewertungen über die eigenen Brews (WHERE brew_id IN user's brews, NICHT user_id)
5. `botlguide_feedback` per User aggregieren → Prompt-Stil adaptieren
6. `breweries.description` → Brand Voice via LLM extrahieren → `breweries.botlguide_voice_config` JSON
- **Deliverable:** BotlGuide-Antworten sind spürbar persönlicher. Keine generischen Empfehlungen mehr.

---

### Stage 6: Enterprise & Team Intelligence *(Future)*
> BotlGuide als interner Brauerei-Wissens-Assistent.

- Team Owner lädt eigene SOPs/Handbücher als PDF hoch
- PDF-Chunking + Embedding-Pipeline → teamspezifische RAG-Basis
- BotlGuide beantwortet Team-spezifische Fragen ("Wie reinigen wir Tank 3?")
- Audit-Log für Compliance: Wer hat wann was generiert
- Custom Brand Voice konfigurierbar pro Brauerei
- White-Label BotlGuide für Enterprise-Brauereien

---

## 6. Monetization & Credit-System

### Credit-Kosten Zusammenfassung

Statischer Guide-Content = **0 Credits** (Free). KI-Analyse = **1-3 Credits** je nach Aufwand. Bilder = **3 Credits** (Imagen 4.0 API-Kosten). **Free-User erhalten 5 Teaser-Credits/Monat** – sie können KI vollwertig ausprobieren, bevor sie upgraden. Nach Erschöpfung erscheint ein Upgrade-CTA.

### Tier-Matrix (Erweiterung von `lib/premium-config.ts`)

| Tier | Credits/Monat | Coach | Artist | Architect | Copywriter | Sommelier | RAG-Kontext | Proactive |
|---|---|---|---|---|---|---|---|---|
| **Free** | 5 Teaser | ✅ AI (1-2 Cr) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Brewer** (€4.99) | 50 | ✅ AI (1-2 Cr) | ✅ Labels (3 Cr) | ✅ Optimize (2 Cr) | ✅ (1 Cr) | ✅ (2 Cr) | ❌ | ❌ |
| **Brewery** (€14.99) | 200 | ✅ + Fermentation | ✅ + Caps | ✅ + BJCP-Check | ✅ + Social | ✅ + Pairing | ✅ Rezepte | ✅ Dashboard |
| **Enterprise** | ∞ | ✅ + Batch-Analyse | ✅ | ✅ + Inventar-RAG | ✅ | ✅ | ✅ Team-SOPs | ✅ + Push |

### Upsell-Touchpoints (bereits teils implementiert)

1. **Static → AI Unlock:** Blur-Teaser in `BotlGuideSheet.tsx` — beibehalten und verbessern
2. **Credit-Erschöpfung:** `AICreditsDisplay.tsx` zeigt "Wenig übrig" in Rot + Upgrade-CTA
3. **Feature-Lock:** `PremiumFeatureLock.tsx` bei gesperrten Capabilities
4. **Credit-Erschöpfung (Free Teaser):** Nach 5 Free-Credits zeigt der BotlGuide: *„Deine Teaser-Credits sind aufgebraucht – upgrade auf Brewer für 50 Credits/Monat."*
5. **Post-Generation:** Nach jeder KI-Nutzung: Credits-Anzeige + "X Credits übrig. [Upgrade für mehr →]"

---

## 7. Qualitätssicherung & Verantwortungsvolle KI

### Prompt-Standards
- Jeder System-Prompt enthält einen **Scope-Limiter**: *"Du bist ein Braumeister-Assistent. Antworte ausschließlich zu Brau- und Fermentations-Themen."*
- Alle Prompts haben **explizite Wortlimits** (verhindert Token-Verschwendung, erzwingt Präzision)
- **Halluzinations-Guard:** *"Wenn du dir nicht sicher bist, sage das. Erfinde keine Zielwerte oder Rezepte."*
- **Keine kritischen Aussagen:** Kein medizinischer/rechtlicher Rat. Kein Steuer-/Gewerbe-Rat.

### Feedback-Loop
- Bestehender `/api/botlguide/feedback` Endpunkt wird um `capability` und `action` Felder ergänzt
- Optional: Freitext bei 👎 ("Was war falsch?")
- Admin-Dashboard: Feedback-Score pro Capability (visuell wie Analytics-Charts)
- Regel: > 20% Thumbs-Down für einen Prompt-Type → Auto-Alert + Prompt-Review

### Testing
- Testskripte nach dem Muster von `test_analytics.js`:
  - `test_botlguide_coach.js` — alle Coach-Actions mit Mock `brew_measurements`-Daten
  - `test_botlguide_architect.js` — Rezeptoptimierung mit bekannten Referenz-Rezepten
  - `test_botlguide_credits.js` — Credit-Check, Rate-Limit, Edge Cases
- **Prompt-Regressions-Suite:** Goldene Referenz-Outputs. Bei Prompt-Änderungen wird verglichen.

---

## 8. Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| **Google API-Kosten zu hoch** | Mittel | Hoch | Credit-System begrenzt Usage. `ai_usage_logs` für Monitoring. Budget-Alert in GCP Console. |
| **Halluzinationen bei Brau-Tipps** | Mittel | Hoch | Scope-Prompts. Feedback-Loop. "Ich bin nicht sicher" ausdrücklich erlauben. |
| **Vercel Timeout bei Imagen 4.0** | Hoch | Mittel | Imagen braucht ~10-15s. Next.js Pro: 60s Timeout. Loading-Skeleton im UI. |
| **RAG-Qualität zu niedrig** | Mittel | Mittel | Start mit manuell kuratierten BJCP-Embeddings. User-Embeddings erst Stage 3. |
| **User ignorieren BotlGuide** | Niedrig | Hoch | Proactive Insights (Stage 4) bringt BotlGuide aktiv zum User. Teaser-Pattern erzeugt Neugier. |
| **Prompt-Injection** | Niedrig | Mittel | System-Prompts ausschließlich im Backend. User-Input wird escaped. Kein Code-Execution. |

---

## 9. Erfolgskennzahlen (KPIs)

| KPI | Ziel (6 Monate) | Messung |
|---|---|---|
| **BotlGuide Adoption Rate** | 40% der aktiven User nutzen mind. 1×/Monat BotlGuide | `ai_usage_logs` COUNT DISTINCT user_id |
| **Ø Credits/Monat (Premium)** | 25 Credits (50% Auslastung) | `profiles.ai_credits_used_this_month` AVG |
| **Upsell-Conversion** | 5% der Free-User upgraden nach BotlGuide-Teaser-Klick | `analytics_events` WHERE type = 'botlguide_upgrade_cta' |
| **Feedback-Score** | > 80% Thumbs-Up | `botlguide_feedback` Aggregation |
| **Response Time P95** | < 8s Text, < 20s Bild | `analytics_events.response_time_ms` P95 |

---

## 10. Vollständige Implementierungs-Checkliste

### Stage 0: Infrastruktur *(Woche 1—2)* ✅
- [x] `lib/botlguide/types.ts` — TypeScript-Interfaces: `BotlGuideRequest`, `BotlGuideResponse`, `BotlGuideCapability`, `BotlGuideAction`, `CreditCost`
- [x] `lib/botlguide/constants.ts` — System-Prompts Map, Credit-Kosten Map, Action-Matrix
- [x] `lib/botlguide/capabilities/coach.ts` — Handler aus `generate-text/route.ts` (type=guide) extrahiert
- [x] `lib/botlguide/capabilities/copywriter.ts` — Handler aus type=name, type=description extrahiert
- [x] `lib/botlguide/capabilities/artist.ts` — Handler merged aus generate-text (label_prompt) + generate-image
- [x] `lib/botlguide/capabilities/architect.ts` — Handler aus type=optimization extrahiert
- [x] `lib/botlguide/capabilities/sommelier.ts` — Handler aus type=flavor_profile extrahiert
- [x] `app/api/botlguide/route.ts` — Unified Gateway mit Auth, Credit-Check, Routing, Logging
- [x] `lib/botlguide/hooks/useBotlGuide.ts` — Frontend-Hook (fetch, state, credits, error)
- [x] Alte `/api/generate-text` und `/api/generate-image` intern auf Gateway delegiert
- [x] `ai_usage_logs` Schema erweitert: `capability TEXT`, `action TEXT` Spalten
- [ ] Testskript: `test_botlguide_gateway.js` — alle Capabilities/Actions durchlaufen

### Stage 1: Brand Unification *(Woche 3—4)* ✅
- [x] `app/components/BotlGuideBadge.tsx` — `<BotlGuideBadge capability="artist" />` wiederverwendbar
- [x] `app/components/BotlGuideResponse.tsx` — Markdown-Render, `border-l-2 border-purple-500`, Feedback-Buttons, Credit-Anzeige
- [x] `app/components/BotlGuideCreator.tsx` — Pattern-B Modal: Capability-Prop, Context-Inputs, Generate-Button, Result-Preview
- [x] `BotlGuideSheet.tsx` refaktoriert: Nutzt `BotlGuideResponse` + `BotlGuideBadge`. Multi-Capability-Support.
- [x] Label-Gen Page: "✨ BotlGuide Artist" als Creator-Modal integriert
- [x] Recipe-Optimize CTA: BotlGuideBadge + Architect-Bezeichnung
- [x] Name/Description-Gen: BotlGuideBadge + Copywriter-Bezeichnung
- [x] Flavor-Profile: BotlGuideBadge + Sommelier-Bezeichnung + Food-Pairing Hint
- [x] `content.json` +10 neue Guides: Wasserchemie, Cold Crash, Dry Hopping, Druckgärung, Karbonisierungs-Berechnung, Hefe-Harvesting, Läutern, Würze-Kochen, pH-Einstellung, Stammwürze-Korrektur
- [x] `DESIGN_SYSTEM.md` um BotlGuide-Abschnitt ergänzt (Farben, Icons, Patterns)

### Stage 2: Enhanced Capabilities *(Woche 5—7)* ✅
- [x] `coach.ts` — `analyze_fermentation` Action: liest `brew_measurements`, erkennt Anomalien, gibt Handlungsempfehlungen
- [x] `coach.ts` — `predict_fg` Action: Gravity-Trend → FG-Schätzung + ABV
- [x] `sommelier.ts` — `suggest_pairing` Action: Food-Pairings als JSON `[{food, reason}]`
- [x] `architect.ts` — `suggest_hops` Action (inkl. Inventar-Check + Brauhistorie)
- ~~`architect.ts` — `scale_recipe` Action~~ *(entfernt — reines Mathe-Tool)*
- [x] `copywriter.ts` — `generate_social` Action (Instagram/Facebook-optimiert)
- [x] Supabase RPC `get_user_brew_context` — aggregiert letzte 5 Sude + aktuelle Messpunkte
- [x] Session-View: BotlGuide Coach Button im Gärungs-Tab. Fermentationsanalyse CTA.
- [x] Brew-Profil Seite: Food-Pairing Abschnitt unter Geschmacksprofil
- [x] `AICreditsDisplay.tsx` erweitert: zeigt letzte genutzte Capability

### Stage 3: Context Engine — RAG *(Woche 8—11)* ✅
- [x] Supabase Migration: `CREATE EXTENSION IF NOT EXISTS vector;`
- [x] Migration: `botlguide_embeddings (id, source_type, source_id, user_id, content, embedding vector(768), created_at)` + UNIQUE-Constraint-Fix (`20260313120000`)
- [x] BJCP Style Guide als JSON aufbereitet (24 Kategorien)
- [x] Seed-Run: 24/24 BJCP-Embeddings via `gemini-embedding-001` (v1beta, 768 dim) → Production ✅
- [x] Supabase Edge Function `botlguide-embed` deployed: Trigger bei Rezept-INSERT/UPDATE → Embedding generieren
- [x] Auto-Embed on save in `BrewEditor.tsx` (fire-and-forget IIFE bei CREATE + UPDATE)
- [x] `architect.ts` — RAG-Query bei `check_bjcp` und `optimize_recipe`: cosine-similarity → Top-3 als Kontext
- [x] `coach.ts` — Historische Session-Daten als Kontext-Layer via `get_user_brew_context` RPC
- [x] Inventar-Abfrage in `architect.suggest_hops`: Brauhistorie + bekannte Hopfen in Prompt eingewoben
- [x] `premium-config.ts` erweitert: `rag_access: boolean` — nur Brewery + Enterprise
- [ ] Testskript: `test_botlguide_rag.js` — Embedding-Qualität und Retrieval-Relevanz prüfen

### Stage 4: Proactive Insights *(Woche 12—14)* ✅
- [x] Supabase Migration: `botlguide_insights` Tabelle + `botlguide_insights_enabled` Column auf `profiles`
- [x] Supabase Edge Function `botlguide-proactive-check` deployed (Cron: alle 6 Stunden via pg_cron)
  - [x] Prüflogik: Gravity-Stagnation > 48h
  - [x] Prüflogik: Temperatur außerhalb Hefe-Toleranz
  - [x] Prüflogik: Session-Dauer > Bierstil-Norm
  - [x] Schreibt Findings in `botlguide_insights` (nur Premium-User)
- [x] `app/components/BotlGuideInsight.tsx` — dismissbares Banner (Pattern C) + kompakter Modus
- [x] Dashboard: "BotlGuide sagt..." Sektion mit letzten 3 Insights
- [x] Session-View: Insight-Banner bei aktiven Sessions (via `useBotlGuideInsights` Hook)
- [x] `app/account/page.tsx`: Opt-out Toggle für proaktive Insights (Privacy-Tab)
- [x] Notification-Bridge: `NotificationBell` integration für kritische Findings

### Stage 5: Context-Anreicherung — Brewing DNA *(vollständig ✅)*

**Sofort (1–2h Aufwand)**
- [x] `brews.data` JSONB in `get_user_brew_context` RPC einbeziehen — Malze, Hopfen, Hefe-Arrays aus jedem Sud (`20260314100000_stage5_brew_context_enrichment.sql`)
- [x] `profiles.tier` als `experienceLevel` über `buildPrompt()` an alle Prompt-Builder übergeben (Anfänger-Erklärungen vs. Profi-Kurzfassung)

**Nächste Iteration**
- [x] `equipment_profiles` per `brewery_id` laden → Architect-Prompts anreichern (`batch_volume_l`, `brew_method`, `boil_off_rate`) (`20260314110000_stage5_equipment_flavor_dna.sql`)
- [x] `flavor_profiles` per Brewery aggregieren → Community Flavor DNA: alle Bewertungen über die eigenen Brews (`20260314110000_stage5_equipment_flavor_dna.sql`)
- [x] `needsFullContext` jetzt für alle `architect.*`, `sommelier.*`, `coach.analyze_fermentation`, `coach.predict_fg` aktiv (ersetzt alten `needsBrewHistory`)

**Bugfixes (2026-03-04) — `20260314140000_fix_rpc_og_fg_flavor_dna.sql`**
- [x] FIX: `b.og`, `b.fg`, `b.batch_size_liters` existieren nicht als Spalten → jetzt korrekt via `data->>'og'` etc. aus JSONB extrahiert (Bug seit Stage 3)
- [x] FIX: `flavorDna` aggregierte `WHERE fp.user_id = p_user_id` (= Consumer-Perspektive) → korrigiert zu `WHERE fp.brew_id IN (brews des Brauers)` (= Community-Bewertung der eigenen Biere)

**Stage 5 Extended (2026-03-14) — `20260314150000_stage5_inspiration_signal.sql`**
- [x] `likes` auf fremde Brews → `inspirationSignal` in RPC: Top-3 Stile + Top-3 Hopfen aus geliketen Fremd-Rezepten als Kontext-Zeile in alle Architect/Sommelier-Prompts

**Stage 5 Extended II (2026-03-04) — `20260314160000_stage5_location_session_context.sql`**
- [x] `breweries.location` → Wasserchemie-Proxy: `inferWaterChemistry()` mappt bekannte Städte/Regionen auf Wasserhinweise, im Equipment-Kontext aller Architect/Coach-Prompts
- [x] `brewing_sessions.{phase,status,notes,current_gravity,apparent_attenuation,timeline}` → `sessionContext` RPC-Key: Prozess-Kontext in `coach.analyze_fermentation` und `coach.predict_fg`

**Stage 5 Extended III (2026-03-04) — `20260314170000_stage5_feedback_capability.sql`**
- [x] `botlguide_feedback.capability` Spalte hinzugefügt (nullable, rückwärtskompatibel)
- [x] `feedbackProfile` RPC-Key: aggregiert Up/Down pro Capability für diesen User
- [x] `buildFeedbackContext()` in route.ts: injiziert Kalibrierungshinweis wenn ≥50% Down-Votes (≥3 Stimmen) für die aktuelle Capability
- [x] `BotlGuideResponse` Component: neues `capability` Prop, sendet Feedback selbst an API (fire-and-forget), Thumbs-Buttons jetzt immer sichtbar wenn `capability` oder `onFeedback` gesetzt
- [x] FermentationTab: `capability` Prop an `BotlGuideResponse` übergeben
- [x] BotlGuideSheet: `capability: 'coach.guide'` in Feedback-Call eingefügt

**Später**
- [x] `botlguide_feedback` per User aggregieren → Prompt-Stil adaptieren („zu vage“, „zu technisch“) → deployed `20260314170000`
- [x] `ratings` aggregieren → Rezept-Erfolgs-Score: avg-Rating + ratingCount pro Sud in Brew History, `topRatedBrew` als separater Kontext-Highlight (`20260314120000_stage5_recipe_success_score.sql`)
- [x] `brewing_sessions.timeline` JSONB als detaillierter Prozess-Kontext → `sessionContext` RPC-Key in Coach-Prompts (`20260314160000`)
- [x] `breweries.location` als Wasserchemie-Proxy → `inferWaterChemistry()` in Equipment-Kontext aller Prompts (`20260314160000`)

**Stage 5 Final (2026-03-14) — `20260314180000_stage5_brand_voice.sql`**
- [x] `breweries.description` → Brand Voice direkt in alle 4 Copywriter-Prompts injiziert (Name, Description, Label Prompt, Social)
- [x] `equipmentProfile` RPC-Key um `breweryName` + `description` ergänzt (kein ALTER TABLE nötig)
- [x] `buildBrandVoiceContext()` — kürzt auf 300 Chars, gibt '' zurück wenn leer
- [x] `needsFullContext` erweitert auf alle `capability.startsWith('copywriter.')`

### Stage 6: Enterprise & Team Intelligence *(deployed ✅)*

**Stage 6 (2026-03-04) — `20260314190000_stage6_enterprise_team_intelligence.sql`**
- [x] Schema: `team_knowledge_base` — SOP/Handbuch-Metadaten mit Status-Tracking (pending → processing → ready)
- [x] Schema: `team_knowledge_chunks` — Chunked Text mit HNSW-indexierten `vector(768)` Embeddings
- [x] Schema: `brewery_settings` — per-Brewery BotlGuide-Konfiguration (Custom Brand Voice, Limits, Toggles)
- [x] Schema: `botlguide_audit_log` — Compliance-Audit-Trail für jeden BotlGuide-Call (User, Capability, Credits, Response Time, RAG Sources, Status)
- [x] Storage: `team-documents` (private Bucket) mit RLS per `brewery_members` Rolle
- [x] RPC: `search_team_knowledge(p_query_embedding, p_brewery_id, p_match_count, p_min_similarity)` — Cosine-Similarity-Suche
- [x] RPC: `get_botlguide_usage_stats(p_days)` — Admin-Analytics (Usage/Capability, P50/P95, Error Rate, Daily Trend, Team RAG Usage)
- [x] Edge Function: `botlguide-team-embed` — Text-Chunking (Sliding Window, 500 Chars, 100 Overlap) + Gemini Embedding (768-dim) + PDF-Extraktion (Fallback)
- [x] API: `/api/botlguide/team-knowledge` — Upload, List, Delete Endpunkte (Enterprise-only Gate + brewery_members Role Check)
- [x] route.ts: `fetchTeamRagContext()` — Team-Knowledge-RAG für Enterprise-User integriert in alle Prompts
- [x] route.ts: `logBotlGuideAudit()` — Non-blocking Audit-Log bei jedem Success + Error
- [x] route.ts: Custom Brand Voice aus `brewery_settings.botlguide_voice_config` überschreibt auto-extrahierte `breweries.description`
- [x] UI: `TeamKnowledgeManager` Komponente in Team Settings → "BotlGuide Wissen" Tab (Datei-Upload, Text einfügen, Dokument-Liste, Status-Tracking)
- [x] UI: Responsible-AI Disclaimer in `BotlGuideResponse` — *"Generiert von BotlGuide AI · Überprüfe Werte immer manuell"*
- [x] Admin: BotlGuide Analytics View — Usage/Feedback Toggle, KPI Cards (Calls, Credits, Users, P95), Capability-Tabelle, Daily Trend Chart, Error Rate, Team RAG Monitoring
- [x] Premium: `team_sop_upload` Feature Flag in `TierFeatures` (nur Enterprise = true)

### Qualität & Monitoring *(teilweise in Stage 6 umgesetzt)*
- [x] Admin-Dashboard: BotlGuide Analytics Card (Usage pro Capability, Feedback-Score, P95 Response Time) → über `get_botlguide_usage_stats` RPC
- [ ] `analytics_events` Events definieren: `botlguide_interaction`, `botlguide_upgrade_cta`, `botlguide_feedback`, `botlguide_insight_dismissed`
- [ ] Prompt-Regressions-Test-Suite: Golden Outputs für alle 15 Actions speichern
- [ ] Google API Budget-Alert in GCP Console konfigurieren
- [x] Responsible-AI Disclaimer-Text in alle Creator-Modals: *"Generiert von BotlGuide AI · Überprüfe Werte immer manuell"*
- [ ] Feedback-Score Monitoring: Auto-Alert in Admin bei < 80% Thumbs-Up für eine Capability

---

## 11. Priorisierung & Zeitplan

```
[✅ Abgeschlossen]   Stage 0 — Infrastruktur          (Unified Gateway, Capability-Handler, Typen)
[✅ Abgeschlossen]   Stage 1 — Brand Unification      (BotlGuideBadge, Creator-Modal, UX-Sweep)
[✅ Abgeschlossen]   Stage 2 — Capabilities           (Coach/Predict FG, Architect/Hopfen, Sommelier)
[✅ Abgeschlossen]   Stage 3 — Context Engine RAG     (pgvector, BJCP-Seed 24/24, Brew-History Kontext)
[✅ Abgeschlossen]   Stage 4 — Proactive Insights     (Edge Function Cron, Insight-Banner, Dashboard)
    ↓
[✅ Abgeschlossen]   Stage 5 — Context-Anreicherung   (Brewing DNA + Brand Voice: 8 Migrations, alle Keys deployed)
    ↓
[✅ Abgeschlossen]   Stage 6 — Enterprise              (Team-SOPs, PDF-Pipeline, Audit-Log, Brand Voice, Admin Analytics)
```

---

> **Fazit:** BotlGuide ist nicht "noch ein AI-Feature" — es ist unser *competitive moat*. Kein anderes Homebrewing-Tool hat eine KI, die den Brauer persönlich kennt, sein Inventar versteht, proaktiv bei Gärproblemen warnt und gleichzeitig kreative Etiketten und Rezepte liefert. Das ist kein ChatGPT-Wrapper — das ist ein digitaler Braumeister. **Alle 7 Stages (0–6) sind live in Production.** Stage 5 hat die persönlichen Kontext-Schichten vertieft (Equipment, Flavor DNA, Erfahrungslevel, Brand Voice). Stage 6 erweitert BotlGuide um Enterprise-Features: Team-SOPs als RAG-Wissenbasis, Custom Brand Voice pro Brewery, Compliance-Audit-Log und Admin-Analytics mit P95-Monitoring. Das ist unser Moat.
