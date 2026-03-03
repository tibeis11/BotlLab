# Projekt-Spezifikation: BotlLab (Update 2.6 - Paid Subscriptions Ready)

## 1. Vision & Mission

**BotlLab** ist eine digitale Verwaltungsplattform für Hobby-Brauer und Brau-Gemeinschaften. Sie löst das Problem von Einweg-Etiketten bei Mehrweg-Flaschen durch **"Ewige Etiketten"**. Jede Flasche besitzt eine permanente ID (QR/NFC), die dynamisch mit einem digitalen Sud-Profil verknüpft wird.

In Version 2.0 entwickelt sich BotlLab zu einer **Social-Brau-Plattform** weiter, mit Fokus auf Teams (Squads), Gamification (Tiers) und Community-Features. Version 2.6 führt das **Premium Subscription System** (Stripe) ein, geschützt durch eine "Commercial Barrier" bis zur Gewerbeanmeldung.

> **Slogan:** Digital Brew Lab

## 2. Kern-Features

### Duale Interfaces

- **Consumer-UI (Public View):** Mobile-First Web-Ansicht für Gäste. Scan zeigt digitales Etikett, ermöglicht Bewertungen und Absprung zum Brauerei-Profil. Neu: High-End "Cyberpunk" Ästhetik.
- **Brauer-UI (Mission Control):** Passwortgeschützter Bereich zum Verwalten von Suden, Flaschen, Squads und Analytics.
- **Admin-Dashboard (Neu):** Geschützter Bereich für Plattform-Betreiber zur Analyse der Nutzung (KPIs) und Systemüberwachung.

### Subscription & Monetarisierung (Neu)

- **Stripe Integration:** Vollständige Integration von Stripe Checkout & Webhooks.
- **Tiers:** Free, Brewer (€4.99), Brewery (€14.99) und Enterprise (Early Access).
- **Legal Compliance:** § 312k BGB (Kündigungsbutton) und EU-Widerrufsrecht implementiert.
- **Commercial Barrier:** Zahlungen sind technisch möglich, aber bis zur Gewerbeanmeldung deaktiviert (`NEXT_PUBLIC_ENABLE_PAYMENTS`).

### Social Brewing & Squads

- **Squad-System:** Brauereien können mehrere Mitglieder haben. Invite-Codes ermöglichen das Beitreten.
- **Activity Feed:** Live-Feed auf dem Dashboard zeigt Events: `BREW_CREATED`, `MEMBER_JOINED`, `ACHIEVEMENT`, `BREW_RATED`.
- **Rollen:** Owner & Member Rechteverwaltung.

### Gamification & Tiers

Ein Progressions-System motiviert Brauer, aktiv zu bleiben.

- **Tiers:** `Garage` → `Micro` → `Craft` → `Industrial`.
- **Mechanik:** Aufstieg basiert auf `totalFills`, `teamPosts` und `activeMembers`.
- **Limits:** Höhere Tiers schalten mehr Sude, Flaschen und Team-Plätze frei.

### Data Strategy & Privacy (Neu)

Ein DSGVO-konformer ("Legitimate Interest") Ansatz zur Datenerhebung für zukünftige Monetarisierung.

- **Privacy-First:** Keine externen Tracker (Google/Meta). Eigene "In-House" Lösung.
- **Opt-Out:** User können das Tracking in den Einstellungen (`/dashboard/account`) deaktivieren.
- **Transparenz:** Cookie Banner und Datenschutz-Seite informieren über Zweck (Produktverbesserung).

### KI & Automation

- **Google Gemini Integration:** Nutzung der Gemini API für kreative Sud-Beschreibungen und (experimentell) Bildgenerierung.
- **Auto-Moderation:** `bad-words` Filter und IP-basierte Checks für Ratings.

## 3. Technischer Stack

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Library:** React 19 (RC/Latest)
- **Styling:** Tailwind CSS v4, PostCSS
- **Backend & DB:** Supabase (PostgreSQL, Auth, Storage, RLS-Policies)
- **Visualisierung:** Recharts (für Admin Charts)
- **AI:** Google Gemini API (`@google/generative-ai`)
- **Scanner:** html5-qrcode
- **Gamification:** `canvas-confetti` für Celebrations

## 4. Datenbank-Architektur (Erweitert)

