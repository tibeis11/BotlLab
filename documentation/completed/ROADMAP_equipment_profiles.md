# ROADMAP — Equipment Profiles (Brauanlage-Profile)

**Ziel:** Brauer können ihre Anlage einmalig konfigurieren und die Verlustparameter werden automatisch
in Rezept-Editor, Wasserberechnung und Session-Planung übernommen — statt sie manuell pro Rezept einzutragen.

Stand: 21.02.2026 | Status: ✅ Phase 1–5 abgeschlossen | TS: Exit 0

---

## 1. Hintergrund & Problembeschreibung

### Aktueller Zustand (IST)

Die fünf Anlage-Parameter werden heute **pro Rezept** im `brew.data`-JSON-Blob gespeichert:

| Parameter        | Feld in `brew.data` | Default in Code | Ort der Eingabe                         |
| ---------------- | ------------------- | --------------- | --------------------------------------- |
| Verdampfungsrate | `boil_off_rate`     | 3.5 L/h         | BrewEditor → „Wasser berechnen"-Popover |
| Trubverlust      | `trub_loss`         | 0.5 L           | BrewEditor → „Wasser berechnen"-Popover |
| Kornabsorption   | `grain_absorption`  | 0.96 L/kg       | BrewEditor → „Wasser berechnen"-Popover |
| Kühlschwand      | `cooling_shrinkage` | 0.04 (4 %)      | BrewEditor → „Wasser berechnen"-Popover |
| Maischedicke     | `mash_thickness`    | 3.5 L/kg        | BrewEditor → „Wasser berechnen"-Popover |

**Konsequenz:** Jeder Brauer trägt seine Anlage bei jedem neuen Rezept erneut ein.
Im öffentlichen Brew-Detail (`/brew/[id]`) und im Session-Scaler werden die Defaults
verwendet — die Anlage des Brewers wird nie berücksichtigt.

### Ziel-Zustand (SOLL)

```
Brauer definiert "Grainfather 35L" einmalig unter Squad-Einstellungen → Brauanlage
  ↓
Neues Rezept im BrewEditor → Dropdown "Anlage laden" befüllt alle 5 Felder automatisch
  ↓
Neue Session → Dropdown "Anlageconfig" zieht gleiches Profil, Wassermengen stimmen
  ↓
Skalierung auf /brew/[id] → eingeloggte User sehen Wassermengen für ihre eigene Anlage
```

---

## 2. Analyse: Betroffene Codestellen

### 2.1 lib/brewing-calculations.ts

```
calculateWaterProfile(batchSize, grain, boilTimeH, config?)
calculateBatchSizeFromWater(mash, sparge, malts, boilTime, config?)
calculateBatchSizeDetails(mash, sparge, malts, boilTime, config?)
```

✅ Alle drei akzeptieren bereits ein optionales `config`-Objekt mit allen 5 Parametern.
**Änderung nötig:** Keine — die Calc-Lib ist bereit.

### 2.2 app/team/[breweryId]/brews/components/BrewEditor.tsx

- **Zeile 423–430:** Liest Parameter aus `brew.data` (Fallback: Hardcode-Defaults)
- **Zeile 1418–1422:** Zweite Stelle, selbe Pattern
- **Zeile 1774–1779:** UI-Inputs im „Wasser berechnen"-Popover (5 NumberInputs)

**Änderung nötig:**

1. Equipment-Profile der Brewery laden (`useEffect` beim Mount)
2. Dropdown „Anlage laden" über den 5 Inputs
3. Klick füllt alle Felder per `updateData()`

### 2.3 app/team/[breweryId]/sessions/new/page.tsx

- **Zeile 27–30:** `scaleVolume`, `scaleEfficiency` State vorhanden
- **Zeile 283–332:** Scaling-Block mit Zielvolumen + Effizienz

**Änderung nötig:**

1. Equipment-Profile laden
2. Dropdown „Anlage" hinzufügen (gibt `equipmentConfig` als State)
3. `equipmentConfig` beim Session-Create in `measurements` mitschreiben

### 2.4 app/brew/[id]/page.tsx (öffentliche Skalierung)

