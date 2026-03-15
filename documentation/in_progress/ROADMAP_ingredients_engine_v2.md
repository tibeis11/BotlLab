# Roadmap: Ingredients Engine v2 — Hierarchische Zutaten-Datenbank & BeerXML-Interoperabilität

## **UPDATE (Letzter Stand - WICHTIG)**
> **Status: ✅ Ingredients Engine v2 — Kern vollständig · Qualitäts-Audit abgeschlossen (Stand: 15. März 2026)**
>
> **Zuletzt abgeschlossen — Quality Audit & Reparaturen (15. März 2026):**
> - **Stilles Speicherversagen gefixt**: `extractAndSaveRecipeIngredients` wirft jetzt einen echten Fehler statt silent return. BrewEditor fängt ihn ab und zeigt ihn dem User.
> - **Import Wizard `master_id`-Leck gefixt**: `mapRecipeToBrewForm` übergibt `master_id` jetzt korrekt aus dem Match-Ergebnis in die malt/hop/yeast-Objekte → beim Speichern landen echte Master-IDs in `recipe_ingredients`.
> - **Fuzzy-Match Threshold erhöht**: Level-5-Schwelle von `0.25 → 0.35` (Migration `20260319180000`) — eliminiert False Positives bei kurzen Namen.
> - **Composite Index**: `(recipe_id, type)` auf `recipe_ingredients` (Migration `20260319170000`) für effizientere Adapter-Queries.
> - **Import Bounds-Checking**: Neuer `clampAmount()` Helper (`lib/ingredient-parser/utils.ts`) in BeerXML, BeerJSON und MMuM eingebunden — verhindert Garbage-Werte (z.B. 9999 kg Malz).
> - **Fallback-UUIDs zentralisiert**: Neue Konstanten-Datei `lib/ingredients/constants.ts` (FALLBACK_MASTER_IDS / FALLBACK_MASTER_ID_SET) — Adapter importiert daraus, Script hat Kommentar-Hinweis.
> - **Vollständiges Adapter-Audit aller 15 Dateien**: 4 echte Bugs gefunden und gefixt:
>   1. `botlguide/route.ts` L344 — Adapter-Ergebnis für `recentBrews` verworfen → Gefixt
>   2. `FermentationTab.tsx` L146 — `yeast?.name` auf Array → `[object Object]` ans BotlGuide → Gefixt
>   3. `CompletedTab.tsx` L289 — gleiche Yeast-Array-Problematik für PDF-Export → Gefixt
>   4. `botlguide-embed/index.ts` — Edge Function las `brew.data.malts/hops` direkt (nach Migration leer) → Gefixt via `recipe_ingredients` Query
>
> **Bewusst zurückgestellt (kein Showstopper):**
> - **Supabase Types veraltet**: RPC-Aufrufe nutzen `as any`. Zu beheben nach Schema-Freeze via `supabase gen types`.
> - **Taste-Score-Erweiterungen Phase 5.2**: Cohumulone, Melanoidin, Hefeesterigkeit. Hängt von besserer `product_id`-Abdeckung ab.

---

## ✅ Vollständige Checkliste (Stand: 15. März 2026)

> **Legende:** ✅ Abgeschlossen · ⏳ Bewusst zurückgestellt · ❌ Nicht implementiert

### Phase 0 — Schema & Infrastruktur
- [x] Tabellen `ingredient_master`, `ingredient_products`, `ingredient_import_queue`, `recipe_ingredients` angelegt
- [x] FK `recipe_ingredients.recipe_id → brews(id) ON DELETE CASCADE`
- [x] Basis-Indizes auf `recipe_id`, `master_id`, `type`
- [x] RLS für alle Tabellen aktiviert (public read, authenticated insert für queue)
- [x] Admin Write RLS für `ingredient_master` + `ingredient_products` (prüft `admin_users`)
- [x] `pg_trgm` Extension aktiviert + GIN-Index `idx_ingredient_master_aliases_trgm`
- [x] `aliases_flat` Spalte + Trigger für trgm-kompatible Suche
- [x] `match_ingredient()` RPC mit 5-Stufen-Logik (Exakt Produkt → Exakt Master/Alias → Alias-Substring → Fuzzy Produkt → Fuzzy Master)
- [x] Fuzzy-Threshold von 0.25 auf 0.35 erhöht (`20260319180000`)
- [x] Composite Index `(recipe_id, type)` auf `recipe_ingredients` (`20260319170000`)
- [x] `idx_ingredient_products_manufacturer` — in Base-Schema Phase 0 enthalten

### Phase 1 — Seed-Datenbank
- [x] 512 `ingredient_master` Einträge (Malze, Hopfen, Hefen, Misc)
- [x] 512 `ingredient_products` Einträge mit Herstellerangaben
- [x] Deutsche Aliases für alle gängigen Zutaten (`20260318600000_german_aliases.sql`)
- [x] Legal-Validierung in `documentation/legal/INGREDIENTS_DATA_COMPLIANCE.md`
- [x] Durchschnitts-Trigger auf `ingredient_master` für aggregierte Produktwerte
- [x] W-34/70 Aliases ("34/70", "W34/70", "Saflager W-34/70") — `20260319120000_yeast_alias_34_70.sql`

### Phase 2 — BeerXML / BeerJSON Import
- [x] Parser-Abstraktion `IRecipeParser` + `ParsedRecipe` Typen (`lib/ingredient-parser/types.ts`)
- [x] BeerXML Parser (`lib/ingredient-parser/beerxml.ts`) inkl. Fermentable, Hop, Yeast, Mash Steps
- [x] BeerJSON Parser (`lib/ingredient-parser/beerjson.ts`)
- [x] MMuM JSON Parser (`lib/ingredient-parser/mmumjson.ts`)
- [x] `clampAmount()` Bounds-Checking Helper in allen 3 Parsern eingebunden (`lib/ingredient-parser/utils.ts`)
- [x] Smart-Match Server Action (`app/api/match-ingredients/route.ts`)
- [x] Import-Wizard UI mit Drag & Drop (`app/team/[breweryId]/brews/import/page.tsx`)
- [x] Match-Preview Komponente (`app/team/[breweryId]/brews/import/ImportMatchPreview.tsx`)
- [x] `ManualMatchRow` — ungematchte Zutaten manuell zuweisen
- [x] `master_id` wird aus Match-Ergebnis korrekt in `mapRecipeToBrewForm` übertragen (Fix: 15. März 2026)
- [x] BrewEditor-Integration: Import landet als vollständig verknüpftes Rezept
- [x] BeerXML Export (`lib/recipe-export.ts`)
- [x] BeerJSON Export (`lib/recipe-export.ts`)
- [x] PDF Export (`lib/brew-pdf.ts`)
- [x] N+1 Queries im Import behoben — `match_ingredients_batch()` RPC (1 Call statt N)

### Phase 3 — JSONB-Migration & Anti-Corruption Layer
- [x] Write-Adapter `extractAndSaveRecipeIngredients` — JSONB → relational bei jedem Save
- [x] Read-Adapter `mergeRecipeIngredientsIntoData` — relational → JSONB für Downstream-Kompatibilität
- [x] Fehler im Adapter werden jetzt geworfen statt still ignoriert (Fix: 15. März 2026)
- [x] Batch-Migrations-Script `scripts/migrate-jsonb-ingredients.js`
- [x] Rematch-Script `scripts/rematch-recipe-ingredients.js`
- [x] Validierungs-Script `scripts/validate-ingredient-migration.js`
- [x] Alle Production-Brews migriert (100%, 0 JSONB-Keys verbleibend)
- [x] Fallback-UUIDs zentralisiert in `lib/ingredients/constants.ts`

### Adapter-Verdrahtung (alle Datenpfade)
- [x] `BrewEditor.tsx` — Lesen + Speichern verdrahtet, Fehler abgefangen
- [x] `app/brew/[id]/page.tsx` + `layout.tsx` — öffentliche Brauseite
- [x] `app/b/[id]/page.tsx` — Scan-Seite
- [x] `app/discover/page.tsx` — Discover-Seite
- [x] `SessionContext.tsx` — Session-Kontext
- [x] `app/api/botlguide/route.ts` — BotlGuide AI (recentBrews-Fix: 15. März 2026)
- [x] `lib/actions/brew-actions.ts` — `getBrewForEdit` Server Action
- [x] `FermentationTab.tsx` — Yeast-Array-Fix (15. März 2026)
- [x] `CompletedTab.tsx` — Yeast-Array-Fix für PDF-Export (15. März 2026)
- [x] `supabase/functions/botlguide-embed/index.ts` — Edge Function liest jetzt aus `recipe_ingredients`

### Phase 4 — Import-Queue & Duplicate Prevention
- [x] Migration `20260319000000_phase4_import_queue.sql`
- [x] Import-Deduplizierung (gleicher Name + Typ → kein doppelter Queue-Eintrag)
- [x] Admin-Queue-UI mit Merge/Reject-Modals
- [x] Live-Badge in Sidebar zeigt offene Queue-Einträge
- [x] `ingredient_import_queue.import_count` — in Phase 4 Migration enthalten (`20260319000000`)

### Phase 5 — Qualitäts-Score Integration
- [x] `calculate_brew_quality_score` liest aus `recipe_ingredients`
- [x] `potential_pts` aus DB als primäre Quelle, `MALT_POTENTIAL_TABLE` als Fallback
- [x] `get_user_brew_context` RPC liest aus `recipe_ingredients`
- ⏳ Taste-Score-Erweiterungen (Cohumulone, Melanoidin, Hefeesterigkeit) — hängt von besserer `product_id`-Abdeckung ab

