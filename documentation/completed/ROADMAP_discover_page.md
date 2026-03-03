# ROADMAP: Neue Discover / Rezepte-Kartei

**Ziel:** Die beste Heimbrau-Rezepte-Datenbank im deutschsprachigen Raum bauen.  
**Philosophie:** Qualität über Quantität. Jede Karte zeigt nur das Wichtigste – wer mehr will, klickt.

---

## 🗓 Aktueller Stand — 22. Februar 2026

| Stufe    | Beschreibung                                                   | Status                                                                                                                                                                            |
| -------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stufe 1  | Datenbank-Vorbereitung (Schema, Indizes, Trigger)              | ✅ Abgeschlossen (Migration `20260220120000` via `db reset` lokal angewendet)                                                                                                     |
| Stufe 2  | Phase 1 – UI-Fixes                                             | ✅ Abgeschlossen                                                                                                                                                                  |
| Stufe 3  | Phase 2 – Filter & Suche                                       | ✅ Abgeschlossen (URL-Params ✅, 2.2 Zutaten ✅, 2.3 Fix ✅, 2.3a ✅)                                                                                                             |
| Stufe 4  | Phase 2.5 – Quality Score                                      | ✅ Abgeschlossen (Funktion + Trigger + Backfill deployed)                                                                                                                         |
| Stufe 5  | Phase 2.6 – Mobile-First UX                                    | ✅ Abgeschlossen (Bottom-Sheet ✅, Stil-Chips ✅, 1-Spalte ✅)                                                                                                                    |
| Stufe 6  | Phase 3+ – Badges, Copy-CTA, SSR                               | ✅ Abgeschlossen (✓ Bewährt ✅, Komplexitäts-Badge ✅, Copy-CTA ✅, SSR ✅, SEO ✅)                                                                                               |
| Stufe 7  | Phase 4 – Erweiterte Features                                  | ✅ Abgeschlossen (Vollbild-Overlay ✅, Infinite Scroll ✅, pg_cron Trending ✅)                                                                                                   |
| Stufe 8  | Admin Quality Score Panel                                      | ✅ Abgeschlossen (Score-Verteilung ✅, Low-Quality-Liste ✅, Trending Override ✅, Featured Manager ✅, Discover Threshold ✅)                                                    |
| Stufe 9  | Bug Fixes + Live-Trending-Trigger                              | ✅ Abgeschlossen (Like-State-Sync aller Sektionen ✅, Trigger feuert bei Like+Unlike ✅, Pin-Override respektiert ✅)                                                             |
| Stufe 10 | YT-Music-Redesign aller Karten-Varianten                       | ✅ Abgeschlossen (Portrait ✅, Hero ✅, Compact ✅, Highlight ✅, Insight-Banner ✅, TS-clean ✅)                                                                                 |
| Stufe 11 | Phase 5.1 – Personalisierungs-Engine                           | ✅ Abgeschlossen (Engine ✅, brew_views-Migration ✅, „Für dich"-Sektion ✅, Fallback ✅, TS-clean ✅)                                                                            |
| Stufe 12 | Phase 5.2 – Implizite Signale (B) + Kollaborativ (C)           | ✅ Abgeschlossen (`useBrewViewTracker` ✅, Dwell-Time ✅, Collab-RPC ✅, DSGVO-Opt-Out ✅, Datenschutzerklärung ✅, Admin P-Score-Badge ✅, TS-clean ✅)                          |
| Stufe 13 | Phase 5.3 – Ratings-Signal + Warum-Tooltip + Einsteiger-Toggle | ✅ Abgeschlossen (`highRatedBrews` ✅, `getRecommendationReason()` ✅, Portrait-Hinweis ✅, Einsteiger-Filter ✅, URL-Sync `?beginner=1` ✅, TS-clean ✅)                         |
| Stufe 14 | Phase 5.4 – Kollaboratives Filtering v2 (Skalierung)           | ✅ Abgeschlossen (Cache-Tabelle `user_recommendations` ✅, RPC v2 +Ratings-Signal ✅, Stil-Diversity-Cap ✅, Cache-first im Client ✅, pg_cron-Pfad dokumentiert ✅, TS-clean ✅) |
| Stufe 15 | Phase 5.5 – Diversity-Cap Admin-Konfiguration                  | ✅ Abgeschlossen (RPC v2.1 `p_diversity_cap` Parameter ✅, `platform_settings.collab_diversity_cap` ✅, Auto-Formel im Admin-UI ✅, SSR-Prop an DiscoverClient ✅, TS-clean ✅)   |
| Stufe 16 | Bugfix – „Am besten bewertet" Hot-Rating-Score                 | ✅ Abgeschlossen (`hotScore = bayesianAvg × recencyFactor` ✅, Halbwertszeit 45d ✅, min. 2 Ratings ✅, Pfeile = Frische statt Velocity ✅, TS-clean ✅)                          |
| Stufe 17 | Technical Debt – Alle kritischen Review-Findings ausgemerzt    | ✅ Abgeschlossen (22. Feb 2026, commit `3786489`)                                                                                                                                 |

**Stufe 17 – Details:**

- `Section`/`RankedRow`/`SectionHeader` aus Render-Fn extrahiert → `app/discover/_components/DiscoverSection.tsx` (React-Remount-Bug beseitigt)
- `RankedRow` Heart: `hover:scale-110` → `hover:scale-150 p-1.5 -m-1.5` (konsistent mit DiscoverBrewCard)
- Login-Toast bei Like-Versuch ohne Anmeldung (sonner, beide Like-Handler)
- Hero-Banner: CSS `background-image` → `<Image priority>` (LCP-Fix)
- Collab-Cache: DELETE+INSERT → `upsert` (Race-Condition beseitigt)
- ABV/IBU als dedizierte DB-Columns (`20260222140000_add_abv_ibu_columns.sql`), Backfill + Trigger + Indexes deployed; ABV-/IBU-Filter jetzt backend-seitig korrekt
- `useBrewViewTracker`: N IntersectionObserver per Karte → 1 shared module-level Observer

**Nächster logischer Schritt:** Letzte Suchen (localStorage, ~30min) oder Gespeicherte Filter Premium (5.3) oder Brewery-Follow-System (~3h, neue DB-Tabelle).

---

## Phase 0 – Technische Vorbereitung & Datenmigration

_Geschätzter Aufwand: 1–2 Tage_  
**Goldene Regel:** Alle Datenbankänderungen sind **ausschließlich additiv** — keine Spalte wird umbenannt oder gelöscht. Bestehende Queries brechen dadurch nicht.

### 0.1 Datenbank-Schema: Neue Spalten (nur additive Änderungen)

Alle neuen Spalten bekommen `DEFAULT`-Werte, damit bestehende Zeilen automatisch kompatibel sind:

```sql
-- Quality Score (Phase 2.5)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- ⚠️  ACHTUNG: Die bestehende Spalte `brew_type` hat bereits einen CHECK-Constraint
--    mit den Werten ('beer', 'wine', 'softdrink') — also Getränkekategorie, NICHT Braumethode.
--    Deshalb brauchen wir zwei separate neue Spalten:

-- Braumethode (Phase 2.3) — All-Grain / Extrakt / Teilmaische
ALTER TABLE brews ADD COLUMN IF NOT EXISTS mash_method TEXT DEFAULT NULL
  CHECK (mash_method IN ('all_grain', 'extract', 'partial_mash'));

-- Maischverfahren-Detail (optional, für erweiterten Filter)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS mash_process TEXT DEFAULT NULL
  CHECK (mash_process IN ('infusion', 'decoction', 'biab', 'step_mash'));

-- Gärungstyp (Ale / Lager / Spontan) — für Gärungs-Filter
ALTER TABLE brews ADD COLUMN IF NOT EXISTS fermentation_type TEXT DEFAULT NULL
  CHECK (fermentation_type IN ('top', 'bottom', 'spontaneous', 'mixed'));

-- Anzahl Raststufen (für Komplexitäts-Badge, Phase 3.1)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS mash_steps_count INTEGER DEFAULT 1;

-- Trending-Score als materialisierter Wert (Phase 1.3 / 4.4)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0;

-- Anzahl Kopien/Forks (Phase 3.4)
ALTER TABLE brews ADD COLUMN IF NOT EXISTS copy_count INTEGER DEFAULT 0;
```

**Wichtig:** `IF NOT EXISTS` verhindert Fehler falls die Spalte bereits existiert.

### 0.2 Bestehende Rezepte migrieren (Backfill-Strategie)

Existierende Rezepte müssen **einmalig** mit den neuen Werten befüllt werden.  
Die Reihenfolge ist entscheidend — zuerst die Grunddaten, dann abgeleitete Scores:

```sql
-- Schritt 0: mash_method Heuristik-Backfill
--   Wenn kein mash_steps-Array vorhanden oder leer → Extrakt, sonst All-Grain
--   (Teilmaische kann nicht automatisch erkannt werden → bleibt NULL bis User es setzt)
UPDATE brews
SET mash_method = CASE
    WHEN data->'mash_steps' IS NULL OR jsonb_array_length(data->'mash_steps') = 0 THEN 'extract'
    ELSE 'all_grain'
END
WHERE mash_method IS NULL AND brew_type = 'beer';

-- Schritt 0b: fermentation_type Heuristik-Backfill aus style-Feld
--   Grobe Näherung — Lager/Märzen/Pils → bottom, Weizen/IPA/Stout → top
--   Alles andere bleibt NULL bis User es manuell korrigiert
UPDATE brews
SET fermentation_type = CASE
    WHEN style ILIKE '%lager%' OR style ILIKE '%märzen%' OR style ILIKE '%pils%' OR style ILIKE '%bock%' THEN 'bottom'
    WHEN style ILIKE '%weizen%' OR style ILIKE '%ipa%' OR style ILIKE '%ale%' OR style ILIKE '%stout%' OR style ILIKE '%porter%' THEN 'top'
    ELSE NULL
END
WHERE fermentation_type IS NULL AND brew_type = 'beer';

-- Schritt 2: mash_steps_count aus vorhandenen Rezept-JSON-Daten ableiten
-- (Anpassen je nach tatsächlicher JSON-Struktur in der brews-Tabelle)
UPDATE brews
SET mash_steps_count = jsonb_array_length(recipe_data->'mash'->'steps')
WHERE recipe_data->'mash'->'steps' IS NOT NULL;

-- Schritt 3: copy_count aus bestehenden Kopier-Events befüllen (falls getrackt)
UPDATE brews b
SET copy_count = (SELECT COUNT(*) FROM brews WHERE copied_from_id = b.id);

-- Schritt 4: Quality Score für ALLE öffentlichen Rezepte berechnen
SELECT calculate_brew_quality_score(id)
FROM brews
WHERE is_public = true;

-- Schritt 5: Trending Score initial berechnen
UPDATE brews
SET trending_score = likes_count::float / POWER(
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 + 2, 1.5
)
WHERE is_public = true;
```

**Sicherheitsnetz:** Vor dem Backfill ein `snapshot` der `brews`-Tabelle anlegen:

```sql
CREATE TABLE brews_backup_pre_discover_migration AS SELECT * FROM brews;
```

### 0.3 Neue Supabase-Funktionen & Trigger anlegen

| Funktion / Trigger                      | Zweck                                                | Wann ausgelöst                                           |
| :-------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------- |
| `calculate_brew_quality_score(brew_id)` | Quality Score neu berechnen                          | `AFTER UPDATE ON brews`                                  |
| `update_brew_trending_score(brew_id)`   | Trending Score eines einzelnen Rezepts neu berechnen | `AFTER INSERT ON likes` (nur das betroffene Rezept)      |
| `increment_copy_count(brew_id)`         | copy_count erhöhen                                   | `AFTER INSERT ON brews WHERE copied_from_id IS NOT NULL` |
| `update_quality_on_like()`              | Quality Score bei neuem Like aktualisieren           | `AFTER INSERT ON likes`                                  |

**Ansatz:** Der Trending Score wird per **Live-Trigger** direkt beim Like aktualisiert — aber nur für das **eine** betroffene Rezept (nicht für alle). Das ist effizient und braucht keinen Cronjob:

```sql
CREATE OR REPLACE FUNCTION update_brew_trending_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE brews
  SET trending_score = likes_count::float / POWER(
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 + 2, 1.5
  )
  WHERE id = NEW.brew_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_trending_on_like
AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION update_brew_trending_score();
```

### 0.4 Datenbankindizes für Discover-Queries

```sql
-- Schnelle Filterung nach öffentlichen Rezepten + Stil
CREATE INDEX IF NOT EXISTS idx_brews_public_style
  ON brews (is_public, style) WHERE is_public = true;

-- Sortierung nach Quality Score
CREATE INDEX IF NOT EXISTS idx_brews_quality_score
  ON brews (quality_score DESC) WHERE is_public = true;

-- Sortierung nach Trending Score
CREATE INDEX IF NOT EXISTS idx_brews_trending_score
  ON brews (trending_score DESC) WHERE is_public = true;

-- Zutaten-Suche (Hopfen/Malz in JSON-Feld)
CREATE INDEX IF NOT EXISTS idx_brews_ingredients_gin
  ON brews USING gin (recipe_data);
```

### 0.5 Feature-Flag-Strategie (Schrittweise Aktivierung)

Keine Big-Bang-Releases. Neue Features werden per Flag aktiviert:

```typescript
// lib/feature-flags.ts (neu anlegen)
export const DISCOVER_FLAGS = {
  heroSearch: true, // Phase 1.5 – sofort aktiv
  qualityScore: false, // Phase 2.5 – erst aktivieren nach Backfill
  mobileBottomSheet: false, // Phase 2.6 – erst nach QA aktivieren
  ingredientFilter: false, // Phase 2.2 – erst wenn Index aktiv
} as const;
```

Flags werden in der Admin-Oberfläche schaltbar gemacht, bevor sie dauerhaft entfernt werden.

### 0.6 Fehlende Daten in bestehenden Rezepten: Graceful Degradation

Nicht alle alten Rezepte haben alle Felder. Die UI muss damit umgehen:

| Fehlendes Feld            | Fallback in der UI                                                                      |
| :------------------------ | :-------------------------------------------------------------------------------------- |
| `brew_type` nicht gesetzt | Brautyp-Badge ausblenden (kein Fehler-State)                                            |
| `quality_score = 0`       | Rezept erscheint weiter unten, aber nicht ausgeblendet                                  |
| `mash_steps_count = 1`    | Komplexitäts-Badge berechnet mit Minimum (Single Infusion)                              |
| Kein Bild                 | Default-Label zeigen (bereits implementiert)                                            |
| ABV / IBU fehlt           | Karte zeigt „–" statt Zahl; ABV/IBU-Filter schließt das Rezept aus dieser Filterung aus |

---

_Geschätzter Aufwand: 12 Tage_

### 1.1 Doppeldarstellungen entfernen

- [x] Die drei kuratieren Sektionen (Trending, Top, Neu) und das Alle Rezepte"-Grid zeigen dieselben Rezepte mehrfach
- [x] **Fix:** Sektions-Karussell vom All-Grid trennen. Entweder: Sektionen **oder** Grid nicht beides gleichzeitig
- [x] Vorschlag: Standardansicht = kuratierte Sektionen. Sobald Filter aktiv wechsel zu Suchergebnis-Grid

> ✅ **Umgesetzt:** `showAllGrid`-State trennt Ansichten. Standard = 3 kuratierte Karussells + „Alle Rezepte durchsuchen"-Button. Beim Aktivieren eines Filters wechselt die Seite automatisch zum Grid. Zurück-Button vorhanden.

### 1.2 Bewertungsanzahl in BrewCard anzeigen

**Aufwand: ~15 Minuten.** `ratings` wird bereits als vollständiges Array in `BrewCard.tsx` übergeben — `ratings.length` ist sofort verfügbar, keine DB-Änderung nötig.

- [x] **Datei:** `app/components/BrewCard.tsx` — Rating-Badge oben rechts anpassen:
  ```tsx
  // Vorher:
  {avgRating.toFixed(1)}
  // Nachher:
  {avgRating.toFixed(1)} · {ratings.length}×
  ```
- [x] Karten ohne Bewertung (`avgRating === null`) zeigen kein Badge — das ist bereits so implementiert ✓
- [x] Optional: Bei 0 Bewertungen dezentes „Noch keine Bewertung"-Label — `bg-black/40 text-zinc-500 text-xs` Pill oben rechts in der Card

> ✅ **Umgesetzt:** Badge zeigt jetzt `4.2 · 12×`. Rating-Badge wurde in eine Flex-Spalte umgebaut um den „✓ Bewährt"-Badge darunter zu ermöglichen. Bei 0 Ratings: dezentes „Noch keine Bewertung"-Pill.

### 1.3 Echte Trending-Logik

- [x] `trending_score`-Spalte + `trg_update_trending_on_like`-Trigger deployed (Stufe 1 Migration)
- [x] Trending-Sektion in `discover/page.tsx` sortiert nach `trending_score || likes_count` (Fallback für Altdaten)
- [ ] Optional: Supabase RPC-Funktion für serverseitige Sortierung nach Trending-Score (für Pagination)
- [x] Supabase pg_cron Job `refresh-trending-scores` (stündlich) + `getTrendingBrews()` SSR-Query → `initialTrending` Prop in `DiscoverClient`

> ✅ **Umgesetzt:** Trending `useMemo` nutzt `b.trending_score || b.likes_count` — Trigger aktualisiert Score automatisch bei neuen Likes mit Reddit-ähnlichem Decay `likes_count / (age_days + 2)^1.5`.

### 1.4 Leere-Suche-State verbessern

- [x] Aktuell: blanker Text „Keine Rezepte gefunden."
- [x] **Fix:** Illustration + „Versuch einen anderen Stil" + Button zum Filter zurücksetzen
- [x] **Smarter Fallback (AirBnB-Prinzip):** Bei 0 Ergebnissen nicht nur Reset anbieten, sondern automatisch ähnliche Rezepte mit leicht gelockerten Filtern vorschlagen
  - Beispiel: „Keine IPAs mit Citra gefunden. Diese IPAs passen vielleicht:"
  - Logik: Filter nacheinander lockern bis ≥ 3 Ergebnisse → diese als Alternativvorschläge anzeigen

> ✅ **Umgesetzt:** `SearchX`-Icon, Headline, Reset-Button (`resetFilters()` setzt alle 5 Filter zurück) + `suggestions`-useMemo lockert Filter schrittweise (byStyle → bySearch → Top-3) und zeigt Alternativkarten an.

### 1.5 Suchleiste als Hero-Element

- [x] Die Suchleiste ist das **visuelle Zentrum** der Seite — groß, prominent, bei Seitenaufruf direkt fokussiert
- [x] **Autocomplete während des Tippens:** Schlägt Rezeptnamen (🔍), Bierstile (🍺) und Zutaten/Hopfen (🌿) vor — offline aus geladenem State, kein API-Call
- [x] Keyboard-Navigation: ↑↓ durch Vorschläge, Enter zum Übernehmen, Escape zum Schließen
- [x] Schließt automatisch bei Klick außerhalb (`mousedown`-Handler)
- [x] `onMouseDown` mit `preventDefault()` verhindert Blur-Race-Condition
- [ ] **Letzte Suchen:** Beim Klick auf die leere Suchleiste erscheinen die letzten 3–5 Suchanfragen des eingeloggten Users
- [x] **Letzte Suchen (localStorage):** Wird in `botllab_recent_searches` gespeichert (max. 5). Desktop-Dropdown und Mobile-Overlay zeigen sie beim Klick auf den leeren Input. „Alle löschen"-Button entfernt den Key.
- [x] **Beliebte Suchanfragen:** Statische `POPULAR_SEARCHES`-Liste (IPA, Weizen, Saison, Pils, Stout, Helles, Citra, Kölsch, Pale Ale, Sour) — Chip-Grid wenn Input leer und keine letzten Suchen. Gilt für Desktop-Dropdown und Mobile-Overlay.

> ✅ **Autocomplete umgesetzt:** Dropdown erscheint ab 2 Zeichen. Max. 8 Vorschläge, unterteilt in Rezept / Stil / Zutat. `suggestionIndex` für Keyboard-Navigation. Offline-first — keine Netzwerkanfrage nötig.
> ✅ **Letzte Suchen umgesetzt:** localStorage-basiert, max. 5 Einträge, sowohl Desktop-Dropdown als auch Mobile Fullscreen-Overlay.
> ✅ **Beliebte Suchanfragen umgesetzt:** Statische Chips mit `TrendingUp`-Icon in Cyan, erscheinen wenn noch keine Suchhistorie vorhanden.

---

## Phase 2 – Filter & Suche

_Geschätzter Aufwand: 23 Tage_

### 2.1 ABV / IBU Range-Filter

- [x] Zwei Slider (oder Dropdown-Ranges) für ABV und IBU
- [x] Vorschläge als Chips: Session (< 4.5%)", Craft (4.5–7%)", Imperial (> 7%)"
- [x] IBU-Chips: Mild (< 20)", Ausgewogen (20–40)", Hopfig (> 40)"

> ✅ **Umgesetzt als Preset-Chips** hinter „Mehr Filter"-Panel. ABV: Session / Craft / Imperial. IBU: Mild / Ausgewogen / Hopfig. Filterlogik in `list`-useMemo. Rezepte ohne ABV/IBU-Wert werden bei aktivem Filter korrekt ausgeschlossen (Graceful Degradation ✓).

### 2.2 Zutaten-Filter (Hopfen & Malz)

- [x] Texteingabe mit `datalist`-Autocomplete (Vorschläge aus allen geladenen Rezepten: `data.hops[].name` + `data.malts[].name`)
- [x] Nutzerszenario: „100g Citra im Kühlschrank" → Eingabe `Citra` → sofortige clientseitige Filterung
- [x] Malz-Filter enthalten: Suche trifft sowohl Hopfen- als auch Malznamen
- [x] Kombinierbar mit allen anderen Filtern (Style + Zutat = „IPA mit Citra")
- [x] `hopFilter`-State + `resetFilters()` + `isFiltering` aktualisiert
- [x] Anzeige im „Mehr Filter"-Panel (mit X-Button zum Löschen)
- [x] „Mehr Filter"-Button leuchtet bei aktivem Zutat-Filter cyan auf

> ✅ **Umgesetzt.** Clientseitige Filterung auf `brew.data?.hops` und `brew.data?.malts`. Der GIN-Index (`brews_data_gin_idx`) ist für spätere serverseitige Filterung vorhanden — für die aktuellen Datenmengen reicht clientseitig.

### 2.3 Brautyp-Filter & Gärungs-Filter

- [x] UI vorhanden: Segmented-Control (Alle / All-Grain / Extrakt / Teilmaische) mit `brewTypeFilter`-State
- [x] Filterlogik in `discover/page.tsx` vorhanden
- [x] **⚠️ FIX nach Phase-0-Migration:** Filter auf `brew.mash_method` umgestellt ✅
- [x] **Neuer Filter "Gärung":** Obergärig / Untergärig / Spontangärung / Gemischt auf Basis von `fermentation_type` ✅
- [x] Discover-Page: `mash_method` und `fermentation_type` in die `.select()`-Query aufgenommen ✅
- [x] Relevant für Einsteiger die noch keine Malzmühle haben (Extrakt-Filter)

> ⚠️ **UI vorhanden, Daten fehlen.** Fix-Reihenfolge: 1) Phase-0-Migration → 2) BrewEditor-Felder (→ 2.3a) → 3) `discover/page.tsx` auf `mash_method` + `fermentation_type` umstellen. Kein Produktionsrisiko (lokale Entwicklung).

