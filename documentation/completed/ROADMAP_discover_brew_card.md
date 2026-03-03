# ROADMAP: DiscoverBrewCard Redesign

**Datei:** `app/components/DiscoverBrewCard.tsx`  
**Ziel:** Neue visuelle Gestaltung ohne Funktionsverlust. Diese Datei dokumentiert zunächst vollständig den Status Quo, damit beim Redesign keine einzige Funktion verloren geht.

---

## Status Quo — 21. Februar 2026

### Übersicht

Die Komponente hat zwei Varianten (`variant?: 'hero' | 'default'`), die aus `DiscoverClient.tsx` heraus aufgerufen werden. Beide Varianten teilen sich dieselbe Datenbasis und Logik-Schicht, unterscheiden sich aber im Layout.

---

### Interface — Alle Datenfelder

```ts
interface DiscoverBrew {
  id: string; // → Link-Ziel /brew/{id}
  name: string; // Rezeptname
  style?: string | null; // Bierstil (z.B. "IPA", "Saison")
  image_url?: string | null; // Rezeptbild-URL
  created_at: string; // ISO-Timestamp für Altersberechnung
  abv?: number; // Alkoholgehalt in %
  ibu?: number; // Bitterkeit
  ebc?: number; // Farbe (EBC-Zahl → Hex-Farbe via ebcToHex())
  original_gravity?: number; // Stammwürze in °Plato
  ratings?: { rating: number }[]; // Array der Einzelbewertungen → avgRating
  likes_count?: number; // Gesamtzahl Likes
  user_has_liked?: boolean; // Hat der aktuelle User geliked?
  brewery?: {
    id?: string;
    name: string;
    team_name?: string; // Wird gegenüber name bevorzugt
    logo_url?: string | null;
  };
  quality_score?: number; // 0–100, nur im Admin-Modus anzeigen
  copy_count?: number; // Wie oft wurde das Rezept kopiert/geclont
  data?: any; // Enthält malts[], hops[], mash_steps[] für Komplexitäts-Berechnung
}
```

### Props

```ts
interface Props {
  brew: DiscoverBrew;
  currentUserId?: string; // Wenn vorhanden → Like-Button ist interaktiv
  isAdmin?: boolean; // Wenn true → Quality Score Badge sichtbar
  variant?: "hero" | "default";
  rank?: number; // Nur hero: Position im Trending-Ranking (1, 2, 3, …)
}
```

---

### Berechnete Werte (Logik-Schicht — DARF NICHT VERLOREN GEHEN)

| Variable        | Berechnung                                                                                                                                         | Verwendung              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `avgRating`     | Durchschnitt aller `ratings[].rating`, auf 1 Dezimalstelle gerundet                                                                                | Stern-Badge             |
| `ebcColor`      | `ebcToHex(brew.ebc)` → CSS-Hex-Farbe                                                                                                               | Farbpunkt im Stats-Chip |
| `colorLabel`    | EBC → Textkategorie: `<10`= Sehr hell, `<20`= Hell, `<40`= Bernstein, `<70`= Dunkel, sonst Sehr dunkel                                             | Flavor-Text             |
| `bitterLabel`   | IBU → Textkategorie: `<15`= mild, `<30`= ausgewogen, `<50`= hopfig, sonst sehr hopfig                                                              | Flavor-Text             |
| `maltCount`     | `brew.data?.malts.length`                                                                                                                          | Komplexität             |
| `hopCount`      | `brew.data?.hops.length`                                                                                                                           | Komplexität             |
| `mashStepCount` | `brew.data?.mash_steps.length` (default 1)                                                                                                         | Komplexität             |
| `complexity`    | `null` wenn keine Zutaten; `'complex'` wenn malts>6 oder mashSteps≥3; `'intermediate'` wenn malts≥4 oder hops≥3 oder mashSteps≥2; sonst `'simple'` | Komplexitäts-Badge      |
| `ageLabel`      | `formatDistanceToNow(created_at, { addSuffix: true, locale: de })`                                                                                 | Alters-Label            |

