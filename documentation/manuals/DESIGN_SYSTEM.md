ja# BotlLab Design System — Vollständiges Handbuch

> **Version**: 2.0 — März 2026  
> **Referenz-Seiten**: `/discover`, `/brew/[id]`, `/brewer/[id]`  
> **Technologie**: Next.js App Router, Tailwind CSS v4, CSS Custom Properties  
> **Theming**: Dark Mode (Default), Light Mode (invertiert), System-Präferenz  

---

## Inhaltsverzeichnis

1. [Architektur & Token-System](#1-architektur--token-system)
2. [Farbpalette](#2-farbpalette)
3. [Typografie](#3-typografie)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border & Radius](#5-border--radius)
6. [Schatten & Tiefe](#6-schatten--tiefe)
7. [Buttons](#7-buttons)
8. [Cards](#8-cards)
9. [Badges](#9-badges)
10. [Navigation & Header](#10-navigation--header)
11. [Tabs](#11-tabs)
12. [Formulare & Inputs](#12-formulare--inputs)
13. [Avatare](#13-avatare)
14. [Modals & Sheets](#14-modals--sheets)
15. [Empty States](#15-empty-states)
16. [Animationen & Transitions](#16-animationen--transitions)
17. [Icons](#17-icons)
18. [Seitenstruktur-Templates](#18-seitenstruktur-templates)
19. [Responsive Breakpoints](#19-responsive-breakpoints)
20. [Dark/Light Mode Implementation](#20-darklight-mode-implementation)
21. [Do's & Don'ts](#21-dos--donts)

---

## 1. Architektur & Token-System

### Drei-Schichten-Modell

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: COMPONENTS                                     │
│  Card, Button, Badge, Header — referenzieren nur Tokens  │
├─────────────────────────────────────────────────────────┤
│  Layer 2: SEMANTIC TOKENS                                │
│  --surface, --text-primary, --accent — Bedeutung         │
├─────────────────────────────────────────────────────────┤
│  Layer 1: PRIMITIVES                                     │
│  zinc-950, cyan-500, orange-400 — Rohwerte               │
└─────────────────────────────────────────────────────────┘
```

**Regel**: Komponenten dürfen **niemals** direkt auf Primitive (z.B. `bg-zinc-950`) zugreifen. Sie verwenden ausschließlich semantische Tokens (z.B. `bg-background`, `text-foreground`).

> **Aktueller Stand**: Der Code verwendet noch überwiegend Primitive direkt. Die Migration auf Tokens ist Teil des Rollouts. Section 20 beschreibt die Implementation.

### Bestehende Token-Infrastruktur (globals.css)

```css
:root {
  --background: var(--color-zinc-950);
  --foreground: var(--color-zinc-100);
  --brand: var(--color-cyan-500);
  --brand-dim: var(--color-cyan-900);
  --surface: var(--color-zinc-900);
  --surface-hover: var(--color-zinc-800);
  --border: var(--color-zinc-800);
}
```

Diese Token-Basis muss erweitert werden (siehe Section 20).

---

## 2. Farbpalette

### 2.1 Primitives — Vollständiges Inventar

> Alle Tailwind-Farbwerte die aktuell im Code vorkommen.

#### Neutrals (Zinc-Skala)

| Primitive        | Hex       | Verwendung (Dark Mode)                                  |
|:-----------------|:----------|:--------------------------------------------------------|
| `zinc-950`       | `#09090b` | Page Background, tiefste Ebene                          |
| `black`          | `#000000` | Overlays, Gradient-Endpunkte                            |
| `zinc-900`       | `#18181b` | Surface (Cards, Panels, Inputs)                         |
| `zinc-800`       | `#27272a` | Surface Hover, Borders, Dividers                        |
| `zinc-700`       | `#3f3f46` | Sekundäre Borders, Active States                        |
| `zinc-600`       | `#52525b` | Tertiäre Borders, Disabled Text                         |
| `zinc-500`       | `#71717a` | Muted Text, Inactive Icons                              |
| `zinc-400`       | `#a1a1aa` | Sekundärer Text, Meta-Informationen                      |
| `zinc-300`       | `#d4d4d8` | Body Text                                               |
| `zinc-200`       | `#e4e4e7` | Betonter Sekundärtext                                    |
| `zinc-100`       | `#f4f4f5` | Foreground (Heading-Text)                               |
| `white`          | `#ffffff` | Akzent-Text auf dunklem BG, CTA-Buttons                 |

#### Brand & Akzent

| Primitive        | Hex       | Rolle                                                    |
|:-----------------|:----------|:---------------------------------------------------------|
| `cyan-500`       | `#06b6d4` | **Primärer Brand** — Links, Active Tabs, Primary CTA     |
| `cyan-400`       | `#22d3ee` | Brand Hover, aktive Text-Links                           |
| `cyan-300`       | `#67e8f9` | Helle Brand-Akzente, Highlights                          |
| `cyan-600`       | `#0891b2` | Gedämpfter Brand-Text                                    |
| `cyan-900`       | `#164e63` | Brand Dim, Tag-Borders                                   |
| `cyan-950`       | `#083344` | Brand Background (Badges, Active Tab BG)                 |

#### Signalfarben

| Primitive         | Hex       | Zweck                                                   |
|:------------------|:----------|:--------------------------------------------------------|
| `orange-400`      | `#fb923c` | Sekundärer Akzent, Komplexitäts-Badges                   |
| `orange-500`      | `#f97316` | Stärkerer Akzent                                         |
| `orange-950`      | `#431407` | Orange BG (Badges)                                       |
| `amber-400`       | `#fbbf24` | Sterne/Ratings                                           |
| `amber-500`       | `#f59e0b` | Rating-Highlight                                         |
| `amber-950`       | `#451a03` | Amber BG (Tags)                                          |
| `red-400`         | `#f87171` | Fehler, Destructive Actions, "Liked"-State               |
| `red-500`         | `#ef4444` | Fehler-Border, Like-Herz gefüllt                         |
| `green-400`       | `#4ade80` | Erfolg, "Einsteiger"-Level                               |
| `emerald-500`     | `#10b981` | Verified/Proven Badge                                    |
| `yellow-400`      | `#facc15` | Warnung, "Featured"-Badges                               |
| `yellow-500`      | `#eab308` | Warning Border                                           |
| `purple-400`      | `#c084fc` | Tertiärer Akzent, Remix/Remix-Badges                     |
| `purple-300`      | `#d8b4fe` | Purple Hover                                             |
| `purple-900`      | `#581c87` | Purple Dim BG                                            |
| `blue-400`        | `#60a5fa` | Info-Text (selten)                                       |

### 2.2 Semantische Farb-Tokens

> **Dies ist die autoritative Token-Zuordnung.** Alle Komponenten sollen auf diese Tokens migriert werden.

| Token                      | Dark Mode                     | Light Mode                    | CSS Variable                   |
|:---------------------------|:------------------------------|:------------------------------|:-------------------------------|
| **Backgrounds**            |                               |                               |                                |
| `--background`             | `zinc-950` (#09090b)          | off-white (#f8f7f5)           | ✅ existiert                   |
| `--surface`                | `zinc-900` (#18181b)          | `white` (#ffffff)             | ✅ existiert                   |
| `--surface-hover`          | `zinc-800` (#27272a)          | warm gray (#e8e4e0)           | ✅ existiert                   |
| `--surface-raised`         | `zinc-800` (#27272a)          | `white` (#ffffff)             | 🆕 neu                        |
| `--surface-overlay`        | `zinc-950/95`                 | `white/95`                    | 🆕 neu                        |
| `--surface-sunken`         | `black` (#000000)             | `zinc-100` (#f4f4f5)          | 🆕 neu                        |
| **Text**                   |                               |                               |                                |
| `--foreground`             | `zinc-100` (#f4f4f5)          | `zinc-900` (#18181b)          | ✅ existiert                   |
| `--text-primary`           | `white` (#ffffff)             | `zinc-950` (#09090b)          | 🆕 neu                        |
| `--text-secondary`         | `zinc-400` (#a1a1aa)          | `zinc-600` (#52525b)          | 🆕 neu                        |
| `--text-muted`             | `zinc-500` (#71717a)          | `zinc-500` (#71717a)          | 🆕 neu                        |
| `--text-disabled`          | `zinc-600` (#52525b)          | `zinc-400` (#a1a1aa)          | 🆕 neu                        |
| **Borders**                |                               |                               |                                |
| `--border`                 | `zinc-800` (#27272a)          | `zinc-200` (#e4e4e7)          | ✅ existiert                   |
| `--border-subtle`          | `zinc-800/50`                 | `zinc-100`                    | 🆕 neu                        |
| `--border-hover`           | `zinc-700` (#3f3f46)          | `zinc-300` (#d4d4d8)          | 🆕 neu                        |
| `--border-active`          | `zinc-600` (#52525b)          | `zinc-400` (#a1a1aa)          | 🆕 neu                        |
| **Brand**                  |                               |                               |                                |
| `--brand`                  | `cyan-500` (#06b6d4)          | `cyan-600` (#0891b2)          | ✅ existiert                   |
| `--brand-dim`              | `cyan-900` (#164e63)          | `cyan-100` (#cffafe)          | ✅ existiert                   |
| `--brand-hover`            | `cyan-400` (#22d3ee)          | `cyan-700` (#0e7490)          | 🆕 neu                        |
| `--brand-bg`               | `cyan-950` (#083344)          | `cyan-50` (#ecfeff)           | 🆕 neu                        |
| `--brand-bg-hover`         | `cyan-950/40`                 | `cyan-100` (#cffafe)          | 🆕 neu                        |
| **Signals**                |                               |                               |                                |
| `--success`                | `emerald-500` (#10b981)       | `emerald-600` (#059669)       | 🆕 neu                        |
| `--success-bg`             | `emerald-900/10`              | `emerald-50` (#ecfdf5)        | 🆕 neu                        |
| `--warning`                | `yellow-400` (#facc15)        | `yellow-600` (#ca8a04)        | 🆕 neu                        |
| `--warning-bg`             | `yellow-500/10`               | `yellow-50` (#fefce8)         | 🆕 neu                        |
| `--error`                  | `red-400` (#f87171)           | `red-600` (#dc2626)           | 🆕 neu                        |
| `--error-bg`               | `red-500/10`                  | `red-50` (#fef2f2)            | 🆕 neu                        |
| `--rating`                 | `amber-400` (#fbbf24)         | `amber-500` (#f59e0b)         | 🆕 neu                        |
| `--like`                   | `red-500` (#ef4444)           | `red-500` (#ef4444)           | 🆕 neu (identisch)            |
| **Accent (Sekundär)**      |                               |                               |                                |
| `--accent-orange`          | `orange-400` (#fb923c)        | `orange-600` (#ea580c)        | 🆕 neu                        |
| `--accent-purple`          | `purple-400` (#c084fc)        | `purple-600` (#9333ea)        | 🆕 neu                        |

### 2.3 Gradient-Patterns

| Name                    | Klassen (Dark Mode)                                                                     | Zweck                                |
|:------------------------|:----------------------------------------------------------------------------------------|:-------------------------------------|
| **Hero Overlay**        | `bg-gradient-to-t from-black/95 via-black/50 to-transparent`                            | Text auf Bildern lesbar machen       |
| **Image Fade Bottom**   | `bg-gradient-to-t from-black to-transparent`                                            | Bild-Unterkante abdunkeln            |
| **Card Fallback**       | `bg-gradient-to-br from-orange-950 via-zinc-900 to-zinc-950`                            | Platzhalter wenn kein Bild vorhanden |
| **Section Accent Cyan** | `bg-gradient-to-br from-cyan-950/40 to-cyan-900/10`                                    | Aktive Brewery Card, Cyan-Akzent     |
| **Section Accent Purple** | `bg-gradient-to-br from-purple-900/40 to-purple-900/10`                               | Discover Tab BG                      |
| **Action CTA**          | `bg-gradient-to-br from-cyan-500 to-blue-600`                                          | Mobile Primary Action Button         |
| **Scroll Fade Right**   | `bg-gradient-to-l from-black to-transparent`                                            | Scroll-Overflow-Indikator            |
| **Scroll Fade Left**    | `bg-gradient-to-r from-black to-transparent`                                            | Scroll-Overflow-Indikator            |

---

### 2.3 Die 3 Welten (Farb-Zonen-Konzept)

Das Design System unterteilt die App in drei fundamentale Farbbereiche (Zonen), um dem User klare visuelle Orientierung zu geben, wo er sich befindet:

1. **Die User-Ebene ("Labor" / Mein Keller / Consumer)**
   * **Hauptfarbe:** Turquoise / Cyan (`--brand`, `cyan-500`)
   * **Verwendung:** Alles, was direkt dem (einzelnen) User zuzuordnen ist (Persönliches Dashboard, Eigene Privatrezepte, Achievements, Sammlungen).
   * **Psychologie:** Die vertraute Heimat, BotlLab Identity.

2. **Die Brauerei-Ebene ("Team" / Brewery)**
   * **Hauptfarbe:** Orange (`--accent-orange`, `orange-400/-500`)
   * **Verwendung:** Alles, was mit der kollaborativen Brauerei, geteilten Rezepten im Team, Feed und gemeinsamen Sessions zu tun hat.
   * **Psychologie:** Handwerk, Energie, Gemeinschaft (angelehnt an /login Screen).

3. **Die Öffentliche Ebene ("Entdecken" / Public / Community)**
   * **Hauptfarbe:** Purple / Lila (`--accent-purple`, `purple-400/-600`)
   * **Verwendung:** Alles was nach außen geht (Discover/Rezepte von anderen, Forum, Public Tools, Community).
   * **Psychologie:** Inspiration, das Unbekannte, Kreativität.

## 3. Typografie

### 3.1 Schriftarten

| Token           | Font                         | Fallback                                           |
|:----------------|:-----------------------------|:---------------------------------------------------|
| `--font-sans`   | Geist Sans (Next.js)         | `ui-sans-serif, system-ui, sans-serif`             |
| `--font-mono`   | Geist Mono (Next.js)         | `ui-monospace, Cascadia Code, Source Code Pro, Menlo, monospace` |

**Rendering**: `antialiased` (`-webkit-font-smoothing: antialiased`)

### 3.2 Typografie-Hierarchie

| Level              | Klassen                                                    | Verwendung                                        |
|:-------------------|:-----------------------------------------------------------|:--------------------------------------------------|
| **Display**        | `text-5xl font-black leading-none tracking-tight`          | Hero-Titel (Desktop)                              |
| **Display (XL)**   | `xl:text-6xl font-black leading-none tracking-tight`       | Hero-Titel (XL Screens)                           |
| **H1**             | `text-3xl font-black leading-tight tracking-tight`         | Seitentitel, Mobile Hero                          |
| **H2**             | `text-2xl font-black leading-none tabular-nums`            | Metriken (große Zahlen), Section-Titel            |
| **H3**             | `text-xl font-bold`                                        | Subsection-Titel                                  |
| **H4**             | `text-lg font-bold`                                        | Card-Titel, Unterüberschriften                    |
| **Body**           | `text-sm text-zinc-300 font-medium leading-relaxed`        | Fließtext, Beschreibungen                         |
| **Body Strong**    | `text-sm font-bold text-white`                             | Betonter Fließtext, Nutzernamen                   |
| **Caption**        | `text-xs text-zinc-400`                                    | Meta-Infos (Datum, Zähler)                        |
| **Micro**          | `text-[10px] font-bold uppercase tracking-widest`          | Section-Labels, Kategorie-Header                  |
| **Micro Alt**      | `text-[10px] font-bold uppercase tracking-wider`           | Badge-Labels, Tab-Labels                          |
| **Nano**           | `text-[9px] font-bold`                                     | Sehr kleine Badges, Zusatz-Info                   |
| **Mono Metric**    | `font-mono text-xl font-black tabular-nums`                | Numerische Hervorhebung (OG, FG)                  |
| **Mono Small**     | `font-mono text-xs`                                        | Technische Werte, Codes                           |

### 3.3 Text-Farbstufen

| Stufe              | Dark Mode Klasse       | Verwendung                                                |
|:-------------------|:-----------------------|:----------------------------------------------------------|
| **Primary**        | `text-white`           | Überschriften, wichtiger Text, aktive Elemente             |
| **Secondary**      | `text-zinc-300`        | Body-Text, Beschreibungen                                  |
| **Tertiary**       | `text-zinc-400`        | Meta-Text, Sekundärinfo (Datum, Ratings-Zähler)            |
| **Muted**          | `text-zinc-500`        | Inaktive Tabs, Platzhalter                                 |
| **Disabled**       | `text-zinc-600`        | Deaktivierte Elemente, Labels                              |
| **Ghost**          | `text-zinc-700`        | Kaum sichtbar, Separators-Text                             |
| **Brand**          | `text-cyan-400`        | Links, aktive Navigation, Akzent-Werte                     |
| **Brand Accent**   | `text-cyan-500`        | Stärkerer Brand-Ton                                        |
| **Error**          | `text-red-400`         | Fehlermeldungen, gelöschte/gemeldete Elemente              |
| **Success**        | `text-emerald-500`     | Erfolgsmeldungen, "Verified" Badges                        |
| **Rating**         | `text-amber-400`       | Sterne, Rating-Werte                                       |
| **Accent Orange**  | `text-orange-400`      | Sekundärer Akzent (Komplexität, Hop-Badges)                |
| **Accent Purple**  | `text-purple-400`      | Tertiärer Akzent (Remixes, alternative Highlights)         |

### 3.4 Textbehandlung

| Pattern              | Klassen                          | Verwendung                                 |
|:---------------------|:---------------------------------|:-------------------------------------------|
| **Einzeilig kürzen** | `truncate`                       | Card-Titel, Nutzernamen in Listen          |
| **Mehrzeilig kürzen** | `line-clamp-2`                  | Card-Beschreibungen (max 2 Zeilen)         |
| **Uppercase Label**  | `uppercase tracking-widest`      | Section-Header, Badge-Text                 |
| **Tabular Numbers**  | `tabular-nums`                   | Metriken, Zähler (gleiche Breite)          |
| **Kein Umbruch**     | `whitespace-nowrap`              | Tab-Labels, Badges                         |
| **Preformatted**     | `whitespace-pre-wrap font-mono`  | Brewer-Notizen, Kommentare                 |

---

## 4. Spacing & Layout

### 4.1 Spacing-Skala (Basis: 4px)

> Verwendet wird die Tailwind-Standard-Skala. Die **fett** markierten Werte sind die am häufigsten genutzten.

| Token  | Wert    | Verwendung                                                |
|:-------|:--------|:----------------------------------------------------------|
| `0.5`  | 2px     | Micro-Gaps (Rating-Sterne)                                |
| `1`    | 4px     | Icon-Label-Gap, Mini-Padding                              |
| **`1.5`** | 6px  | Badge-Padding, kompakte Gaps                              |
| **`2`**   | 8px  | Standard-Gap (small), Button-Padding-Y                    |
| `2.5`  | 10px    | Button-Padding-Y (medium)                                 |
| **`3`**   | 12px | Section-interne Gaps, Card-Padding (small)                |
| **`4`**   | 16px | Standard Card-Padding, Content-Padding X, Abschnitt-Gap   |
| `5`    | 20px    | Hero-Padding-Top                                          |
| **`6`**   | 24px | Section-Margins, großer Content-Padding                   |
| **`8`**   | 32px | Große Section-Gaps                                        |
| `10`   | 40px    | Hero-Padding Y (Desktop), Section-Abstand                 |
| `12`   | 48px    | Große vertikale Abstände                                  |
| `16`   | 64px    | Page Padding-Bottom, Empty-State Padding                   |

### 4.2 Content-Container

| Kontext               | Klassen                                              |
|:----------------------|:-----------------------------------------------------|
| **Page Max-Width**    | `max-w-7xl mx-auto px-4 sm:px-6`                    |
| **Content Max-Width** | `max-w-6xl mx-auto px-4`                            |
| **Narrow Content**    | `max-w-4xl mx-auto px-4 sm:px-6`                    |
| **Full-Bleed**        | `max-w-[1920px] w-full mx-auto px-6`                |
| **Card Content**      | `p-4` oder `px-4 py-3`                              |
| **Tight Content**     | `p-3`                                                |

### 4.3 Grid-System

| Layout                        | Klassen                                                         |
|:------------------------------|:----------------------------------------------------------------|
| **Brew-Card Raster (Default)**| `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` |
| **Metriken-Raster**           | `grid grid-cols-2 md:grid-cols-4 gap-8`                         |
| **KPI-Row**                   | `grid grid-cols-4 gap-1`                                        |
| **2-Spalten Content**         | `grid grid-cols-1 md:grid-cols-2 gap-6`                         |
| **Rating-Distribution**       | `grid grid-cols-1 md:grid-cols-2 gap-10`                        |

### 4.4 Flex-Patterns

| Pattern                        | Klassen                                                         |
|:-------------------------------|:----------------------------------------------------------------|
| **Horizontal zentriert**       | `flex items-center gap-2`                                        |
| **Horizontal verteilt**        | `flex items-center justify-between`                              |
| **Vertikal gestapelt**         | `flex flex-col gap-4`                                            |
| **Desktop Sidebar + Content**  | `flex gap-10 items-start` + Sidebar `shrink-0 w-52`             |
| **Hero Desktop**               | `lg:flex gap-10 px-6 py-10 items-start`                         |
| **Action-Bar**                 | `flex items-center gap-3 flex-wrap`                              |
| **Tag-Cloud**                  | `flex flex-wrap gap-1.5`                                         |

---

## 5. Border & Radius

### 5.1 Radius-Skala

| Token         | Wert     | Verwendung                                         |
|:--------------|:---------|:---------------------------------------------------|
| `rounded`     | 4px      | Inline-Code-Badges, Mini-Tags                      |
| `rounded-lg`  | 8px      | Buttons, Inputs, Dropdown-Items, kleine Badges     |
| `rounded-xl`  | 12px     | Cards (small), Modals, Inputs (groß), Action-Buttons|
| `rounded-2xl` | 16px     | Cards (primary), Hero-Images, Panels               |
| `rounded-3xl` | 24px     | Große Container (selten)                            |
| `rounded-full`| 9999px   | Avatare, Pill-Badges, runde Buttons, Progress-Bars |

### 5.2 Border-Patterns

| Pattern                  | Klassen                                    | Verwendung                     |
|:-------------------------|:-------------------------------------------|:-------------------------------|
| **Standard Border**      | `border border-zinc-800`                   | Cards, Inputs                  |
| **Subtile Border**       | `border border-zinc-800/50`                | Sekundäre Panels, Dividers     |
| **Hover Border**         | `hover:border-zinc-700`                    | Card Hover                     |
| **Active Border**        | `hover:border-zinc-600` oder `border-cyan-500` | Focused Input, Active Card |
| **Brand Border**         | `border border-cyan-500/40`                | Brand-Button Desktop-Variante  |
| **Brand Dim Border**     | `border border-cyan-900/30`                | Brand-Badges (gedämpft)        |
| **Error Border**         | `border border-red-500`                    | Validierungsfehler             |
| **Dashed Border**        | `border border-dashed border-zinc-800`     | Empty States, Drop Zones       |
| **Divider Horizontal**   | `border-b border-zinc-800`                 | Section-Trennlinien            |
| **Divider Horizontal (subtle)** | `border-b border-zinc-800/50`       | Inhalts-Trennlinien            |
| **Divider Vertical**     | `border-l border-zinc-800`                 | Timeline-Linien                |
| **Decorative Line**      | `h-px bg-zinc-800 flex-1`                  | Section-Header-Accent          |

### 5.3 Ring-Patterns

| Pattern            | Klassen                    | Verwendung                   |
|:-------------------|:---------------------------|:-----------------------------|
| **Subtle Ring**    | `ring-1 ring-white/10`     | Erhöhte Elemente auf Bildern |

---

## 6. Schatten & Tiefe

### 6.1 Shadow-Skala

| Level           | Klassen                                                    | Verwendung                        |
|:----------------|:-----------------------------------------------------------|:----------------------------------|
| **None**        | —                                                          | Flache Elemente, Listen-Items     |
| **Subtle**      | `shadow-md`                                                | Kleine Dropdowns                  |
| **Default**     | `shadow-lg`                                                | Cards, Overlays                   |
| **Elevated**    | `shadow-xl`                                                | Modals, Notifications             |
| **Prominent**   | `shadow-2xl`                                               | Hero-Images, Haupt-Dropdowns      |
| **Glow Cyan**   | `shadow-lg shadow-cyan-500/20`                             | CTA-Button-Glow                   |
| **Glow Cyan SM**| `shadow-cyan-900/20`                                       | Brand-Card-Hover                  |
| **Glow Red**    | `shadow-red-900/40`                                        | Error/Like-Glow                   |
| **Dot Glow**    | `shadow-[0_0_8px_rgba(6,182,212,0.5)]`                    | Aktivitäts-Punkt (Online)         |
| **Dot Glow Amber** | `shadow-[0_0_8px_rgba(245,158,11,0.5)]`               | Rating-Punkt                      |

### 6.2 Tiefenebenen (Z-Index)

| Z-Index    | Verwendung                                        |
|:-----------|:--------------------------------------------------|
| `z-0`      | Default                                           |
| `z-10`     | Scroll-Fade-Overlay, Badge-Overlay, In-Card       |
| `z-40`     | Sticky Header (MinimalStickyHeader)               |
| `z-50`     | Modals, Dropdowns, Bottom Sheets, Header          |
| `z-[60]`   | Custom-Select Dropdowns (über z-50 Header)        |
| `z-[100]`  | Mobile Full-Screen Menu (über allem)              |

### 6.3 Backdrop-Blur

| Level        | Klasse             | Verwendung                                     |
|:-------------|:-------------------|:-----------------------------------------------|
| **Subtle**   | `backdrop-blur-sm` | Overlays, Lightbox-Background                   |
| **Medium**   | `backdrop-blur-md` | Sticky Header, Badge auf Bildern                |
| **Heavy**    | `backdrop-blur-3xl`| Mobile Full-Screen Menu                         |

---

## 7. Buttons

### 7.1 Button-Varianten

#### Primary CTA (Mobile)
```
bg-gradient-to-br from-cyan-500 to-blue-600 text-white 
hover:opacity-90 shadow-lg shadow-cyan-500/20
rounded-xl px-4 py-2 text-sm font-bold
```

#### Primary CTA (Desktop Outlined)
```
bg-transparent text-cyan-400 
border border-cyan-500/40 
hover:bg-cyan-950/40
rounded-xl px-4 py-2 text-sm font-bold
```

#### Pill CTA (Header Login)
```
bg-white text-black 
px-6 py-2 rounded-full 
font-bold text-sm
hover:bg-cyan-400 hover:scale-105 
transition transform
```

#### Submit Button (Comment/Form)
```
bg-cyan-500 hover:bg-cyan-400 
disabled:opacity-40 disabled:cursor-not-allowed 
text-black font-bold text-xs 
px-4 py-2 rounded-xl transition
```

#### Secondary / Ghost
```
text-zinc-500 hover:text-white hover:bg-zinc-800/50 
px-4 py-2 rounded-lg text-sm font-bold 
transition-all flex items-center gap-2
```

#### Tab Button (Horizontal Nav)
```
# Inaktiv:
text-zinc-500 hover:text-zinc-300 
px-4 py-4 text-sm font-semibold 
whitespace-nowrap shrink-0 transition-colors

# Aktiv:
text-white
# + Indicator: absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-t-full
```

#### Icon Action Button (Brew Detail)
```
# Wrapper:
flex flex-col items-center justify-center gap-1.5 
px-2 py-2 rounded-xl transition-all group w-full
disabled:opacity-40 disabled:cursor-not-allowed

# Inaktiv:
bg-zinc-900/0 text-zinc-400 
hover:text-white hover:bg-zinc-900/60

# Aktiv:
bg-zinc-900/60 text-{activeColor}

# Icon:
w-9 h-9 flex items-center justify-center 
transition-transform group-hover:scale-110

# Label:
text-[10px] font-bold uppercase tracking-wider leading-none
```

#### Tag/Filter Chip
```
# Inaktiv:
px-4 py-2 rounded-full text-xs font-bold
bg-zinc-900 text-zinc-400 border border-zinc-800
transition-all hover:border-zinc-600

# Aktiv:
bg-cyan-500/10 text-cyan-400 border-cyan-500
```

#### Destructive / Report
```
text-xs text-zinc-500 hover:text-red-400 
flex items-center gap-1.5 transition ml-auto
```

### 7.2 Button-States

| State        | Pattern                                              |
|:-------------|:-----------------------------------------------------|
| **Default**  | Basis-Klassen (s.o.)                                  |
| **Hover**    | `hover:bg-*` + `hover:text-*` + `hover:border-*`    |
| **Active**   | `active:scale-95`                                     |
| **Disabled** | `disabled:opacity-40 disabled:cursor-not-allowed`    |
| **Loading**  | Icon ersetzt durch `animate-spin rounded-full h-5 w-5 border-t-2 border-current` |

### 7.3 Button-Größen

| Größe    | Padding         | Font                        |
|:---------|:----------------|:----------------------------|
| **XS**   | `px-2 py-1`     | `text-[10px] font-bold`     |
| **SM**   | `px-3 py-1.5`   | `text-xs font-bold`         |
| **MD**   | `px-4 py-2`     | `text-sm font-bold`         |
| **LG**   | `px-6 py-2.5`   | `text-sm font-bold`         |
| **XL**   | `px-6 py-3`     | `text-base font-bold`       |

---

## 8. Cards

### 8.1 Card-Varianten

#### Portrait Card (DiscoverBrewCard Standardvariante)
```
group relative flex flex-col
rounded-2xl overflow-hidden 
border border-zinc-800 
hover:border-zinc-600 
transition-all duration-300
snap-center

# Image: aspect-square w-full object-cover 
#         transition-transform duration-700 group-hover:scale-105
# Image Overlay: bg-gradient-to-t from-black/95 via-black/50 to-transparent
# Content: p-4 flex flex-col gap-2
```

#### Hero Card (DiscoverBrewCard `variant="hero"`)
```
group relative flex flex-col h-full 
rounded-2xl overflow-hidden 
border border-zinc-800 
hover:border-zinc-600 
transition-all duration-300

# Image: absolute inset-0 w-full h-full object-cover 
#         transition-transform duration-700 group-hover:scale-105
# Overlay: absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent
# Content: am unteren Rand, relative z-10
```

#### Compact Card (DiscoverBrewCard `variant="compact"`)
```
group flex items-center gap-3 
px-3 py-2.5 rounded-xl 
border border-zinc-800/50 
hover:bg-zinc-900/60 hover:border-zinc-700 
transition-all

# Thumbnail: w-10 h-10 rounded-lg overflow-hidden shrink-0
# Content: flex-1 min-w-0 (truncated text)
# Stats: shrink-0 text-right
```

#### Highlight Card (DiscoverBrewCard `variant="highlight"`)
```
group relative flex items-center gap-4 
px-4 py-4 rounded-xl 
border border-zinc-800 
hover:border-zinc-700 hover:bg-zinc-900/40 
transition-all

# Text-Content: links, flex-1
# Image: rechts, w-20 h-20 rounded-xl shrink-0
```

#### Content Panel (generisch)
```
bg-zinc-950/50 rounded-2xl 
border border-zinc-800/50 
p-6
```

#### Elevated Panel (Dropdowns, Notifications)
```
bg-zinc-900 border border-zinc-800 
rounded-xl shadow-2xl overflow-hidden
```

### 8.2 Card-Image-Patterns

| Pattern               | Klassen                                                           |
|:----------------------|:------------------------------------------------------------------|
| **Cover Image**       | `w-full h-full object-cover`                                      |
| **Hover Zoom**        | `transition-transform duration-700 group-hover:scale-105`         |
| **Image Fallback**    | `bg-gradient-to-br from-orange-950 via-zinc-900 to-zinc-950`     |
| **Image Pending**     | `opacity-40 blur-md`                                              |
| **Image Overlay**     | `absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent` |

---

## 9. Badges

### 9.1 Badge-Varianten

#### Style Badge (auf Card)
```
text-xs font-bold px-2.5 py-1 rounded-full 
bg-black/60 backdrop-blur-sm text-white/90 
border border-white/10
```

#### Rating Badge (auf Card)
```
bg-black/50 backdrop-blur text-white text-xs font-bold 
px-3 py-1 rounded-full flex items-center gap-1.5
```

#### Brand Badge
```
text-[10px] font-bold uppercase tracking-widest 
px-2.5 py-1 rounded-full 
bg-cyan-950/20 text-cyan-400 
border border-cyan-900/30
```

#### Purple Badge (Remix)
```
text-[10px] font-bold px-2.5 py-1 rounded-full 
bg-purple-950/30 text-purple-400 
border border-purple-900/30
```

#### Complexity Badge
```
# Einsteiger:
text-green-400 text-[10px]

# Fortgeschritten:
text-yellow-400 text-[10px]

# Experte:
text-orange-400 text-[10px]
```

#### Verified Badge
```
bg-emerald-500/20 backdrop-blur text-emerald-400 
text-xs font-bold px-3 py-1 rounded-full
```

#### Warning Badge
```
bg-yellow-500/10 backdrop-blur-md 
border border-yellow-500/50 
px-3 py-1.5 rounded-full 
text-yellow-500 text-sm font-bold uppercase tracking-wider
```

#### Trending Badge (Rank)
```
bg-black/70 backdrop-blur-md 
border border-white/15 
px-3 py-1.5 rounded-full
flex items-center gap-1.5 
text-[13px] font-black text-white
```

#### Section Label Badge
```
text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500
# oft gepaart mit:
h-px bg-zinc-800 flex-1  (als dekorative Linie)
```

#### Notification Count
```
absolute top-0 right-0 
w-4 h-4 bg-red-500 text-white text-[10px] font-bold 
flex items-center justify-center rounded-full 
shadow-lg border border-black
```

#### Tag (inline)
```
text-[10px] text-zinc-400 bg-zinc-900/60 
px-1.5 py-0.5 rounded font-mono
```

---

## 10. Navigation & Header

### 10.1 Top-Level Header

```
# Container:
border-b border-zinc-900 bg-zinc-950/80 
sticky top-0 z-50 backdrop-blur-md

# Inner:
max-w-[1920px] w-full mx-auto px-6 
flex justify-between items-center

# Height: ~56px (p-3 + content)
```

### 10.2 Sticky Minimal Header (Brew Detail)

```
# Container:
fixed top-0 left-0 right-0 z-40 
bg-black/90 backdrop-blur-md 
border-b border-zinc-800/60 
transition-all duration-200 ease-out

# Visible:
translate-y-0 opacity-100

# Hidden:
-translate-y-full opacity-0 pointer-events-none

# Inner:
max-w-7xl mx-auto px-4 h-11 
flex items-center gap-4

# Brew Name:
font-black text-white text-sm truncate flex-1 min-w-0
```

### 10.3 Profile Dropdown

```
# Trigger (Avatar):
w-8 h-8 rounded-full flex items-center justify-center 
text-xs overflow-hidden relative shadow-lg 
bg-zinc-900 border-2 {tierBorderClass}

# Dropdown Container:
absolute top-full right-0 pt-2 w-48 z-50

# Dropdown Box:
bg-zinc-900 border border-zinc-800 rounded-xl 
shadow-2xl overflow-hidden

# Menu Items:
block px-4 py-3 text-sm text-zinc-300 
hover:bg-zinc-800 hover:text-white 
transition flex items-center gap-2

# Accent Item: text-cyan-400 hover:text-cyan-300
# Danger Item: text-red-400 hover:text-red-300
```

### 10.4 Mobile Navigation

```
# Full-Screen Overlay:
lg:hidden fixed inset-0 z-[100] 
bg-zinc-950/95 backdrop-blur-3xl 
flex flex-col animate-in slide-in-from-right duration-200

# Segmented Control (Tabs):
flex bg-zinc-900 p-1 rounded-xl overflow-x-auto no-scrollbar

# Tab Active: bg-zinc-800 text-white shadow-lg py-2.5 px-2 text-xs font-bold rounded-lg
# Tab Inactive: text-zinc-500 hover:text-zinc-300 py-2.5 px-2 text-xs font-bold rounded-lg
# Team Active: bg-cyan-950 text-cyan-400 shadow-lg
# Discover Active: bg-purple-900/50 text-purple-300 shadow-lg
```

---

## 11. Tabs

### 11.1 Horizontal Tab Bar (Mobile)

```
# Container:
relative border-b border-zinc-800 lg:hidden

# Scroll Area:
flex overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]

# Tab Button (inaktiv):
px-4 py-4 text-sm font-semibold 
whitespace-nowrap shrink-0 
transition-colors text-zinc-500 
hover:text-zinc-300

# Tab Button (aktiv):
text-white
# Active Indicator:
absolute bottom-0 left-0 right-0 h-0.5 
bg-white/10 rounded-t-full

# Scroll Fade:
absolute right-0 top-0 bottom-0 w-10 
bg-gradient-to-l from-black to-transparent 
pointer-events-none z-10
```

### 11.2 Vertical Tab Nav (Desktop Sidebar)

```
# Container:
hidden lg:flex flex-col gap-1 
w-52 flex-shrink-0 sticky top-20 self-start

# Tab Button (inaktiv):
flex items-center gap-3 w-full 
px-3 py-2.5 rounded-lg 
text-sm font-medium transition-all text-left
text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900

# Tab Button (aktiv):
bg-zinc-800 text-white

# Badge Count:
px-1.5 py-0.5 rounded-full 
text-xs font-bold leading-none 
bg-zinc-700 text-zinc-300  (oder bg-cyan-400 text-white für aktiv)
```

### 11.3 Sticky Tab Buttons (in MinimalStickyHeader)

```
# Inaktiv:
text-[10px] font-bold uppercase tracking-wider 
px-2.5 py-1.5 rounded-lg transition-colors 
text-zinc-500 hover:text-zinc-300

# Aktiv:
text-cyan-400 bg-cyan-950/40
```

---

## 12. Formulare & Inputs

### 12.1 Text Input

```
bg-zinc-900/60 border border-zinc-800 
rounded-xl px-4 py-3 
text-sm text-white placeholder-zinc-600 
resize-none 
focus:outline-none focus:border-zinc-600 
transition
```

### 12.2 Number Input

```
bg-zinc-900 text-white font-mono font-bold 
px-3 py-1.5 rounded-lg 
border border-zinc-800 
w-20 
focus:border-cyan-500 focus:outline-none 
text-sm
```

> **Hinweis**: Spinner-Buttons werden global in `globals.css` ausgeblendet.

### 12.3 Search Input

```
bg-zinc-900 border border-zinc-800 rounded-xl 
px-4 py-2 text-sm text-white 
placeholder-zinc-600 
focus:outline-none focus:border-zinc-700 
transition w-full
# Mit prefixed Search-Icon:
pl-10 (für Icon-Links)
```

### 12.4 Select (CustomSelect)

```
# Trigger:
bg-zinc-900 border border-zinc-800 
rounded-xl px-3 py-2 
text-sm font-medium text-white 
transition flex items-center justify-between

# Dropdown:
bg-black border border-zinc-800 
rounded-xl shadow-xl 
max-h-60 overflow-y-auto z-[60]

# Option (inaktiv):
px-3 py-2 text-sm text-zinc-400 
hover:bg-zinc-900 hover:text-white 
transition-colors cursor-pointer

# Option (aktiv):
text-cyan-400 bg-cyan-500/10
```

---

## 13. Avatare

### 13.1 Größen

| Variante     | Klassen                                                              |
|:-------------|:---------------------------------------------------------------------|
| **XS**       | `w-7 h-7 rounded-full text-xs`                                       |
| **SM**       | `w-8 h-8 rounded-full text-xs`                                       |
| **MD**       | `w-9 h-9 rounded-full text-xs`                                       |
| **LG**       | `w-12 h-12 rounded-2xl`                                              |

### 13.2 Avatar-Pattern

```
# Container:
w-{size} h-{size} rounded-full 
bg-zinc-900 border border-zinc-800 
flex items-center justify-center 
font-black text-xs text-zinc-400 
shrink-0 overflow-hidden

# Image:
w-full h-full object-cover

# Fallback:
Initiale (1-2 Buchstaben), font-black text-xs text-zinc-400

# Mit Tier-Border (Premium):
border-2 {tierBorderClass}
```

---

## 14. Modals & Sheets

### 14.1 Bottom Sheet (Mobile Filter)

```
# Backdrop:
fixed inset-0 z-50 bg-black/70

# Sheet:
fixed bottom-0 left-0 right-0 z-50 
bg-zinc-950 border-t border-zinc-800 
rounded-t-xl max-h-[90dvh] 
overflow-y-auto 
animate-in slide-in-from-bottom duration-300

# Drag Handle:
w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-4

# Sheet Header:
p-6 pb-4
text-lg font-black text-white
```

### 14.2 Search Overlay (Mobile)

```
# Container:
fixed inset-0 z-[100] flex flex-col 
bg-zinc-950/95 backdrop-blur-3xl 
animate-in fade-in duration-200

# Search Bar:
px-4 pt-4 pb-2 flex items-center gap-3
# Input: same as Search Input pattern
# Close Button: text-zinc-400 hover:text-white p-2
```

### 14.3 Fullscreen Image Modal

```
# Backdrop:
fixed inset-0 z-50 bg-black/80 
backdrop-blur-sm 
flex items-center justify-center p-4

# Image:
max-w-full max-h-[90vh] object-contain

# Close:
absolute top-4 right-4 
text-white/70 hover:text-white 
bg-black/40 rounded-full p-2
```

---

## 15. Empty States

### 15.1 Standard Empty State

```
# Container:
flex flex-col items-center py-16 gap-4 text-center

# Icon Container:
w-12 h-12 rounded-2xl bg-zinc-900 
border border-zinc-800 
flex items-center justify-center mx-auto

# Emoji (Alternative):
text-4xl opacity-30

# Title:
text-zinc-500 font-medium text-sm

# Description:
text-zinc-700 text-xs max-w-xs mx-auto
```

### 15.2 Bordered Empty State

```
border border-dashed border-zinc-800 
rounded-2xl w-full max-w-sm 
bg-zinc-950/50
# + Standard Empty-State Inhalt
```

---

## 16. Animationen & Transitions

### 16.1 Transition-Presets

| Preset           | Klassen                              | Verwendung                          |
|:-----------------|:-------------------------------------|:------------------------------------|
| **Snap**         | `transition-colors`                  | Tab-Wechsel, Text-Farbwechsel      |
| **Default**      | `transition-all duration-200`        | Buttons, Cards                      |
| **Smooth**       | `transition-all duration-300`        | Cards, Panels                       |
| **Cinematic**    | `transition-transform duration-700`  | Image Hover-Zoom                    |
| **Smooth Scale** | `transition duration-500`            | Progress-Bars                       |

### 16.2 Hover-Effekte

| Effekt                   | Klassen                                    | Verwendung              |
|:-------------------------|:-------------------------------------------|:------------------------|
| **Image Zoom**           | `group-hover:scale-105`                    | Card-Images             |
| **Icon Pop**             | `group-hover:scale-110`                    | Action-Button Icons     |
| **CTA Scale**            | `hover:scale-105`                          | Login CTA               |
| **Like Bounce**          | `hover:scale-105 active:scale-95`          | Like Button             |
| **Reveal**               | `opacity-0 group-hover:opacity-100`        | Sekundäre Actions       |
| **Text Color Shift**     | `group-hover:text-cyan-400`                | Links in Gruppen        |
| **Highlight Card**       | `group-hover:text-amber-400`               | Similar Brew Card       |

### 16.3 Enter-Animationen

| Animation             | Klassen                                               | Verwendung           |
|:----------------------|:------------------------------------------------------|:---------------------|
| **Fade In**           | `animate-in fade-in duration-200`                      | Overlays, Modals     |
| **Slide Right**       | `animate-in slide-in-from-right duration-200`          | Mobile Menu          |
| **Slide Bottom**      | `animate-in slide-in-from-bottom duration-300`         | Bottom Sheet         |
| **Slide Top**         | `animate-in slide-in-from-top-2 duration-200`          | Notification Dropdown |
| **Zoom**              | `animate-in zoom-in-95 fade-in`                       | Dropdowns            |
| **Pulse (Loading)**   | `animate-pulse`                                        | Skeleton Loader      |
| **Spin (Loading)**    | `animate-spin`                                         | Spinner              |
| **Float**             | `animate-float` (custom, in globals.css)               | Deko-Elemente        |
| **Fade In Up**        | `animate-fade-in-up` (custom, in globals.css)          | Hero-Entrance        |

---

## 17. Icons

### 17.1 Icon-Library

**Lucide React** — einzige Icon-Library des Projekts.

### 17.2 Icon-Größen

| Kontext         | Klassen           | Größe  |
|:----------------|:------------------|:-------|
| **Inline**      | `w-3 h-3`        | 12px   |
| **Small**       | `w-3.5 h-3.5`    | 14px   |
| **Default**     | `w-4 h-4`        | 16px   |
| **Medium**      | `w-5 h-5`        | 20px   |
| **Large**       | `w-8 h-8`        | 32px   |
| **XL (Empty)**  | `w-12 h-12`      | 48px   |

### 17.3 Icon-Farben

Icons folgen der Textfarbe ihres Kontexts. Spezialfälle:

| Kontext              | Klassen                                |
|:---------------------|:---------------------------------------|
| **Inaktiv**          | `text-zinc-500` oder `stroke-zinc-500` |
| **Default**          | `text-zinc-400`                        |
| **Hover**            | `group-hover:text-white`               |
| **Brand**            | `text-cyan-400`                        |
| **Rating Star Fill** | `fill-amber-400 text-amber-400`        |
| **Rating Star Empty**| `text-zinc-700` oder `text-amber-400/50` |
| **Like Active**      | `fill-red-500 stroke-red-500`          |
| **Like Inactive**    | `stroke-zinc-500`                      |

---

## 18. Seitenstruktur-Templates

### 18.1 Template: Detail-Seite (z.B. `/brew/[id]`)

```
┌──────────────────────────────────────────────────────────────┐
│  MinimalStickyHeader (erscheint beim Scrollen)               │
│  fixed top-0 z-40 bg-black/90 backdrop-blur-md h-11         │
├──────────────────────────────────────────────────────────────┤
│  Header (global, sticky top-0 z-50)                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MOBILE:                                                     │
│  ┌────────────────────────────────────────────┐              │
│  │  Full-width Image (aspect-square)          │              │
│  │  + Gradient Overlay                        │              │
│  └────────────────────────────────────────────┘              │
│  ┌────────────────────────────────────────────┐              │
│  │  Title + Badges + Meta + Action Bar        │              │
│  │  px-4 pt-5 pb-2 space-y-3                  │              │
│  └────────────────────────────────────────────┘              │
│  ┌────────────────────────────────────────────┐              │
│  │  Tab Nav (horizontal scroll)                │              │
│  │  border-b border-zinc-800                   │              │
│  └────────────────────────────────────────────┘              │
│  ┌────────────────────────────────────────────┐              │
│  │  Tab Content                                │              │
│  │  max-w-4xl mx-auto px-4 sm:px-6 py-10     │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  DESKTOP (lg+):                                              │
│  ┌──────────┬───────────────────────────────┐                │
│  │  Image   │  Title + Badges + Meta         │                │
│  │  w-72    │  + Action Bar + Brewery Link   │                │
│  │  xl:w-80 │  flex-1 min-w-0               │                │
│  │  aspect- │                                │                │
│  │  square  │                                │                │
│  └──────────┴───────────────────────────────┘                │
│  gap-10 px-6 py-10 max-w-7xl mx-auto                        │
│  ┌──────────────────────────┬────────────┐                   │
│  │  Tab Content              │  Sidebar   │                   │
│  │  flex-1 min-w-0           │  w-52 sticky │                │
│  │                           │  top-20     │                  │
│  └──────────────────────────┴────────────┘                   │
│                                                              │
│  pb-16                                                       │
└──────────────────────────────────────────────────────────────┘
```

### 18.2 Template: Grid-Seite (z.B. `/discover`)

```
┌──────────────────────────────────────────────────────────────┐
│  Header (global)                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Search Bar + Filter                       │              │
│  │  max-w-6xl mx-auto                         │              │
│  │  sticky top-[56px] z-40                    │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Hero Section (Featured Brew als Hero Card) │              │
│  │  max-w-6xl mx-auto                         │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Section: "Trending 🔥"                    │              │
│  │  Horizontal scroll (snap-x) oder Grid      │              │
│  │  max-w-6xl mx-auto                         │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Section: "Für Dich ✨"                    │              │
│  │  Grid layout                               │              │
│  │  grid-cols-1 sm:2 lg:3 xl:4 gap-6         │              │
│  │  max-w-6xl mx-auto                         │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  "Alle Brews" Grid                         │              │
│  │  + Infinite Scroll Sentinel                 │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  pb-20                                                       │
└──────────────────────────────────────────────────────────────┘
```

### 18.3 Template: Profil-Seite (z.B. `/brewer/[id]`)

```
┌──────────────────────────────────────────────────────────────┐
│  MinimalStickyHeader                                          │
├──────────────────────────────────────────────────────────────┤
│  Header (global)                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Cinematic Hero (Avatar + Name + KPI Row)  │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  MOBILE:                                                     │
│  ┌────────────────────────────────────────────┐              │
│  │  Tab Nav (horizontal scroll)                │              │
│  └────────────────────────────────────────────┘              │
│  ┌────────────────────────────────────────────┐              │
│  │  Tab Content (Brews Grid / Ratings / etc.) │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  DESKTOP (lg+):                                              │
│  ┌────────────┬─────────────────────────────┐                │
│  │  Sidebar    │  Content Area               │                │
│  │  w-52       │  DiscoverBrewCard Grid      │                │
│  │  sticky     │  flex-1                     │                │
│  │  top-20     │                             │                │
│  └────────────┴─────────────────────────────┘                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 18.4 Template: Dashboard/Settings (zukünftig)

```
┌──────────────────────────────────────────────────────────────┐
│  Header (global)                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  max-w-4xl mx-auto px-4 sm:px-6 py-10                       │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Page Title (H1)                            │              │
│  │  text-3xl font-black mb-8                  │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Section Panel                              │              │
│  │  bg-surface rounded-2xl border p-6 mb-6    │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │  Section Title (Micro Label)         │  │              │
│  │  │  Form Fields / Content               │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  (repeat sections...)                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 18.5 Template: Forum/List (zukünftig)

```
┌──────────────────────────────────────────────────────────────┐
│  Header (global)                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  max-w-4xl mx-auto px-4 sm:px-6                             │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Page Title + CTA Button (flex between)    │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  Filter Bar / Category Tabs (scroll-x)     │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
│  ┌────────────────────────────────────────────┐              │
│  │  List Items (Compact Cards)                 │              │
│  │  space-y-2 or divide-y divide-zinc-800     │              │
│  │  Each: flex items-center gap-3 px-3 py-3   │              │
│  │        rounded-xl hover:bg-surface-hover   │              │
│  └────────────────────────────────────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 19. Responsive Breakpoints

### 19.1 Breakpoint-Definitionen

| Breakpoint | Min-Width | Verwendung                                          |
|:-----------|:----------|:----------------------------------------------------|
| Default    | 0px       | Mobile first — alle Base-Styles                      |
| `sm:`      | 640px     | Kleine Tablets — 2-Spalten Grids, breitere Padding   |
| `md:`      | 768px     | Tablets — Sidebar-Toggle, 2-3 Spalten Grids          |
| `lg:`      | 1024px    | Desktop — Sidebar sichtbar, Hero horizontal           |
| `xl:`      | 1280px    | Wide Desktop — 4-Spalten Grids, größere Hero-Images  |

### 19.2 Responsive Patterns

| Pattern                     | Mobile             | Desktop (lg+)                              |
|:----------------------------|:-------------------|:-------------------------------------------|
| **Navigation**              | Hamburger → Sheet  | Horizontal Nav-Bar                         |
| **Hero Layout**             | Vertikal (stacked) | Horizontal (Image links, Content rechts)   |
| **Tab Nav**                 | Horizontal Scroll  | Vertical Sidebar (sticky)                  |
| **Card Grid**               | 1 Spalte           | 3-4 Spalten                                |
| **Action Bar**              | Fixed bottom / Inline | Inline mit mehr Options sichtbar          |
| **Sidebar**                 | Hidden             | `w-52` bis `w-72`, sticky                  |
| **Content Padding**         | `px-4`             | `px-6` (sm+)                               |
| **Hide/Show**               | `lg:hidden`        | `hidden lg:flex` / `hidden lg:block`       |

---

## 20. Dark/Light Mode Implementation

### 20.1 Strategie

1. **System-Präferenz** als Default (`prefers-color-scheme`)
2. **Dark Mode** ist der Primäre Modus (aktueller Zustand)
3. **Light Mode** = invertiert (off-white Background `#f8f7f5`, Cards weiß, dunkle Texte, gleiche Akzente)
4. **User Override** via Toggle, gespeichert in `localStorage`

### 20.2 Erweiterte Token-Definitionen (globals.css Zielzustand)

```css
:root {
  /* === PRIMITIVES === */
  /* (von Tailwind bereitgestellt via --color-*) */

  /* === SEMANTIC TOKENS — Dark Mode (Default) === */
  --background:       var(--color-zinc-950);
  --foreground:       var(--color-zinc-100);
  
  --surface:          var(--color-zinc-900);
  --surface-hover:    var(--color-zinc-800);
  --surface-raised:   var(--color-zinc-800);
  --surface-overlay:  rgba(9, 9, 11, 0.95);   /* zinc-950/95 */
  --surface-sunken:   var(--color-black);
  
  --text-primary:     var(--color-white);
  --text-secondary:   var(--color-zinc-400);
  --text-muted:       var(--color-zinc-500);
  --text-disabled:    var(--color-zinc-600);
  
  --border:           var(--color-zinc-800);
  --border-subtle:    rgba(39, 39, 42, 0.5);   /* zinc-800/50 */
  --border-hover:     var(--color-zinc-700);
  --border-active:    var(--color-zinc-600);
  
  --brand:            var(--color-cyan-500);
  --brand-hover:      var(--color-cyan-400);
  --brand-dim:        var(--color-cyan-900);
  --brand-bg:         var(--color-cyan-950);
  --brand-bg-hover:   rgba(8, 51, 68, 0.4);    /* cyan-950/40 */
  
  --accent-orange:    var(--color-orange-400);
  --accent-purple:    var(--color-purple-400);
  
  --success:          var(--color-emerald-500);
  --success-bg:       rgba(6, 78, 59, 0.1);    /* emerald-900/10 */
  --warning:          var(--color-yellow-400);
  --warning-bg:       rgba(234, 179, 8, 0.1);  /* yellow-500/10 */
  --error:            var(--color-red-400);
  --error-bg:         rgba(239, 68, 68, 0.1);  /* red-500/10 */
  --rating:           var(--color-amber-400);
  --like:             var(--color-red-500);
  
  /* Scrollbar */
  --scrollbar-track:  var(--color-zinc-950);
  --scrollbar-thumb:  var(--color-zinc-800);
  --scrollbar-thumb-hover: var(--color-zinc-600);
}

/* === LIGHT MODE === */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --background:       #f8f7f5; /* off-white — verhindert Kontrastprobleme vs. white cards */
    --foreground:       var(--color-zinc-900);
    
    --surface:          var(--color-white);
    --surface-hover:    var(--color-zinc-100);
    --surface-raised:   var(--color-white);
    --surface-overlay:  rgba(248, 247, 245, 0.95);
    --surface-sunken:   var(--color-zinc-100);
    
    --text-primary:     var(--color-zinc-950);
    --text-secondary:   var(--color-zinc-600);
    --text-muted:       var(--color-zinc-500);
    --text-disabled:    var(--color-zinc-400);
    
    --border:           var(--color-zinc-200);
    --border-subtle:    var(--color-zinc-100);
    --border-hover:     var(--color-zinc-300);
    --border-active:    var(--color-zinc-400);
    
    --brand:            var(--color-cyan-600);
    --brand-hover:      var(--color-cyan-700);
    --brand-dim:        var(--color-cyan-100);
    --brand-bg:         var(--color-cyan-50);
    --brand-bg-hover:   var(--color-cyan-100);
    
    --accent-orange:    var(--color-orange-600);
    --accent-purple:    var(--color-purple-600);
    
    --success:          var(--color-emerald-600);
    --success-bg:       var(--color-emerald-50);
    --warning:          var(--color-yellow-600);
    --warning-bg:       var(--color-yellow-50);
    --error:            var(--color-red-600);
    --error-bg:         var(--color-red-50);
    --rating:           var(--color-amber-500);
    --like:             var(--color-red-500);
    
    --scrollbar-track:  var(--color-zinc-50);
    --scrollbar-thumb:  var(--color-zinc-300);
    --scrollbar-thumb-hover: var(--color-zinc-400);
  }
}

/* === EXPLICIT OVERRIDES === */
[data-theme="dark"] {
  /* Dark Mode Tokens — identisch mit :root defaults */
  /* (nur nötig wenn System auf Light steht, User aber Dark will) */
  --background:       var(--color-zinc-950);
  --foreground:       var(--color-zinc-100);
  /* ... (alle Dark-Werte wiederholen) */
}

[data-theme="light"] {
  /* Light Mode — identisch mit @media light oben */
  --background:       #f8f7f5; /* off-white */
  --foreground:       var(--color-zinc-900);
  /* ... (alle Light-Werte wiederholen) */
}
```

### 20.3 Tailwind v4 Theme-Mapping

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-surface-raised: var(--surface-raised);
  --color-surface-overlay: var(--surface-overlay);
  --color-surface-sunken: var(--surface-sunken);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-text-disabled: var(--text-disabled);
  --color-border: var(--border);
  --color-border-subtle: var(--border-subtle);
  --color-border-hover: var(--border-hover);
  --color-border-active: var(--border-active);
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-brand-dim: var(--brand-dim);
  --color-brand-bg: var(--brand-bg);
  --color-brand-bg-hover: var(--brand-bg-hover);
  --color-accent-orange: var(--accent-orange);
  --color-accent-purple: var(--accent-purple);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-warning: var(--warning);
  --color-warning-bg: var(--warning-bg);
  --color-error: var(--error);
  --color-error-bg: var(--error-bg);
  --color-rating: var(--rating);
  --color-like: var(--like);
  
  /* Radius Tokens */
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  
  /* Font Tokens */
  --font-family-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-family-mono: var(--font-geist-mono), ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
}
```

### 20.4 ThemeProvider Konzept

```tsx
// app/context/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'system' | 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'dark' | 'light';
}>({ theme: 'system', setTheme: () => {}, resolved: 'dark' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('botllab-theme') as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('botllab-theme', theme);
  }, [theme]);

  const resolved = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### 20.5 Migrations-Checkliste: Primitive → Tokens

Bei der Migration einer Komponente:

| Primitive (vorher)               | Token (nachher)                    |
|:---------------------------------|:-----------------------------------|
| `bg-zinc-950`                    | `bg-background`                    |
| `bg-zinc-900`                    | `bg-surface`                       |
| `bg-zinc-800`                    | `bg-surface-hover`                 |
| `text-white`                     | `text-text-primary`                |
| `text-zinc-300`, `text-zinc-400` | `text-text-secondary`              |
| `text-zinc-500`                  | `text-text-muted`                  |
| `text-zinc-600`                  | `text-text-disabled`               |
| `text-cyan-400`, `text-cyan-500` | `text-brand`                       |
| `border-zinc-800`                | `border-border`                    |
| `hover:border-zinc-700`          | `hover:border-border-hover`        |
| `text-red-400`                   | `text-error`                       |
| `text-amber-400`                 | `text-rating`                      |
| `text-emerald-500`               | `text-success`                     |

> **Wichtig**: Gradient-Klassen mit multiplen Stops (z.B. `from-black/95 via-black/50 to-transparent`) funktionieren nicht einfach mit CSS Vars. Diese müssen als custom utility classes oder inline-styles migriert werden.

### 20.6 Light-Mode-Spezialfälle

| Situation                                | Dark Mode                  | Light Mode Lösung                       |
|:-----------------------------------------|:---------------------------|:----------------------------------------|
| **Image Overlays** (Text auf Bild)       | `from-black/95`            | Bleibt `from-black/95` (immer dunkel)   |
| **Backdrop Blur**                        | `bg-zinc-950/95`           | `bg-white/95`                           |
| **Glassmorphism Badges** (auf Bildern)   | `bg-black/60 backdrop-blur`| Bleibt identisch (auf Bild = immer dunkel) |
| **Scrollbar**                            | Dark Track                 | Light Track via Token                   |
| **Code/Mono Blöcke**                     | Dark bg immer              | Optional: Light bg mit border           |

---

## 21. Do's & Don'ts

### ✅ Do's

| Regel | Beispiel |
|:------|:---------|
| Nutze semantische Tokens statt Primitives | `bg-surface` statt `bg-zinc-900` |
| Nutze `font-black` für Headings | `text-3xl font-black` |
| Nutze `rounded-2xl` für Cards | Konsistente Kartenstile |
| Nutze `transition-all duration-200` als Default-Transition | Alle interaktiven Elemente |
| Nutze `group` + `group-hover:` für verknüpfte Hover-Effekte | Card → Image Zoom |
| Nutze `truncate` für einzeilige Textkürzung | Card-Titel |
| Nutze `tabular-nums` für Zahlen in Metriken | Rating-Zähler, KPIs |
| Nutze `backdrop-blur-md` für glasartige Overlays | Header, Badges |
| Nutze `max-w-7xl mx-auto px-4 sm:px-6` als Page-Container | Konsistentes Layout |
| Nutze `shrink-0` für Avatare und Icons in Flex-Layouts | Verhindert Größenverzerrung |
| Nutze `min-w-0` für Flex-Children mit Truncation | Ermöglicht korrektes Kürzen |
| Nutze `flex-1 min-w-0` für den Content-Bereich in Sidebar-Layouts | Responsive Flex |

### ❌ Don'ts

> ## ⛔ ABSOLUTES VERBOT: KEINE EMOJIS
> **Emojis sind in der gesamten BotlLab UI strikt verboten.** Keine Emojis in Buttons, Labels, Überschriften, Fehlermeldungen, Erfolgsmeldungen, Feature-Listen, Platzhaltertext oder sonstigen UI-Texten. Ausschließlich Lucide-React-Icons für visuelle Symbolik verwenden. Wer Emojis einfügt, verstößt gegen das Design System.

| Regel | Stattdessen |
|:------|:------------|
| Keine `font-normal`/`font-light` für UI-Text | Mindestens `font-medium` |
| Keine Emojis in UI-Texten, Buttons oder Nachrichten | Lucide-React-Icons verwenden |
| Keine `rounded-md` | Entweder `rounded-lg` oder `rounded-xl` |
| Keine `bg-gray-*` Palette | Nutze `zinc-*` |
| Keine festen Höhen für Cards (`h-80` etc.) | Flexibles Layout mit `aspect-*` oder `min-h-*` |
| Keine `opacity-*` auf ganzen Cards | Nutze Gradient-Overlays |
| Kein `px-2` als Page-Padding | Mindestens `px-4` |
| Keine inline `style={{}}` für Farben | Nutze Tailwind-Klassen oder Tokens |
| Keine alternative Icon-Libraries | Nur Lucide React |
| Kein `text-[#hexwert]` | Nur benannte Tailwind-Farben |
| Kein `shadow-sm` | Mindestens `shadow-md` oder gar nichts |

---

## Anhang A: Komponentenreferenz-Tabelle

| Komponente               | Datei                                            | Varianten                          |
|:-------------------------|:-------------------------------------------------|:-----------------------------------|
| DiscoverBrewCard         | `app/components/DiscoverBrewCard.tsx`             | hero, portrait, compact, highlight |
| BrewCard                 | `app/components/BrewCard.tsx`                     | Standard (legacy)                  |
| Header                   | `app/components/Header.tsx`                       | Desktop, Mobile                    |
| Logo                     | `app/components/Logo.tsx`                         | With/without text                  |
| LikeButton               | `app/components/LikeButton.tsx`                   | default, card                      |
| ReportButton             | `app/components/reporting/ReportButton.tsx`        | —                                  |
| PremiumBadge             | `app/components/PremiumBadge.tsx`                  | sm, md, lg                         |
| NotificationBell         | `app/components/NotificationBell.tsx`              | —                                  |
| CustomSelect             | `app/components/CustomSelect.tsx`                  | —                                  |
| BrewHero                 | `app/brew/[id]/components/BrewHero.tsx`            | Mobile, Desktop                    |
| BrewTabNav               | `app/brew/[id]/components/BrewTabNav.tsx`          | Mobile (horizontal), Desktop (sidebar) |
| BrewRecipeTab            | `app/brew/[id]/components/BrewRecipeTab.tsx`       | —                                  |
| BrewRatingsTab           | `app/brew/[id]/components/BrewRatingsTab.tsx`      | —                                  |
| BrewCommentsTab          | `app/brew/[id]/components/BrewCommentsTab.tsx`     | —                                  |
| BrewSimilarTab           | `app/brew/[id]/components/BrewSimilarTab.tsx`      | —                                  |
| BrewActionButton         | `app/brew/[id]/components/BrewActionButton.tsx`    | accent, active, inactive           |
| MinimalStickyHeader      | `app/brew/[id]/components/MinimalStickyHeader.tsx` | visible, hidden                    |
| FlavorTagCloud           | `app/brew/[id]/components/FlavorTagCloud.tsx`      | —                                  |

---

## Anhang B: Migrations-Reihenfolge

> Empfohlene Reihenfolge für die Token-Migration (Primitive → Semantische Tokens):

1. **globals.css** — Token-Definitionen erweitern (Section 20.2 + 20.3)
2. **ThemeProvider** — Erstellen und in Layout einbinden (Section 20.4)
3. **Header** — Erstes visuelles Feedback, auf jeder Seite sichtbar
4. **DiscoverBrewCard** — Meistgenutzte Komponente, 4 Varianten
5. **BrewHero + BrewActionButton** — Brew Detail Page
6. **BrewTabNav + MinimalStickyHeader** — Navigation
7. **CustomSelect** — Formulare
8. **Alle Tab-Contents** (Recipe, Ratings, Comments, Similar)
9. **Seiten-spezifische Styles** (page.tsx-Dateien)
10. **Legacy-Komponenten** (BrewCard, etc.)

---

*Dieses Dokument ist die Single Source of Truth für alle Design-Entscheidungen im BotlLab Projekt. Bei Widersprüchen zwischen diesem Dokument und dem bestehenden Code gilt dieses Dokument als Referenz für den Zielzustand.*