### 2.3a BrewEditor: Braumethode, Maischverfahren & Gärungstyp

**Datei:** `app/team/[breweryId]/brews/components/BrewEditor.tsx`

#### Feld 1: Braumethode (`mash_method`) → Section 2 „Wasser & Maischen"

- [x] Dropdown: – bitte wählen – / All-Grain / Extrakt / Teilmaische (Design: `bg-black rounded-md appearance-none`, identisch mit restlichem BrewEditor)
- [x] **Auto-Ableitung per `useEffect`**: kein `mash_steps`-Array → `'extract'`, Steps vorhanden → `'all_grain'` — wird **automatisch gesetzt**, kein manuelles Bestätigen nötig
- [x] `autoSetFields` Ref trackt auto-gesetzte Felder: manuelle Änderung durch den User → löscht das Feld aus dem Ref → spätere Rasten-Änderungen überschreiben die Wahl nicht mehr
- [x] Wert wird in `brew.data.mash_method` gespeichert (JSONB — keine DB-Migration nötig)

#### Feld 2: Maischverfahren (`mash_process`) → Section 2 „Wasser & Maischen"

- [x] Dropdown: – bitte wählen – / Infusion / Stufenmaische / Dekoktion / BIAB (Design: identisch Feld 1)
- [x] **Auto-Ableitung per `useEffect`**: 1 Step → `'infusion'`, 2+ Steps → `'step_mash'` (Dekoktion/BIAB weiterhin manuell)
- [x] Wechsel auf `mash_method === 'extract'` → `mash_process` wird automatisch geleert
- [x] Nur sichtbar wenn `mash_method !== 'extract'`
- [x] Wert wird in `brew.data.mash_process` gespeichert