### Komplexitäts-Label-Mapping

| Wert           | Label                | Farbe             |
| -------------- | -------------------- | ----------------- |
| `simple`       | `● Einsteiger`       | `text-green-400`  |
| `intermediate` | `●● Fortgeschritten` | `text-yellow-400` |
| `complex`      | `●●● Experte`        | `text-orange-400` |

---

### Like-Logik (MUSS ERHALTEN BLEIBEN — optimistisches Update)

1. User klickt Like → `e.preventDefault()` + `e.stopPropagation()` (verhindert Navigation)
2. Sofort: `isLiked` togglen, `likeCount` ±1 (optimistisch)
3. `await toggleBrewLike(brew.id)` (Server Action)
4. Bei Fehler: Rollback auf vorherige Werte
5. `useEffect` synct `isLiked` und `likeCount` wenn der Parent neue Props liefert (async Like-State-Load nach Mount)
6. Wenn `!currentUserId` → Like-Button ist vorhanden aber tut nichts (kein Login-Redirect)

---

### Dargestellte UI-Elemente — Status Quo

#### Beide Varianten gemeinsam

| Element                 | Bedingung                                    | Inhalt                                                   |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------- |
| **Bild**                | immer                                        | `brew.image_url` oder Fallback-Hintergrund               |
| **Style-Badge**         | wenn `brew.style` vorhanden                  | Text: Bierstil                                           |
| **Brauerei**            | wenn `brew.brewery` vorhanden                | Optional: Logo (14×14px Kreis) + Name (team_name > name) |
| **Rezeptname**          | immer                                        | `brew.name`, hover → Text-Farbwechsel                    |
| **EBC-Chip**            | wenn `brew.ebc != null`                      | Farbiger Punkt + Zahl                                    |
| **°P-Chip**             | wenn `brew.original_gravity != null`         | Zahl + "°P"                                              |
| **IBU-Chip**            | wenn `brew.ibu != null`                      | Zahl + " IBU"                                            |
| **ABV-Chip**            | wenn `brew.abv != null`                      | Zahl + "%" — cyan hervorgehoben                          |
| **Flavor-Text**         | wenn `colorLabel` oder `bitterLabel`         | z.B. "Sehr hell · ausgewogen · 7.6 % Alk."               |
| **Bewertung**           | wenn `avgRating` vorhanden                   | Stern + Zahl (gelb)                                      |
| **Like-Button**         | immer                                        | Herz + Zahl (wenn >0); rot wenn geliked                  |
| **Alters-Label**        | wenn `created_at` parsebar                   | z.B. "vor etwa 6 Stunden"                                |
| **Komplexitäts-Badge**  | wenn `data.malts` oder `data.hops` vorhanden | ●/●●/●●● + Label + Farbe                                 |
| **Copy-Count**          | wenn `copy_count > 0`                        | "🔁 N×"                                                  |
| **Admin Quality Score** | wenn `isAdmin === true`                      | "Q:N" — violet                                           |

#### Nur hero-Variante

| Element                       | Bedingung      | Inhalt                              |
| ----------------------------- | -------------- | ----------------------------------- |
| **Trending-Badge**            | immer bei hero | 🔥 "#1 Trending" (rank=1) oder "#N" |
| **Bild füllt oberen Bereich** | immer          | `object-cover`, Hover: scale-105    |

#### Nur default-Variante

| Element                   | Bedingung                  | Inhalt                                 |
| ------------------------- | -------------------------- | -------------------------------------- |
| **Rating-Badge auf Bild** | wenn `avgRating` vorhanden | Stern + Zahl, oben rechts auf dem Bild |
| **Like-Button auf Bild**  | immer                      | unten rechts auf dem Bild              |
| **Bild in aspect-[4/3]**  | immer                      | Querformat, 260px breit                |