- **Zeile 732–741:** `originalMashThickness` aus Rezept-Daten, sonst Hardcode 3.5
- **Zeile 741:** `calculateWaterProfile(scaleVolume, ..., { mashThickness })`

**Änderung nötig:**

1. Eingeloggte User: Default-Equipmentprofil laden und in `calculateWaterProfile` übergeben
2. Kein Profil → Fallback auf Rezept-Werte → Fallback auf Defaults (wie heute)

### 2.5 app/team/[breweryId]/settings/page.tsx

- Aktuell: 3 Tabs — Allgemein, Benachrichtigungen, Mitgliedschaft

**Änderung nötig:**

1. Neuer Tab **„Brauanlage"** (nur für `owner` / `admin`)
2. CRUD-Liste der Equipment-Profile
3. Jedes Profil: Name, Typ, alle 5 Parameter + „Als Standard"-Toggle

### 2.6 app/team/[breweryId]/sessions/[sessionId]/\_components/tabs/PlanningTab.tsx & PhaseViews.tsx

- Verwendet `calculateWaterProfile` ohne Equipment-Config-Übergabe
- **Zeile 445 (PhaseViews):** Comment: "Physics: PreBoil = Mash + Sparge - GrainAbsorption"

**Änderung nötig:**

- Gespeicherte `equipmentConfig` aus `session.measurements` lesen — falls vorhanden übergeben

### 2.7 app/components/FormulaInspector.tsx (BatchSizeInspector)

- Zeile 106: `calculateBatchSizeDetails` ohne equipment config
- Berechnung zeigt dann falsche Verluste wenn Anlage abweicht

**Änderung nötig:** `config` aus den Rezept-Daten durchreichen (optional, nice-to-have)

---

## 3. Datenbankschema

### Migration: `equipment_profiles`

```sql
-- Migration: 20260222120000_equipment_profiles.sql
CREATE TABLE equipment_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id      UUID NOT NULL REFERENCES breweries(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                            -- z.B. "Grainfather 35L"
  brew_method     TEXT DEFAULT 'all_grain',                 -- all_grain | extract | biab
  batch_volume_l  NUMERIC(6,2) DEFAULT 20,                  -- typisches Zielvolumen
  boil_off_rate   NUMERIC(5,3) DEFAULT 3.5,                 -- L/h
  trub_loss       NUMERIC(5,3) DEFAULT 0.5,                 -- L
  grain_absorption NUMERIC(5,3) DEFAULT 0.96,               -- L/kg
  cooling_shrinkage NUMERIC(5,4) DEFAULT 0.04,              -- 0.04 = 4%
  mash_thickness  NUMERIC(5,3) DEFAULT 3.5,                 -- L/kg
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Nur ein Default pro Brewery
CREATE UNIQUE INDEX equipment_profiles_one_default
  ON equipment_profiles(brewery_id)
  WHERE is_default = true;

-- RLS
ALTER TABLE equipment_profiles ENABLE ROW LEVEL SECURITY;

-- Lesen: alle Mitglieder der Brewery
CREATE POLICY "members can read equipment profiles"
  ON equipment_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members m
      WHERE m.brewery_id = equipment_profiles.brewery_id
        AND m.user_id = auth.uid()
    )
  );

-- Schreiben: nur Owner/Admin
CREATE POLICY "admin can manage equipment profiles"
  ON equipment_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brewery_members m
      WHERE m.brewery_id = equipment_profiles.brewery_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );
```

---

## 4. Neue TypeScript-Typen

**`lib/types/equipment.ts`** (neu)

```typescript
export interface EquipmentProfile {
  id: string;
  brewery_id: string;
  name: string;
  brew_method: "all_grain" | "extract" | "biab";
  batch_volume_l: number;
  boil_off_rate: number; // L/h
  trub_loss: number; // L
  grain_absorption: number; // L/kg
  cooling_shrinkage: number; // 0.04 = 4%
  mash_thickness: number; // L/kg
  is_default: boolean;
  created_at: string;
}

// Wird an calculateWaterProfile / calculateBatchSizeFromWater übergeben
export function profileToConfig(profile: EquipmentProfile) {
  return {
    boilOffRate: profile.boil_off_rate,
    trubLoss: profile.trub_loss,
    grainAbsorption: profile.grain_absorption,
    coolingShrinkage: profile.cooling_shrinkage,
    mashThickness: profile.mash_thickness,
  };
}
```