#### Feld 3: Gärungstyp (`fermentation_type`) → Section 4 „Gärung"

- [x] Dropdown: Nicht angegeben / Obergärig (Ale) / Untergärig (Lager) / Spontangärung / Gemischt
- [x] **Auto-Vorschlag** aus zwei Quellen: **Hefe-Name-Regex** (bevorzugt) → **Style-Regex** (Fallback)
- [x] Vorschlag zeigt Quelle: `💡 Abgeleitet aus Hefe: „Untergärig (Lager)"`
- [x] **Widerspruchs-Warnung** (`⚠️`): wenn Hefe und Bierstil verschiedene Typen implizieren
- [x] Wert wird in `brew.data.fermentation_type` gespeichert

#### Offene Nachfolge-Schritte (brauchen Phase-0-DB-Migration)

- [x] **DB-Migration ausführen:** `mash_method`, `mash_process`, `fermentation_type` als Top-Level-Spalten angelegt (Phase 0.1 ✅)
- [x] **Discover-Filter:** `discover/page.tsx` auf `brew.mash_method` + `brew.fermentation_type` umgestellt (statt JSONB-Lookup)
- [x] **BrewEditor Save:** `handleSave()` schreibt `mash_method`, `mash_process`, `fermentation_type` jetzt auch als Top-Level-Payload-Keys
- [x] **Backfill:** Bestehende Rezepte per SQL-Heuristik befüllt (Phase 0.2, Schritte 0–0f in Migration)