### Phase 6 — UI/UX Upgrade
- [x] Malz-Editor: Vollständig auf neues Design und Mobile-UX umgebaut
- [x] Hopfen-Editor: Vollständig auf neues Design und Mobile-UX umgebaut
- [x] Hefe-Editor: Vollständig auf neues Design und Mobile-UX umgebaut
- [x] Maischeplan-Editor: Vollständig auf neues Design und Mobile-UX umgebaut

### Technische Schulden (bewusst zurückgestellt)
- [x] **N+1 Queries im Import**: `match_ingredients_batch()` RPC implementiert (`20260319200000`) + `recipe-import.ts` auf Batch-Call umgestellt
- ⏳ **Supabase Types**: `supabase gen types` nach Schema-Freeze ausführen; RPCs nutzen aktuell `as any`
- ⏳ **Taste-Score Phase 5.2**: Cohumulone, Melanoidin, Hefeesterigkeit — nach besserer Product-Coverage

---

**Kontext:** Zutaten werden aktuell als unkontrollierter JSONB-Blob in der `data`-Spalte jedes Rezepts gespeichert (`data->'hops'`, `data->'malts'`, `data->'yeast'`). Berechnungslogik wie Extrakt-Potenziale und EBC-Defaults liegen als Code in `lib/brewing-calculations.ts` — als Regex-Tabelle mit 40+ Patterns, die jede neue Zutat im Code statt in der Datenbank erfordert. Diese Roadmap überführt das System in ein relationales 3-Ebenen-Modell mit BeerXML-Import, löst die JSONB-Migrationslast und behebt alle strukturellen Schwachstellen des aktuellen Designs.

---

## Implementierungsstand (Stand: 15. März 2026)

> **Legende:** ✅ Erledigt · ⚠️ Teilweise / mit Lücken · ❌ Nicht implementiert · 🔴 Kritische Lücke

### Gesamtstatus nach Phasen

| Phase | Status | Kritische Lücken |
|-------|--------|-----------------|
| Phase 0 — Schema | ✅ **Vollständig** | Admin-Write-RLS, `aliases_flat`/trgm, GIN-Index nachträglich ergänzt via `20260318300000_smart_match_infrastructure.sql` |
| Phase 1 — Seed-Datenbank | ✅ **512 Master + 512 Products** | Seed via `20260318200000_ingredient_seed.sql`. Malze, Hopfen, Hefen, Misc je mit Herstellervarianten & Aliase. Legal validiert in `documentation/legal/INGREDIENTS_DATA_COMPLIANCE.md` |
| Phase 2 — BeerXML/BeerJSON Import | ✅ **Vollständig** | Parser, Smart Match, Server Action, Import-Wizard UI mit Drag & Drop, Match-Preview, manuellem Zuweisen (`ManualMatchRow`) und BrewEditor-Integration. Export: client-seitig via `lib/recipe-export.ts` + `lib/brew-pdf.ts` (BeerXML, BeerJSON, PDF). |
| Phase 3 — JSONB-Migration | ✅ **Vollständig** | Alle Production-Brews migriert (100%, 0 JSONB-Keys verbleibend). Batch-Migration via `scripts/migrate-jsonb-ingredients.js`, Rematch via `scripts/rematch-recipe-ingredients.js`, Validierung via `scripts/validate-ingredient-migration.js`. Durchschnitts-Trigger auf `ingredient_master`. |
| Phase 4 — Duplicate Prevention | ✅ **Vollständig** | Migration `20260319000000_phase4_import_queue.sql`, Import-Deduplication, Admin-Queue-UI mit Merge/Reject-Modals, Live-Badge in Sidebar |
| Phase 5 — Score-Integration | ✅ **Vollständig (Hybrid)** | `calculate_brew_quality_score` liest aus `recipe_ingredients`. `potential_pts` aus DB wird als primäre Quelle genutzt, `MALT_POTENTIAL_TABLE` dient als korrekter Fallback für ungematchte Zutaten. Taste-Score-Erweiterungen (Phase 5.2) bewusst auf Later verschoben. |
| Phase 6 — UI/UX Upgrade | ✅ **Umgesetzt** | Editoren für Malz, Hopfen, Hefe und Maischeplan vollständig auf neues Design und Mobile-UX umgebaut |

### Anti-Corruption Layer (Adapter)
| Komponente | Status | Datei |
|-----------|--------|-------|
| Read-Adapter (JSONB ← relational) | ✅ Implementiert | `lib/ingredients/ingredient-adapter.ts` |
| Write-Adapter (JSONB → relational) | ✅ Implementiert | `lib/ingredients/ingredient-adapter.ts` |
| BrewEditor (Lesen + Speichern) | ✅ Verdrahtet | `BrewEditor.tsx` L36, L691, L766, L843 |
| Öffentliche Brauseite | ✅ Verdrahtet | `app/brew/[id]/page.tsx`, `layout.tsx` |
| Scan-Seite | ✅ Verdrahtet | `app/b/[id]/page.tsx` |
| Discover-Seite | ✅ Verdrahtet | `app/discover/page.tsx` |
| Session-Kontext | ✅ Verdrahtet | `SessionContext.tsx` |
| BotlGuide AI (recentBrews) | ✅ Verdrahtet | `app/api/botlguide/route.ts` |
| getBrewForEdit Server Action | ✅ Verdrahtet | `lib/actions/brew-actions.ts` |
| Quality-Score DB-Funktion | ✅ **Angepasst** | Liest jetzt aus `recipe_ingredients` — `supabase/migrations/20260318100000_fix_ingredients_engine_bugs.sql` |
| `get_user_brew_context` RPC (alle Varianten) | ✅ **Angepasst** | Letzte Version in `20260318100000` liest aus `recipe_ingredients` und überschreibt alle älteren Versionen via `CREATE OR REPLACE` |
| `MALT_POTENTIAL_TABLE` in brewing-calculations.ts | ✅ Hybrid-Ansatz implementiert | DB `potential_pts` hat Vorrang (Zeile 516), Regex-Tabelle ist korrekter Fallback für ungematchte Zutaten |

---

## Architektur-Entscheidungen (vor dem ersten Code)

### A.1 — Granularität von `ingredient_master`

"Pilsner Malz" ist in der Konzeptbeschreibung als Kategorie gelistet — es ist aber bereits ein **spezifischer Produkttyp**, keine Kategorie. Die zwei Optionen:

| Option | `ingredient_master` entspricht | Beispiel |
|--------|-------------------------------|---------|
| **Flach** (empfohlen) | Produkttyp / -art | "Citra", "Pilsner Malz", "US-05" |
| **Tief** | Übergeordnete Kategorie | "Aromaopfen", "Basismalz", "Trockenhefe" |

**Entscheidung:** Flaches Modell. `ingredient_master` ist der **Produkttyp** (z.B. "Citra Hopfen"), `ingredient_products` ist das **Herstellerprodukt** (z.B. "Citra 2024 Ernte – HopUnion"). Die Kategorie (Maize, Hop, Yeast, Misc) ist ein Enum-Feld auf `ingredient_master`, kein eigenes Level. Dadurch bleibt die Discover-Suche einfach und alle Queries bleiben auf 2 JOIN-Ebenen.

### A.2 — BeerXML vs. BeerJSON

BeerXML ist der De-facto-Standard für ältere Software (BeerSmith 2/3, Braumagazin, Craftbeerpi). **BeerJSON** (JSON-basierter Nachfolger, 2020) wird zunehmend von neueren Tools (Brewfather, BrewTracker) genutzt und ist maschinell einfacher zu parsen. Die Roadmap implementiert primär BeerXML, legt aber explizit eine Parser-Abstraktion an, die BeerJSON in Phase 4 ohne Refactoring ergänzt.

### A.3 — Wer befüllt die Datenbank?

200 Seed-Einträge decken DE/AT/CH-Standard ab. International (Nelson Sauvin, Mosaic, East Kent Goldings) sind eher 500+ nötig. Drei Modelle:

- **Admin-only** (sicher, langsam): Nur verifizierte Admins können `ingredient_products` anlegen
- **Community + Review** (Untappd-Modell): User schlagen Zutaten vor, Admin approved
- **Import-First** (gewählt für v2): Beim BeerXML-Import werden unbekannte Zutaten in eine `ingredient_import_queue` geschrieben, nicht direkt in `ingredient_products`. Admin reviewed und merged von dort.

---

## Phase 0 — Schema-Design & Migration

> **Status: ✅ Implementiert — `supabase/migrations/20260318000000_ingredients_engine_v2.sql`**
>
> **Umgesetzt am:** 13. März 2026 (Ergänzungen via `20260318300000_smart_match_infrastructure.sql` am 14. März 2026)
>
> **Was wurde gemacht:**
> - Alle 4 Tabellen angelegt: `ingredient_master`, `ingredient_products`, `ingredient_import_queue`, `recipe_ingredients`
> - FK `recipe_ingredients.recipe_id → brews(id) ON DELETE CASCADE` korrekt gesetzt
> - Basis-Indizes auf `recipe_id`, `master_id`, `type` gesetzt
> - RLS für alle Tabellen aktiviert (public read, authenticated insert für queue)
> - ✅ `aliases_flat` Spalte + Trigger (via Smart-Match-Migration, da `GENERATED ALWAYS` wegen `array_to_string` nicht immutable)
> - ✅ `pg_trgm` Extension aktiviert + GIN-Index `idx_ingredient_master_aliases_trgm`
> - ✅ Admin Write RLS für `ingredient_master` + `ingredient_products` (prüft `admin_users`)
> - ✅ `match_ingredient()` RPC mit 3-Stufen-Logik (Exakt, Alias-Substring, Fuzzy)
>
> **⚠️ Verbleibende Lücken:**
> 1. **`idx_ingredient_products_manufacturer` fehlt** — Kleiner, aber im Plan vorgesehen.
> 2. **`ingredient_import_queue.import_count` fehlt** — Die Deduplizierungs-Spalte aus Phase 4.3 wurde nicht vorab angelegt.