---

## 5. Implementierungsplan

### Phase 1 — DB-Migration + Typen (Schätzung: 30 min)

| #   | Aufgabe                                                 | Datei                                                       | Status               |
| --- | ------------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| 1   | Migration `equipment_profiles` schreiben                | `supabase/migrations/20260222120000_equipment_profiles.sql` | ✅                   |
| 2   | TypeScript-Typ `EquipmentProfile` + `profileToConfig()` | `lib/types/equipment.ts`                                    | ✅                   |
| 3   | Migration lokal anwenden + remote pushen                | CLI                                                         | ✅ lokal / ⬜ remote |

### Phase 2 — Settings-Tab „Brauanlage" (Schätzung: 2–3 h)

| #   | Aufgabe                                                       | Datei               | Status |
| --- | ------------------------------------------------------------- | ------------------- | ------ |
| 4   | Neuen Tab `equipment` in `menuItems` + `activeTab` Union      | `settings/page.tsx` | ✅     |
| 5   | Komponente `EquipmentSettings` schreiben (Liste + CRUD-Modal) | `settings/page.tsx` | ✅     |
| 6   | Profil-Karte: Name, Typ, 5 Felder, Standard-Toggle, Löschen   | `settings/page.tsx` | ✅     |
| 7   | `UNIQUE INDEX` für is_default via Trigger oder Upsert-Logik   | `settings/page.tsx` | ✅ RPC |

**UX-Skizze:**

```
┌─────────────────────────────────────────────────────┐
│  ⚙ Brauanlage            [+ Neue Anlage]            │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  ★ Grainfather 35L           [Standard]       │  │
│  │  All-Grain  |  35L  |  3.5 L/h  |  0.5L Trub │  │
│  │                          [Bearbeiten] [Löschen]│  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Kleiner Topf 10L                             │  │
│  │  All-Grain  |  10L  |  2.5 L/h  |  0.3L Trub │  │
│  │                          [Bearbeiten] [Löschen]│  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Phase 3 — BrewEditor-Integration (Schätzung: 1–2 h)

| #   | Aufgabe                                                          | Datei            | Status |
| --- | ---------------------------------------------------------------- | ---------------- | ------ |
| 8   | Equipment-Profile beim Editor-Mount laden                        | `BrewEditor.tsx` | ✅     |
| 9   | Dropdown „Anlage laden" direkt über den 5 NumberInputs einfügen  | `BrewEditor.tsx` | ✅     |
| 10  | `handleLoadProfile(profile)` — füllt alle 5 `updateData()` Calls | `BrewEditor.tsx` | ✅     |
| 11  | Bei neuem Rezept (`id === 'new'`): Default-Profil auto-laden     | `BrewEditor.tsx` | ✅     |

**UX-Skizze:**

```
  [Brauanlage: Grainfather 35L ▾]  ← Dropdown über den 5 Inputs
  ┌──────────┬──────────┬──────────┬──────────┬──────────┐
  │Verdampf. │Trubverl. │Kühlschw. │Kornabs.  │Maischedick│
  │  3.5 L/h │  0.5 L   │  0.04    │  0.96    │  3.5     │
  └──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Phase 4 — Session-Integration (Schätzung: 1 h)

| #   | Aufgabe                                                              | Datei                               | Status |
| --- | -------------------------------------------------------------------- | ----------------------------------- | ------ |
| 12  | Equipment-Profile beim Laden in `sessions/new` abrufen               | `sessions/new/page.tsx`             | ✅     |
| 13  | Dropdown „Brauanlage" im Sudplanung-Block                            | `sessions/new/page.tsx`             | ✅     |
| 14  | Ausgewähltes Profil in `measurements.equipment_profile_id` speichern | `sessions/new/page.tsx`             | ✅     |
| 15  | PlanningTab + PhaseViews: `equipmentConfig` aus `measurements` lesen | `PlanningTab.tsx`, `PhaseViews.tsx` | ✅     |