---

### Layout-Regeln (einzuhalten beim Redesign)

> ⚠️ **KOMPLETT SINNLOS — MUSS ÜBERARBEITET WERDEN**  
> Die aktuellen Layout-Regeln basieren auf dem gescheiterten Höhen-Ansatz (feste px-Werte, h-full, items-stretch).  
> Beim Redesign werden neue Layout-Regeln definiert, die tatsächlich funktionieren.

| #   | Regel                                                                                                                             | Status                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Link-Ziel ist immer `/brew/{id}` — NICHT `/b/{id}`                                                                                | ✅ Behalten                                   |
| 2   | `e.preventDefault()` + `e.stopPropagation()` auf Like-Button (innerhalb des Links)                                                | ✅ Behalten                                   |
| 3   | Hero-Karte bekommt `h-full` → Höhe kommt vom Parent-Wrapper (feste `height: 340px`)                                               | ❌ Funktioniert nicht — neu definieren        |
| 4   | Default-Karte bekommt `h-full` → Höhe kommt vom Parent-Wrapper (feste `height: 340px`)                                            | ❌ Funktioniert nicht — neu definieren        |
| 5   | Beide Wrapper in DiscoverClient: `style={{ width: 460, height: 340 }}` (hero) und `style={{ width: 260, height: 340 }}` (default) | ❌ Führt zu ungleichen Höhen — neu definieren |
| 6   | `useEffect` zur Prop-Synchronisation MUSS erhalten bleiben (async Like-State nach Mount)                                          | ✅ Behalten                                   |
| 7   | Fallback-Hintergrund wenn kein Bild vorhanden                                                                                     | ✅ Behalten                                   |

---

### Verwendungsstellen in DiscoverClient.tsx

| Sektion                             | Variante  | `rank`  | `isAdmin` |
| ----------------------------------- | --------- | ------- | --------- |
| Section-Komponente: erster Item     | `hero`    | —       | ✓         |
| Section-Komponente: restliche Items | `default` | —       | ✓         |
| Trending: erstes Item               | `hero`    | `1`     | ✓         |
| Trending: restliche Items           | `default` | `i + 1` | ✓         |
| Filter-Ergebnisse (Grid)            | `default` | —       | ✓         |
| Suchvorschläge / Suggestions        | `default` | —       | ✓         |

---

## Redesign-Plan: Multi-Variant Card System

> **Konzept:** Statt eines einzigen Card-Designs werden vier spezialisierte Varianten eingeführt.  
> Jede Sektion der Discover-Page bekommt das Format, das ihrem Kontext am besten entspricht.

---

### Die vier Varianten im Überblick

| Variante    | Neu             | Format                  | Bild                            | Breite | Einsatz                   |
| ----------- | --------------- | ----------------------- | ------------------------------- | ------ | ------------------------- |
| `hero`      | ♻️ überarbeiten | Querformat, cinematic   | Vollbild mit Overlay-Panel      | 460px  | 1× ganz links per Sektion |
| `portrait`  | 🆕 neu          | Hochformat              | Oberes 2/3, festes Aspect-Ratio | 200px  | Scroll-Rows (Standard)    |
| `editorial` | 🆕 neu          | Querformat, zweispaltig | Links 40%, Text rechts 60%      | 420px  | "Am besten bewertet"      |
| `compact`   | 🆕 neu          | Nur Text, kein Bild     | —                               | 100%   | Filter-Ergebnisse, Suche  |

---

### Variant-Spezifikationen

#### `hero` — Cinematic Card (überarbeiten)