### 0.1 — Neue Tabellen anlegen

**Datei:** `supabase/migrations/YYYYMMDDXXXXXX_ingredients_engine_v2.sql`

```sql
-- ── Ebene 1: Ingredient Master (Produkttyp) ─────────────────────────────
CREATE TABLE ingredient_master (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                           -- "Citra", "Pilsner Malz"
  type          TEXT NOT NULL CHECK (type IN ('malt','hop','yeast','misc','water')),
  aliases       TEXT[] DEFAULT '{}',                     -- z.B. ARRAY['Citra HBC 394','HBC-394']
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredient_master_type ON ingredient_master(type);
-- GIN-Index für Alias-Suche (auch partielle Matches)
CREATE INDEX idx_ingredient_master_aliases ON ingredient_master USING GIN(aliases);

-- ── Ebene 2: Ingredient Products (Hersteller-Produkt) ───────────────────
CREATE TABLE ingredient_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id     UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,             -- "Weyermann Pilsner Malz 2024"
  manufacturer  TEXT,                      -- "Weyermann", "Barth-Haas"
  -- Malz-Felder
  color_ebc     NUMERIC(7,2),              -- exakter EBC-Wert laut Hersteller
  potential_pts NUMERIC(6,2),              -- Extrakt-Potential in pts·L/kg
  -- Hopfen-Felder
  alpha_pct     NUMERIC(5,2),              -- Alpha-Säure-Durchschnitt %
  beta_pct      NUMERIC(5,2),
  cohumulone_pct NUMERIC(5,2),
  -- Hefe-Felder
  attenuation_pct NUMERIC(5,2),           -- Vergärungsgrad %
  flocculation    TEXT CHECK (flocculation IN ('low','medium','high','very_high')),
  min_temp_c      NUMERIC(4,1),
  max_temp_c      NUMERIC(4,1),
  alcohol_tolerance_pct NUMERIC(4,1),
  -- Gemeinsam
  notes           TEXT,
  source_url      TEXT,                    -- Hersteller-Datenblatt URL
  is_verified     BOOLEAN DEFAULT false,   -- durch Admin validiert
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredient_products_master ON ingredient_products(master_id);
CREATE INDEX idx_ingredient_products_manufacturer ON ingredient_products(manufacturer);

-- ── Import-Queue: Unbekannte Zutaten aus BeerXML-Imports ─────────────────
CREATE TABLE ingredient_import_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_name        TEXT NOT NULL,           -- Original-Name aus der XML
  type            TEXT,
  raw_data        JSONB,                   -- komplettes XML-Objekt zur Prüfung
  suggested_master_id UUID REFERENCES ingredient_master(id),
  imported_by     UUID REFERENCES auth.users(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','merged','rejected')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Ebene 3: Recipe Ingredients (Rezept-Instanz, vorerst als View) ────────
-- Hinweis: In Phase 1 (JSONB-Migration) wird diese Tabelle befüllt.
-- Die Grundstruktur wird hier bereits definiert, bleibt aber leer.
CREATE TABLE recipe_ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       UUID NOT NULL,           -- FK auf brews oder recipes
  product_id      UUID REFERENCES ingredient_products(id),
  master_id       UUID REFERENCES ingredient_master(id),
  raw_name        TEXT,                    -- Fallback wenn kein Match
  amount          NUMERIC(10,3),
  unit            TEXT,
  -- Hop-spezifisch
  time_minutes    INTEGER,
  usage           TEXT,                    -- Boil, Dry Hop, Whirlpool, Mash, First Wort
  -- Override-Felder (User überschreibt Produktstandard für diesen Sud)
  override_alpha  NUMERIC(5,2),
  override_color_ebc NUMERIC(7,2),
  override_attenuation NUMERIC(5,2),
  -- Meta
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_product ON recipe_ingredients(product_id);
```

### 0.2 — Row Level Security

```sql
-- ingredient_master + ingredient_products: lesbar für alle authentifizierten User
ALTER TABLE ingredient_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON ingredient_master FOR SELECT USING (true);
CREATE POLICY "admin write" ON ingredient_master FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE ingredient_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON ingredient_products FOR SELECT USING (true);
CREATE POLICY "admin write" ON ingredient_products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Import-Queue: User sieht nur eigene Einträge, Admin sieht alle
ALTER TABLE ingredient_import_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entries" ON ingredient_import_queue FOR SELECT USING (
  imported_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "authenticated insert" ON ingredient_import_queue FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- recipe_ingredients: User kann eigene Rezept-Zutaten lesen/schreiben
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
-- (FK-basierte Policy hängt vom konkreten recipes/brews Tabellennamen ab)
```

---

## Phase 1 — Seed-Datenbank (300+ Zutaten)

> **Status: ✅ Vollständig — 512 Master-Einträge + 512 Product-Einträge**
>
> **Umgesetzt am:** 14. März 2026
>
> **Was wurde gemacht:**
> - 512 `ingredient_master`-Einträge seeded: Malze (~180), Hopfen (~170), Hefen (~100), Misc (~60)
> - Jeder Master hat ein ausgefülltes `aliases`-Array mit EN/DE-Standardnamen, Herstellerbezeichnungen und gängigen Abkürzungen
> - 512 zugehörige `ingredient_products`-Einträge mit technischen Werten (EBC, Potential, Alpha, Attenuation)
> - Mehrere Hersteller pro Produkttyp (Weyermann, BestMalz, Briess, Simpsons, Crisp, etc.)
> - Seed-Migration: `supabase/migrations/20260318200000_ingredient_seed.sql` (3593 Zeilen)
> - Legal-Compliance dokumentiert: `documentation/legal/INGREDIENTS_DATA_COMPLIANCE.md`
> - 4 "Empty Master" Fallback-Einträge (aus Phase 0 Migration) bleiben als Fallback erhalten
>
> **⚠️ Bekannte Einschränkung:**
> - `MALT_POTENTIAL_TABLE` in `lib/brewing-calculations.ts` wurde noch NICHT auf DB-Lookup umgestellt (Phase 1.3 steht aus)
> - Generische Aliase wie "Pilsner Malt" existieren in mehreren Master-Einträgen (erwartetes Verhalten — verschiedene Hersteller)

### 1.1 — Seed-Strategie

Die `MALT_POTENTIAL_TABLE` in `lib/brewing-calculations.ts` (40+ Regex-Einträge) ist strukturell eine Datenbank-Tabelle im Code. Diese Werte werden **direkt in den Seed** überführt und sind nach Phase 1 die alleinige Quelle der Wahrheit.

**Priorität für den Seed-Umfang:**

| Typ | Anzahl Seed-Einträge | Begründung |
|-----|---------------------|------------|
| Unbekannt | 4 (Malz, Hopfen, Hefe, Sonstiges) | **Kritisch:** Die 4 "Empty Master" Kategorien für den Import-Fallback |
| Malze | ~120 | Weyermann, Best Malz, Briess, Crisp als Hersteller |
| Hopfen | ~100 | DE (Hallertau-Sorten), US (C-Hops, modernes Sortiment), NZ |
| Hefen | ~60 | Fermentis, Lallemand, Wyeast, White Labs, Imperial |
| Sonstiges | ~30 | Zucker, Adjunkte, Wasserbehandlung |

### 1.2 — Alias-Feld ist Pflicht

Jeder `ingredient_master`-Eintrag braucht ein befülltes `aliases`-Array. Das ist der eigentliche Mehrwert: Das System erkennt, dass "Citra HBC 394", "HBC-394" und "Citra" derselbe `master_id` sind. Ohne dieses Feld degradiert der Smart Match zum einfachen String-Vergleich.

**Mindeststandard pro Eintrag:**
- Eigenname (EN/DE)
- BeerSmith-Standardname
- Gängige Abkürzungen

**Beispiel:**
```sql
INSERT INTO ingredient_master (name, type, aliases) VALUES
('Citra Hopfen', 'hop', ARRAY[
  'Citra', 'Citra HBC', 'HBC-394', 'HBC394', 'Citra (HBC-394)'
]);
```

### 1.3 — `brewing-calculations.ts` auf DB-Lookup umstellen

Nach dem Seed ist `MALT_POTENTIAL_TABLE` obsolet. Die Funktionen `getMaltPotential()` und `getMaltDefaultEBC()` werden auf Datenbankabfragen umgeschrieben.

**Neue Signatur:**
```ts
// lib/brewing-calculations.ts
export async function getMaltPotential(
  maltName: string,
  productId?: string
): Promise<number> {
  if (productId) {
    const { data } = await supabase
      .from('ingredient_products')
      .select('potential_pts, master_id')
      .eq('id', productId)
      .single();
    if (data?.potential_pts) return data.potential_pts;
  }
  // Fallback: Fuzzy-Match über aliases
  const { data } = await supabase
    .from('ingredient_master')
    .select('id')
    .contains('aliases', [maltName])
    .limit(1)
    .single();
  // ... Lookup über master → products → avg(potential_pts)
  return 300; // Fallback: generischer Basismalz-Wert
}
```

**Wichtig:** Die synchrone Regex-Tabelle bleibt als statischer Fallback erhalten (z.B. für Server-Startup ohne DB-Verbindung), wird aber nicht mehr aktiv befüllt.

---

## Phase 2 — BeerXML Import-Parser

