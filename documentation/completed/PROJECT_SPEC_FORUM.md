# BotlLab Community Forum - Project Specification

**Status:** ⏸️ **On Hold / Future**  
**Priority:** Low  
**Datum:** 20.01.2026

## 1. Übersicht & Ziele

Ziel ist der Aufbau eines **öffentlichen Diskussionsforums** ("BotlLab Community") innerhalb der bestehenden App.

- **Lesen**: Öffentlich für jeden (Public Read), um SEO zu fördern und die Community sichtbar zu machen.
- **Schreiben**: Nur für registrierte Nutzer (Authenticated Write).
- **Thema**: Austausch über Rezepte, Brau-Tipps, Equipment und "Winter Kölsch"-Events.
- **Design**: Angelehnt an die existierende "Discover"-Page (Dark Mode, Kacheln/Listen, Clean UI).

---

## 2. Rechtliche & Organisatorische Anforderungen (Deutschland Focus)

Da der Betreiber in Deutschland sitzt, gelten strenge Anforderungen bezüglich **Störerhaftung**, **NetzDG** (indirekt über Sorgfaltspflicht) und **DSGVO**.

### 2.1 "Notice and Takedown" (Meldeverfahren)

- **Pflicht**: Wir müssen Kenntnis von Rechtsverstößen (Beleidigung, Urheberrecht, Volksverhetzung) erlangen können.
- **Lösung**: Implementation eines **"Melden"-Buttons** an jedem Thread und jedem Post.
- **Prozess**:
  1.  User klickt "Melden" -> Eintrag in `forum_reports` Tabelle.
  2.  Admin erhält Benachrichtigung (oder prüft Dashboard).
  3.  Inhalt wird geprüft -> bei Verstoß: **Löschung oder Unsichtbar-Schalten**.

### 2.2 Nutzungsbedingungen (Terms of Service)

Die Seite `/terms` muss erweitert werden um:

- **UGC-Klausel (User Generated Content)**: Nutzer räumen BotlLab das einfache Nutzungsrecht an ihren Texten ein (damit sie nicht gelöscht werden müssen, wenn der User geht, um den Thread-Kontext zu wahren).
- **Folgen von Verstößen**: Sperrung des Accounts bei wiederholtem Missbrauch.
- **Keine Haftungsübernahme** für Tipps (z.B. "Flasche explodiert").

### 2.3 Datenschutz (DSGVO)

- User müssen wissen, dass ihre Beiträge öffentlich sind.
- **Clean-up bei Account-Löschung**: Wenn ein User gelöscht wird (`auth.users`), kann der `display_name` im Forum auf "Gelöschter User" anonymisiert werden, der Text bleibt stehen (berechtigtes Interesse des Betreibers an der Thread-Konsistenz).

---

## 3. Datenbank Architektur (Supabase / PostgreSQL)

Wir benötigen eine saubere relationale Struktur.

### 3.1 Tabellen

#### A. `forum_categories`

Dient der Strukturierung (vermeidet Chaos).

- `id` (uuid, PK)
- `slug` (text, unique) - z.B. 'rezepte', 'technik' (für saubere URLs: `/forum/rezepte`)
- `title` (text)
- `description` (text)
- `icon` (text) - Name des Lucide-Icons
- `sort_order` (int)

#### B. `forum_threads`

Ein Diskussionsstrang.

- `id` (uuid, PK)
- `category_id` (uuid, FK auf `forum_categories`)
- `author_id` (uuid, FK auf `profiles.id`)
- `brew_id` (uuid, FK auf `brews.id`, nullable) - Optional: Link zu einem Rezept ("Diskutiere dieses Rezept")
- `title` (text, min. 5 chars)
- `content` (text) - Der Eröffnungspost
- `is_pinned` (bool) - Wichtig für Regeln/Ankündigungen
- `is_locked` (bool) - Keine weitere Antworten möglich
- `view_count` (int, default 0)
- `last_reply_at` (timestamptz) - Wichtig für die Sortierung ("Bump")
- `created_at`, `updated_at`

#### C. `forum_posts`

Die Antworten in einem Thread.

- `id` (uuid, PK)
- `thread_id` (uuid, FK auf `forum_threads`)
- `author_id` (uuid, FK auf `profiles.id`)
- `content` (text)
- `parent_id` (uuid, nullable) - Einfache Verschachtelung für direkte Antworten
- `created_at`, `updated_at`

#### D. `forum_reports`

Für das Meldeverfahren (Internal use only).

- `id` (uuid, PK)
- `target_id` (uuid) - Post oder Thread ID
- `target_type` (text) - 'THREAD' | 'POST'
- `reporter_id` (uuid, FK)
- `reason` (text)
- `status` (text) - 'OPEN', 'RESOLVED', 'DISMISSED'
- `created_at`

### 3.2 Security (RLS Policies)

| Tabelle             | Operation  | Policy Rule                                                             |
| :------------------ | :--------- | :---------------------------------------------------------------------- |
| `forum_*` (Content) | **SELECT** | `true` (Public Access)                                                  |
| `forum_threads`     | **INSERT** | `auth.uid() = author_id` (Nur eingeloggt)                               |
| `forum_posts`       | **INSERT** | `auth.uid() = author_id` (Nur eingeloggt)                               |
| `forum_threads`     | **UPDATE** | `auth.uid() = author_id` (Nur eigener Inhalt) OR `is_admin(auth.uid())` |
| `forum_reports`     | **SELECT** | `auth.role() = 'service_role'` OR `is_admin...` (Streng geheim)         |

---

## 4. Frontend Architektur & UX (Next.js)

### 4.1 Routing & Pages