- **Ziel:** Große Aufmerksamkeit, erster Blick auf eine Sektion
- **Layout:** Bild füllt die gesamte Karte; opakes Info-Panel fest am unteren Rand
- **Bild:** `object-cover`, Hover: leichtes `scale-105`
- **Panel:** `bg-zinc-900` (keine Transparenz), enthält: Brauerei + Rating + Like, Titel, Stats-Chips
- **Badges auf Bild:** Style-Badge oben links, Trending-Badge oben rechts
- **Höhe:** Feste Pixel-Höhe, identisch mit `portrait` in der gleichen Row (NEW: nicht mehr 340px hardcoded — Wert wird in Phase 1 festgelegt)
- **Breite:** 460px

#### `portrait` — Standard Card (neu)

- **Ziel:** Schnelles Scannen vieler Rezepte
- **Layout:** Bild oben (Aspect-Ratio `2:3`), Infobereich unten
- **Bild:** `aspect-[2/3]`, feste Breite 200px → Bildhöhe = 300px
- **Infobereich:** Brauerei, Titel (2 Zeilen max), ABV + EBC + IBU Chips, Like + Bewertung
- **Kein Flavor-Text** (zu wenig Platz)
- **Breite:** 200px

#### `editorial` — Side-by-Side Card (neu)

- **Ziel:** Mehr Lesetiefe, "redaktioneller" Look für die Top-Rated Sektion
- **Layout:** Horizontal zweigeteilt — links Bild (40%), rechts Textblock (60%)
- **Bild:** `object-cover`, volle Höhe der Karte, abgerundete linke Ecken
- **Textblock:** Brauerei (mit Logo), Titel (3 Zeilen max), Flavor-Text, alle Stats-Chips, Kompexität, Like + Rating + Alters-Label
- **Höhe:** Feste Höhe (z.B. 160px) — kompakt, kann gestackt werden
- **Breite:** 420px (oder 100% im Container)
- **Variante eignet sich für vertikale Listen, nicht für horizontales Scrollen**

#### `compact` — Text-only Card (neu)

- **Ziel:** Schnelle Ergebnisliste ohne Ablenkung durch Bilder
- **Layout:** Einzeilig oder zweizeilig, kein Bild
- **Inhalt:** Brauerei-Logo (Mini) + Rezeptname + Style-Badge + ABV + Rating + Like
- **Verwendung:** Suchergebnisse, aktive Filter-Ansicht, Suggestions-Dropdown
- **Breite:** 100% (passt sich dem Container an)
- **Hover:** Hintergrund-Highlight

---

### Sektion-zu-Variante-Mapping

| Sektion in DiscoverClient          | Bisherige Varianten           | Neue Varianten                 |
| ---------------------------------- | ----------------------------- | ------------------------------ |
| **Empfohlen** (Section-Komponente) | `hero` + `default` Scroll-Row | `hero` + `portrait` Scroll-Row |
| **Trending**                       | `hero` + `default` Scroll-Row | `hero` + `portrait` Scroll-Row |
| **Am besten bewertet**             | `default` Grid                | `editorial` vertikale Liste    |
| **Neuheiten**                      | `default` Scroll-Row          | `portrait` Scroll-Row          |
| **Filter-Ergebnisse**              | `default` Grid                | `compact` Liste                |
| **Suchvorschläge**                 | `default`                     | `compact`                      |

---

### Gliederung der /discover Page — Neues Layout

> **Vorlage:** Travel-Website Wireframe mit Hero-Banner, horizontalen Scroll-Rows und redaktioneller "Latest Stories"-Sektion.  
> **Ziel:** Die /discover Page folgt derselben visuellen Hierarchie: Orientierung → Entdecken → Lesen → Alle erkunden.

---

