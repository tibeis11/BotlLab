# Roadmap: Bewertungssystem 2.0 – Geschmacksprofile & Sensorische Analyse

## Executive Summary

**Ziel**: Transformation des bestehenden 1-5 Sterne Bewertungssystems in ein datenreiches Feedback-Tool, das Hobbybrauern detaillierte sensorische Analysen ihrer Biere liefert, ohne Laien zu überfordern.

**Problem**: Das aktuelle System (Sterne + Name + Freitext) liefert keine strukturierten Daten für Brau-Optimierung. Bewertungen von Freunden/Familie bleiben subjektiv und schwer vergleichbar.

**Lösung**: Intuitive "Semantische Slider" und Flavor-Tags erweitern das Rating-Formular. Brauer erhalten dadurch:

- Durchschnittswerte für Bitterkeit, Körper, Süße etc.
- Häufigkeitsverteilungen von Geschmacksnoten (fruchtig, röstig, etc.)
- Visuelle Radar-Charts für Geschmacksprofile
- Vergleiche zwischen verschiedenen Brews

---

## Phase 1: Datenbankschema & Backend-Logik

### 1.1 Migration: Ratings Table Extension

**Neue Spalten in `ratings`**:

```sql
-- Sensorische Attribute (Scale 1-10)
ALTER TABLE ratings ADD COLUMN taste_bitterness INTEGER CHECK (taste_bitterness >= 1 AND taste_bitterness <= 10);
ALTER TABLE ratings ADD COLUMN taste_sweetness INTEGER CHECK (taste_sweetness >= 1 AND taste_sweetness <= 10);
ALTER TABLE ratings ADD COLUMN taste_body INTEGER CHECK (taste_body >= 1 AND taste_body <= 10);
ALTER TABLE ratings ADD COLUMN taste_carbonation INTEGER CHECK (taste_carbonation >= 1 AND taste_carbonation <= 10);
ALTER TABLE ratings ADD COLUMN taste_acidity INTEGER CHECK (taste_acidity >= 1 AND taste_acidity <= 10);

-- Flavor Tags (Array of strings)
ALTER TABLE ratings ADD COLUMN flavor_tags TEXT[];

-- Appearance (Optional: Farbe, Klarheit)
ALTER TABLE ratings ADD COLUMN appearance_color TEXT; -- 'pale', 'amber', 'dark'
ALTER TABLE ratings ADD COLUMN appearance_clarity TEXT; -- 'clear', 'hazy', 'opaque'

-- Aroma Intensity (1-10)
ALTER TABLE ratings ADD COLUMN aroma_intensity INTEGER CHECK (aroma_intensity >= 1 AND aroma_intensity <= 10);
```

**Migration File**: `supabase/migrations/YYYYMMDDHHMMSS_rating_system_2_0.sql`

### 1.2 TypeScript Types

**File**: `lib/types/rating.ts`

```typescript
export interface RatingProfile {
  // Sensorische Dimensionen (1-10)
  taste_bitterness?: number;
  taste_sweetness?: number;
  taste_body?: number; // Wässrig (1) → Vollmundig (10)
  taste_carbonation?: number; // Flach (1) → Spritzig (10)
  taste_acidity?: number; // Mild (1) → Sauer (10)

  // Flavor Tags
  flavor_tags?: string[]; // ['citrus', 'roasted', 'caramel', ...]

  // Appearance
  appearance_color?: "pale" | "amber" | "dark";
  appearance_clarity?: "clear" | "hazy" | "opaque";

  // Aroma
  aroma_intensity?: number;
}

export interface RatingSubmission extends RatingProfile {
  rating: number; // 1-5 stars
  author_name: string;
  comment?: string;
}
```

### 1.3 Validation Schema

**File**: `lib/validations/rating-schemas.ts`

```typescript
import { z } from "zod";

export const ratingProfileSchema = z.object({
  taste_bitterness: z.number().min(1).max(10).optional(),
  taste_sweetness: z.number().min(1).max(10).optional(),
  taste_body: z.number().min(1).max(10).optional(),
  taste_carbonation: z.number().min(1).max(10).optional(),
  taste_acidity: z.number().min(1).max(10).optional(),
  flavor_tags: z.array(z.string()).max(8).optional(),
  appearance_color: z.enum(["pale", "amber", "dark"]).optional(),
  appearance_clarity: z.enum(["clear", "hazy", "opaque"]).optional(),
  aroma_intensity: z.number().min(1).max(10).optional(),
});

export const ratingSubmissionSchema = z
  .object({
    rating: z.number().min(1).max(5),
    author_name: z.string().min(1).max(50),
    comment: z.string().max(500).optional(),
  })
  .merge(ratingProfileSchema);
```

---

## Phase 2: Flavor Tag System

### 2.1 Tag-Konfiguration

**File**: `lib/rating-config.ts`

```typescript
export interface FlavorTag {
  id: string;
  label: string;
  category: "fruity" | "malty" | "hoppy" | "roasted" | "spicy" | "other";
  icon: string; // Emoji
  description?: string;
}

export const FLAVOR_TAGS: FlavorTag[] = [
  // Fruchtig
  { id: "citrus", label: "Zitrus", category: "fruity", icon: "🍋" },
  { id: "tropical", label: "Tropisch", category: "fruity", icon: "🍍" },
  { id: "berry", label: "Beerig", category: "fruity", icon: "🫐" },
  { id: "stone_fruit", label: "Steinobst", category: "fruity", icon: "🍑" },

  // Malzig
  { id: "bread", label: "Brot", category: "malty", icon: "🍞" },
  { id: "caramel", label: "Karamell", category: "malty", icon: "🍮" },
  { id: "chocolate", label: "Schokolade", category: "malty", icon: "🍫" },
  { id: "honey", label: "Honig", category: "malty", icon: "🍯" },

  // Hopfig
  { id: "floral", label: "Blumig", category: "hoppy", icon: "🌸" },
  { id: "herbal", label: "Kräuter", category: "hoppy", icon: "🌿" },
  { id: "pine", label: "Harzig", category: "hoppy", icon: "🌲" },
  { id: "grassy", label: "Grasig", category: "hoppy", icon: "🌾" },

  // Geröstet
  { id: "roasted", label: "Röstig", category: "roasted", icon: "☕" },
  { id: "coffee", label: "Kaffee", category: "roasted", icon: "☕" },
  { id: "smoky", label: "Rauchig", category: "roasted", icon: "🔥" },

  // Würzig
  { id: "spicy", label: "Würzig", category: "spicy", icon: "🌶️" },
  { id: "peppery", label: "Pfeffrig", category: "spicy", icon: "🫚" },
  { id: "clove", label: "Nelke", category: "spicy", icon: "🔸" },

  // Sonstiges
  { id: "yeast", label: "Hefe", category: "other", icon: "🍺" },
  { id: "sour", label: "Sauer", category: "other", icon: "🍋" },
  { id: "funky", label: "Funky", category: "other", icon: "🧀" },
  { id: "mineral", label: "Mineralisch", category: "other", icon: "💎" },
];

export interface TasteSlider {
  id: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  description: string;
}

export const TASTE_SLIDERS: TasteSlider[] = [
  {
    id: "taste_bitterness",
    label: "Bitterkeit",
    minLabel: "Mild",
    maxLabel: "Sehr bitter",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Wie stark schmeckst du die Hopfenbitterkeit?",
  },
  {
    id: "taste_sweetness",
    label: "Süße",
    minLabel: "Herb",
    maxLabel: "Sehr süß",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Wie süß ist das Bier?",
  },
  {
    id: "taste_body",
    label: "Körper",
    minLabel: "Wässrig",
    maxLabel: "Vollmundig",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: 'Wie "schwer" fühlt sich das Bier im Mund an?',
  },
  {
    id: "taste_carbonation",
    label: "Kohlensäure",
    minLabel: "Flach",
    maxLabel: "Spritzig",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Wie stark ist die Kohlensäure?",
  },
  {
    id: "taste_acidity",
    label: "Säure",
    minLabel: "Mild",
    maxLabel: "Sauer",
    minValue: 1,
    maxValue: 10,
    defaultValue: 5,
    description: "Schmeckst du eine säuerliche Note?",
  },
];
```

