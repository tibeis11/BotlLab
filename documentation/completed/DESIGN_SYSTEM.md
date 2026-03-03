# BotlLab Design System v2.1 (Analytics & Dashboard Update)

## 1. Design-Philosophie

**"Pro-Grade Data & Clarity"**  
Ein minimalistisches, kontrastreiches Dark-Mode Interface, optimiert für komplexe Datenvisualisierungen und Dashboards. Wir nutzen die volle Bildschirmbreite, subtile Gradients und präzise Typografie, um professionelle Tools für Brauereien bereitzustellen.

---

## 2. Layout & Grid-Systeme

### A. Dashboard & Analytics Layouts

Für datenintensive Bereiche (/team/\*/analytics, /admin, /dashboard).

- **Page Container:** `max-w-[1600px]` zentriert mit `mx-auto`.
- **Background:** `min-h-screen bg-black`.
- **Padding:** `p-4 sm:p-6 md:p-8`.
- **Spacing:** `space-y-6` oder `space-y-8`.

### B. Standard Layouts (Profile / Content)

Für öffentliche Profile oder Text-Seiten.

- **Page Container:** `max-w-6xl` oder `max-w-7xl`.
- **Vertical Spacing:** `pt-24` oder `pt-28` (Header Compensation).

### C. Sidebar Layout (Settings)

Für Konfigurations-Seiten (/team/\*/settings).

- **Grid:** `flex flex-col md:flex-row gap-8 lg:gap-12`.
- **Sidebar:** `w-full md:w-64 flex-shrink-0`.
- **Sticky:** `md:sticky md:top-32`.

---

## 3. Typografie

**Font Family:** System Fonts / Inter (`font-sans`).

### Hierarchie

1. **Page Title:** `text-2xl font-bold tracking-tight text-white` (Oft im Header).
2. **Section Title:** `text-xl font-bold text-white`.
3. **Card Title:** `text-lg font-bold text-white` oder `text-sm font-medium text-zinc-400` (Labels).
4. **Data Value:** `text-3xl font-black tracking-tight text-white`.
5. **Labels/Meta:** `text-[10px]` oder `text-xs`, `uppercase`, `tracking-wider`, `text-zinc-500`.

### Colors

- **Text Primary:** `text-white` or `text-zinc-100`.
- **Text Secondary:** `text-zinc-400` or `text-zinc-500`.
- **Accent Text:** `text-cyan-400` (Highlights), `text-purple-400` (Enterprise).

---

## 4. Komponenten & UI-Elemente

### Cards & Surfaces

- **Standard Card:** `bg-zinc-900 border border-zinc-800 rounded-xl p-6`.
- **Transparent Card:** `bg-zinc-900/50 border border-zinc-800 rounded-lg p-4` (Grid Items).
- **Settings Panel:** `bg-black border border-zinc-800 rounded-lg p-6`.
- **Glow Card:** `relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-900/20 rounded-2xl border border-zinc-800` (Upsell/Feature).

### Navigation & Tabs

- **Page Tabs:**
  - Container: `flex gap-8 border-b border-zinc-800`.
  - Item: `pb-4 text-sm font-medium transition-all relative`.
  - Active: `text-white` + `absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]`.
  - Inactive: `text-zinc-500 hover:text-zinc-300`.

- **Control Bar / Filters:**
  - Container: `flex bg-black rounded-lg border border-zinc-800 p-1`.
  - Toggle Item: `px-3 py-1.5 rounded-md text-xs font-medium`.
  - Toggle Active: `bg-zinc-800 text-white shadow-sm`.
  - Toggle Inactive: `text-zinc-500 hover:text-zinc-300`.

### Buttons & Actions

- **Primary Action (Brand):** `bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold rounded-lg hover:from-cyan-400 hover:to-blue-400`.
- **Primary Action (Neutral):** `bg-white text-black font-bold hover:bg-zinc-200`.
- **Secondary Action:** `bg-zinc-800 text-white font-bold hover:bg-zinc-700`.
- **Ghost/Icon Button:** `bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800`.
- **Utility:** `w-full bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium`.

### Tier Badges

- **Base:** `px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide`.
- **Free:** `bg-zinc-800 text-zinc-400 border-zinc-700`.
- **Brewer:** `bg-cyan-950/30 text-cyan-400 border-cyan-900`.
- **Brewery:** `bg-purple-950/30 text-purple-400 border-purple-900`.
- **Enterprise:** `bg-blue-950/30 text-blue-400 border-blue-900`.

---

## 5. Farben (Palette)

### Neutral (Zinc)

- **Background:** `bg-black` (Main).
- **Surface:** `bg-zinc-900` (Cards).
- **Border:** `border-zinc-800` (Divider).
- **Input:** `bg-zinc-950` (Inputs), `bg-zinc-800` (Active Filters).

### Accents

- **Cyan:** `text-cyan-400`, `bg-cyan-500`, `border-cyan-900` (Primary Brand, Links, Active States).
- **Purple:** `text-purple-400`, `to-purple-900/20` (Premium/Enterprise).
- **Blue:** `text-blue-400` (Info, Pro Tier).
- **Red:** `text-red-400`, `bg-red-500/10` (Errors/Danger).
- **Green:** `text-emerald-400`, `bg-emerald-500/10` (Success).

---

## 6. Icons

- **Library:** `lucide-react`.
- **Style:** Stroke width default or slightly bold (`2px`).
- **Use Case:** Visuelle Anker neben Titeln oder in Buttons (`<Download size={16} />`).

---

## 7. Email Design (Neu)

Striktes "Clean Paper" Design für System-Notifications.

- **Background:** `#f8fafc` (Slate-50).
- **Container:** White Card, Shadow-sm, Rounded-lg.
- **Button:** Black background, White text.
- **Header:** Minimal Logo Only.