#### Desktop-Layout (top → bottom)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PAGE HEADER                                                        │
│  "Finde neue Kreationen"   [Beschreibung]                           │
│  Kein Card-Einsatz — reiner Text-Header                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  SEKTION: "Gerade angesagt" 🔥                                      │
│  ┌──────────────────────┐  ┌───────┐ ┌───────┐ ┌───────┐ ┌───    │
│  │                      │  │       │ │       │ │       │ │       │
│  │   hero (460px)       │  │ port. │ │ port. │ │ port. │ │  →   │
│  │   cinematic fullbld  │  │ 200px │ │ 200px │ │ 200px │ │       │
│  │                      │  │       │ │       │ │       │ │       │
│  └──────────────────────┘  └───────┘ └───────┘ └───────┘ └───    │
│  ← Feste Höhe: hero und portrait auf gleicher Höhe →               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  SEKTION: "Empfohlen" ✓ (nur wenn Admin Featured Brews gesetzt)    │
│  ┌──────────────────────┐  ┌───────┐ ┌───────┐ ┌───────┐ ┌───    │
│  │   hero (460px)       │  │ port. │ │ port. │ │ port. │ │  →   │
│  └──────────────────────┘  └───────┘ └───────┘ └───────┘ └───    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  SEKTION: "Am besten bewertet" ★  ← "Latest Stories"-Pattern      │
│  ┌──────────────────────┐  ┌─────────────────────────────────────┐ │
│  │                      │  │  editorial (420px)                  │ │
│  │   hero (460px)       │  ├─────────────────────────────────────┤ │
│  │   großes Featured    │  │  editorial (420px)                  │ │
│  │   Rezept             │  ├─────────────────────────────────────┤ │
│  │                      │  │  editorial (420px)                  │ │
│  └──────────────────────┘  └─────────────────────────────────────┘ │
│  ← hero links, gestapelte editorial-Liste rechts (kein Scroll) →   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  SEKTION: "Neuheiten" ✨                                            │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───         │
│  │ port. │ │ port. │ │ port. │ │ port. │ │ port. │ │  →         │
│  │ 200px │ │ 200px │ │ 200px │ │ 200px │ │ 200px │ │            │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───         │
│  ← Reine portrait-Row ohne hero (kein Featured nötig) →            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  CTA: "Alle Rezepte durchsuchen"  [Filter-Button]                  │
│  "N+ Rezepte in der Community"                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ALLE REZEPTE / FILTER-ERGEBNISSE (wird nach CTA-Klick eingeblendet)│
│  ┌───────────────────────────────┐                                  │
│  │  compact (100% Breite)        │                                  │
│  ├───────────────────────────────┤                                  │
│  │  compact (100% Breite)        │                                  │
│  ├───────────────────────────────┤                                  │
│  │  compact (100% Breite)        │                                  │
│  └───────────────────────────────┘                                  │
│  ← vertikale Liste, kein Grid, kein Bild →                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### Mobile-Layout — Unterschiede

| Sektion                | Desktop                             | Mobile                                                |
| ---------------------- | ----------------------------------- | ----------------------------------------------------- |
| **Gerade angesagt**    | hero links + portrait scroll rechts | Nur portrait horizontal scroll (hero ausgeblendet)    |
| **Empfohlen**          | hero links + portrait scroll rechts | Nur portrait horizontal scroll                        |
| **Am besten bewertet** | hero links + editorial-Stack rechts | hero oben + editorial-Stack darunter (stacked column) |
| **Neuheiten**          | portrait horizontal scroll          | portrait horizontal scroll (identisch)                |
| **Filter-Ergebnisse**  | compact Liste                       | compact Liste (identisch)                             |

> **Regel:** `hero`-Karte ist auf Mobile immer `hidden md:block` — sie erscheint im Mobile-Scroll mit als `portrait`.

---

#### Wireframe-Mapping (Screenshot → BotlLab)

| Travel-Wireframe Sektion                   | BotlLab Äquivalent               | Karten-Variante      |
| ------------------------------------------ | -------------------------------- | -------------------- |
| Hero Banner (Text + Bild-Collage)          | Page Header `<header>`           | kein Card            |
| Top Destinations (Filter + Scroll)         | Gerade angesagt + Empfohlen      | `hero` + `portrait`  |
| Latest Stories (groß links + Stack rechts) | Am besten bewertet               | `hero` + `editorial` |
| Trekker's Highlights (Review + Video)      | Neuheiten                        | `portrait`           |
| Alle anzeigen → Grid                       | Filter-Ergebnisse / Alle Rezepte | `compact`            |