---

## Phase 3: UI/UX Implementation

### 3.1 Rating Modal (Extended)

**File**: `app/brew/[id]/components/RateBrewModal.tsx` (Update)

**Layout-Struktur**:

```
┌─────────────────────────────────────────┐
│  Deine Bewertung                    [×] │
├─────────────────────────────────────────┤
│                                         │
│  STERNE: ⭐⭐⭐⭐⭐                         │
│                                         │
│  NAME: [z.B. Tim         ]              │
│                                         │
│  ─────────────────────────────────────  │
│  Geschmacksprofil (Optional) [Expand ▼] │
│  ─────────────────────────────────────  │
│                                         │
│  👅 GESCHMACK                           │
│  Bitterkeit:  [====|====] (Slider)      │
│  Süße:        [==|======] (Slider)      │
│  Körper:      [======|==] (Slider)      │
│  Kohlensäure: [===|=====] (Slider)      │
│                                         │
│  🌈 GESCHMACKSNOTEN                     │
│  [🍋 Zitrus] [🍞 Brot] [☕ Röstig]      │
│  [🍍 Tropisch] [🌸 Blumig] ...          │
│                                         │
│  🎨 AUSSEHEN                            │
│  Farbe:    ( ) Hell  (•) Bernstein      │
│             ( ) Dunkel                  │
│  Klarheit: (•) Klar  ( ) Trüb           │
│             ( ) Undurchsichtig          │
│                                         │
│  ─────────────────────────────────────  │
│  KOMMENTAR (Optional):                  │
│  [Was hast du gedacht?              ]   │
│                                         │
│  [Bewertung absenden]                   │
└─────────────────────────────────────────┘
```

**Key Features**:

1. **Collapsible Section**: "Geschmacksprofil" ist eingeklappt per default (für Quick Ratings)
2. **Progressive Disclosure**: Nutzer können schnell Sterne geben ODER detailliert profilen
3. **Visual Sliders**: Custom styled range inputs mit Labels an beiden Enden
4. **Tag Bubbles**: Multi-select buttons (cyan border when active)
5. **Mobile Responsive**: Sliders auf Mobile gut bedienbar (große Touch-Targets)

### 3.2 UI Components

**File**: `app/brew/[id]/components/TasteSlider.tsx` (New)

```tsx
interface TasteSliderProps {
  id: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number;
  onChange: (value: number) => void;
  description?: string;
}

export default function TasteSlider({
  id,
  label,
  minLabel,
  maxLabel,
  value,
  onChange,
  description,
}: TasteSliderProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-white">{label}</label>
        <span className="text-xs text-cyan-400 font-mono">{value}/10</span>
      </div>
      {description && (
        <p className="text-xs text-zinc-500 mb-3">{description}</p>
      )}
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none 
                   [&::-webkit-slider-thumb]:w-6 
                   [&::-webkit-slider-thumb]:h-6 
                   [&::-webkit-slider-thumb]:rounded-full 
                   [&::-webkit-slider-thumb]:bg-cyan-500
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:transition-transform
                   [&::-webkit-slider-thumb]:hover:scale-110"
      />
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
```

**File**: `app/brew/[id]/components/FlavorTagSelector.tsx` (New)

```tsx
import { FLAVOR_TAGS } from "@/lib/rating-config";

interface FlavorTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxSelection?: number;
}

export default function FlavorTagSelector({
  selectedTags,
  onChange,
  maxSelection = 8,
}: FlavorTagSelectorProps) {
  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((t) => t !== tagId));
    } else if (selectedTags.length < maxSelection) {
      onChange([...selectedTags, tagId]);
    }
  };

  const groupedTags = FLAVOR_TAGS.reduce(
    (acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    },
    {} as Record<string, typeof FLAVOR_TAGS>,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-white">
          Geschmacksnoten auswählen
        </h4>
        <span className="text-xs text-zinc-500">
          {selectedTags.length}/{maxSelection} ausgewählt
        </span>
      </div>

      {Object.entries(groupedTags).map(([category, tags]) => (
        <div key={category}>
          <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-2">
            {category === "fruity" && "🍇 Fruchtig"}
            {category === "malty" && "🌾 Malzig"}
            {category === "hoppy" && "🌿 Hopfig"}
            {category === "roasted" && "🔥 Geröstet"}
            {category === "spicy" && "🌶️ Würzig"}
            {category === "other" && "✨ Sonstiges"}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              const isDisabled =
                !isSelected && selectedTags.length >= maxSelection;

              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  disabled={isDisabled}
                  className={`
                    px-3 py-2 rounded-xl border-2 font-medium text-sm transition-all
                    flex items-center gap-2
                    ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }
                    ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3.3 API Route Update

**File**: `app/api/ratings/route.ts` (Update POST handler)

```typescript
import { ratingSubmissionSchema } from "@/lib/validations/rating-schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate with new schema
    const validated = ratingSubmissionSchema.parse(body);

    const { data, error } = await supabase.from("ratings").insert({
      brew_id: body.brew_id,
      rating: validated.rating,
      author_name: validated.author_name,
      comment: validated.comment,
      // New fields
      taste_bitterness: validated.taste_bitterness,
      taste_sweetness: validated.taste_sweetness,
      taste_body: validated.taste_body,
      taste_carbonation: validated.taste_carbonation,
      taste_acidity: validated.taste_acidity,
      flavor_tags: validated.flavor_tags,
      appearance_color: validated.appearance_color,
      appearance_clarity: validated.appearance_clarity,
      aroma_intensity: validated.aroma_intensity,
      // Existing
      moderation_status: "auto_approved",
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
```

---

## Phase 4: Analytics & Visualization (Brewer Dashboard)

### 4.1 Aggregation Service (Database Side)

**Optimization**: Anstatt alle Ratings client-seitig zu aggregieren (Performance & Logik-Falle bei NULL-Werten), nutzen wir eine **PostgreSQL Function**.

**Migration**: `supabase/migrations/YYYYMMDDHHMMSS_rating_analytics.sql`

```sql
CREATE OR REPLACE FUNCTION get_brew_taste_profile(p_brew_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bitterness', ROUND(AVG(taste_bitterness), 1),
    'sweetness', ROUND(AVG(taste_sweetness), 1),
    'body', ROUND(AVG(taste_body), 1),
    'carbonation', ROUND(AVG(taste_carbonation), 1),
    'acidity', ROUND(AVG(taste_acidity), 1),
    'count', COUNT(*)
  )
  INTO result
  FROM ratings
  WHERE brew_id = p_brew_id
    AND moderation_status = 'auto_approved';

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**TypeScript Service**: `lib/rating-analytics.ts`

```typescript
import { supabase } from "./supabase";

export interface TasteProfile {
  bitterness: number;
  sweetness: number;
  body: number;
  carbonation: number;
  acidity: number;
  count: number;
}

