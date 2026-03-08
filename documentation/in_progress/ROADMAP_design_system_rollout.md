# Roadmap: Discover Design System Rollout

Ziel: Alle Seiten der App an das offizielle **BotlLab Design System** (`DESIGN_SYSTEM.md`) angleichen, inklusive Dark/Light Mode via semantische Design Tokens.

Referenz-Dokument: `documentation/manuals/DESIGN_SYSTEM.md`

---

## Legende

| Status | Bedeutung |
|--------|-----------|
| ✅ | Bereits konform / abgehakt |
| 🔲 | Noch offen |

---

## Öffentliche Seiten (Consumer-Facing)

| Status | Seite | Pfad | Anmerkungen |
|--------|-------|------|-------------|
| ✅ | **Discover** | `/discover` | Goldstandard / Referenz-Seite |
| ✅ | **Brew Detail** | `/brew/[id]` | 3 Mini-Fixes applied (Badges, Hero-Zoom, Comment-Button) |
| ✅ | **Startseite / Landing** | `/` | 384 Zeilen, 0 zinc — vollständig konform |
| ✅ | **Brewer Profil** | `/brewer/[id]` | Full redesign: MinimalStickyHeader, cinematic hero, tab nav (mobile scroll + desktop sidebar), DiscoverBrewCard grid, KPI row, Sammlung/Bewertungen/Aktivität tabs |
| ✅ | **Brewery Profil** | `/brewery/[id]` | page + alle Komponenten sauber |
| ✅ | **Brew Short-Link** | `/b/[id]` | page (1260 Z.) + 16 Komponenten (RateBrewModal, VibeCheck, StashButton, BrewBounties, RatingCTABlock, TasteSlider, FlavorTagSelector, GeoConsentPrompt, BottleLabelSkeleton, DrinkingConfirmationPrompt, ShopLink, IngredientList, BeatAFriendShare, BeatTheBrewerGame, error.tsx) — vollständig konform |
| ✅ | **Login** | `/login` | Komplett neu gestaltet: Mode-Picker (Brauer/Consumer), dual-theme (amber/cyan), alle Tokens ✓ |
| ✅ | **Passwort Reset** | `/auth/reset-password` | 13 zinc — erledigt |
| ✅ | **Pricing** | `/pricing` | 252 Zeilen, 0 zinc |

## Forum

| Status | Seite | Pfad | Anmerkungen |
|--------|-------|------|-------------|
| ✅ | **Forum Übersicht** | `/forum` | Alle Komponenten sauber |
| ✅ | **Forum Thread** | `/forum/thread/[id]` | Alle Komponenten sauber |
| ✅ | **Forum Neuer Beitrag** | `/forum/create` | NewThreadForm, PollCreator sauber |
| ✅ | **Forum Kategorie** | `/forum/[slug]` | |
| ✅ | **Forum Rezept-Kommentare** | `/forum/rezept-kommentare` | |
| ✅ | **Forum Gespeichert** | `/forum/saved` | |

## Dashboard (Consumer)

| Status | Seite | Pfad | Anmerkungen |
|--------|-------|------|-------------|
| ✅ | **Dashboard Übersicht** | `/dashboard` | page + layout + AdminHeader sauber |
| ✅ | **Dashboard Account** | `/dashboard/account` | Redirect → /account (5-Zeilen-Wrapper) |
| ✅ | **Dashboard Achievements** | `/dashboard/achievements` | Silver-Tier-Fixes — erledigt |
| ✅ | **Dashboard Collection** | `/dashboard/collection` | |
| ✅ | **Dashboard Favorites** | `/dashboard/favorites` | |
| ✅ | **Dashboard Team** | `/dashboard/team` | 1 Fix — erledigt |

## My Cellar (Consumer)

| Status | Seite | Pfad | Anmerkungen |
|--------|-------|------|-------------|
| ✅ | **My Cellar Übersicht** | `/my-cellar` | page, ConsumerHeader, DrinkTimeline, ConsumerStatsCard — vollständig konform |
| ✅ | **My Cellar Collection** | `/my-cellar/collection` | page + Subkomponenten sauber |
| ✅ | **My Cellar Favorites** | `/my-cellar/favorites` | page + Subkomponenten sauber |
| ✅ | **My Cellar Leaderboard** | `/my-cellar/leaderboard` | LeaderboardClient vollständig konform |
| ✅ | **My Cellar Settings** | `/my-cellar/settings` | Wrapper/Redirect — sauber |
| ✅ | **My Cellar Stash** | `/my-cellar/stash` | StashClient vollständig konform |
| ✅ | **My Cellar Taste DNA** | `/my-cellar/taste-dna` | TasteDNAClient vollständig konform |