### Phase 5 — Öffentliche Brew-Detailseite (Schätzung: 45 min)

| #   | Aufgabe                                                                      | Datei                | Status |
| --- | ---------------------------------------------------------------------------- | -------------------- | ------ |
| 16  | Bei eingeloggten Usern: Default-Profil laden (optional join beim fetch)      | `brew/[id]/page.tsx` | ✅     |
| 17  | Profil-Config an `calculateWaterProfile` übergeben (statt nur mashThickness) | `brew/[id]/page.tsx` | ✅     |
| 18  | Hinweis-Text „Wassermengen basieren auf deiner Standardanlage"               | `brew/[id]/page.tsx` | ✅     |

### Phase 6 — FormulaInspector (optional, nice-to-have, ~30 min)

| #   | Aufgabe                                                        | Datei                  | Status |
| --- | -------------------------------------------------------------- | ---------------------- | ------ |
| 19  | `config` aus Rezept-Daten in `FormulaInspector`-Props ergänzen | `FormulaInspector.tsx` | ✅     |
| 20  | BatchSizeInspector zeigt reale Anlage-Verluste statt Defaults  | `FormulaInspector.tsx` | ✅     |

---

## 6. Premium-Überlegung

| Tier    | Anzahl Profile | Au-Load im BrewEditor |
| ------- | -------------- | --------------------- |
| Free    | 1 Profil       | ✅                    |
| Starter | 3 Profile      | ✅                    |
| Pro+    | Unbegrenzt     | ✅                    |

Implementierung: In `EquipmentSettings` vor dem Erstellen eines zweiten Profils
`premium-checks.ts` abfragen (`canCreateEquipmentProfile(tier, currentCount)`).

---

## 7. Gesamtzeitschätzung

| Phase | Beschreibung                   | Zeit       |
| ----- | ------------------------------ | ---------- |
| 1     | DB-Migration + Typen           | 30 min     |
| 2     | Settings-Tab Brauanlage (CRUD) | 2–3 h      |
| 3     | BrewEditor-Integration         | 1–2 h      |
| 4     | Session-Integration            | 1 h        |
| 5     | Öffentliche Brew-Detailseite   | 45 min     |
| 6     | FormulaInspector (optional)    | 30 min     |
| **Σ** | **Gesamt**                     | **~6–8 h** |

---

## 8. Abhängigkeiten & Risiken

| Risiko               | Beschreibung                                                               | Mitigation                                                                          |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Migration auf Prod   | Neue Tabelle mit RLS, UNIQUE INDEX                                         | Lokal testen, dann `supabase db push`                                               |
| Datenmigration       | Vorhandene Rezepte haben bereits `boil_off_rate` etc. in brew.data         | Kein Problem — bestehende Werte haben Vorrang, Profil nur als "Anlage laden"-Aktion |
| is_default=UNIQUE    | Postgre UNIQUE partial index ist korrekt, aber Upsert-Logik per Code nötig | Beim Setzen eines neuen Standards: alle anderen zuerst auf `false` setzen           |
| BrewEditor re-render | Equipment-Load-Effect muss einmalig sein                                   | Guard: `if (hasMountedEquipment.current) return`                                    |

---

## 9. Nicht in Scope (bewusst ausgelassen)

- **Import/Export** von Profilen (z.B. Grainfather-CSV)
- **Fermentation vessel** separate Konfiguration
- **Temperatur-Kalibrierung** der Anlage
- **Persönliche Profile** (unabhängig von squads) — erst wenn Personal-Brewer-Account eingeführt

---

## 10. Verknüpfte Dokumente

- `ROADMAP_discover_page.md` — Stufe 12, kein direkter Bezug
- `documentation/completed/` — sessions 3.0, brew_measurements
- `lib/brewing-calculations.ts` — Kalkulations-Lib
- `supabase/migrations/20260219160000_update_schema_sessions_3_0.sql` — sessions v3 Datenmodell