export async function getBrewTasteProfile(
  brewId: string,
): Promise<TasteProfile | null> {
  const { data, error } = await supabase.rpc("get_brew_taste_profile", {
    p_brew_id: brewId,
  });

  if (error) {
    console.error("Error fetching taste profile:", error);
    return null;
  }

  // Wenn kein Rating existiert, geben alle AVGs null zurück
  if (!data || data.count === 0) return null;

  return data as TasteProfile;
}
```

export async function getBrewFlavorDistribution(
brewId: string,
): Promise<FlavorDistribution[]> {
const { data, error } = await supabase
.from("ratings")
.select("flavor_tags")
.eq("brew_id", brewId)
.eq("moderation_status", "auto_approved")
.not("flavor_tags", "is", null);

if (error || !data) return [];

const tagCounts: Record<string, number> = {};
let totalTags = 0;

data.forEach((rating) => {
if (rating.flavor_tags) {
rating.flavor_tags.forEach((tag: string) => {
tagCounts[tag] = (tagCounts[tag] || 0) + 1;
totalTags++;
});
}
});

return Object.entries(tagCounts)
.map(([tagId, count]) => {
const tagConfig = FLAVOR_TAGS.find((t) => t.id === tagId);
return {
tagId,
label: tagConfig?.label || tagId,
count,
percentage: Math.round((count / data.length) \* 100),
};
})
.sort((a, b) => b.count - a.count);
}

````

### 4.2 Visualization Components

**File**: `app/brew/[id]/components/TasteRadarChart.tsx` (New)

```tsx
"use client";

import { TasteProfile } from "@/lib/rating-analytics";