> ✅ **UI vollständig umgesetzt.** Alle drei Dropdowns live im BrewEditor. `mash_method` und `mash_process` werden per `useEffect` + `autoSetFields`-Ref **automatisch abgeleitet und gesetzt** — ohne Vorschlag-Box, ohne User-Interaktion. Wechsel zu Extrakt leert `mash_process` automatisch. Manuelle Änderung durch den User sperrt das Feld gegen weitere Auto-Überschreibung. `fermentation_type` behält die 💡 Vorschlag-Box da die Hefe-/Stil-Regex weniger zuverlässig ist. Alle Werte werden sofort in `brew.data` (JSONB) gespeichert — ohne Migration nutzbar.

### 2.4 Stil-Chip-Navigation (visuell)

- [x] Statt reinem Dropdown: horizontale scrollbare Chip-Leiste über bekannte BJCP-Kategorien
- [x] Z.B. ` Weizen` ` Pils` ` IPA` ` Stout` ` Sour`
- [x] Klick auf Chip setzt Stil-Filter und triggert sofortige Filterung

> ✅ **Umgesetzt:** 8 Chips (IPA, Weizen, Pils, Stout, Lager, Porter, Pale Ale, Sour). Toggle-Logik: erneuter Klick deaktiviert den Chip. Horizontal scrollbar, `scrollbar-width: none` auf Mobile.

### 2.5 Serverseite Filterung via URL-Params

- [x] Filter als URL-Parameter (`/discover?style=IPA&mash=all_grain&sort=top`) speichern
- [x] Ermöglicht Teilen von gefilterten Ansichten (Deep-Link-fähig)
- [x] States werden beim Laden lazy aus `useSearchParams()` initialisiert
- [x] URL-Sync per `useEffect` + `router.replace` (kein History-Spam, `scroll: false`)
- [x] Basis für serverseitiges Rendering (Phase 4)

> ✅ **Umgesetzt:** Alle 8 Filter (`q`, `style`, `sort`, `mash`, `fermentation`, `abv`, `ibu`, `hop`) werden als URL-Params gespeichert. Default-Werte erscheinen nicht in der URL (saubere Links). `resetFilters()` leert automatisch alle Params.

### 2.6 Explizite Sort-Kontrolle

- [x] Sichtbare Sort-Leiste über den Ergebnissen: `Sortieren nach: Trending | Neueste | Top bewertet | Meistgebraut`
- [x] User hat immer die Kontrolle — der Algorithmus (Trending) ist Default, aber nicht aufgezwungen
- [x] Aktive Sortierung wird per URL-Param gespeichert und ist teilbar (`?sort=top`)

> ✅ **Umgesetzt:** `CustomSelect` mit „Höchste Qualität / Top bewertet / Meiste Likes / Meist bewertet / Neueste". Immer sichtbar in der Filter-Zeile.  
> ✅ URL-Param-Sync (`?sort=...`) umgesetzt zusammen mit Phase 2.5.

### 2.7 Live-Ergebniszähler & Filter-Hierarchie

