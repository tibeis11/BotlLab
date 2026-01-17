# Projekt-Spezifikation: BotlLab (Update 1.3)

## 1. Vision & Mission

**BotlLab** ist eine digitale Verwaltungsplattform für Hobby-Brauer. Sie löst das Problem von Einweg-Etiketten bei Mehrweg-Flaschen durch **"Ewige Etiketten"**. Jede Flasche besitzt eine permanente ID (QR/NFC), die dynamisch mit einem digitalen Sud-Profil verknüpft wird.

> **Slogan:** Digital Labeling Reimagined.

## 2. Kern-Features

### Duale Interfaces

- **Consumer-UI (Gast-Ansicht):** Mobile-First Web-Ansicht (ohne Login). Scan zeigt digitales Etikett, ermöglicht Bewertungen (Feedback-Loop) und Absprung zum Brauerei-Profil.
- **Brauer-UI (Dashboard):** Passwortgeschützter Bereich zum Verwalten von Suden, Flaschen-Inventar (Batch-Erstellung), Analytics und KI-Generierung.

### KI-Label-Generator

Integration der **OpenAI DALL-E API** zur Erstellung individueller Etiketten-Grafiken basierend auf Sud-Beschreibungen (Bier, Wein, Softdrinks).

### Feedback & Sicherheit

- **Rating-System:** 5-Sterne Bewertungen mit Kommentaren für Konsumenten.
- **Anti-Bot Strategie:** Client-seitige Honeypot-Felder und Time-to-Complete Checks zur Spam-Vermeidung.
- **Moderation:** Brauer können Bewertungen moderieren (Soft-Delete) und sehen Statistiken pro Sud.

### Brand Identity

- **Öffentliches Profil:** Personalisierbare Brauerei-Seite (`/brewery/[id]`) mit Logo und Social Links.
- **Portfolio:** Automatische Auflistung aller öffentlichen Sude inkl. Durchschnittsbewertungen.

## 3. Technischer Stack

- **Framework:** Next.js 16 (App Router)
- **Sprache:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS, Lucide Icons
- **Backend & DB:** Supabase (PostgreSQL, Auth, Storage, RLS-Policies)
- **KI-Schnittstelle:** OpenAI API (DALL-E 3)
- **Scanner:** html5-qrcode (Core API, manuelles Start/Stop, Cleanup-Fix)
- **Hosting:** Vercel (Production: botllab.vercel.app)

## 4. Datenbank-Architektur (Supabase)

```sql
profiles (Brauerei-Identität)
- id (FK -> auth.users), brewery_name, bio, location, founded_year, website
- logo_url

brews (Rezepte & Sude)
- id, user_id, name, style, abv, ibu, description, image_url
- brew_type (enum: beer, wine, softdrink), data (jsonb: hops, malts, grapes, etc.)

bottles (Hardware Inventar)
- id (z.B. "BL-001"), user_id, status (full/empty), qr_code_url

assignments (Mapping: Welcher Sud ist in welcher Flasche?)
- id, bottle_id, brew_id, bottled_at, drunk_at

ratings (Feedback)
- id, brew_id, rating (1-5), comment, author_name
- created_at, ip_address, moderation_status (approved/deleted)
```

## 5. User Flows

### A. Der Consumer-Flow (Scan & Rate)

1.  Gast scannt QR-Code (URL: `botllab.de/b/BL-001`).
2.  System zeigt digitales Etikett des aktuellen Suds.
3.  Gast gibt 5-Sterne Bewertung & Kommentar ab (Bot-Check läuft im Hintergrund).
4.  Gast besucht via Link das öffentliche Brauerei-Profil.

### B. Der Brauer-Flow (Management)

1.  **Setup:** Brauer konfiguriert Profil (Logo, Name) im Admin-Bereich.
2.  **Produktion:** Brauer erstellt Sud (KI-Label) & generiert Batch von 50 neuen QR-Codes (PDF).
3.  **Insight:** Brauer sieht auf Dashboard Analytics Widget mit globaler Rating-Verteilung.
4.  **Moderation:** Brauer löscht unpassende Bewertungen via Modal in der Rezept-Liste.

### C. Auth & Onboarding

1. **Signup:** E-Mail + Passwort, Supabase-Confirmation-Mail mit Redirect zu `/auth/callback`.
2. **Login:** Verweigert, wenn E-Mail nicht bestätigt; Resend-Link möglich.
3. **Profile Setup:** Ring zeigt Fertigstellung (Name, Standort, Website, Bio, Gründungsjahr).
4. **Nudges:** Dashboard-Toast erinnert einmal pro Session an Profil-Vervollständigung.

## 6. Design & UX Guidelines

- **Consumer-View:** Immersive Experience, Fokus auf Visuals & "Vibe" des Getränks.
- **Brauer-View:** "Mission Control" Ästhetik (Dark Mode, Data-Dense, Dashboards).

## 7. Security, Privacy & Compliance

- **RLS:** Aktive Row-Level-Security auf `profiles`; Insert/Update-Policies für eigene User-ID.
- **Auth:** E-Mail-Bestätigung Pflicht, `/auth/callback` tauscht Code gegen Session.
- **Cookies:** Nur essenzielle Cookies (Session), Hinweis-Banner ohne Tracking.
- **Moderation:** Ratings können soft-gelöscht werden.

## 8. Deployment & Infrastruktur

- **Hosting:** Vercel (Production: https://botllab.vercel.app)
- **Assets:** Brand-Assets unter `public/brand/`, Favicon als SVG/ICO in `public/`.
- **API-Routen:** Next.js App Router (`/api/generate-text`, `/api/generate-image`, `/api/ratings/moderate`, etc.).

## 9. Offene Punkte / Backlog (Kurz)

- Analytics/Tracking-Tool noch nicht integriert (derzeit kein Cookie-Consent nötig über Essenzielles hinaus).
- Weitere Data-Visualisierung im Dashboard (Rating-Verteilung, Trends).
- Optional: Custom Domain/CNAME für statische Assets (CDN).