export default function TasteRadarChart({
  profile,
}: {
  profile: TasteProfile;
}) {
  // Simple SVG-based Radar Chart (Pentagon for 5 dimensions)
  const dimensions = [
    { key: "bitterness", label: "Bitter", angle: 0 },
    { key: "sweetness", label: "Süß", angle: 72 },
    { key: "body", label: "Körper", angle: 144 },
    { key: "carbonation", label: "Kohlensäure", angle: 216 },
    { key: "acidity", label: "Säure", angle: 288 },
  ];

  const size = 300;
  const center = size / 2;
  const maxRadius = size / 2 - 40;

  const getPoint = (value: number, angle: number) => {
    const radius = (value / 10) * maxRadius;
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const dataPoints = dimensions.map((dim) =>
    getPoint(profile[dim.key as keyof TasteProfile] as number, dim.angle),
  );

  const pathData =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto">
        {/* Background Grid (circles for 2, 4, 6, 8, 10) */}
        {[2, 4, 6, 8, 10].map((val) => {
          const r = (val / 10) * maxRadius;
          return (
            <circle
              key={val}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="rgb(39 39 42)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Lines */}
        {dimensions.map((dim) => {
          const end = getPoint(10, dim.angle);
          return (
            <line
              key={dim.key}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="rgb(63 63 70)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon */}
        <path
          d={pathData}
          fill="rgba(6, 182, 212, 0.2)"
          stroke="rgb(6, 182, 212)"
          strokeWidth="2"
        />

        {/* Data Points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="rgb(6, 182, 212)" />
        ))}

        {/* Labels */}
        {dimensions.map((dim) => {
          const labelPos = getPoint(11.5, dim.angle);
          return (
            <text
              key={dim.label}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-bold fill-zinc-400"
            >
              {dim.label}
            </text>
          );
        })}
      </svg>

      <div className="text-center text-xs text-zinc-500 mt-2">
        Basierend auf {profile.count} Bewertungen
      </div>
    </div>
  );
}
````

**File**: `app/brew/[id]/components/FlavorTagCloud.tsx` (New)

```tsx
import { FlavorDistribution } from "@/lib/rating-analytics";

export default function FlavorTagCloud({
  distribution,
}: {
  distribution: FlavorDistribution[];
}) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {distribution.slice(0, 12).map((tag) => (
        <div
          key={tag.tagId}
          className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 
                     flex items-center gap-3 hover:border-cyan-500/50 transition"
          style={{
            // Visual weight based on percentage
            transform: `scale(${0.8 + (tag.percentage / 100) * 0.4})`,
          }}
        >
          <span className="text-2xl">
            {FLAVOR_TAGS.find((t) => t.id === tag.tagId)?.icon}
          </span>
          <div>
            <div className="text-sm font-bold text-white">{tag.label}</div>
            <div className="text-xs text-zinc-500">
              {tag.percentage}% der Bewertungen
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4.3 Integration in Brew Detail Page

**File**: `app/brew/[id]/page.tsx` (Add new section)

```tsx
import {
  getBrewTasteProfile,
  getBrewFlavorDistribution,
} from "@/lib/rating-analytics";
import TasteRadarChart from "./components/TasteRadarChart";
import FlavorTagCloud from "./components/FlavorTagCloud";

// In page component:
const tasteProfile = await getBrewTasteProfile(brewId);
const flavorDist = await getBrewFlavorDistribution(brewId);

// Render:
{
  tasteProfile && tasteProfile.count > 0 && (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-6">
      <h2 className="text-2xl font-black text-white mb-6">Geschmacksprofil</h2>
      <TasteRadarChart profile={tasteProfile} />
    </div>
  );
}

{
  flavorDist.length > 0 && (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-6">
      <h2 className="text-2xl font-black text-white mb-6">
        Häufigste Geschmacksnoten
      </h2>
      <FlavorTagCloud distribution={flavorDist} />
    </div>
  );
}
```

---

## Phase 5: Mobile Experience & Guest Flow

### 5.1 QR Code Landing Page

**Update**: `app/b/[id]/page.tsx`

- **Challenge**: Mobile users (oft Gäste) müssen intuitiv und schnell raten können
- **Solution**:
  - Collapsible "Erweiterte Bewertung" Section (per default geschlossen auf Mobile)
  - "Quick Rate" Button (nur Sterne + Name) prominent platziert
  - "Detailliert bewerten" Link darunter für interessierte User

### 5.2 Progressive Disclosure Pattern

```
Mobile View (Initial):
┌─────────────────────┐
│ 🍺 Pale Ale         │
│ BotlLab Brewery     │
├─────────────────────┤
│ Wie schmeckt's?     │
│ ⭐⭐⭐⭐⭐           │
│                     │
│ [Dein Name     ]    │
│                     │
│ [Schnell bewerten]  │
│                     │
│ ▼ Ausführlich      │
│   bewerten          │
└─────────────────────┘

After Expand:
┌─────────────────────┐
│ 🍺 Pale Ale         │
│ BotlLab Brewery     │
├─────────────────────┤
│ Wie schmeckt's?     │
│ ⭐⭐⭐⭐⭐           │
│                     │
│ [Dein Name     ]    │
│                     │
│ ▲ Geschmack         │
│ Bitter: [====|==]   │
│ Süß:    [==|====]   │
│ ...                 │
│                     │
│ 🌈 Geschmacksnoten  │
│ [Zitrus] [Brot]     │
│ ...                 │
│                     │
│ [Bewertung senden]  │
└─────────────────────┘

After Submit:
┌─────────────────────┐
│ ✅ Danke für deine  │
│    Bewertung!       │
├─────────────────────┤
│ 🏅 KRONKORKEN       │
│    VERFÜGBAR!       │
│                     │
│ Sammle den digitalen│
│ Kronkorken von      │
│ "Pale Ale" in deine │
│ persönliche         │
│ Sammlung.           │
│                     │
│ [🏅 Jetzt sammeln]  │
│                     │
│ [Nein, danke]       │
└─────────────────────┘

If not logged in:
┌─────────────────────┐
│ 🔐 Login/Signup     │
│                     │
│ Um deinen Kronkorken│
│ zu sammeln, melde   │
│ dich an oder        │
│ erstelle einen      │
│ kostenlosen Account.│
│                     │
│ [Mit Google]        │
│ [Mit E-Mail]        │
│                     │
│ Deine Bewertung     │
│ wurde gespeichert!  │
└─────────────────────┘
```

### 5.3 Gamification: Ratings ↔ Kronkorken

**Konzept**: Kronkorken (Bottle Caps) werden an Bewertungen geknüpft, nicht an reines Scannen.

**Vorteile**:

- ✅ Verhindert "Farming" (User scannen einfach alle QR-Codes ohne zu trinken)
- ✅ Erhöht Motivation für qualitatives Feedback
- ✅ Niedrige Hürde bleibt: Bewertung ohne Login möglich
- ✅ Incentive für Registrierung: "Sammle deine Kronkorken!"

**User Flow**:

1. **QR-Code Scan** → Bewertungsseite
2. **Bewertung abgeben** (auch ohne Login) → Rating ist "orphaned" (user_id IS NULL)
3. **Nach Submit** → "🏅 Kronkorken verfügbar!" CTA erscheint
4. **Click "Jetzt sammeln"** → Auth-Check:
   - Eingeloggt? → Kronkorken wird zur Collection hinzugefügt + **Rating wird adoptiert**
   - Nicht eingeloggt? → Redirect zu Login mit Context: `?action=claim_cap&brew_id=xxx&rating_id=yyy`
5. **Nach Login** → Auto-Claim des Kronkorkens + **Rating Adoption** (Update `rating.user_id`)

**Database Changes**:

```sql
-- bottle_caps table bereits vorhanden, erweitern:
ALTER TABLE bottle_caps ADD COLUMN rating_id UUID REFERENCES ratings(id) ON DELETE SET NULL;
ALTER TABLE bottle_caps ADD COLUMN claimed_via TEXT DEFAULT 'scan'; -- 'scan' | 'rating'

-- Constraint: Ein User kann pro Brew nur 1 Cap via Rating claimen
CREATE UNIQUE INDEX idx_bottle_caps_rating_unique ON bottle_caps(user_id, brew_id) WHERE claimed_via = 'rating';
```

**API Endpoint**: `POST /api/bottle-caps/claim`

```typescript
// File: app/api/bottle-caps/claim/route.ts

export async function POST(request: Request) {
  const { brew_id, rating_id } = await request.json();
  const session = await getSession();

  if (!session) {
    return Response.json(
      {
        error: "Not authenticated",
        redirect: `/login?action=claim_cap&brew_id=${brew_id}&rating_id=${rating_id}`,
      },
      { status: 401 },
    );
  }

  // 1. Verify rating exists and user hasn't already claimed
  const { data: rating } = await supabase
    .from("ratings")
    .select("id")
    .eq("id", rating_id)
    .single();

  if (!rating) {
    return Response.json({ error: "Rating not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("bottle_caps")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("brew_id", brew_id)
    .eq("claimed_via", "rating")
    .single();

  if (existing) {
    return Response.json({ error: "Already claimed" }, { status: 409 });
  }

  // 2. Get brew details
  const { data: brew } = await supabase
    .from("brews")
    .select("name, brewery_id, metadata")
    .eq("id", brew_id)
    .single();

  // 3. Adopt the rating (if it was anonymous/guest)
  if (rating.user_id === null) {
    await supabase
      .from("ratings")
      .update({ user_id: session.user.id })
      .eq("id", rating_id);
  }

  // 4. Create bottle cap
  const { data: cap, error } = await supabase
    .from("bottle_caps")
    .insert({
      user_id: session.user.id,
      brew_id,
      brewery_id: brew.brewery_id,
      rarity: "common", // Could be dynamic based on brew stats
      claimed_via: "rating",
      rating_id,
      metadata: {
        brew_name: brew.name,
        claimed_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) throw error;

  // 4. Trigger achievement check
  await checkAchievements(session.user.id, "BOTTLE_CAP_CLAIMED");

  return Response.json({
    success: true,
    cap,
    message: `Kronkorken "${brew.name}" gesammelt!`,
  });
}
```

**UI Component**: `app/b/[id]/components/RatingSuccessModal.tsx` (New)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RatingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  brewId: string;
  brewName: string;
  ratingId: string;
  isAuthenticated: boolean;
}

export default function RatingSuccessModal({
  isOpen,
  onClose,
  brewId,
  brewName,
  ratingId,
  isAuthenticated,
}: RatingSuccessModalProps) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);

    const res = await fetch("/api/bottle-caps/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brew_id: brewId, rating_id: ratingId }),
    });

    const data = await res.json();

    if (res.status === 401) {
      // Not authenticated → Redirect to login with claim context
      router.push(data.redirect);
      return;
    }

    if (res.ok) {
      // Show toast/animation
      showAchievement({
        id: `cap-${brewId}`,
        name: `Kronkorken gesammelt!`,
        description: `"${brewName}" ist jetzt in deiner Sammlung.`,
        icon: "🏅",
        tier: "bronze",
        points: 0,
      });

      router.push("/dashboard/collection");
    } else {
      alert(data.error || "Fehler beim Sammeln");
    }

    setClaiming(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full animate-in fade-in slide-in-from-bottom-4">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>

        <h2 className="text-2xl font-black text-white text-center mb-2">
          Danke für deine Bewertung!
        </h2>

        <p className="text-zinc-400 text-center mb-6">
          Deine Meinung hilft dem Brauer, noch besseres Bier zu brauen.
        </p>

        {/* Kronkorken CTA */}
        <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border border-amber-500/30 rounded-2xl p-6 mb-6">
          <div className="text-center mb-4">
            <div className="text-6xl mb-2">🏅</div>
            <h3 className="text-xl font-bold text-amber-400 mb-1">
              Kronkorken verfügbar!
            </h3>
            <p className="text-sm text-zinc-400">
              Sammle den digitalen Kronkorken von <br />
              <strong className="text-white">"{brewName}"</strong>
            </p>
          </div>

          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {claiming ? (
              <>
                <span className="animate-spin">⏳</span> Sammeln...
              </>
            ) : (
              <>🏅 Jetzt sammeln</>
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-center text-zinc-500 mt-3">
              Du wirst zum Login weitergeleitet, um deinen Kronkorken zu
              sichern.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition"
        >
          Nein, danke
        </button>
      </div>
    </div>
  );
}
```

**Integration in QR Landing Page**: `app/b/[id]/page.tsx`

```tsx
// After rating submission:
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [submittedRatingId, setSubmittedRatingId] = useState<string | null>(null);

const handleRatingSubmit = async (ratingData) => {
  const res = await fetch("/api/ratings", {
    method: "POST",
    body: JSON.stringify({ ...ratingData, brew_id: brewId }),
  });

  const { data } = await res.json();
  setSubmittedRatingId(data.id);
  setShowSuccessModal(true);
};

// Render:
<RatingSuccessModal
  isOpen={showSuccessModal}
  onClose={() => setShowSuccessModal(false)}
  brewId={brewId}
  brewName={brew.name}
  ratingId={submittedRatingId!}
  isAuthenticated={!!user}
/>;
```

**Login Page Context Handling**: `app/login/page.tsx`

```tsx
// After successful login:
const searchParams = useSearchParams();
const claimAction = searchParams.get("action");
const brewId = searchParams.get("brew_id");
const ratingId = searchParams.get("rating_id");

if (claimAction === "claim_cap" && brewId && ratingId) {
  // Auto-claim cap
  const res = await fetch("/api/bottle-caps/claim", {
    method: "POST",
    body: JSON.stringify({ brew_id: brewId, rating_id: ratingId }),
  });

  if (res.ok) {
    router.push("/dashboard/collection?claimed=true");
  }
}
```

**Achievement Integration**:

```typescript
// lib/achievements.ts (erweitern)

export const RATING_ACHIEVEMENTS = [
  {
    id: "first_rating",
    name: "Erster Eindruck",
    description: "Gib deine erste Bewertung ab und sammle einen Kronkorken",
    icon: "🏅",
    tier: "bronze",
    condition: (stats) => stats.ratings_given >= 1,
  },
  {
    id: "collector_bronze",
    name: "Kronkorken-Sammler",
    description: "Sammle 10 Kronkorken",
    icon: "🎖️",
    tier: "bronze",
    condition: (stats) => stats.bottle_caps_count >= 10,
  },
  {
    id: "collector_silver",
    name: "Kronkorken-Experte",
    description: "Sammle 50 Kronkorken",
    icon: "🥈",
    tier: "silver",
    condition: (stats) => stats.bottle_caps_count >= 50,
  },
  {
    id: "detailed_reviewer",
    name: "Geschmacks-Profiler",
    description: "Gib 5 Bewertungen mit vollständigem Geschmacksprofil ab",
    icon: "👅",
    tier: "silver",
    condition: (stats) => stats.detailed_ratings_given >= 5,
  },
];
```

---

## Phase 6: Testing & Rollout

### 6.1 Test Strategy

**Unit Tests**:

- `rating-analytics.ts`: Aggregation logic (mocked Supabase)
- `rating-schemas.ts`: Zod validation (edge cases)

**Integration Tests**:

- POST `/api/ratings`: Submit with/without profile data
- GET brew ratings: Fetch and aggregate correctly

**Manual Testing**:

1. Submit rating with full profile → Check DB
2. Submit rating without profile (backwards compat) → Should work
3. View brew with 0 profile ratings → Should hide charts gracefully
4. View brew with mixed ratings (some with, some without profile) → Show "X von Y" indicator

### 6.2 Migration Plan

**Backwards Compatibility**:

- Alle neuen Spalten sind `NULLABLE` → Alte Ratings bleiben gültig
- UI zeigt Geschmacksprofil nur, wenn `count > 0`
- "Quick Rating" (wie bisher) bleibt default für Laien

**Rollout**:

1. **Phase A**: Deploy Migration + Backend → No UI changes yet
2. **Phase B**: Enable "Erweiterte Bewertung" (Beta) für eingeloggte Brewer
3. **Phase C**: Enable für alle (Guest QR Flow)
4. **Phase D**: Make "Radar Chart" prominent on Brew pages (wenn genug Daten)

### 6.3 Success Metrics

- **Adoption Rate**: % der Ratings mit mindestens 1 Slider ausgefüllt
- **Tag Usage**: Durchschnittliche Anzahl Tags pro Rating
- **Completion Time**: Zeit für Rating (sollte <2 Min bleiben)
- **Brewer Engagement**: Clicks auf Geschmacksprofil-Widgets

---

## Phase 7: Advanced Features (Future)

### 7.1 Vergleichs-Tool

**Feature**: "Vergleiche Geschmacksprofile" zwischen 2 Brews

- Side-by-Side Radar Charts
- Highlight größte Unterschiede
- Nutzen: Iteration/Verbesserung tracken

### 7.2 AI-Generated Feedback

**Feature**: LLM analysiert Freitext-Kommentare und extrahiert zusätzliche Tags

- Nutze OpenAI/Gemini API auf existing `comment` field
- Auto-Tag bereits bestehender Ratings (Backfill)

### 7.3 Brewer's Notes Integration

**Feature**: Brewer kann eigene Ziel-Werte für Sliders angeben

- "Soll-Profil" vs "Ist-Profil" Overlay im Radar Chart
- Deviation Indicator: "Bitterkeit liegt 2 Punkte über Ziel"

### 7.4 Community-Benchmarks

**Feature**: "Vergleiche mit ähnlichen Bieren"

- Aggregiere Daten aller Pale Ales in der DB
- Zeige "Dein IPA ist überdurchschnittlich bitter im Vergleich zur Community"

### 7.5 Export & Reporting

**Feature**: PDF-Report mit Geschmacksprofil

- Integration in bestehenden PDF-Generator
- Nutzen: Offline-Dokumentation, Wettbewerbs-Einreichungen

---

## Technical Debt & Maintenance

### Database Indices

```sql
-- Performance für Analytics Queries
CREATE INDEX idx_ratings_brew_taste ON ratings(brew_id) WHERE taste_bitterness IS NOT NULL;
CREATE INDEX idx_ratings_flavor_tags ON ratings USING GIN(flavor_tags);
```

### Localization

- Alle Tags und Labels in `rating-config.ts` sind deutsch
- **TODO**: i18n Support für EN/FR (später)

### Data Validation

- Frontend + Backend Zod validation
- DB-level CHECK constraints für Range-Validierung

---

## Timeline Estimate

| Phase       | Tasks                             | Duration    | Dependencies |
| ----------- | --------------------------------- | ----------- | ------------ |
| **Phase 1** | DB Migration, Types, Validation   | 2 Tage      | -            |
| **Phase 2** | Tag Config, Flavor System         | 1 Tag       | Phase 1      |
| **Phase 3** | UI Components, Modal Update, API  | 4 Tage      | Phase 1-2    |
| **Phase 4** | Analytics Service, Visualizations | 3 Tage      | Phase 1-3    |
| **Phase 5** | Mobile UX, Guest Flow             | 2 Tage      | Phase 3      |
| **Phase 6** | Testing, Rollout, Monitoring      | 2 Tage      | Phase 1-5    |
| **Total**   | **MVP Launch**                    | **14 Tage** | -            |
| **Phase 7** | Advanced Features (Optional)      | 5-10 Tage   | After MVP    |

---

## Phase 8: Analytics Dashboard Expansion (Priority!)

### 8.1 Moderation Strategy Update

**Aktueller Stand**: `moderation_status` in `ratings` table

- Prüft auf Profanity im `comment` Feld
- Auto-Approve vs. Manual Review

**Änderung durch Rating 2.0**:

- ✅ **Flavor Tags**: Keine Moderation nötig (predefined, kein User-Input)
- ✅ **Slider Values**: Keine Moderation nötig (numerisch, validiert)
- ⚠️ **Comment Feld**: **BEHALTEN!** Weiterhin Freitext möglich
  - User können zusätzlich schreiben: "Perfekt zum Grillen!"
  - Moderation bleibt für dieses Feld aktiv

**Action Items**:

- Moderation-Logic in `app/team/[breweryId]/brews/components/BrewEditor.tsx` → **Keine Änderung nötig**
- Profanity-Check bleibt für `comment`, ignoriert neue Felder

### 8.2 Team Analytics: Per-Brew Detail Pages

**Neue Route**: `/team/[breweryId]/analytics/brew/[brewId]`

**Layout-Konzept**:

```
┌─────────────────────────────────────────────────────┐
│  ← Zurück zur Analytics-Übersicht                   │
├─────────────────────────────────────────────────────┤
│  🍺 Pale Ale v2.3                                   │
│  Erstellt: 12.10.2025 | 47 Bewertungen             │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │ ⭐ 4.2 / 5.0    │  │  📊 28 mit Profil       │ │
│  │ 47 Bewertungen  │  │  (60% Completion)        │ │
│  └─────────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Geschmacksprofil                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │        [PENTAGON RADAR CHART]               │   │
│  │                                             │   │
│  │   Bitter: 7.2  Süß: 4.5  Körper: 8.1      │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Häufigste Geschmacksnoten                          │
│  🍋 Zitrus (85%)  🌿 Hopfig (72%)  🍞 Brot (45%)   │
│  🍑 Steinobst (38%)  🌸 Blumig (22%)               │
├─────────────────────────────────────────────────────┤
│  Verteilung nach Attribut                           │
│  ┌─────────────────────────────────────────────┐   │
│  │  Bitterkeit:                                │   │
│  │  [===] 1-3  [========] 4-6  [=====] 7-10   │   │
│  │  12 Bewert. | 18 Bewert.  | 10 Bewert.     │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Timeline: Entwicklung über Zeit                    │
│  ┌─────────────────────────────────────────────┐   │
│  │  [LINE CHART]                               │   │
│  │  Y: Durchschnittswert | X: Datum            │   │
│  │  → Zeigt ob sich Profil ändert (Reifung)   │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Alle Bewertungen                                   │
│  [Bestehende Ratings-List mit neuen Badges]        │
└─────────────────────────────────────────────────────┘
```

**Neue Komponenten**:

```typescript
// File: app/team/[breweryId]/analytics/brew/[brewId]/page.tsx

import TasteRadarChart from '@/app/brew/[id]/components/TasteRadarChart';
import AttributeDistribution from './components/AttributeDistribution';
import TasteTimeline from './components/TasteTimeline';

export default async function BrewAnalyticsPage({ params }) {
  const { breweryId, brewId } = await params;

  const ratings = await getRatingsWithProfiles(brewId);
  const profile = await getBrewTasteProfile(brewId);
  const distribution = await getAttributeDistribution(brewId);
  const timeline = await getTasteTimeline(brewId);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <BrewAnalyticsHeader brew={brew} ratings={ratings} />

      {/* Radar Chart */}
      {profile && <TasteRadarChart profile={profile} />}

      {/* Tag Cloud */}
      <FlavorTagCloud distribution={flavorDist} />

      {/* Distribution Histograms */}
      <AttributeDistribution data={distribution} />

      {/* Timeline (zeigt Entwicklung über Zeit) */}
      <TasteTimeline data={timeline} />

      {/* Raw Ratings List */}
      <RatingsListWithProfiles ratings={ratings} />
    </div>
  );
}
```

**File**: `app/team/[breweryId]/analytics/brew/[brewId]/components/AttributeDistribution.tsx`

```tsx
// Zeigt Histogramme: Wie viele User haben 1-3, 4-6, 7-10 bei Bitterkeit gewählt?
export default function AttributeDistribution({
  data,
}: {
  data: DistributionData;
}) {
  const attributes = [
    "bitterness",
    "sweetness",
    "body",
    "carbonation",
    "acidity",
  ];

  return (
    <div className="space-y-6">
      {attributes.map((attr) => {
        const bins = data[attr]; // { low: 12, mid: 18, high: 10 }
        const total = bins.low + bins.mid + bins.high;

        return (
          <div key={attr} className="bg-zinc-900 rounded-xl p-4">
            <h4 className="font-bold text-white mb-3">{LABEL_MAP[attr]}</h4>
            <div className="flex gap-2 items-end h-32">
              <div
                className="flex-1 bg-cyan-500/20 rounded-t"
                style={{ height: `${(bins.low / total) * 100}%` }}
              >
                <div className="text-center text-white text-xs">{bins.low}</div>
              </div>
              <div
                className="flex-1 bg-cyan-500/50 rounded-t"
                style={{ height: `${(bins.mid / total) * 100}%` }}
              >
                <div className="text-center text-white text-xs">{bins.mid}</div>
              </div>
              <div
                className="flex-1 bg-cyan-500 rounded-t"
                style={{ height: `${(bins.high / total) * 100}%` }}
              >
                <div className="text-center text-white text-xs">
                  {bins.high}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>Niedrig (1-3)</span>
              <span>Mittel (4-6)</span>
              <span>Hoch (7-10)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**File**: `lib/rating-analytics.ts` (Erweiterung)

```typescript
export interface DistributionData {
  bitterness: { low: number; mid: number; high: number };
  sweetness: { low: number; mid: number; high: number };
  body: { low: number; mid: number; high: number };
  carbonation: { low: number; mid: number; high: number };
  acidity: { low: number; mid: number; high: number };
}

export async function getAttributeDistribution(
  brewId: string,
): Promise<DistributionData> {
  const { data } = await supabase
    .from("ratings")
    .select(
      "taste_bitterness, taste_sweetness, taste_body, taste_carbonation, taste_acidity",
    )
    .eq("brew_id", brewId)
    .not("taste_bitterness", "is", null);

  const result: DistributionData = {
    bitterness: { low: 0, mid: 0, high: 0 },
    sweetness: { low: 0, mid: 0, high: 0 },
    body: { low: 0, mid: 0, high: 0 },
    carbonation: { low: 0, mid: 0, high: 0 },
    acidity: { low: 0, mid: 0, high: 0 },
  };

  data?.forEach((r) => {
    ["bitterness", "sweetness", "body", "carbonation", "acidity"].forEach(
      (attr) => {
        const val = r[`taste_${attr}`];
        if (val >= 1 && val <= 3) result[attr].low++;
        else if (val >= 4 && val <= 6) result[attr].mid++;
        else if (val >= 7 && val <= 10) result[attr].high++;
      },
    );
  });

  return result;
}

export async function getTasteTimeline(
  brewId: string,
): Promise<TimelineDataPoint[]> {
  // Gruppiert Ratings nach Datum, berechnet Durchschnittswerte pro Tag
  const { data } = await supabase
    .from("ratings")
    .select(
      "created_at, taste_bitterness, taste_sweetness, taste_body, taste_carbonation, taste_acidity",
    )
    .eq("brew_id", brewId)
    .order("created_at", { ascending: true });

  // Aggregiere nach Tag
  const grouped = groupByDate(data);
  return grouped.map((day) => ({
    date: day.date,
    bitterness: avg(day.ratings, "taste_bitterness"),
    sweetness: avg(day.ratings, "taste_sweetness"),
    body: avg(day.ratings, "taste_body"),
    carbonation: avg(day.ratings, "taste_carbonation"),
    acidity: avg(day.ratings, "taste_acidity"),
  }));
}
```

### 8.3 Analytics Overview Update

**File**: `app/team/[breweryId]/analytics/page.tsx` (Erweitern)

**Neue Sektion hinzufügen**:

```tsx
{
  /* Geschmacksprofile aller Biere */
}
<div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-6">
  <h2 className="text-2xl font-black text-white mb-4">
    🎯 Erfahre wie deine Biere ankommen!
  </h2>
  <p className="text-zinc-400 mb-6">
    Detaillierte Geschmacksprofile zeigen dir, was deine Tester wirklich
    schmecken.
  </p>

  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {brews.map((brew) => (
      <Link
        key={brew.id}
        href={`/team/${breweryId}/analytics/brew/${brew.id}`}
        className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-cyan-500/50 transition group"
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-white group-hover:text-cyan-400 transition">
            {brew.name}
          </h3>
          <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
            {brew.rating_count} Ratings
          </span>
        </div>

        {/* Mini Radar Chart Preview */}
        {brew.has_profiles && (
          <div className="relative h-24 mb-2">
            <MiniRadarChart profile={brew.taste_profile} />
          </div>
        )}

        {/* Top 3 Tags */}
        <div className="flex gap-2 flex-wrap">
          {brew.top_tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded"
            >
              {FLAVOR_TAGS.find((t) => t.id === tag)?.icon}{" "}
              {FLAVOR_TAGS.find((t) => t.id === tag)?.label}
            </span>
          ))}
        </div>

        <div className="mt-4 text-cyan-500 text-sm font-bold group-hover:text-cyan-400">
          Details ansehen →
        </div>
      </Link>
    ))}
  </div>
</div>;
```

---

## Phase 9: Long-Term Data Strategy & Predictive Analytics

### 9.0 Prerequisite: Data Normalization (CRITICAL)

**Problem**: AI/ML Modelle funktionieren nur mit sauberen Daten. Aktuell sind Zutaten oft Freitext ohne IDs (z.B. "Citra", "Citra US", "Hops: Citra").

**Lösung**: Bevor Phase 9.1 startet, muss eine Normalisierung stattfinden:

1.  **Strict Ingredient DB**: Einführung einer `ingredients` Tabelle mit festen IDs.
2.  **Mapping Script**: Matching bestehender JSON-Rezepte auf Ingredient-IDs.
3.  **UI Enforcement**: Recipe Editor muss Dropdowns statt Freitext nutzen.

**Warnung**: Ohne diesen Schritt produziert das ML-Modell nur "Garbage In, Garbage Out".

### 9.1 Datenbank-Architektur für ML

**Vision**: "Welche Zutaten führen zu welchen Geschmacksprofilen?"

**Neue Tabelle**: `brew_ingredient_profiles` (Materialized View)

```sql
CREATE MATERIALIZED VIEW brew_ingredient_profiles AS
SELECT
  b.id AS brew_id,
  b.style,
  b.recipe_data->>'abv' AS abv,
  b.recipe_data->>'ibu' AS ibu,

  -- Malz-Zusammensetzung (JSON aggregiert)
  jsonb_agg(DISTINCT jsonb_build_object(
    'name', m.name,
    'amount', m.amount,
    'color', m.color
  )) FILTER (WHERE m.name IS NOT NULL) AS malts,

  -- Hopfen-Zusammensetzung
  jsonb_agg(DISTINCT jsonb_build_object(
    'name', h.name,
    'amount', h.amount,
    'alpha', h.alpha_acid,
    'time', h.time
  )) FILTER (WHERE h.name IS NOT NULL) AS hops,

  -- Hefe
  b.recipe_data->'ingredients'->'yeast'->>'name' AS yeast,

  -- Geschmacksprofil (Durchschnitt aus Ratings)
  AVG(r.taste_bitterness) AS avg_bitterness,
  AVG(r.taste_sweetness) AS avg_sweetness,
  AVG(r.taste_body) AS avg_body,
  AVG(r.taste_carbonation) AS avg_carbonation,
  AVG(r.taste_acidity) AS avg_acidity,

  -- Häufigste Tags (Array)
  array_agg(DISTINCT tag) AS flavor_tags,

  COUNT(r.id) AS rating_count

FROM brews b
LEFT JOIN LATERAL jsonb_array_elements(b.recipe_data->'ingredients'->'malts') m ON true
LEFT JOIN LATERAL jsonb_array_elements(b.recipe_data->'ingredients'->'hops') h ON true
LEFT JOIN ratings r ON r.brew_id = b.id AND r.moderation_status = 'auto_approved'
LEFT JOIN LATERAL unnest(r.flavor_tags) tag ON true

WHERE r.taste_bitterness IS NOT NULL
GROUP BY b.id;

-- Refresh täglich via Cron
CREATE INDEX idx_brew_ingredient_profiles_style ON brew_ingredient_profiles(style);
CREATE INDEX idx_brew_ingredient_profiles_tags ON brew_ingredient_profiles USING GIN(flavor_tags);
```

**Nutzen**:

- Schnelle Queries für ML ohne Join-Hell
- Versioniert (Snapshot der Daten zu einem Zeitpunkt)

### 9.2 Pattern Recognition Queries

**Query 1**: "Welche Hopfen erzeugen Zitrus-Aromen?"

```sql
SELECT
  hop->>'name' AS hop_name,
  COUNT(*) AS occurrences,
  AVG((SELECT COUNT(*) FROM unnest(flavor_tags) WHERE unnest = 'citrus')) AS citrus_frequency
FROM brew_ingredient_profiles,
     jsonb_array_elements(hops) hop
WHERE 'citrus' = ANY(flavor_tags)
GROUP BY hop->>'name'
ORDER BY citrus_frequency DESC
LIMIT 10;

-- Ergebnis:
-- Citra: 85% der Brews mit Citra haben Citrus-Tag
-- Cascade: 72%
-- Amarillo: 68%
```

**Query 2**: "Welche Malz-Kombinationen führen zu hohem Körper?"

```sql
SELECT
  jsonb_agg(malt->>'name') AS malt_combo,
  AVG(avg_body) AS avg_body_score,
  COUNT(*) AS sample_size
FROM brew_ingredient_profiles,
     jsonb_array_elements(malts) malt
WHERE avg_body > 7.0
GROUP BY malts
HAVING COUNT(*) >= 5  -- Min. 5 Brews für Statistik
ORDER BY avg_body_score DESC
LIMIT 20;

-- Ergebnis:
-- [Munich, Caramalt, Wheat] → Body: 8.3
-- [Pilsner, Vienna, Carapils] → Body: 7.8
```

### 9.3 Predictive Model (API Endpoint)

**File**: `app/api/predict-profile/route.ts` (Neu)

```typescript
// Input: Rezept (Zutaten)
// Output: Vorhergesagtes Geschmacksprofil

export async function POST(request: Request) {
  const { malts, hops, yeast, abv, ibu } = await request.json();

  // Simplified ML: k-Nearest-Neighbors basierend auf ähnlichen Brews
  const { data: similar } = await supabase.rpc("find_similar_brews", {
    input_malts: malts.map((m) => m.name),
    input_hops: hops.map((h) => h.name),
    input_abv: abv,
    input_ibu: ibu,
    limit: 10,
  });

  // Durchschnitt der ähnlichen Brews = Prognose
  const prediction = {
    bitterness: avg(similar, "avg_bitterness"),
    sweetness: avg(similar, "avg_sweetness"),
    body: avg(similar, "avg_body"),
    carbonation: avg(similar, "avg_carbonation"),
    acidity: avg(similar, "avg_acidity"),
    predicted_tags: mostCommon(similar.flatMap((s) => s.flavor_tags)),
    confidence: calculateConfidence(similar),
    similar_brews: similar.map((s) => ({ name: s.name, similarity: s.score })),
  };

  return Response.json(prediction);
}
```

**PostgreSQL Function**: `find_similar_brews`

```sql
CREATE OR REPLACE FUNCTION find_similar_brews(
  input_malts TEXT[],
  input_hops TEXT[],
  input_abv NUMERIC,
  input_ibu NUMERIC,
  "limit" INT DEFAULT 10
)
RETURNS TABLE (
  brew_id UUID,
  name TEXT,
  avg_bitterness NUMERIC,
  avg_sweetness NUMERIC,
  avg_body NUMERIC,
  avg_carbonation NUMERIC,
  avg_acidity NUMERIC,
  flavor_tags TEXT[],
  score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bip.brew_id,
    b.name,
    bip.avg_bitterness,
    bip.avg_sweetness,
    bip.avg_body,
    bip.avg_carbonation,
    bip.avg_acidity,
    bip.flavor_tags,
    -- Similarity Score (Jaccard Index für Zutaten + ABV/IBU Delta)
    (
      (SELECT COUNT(*) FROM unnest(input_malts) WHERE unnest = ANY(
        SELECT jsonb_array_elements_text(bip.malts)->'name'
      )) / GREATEST(array_length(input_malts, 1), 1)::NUMERIC
      +
      (SELECT COUNT(*) FROM unnest(input_hops) WHERE unnest = ANY(
        SELECT jsonb_array_elements_text(bip.hops)->'name'
      )) / GREATEST(array_length(input_hops, 1), 1)::NUMERIC
      -
      ABS(input_abv - bip.abv::NUMERIC) / 10.0  -- Normalisiert
      -
      ABS(input_ibu - bip.ibu::NUMERIC) / 100.0
    ) AS score
  FROM brew_ingredient_profiles bip
  JOIN brews b ON b.id = bip.brew_id
  WHERE bip.rating_count >= 3  -- Min. 3 Ratings für valide Daten
  ORDER BY score DESC
  LIMIT "limit";
END;
$$ LANGUAGE plpgsql;
```

### 9.4 UI Integration: "Prognose ansehen"

**File**: `app/team/[breweryId]/brews/components/BrewEditor.tsx` (Ergänzen)

**Neuer Button neben "Speichern"**:

```tsx
<button
  onClick={async () => {
    const prediction = await fetch("/api/predict-profile", {
      method: "POST",
      body: JSON.stringify({
        malts: recipeData.ingredients.malts,
        hops: recipeData.ingredients.hops,
        yeast: recipeData.ingredients.yeast,
        abv: recipeData.abv,
        ibu: recipeData.ibu,
      }),
    }).then((r) => r.json());

    setPrediction(prediction);
    setShowPredictionModal(true);
  }}
  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold"
>
  🔮 Geschmack vorhersagen
</button>;

{
  /* Modal */
}
{
  showPredictionModal && (
    <div className="modal">
      <h3>Vorhergesagtes Geschmacksprofil</h3>
      <TasteRadarChart profile={prediction} />
      <div className="mt-4">
        <h4>Ähnliche Biere:</h4>
        <ul>
          {prediction.similar_brews.map((b) => (
            <li key={b.name}>
              {b.name} ({Math.round(b.similarity * 100)}% ähnlich)
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-zinc-500">
        Basierend auf {prediction.similar_brews.length} ähnlichen Rezepten.
        Konfidenz: {prediction.confidence}%
      </p>
    </div>
  );
}
```

**Use Case**:
Brauer gibt Rezept ein → Klickt "Geschmack vorhersagen" → Sieht Pentagon BEVOR er braut → Kann anpassen

### 9.5 Advanced Analytics: Community Benchmarks

**Feature**: "Wie schneidet mein IPA im Vergleich zu anderen IPAs ab?"

**File**: `app/team/[breweryId]/analytics/brew/[brewId]/page.tsx` (Ergänzen)

```tsx
const benchmarks = await getBenchmarks(brew.style, brew.id);

<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
  <h3 className="text-xl font-bold text-white mb-4">Community-Vergleich</h3>
  <p className="text-zinc-400 text-sm mb-6">
    So schneidet dein {brew.style} im Vergleich zu {benchmarks.sample_size}{" "}
    anderen {brew.style}s auf BotlLab ab:
  </p>

  <div className="space-y-4">
    {Object.entries(benchmarks.comparison).map(([attr, data]) => (
      <div key={attr}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-zinc-400">{LABEL_MAP[attr]}</span>
          <span className="text-white font-mono">
            Dein Wert: {data.your_value} | Durchschnitt: {data.avg}
          </span>
        </div>
        <div className="relative h-8 bg-zinc-950 rounded-full overflow-hidden">
          {/* Durchschnitt-Marker */}
          <div
            className="absolute top-0 w-0.5 h-full bg-zinc-600"
            style={{ left: `${(data.avg / 10) * 100}%` }}
          />
          {/* Dein Wert */}
          <div
            className="absolute top-0 h-full bg-cyan-500 rounded-full"
            style={{ width: `${(data.your_value / 10) * 100}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {data.your_value > data.avg + 1 &&
            `Überdurchschnittlich ${attr} (+${(data.your_value - data.avg).toFixed(1)})`}
          {data.your_value < data.avg - 1 &&
            `Unter dem Durchschnitt (${(data.your_value - data.avg).toFixed(1)})`}
          {Math.abs(data.your_value - data.avg) <= 1 &&
            "Im Durchschnittsbereich"}
        </div>
      </div>
    ))}
  </div>
</div>;
```

### 9.6 Data Export für externe ML-Tools

**Feature**: CSV/JSON Export der anonymisierten Daten für eigene Analysen

**File**: `app/api/analytics/export/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const breweryId = searchParams.get("brewery_id");
  const format = searchParams.get("format") || "json"; // json | csv

  // Anonymisiert: Keine Namen, nur aggregierte Daten
  const { data } = await supabase
    .from("brew_ingredient_profiles")
    .select("*")
    .eq("brewery_id", breweryId);

  if (format === "csv") {
    const csv = jsonToCsv(data);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="botllab_export.csv"',
      },
    });
  }

  return Response.json(data);
}
```

---

## Updated Timeline

| Phase                          | Tasks                                           | Duration    | Notes                                         |
| ------------------------------ | ----------------------------------------------- | ----------- | --------------------------------------------- |
| **Phase 1-6**                  | Rating System 2.0 MVP                           | 14 Tage     | Slider, Tags, UI, Analytics Basics            |
| **Phase 5.3**                  | Gamification: Rating-to-Cap Flow                | +2 Tage     | Modal, API, Login Context, Achievements       |
| **Phase 8**                    | Analytics Dashboard Expansion                   | 4 Tage      | Per-Brew Pages, Histogramme, Timeline         |
| **Phase 9.1-9.3**              | ML Foundation (Materialized View + Predict API) | 3 Tage      | PostgreSQL Functions                          |
| **Phase 9.4**                  | Prognose-UI im BrewEditor                       | 2 Tage      | Integration                                   |
| **Phase 9.5**                  | Community Benchmarks                            | 2 Tage      | Vergleichs-Logic                              |
| **Phase 9.6**                  | Data Export                                     | 1 Tag       | CSV/JSON                                      |
| **Total (MVP + Gamification)** | **Priority System**                             | **16 Tage** | 3 Wochen Vollzeit (ohne ML)                   |
| **Total (with ML)**            | **Full System**                                 | **28 Tage** | 5-6 Wochen Vollzeit (mit Predictive Features) |

**Empfehlung**: Phase 1-6 + 5.3 (16 Tage) zuerst implementieren → Live schalten → Daten sammeln → Dann Phase 8-9 (ML) mit echten Daten trainieren.

---

## Open Questions

1. **Privacy**: Sollten Geschmacksprofile auch anonym sein (ohne Name-Zuordnung in Analytics)?
   - **Vorschlag**: Ja, Aggregation zeigt keine individuellen Profile
2. **Moderation**: ~~Brauchen wir Moderation für Flavor Tags?~~
   - **GEKLÄRT**: Nein für Tags, JA für Comment-Feld (bleibt bestehen)
3. **Gamification**: Achievement für "10 detaillierte Bewertungen abgegeben"?
   - **Vorschlag**: Ja, incentiviert Quality Feedback

4. **Notification**: Soll Brewer benachrichtigt werden, wenn ein Geschmacksprofil erstellt wurde?
   - **Vorschlag**: Ja, aber gruppiert (max 1x/Tag)

5. **ML Confidence Threshold**: Ab welcher Sample-Size zeigen wir Prognosen?
   - **Vorschlag**: Min. 10 ähnliche Brews in DB, sonst "Nicht genug Daten"

6. **Community Benchmarks**: Nur innerhalb der eigenen Brauerei oder global?
   - **Vorschlag**: Beides als Toggle ("Vergleiche mit: [ ] Meinem Team [ ] Allen BotlLab-Brauern")

---

## Resources & References

- **Beer Flavor Wheel**: BJCP Flavor Wheel als Inspiration für Tag-Kategorien
- **Sensory Science**: ISO 5492 Standard für sensorische Analyse
- **UX Patterns**: Progressive Disclosure, Multi-Step Forms
- **Visualization**: D3.js Radar Chart Examples (simplified for our use)

---

## Conclusion

Dieses System transformiert BotlLab von einem simplen "Daumen hoch/runter" Tool zu einer **wissenschaftlich fundierten Feedback-Plattform**, die Hobbybrauern echte Insights liefert, ohne Laien zu überfordern.

**Key Wins**:

- ✅ Strukturierte Daten für Analyse
- ✅ Niedrige Einstiegshürde (Quick Rating bleibt)
- ✅ Visuelle Feedback-Widgets für Brauer
- ✅ Skalierbar für zukünftige AI/ML Features

**Next Steps**: Review mit Team → Priorisierung → Start Phase 1 Migration