- `app/forum/layout.tsx`: Generelles Layout, vllt. Sidebar mit Kategorien.
- `app/forum/page.tsx`: **Forum Index**. Zeigt Kategorien und "Trending Threads" (sortiert nach `last_reply_at` oder `view_count`).
- `app/forum/[categorySlug]/page.tsx`: **Kategorie-Ansicht**. Liste der Threads in dieser Kategorie.
- `app/forum/thread/[threadId]/page.tsx`: **Thread Detail**. Header mit Titel, darunter Liste der Posts. Ganz unten "Antworten"-Box (nur wenn eingeloggt).
- `app/forum/create/page.tsx`: **Neues Thema**. Formular mit Titel, Kategorie-Auswahl, Text. (Protected Route).

### 4.2 Komponenten

- `<ForumHeader />`: Breadcrumbs (Forum > Technik > "Welchen Einkocher?").
- `<ThreadListEntry />`: Zeigt Titel, Autor (Avatar + Name), Datum, Anzahl Antworten.
- `<PostCard />`: Zeigt einen einzelnen Beitrag. Links Autor-Info (Badge aus `tier`), Rechts Inhalt.
  - Enthält "Report" Button (kleines Flaggen-Icon).
- `<RichTextEditor />`: Einfaches Textfeld, evtl. Markdown-Support (optional, plain text ist sicherer für den Anfang).

### 4.3 Integration mit `profiles`

Wir laden User-Daten über einen Join:

```typescript
// Beispiel Query
.select(`
  *,
  author:profiles(id, display_name, logo_url, tier)
`)
```

Dies ermöglicht das Anzeigen des Ranges ("Meisterbrauer") neben dem Post, was die Community stärkt.

---

## 5. Backend Logic & Moderation

### 5.1 Profanity Filter (`lib/profanity.ts`)

Wir nutzen das existierende Skript.

- **Hook**: Beim `INSERT` (Server Action) wird `content` und `title` durch `profanity.cleanText()` geschickt.
- **Strict Mode**: Wenn `profanity.isProfane()` true ist, könnte man den Post auch komplett blockieren mit Fehlermeldung: "Bitte achte auf deine Wortwahl."

### 5.2 Server Actions (`lib/actions/forum-actions.ts`)

Wir nutzen Server Actions für robustes Error-Handling und Redirects.

- `createThread(formData)`
- `createPost(formData)`
- `reportContent(id, type, reason)`

---

## 7. Integration & Gamification

Damit das Forum keine Insel bleibt, vernetzen wir es tief mit der bestehenden App.

### 7.1 "Diskutiere dieses Rezept" (Brews Link)

Auf der Rezept-Detailseite (Public View) wird ein Button hinzugefügt.

- **Logik**: Prüft, ob es schon einen Thread mit `brew_id` gibt.
  - Wenn JA: Link zum Thread.
  - Wenn NEIN: Link zu `/forum/create?brewId=...` (vorausgefüllter Titel).

### 7.2 Dashboard Widget ("Meine Diskussionen")

Im User Dashboard (rechte Spalte) wird eine Box "Aktive Diskussionen" ergänzt.

- Zeigt die letzten 3-5 Threads an, in denen der User gepostet hat oder die er selbst erstellt hat.
- Ziel: User kommen zurück, um Antworten zu lesen (Retention).

### 7.3 Achievements (Erfolge)

In `lib/achievements.ts` werden neue Trigger hinterlegt:

- **"First Voice"** (Bronze): Erster erstellter Thread.
- **"Conversation Starter"** (Silber): 10 erstellte Threads.
- **"Community Pillar"** (Gold): 50 Antworten geschrieben.
- _Umsetzung_: Check erfolgt asynchron nach `createThread` / `createPost` Server Actions.

### 7.4 Activity Feed (`brewery_feed`)

Wenn ein User Mitglied in einer Squad (Brauerei) ist, posten wir automatisch in den Feed seiner Brauerei, wenn er einen Thread erstellt.

- **Neuer Feed-Type**: `FORUM_THREAD_CREATED`
- **Nachricht**: "Tim hat eine Diskussion gestartet: 'Welches Hefe für Kölsch?'"

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Database)

1.  [ ] Migration `supabase_migrations/YYYYMMDD_add_forum_schema.sql` erstellen.
2.  [ ] Tabellen anlegen.
3.  [ ] RLS Policies definieren (Testen: Kann Anon lesen? Kann Anon schreiben → Nein).
4.  [ ] Initial-Daten (Kategorien) via SQL seeden.

### Phase 2: Read-Only UI

5.  [ ] `lib/forum-service.ts` erstellen (Fetch Functions).
6.  [ ] `app/forum/page.tsx` (Index) bauen.
7.  [ ] `app/forum/thread/[id]/page.tsx` (Detail) bauen.

### Phase 3: Interaction

8.  [ ] Auth-Guard implementieren (Button "Neues Thema" führt zu Login wenn nicht auth).
9.  [ ] `create/page.tsx` bauen.
10. [ ] Antwort-Formular unter Thread bauen.
11. [ ] Server Actions mit Profanity-Check verknüpfen.

### Phase 4: Safety & Polish

12. [ ] "Melden" Button an die UI hängen.
13. [ ] `terms/page.tsx` updaten.
14. [ ] Breadcrumbs und Navigation im Header (`Header.tsx`) hinzufügen.

### Phase 5: Integration & Growth

15. [ ] `brew_id` Logik: Buttons auf Brew-Page einbauen.
16. [ ] Dashboard Widget "Meine Diskussionen" bauen.
17. [ ] Achievements für Threads/Posts in `achievements.ts` integrieren.
18. [ ] Feed-Push implementieren (`feed-service.ts`).