## Team / Brewery (B2B)

| Status | Seite | Pfad | Anmerkungen |
|--------|-------|------|-------------|
| ✅ | **Team Home** | `/team/[breweryId]` | |
| ✅ | **Team Dashboard** | `/team/[breweryId]/dashboard` | BreweryTierWidget + AdminPlanSwitcher + TopBrewsWidget — erledigt |
| ✅ | **Team Brews Liste** | `/team/[breweryId]/brews` | |
| ✅ | **Team Brew Editor** | `/team/[breweryId]/brews/[brewId]/edit` | Sleek Cards + Danger Zone card (Settings-Muster) |
| ✅ | **Team Brew Neu** | `/team/[breweryId]/brews/new` | page + alle Komponenten sauber |
| ✅ | **Team Sessions** | `/team/[breweryId]/sessions` | |
| ✅ | **Team Session Detail** | `/team/[breweryId]/sessions/[sessionId]` | Wenige 1-3 zinc Reste in Minor-Komponenten |
| ✅ | **Team Neue Session** | `/team/[breweryId]/sessions/new` | 39 zinc — erledigt |
| ✅ | **Team Quick Session** | `/team/[breweryId]/sessions/new-quick` | page + QuickSessionForm sauber |
| ✅ | **Team Analytics** | `/team/[breweryId]/analytics` | 39 Dateien, ~1100+ Replacements, Chart hex→CSS vars |
| ✅ | **Team Brew Analytics** | `/team/[breweryId]/analytics/brew/[brewId]` | 1 Minor verbleibend |
| ✅ | **Team Bounties** | `/team/[breweryId]/bounties` | BountiesClient 1 Minor |
| ✅ | **Team Bounty Neu** | `/team/[breweryId]/bounties/new` | NewBountyClient 24 — erledigt |
| ✅ | **Team Feed** | `/team/[breweryId]/feed` | |
| ✅ | **Team Inventory** | `/team/[breweryId]/inventory` | Full token migration |
| ✅ | **Team Labels** | `/team/[breweryId]/labels` | Full token migration (Liste) |
| 🔲 | **Team Label Editor** | `/team/[breweryId]/labels/editor/[templateId]` | EditorSidebar 73, LabelEditor 26, LayerPanel 7 |
| ✅ | **Team Members** | `/team/[breweryId]/members` | Full token migration |
| ✅ | **Team Settings** | `/team/[breweryId]/settings` | Inkl. TeamKnowledgeManager, Danger Zone Muster |
| ✅ | **Team Join** | `/team/join/[breweryId]` | 5 zinc — erledigt |

## Admin & Sonstiges

| Status | Seite | Pfad | Anmerkungen |
|--------|-------|------|-------------|
| 🔲 | **Admin Dashboard** | `/admin/dashboard` | 12 in page + viele Views (66–28 zinc je View) |
| ✅ | **Account** | `/account` | Full migration inkl. Header, alle Tabs, mode-aware Layout (AdminHeader/ConsumerHeader) |
| ✅ | **Appeal** | `/appeal` | 17 zinc — erledigt |
| 🔲 | **Seed (Dev)** | `/seed` | Niedrige Priorität |
| ✅ | **Impressum** | `/impressum` | 3 zinc — erledigt |
| ✅ | **Privacy** | `/privacy` | 15 zinc + Emojis — erledigt |
| ✅ | **Terms** | `/terms` | 12 zinc — erledigt |

---

## Fortschritt

**Abgehakt:** 49 / 55 Seiten  
**Offen:** 6 Seiten

### Wichtigste offene Baustellen
| Priorität | Datei / Seite | zinc-Treffer |
|-----------|--------------|-------------|
| 🟠 Mittel | `app/components/label-editor/EditorSidebar.tsx` | 73 |
| 🟠 Mittel | `app/components/label-editor/LabelEditor.tsx` | 26 |
| 🟠 Mittel | `app/components/label-editor/LayerPanel.tsx` | 7 |
| 🟠 Mittel | `/admin/dashboard` | 12 in page + Views |
| 🟡 Niedrig | `/privacy` | 15 zinc |
| 🟡 Niedrig | `/terms` | 12 zinc |
