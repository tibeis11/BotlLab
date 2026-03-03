# Database Schema Specification: Sessions 3.0

## 1. Philosophy

To ensure data integrity and query performance, we are moving away from storing critical metric data in the `timeline` JSONB array.

- **Structural Data** (OG, FG, Batch Volume, Efficiency) -> Goes into `brewing_sessions` columns.
- **Time-Series Data** (Gravity, Temp, Pressure, pH) -> Goes into `brew_measurements`.
- **Audit/Log Data** (Start timer, Note added) -> Remains in `timeline` (JSONB).

---

## 2. Table: `brewing_sessions` (Structure Update)

These columns ensure that a session has a definitive "Truth" about its key stats, without needing to parse a JSON array.

| Column Name           | Type    | Nullable | Description                                          |
| --------------------- | ------- | -------- | ---------------------------------------------------- |
| `target_og`           | numeric | Yes      | Planned OG from recipe (snapshot).                   |
| `measured_og`         | numeric | Yes      | **New:** The final post-boil gravity (The "Anchor"). |
| `measured_fg`         | numeric | Yes      | **New:** The final gravity before packaging.         |
| `measured_abv`        | numeric | Yes      | **New:** Final calculated ABV.                       |
| `measure_volume`      | numeric | Yes      | **New:** Volume into fermenter (liters).             |
| `measured_efficiency` | numeric | Yes      | **New:** Calculated Brewhouse Efficiency %.          |
| `carbonation_level`   | numeric | Yes      | **New:** Target CO2 volumes.                         |

_Why?_ This allows analytics like "Average Efficiency per Beer Style" or "Actual vs Target OG" reports later.

---

## 3. Table: `brew_measurements` (Expansion)

This table becomes the single source of truth for the _Fermentation Graph_.

| Column Name   | Type        | Description                                                                                                                                    |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | uuid        | PK                                                                                                                                             |
| `session_id`  | uuid        | FK to sessions                                                                                                                                 |
| `measured_at` | timestamptz | Time of reading                                                                                                                                |
| `gravity`     | numeric     | Specific Gravity (1.xxx)                                                                                                                       |
| `temperature` | numeric     | Measured Temp (°C)                                                                                                                             |
| `pressure`    | numeric     | **New:** Pressure (bar) for Spundung/Unitanks                                                                                                  |
| `ph`          | numeric     | **New:** pH Reading (can be null if only SG measured)                                                                                          |
| `type`        | text        | **New:** 'manual', 'tilt', 'ispindel', 'plaato' (Source tracking)                                                                              |
| `is_og`       | boolean     | **New:** Marks this reading specifically as the "Original Gravity" anchor measurement? (Alternatively, rely on `brewing_sessions.measured_og`) |

---

## 4. New Table: `session_mash_steps` (Optional but Clean)

Currently, mash steps are likely just in the Recipe JSON. If we want a truly interactive "Brew Day" where we track _actual_ vs _planned_ temperatures per step, we might need this.
_Decision:_ For now, staying with JSON in `recipe_data` is acceptable if we only _read_ steps. If we want to log "Actual Mash Temp", we should log it as a `timeline` event or a measurement.

-> **Recommendation:** Keep Mash Steps in JSON for now to avoid over-engineering, but log _deviations_ in `timeline`.

---

## 5. Migration Strategy

1.  **Add Columns:** Create the new columns in `brewing_sessions` and `brew_measurements`.
2.  **Backfill (Data Fix):** Write a script to iterate through existing `timeline` JSON arrays, find the `MEASUREMENT_OG` / `MEASUREMENT_VOLUME` events, and migrate those values into the new dedicated columns.
3.  **Code Switch:** Update `SessionContext` to read from columns `session.measured_og` instead of `timeline.find(...)`.

---

## 6. SQL Draft

```sql
-- 1. Updates to Brewing Sessions (The "Anchor" Stats)
ALTER TABLE public.brewing_sessions
ADD COLUMN IF NOT EXISTS measured_og numeric,
ADD COLUMN IF NOT EXISTS measured_fg numeric,
ADD COLUMN IF NOT EXISTS measured_batch_volume numeric, -- Volume into fermenter
ADD COLUMN IF NOT EXISTS measured_efficiency numeric;

-- 2. Updates to Measurements (The "Graph" Data)
ALTER TABLE public.brew_measurements
ADD COLUMN IF NOT EXISTS pressure numeric, -- Bar
ADD COLUMN IF NOT EXISTS ph numeric,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'; -- 'manual', 'tilt', etc.

-- 3. Indexes for Analytics
CREATE INDEX IF NOT EXISTS idx_sessions_og ON public.brewing_sessions(measured_og);
CREATE INDEX IF NOT EXISTS idx_measurements_session_id_time ON public.brew_measurements(session_id, measured_at);
```