- [x] **Live-Zähler:** „47 Rezepte gefunden" wird live neben den aktiven Filtern angezeigt — aktualisiert sich ohne Seitenreload
- [x] Wenn Zähler auf 0 fällt: Warnung vor dem Absenden des Filters (verhindert frustrierende Sackgassen)
- [x] **Filter-Hierarchie (Tier-System):**
  - **Tier 1 (immer sichtbar):** Stil-Chips, Brautyp-Toggle, Suchleiste
  - **Tier 2 (hinter „Mehr Filter"-Button):** ABV-Slider, IBU-Slider, Zutaten-Filter
  - Verhindert Überwältigung von Einsteigern, gibt Profis trotzdem alle Optionen

> ✅ **Umgesetzt:** Live-Zähler-Bar (`{N} Rezepte gefunden · ✕ Alles zurücksetzen`) erscheint nur bei aktiven Filtern. `resetFilters()` setzt alle 5 States zurück. „Mehr Filter"-Button leuchtet cyan bei aktiven ABV/IBU-Filtern und zeigt Dot-Indikator.

---

## Phase 2.6 – Mobile-First UX

_Geschätzter Aufwand: 2–3 Tage_  
**Wichtig:** Mobile ist kein Nachgedanke — alle Filter-Patterns müssen von Anfang an für Touch optimiert sein.

### Filter auf Mobile: Bottom-Sheet

- [x] Filter öffnen sich auf Mobile als **Bottom-Sheet** (von unten aufgehendes Panel) — kein Overlay, kein Drawer von der Seite
- [x] Bottom-Sheet hat eigene „Anwenden"- und „Zurücksetzen"-Buttons am unteren Rand (Anwenden = cyan, Zurücksetzen = zinc, mind. 48px hoch)
- [x] Stil-Chips bleiben horizontal scrollbar als fixierte Leiste über den Ergebnissen
- [x] Alle Filter-Buttons im Sheet haben `min-h-[44px]` (44×44px Tap-Target)
- [x] Body-Scroll wird beim Öffnen gesperrt (`overflow: hidden`) und beim Schließen entsperrt
- [x] Backdrop (50% schwarz + blur) schließt Sheet beim Tap außerhalb
- [x] Desktop: Filter-Row bleibt unverändert (`hidden md:flex`)

> ✅ **Umgesetzt:** Bottom-Sheet enthält alle Filter (Brautyp, Gärungstyp, ABV, IBU, Zutat). Mobile-Bar zeigt Sort-Dropdown + Cyan-Dot wenn Filter aktiv. `animate-in slide-in-from-bottom` Entry-Animation. Expandable-Section (`Mehr Filter`) auf Desktop-only (`hidden md:block`). „Zurücksetzen" ruft `resetFilters()` auf und schließt das Sheet.

### Karten-Layout auf Mobile

- [x] BrewCards auf Mobile: **1-Spalten-Layout** (keine 2-Spalten, zu eng)
- [x] Wichtigste Infos (Stil, ABV, Bewertung, Brautyp-Badge) müssen ohne Scrollen sichtbar sein
- [x] Hover-States (z.B. „Kopieren"-Button) funktionieren auf Mobile als sichtbares Icon-Button, auf Desktop hover-reveal

> ✅ **1-Spalte:** Grid verwendet `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — Mobile ist already 1-spaltig.  
> ✅ **Kopieren-Button:** Desktop `md:opacity-0 md:group-hover:opacity-100`, Mobile immer sichtbar (`opacity-100`). Umgesetzt in Phase 3.2.

### Suchleiste auf Mobile

- [x] Beim Antippen: Suchleiste expand auf Vollbild-Overlay mit Autocomplete und letzten Suchen
- [x] Keyboard erscheint sofort — `autoFocus` auf dem Input im Overlay
- [x] Einfaches Schließen per ArrowLeft-Button oder Escape-Taste

> ✅ **Vollbild-Suchoverlay umgesetzt.** Mobile zeigt einen fake-Input-Button; Tap öffnet `fixed inset-0 z-[60]`-Overlay mit eigenem `autoFocus`-Input. Zeigt letzte Suchen (localStorage) oder Autocomplete-Vorschläge je nach Eingabe. Schließen via ArrowLeft, Enter oder Escape.

---

## Phase 2.5 Interner Rezept-Qualitätsscore (Recipe Quality Score)

_Geschätzter Aufwand: 23 Tage_

### Konzept

Jedes öffentliche Rezept erhält automatisch einen internen Score von 0100.  
Der Score ist **nie sichtbar** er beeinflusst ausschließlich die Suchreihenfolge.  
Ziel: Gut dokumentierte, vollständige Rezepte erscheinen weiter oben. Halb-leere Einträge verschwinden nach hinten.

Wenn ein Nutzer nach "Weizen" sucht, entscheidet nicht nur die Textähnlichkeit des Namens, sondern auch die Qualität des Rezepts die Reihenfolge.

---

### Scoring-Algorithmus (Gewichtung je Kategorie)

#### A) Vollständigkeit der Kennzahlen (max. 30 Punkte)

| Feld vorhanden                    | Punkte |
| --------------------------------- | ------ |
| ABV angegeben                     | +5     |
| IBU angegeben                     | +5     |
| EBC / Farbe angegeben             | +5     |
| OG (Stammwürze) angegeben         | +5     |
| FG (Restextrakt / Ziel) angegeben | +5     |
| Ausschlagvolumen angegeben        | +5     |

#### B) Rezept-Dokumentation (max. 30 Punkte)

| Kriterium                                          | Punkte                     |
| -------------------------------------------------- | -------------------------- |
| Beschreibung vorhanden (> 50 Zeichen)              | +5                         |
| Beschreibung ausführlich (> 200 Zeichen)           | +5 (additiv, also max +10) |
| Braunotizen / Brewday-Notes vorhanden              | +5                         |
| Braustil korrekt angegeben (nicht leer/Unbekannt") | +5                         |
| Mindestens 2 Hopfengaben mit Menge + Zeitpunkt     | +5                         |
| Hefe mit Name + Vergärungsgrad angegeben           | +5                         |

#### C) Zutaten-Vollständigkeit (max. 20 Punkte)

| Kriterium                             | Punkte |
| ------------------------------------- | ------ |
| 2 Malze mit Mengenangabe              | +5     |
| 1 Hopfen mit Mengenangabe             | +5     |
| Hefe angegeben                        | +5     |
| Wasseraufbereitung / Profil angegeben | +5     |

#### D) Community-Signale (max. 30 Punkte)

| Kriterium                                     | Punkte       |
| --------------------------------------------- | ------------ |
| Eigenes Bild hochgeladen (kein Default-Label) | +5           |
| 1 Bewertung erhalten                          | +5           |
| 3 Bewertungen erhalten                        | +5 (additiv) |
| ≥ 5 Likes _(Self-Like-sicher — v2)_           | +5           |
| Mind. 1 von anderem User gebraut/kopiert      | +5           |
| 3 von anderen Usern gebraut/kopiert           | +5 (additiv) |

**Maximalscore: 110 Punkte (normalisiert auf 0100)**

---

### Suchranking-Formel

Wenn ein Nutzer nach einem Begriff sucht, wird die Ergebnisreihenfolge wie folgt berechnet:

```
final_rank = text_match_score * 0.6 + quality_score * 0.4
```

- `text_match_score`: Wie gut trifft der Suchbegriff auf Name, Stil, Beschreibung zu (0100)
- `quality_score`: Der interne Score aus dem Algorithmus oben (0100)

Das bedeutet: **Texttreffer schlägt immer noch**, aber bei gleich gutem Texttreffer gewinnt das besser dokumentierte und von der Community angenommene Rezept.

---

### Technische Umsetzung

- [x] `quality_score INTEGER DEFAULT 0` Spalte in `brews` (Stufe-1-Migration)
- [x] Funktion `calculate_brew_quality_score(brew_id)` implementiert (Migration `20260220140000`)
- [x] Trigger `trg_quality_score_on_brew_update` — AFTER UPDATE ON brews (nur bei relevanten Spaltenänderungen)
- [x] Trigger `trg_quality_score_on_rating` — AFTER INSERT ON ratings
- [x] Trigger `trg_quality_score_on_like` — AFTER INSERT OR DELETE ON likes
- [x] Backfill: Score für alle öffentlichen Rezepte berechnet (2 Rezepte aktualisiert)
- [x] In der Discover-Suchabfrage: `quality_score` als Sortier-Option eingebunden ✅
- [ ] Admin-Ansicht (optional): Score je Rezept im Admin-Panel anzeigen

---

### Erweiterungen (später)

- Score kann Basis für ein **Rezept vervollständigen"-Feature** sein: Wenn ein User sein eigenes Rezept bearbeitet, zeigen wir ihm dezent: `Tipp: Füge eine Beschreibung hinzu um mehr Sichtbarkeit zu bekommen`
- Score könnte für das **Verifizierungs-Badge** (Phase 3.3) mitgenutzt werden: `quality_score >= 80` + ` 5 Bewertungen` = Badge

---

## Phase 3 – Inhalt & Vertrauen

_Geschätzter Aufwand: 2–3 Tage_

### BrewCard-Layout-Übersicht (Ziel-Zustand nach Phase 3)

```
┌─────────────────────────────────────────┐
│ [Stil-Badge]          [★ 4.2 · 12×]     │  ← Top-Leiste (bereits vorhanden, erweitert)
│                       [✓ Bewährt]        │  ← Neu: Phase 3.3 (nur wenn Kriterium erfüllt)
│                                          │
│  (Hintergrundbild / Default-Label)       │
│                                          │
│  Rezeptname                              │
│  🏭 Brauerei-Name                        │
│                                          │
│ [EBC] [°P] [IBU] [ABV%]                 │  ← Stat-Boxes (bereits vorhanden)
│                                          │
│ ● Einsteiger    🔁 12× gebraut  [Like]  │  ← Neu: Phase 3.1 + 3.4 in der Footer-Zeile
│ vor 3 Tagen            [📋 Kopieren]     │  ← Neu: Phase 3.2, nur auf Desktop (Hover)
└─────────────────────────────────────────┘
```

### 3.1 Komplexitäts-Badge

- [x] **Dateien:** `app/components/BrewCard.tsx` + `BrewData`-Interface erweitert
- [x] `brew_type` und `data` ins `BrewData`-Interface ergänzt
- [x] Komplexität clientseitig aus `brew.data.malts`, `brew.data.hops`, `brew.data.mash_steps` berechnet:
  - Einfach (`simple`): Malze/Hopfen vorhanden, aber unter den Schwellenwerten
  - Mittel (`intermediate`): ≥ 4 Malze oder ≥ 3 Hopfengaben oder ≥ 2 Raststufen
  - Komplex (`complex`): > 6 Malze oder ≥ 3 Raststufen
  - `null` (kein Badge): Keine Ingredient-Daten vorhanden
- [x] Badge in der Footer-Zeile: `● Einsteiger` (grün) / `●● Fortgeschritten` (gelb) / `●●● Experte` (orange)

> ✅ **Umgesetzt:** `brew_type?: string | null` und `data?: any` im Interface. Complexity-Berechnung aus `brew.data` zur Renderzeit. Badge im Footer mit farbkodierten Punkten.

### 3.2 „In Brauerei kopieren"-CTA direkt in der Card

- [x] **Datei:** `app/components/BrewCard.tsx`
- [x] Kleiner Icon-Button (`Copy`-Icon aus `lucide-react`) neben dem Like-Button in der Footer-Zeile
- [x] Auf **Desktop:** im Hover-State sichtbar (`md:opacity-0 md:group-hover:opacity-100`)
- [x] Auf **Mobile:** immer sichtbar (`opacity-100`)
- [x] Klick öffnet positioniertes Dropdown (via `createPortal` auf `document.body`, um `overflow-hidden` der Card zu umgehen): „In welche Brauerei kopieren?"
- [x] `currentUserId` prop wird jetzt von `discover/page.tsx` befüllt und in BrewCard für Schutz + Insert genutzt
- [x] Lazy-Loading der Brauereien über `brewery_members`-Query bei erstem Öffnen
- [x] Brew wird als Remix insertiert (`remix_parent_id: brew.id`, `is_public: false`)
- [x] UI-Feedback: `Loader2` während Laden/Insert, `Check` + „Kopiert!" bei Erfolg, Fehlertext bei Error

> ✅ **Umgesetzt:** Copy-Button im Footer, Portal-Dropdown mit Brauerei-Auswahl, `setCurrentUserId` in `loadBrews()` gesetzt, alle drei `<BrewCard>`-Aufrufe in `discover/page.tsx` übergeben `currentUserId`.

### 3.3 Verifikations-Badge für top Rezepte

- [x] **Datei:** `app/components/BrewCard.tsx` — rein clientseitig aus vorhandenen `ratings`-Daten berechnet
- [x] Kriterium: `ratings.length >= 5` && `avgRating >= 4.0`
- [x] Kein neues DB-Feld nötig — Berechnung passiert zur Renderzeit aus bereits geholten Daten
- [x] Badge-Position: Oben rechts, unterhalb des Rating-Badges (zweite Zeile):
  ```tsx
  {
    ratings.length >= 5 && avgRating && avgRating >= 4.0 && (
      <span className="bg-emerald-500/20 text-emerald-400 ...">✓ Bewährt</span>
    );
  }
  ```

> ✅ **Umgesetzt:** Rating-Bereich ist eine Flex-Spalte (`flex-col items-end`). „✓ Bewährt" erscheint in Smaragdgrün unterhalb des Rating-Badges wenn Kriterien erfüllt.

### 3.4 „Gebraut von X Brauern"-Zähler

- [x] **Datenbankänderung:** `copy_count`-Spalte in Stufe-1-Migration deployed + `trg_increment_copy_count`-Trigger aktiv
- [x] **Select-Query:** `copy_count` in `discover/page.tsx`-Query aufgenommen
- [x] **Interface:** `copy_count?: number` in `BrewData` (BrewCard.tsx) und `Brew` (discover/page.tsx) ergänzt
- [x] Anzeige im Footer der BrewCard als `🔁 {copy_count}×` wenn `copy_count > 0`

> ✅ **Umgesetzt.** Trigger erhöht `copy_count` automatisch bei jedem Brew-Copy (WHERE `remix_parent_id IS NOT NULL`).

---

## Phase 4 Performance & SEO

_Geschätzter Aufwand: 35 Tage_

### 4.1 Server-Side Rendering (SSR)

- [x] `page.tsx` zu einem Server Component umgebaut — lädt Brews serverseitig via `createClient()` (Supabase SSR)
- [x] `DiscoverClient.tsx` ist der `'use client'` Teil, empfängt `initialBrews: Brew[]` als Prop
- [x] Initial-Daten vorgeladen — kein Ladeflackern, kein leeres Skeleton bei Page-Load
- [x] Client-Seite holt nur noch Auth + Likes (leichtgewichtig, kein Brew-Fetch mehr)
- [x] `<Suspense fallback={<DiscoverSkeleton />}>` sichert Hydration ab
- [x] **Google bekommt alle Inhalte zum Indexieren** (Rezeptnamen, Stile, Bewertungen im HTML)

### 4.2 SEO Grundlagen

- [x] `export const metadata: Metadata` mit `title`, `description`, `openGraph`, `alternates.canonical`
- [x] `generateMetadata()` für dynamische Rezept-Detailseiten (`/brew/[id]`) — in `layout.tsx`, mit Titel, Beschreibung, ABV, IBU, Brauer-Name, OpenGraph-Bild, Twitter Card, `alternates.canonical`
- [x] Strukturierte Daten (`schema.org/Recipe`) für Google Rich Snippets — JSON-LD in `layout.tsx`, mit Name, Autor, Zutaten (Malz, Hopfen, Hefe), `recipeYield`, `aggregateRating`, `nutrition.alcoholContent`, Publisher

### 4.3 Pagination / Infinite Scroll

- [x] Aktuell wird alles auf einmal geladen → nicht skalierbar
- [x] **Fix:** `page.tsx` lädt nur die ersten 20 Rezepte (`.range(0, 19)`, `quality_score` desc)
- [x] `IntersectionObserver` auf Sentinel-Div am Grid-Ende — lädt automatisch die nächsten 20 nach
- [x] `loadMoreBrews()` Callback: hängt neue Batch an `brews`-State an, setzt `hasMore = false` bei < 20 Ergebnissen
- [x] Spinner (`Loader2 animate-spin`) während Nachladen sichtbar
- [x] "Alle X Rezepte geladen"-Text wenn `!hasMore && !loadingMore`
- [x] CTA-Zähler zeigt `{brews.length}+` wenn noch weitere vorhanden sind

> ✅ **Umgesetzt:** SSR lädt initial 20. IntersectionObserver mit `rootMargin: '200px'` triggert `loadMoreBrews()` rechtzeitig bevor User das Ende erreicht. Client-side Filter/Sort bleibt unverändert — wirkt auf alle geladenen Brews.

### 4.4 Supabase Performance

- [x] Index auf `brews.trending_score` vorhanden (`idx_brews_trending_score WHERE is_public = true`)
- [x] `likes_count` als materialisierten Wert (Spalte, Trigger-gepflegt) statt zu aggregieren
- [x] `refresh_trending_scores()` PL/pgSQL-Funktion — bulk-UPDATE aller öffentlichen Brews in einem einzigen SQL-Call
- [x] `pg_cron` Job `refresh-trending-scores` — stündlich (`0 * * * *`), direkt SQL ohne HTTP-Roundtrip
- [x] `get_trending_brews(limit_count int)` RPC — für direkte DB-seitige Sortierung
- [x] `getTrendingBrews()` in `page.tsx` — lädt Top-10 Trending parallel zu `getInitialBrews()` via `Promise.all`
- [x] `initialTrending: Brew[]` Prop in `DiscoverClient` — ersetzt client-seitigen `useMemo`-Sort; zeigt echte DB-Scores aus der gesamten Tabelle (nicht nur aus dem ersten Infinite-Scroll-Batch)

> ✅ **Umgesetzt:** Migration `20260220170000_trending_score_rpc_and_cron.sql`. Stündlicher pg_cron-Job (gleiche Extension wie Analytics-Jobs). SSR lädt Trending und Initial-Brews parallel ohne Waterfall.

---

## Phase 5 Personalisierung (Premium-Feature)

_Geschätzter Aufwand: 5–7 Tage_

### 5.1 „Für dich"-Empfehlungs-Engine ✅

**Vollständig umgesetzt (21.02.2026).** Drei-Stufen-Pipeline aus reiner TypeScript-Logik — kein React, serverseitig und clientseitig nutzbar.

#### `lib/utils/recommendation-engine.ts` (neu)

- [x] `buildUserProfile()` — aggregiert Signale aus eigenen Brews (Faktor 3), Likes (Faktor 2) und hoch-bewerteten Brews (Faktor 1.5): Stile, Hopfen, Malze, Durchschnitts-ABV, Komplexitätsmodus
- [x] `scoreBrewForUser()` — 0–1-Similarity-Score pro Brew: Stil-Exakt (35%) · Stil-Familie BJCP (20%) · Hop-Jaccard (20%) · Malt-Jaccard (10%) · ABV-Proximity (10%) · Quality-Score (5%) + Liked-Style-Bonus + Complexity-Comfort-Bonus
- [x] `getPersonalizedBrews()` — 80/10/10-Diversity: 8× Komfortzone (höchste Scores) + 1× neue Stil-Familie (Exploration) + 1× höchster Trending-Score (Frische)
- [x] `getQualityFallback()` — Fallback wenn < 3 eigene Brews: zeigt Top-Brews absteigend nach `quality_score`
- [x] BJCP-Stil-Familien-Map: IPA · Weizen · Stout · Lager · Pale · Belgian · Sour · Dark · Kölsch
- [x] `NEEDS_MORE_DATA_THRESHOLD = 3` — Schwellenwert für Vollpersonalisierung: **eigene Brews + Likes zusammen** müssen ≥ 3 sein (nicht nur eigene Brews)
- [x] Eigene Brews und bereits kopierte Brews werden grundsätzlich ausgeschlossen

#### `supabase/migrations/20260221130000_brew_views.sql` (neu)

- [x] `brew_views`-Tabelle angelegt: `user_id`, `brew_id`, `viewed_at`, `dwell_seconds`, `source` (discover/search/direct/profile)
- [x] Indizes: user+brew, brew, user+time
- [x] RLS: Nutzer sieht und schreibt nur eigene Rows
- [ ] **Noch nicht befüllt** — vorbereitet für Stufe B (implizite Signale via Dwell-Time)

#### `DiscoverClient.tsx` (erweitert)

- [x] `loadUserData()` lädt zusätzlich eigene Brews des Nutzers (bis 50, inkl. `data`-Feld für Hop/Malt-Overlap und `remix_parent_id` für Kopier-Ausschluss)
- [x] `userBrews`-State + `personalizedBrews`-useMemo (reagiert automatisch auf Änderungen an Likes/Brews/Pool)
- [x] Neue Section **„Für dich"** (portrait-only Layout) zwischen _Empfohlen_ und _Am besten bewertet_:
  - Nicht eingeloggt → Section vollständig ausgeblendet
  - < 3 eigene Brews → Titel „Empfohlen für dich" (Qualitäts-Fallback, kein Algorithmus)
  - ≥ 3 eigene Brews → Titel „Für dich" (volle Personalisierung)

> ✅ **Umgesetzt. TS: Exit 0.** Keine Fake-Daten. Eigene Brews erscheinen nicht als Empfehlung.

---

### Noch offene Personalisierungs-Stufen

#### Stufe A — Explizite Signale verbessern (kein neues Backend)

- [x] **Ratings-Signal:** `highRatedBrews` in `loadUserData()` geladen, als 3. Arg an `buildUserProfile()` übergeben, zählt im Threshold
- [x] **„Warum wird das empfohlen?"-Tooltip** — `getRecommendationReason()` in der Engine; Portrait-Card zeigt `✦ <Grund>` in Cyan unter dem Titel

#### Stufe B — Implizite Signale (brew_views Tabelle aktivieren)

- [ ] **Dwell-Time-Tracking:** `IntersectionObserver` auf Brew-Cards im Discover-Feed — nach 3s Sichtbarkeit `INSERT INTO brew_views` (nur wenn eingeloggt, client-only, kein Blocking)
- [ ] **Engine erweitern:** `brew_views` als dritten Signal-Typ in `buildUserProfile()` (Faktor 1 pro View, Faktor 2 bei dwell > 10s)
- [ ] **`source`-Gewichtung:** Views aus dem Discover-Feed höher gewichten als direkte Aufrufe (Stöbern vs. gezielter Besuch)

#### Stufe C — Kollaboratives Filtering v2 ✅

- [x] User-Ähnlichkeits-Matrix: Nutzer mit ähnlichen Stil-Profilen → deren Likes + Ratings als Ähnlichkeitssignal (`similar_users` CTE)
- [x] `user_recommendations` Cache-Tabelle (TTL 2h) — verhindert live RPC bei jedem Aufruf; Client schreibt nach RPC-Call
- [x] Stil-Diversity-Cap: dynamisch via `p_diversity_cap` Parameter (WINDOW `ROW_NUMBER PARTITION BY b.style`)
- [x] Ratings ≥4★ als zusätzliches Ähnlichkeitssignal (neben Likes) in RPC v2
- [x] Upgrade-Pfad ab ~500 Nutzern: `refresh_collab_cache_for_active_users()` + pg_cron-Job auskommentiert in Migration dokumentiert
- [x] **Admin-Konfiguration:** `platform_settings.collab_diversity_cap` — im Admin-Dashboard einstellbar; Auto-Formel `max(2, round(totalBrews / 30))`; SSR lädt Setting und übergibt als Prop an DiscoverClient

---

### 5.2 Einsteiger-Modus Toggle ✅

- [x] Toggle in Desktop-Sidebar + Bottom-Sheet: „Nur Einsteiger-Rezepte"
- [x] Filtert Pool auf `maltCount + hopCount + stepCount ≤ 4` (kein Backend)
- [x] Kombinierbar mit allen anderen Filtern; `isFiltering` + mobile Button berücksichtigen Toggle
- [x] State in URL-Param `?beginner=1` + sync in `resetFilters()`

### 5.3 Gespeicherte Filter (Premium)

- [ ] Aktuelle Filter als benannten Preset speichern (z.B. „Meine IPAs")
- [ ] Presets erscheinen als Schnellzugriff-Chips über der Filterleiste
- [ ] Neue DB-Tabelle: `user_filter_presets (id, user_id, name, filters jsonb, created_at)`
- [ ] RLS: Nutzer sieht nur eigene Presets
- [ ] **Aufwand: ~2h**

### 5.4 Folge Brauereien

- [ ] Neue Section „Von Brauereien denen du folgst" im Discover-Feed
- [ ] Follow-Button auf Brewery-Profil-Seite
- [ ] Neue DB-Tabelle: `brewery_follows (user_id, brewery_id, followed_at)` + RLS + Index
- [ ] SSR-Query in `page.tsx` lädt neue Brews von gefolgten Brauereien parallel zu Trending (`Promise.all`)
- [ ] Kein Follow → Section ausgeblendet (kein leerer State)
- [ ] **Aufwand: ~3h**

---

## Priorisierungsmatrix

| Maßnahme                           | Aufwand | Impact        | Priorität     |
| ---------------------------------- | ------- | ------------- | ------------- |
| Doppeldarstellungen entfernen      | S       | Hoch          | 🔥 Sofort     |
| Bewertungsanzahl anzeigen          | S       | Hoch          | 🔥 Sofort     |
| **Suchleiste als Hero-Element**    | **S**   | **Sehr Hoch** | **🔥 Sofort** |
| Leere-State (smarter Fallback)     | S       | Hoch          | 🔥 Sofort     |
| ABV/IBU Range-Filter               | M       | Hoch          | ⚡ Bald       |
| Stil-Chip-Navigation               | M       | Hoch          | ⚡ Bald       |
| Zutaten-Filter (Hopfen/Malz)       | M       | Hoch          | ⚡ Bald       |
| Sort-Kontrolle (User-seitig)       | S       | Hoch          | ⚡ Bald       |
| Live-Ergebniszähler                | S       | Hoch          | ⚡ Bald       |
| Filter-Hierarchie (Tier 1/2)       | M       | Hoch          | ⚡ Bald       |
| **Mobile-First UX (Bottom-Sheet)** | **M**   | **Sehr Hoch** | **⚡ Bald**   |
| Echte Trending-Logik               | M       | Mittel        | ⚡ Bald       |
| **Interner Quality Score**         | **M**   | **Sehr Hoch** | **⚡ Bald**   |
| Komplexitäts-Badge                 | M       | Mittel        | 📅 Plan       |
| „Kopieren"-CTA in Card             | M       | Hoch          | ⚡ Bald       |
| „X× gebraut"-Zähler                | L       | Hoch          | 📅 Plan       |
| SSR / SEO                          | L       | Hoch          | 📅 Plan       |
| Infinite Scroll / Pagination       | M       | Mittel        | 📅 Plan       |
| Personalisierung 5.1 (Engine)      | XL      | Hoch          | ✅ Erledigt   |
| Einsteiger-Modus Toggle (5.2)      | S       | Mittel        | ✅ Done       |
| Ratings-Signal + Tooltip           | S       | Mittel        | ✅ Done       |
| Brewery-Follow-System (5.4)        | M       | Hoch          | 📅 Plan       |
| Dwell-Time-Tracking (5.1 Stufe B)  | M       | Mittel        | 📅 Plan       |
| Gespeicherte Filter (5.3, Premium) | M       | Mittel        | 📅 Plan       |
| Kollaboratives Filtering           | XL      | Hoch          | ✅ Done       |

---

---

## Rollout-Reihenfolge (lückenloser Plan)

Die Reihenfolge ist nicht optional — spätere Schritte bauen auf früheren auf.

### Stufe 1: Datenbank vorbereiten (kein User sieht etwas)

1. [x] `brews_backup_pre_discover_migration` — Struktur-Klon angelegt (kein Datendump nötig auf lokalem Docker)
2. [x] Neue Spalten per `ALTER TABLE … ADD COLUMN IF NOT EXISTS` hinzugefügt (`mash_method`, `mash_process`, `fermentation_type`, `mash_steps_count`, `quality_score`, `trending_score`, `copy_count`)
3. [x] Datenbankindizes angelegt (`idx_brews_public_style`, `idx_brews_quality_score`, `idx_brews_trending_score`, `idx_brews_mash_method`, `idx_brews_fermentation_type`, `idx_brews_copy_count`)
4. [x] Supabase-Funktionen & Trigger deployt (`trg_update_trending_on_like`, `trg_increment_copy_count`, `trg_sync_mash_steps_count`)
5. [x] Backfill-Skripte ausgeführt (Schritte 0, 0b, 0c, 0d, 0e, 0f in der Migration)
6. [x] Trending Scores initial berechnet (Schritt 0f)
7. [ ] Im Admin-Panel prüfen: Scores sehen plausibel aus?

> ✅ **Migration `20260220120000_discover_page_schema.sql` via `npx supabase db reset` lokal angewendet.** Für Production: `npx supabase db push` ausführen.

### Stufe 2: Phase 1 – UI-Fixes (sichtbar, aber risikoarm)

8. [x] Doppeldarstellungen entfernen (rein Frontend)
9. [x] Bewertungsanzahl anzeigen (rein Frontend)
10. [x] Suchleiste als Hero-Element (rein Frontend)
11. [x] Smarter Leere-State mit Fallback-Vorschlägen

> ✅ **Vollständig abgeschlossen.**

### Stufe 3: Phase 2 – Filter & Suche (benötigt Indizes aus Stufe 1)

12. [ ] Feature-Flag `ingredientFilter` → erst aktivieren nach Index-Prüfung
13. [x] ABV/IBU Chips, Brautyp-Toggle ✅ — Zutaten-Filter noch offen ❌
14. [x] Sort-Kontrolle (Top bewertet / Meist bewertet / Neueste)
15. [x] Stil-Chip-Leiste (8 Stile, horizontal scrollbar)
16. [ ] URL-Parameter-Sync
17. [x] Live-Ergebniszähler + „Alles zurücksetzen"

> ⚠️ **Weitgehend abgeschlossen.** Offen: Zutaten-Filter (braucht DB-Index), URL-Params.

### Stufe 4: Phase 2.5 – Quality Score aktivieren

17. [ ] Feature-Flag `qualityScore: true` setzen
18. [ ] Discover-Query auf `ORDER BY (text_rank * 0.6 + quality_score * 0.4)` umstellen
19. [ ] Im Admin-Panel beobachten: Welche Rezepte steigen? Welche fallen?
20. [x] Trending-Score-Trigger (`trg_update_trending_on_like`) — feuert bei `INSERT OR DELETE` auf `likes`, respektiert `trending_score_override` (Pins bleiben erhalten) ✅

> ✅ **Abgeschlossen** (Migration `20260221120000_live_trending_trigger_fix.sql`).

### Stufe 5: Phase 2.6 – Mobile-First UX

21. [x] Feature-Flag `mobileBottomSheet: false` → QA auf verschiedenen Geräten
22. [x] Bottom-Sheet für Filter implementieren
23. [x] 1-Spalten-Layout für BrewCards auf Mobile (bereits via `grid-cols-1`)
24. [x] Vollbild-Overlay für Suchleiste auf Mobile
25. [x] Feature-Flag `mobileBottomSheet: true` → live schalten

> ✅ **Vollständig:** 1-Spalte ✅, Bottom-Sheet ✅, Vollbild-Suchoverlay ✅, Letzte Suchen ✅.

### Stufe 6: Phase 3+ (Badges, SSR, Personalisierung)

26. [x] Komplexitäts-Badge ✅ — rein clientseitig aus `brew.data`, keine DB nötig
27. [x] `times_brewed`-Zähler — echte Brau-Sessions pro Rezept (`brewing_sessions.brew_id`) statt Remix-Klone (`copy_count`). Trigger auf `brewing_sessions INSERT/DELETE/UPDATE`, Backfill, Index `idx_brews_times_brewed`. Quality-Score v3 nutzt `times_brewed >= 1/3` statt `copy_count`. Anzeige in allen Card-Varianten als „🍺 X× gebraut". Migration `20260221170000_times_brewed.sql` ✅
28. [x] Verifikations-Badge „✓ Bewährt" ✅ — rein clientseitig, keine DB nötig
29. [x] „In Brauerei kopieren"-CTA in der Card ✅ — Portal-Dropdown, `remix_parent_id`
30. [x] SSR / SEO ✅ — `page.tsx` Server Component, `generateMetadata`, schema.org/Recipe JSON-LD
31. [x] Pagination / Infinite Scroll ✅ — IntersectionObserver, 20er-Batches, `loadMoreBrews()`
32. [x] Personalisierungs-Engine `lib/utils/recommendation-engine.ts` — `buildUserProfile`, `scoreBrewForUser`, `getPersonalizedBrews`, `getQualityFallback` ✅
33. [x] `supabase/migrations/20260221130000_brew_views.sql` — Tabelle + RLS + Indizes ✅
34. [x] `DiscoverClient.tsx` — eigene Brews laden, `personalizedBrews`-useMemo, „Für dich"-Section ✅
35. [x] Personalisierung **Stufe B** — `useBrewViewTracker` Hook (IntersectionObserver, 3s Dwell-Time, sessionStorage-Dedup) ✅ — `viewedStyles` mit Gewicht 0.5 im Nutzerprofil, alle 4 Karten-Varianten ✅
36. [x] Personalisierung **Stufe C** — `get_collaborative_recommendations` RPC (≥2 gemeinsame Likes, Top-50-Nutzer, +0.15 Score-Bonus, Cold-Start-Schutz) ✅
37. [x] DSGVO-Opt-Out: `useBrewViewTracker` respektiert `analytics_opt_out` aus Profil ✅ — Datenschutzerklärung Abschnitt 3.5 + 9 aktualisiert ✅
38. [x] Admin-Debug-Badge zeigt `Q:x · P:x.xx` (Quality + Personalisierungsscore) in allen 4 Karten-Varianten ✅
39. [x] „Warum empfohlen?"-Tooltip auf der Karte (zeigt Hauptsignal: Stil / Hop / Collab / Trending)
40. [x] Einsteiger-Modus Toggle (5.2)
41. [ ] Gespeicherte Filter (5.4, Premium)
42. [ ] Brewery-Follow-System (5.5)