> **Status: ⚠️ Parser + Smart Match + Server Action fertig — UI fehlt noch**
>
> **Umgesetzt am:** 14. März 2026
>
> **Was wurde gemacht:**
> - ✅ `lib/ingredient-parser/types.ts` — Parser-Abstraktion (`IRecipeParser`, `ParsedIngredient`, `ParsedRecipe`)
> - ✅ `lib/ingredient-parser/beerxml.ts` — BeerXML-Parser mit `fast-xml-parser` (npm installiert)
> - ✅ `lib/ingredient-parser/beerjson.ts` — BeerJSON-Parser (kein Extra-Dep, native JSON)
> - ✅ `lib/ingredient-parser/index.ts` — `RecipeImportService` Facade mit automatischer Formaterkennung
> - ✅ `supabase/migrations/20260318300000_smart_match_infrastructure.sql` — `pg_trgm`, `aliases_flat` Trigger, GIN-Index, Admin-Write-RLS, `match_ingredient` RPC (3-Stufen: Exakt → Alias-Substring → Fuzzy)
> - ✅ `lib/actions/recipe-import.ts` — Server Action: Auth-Check, 2MB-Limit, `parseFileContent()` + `match_ingredient` RPC + Auto-Insert in `ingredient_import_queue`
>
> **❌ Noch nicht umgesetzt:**
> - `GET /api/brews/[id]/export?format=beerxml` Export-Endpunkt fehlt
> - Import-Wizard UI fehlt komplett (Phase 6.3)
>
> **Abhängigkeiten:** Phase 1 (Seed) ✅ erfüllt — Smart Match operiert jetzt gegen 512 echte Master-Einträge.

### 2.1 — Parser-Abstraktion (BeerXML + BeerJSON-fähig)

Um BeerJSON in Phase 4 ohne Refactoring ergänzen zu können, liegt die eigentliche Logik in einem Format-agnostischen Interface:

```ts
// lib/ingredient-parser/types.ts
export interface ParsedIngredient {
  rawName: string;
  type: 'malt' | 'hop' | 'yeast' | 'misc';
  amount: number;
  unit: string;
  colorEbc?: number;
  alphaPct?: number;
  timeMinutes?: number;
  usage?: string;
  attenuationPct?: number;
  manufacturer?: string;
  rawData: Record<string, string>; // Original-XML-Knoten für die Queue
}

export interface RecipeParser {
  parse(input: string): Promise<ParsedRecipe>;
}
```

```ts
// lib/ingredient-parser/beerxml-parser.ts
import { XMLParser } from 'fast-xml-parser';

export class BeerXMLParser implements RecipeParser {
  async parse(xmlString: string): Promise<ParsedRecipe> {
    const parser = new XMLParser({ ignoreAttributes: false });
    const doc = parser.parse(xmlString);
    // ... Mapping BeerXML-Tags → ParsedIngredient
    // Einheiten-Konversion: kg (Malz), g (Hopfen), ml (Wasser), % (Hefe)
  }
}
```

**Abhängigkeit:** `fast-xml-parser` (kein nativer XML-Parser, da sicherer gegen XXE-Injection als `DOMParser` mit externen Entitäten).

> **Sicherheitshinweis:** BeerXML-Dateien von externen Quellen müssen gegen XXE-Injection (XML External Entity) gesichert werden. `fast-xml-parser` ist hier sicher, da externe Entitäten standardmäßig deaktiviert sind.

### 2.2 — Smart Match Algorithmus

Der Match-Prozess läuft in drei Stufen, von genau bis unscharf:

```
Stufe 1: Exakter Alias-Match
  → ingredient_master.aliases @> ARRAY[rawName]
  → Trefferquote erwartet: ~40% (bekannte Zutaten aus BeerSmith-Standardnamen)

Stufe 2: Normalisierter Match
  → Normalisierung: Kleinschrift, Umlaute (ä→ae), Bindestriche entfernen
  → Vergleich gegen normalisierte aliases
  → Trefferquote erwartet: weitere ~30%

Stufe 3: Fuzzy Match (Trigram-Suche)
  → pg_trgm Extension: similarity(aliases_flat, normalized_name) > 0.6
  → Ergebnis als "Vorschlag" markiert (nicht auto-gemacht)
  → Trefferquote erwartet: weitere ~20%

Kein Match → "Empty Master" Fallback
  → Wird dem globalen "Unbekannt / Sonstiges [Typ]" Master zugeordnet
  → Erhält eine Eintragung in der `ingredient_import_queue` für spätere Admin-Zuordnung
  → Bleibt im Rezept aber SOFORT voll nutzbar durch Überschreiben (Overrides)
```

```sql
-- pg_trgm für Stufe 3 aktivieren
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Hilfsfunktion: aliases-Array als flat string für Trigram-Suche
ALTER TABLE ingredient_master ADD COLUMN aliases_flat TEXT
  GENERATED ALWAYS AS (array_to_string(aliases, ' ')) STORED;

CREATE INDEX idx_ingredient_master_aliases_trgm
  ON ingredient_master USING GIN (aliases_flat gin_trgm_ops);
```

### 2.3 — Import-Endpunkt (Route Handler)

```
POST /api/ingredients/import-beerxml
  → Authentifizierung erforderlich
  → Multipart: Datei-Upload (.xml, max 2MB)
  → Response: { matched: [], unmatched: [], recipe: ParsedRecipe }
  → Schreibt unbekannte Zutaten in ingredient_import_queue
  → Schreibt NICHT direkt in ingredient_products
```

**Die importierten Rezept-Daten werden in der bestehenden JSONB-Struktur gespeichert** (mit zusätzlichem `product_id`-Feld wo ein Match gelungen ist), solange Phase 3 (JSONB-Migration) noch nicht abgeschlossen ist. So funktioniert der Import sofort, ohne dass alle alten Rezepte migriert sein müssen.

### 2.4 — Export-Endpunkt

```
GET /api/brews/[id]/export?format=beerxml
  → Liest Rezept-Daten (JSONB oder recipe_ingredients je nach Phase)
  → Rendert valides BeerXML 2.1 gemäß Spezifikation
  → Content-Type: application/xml
  → Dateiname: {slug}-{date}.xml
```

---

## Phase 3 — JSONB-Migration (kritischer Pfad)

> **Status: ⚠️ Datenmigration ausgeführt, aber mit kritischen Lücken im DB-Layer**
>
> **Was wurde gemacht:**
> - ✅ Die SQL-Migration `20260318000000_ingredients_engine_v2.sql` enthält einen PL/pgSQL-Block, der bei `db reset` / `db push` alle existierenden JSONB-Rezepte in `recipe_ingredients`-Zeilen extrahiert.
> - ✅ Der destruktive DELETE-Step `UPDATE brews SET data = data - 'malts' - 'hops' - 'yeast'` ist in der Migration enthalten. **Die JSONB-Keys werden gelöscht.**
> - ✅ Anti-Corruption Layer (Adapter) im Frontend vollständig verdrahtet (10 Integrationspunkte — s. Tabelle oben).
> - ✅ Write-Adapter: Beim Speichern im BrewEditor werden Zutaten in `recipe_ingredients` geschrieben und aus dem JSONB-Blob entfernt.
>
> **✅ NACHTRÄGLICH BEHOBEN (14. März 2026) — `supabase/migrations/20260318100000_fix_ingredients_engine_bugs.sql`**
>
> **Fix A: `calculate_brew_quality_score()` — ✅ Behoben**
> Funktion wurde vollständig neu geschrieben. Liest jetzt:
> ```sql
> FROM recipe_ingredients ri WHERE ri.recipe_id = brew_id_param AND ri.type = 'malt'
> ```
> Statt der alten JSONB-Pfade. Alle bereits bestehenden Quality Scores wurden im gleichen Migrations-Script rückwirkend neu berechnet (`UPDATE brews SET quality_score = ...`).
>
> **Fix B: `get_user_brew_context()` RPC — ✅ Behoben**
> Alle 9 Stage-5-Migrationsdateien (20260314100000 bis 20260317220000) verwendeten `CREATE OR REPLACE` auf dieselbe Funktion (gleiche Signatur: `p_user_id uuid, p_session_id uuid`). Da `20260318100000` als letztes ausgeführt wird, ist die live-Version jetzt korrekt und liest aus `recipe_ingredients`. Der Inspiration-Signal-Block (Top-3 Hopfen) wurde ebenfalls auf `recipe_ingredients` umgestellt.
>
> **Fix C: `ingredients_migrated` Tracking-Column — ✅ Behoben**
> `ALTER TABLE public.brews ADD COLUMN IF NOT EXISTS ingredients_migrated BOOLEAN DEFAULT false` wurde angelegt. Alle Brews mit vorhandenen `recipe_ingredients`-Zeilen wurden auf `true` gesetzt.
>
> **Fix D: Adapter-Architektur — ✅ Akzeptabel**
> `lib/ingredients/ingredient-adapter.ts` akzeptiert einen optionalen `client`-Parameter (`const sb = client ?? browserClient`). Server Components können den Server-Client übergeben. Der Browser-Fallback bleibt, ist aber kein aktiver Fehler.
>
> **⚠️ NOCH OFFENE MINOR-LÜCKEN:**
>
> **1. Kein Validierungsskript (Phase 3.3)**
> `scripts/validate-ingredient-migration.ts` existiert nicht. Es gibt keine automatisierte Prüfung ob Mengen-Summen der alten JSONB-Daten mit den neuen `recipe_ingredients`-Zeilen übereinstimmen.
>
> **2. `idx_ingredient_products_manufacturer` fehlt**
> Der Index auf `ingredient_products(manufacturer)` wurde in Phase 0 geplant aber nicht angelegt.
>
> **3. `ingredient_import_queue.import_count` fehlt**
> Die Deduplizierungs-Spalte für die Import-Queue (Phase 4.3) wurde nicht angelegt.