---

### Props-Erweiterung

Der `variant`-Typ wird erweitert:

```ts
// Vorher:
variant?: 'hero' | 'default'

// Nachher:
variant?: 'hero' | 'portrait' | 'editorial' | 'compact'
```

Alle anderen Props (`brew`, `currentUserId`, `isAdmin`, `rank`) bleiben unverändert.

---

### Implementierungs-Phasen

#### Phase 1 — `editorial` implementieren ⬅️ START HIER

- [ ] Neue `editorial`-Variante in `DiscoverBrewCard.tsx` hinzufügen
- [ ] Höhe auf 160px festlegen (inline style im Parent-Wrapper)
- [ ] "Am besten bewertet"-Sektion in `DiscoverClient.tsx` auf `editorial` + vertikale Liste umstellen
- [ ] Alle Logik-Funktionen (Like, Badges, Stats) übernehmen
- [ ] Testen: Sieht das Bild korrekt aus? Textblock nicht abgeschnitten?

#### Phase 2 — `portrait` implementieren

- [ ] `portrait`-Variante in `DiscoverBrewCard.tsx` hinzufügen
- [ ] Aspect-Ratio `2:3`, Breite 200px
- [ ] Alle Scroll-Rows (Empfohlen, Trending, Neuheiten) auf `portrait` umstellen
- [ ] `hero` und `portrait` in der gleichen Row: Höhe angleichen

#### Phase 3 — `hero` überarbeiten

- [ ] Hero-Karte so anpassen, dass die Höhe exakt mit `portrait`-Karten übereinstimmt
- [ ] Cinematic Vollbild-Look beibehalten (kein split-layout!)
- [ ] Trending-Badge-Position prüfen
- [ ] Höhenproblem ein für alle Mal lösen: feste `height` auf dem Image-Bereich, nicht auf der ganzen Karte

#### Phase 4 — `compact` implementieren

- [ ] `compact`-Variante in `DiscoverBrewCard.tsx` hinzufügen
- [ ] Filter-Ergebnisse und Suchvorschläge in `DiscoverClient.tsx` umstellen
- [ ] Mobile-Ansicht prüfen

#### Phase 5 — Cleanup

- [ ] Alte `default`-Variante entfernen (wird durch `portrait` + `compact` ersetzt)
- [ ] `DiscoverClient.tsx` aufräumen (keine festen px-Wrapper mehr nötig)
- [ ] Roadmap als abgeschlossen markieren

---

### Akzeptanzkriterien

- [ ] Alle vier Varianten zeigen dieselben Daten (kein Datenverlust)
- [ ] Like-Logik funktioniert in allen Varianten
- [ ] `hero` und `portrait` in einer Row haben identische Höhe
- [ ] `editorial`-Karten können gestackt werden ohne Layout-Probleme
- [ ] `compact` funktioniert in 100%-Breite-Containern
- [ ] Kein Layout-Shift beim Laden (Bilder haben definierte Dimensionen)
- [ ] Mobile-Ansicht geprüft für alle Varianten

---

## Abhängigkeiten

| Import                                          | Zweck                     |
| ----------------------------------------------- | ------------------------- |
| `date-fns` → `formatDistanceToNow`              | Alters-Label auf Deutsch  |
| `date-fns/locale` → `de`                        | Deutsche Locale           |
| `@/lib/brewing-calculations` → `ebcToHex`       | EBC-Zahl → Hex-Farbe      |
| `@/lib/actions/like-actions` → `toggleBrewLike` | Like/Unlike Server Action |
| `lucide-react` → `Flame, Heart, Star`           | Icons                     |