```sql
profiles (Brauerei & User Hybrid)
- id, brewery_name, tier (garage/micro...), stats (fills, xp)
- analytics_opt_out (BOOLEAN DEFAULT false) -- Neu: Tracking Präferenz

analytics_events (Neu: Business Intelligence)
- id, user_id (nullable), event_type (LOGIN, PAGE_VIEW, FEATURE_USE), category
- payload (JSONB), path, user_agent, created_at

brewery_members (Squads)
- brewery_id, user_id, role (owner/member), joined_at

brewery_feed (Activity Log)
- id, brewery_id, user_id, type (POST, BREW_CREATED...), content (JSON)

achievements (Gamification)
- id, key (first_brew, social_star...), name, description, icon

squad_achievements
- brewery_id, achievement_id, unlocked_at

brews, bottles, assignments, ratings
- (Wie gehabt, optimiert mit FK-Constraints)
```

## 5. User Flows

### A. Der Consumer-Flow (Scan & Explore)

1.  Gast scannt QR-Code → Landet auf `/b/[id]`.
2.  Ansicht bietet Sud-Details, Story und Rating-Formular.
3.  Klick auf Brauerei führt zu `/brewery/[id]` (Öffentliches Profil mit Stats & Feed).

### B. Der Brauer-Flow (Gamified)

1.  **Dashboard:** Zeigt "Mission Control" mit aktuellen KPIs, Tier-Progress und Activity Feed.
2.  **Brewing:** Erstellen eines Suds triggered Feed-Event `BREW_CREATED`.
3.  **Bottling:** Zuweisen von Flaschen erhöht `totalFills` → Fortschrittsbalken zum nächsten Tier füllt sich.
4.  **Privacy:** Kann im Account-Bereich das Tracking deaktivieren -> `analytics_opt_out` wird `true`.

### C. Tier Progression

1.  Start als **Garage Brewery** (5 Sude, 50 Flaschen).
2.  Erreichen von Zielen (z.B. 1 aktiver Member, 50 Fills) erlaubt Upgrade.
3.  Upgrade schaltet **Micro Brewery** frei (neue Assets, höhere Limits).

### D. Admin-Flow (Insights)

1.  Aufruf `/admin/dashboard`.
2.  **Security Check:** Auth User Email muss in `ADMIN_EMAILS` (.env) gelistet sein.
3.  **Ansicht:**
    - Live Events (Letzte 50 Aktionen).
    - Charts (Events letzte 7 Tage, Kategorienverteilung).
    - Top Features (Was wird am meisten genutzt?).

## 6. Design & UX Guidelines (v2.0)

Siehe `DESIGN_SYSTEM.md` für Details.

- **Visueller Stil:** Cyberpunk / High-Tech Lab.
- **Farben:** Zinc-950 (Deep Dark) mit Cyan-500 (Neon Highlights).
- **Typografie:** Geist Sans + Geist Mono.
- **Admin-UI:** Reduziert, Daten-zentriert, Monospace Fonts für Tables.

## 7. Security & Berechtigungen

- **Erweitertes RLS:** Policies unterscheiden nun zwischen:
- **Service Role Bypass:** Ausschließlich im Admin-Dashboard genutzt, um globale Statistiken zu lesen (via `SUPABASE_SERVICE_ROLE_KEY`).
- **Zugriffskontrolle:** Admin-Routen sind per Server-Side Logic und Environment-Variables (`ADMIN_EMAILS`) geschützt. User werden auf Login oder 403-Seite umgeleitet.
  - `Public` (Jeder darf lesen)
  - `Squad Member` (Darf interne Daten lesen)
  - `Owner` (Darf Einstellungen ändern/löschen)
- **Invite System:** Codes sind kryptografisch generiert und haben Ablauf/Usage-Limits.

## 8. Deployment

- **Hosting:** Vercel
- **Env-Vars:** `NEXT_PUBLIC_SUPABASE_URL`, `GOOGLE_AI_API_KEY`, etc.

## 9. Offene Punkte / Backlog (Kurz)

- Analytics/Tracking-Tool noch nicht integriert (derzeit kein Cookie-Consent nötig über Essenzielles hinaus).
- Weitere Data-Visualisierung im Dashboard (Rating-Verteilung, Trends).
- Optional: Custom Domain/CNAME für statische Assets (CDN).