**Dies ist der aufwändigste und risikoreichste Teil des Projekts.** Alle bestehenden Rezepte liegen als JSONB vor. Eine fehlerhafte Migration würde Rezeptdaten korrumpieren. Die Migration läuft daher nicht-destruktiv: Die JSONB-Daten bleiben erhalten; `recipe_ingredients`-Zeilen werden *zusätzlich* geschrieben.

### 3.1 — Batch-Migrationsfunktion

**Datei:** `supabase/functions/migrate-recipe-ingredients/index.ts`

```ts
// Verarbeitet Rezepte in Batches von 100
// Liest data->'malts', data->'hops', data->'yeast'
// Versucht Smart Match für jede Zutat (Stufen 1-3, s.o.)
// Schreibt recipe_ingredients-Zeilen
// Protokolliert Fehler ohne Abbruch
// Idempotent: bereits migrierte Rezepte werden übersprungen
```

### 3.2 — Migrations-Tracking

```sql
ALTER TABLE brews ADD COLUMN ingredients_migrated BOOLEAN DEFAULT false;
ALTER TABLE brews ADD COLUMN ingredients_migrated_at TIMESTAMPTZ;
```

So kann die Migration jederzeit unterbrochen und fortgesetzt werden.

### 3.3 — Validierungsskript

Vor dem Go-Live der Migration wird ein Validierungsskript ausgeführt (`scripts/validate-ingredient-migration.ts`), das stichprobenartig prüft:
- Summe der Malzmengen (JSONB) ≈ Summe `recipe_ingredients.amount` (relational)
- Keine NULL-`amount`-Werte in kritischen Feldern
- Match-Rate > 80 % (Rest darf `raw_name` Fallback sein)

### 3.4 — Cutover

Erst wenn 100 % der Rezepte migriert und validiert sind, wird in der Applikation auf `recipe_ingredients` als primäre Datenquelle umgestellt. Die JSONB-Felder werden als Deprecated markiert, aber **nicht gelöscht** — als Backup für mindestens 90 Tage.

---

## Phase 4 — Duplicate Prevention

> **Status: ✅ Vollständig implementiert (15. März 2026)**
>
> Migration `20260319000000_phase4_import_queue.sql` lokal ausgeführt. Admin-Import-Queue UI, Merge/Reject-Flow und alle RPCs fertiggestellt.

### 4.1 — Constraint-basierte Eindeutigkeit

```sql
-- Kein Produkt darf doppelt für denselben Hersteller angelegt werden
CREATE UNIQUE INDEX idx_ingredient_products_unique
  ON ingredient_products (master_id, LOWER(manufacturer), LOWER(name));
```

### 4.2 — Pre-Insert-Check im UI

Bevor ein Admin ein neues `ingredient_product` anlegt, prüft das UI via Trigram-Score auf Ähnlichkeit mit bestehenden Einträgen und warnt bei Score > 0.7:

> "Ein ähnliches Produkt existiert bereits: 'Weyermann Pilsner Malz 2023'. Trotzdem anlegen?"

### 4.3 — Import-Queue-Deduplication

Beim Schreiben in `ingredient_import_queue` wird geprüft, ob für denselben `raw_name` in den letzten 30 Tagen bereits ein `pending`-Eintrag existiert. Falls ja, wird der vorhandene Eintrag inkrementiert (`import_count`), kein Duplikat angelegt.

```sql
ALTER TABLE ingredient_import_queue ADD COLUMN import_count INTEGER DEFAULT 1;
-- Ein höherer import_count signalisiert Admin: Diese Zutat ist häufig und sollte priorisiert werden.
```

---

## Phase 5 — Berechnung & Score-Integration

> **Status: ⚠️ Basis implementiert**
>
> `calculate_brew_quality_score()` liest jetzt aus `recipe_ingredients` (Fix A in `20260318100000`). ABV/IBU/EBC-Formeln funktionieren.
>
> **Noch nicht umgesetzt:**
> - `MALT_POTENTIAL_TABLE` in `lib/brewing-calculations.ts` ist noch aktiv (Phase 1.3: DB-Lookup als Ersatz fehlt)
> - Produkt-spezifische Taste-Score-Erweiterungen (Cohumulone, Melanoidin, Hefeesterigkeit) aus Phase 5.2 fehlen
> - `potential_pts` aus `ingredient_products` wird noch nicht für Extrakt-Berechnungen genutzt

### 5.1 — Formel-Korrekturen

Die im Konzept genannten Formeln brauchen folgende Präzisierungen:

**ABV:**
```
ABV = (OG - FG) × 131.25
```
`<ATTENUATION>` aus BeerXML ist eine Schätzung (keine Messung). Die Berechnung mit Attenuation liefert einen **Schätz-ABV**, der im UI als "≈ X.X % ABV (Schätzwert)" dargestellt wird — nicht als gemessener Wert.

**IBU (Tinseth mit Whirlpool-Korrekturfaktor):**
```
IBU_boil       = normale Tinseth-Formel
IBU_whirlpool  = Tinseth × 0.20 (Standardkorrekturfaktor für 80°C Whirlpool)
IBU_dry_hop    = 0 (kein IBU-Beitrag)
IBU_first_wort = Tinseth × 1.10 (leicht höhere Isomerisierung)
```

**EBC (Morey):**
Bereits korrekt implementiert in [lib/brewing-calculations.ts](lib/brewing-calculations.ts#L90). Nach Phase 1 werden die fallback-Werte aus der DB bezogen statt aus der hartkodierten Regex-Tabelle.

### 5.2 — Taste-Score-Erweiterung

Sobald `recipe_ingredients` mit `product_id`-Referenzen befüllt ist, kann der Taste Score um produktspezifische Parameter erweitert werden (Cohumulone-Bittere-Schärfe, Melanoidin-Beitrag, Hefeesterigkeit). Dies ist Phase 5.2 und gehört zur Score-Engine, nicht zum Datenmodell.

---

## Phase 6 — UI/UX

> **Status: ✅ Implementiert**
>
> Autocomplete, EBC-Farbindikator, IBU-Skala und Import-Wizard fehlen vollständig. Der BrewEditor nutzt noch seine bestehenden `MaltListEditor`/`HopListEditor`-Komponenten ohne `product_id`-Anbindung.

### 6.1 — Smart Search Autocomplete

Die Suche schlägt in dieser Reihenfolge vor:
1. `ingredient_master` (Produkttyp + Typ-Badge: "Hopfen", "Malz")
2. `ingredient_products` (Hersteller-Produkt, eingerückt unter dem Master)

Technisch: Debounced Supabase-Query mit `ilike` auf `name` + `aliases_flat`.

### 6.2 — Visual Cues im Editor

- **EBC-Farbindikator**: Ein 16px-Kreis in der Farbe des berechneten EBC-Wertes direkt neben dem Malznamen (Farbwerte aus der bestehenden EBC-Farbtabelle)
- **IBU-Bitterkeit**: Numerischer Wert + vertikale Skala (0–120 IBU) als Mini-Bar

### 6.3 — Import-Wizard

1. **Drag & Drop**: `.xml`-Datei ablegen → Client-seitige Vorab-Validierung (Dateiformat, max. 2MB)
2. **Vorschau-Table**: Alle erkannten Zutaten mit Match-Status (Grün = exakter Match, Gelb = Vorschlag, Rot = unbekannt)
3. **Unbekannte Zutaten**: User kann manuell zuordnen oder "später klären" markieren. Diese landen in der Queue.
4. **Bestätigung**: "Rezept importieren" übernimmt nur gematched + bestätigte Zutaten

---

## Abhängigkeiten & offene Fragen

| Frage | Antwort / Entscheidungsbedarf |
|-------|-------------------------------|
| Welche Tabelle referenziert `recipe_ingredients.recipe_id`? | Klären: `brews` oder separates `recipes`? Fremdschlüssel danach setzen |
| Wie viele bestehende JSONB-Rezepte gibt es? | Bestimmt den Aufwand von Phase 3 |
| Wer befüllt die Admin-Queue? | Vorauswahl treffen: 1 Admin oder generelles Admin-Team |
| BeerJSON in Phase 4 oder Later? | BeerJSON ist optional, Architektur (Parser-Interface) unterstützt es bereits |
| Seed-Datenquelle? | OpenBreweryDB, Braumagazin-Datenblätter, manuelle Erfassung |

---

## Zeitliche Einordnung & Abhängigkeiten

```
Phase 0 (Schema)          ← Kein Blocker, sofort startbar
  ↓
Phase 1 (Seed)            ← Benötigt Phase 0 Schema
  ↓
Phase 2 (BeerXML Import)  ← Benötigt Phase 1 (Seed für Smart Match)
  ↓
Phase 3 (JSONB Migration) ← Kann parallel zu Phase 2 starten, braucht Phase 0+1
  ↓
Phase 4 (Deduplizierung)  ← Benötigt Phase 1+3
  ↓
Phase 5 (Score-Integration) ← Benötigt Phase 3 (recipe_ingredients gefüllt)
  ↓
Phase 6 (UI)              ← Kann ab Phase 2 parallel beginnen (Import-Wizard)
```

**Phase 3 (JSONB-Migration) ist der kritische Pfad.** Bis sie abgeschlossen ist, arbeiten alle anderen Phasen mit dem Hybrid-Modell (JSONB + optionale `product_id`-Annotation).

---

---

## Priorisierte Nächste Schritte (Post-Audit)

> Ergebnis der kritischen Retrospektive. Reihenfolge ist zwingend — spätere Punkte hängen von früheren ab.

### ✅ Prio 1 — Kritische Silent Bugs — ERLEDIGT (14. März 2026)

**Bug A: `calculate_brew_quality_score()` liest immer aus leerer JSONB — ✅ Behoben**
- Fix in `supabase/migrations/20260318100000_fix_ingredients_engine_bugs.sql`
- Funktion liest jetzt `FROM recipe_ingredients ri WHERE ri.recipe_id = brew_id AND ri.type = 'malt'`
- Alle bestehenden Quality Scores wurden rückwirkend neu berechnet

**Bug B: `get_user_brew_context` RPC liest gelöschte JSONB-Keys — ✅ Behoben**
- Fix in `supabase/migrations/20260318100000_fix_ingredients_engine_bugs.sql`
- Alle 9 Stage-5-Varianten haben identische Signatur → `CREATE OR REPLACE` in 20260318100000 (letztes Migration) gewinnt
- Liest jetzt aus `recipe_ingredients` für malts/hops/yeast

**Bug C: `ingredients_migrated` Tracking-Column fehlte — ✅ Behoben**
- `ALTER TABLE public.brews ADD COLUMN IF NOT EXISTS ingredients_migrated BOOLEAN DEFAULT false`
- Bestehende Brews mit `recipe_ingredients`-Zeilen wurden automatisch auf `true` gesetzt

### 🟡 Prio 2 — Verbleibende offene Schritte (Stand: 15. März 2026)

> Alle Punkte außer Phase 5.2 sind erledigt.

1. ~~**BeerXML Export-Endpunkt**~~ ✅ Client-seitig gelöst via `lib/recipe-export.ts` + `lib/brew-pdf.ts`

2. ~~**Fehlender DB-Index**~~ ✅ `20260319130000_idx_ingredient_products_manufacturer.sql`

3. ~~**Validierungsskript**~~ ✅ `scripts/validate-ingredient-migration.js` — bestätigt 100% Migration in Production

4. **Taste-Score-Erweiterungen** (Phase 5.2, bewusst Later): Cohumulone, Melanoidin, Hefeesterigkeit als produktspezifische Score-Parameter — hängt von besserer `product_id`-Abdeckung ab.

### ✅ Prio 3 — Phase 1 Seed — ERLEDIGT

- Vollständige ~512 Standardzutaten via `supabase/migrations/20260318200000_ingredient_seed.sql` (3593 Zeilen)
- Deutsche Aliases nachträglich generiert und eingepflegt (`generate_german_aliases.js` + `run_update.js`)
- Rechtssicherheit dokumentiert: `documentation/legal/INGREDIENTS_DATA_COMPLIANCE.md`

### ✅ Prio 4 — Phase 2 Parser + Import-Wizard — ERLEDIGT

- `lib/ingredient-parser/` vollständig: `types.ts`, `beerxml.ts`, `beerjson.ts`, `index.ts`
- `match_ingredient` RPC (3-Stufen: Exakt → Alias-Substring → Fuzzy) via `20260318300000`
- Server Action `lib/actions/recipe-import.ts` mit Auth, 2MB-Limit, Import-Queue
- Import-Wizard UI vollständig: `app/team/[breweryId]/brews/import/page.tsx` + `ImportMatchPreview.tsx` (Drag & Drop, Match-Preview, BrewEditor-Integration)
- **Noch offen**: BeerXML Export-Endpunkt


---
---

# ANHANG: Impact-Analyse — Was bricht, wenn `data.malts/hops/yeast` verschwindet?

**Stand:** 9. März 2026 — Deep-Dive-Analyse des gesamten Codebase

Das System hat sich um die JSONB-Struktur `brews.data -> '{malts,hops,yeast}'` herum organisch gewachsen. Die Abhängigkeiten durchziehen **27 TypeScript-Dateien** und **10+ SQL-Migrationsdateien** (DB-Funktionen, Trigger, RPCs). Keine Ecke des Systems ist davon unberührt.

---

## 1. BESTANDSAUFNAHME: Wo leben Zutaten heute?

### Die Datenkette (Write Path)

```
MaltListEditor.onChange(Malt[])  ─┐
HopListEditor.onChange(Hop[])    ─┤── updateData(key, val) ──► brew.data.{malts,hops,yeast}
YeastListEditor.onChange(Yeast[])─┘                               │
                                                                  ▼
                                                    BrewEditor: Save-Button
                                                                  │
                                                    payload.data = sanitizedData (ganzer JSON-Blob)
                                                                  │
                                                    createBrew / updateBrew (Server Action)
                                                                  │
                                                    Zod validiert data als Record<string, any>
                                                                  │
                                                    supabase.from('brews').insert/update
                                                                  │
                                                    Geschrieben in `data` JSONB-Spalte
                                                                  │
                                                    Trigger `trg_quality_score_on_brew_update` feuert
                                                                  │
                                                    calculate_brew_quality_score() liest data->'malts/hops/yeast'
```

### Die Datenform (IST-Zustand)

**Malt:** `{ name: string, amount: string, unit: string, color_ebc?: string }`
**Hop:** `{ name: string, amount: string, unit: string, alpha?: string, time?: string, usage?: string, form?: string }`
**Yeast:** `{ name: string, amount: string, unit: string, attenuation?: string, type?: string }`
**Legacy-Yeast:** Einfacher `string` (Altdaten, wird vom YeastListEditor konvertiert)

**Kritisch:** Alle numerischen Werte (`amount`, `alpha`, `time`, `attenuation`, `color_ebc`) sind `string`, nicht `number`. Der Parser (`safeFloat`) in `brewing-calculations.ts` konvertiert zur Laufzeit.

### Sessions: Kein eigenes Datenmodell!

Sessions (Brautage) haben **keine Kopie** der Zutaten. Sie lesen **live** über FK-JOIN:
```ts
// SessionContext.tsx
brew:brews ( name, style, recipe_data:data )
```
`recipe_data` ist ein PostgREST-Alias für `brews.data`. **Jede Änderung an der Zutatenspeicherung betrifft automatisch alle Sessions.**

Sessions nutzen zusätzlich einen Dual-Path-Fallback:
```ts
const malts = data.ingredients?.malts || data.malts || [];
```
Dies deutet darauf hin, dass es irgendwann ein verschachteltes `ingredients`-Objekt in `data` gab. Beide Pfade müssen berücksichtigt werden.

---

## 2. IMPACT-KARTE: Alle betroffenen Dateien

### Risiko-Stufe: KRITISCH (System bricht sofort)

| Datei | Zeilen | Was passiert | Lösung |
|-------|--------|-------------|--------|
| [BrewEditor.tsx](app/team/%5BbreweryId%5D/brews/components/BrewEditor.tsx) | ~30 Stellen | Liest/schreibt `brew.data.malts/hops/yeast` für Berechnung (OG, IBU, EBC, FG), Batch-Scaling, Fermentationstyp-Ableitung, AI-Prompts, Flavor-Profile | **Editor muss auf `recipe_ingredients`-Relation umgestellt werden.** `updateData('malts', val)` → Server Action die in `recipe_ingredients` schreibt |
| [MaltListEditor.tsx](app/team/%5BbreweryId%5D/brews/components/MaltListEditor.tsx) | ganzes File | Schreibt `Malt[]`-Array zurück an BrewEditor | Interface-Erweiterung um `product_id`, `master_id`. Die Komponente bekommt Autocomplete → wählt aus `ingredient_products` |
| [HopListEditor.tsx](app/team/%5BbreweryId%5D/brews/components/HopListEditor.tsx) | ganzes File | Schreibt `Hop[]`-Array | Gleiche Behandlung wie MaltListEditor |
| [YeastListEditor.tsx](app/team/%5BbreweryId%5D/brews/components/YeastListEditor.tsx) | ganzes File | Schreibt `Yeast[]`-Array, konvertiert Legacy-Strings | Gleiche Behandlung + Legacy-Konversion bleibt für Migration |
| [brewing-calculations.ts](lib/brewing-calculations.ts) | L16-562 | `MaltItem`/`HopItem`-Interfaces, `MALT_POTENTIAL_TABLE (40+ Regex)`, alle Berechnungsfunktionen (`calculateOG`, `calculateIBU`, `calculateColorEBC`, `calculateTotalGrain`, `calculateBatchSize`) | **Interfaces anpassen.** Funktionen nehmen weiterhin synchrone Arrays entgegen, aber mit erweiterten Feldern (`product_id`, `resolved_potential`, `resolved_ebc`). Die DB liefert pre-resolved Daten. |
| [brew-actions.ts](lib/actions/brew-actions.ts) | Save-Logik | Schreibt ```payload.data``` mit Zutaten als JSONB in `brews.data` | **Muss aufgespalten werden:** Metadaten (notes, OG, FG, batch_size, etc.) bleiben in `brews.data`, Zutaten gehen in `recipe_ingredients`-Rows |
| [brew-schemas.ts](lib/validations/brew-schemas.ts) | Zod-Schema | `data: z.record(z.string(), z.any())` — Keine Validierung der Zutaten | Zutaten werden separat validiert (eigenes Zod-Schema für `RecipeIngredientInput[]`) |

### Risiko-Stufe: HOCH (UI bricht, Daten fehlen)

| Datei | Zeilen | Was passiert | Lösung |
|-------|--------|-------------|--------|
| [BrewRecipeTab.tsx](app/brew/%5Bid%5D/components/BrewRecipeTab.tsx) | L44-655 | Definiert `MaltView`, `HopView`, rendert `brew.data.malts/hops/yeast` | Liest statt aus `brew.data.malts` aus `brew.recipe_ingredients` (JOIN-Daten) |
| [app/b/[id]/page.tsx](app/b/%5Bid%5D/page.tsx) | L687-1021 | Öffentliche Brew-Seite: Zeigt Zutaten an, berechnet Farbanteil pro Malz | Gleicher JOIN-Switch |
| [app/brew/[id]/page.tsx](app/brew/%5Bid%5D/page.tsx) | L552-564 | Batch-Scaling: berechnet Gesamtschüttung aus `brew.data.malts` | Liest aus `recipe_ingredients`, gemappt auf `MaltItem`-kompatibles Array |
| [app/brew/[id]/layout.tsx](app/brew/%5Bid%5D/layout.tsx) | L85-98 | SEO: Extrahiert Zutatennnamen für `<meta keywords>` | Liest aus JOIN |
| [FormulaInspector.tsx](app/components/FormulaInspector.tsx) | L34, L145, L239, L384, L480 | Detaillierte Berechnungsansicht: bekommt `malts`/`hops` als Props | Props kommen aus BrewEditor → gleicher Fix |
| [PlanningTab.tsx](app/team/%5BbreweryId%5D/sessions/%5BsessionId%5D/_components/tabs/PlanningTab.tsx) | L94-243 | Session-Planung: Dual-Path `data.ingredients?.malts \|\| data.malts` | **Muss auf neue Datenquelle.** Session-Context-Query erweitern: `recipe_ingredients(*, ingredient_products(*))` |
| [PhaseViews.tsx](app/team/%5BbreweryId%5D/sessions/%5BsessionId%5D/_components/PhaseViews.tsx) | L418-658 | Brautag-Ansicht: gleicher Dual-Path | Gleicher Fix wie PlanningTab |
| [BrewDayTab.tsx](app/team/%5BbreweryId%5D/sessions/%5BsessionId%5D/_components/tabs/BrewDayTab.tsx) | L384 | `data.hops ?? data.ingredients?.hops` | Gleicher Fix |
| [CompletedTab.tsx](app/team/%5BbreweryId%5D/sessions/%5BsessionId%5D/_components/tabs/CompletedTab.tsx) | L287-289 | Zeigt `session?.brew?.recipe_data?.malts/hops/yeast` | Gleicher Fix |
| [FermentationTab.tsx](app/team/%5BbreweryId%5D/sessions/%5BsessionId%5D/_components/tabs/FermentationTab.tsx) | L146 | Zeigt Hefe-Info | Gleicher Fix |

### Risiko-Stufe: MITTEL (Feature degradiert, kein Crash)

| Datei | Zeilen | Was passiert | Lösung |
|-------|--------|-------------|--------|
| [DiscoverClient.tsx](app/discover/DiscoverClient.tsx) | L609-676 | Discover-Suche: Extrahiert Zutatennamen für Filter-Optionen, zählt Zutaten für Qualitätssortierung | Liest aus pre-aggregierten Feldern oder JOIN |
| [DiscoverBrewCard.tsx](app/components/DiscoverBrewCard.tsx) | L88-89 | Badge: "3 Malze, 2 Hopfen" | Zählt `recipe_ingredients` statt JSONB-Array-Length |
| [BrewCard.tsx](app/components/BrewCard.tsx) | L61-62 | Badge: gleicher Zähler | Gleicher Fix |
| [recommendation-engine.ts](lib/utils/recommendation-engine.ts) | L138-358 | Rezept-Ähnlichkeit: Hopfen-Overlap (Jaccard), Malz-Overlap, Hopfen-Affinität | **Muss auf Name-basierte Queries umgestellt werden** (aus `recipe_ingredients` statt JSONB) |
| [flavor-profile-actions.ts](lib/actions/flavor-profile-actions.ts) | L50-174 | `RecipeDataForAnalysis` Typ mit `malts?: string, hops?: string, yeast?: string` | Typ und Datenquelle anpassen |
| [pdf-session-export.ts](lib/pdf-session-export.ts) | L17-161 | PDF-Export: iteriert über malts/hops, liest yeast | Mapper-Funktion: `recipeIngredients → { malts, hops, yeast }` |
| [generate-text/route.ts](app/api/generate-text/route.ts) | L83-202 | AI-Text-Generierung: `data.malts`, `data.hops`, `data.yeast` in Prompts | Prompts bauen auf stringified ingredients → Mapper-Funktion |
| [botlguide/route.ts](app/api/botlguide/route.ts) | L101-1027 | BotlGuide AI: ~12 Stellen die Zutaten lesen für Prompts | Gleicher Mapper |
| [IngredientList.tsx](app/b/%5Bid%5D/components/IngredientList.tsx) | ganzes File | Render-Komponente für `IngredientItem[]` | Interface-Erweiterung, aber kompatibel |

### Risiko-Stufe: NIEDRIG (Test/Embed, kann warten)

| Datei | Zeilen | Was passiert | Lösung |
|-------|--------|-------------|--------|
| [botlguide-embed/index.ts](supabase/functions/botlguide-embed/index.ts) | L257-263 | Edge Function: baut Text-String für Vektor-Embedding | Liest aus `recipe_ingredients` statt JSONB |
| [test_calc_fixes.js](test_calc_fixes.js) | L3-106 | Tests für `getMaltPotential`, `getMaltDefaultEBC` | Tests anpassen nach Refactoring |

---

## 3. SQL-FUNKTIONEN & TRIGGER (DB-Layer)

Diese sind besonders kritisch, weil sie **serverseitig ohne TypeScript-Compiler-Schutz** laufen. Ein vergessener JSONB-Pfad führt zu stillen Fehlern (NULL statt Array → Zählung = 0).

### `calculate_brew_quality_score(brew_id_param UUID)`

**Aktueller Zugriff:**
```sql
SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(d->'hops','[]')) h
  WHERE (h->>'amount') IS NOT NULL AND (h->>'time') IS NOT NULL;
SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(d->'yeast','[]')) y
  WHERE (y->>'name') IS NOT NULL;
SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(d->'malts','[]')) m
  WHERE (m->>'amount') IS NOT NULL;
```

**Migrationslösung:**
```sql
-- Einfache COUNT-Queries auf recipe_ingredients:
SELECT COUNT(*) INTO documented_hops
  FROM recipe_ingredients
  WHERE recipe_id = brew_id_param AND type = 'hop'
    AND amount IS NOT NULL AND time_minutes IS NOT NULL;

SELECT COUNT(*) INTO yeast_count
  FROM recipe_ingredients
  WHERE recipe_id = brew_id_param AND type = 'yeast'
    AND raw_name IS NOT NULL;

SELECT COUNT(*) INTO documented_malts
  FROM recipe_ingredients
  WHERE recipe_id = brew_id_param AND type = 'malt'
    AND amount IS NOT NULL;
```

### `trg_fn_refresh_quality_score_on_brew()` — AUTO-TRIGGER

**Problem:** Dieser Trigger feuert aktuell auf `OLD.data IS DISTINCT FROM NEW.data`. Nach der Migration stehen Zutaten nicht mehr in `data`, also feuert er **nie mehr bei Zutatänderungen**.

**Migrationslösung:** Zusätzlicher Trigger auf `recipe_ingredients`:
```sql
CREATE TRIGGER trg_quality_score_on_ingredient_change
AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION trg_fn_refresh_quality_score_on_recipe_ingredient();

-- Neue Trigger-Funktion:
CREATE FUNCTION trg_fn_refresh_quality_score_on_recipe_ingredient()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_brew_quality_score(
    COALESCE(NEW.recipe_id, OLD.recipe_id)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 7 RPC-Funktionen (Stage 5 BotlGuide-Context)

Alle folgenden Funktionen bauen ein `recipe_data`-JSON-Objekt mit `'malts', b.data -> 'malts'`-Pattern:
- `get_user_brew_context` (4 verschiedene Versionen in Migrations: enrichment, equipment, recipe_success, inspiration, location, feedback, brand_voice)

**Migrationslösung für alle:** Statt `b.data -> 'malts'` ein Subquery:
```sql
'malts', (
  SELECT jsonb_agg(jsonb_build_object(
    'name', ri.raw_name,
    'amount', ri.amount,
    'unit', ri.unit,
    'color_ebc', COALESCE(ri.override_color_ebc, ip.color_ebc)
  ))
  FROM recipe_ingredients ri
  LEFT JOIN ingredient_products ip ON ri.product_id = ip.id
  WHERE ri.recipe_id = b.id AND ri.type = 'malt'
),
```

---

## 4. DIE MIGRATIONS-STRATEGIE (harte Linie)

### Prinzip: Ein einziger atomarer SQL-Cut + ein Frontend-Release

Kein Hybrid-Modell. Kein "data bleibt als Backup". Stattdessen:

**Schritt A — SQL-Migration (eine Transaktion):**
1. `recipe_ingredients`-Tabelle erstellen (mit RLS)
2. Bestehende JSONB-Daten in `recipe_ingredients`-Rows extrahieren
3. Smart-Match gegen `ingredient_master` direkt in SQL
4. Zutaten-Keys aus `brews.data` entfernen (`data = data - 'malts' - 'hops' - 'yeast'`)
5. Quality-Score-Funktion auf `recipe_ingredients` umschreiben
6. Neuen Trigger auf `recipe_ingredients` anlegen
7. Alle RPCs auf Subquery umschreiben

**Schritt B — Frontend-Release (gleichzeitig mit Migration):**
1. BrewEditor: `updateData('malts', val)` → Server Action `upsertRecipeIngredients(brewId, ingredients)`
2. Alle Lesekomponenten: `brew.data.malts` → `brew.recipe_ingredients.filter(i => i.type === 'malt')`
3. Sessions: `recipe_data:data` JOIN erweitern um `recipe_ingredients(*)`

### Adapter-Pattern für den Übergang im Code

Damit nicht jede einzelne Komponente gleichzeitig refaktoriert werden muss, braucht es eine einzige Mapper-Funktion:

```ts
// lib/ingredient-adapter.ts
import { MaltItem, HopItem } from './brewing-calculations';

interface RecipeIngredientRow {
  id: string;
  type: 'malt' | 'hop' | 'yeast' | 'misc';
  raw_name: string | null;
  amount: number | null;
  unit: string | null;
  time_minutes: number | null;
  usage: string | null;
  override_alpha: number | null;
  override_color_ebc: number | null;
  override_attenuation: number | null;
  // Resolved from product/master JOINs:
  resolved_alpha_pct: number | null;
  resolved_color_ebc: number | null;
  resolved_potential_pts: number | null;
  resolved_attenuation_pct: number | null;
  product_name: string | null;
  manufacturer: string | null;
}

/** Konvertiert recipe_ingredients-Rows → Legacy MaltItem[] für brewing-calculations.ts */
export function toMaltItems(rows: RecipeIngredientRow[]): MaltItem[] {
  return rows
    .filter(r => r.type === 'malt')
    .map(r => ({
      name: r.raw_name || r.product_name || '',
      amount: String(r.amount ?? 0),
      unit: r.unit || 'kg',
      color_ebc: String(r.override_color_ebc ?? r.resolved_color_ebc ?? 0),
    }));
}

/** Konvertiert recipe_ingredients-Rows → Legacy HopItem[] für brewing-calculations.ts */
export function toHopItems(rows: RecipeIngredientRow[]): HopItem[] {
  return rows
    .filter(r => r.type === 'hop')
    .map(r => ({
      name: r.raw_name || r.product_name || '',
      amount: String(r.amount ?? 0),
      unit: r.unit || 'g',
      alpha: String(r.override_alpha ?? r.resolved_alpha_pct ?? 0),
      time: String(r.time_minutes ?? 0),
      usage: r.usage || 'Boil',
      form: 'Pellet',
    }));
}

/** Für AI-Prompts: Stringified Zutaten wie vorher */
export function ingredientsToPromptString(rows: RecipeIngredientRow[]): {
  malts: string; hops: string; yeast: string;
} {
  const malts = rows.filter(r => r.type === 'malt')
    .map(r => `${r.raw_name || r.product_name} (${r.amount}${r.unit})`)
    .join(', ');
  const hops = rows.filter(r => r.type === 'hop')
    .map(r => `${r.raw_name || r.product_name} (${r.amount}${r.unit}, ${r.time_minutes}min, ${r.usage})`)
    .join(', ');
  const yeast = rows.filter(r => r.type === 'yeast')
    .map(r => r.raw_name || r.product_name || '')
    .join(', ');
  return { malts, hops, yeast };
}
```

**Dieser Adapter ist der Schlüssel.** Er erlaubt dir, die 27 Frontend-Dateien schrittweise umzustellen, ohne dass `brewing-calculations.ts` gleichzeitig komplett umgebaut werden muss. Die Berechnungsfunktionen bekommen weiterhin `MaltItem[]` und `HopItem[]` — nur die Quelle ändert sich.

---

## 5. SUPABASE-QUERY-PATTERN (Vorher → Nachher)

### BrewEditor / Brew Detail — aktuell:
```ts
const { data: brew } = await supabase
  .from('brews').select('*').eq('id', id).single();
// brew.data.malts → MaltItem[]
```

### BrewEditor / Brew Detail — NEU:
```ts
const { data: brew } = await supabase
  .from('brews')
  .select(`
    *,
    recipe_ingredients (
      id, type, raw_name, amount, unit, time_minutes, usage, sort_order,
      override_alpha, override_color_ebc, override_attenuation,
      product:ingredient_products (
        name, manufacturer, color_ebc, potential_pts, alpha_pct, attenuation_pct
      )
    )
  `)
  .eq('id', id)
  .single();

// Adapter:
const malts = toMaltItems(brew.recipe_ingredients);
const hops  = toHopItems(brew.recipe_ingredients);
```

### Sessions — aktuell:
```ts
brew:brews ( name, style, recipe_data:data )
```

### Sessions — NEU:
```ts
brew:brews (
  name, style, recipe_data:data,
  recipe_ingredients (
    id, type, raw_name, amount, unit, time_minutes, usage,
    override_alpha, override_color_ebc, override_attenuation,
    product:ingredient_products ( name, manufacturer, color_ebc, alpha_pct, attenuation_pct )
  )
)
```

---

## 6. CHECKLISTE: Alle Dateien die geändert werden müssen

### Kern-Infrastruktur (zuerst)

- [ ] `supabase/migrations/YYYYMMDD_ingredients_engine_v2.sql` — Schema + Datenmigration + Trigger + RPC-Updates
- [ ] `lib/brewing-calculations.ts` — `MaltItem`/`HopItem` Interfaces erweitern (optionale `product_id`, `resolved_*` Felder)
- [ ] `lib/ingredient-adapter.ts` — NEU: Mapper `RecipeIngredientRow[] → MaltItem[] / HopItem[]`
- [ ] `lib/actions/brew-actions.ts` — Save-Logik aufsplitten (Metadaten → `brews.data`, Zutaten → `recipe_ingredients`)
- [ ] `lib/validations/brew-schemas.ts` — Neues Zod-Schema für Zutaten-Input

### Editor-Komponenten (dann)

- [ ] `app/team/[breweryId]/brews/components/BrewEditor.tsx` (~30 Stellen)
- [ ] `app/team/[breweryId]/brews/components/MaltListEditor.tsx`
- [ ] `app/team/[breweryId]/brews/components/HopListEditor.tsx`
- [ ] `app/team/[breweryId]/brews/components/YeastListEditor.tsx`
- [ ] `app/team/[breweryId]/brews/components/IngredientListEditor.tsx`

### Anzeige-Komponenten (parallel)

- [ ] `app/brew/[id]/components/BrewRecipeTab.tsx`
- [ ] `app/brew/[id]/page.tsx` (Batch-Scaling)
- [ ] `app/brew/[id]/layout.tsx` (SEO Keywords)
- [ ] `app/b/[id]/page.tsx` (Public Brew)
- [ ] `app/b/[id]/components/IngredientList.tsx`
- [ ] `app/components/FormulaInspector.tsx`

### Session-Komponenten

- [ ] `app/team/[breweryId]/sessions/[sessionId]/SessionContext.tsx` (Query)
- [ ] `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/PlanningTab.tsx`
- [ ] `app/team/[breweryId]/sessions/[sessionId]/_components/PhaseViews.tsx`
- [ ] `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/BrewDayTab.tsx`
- [ ] `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/CompletedTab.tsx`
- [ ] `app/team/[breweryId]/sessions/[sessionId]/_components/tabs/FermentationTab.tsx`
- [ ] `app/team/[breweryId]/sessions/[sessionId]/SessionClient.tsx`

### Discover / Cards

- [ ] `app/discover/DiscoverClient.tsx`
- [ ] `app/components/DiscoverBrewCard.tsx`
- [ ] `app/components/BrewCard.tsx`

### AI / API / Backend

- [ ] `app/api/generate-text/route.ts`
- [ ] `app/api/botlguide/route.ts` (~12 Stellen)
- [ ] `lib/actions/flavor-profile-actions.ts`
- [ ] `lib/utils/recommendation-engine.ts`

### Export / Embed

- [ ] `lib/pdf-session-export.ts`
- [ ] `supabase/functions/botlguide-embed/index.ts`

### Tests

- [ ] `test_calc_fixes.js`

### SQL-Funktionen (in der Migration)

- [ ] `calculate_brew_quality_score()` — Umschreiben auf `recipe_ingredients`
- [ ] `trg_fn_refresh_quality_score_on_brew()` — Neuer Trigger auf `recipe_ingredients`
- [ ] `get_user_brew_context()` — 7 Versionen (enrichment, equipment, recipe_success, inspiration, location, feedback, brand_voice) — alle RPCs Subquery
- [ ] `fermentation_type_backfill` — Einmalig, aber Logik in künftigen Backfills auf `recipe_ingredients` basieren

---

## 7. EMPFOHLENE REIHENFOLGE DER IMPLEMENTATION

```
Tag 0:  Schema-Migration + Seed (Phase 0 + 1)
        → Tabellen anlegen, Seed einspielen
        → JSONB-Daten in recipe_ingredients extrahieren (atomare SQL-Transaktion)
        → data = data - 'malts' - 'hops' - 'yeast'
        → Quality-Score-Funktion + Trigger umschreiben
        → Alle 7 RPCs auf Subquery umschreiben

Tag 1:  ingredient-adapter.ts + brew-actions.ts
        → Adapter-Functions schreiben
        → Save-Logik aufsplitten

Tag 2:  BrewEditor + List-Editors
        → Editor liest/schreibt recipe_ingredients
        → Berechnungen funktionieren via Adapter

Tag 3:  Session-Komponenten
        → SessionContext Query erweitern
        → PlanningTab, PhaseViews, BrewDayTab, CompletedTab, FermentationTab

Tag 4:  Anzeige-Komponenten
        → BrewRecipeTab, Public Brew Page, Brew Detail, SEO, FormulaInspector

Tag 5:  Discover + Cards + Recommendation Engine
        → Zähler und Filter auf recipe_ingredients

Tag 6:  API Routes + AI Prompts
        → generate-text, botlguide, flavor-profile-actions
        → ingredientsToPromptString() nutzen

Tag 7:  Edge Functions + PDF + Tests
        → botlguide-embed, pdf-session-export, test_calc_fixes
```

**Grundregel:** Die SQL-Migration (Tag 0) muss 100% korrekt sein, bevor eine einzige Frontend-Datei geändert wird. Erst wenn `recipe_ingredients` gefüllt und die JSONB-Keys entfernt sind, wird der Frontend-Code umgestellt. Das ist kein schrittweiser Umbau — es ist ein koordinierter, geplanter Cut.
