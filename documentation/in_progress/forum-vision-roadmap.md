# BotlLab Forum — Vision & Roadmap

> **Ziel:** Das BotlLab Forum von einem einfachen Q&A-Board zu einer lebendigen, suchterzeugende Craft-Brewing-Community transformieren — dem "Reddit für Hobbybrauer", kombiniert mit der visuellen Kraft von Instagram und der Echtzeit-Dynamik von X/Twitter.
>
> _"Wir denken groß. Keine Kompromisse."_

---

## Inhaltsverzeichnis

0. [🗂️ Fortschritts-Checkliste](#️-fortschritts-checkliste)
1. [Ist-Analyse: Kritische Bewertung](#1-ist-analyse-kritische-bewertung)
2. [Benchmark: Was Reddit, X und Instagram richtig machen](#2-benchmark-was-reddit-x-und-instagram-richtig-machen)
3. [Die Vision: BotlLab Community 2.0](#3-die-vision-botllab-community-20)
4. [Feature-Roadmap (Phasen)](#4-feature-roadmap-phasen)
5. [Technische Architektur-Empfehlungen](#5-technische-architektur-empfehlungen)
6. [Gamification & Engagement-Mechaniken](#6-gamification--engagement-mechaniken)
7. [Moderation & Trust System](#7-moderation--trust-system)
8. [Mobile-First UX-Vision](#8-mobile-first-ux-vision)
9. [Rechtliche Rahmenbedingungen & Compliance](#9-rechtliche-rahmenbedingungen--compliance)

---

## 🗂️ Fortschritts-Checkliste

> Stand: **22. Februar 2026** — Letzte Aktualisierung: Phase 1 vollständig (außer Bild-Upload) + Phase 2 vollständig abgeschlossen + Phase 0.5 Security & DSA-Compliance + /forum/saved Seite.
> Legende: ✅ Erledigt · 🟡 Teilweise · ⬜ Offen · 🚫 Blockiert (Abhängigkeit)

### Phase 0 — Tech Debt & Quick Wins

- [x] **0.1** Enforce `is_locked` in `createPost()` ✅ _(22. Feb 2026)_
- [x] **0.2** View-Counter aktivieren (Supabase RPC / DB-Trigger) ✅ _(22. Feb 2026)_
- [x] **0.3** `reply_count` konsolidieren (nur noch DB-Trigger-Count) ✅ _(22. Feb 2026)_
- [x] **0.4** Hardcoded UUID in `BrewDiscussionButton` entfernen ✅ _(22. Feb 2026)_
- [x] **0.5** TypeScript-Types: `post: any` → korrekte Interfaces ✅ _(22. Feb 2026)_
- [x] **0.6** `revalidatePath`-Bug: Slug statt UUID ✅ _(22. Feb 2026)_
- [x] **0.7** Rate-Limiting (3 Threads/h, 20 Posts/h) ✅ _(22. Feb 2026)_
- [x] **0.8** Empty-State CTAs aktivieren ✅ _(22. Feb 2026)_
- [x] **0.9** SEO Basics: `generateMetadata()` für alle Forum-Seiten ✅ _(22. Feb 2026)_
- [x] **0.10** Thread-Status "Gelöst" (`is_solved` Feld) ✅ _(22. Feb 2026)_
- [x] **0.11** DSGVO Bug-Fix: Forum-Post-Anonymisierung (ON DELETE → NULL) ✅ _(22. Feb 2026)_
- [x] **0.12** AGB §4 erweitern (Bild-Upload-Regelung) ✅ _(22. Feb 2026)_
- [x] **0.13** Datenschutzerklärung §3.2 erweitern (Forum-Inhalte) ✅ _(22. Feb 2026)_
- [x] **0.14** Urheberrechts-Checkbox beim Bild-Upload ✅ _(bereits implementiert via `LegalConsentModal`)_
- [x] **0.15** Interne Moderations-Fristdokumentation (DSA) ✅ _(22. Feb 2026 — `documentation/manuals/moderation-sla.md`)_

---

### Phase 0.5 — Security & DSA-Compliance _(22. Feb 2026)_

> Nachträglich ergänzt: Sicherheits- und Compliance-Maßnahmen aus dem Code-Audit.

- [x] **S1** API Rate-Limiting — Sliding-Window-Limiter (`lib/api-rate-limit.ts`) für alle Forum-API-Routen (Suche 30/min, Threads 60/min, Views 120/min, Posts 60/min) ✅
- [x] **S2** Parameter-Sanitization — `limit`/`offset` in `/api/forum/threads` gegen Injection abgesichert (`MAX_LIMIT=50`, `Math.min/max`) ✅
- [x] **S3** Post-Pagination mit Load-More — Neue API-Route `/api/forum/posts`, `PostsLoadMore.tsx`, `ClientForumPost.tsx`; Thread-Seite lädt initial 30 Posts, Rest per Button ✅
- [x] **S4** N+1 Brew-Query-Fix — Thread-Seite extrahiert alle Brew-IDs per Regex, lädt sie in einer einzigen Query als `brewMap`, reicht sie als Prop durch `PostBranch` → `ForumPost` ✅
- [x] **S5** DSA-Moderationsbenachrichtigung — `deleteReportedContent()` benachrichtigt Inhaltsautoren per In-App-Glocke + E-Mail mit Löschgrund und Appeal-Link ✅
- [x] **S6** DSA-Widerspruchsverfahren — Migration `content_appeals`, `appeal-actions.ts`, `/appeal`-Seite, Admin-Tab „Widersprüche", E-Mail-Benachrichtigung nach Entscheidung ✅

---

### Phase 1 — Foundation

- [x] **1.1** 🔍 Forum-Suche (Full-Text-Search, Autocomplete, `⌘K`) ✅ _(22. Feb 2026)_
  - [x] `tsvector`-Spalten auf `forum_threads` + `forum_posts` mit GIN-Index + Trigger-Backfill (Migration `20260222190000`)
  - [x] `searchForumThreads()` in `lib/forum-service.ts`
  - [x] API-Route `/api/forum/search?q=...`
  - [x] `ForumSearch.tsx` — Command-Palette-Stil, Debounce 350ms, ⌘K/Ctrl+K Shortcut, Thread- + Post-Treffer
  - [x] In `forum/page.tsx` + `forum/[slug]/page.tsx` eingebunden
- [x] **1.2** ⬆️ Vote-System / Reaction-System (`🍻 Prost!`, `💡 Hilfreich`, `🔥`) ✅ _(22. Feb 2026)_
  - [x] Migration `20260222200000_forum_votes.sql` — `forum_votes`-Tabelle mit RLS, UNIQUE(target_id, user_id, reaction_type), Indexes
  - [x] `forum_votes` in `database.types.ts` eingetragen
  - [x] `getVotesForThread(threadId, postIds, userId?)` in `lib/forum-service.ts`
  - [x] `toggleForumVote(targetId, targetType, reactionType)` Server Action
  - [x] `VoteBar.tsx` — Optimistic UI, `useTransition`, Emerald-Glow bei gesetztem Vote
  - [x] Thread-Detail-Seite: Vote-Daten werden serverseitig geladen u. an OP-Block + alle Posts weitergegeben
- [x] **1.3** 📄 Pagination & Infinite Scroll ✅ _(22. Feb 2026)_
  - [x] `getThreadsByCategory` um `limit`/`offset`-Parameter erweitert (Standard: 20/0)
  - [x] `getPosts` um `limit`/`offset`-Parameter erweitert (Standard: 30/0)
  - [x] API-Route `GET /api/forum/threads?categoryId=&sort=&offset=&limit=` erstellt
  - [x] `ThreadListLoadMore.tsx` — Client-Komponente mit IntersectionObserver-Auto-Load + "Mehr laden"-Button-Fallback, pinned Threads immer oben
  - [x] Kategorie-Seite (`/forum/[slug]`) nutzt `ThreadListLoadMore` statt direktem Server-Rendering
- [x] **1.4** ✏️ Edit & Delete (mit Soft-Delete, Edit-History) ✅ _(22. Feb 2026)_
  - [x] Migration `20260222210000_forum_edit_delete.sql` — `deleted_at` auf `forum_posts` + `forum_threads`
  - [x] `editPost(postId, content)`, `deletePost(postId)`, `editThread(threadId, content)` Server Actions (48h Zeitlimit)
  - [x] `EditDeletePostButtons.tsx` — Inline-Edit-Textarea + Delete-Confirm, Optimistic UI
  - [x] `ForumPost.tsx`: `[Gelöscht]`-State, „Bearbeitet am“-Badge, Edit/Delete nur für Autor
  - [x] Thread-OP: Edit/Delete-Buttons für Thread-Ersteller in Footer-Bar
- [ ] **1.5** 📝 Rich Text: Markdown-Editor + Bild-Upload
  - [x] `MarkdownContent.tsx` — `react-markdown` + `remark-breaks`, Custom-Renderer für alle Blöcke, @Mention-Badges, URL-Links ✅ _(22. Feb 2026)_
  - [x] `MarkdownToolbar.tsx` — 6 Format-Buttons (Bold, Italic, Code, Quote, List, H3), `onMouseDown`-Focus-Lock ✅ _(22. Feb 2026)_
  - [x] `ForumPost.tsx` nutzt `<MarkdownContent>` statt manueller Token-Logik ✅ _(22. Feb 2026)_
  - [x] Thread-OP auf Thread-Detail-Seite nutzt `<MarkdownContent>` ✅ _(22. Feb 2026)_
  - [x] `ReplyInput` + `NewThreadForm`: Toolbar über Textarea eingebunden ✅ _(22. Feb 2026)_
  - [ ] 🚫 **Bild-Upload: blockiert** — benötigt vollständige Moderations-Pipeline. Detaillierte Voraussetzungen:
    - [x] AGB §4 um Bild-UGC, Nutzungsrecht und Copyright-Versicherung erweitert ✅ _(Phase 0.12)_
    - [x] Datenschutz §3.2 um `forum-uploads` Bucket, Speicherdauer und Löschbedingungen ergänzt ✅ _(Phase 0.13)_
    - [x] Urheberrechts-Checkbox im Upload-Dialog implementiert ✅ _(Phase 0.14, via `LegalConsentModal`)_
    - [ ] Supabase Storage Bucket `forum-uploads` erstellen (private, RLS: `owner = auth.uid()`)
    - [ ] `forum_post_images` Tabelle + DB-Trigger → `moderation_status = 'pending'` bei INSERT _(siehe Abschnitt 7.5)_
    - [ ] `ModerationView.tsx` erweitern — neuer Tab „Forum-Bilder" analog zu Brew-Moderation _(siehe Abschnitt 7.5)_
    - [ ] `moderation-actions.ts` erweitern — `PendingItem type` um `'forum_image'`, `rejectItem()` für Forum-Storage-Pfade _(siehe Abschnitt 7.5)_
    - [ ] Account-Deletion-Handler — Bei User-Löschung Forum-Bilder aus Storage entfernen (DSGVO Art. 17)
  - Geschätzter Aufwand: ~4-5 Tage Editor + ~2 Tage Moderation-Pipeline-Erweiterung
- [x] **1.6** 🔖 Lesezeichen / Bookmarks ✅ _(22. Feb 2026)_
  - [x] Migration `20260222220000_forum_bookmarks.sql` — `forum_bookmarks`-Tabelle mit RLS, UNIQUE(user_id, target_id)
  - [x] `toggleForumBookmark(targetId, targetType)` Server Action
  - [x] `getUserBookmarkedIds(userId, targetIds)` in `lib/forum-service.ts`
  - [x] `BookmarkButton.tsx` — Optimistic UI, Amber-Hervorhebung wenn aktiv
  - [x] Thread-Detail: BookmarkButton im OP-Footer (nur für eingeloggte User)
  - [x] `getUserSavedContent(userId)` in `lib/forum-service.ts` — hydrated `SavedItem[]` mit Thread + Post Daten per `Promise.all` ✅
  - [x] `/forum/saved` Seite — Auth-gated, Tabs (Alle / Threads / Beiträge), `ForumThreadCard` + Post-Vorschau-Karten mit Markdown-Strip ✅
  - [x] `ForumSidebar.tsx` „Gespeichert"-Link mit `activeSaved`-Highlight (Amber) ✅ _(22. Feb 2026)_
- [x] **1.7** 🔀 Sortier-Optionen ✅ _(22. Feb 2026)_
  - [x] 🕐 Neueste (`last_reply_at DESC`)
  - [x] 🔥 Beliebteste (`view_count DESC`)
  - [x] 💬 Meiste Antworten (`reply_count DESC`)
  - [x] ❓ Unbeantwortet (`reply_count = 0 or null`)
  - [x] ✅ Gelöst (`is_solved = true`)
  - [x] Horizontale Scroll-Tab-Bar auf Kategorie-Seite
- [x] **1.8** 🎨 Forum-Seitenstruktur — Komplettes Redesign ✅ _(Jan 2026)_
  - [x] 3-Column Layout Grid (`lg:grid-cols-[220px_1fr_300px]`)
  - [x] `ForumSidebar.tsx` (Sticky, Kategorien, CTA)
  - [x] `ForumRightRail.tsx` (Trending-Widget + Community-Stats)
  - [x] `ForumThreadCard.tsx` (Avatar, Tier, Preview, Brew-Chip)
  - [x] Forum-Index neu (`page.tsx`): Trending-Carousel, Tabbed Feed, FAB
  - [x] Kategorie-Seite neu (`[slug]/page.tsx`): Hero, Sort-Bar, Pinned
  - [x] Thread-Detail (`thread/[id]/page.tsx`): Sidebar hinzugefügt
  - [x] `lib/forum-service.ts` erweitert (`getTrendingThreads`, `getForumStats`, `getCategoryWithStats`)
- [x] **1.9** 👤 @User-Mentions (Basis-Implementation) ✅ _(22. Feb 2026)_
  - [x] Textarea: `@` triggert Autocomplete-Dropdown mit Nutzerliste (Supabase-Profilsuche, debounced, Arrow-key-Navigation, Enter/Tab zum Auswählen)
  - [x] Mention wird als `@Username` im plaintext gespeichert
  - [x] Beim Speichern eines Posts: alle `@Name`-Matches per Regex → `profiles.display_name`-Lookup → `forum_mention`-Benachrichtigung an jede genannte Person
  - [x] Thread-Autor bekommt separates `forum_reply` (nur wenn nicht selbst erwähnt)
  - [x] `ForumPost.tsx`: alle `@Wort`-Token werden als blaues Badge gerendert (statt nur `@Autor`)
  - [x] `NotificationBell.tsx`: `forum_mention`-Text generalisiert (kein hardcodiertes `@Autor` mehr)

---

### Phase 2 — Ambition (Community-Motor)

- [x] **2.1** 🏷️ Thread-Tags / Flair-System ✅ _(22. Feb 2026)_
  - [x] Migration `20260222230000_forum_tags.sql` — `tags text[]` auf `forum_threads`, GIN-Index
  - [x] `database.types.ts` aktualisiert
  - [x] `FORUM_TAGS` + `ForumTag` in `forum-actions.ts`; Tags beim Thread-Create gespeichert
  - [x] `NewThreadForm.tsx` — Tag-Picker (max 3), farbige Pill-Buttons
  - [x] `ForumThreadCard.tsx` — Tag-Pills unter dem Titel
  - [x] Kategorie-Seite — Filter-Pills; `getThreadsByCategory` mit optionalem `tag`-Param
  - [x] `ThreadListLoadMore.tsx` + API-Route forwarden `tag`-Parameter

- [x] **2.2** 🧵 Threaded Replies (verschachtelte Antworten, `parent_id`) ✅ _(22. Feb 2026)_
  - [x] `PostBranch.tsx` — rekursiver Server-Component, max. 3 Ebenen, `ml-8 border-l`-Styling
  - [x] Thread-Seite rendert Root-Posts mit `PostBranch` statt flachem `posts.map`
  - [x] `ReplyInput` setzt `replyToId` in FormData wenn `replyTarget` gesetzt

- [x] **2.3** 👤 Forum-User-Profil (Reputation, Post-History) ✅ _(22. Feb 2026)_
  - [x] `brewer/[id]/page.tsx`: Forum-Threads + Posts + Reputation parallel geladen
  - [x] KPI-Grid erweitert: "Diskussionen" (Threads + Replies) + "Reputation" (Votes)
  - [x] "Neueste Antworten"-Sektion hinzugefügt (letzte 10 Replies des Users)

- [x] **2.4** 🔔 Notifications 2.0 (Thread-Subscriptions) ✅ _(22. Feb 2026)_
  - [x] Migration `20260222240000_forum_subscriptions.sql` — `forum_subscriptions`-Tabelle mit RLS + UNIQUE(user_id, thread_id)
  - [x] `database.types.ts` aktualisiert
  - [x] `getThreadSubscription()` + `getThreadSubscriberIds()` in `forum-service.ts`
  - [x] `toggleThreadSubscription()` Server Action in `forum-actions.ts`
  - [x] Thread-Ersteller wird beim Erstellen des Threads automatisch abonniert
  - [x] Poster wird beim Antworten automatisch abonniert
  - [x] Alle Abonnenten erhalten `forum_reply`-Benachrichtigung bei neuen Posts
  - [x] `SubscribeButton.tsx` — Optimistic UI, Toggle (Abo / Abbeste llbar)
  - [x] Thread-Detail-Seite zeigt SubscribeButton im OP-Footer

- [x] **2.5** 📊 Polls / Umfragen ✅ _(22. Feb 2026)_
  - [x] Migration `20260222250000_forum_polls.sql` — 3 Tabellen: `forum_polls`, `forum_poll_options`, `forum_poll_votes` mit RLS
  - [x] `database.types.ts` aktualisiert
  - [x] `createThread` speichert optionale Poll-Daten (pollQuestion, pollOptions, pollMultiple)
  - [x] `voteOnPoll(optionId)` Server Action (toggle vote)
  - [x] `PollCreator.tsx` — Client-Komponente in NewThreadForm, bis 6 Optionen, Mehrfachauswahl-Checkbox
  - [x] `PollBlock.tsx` — Client-Komponente mit Optimistic UI, Progress-Bar, Prozentwerte, bereits-abgestimmt-State
  - [x] `getThreadPoll(threadId, userId?)` in `forum-service.ts`
  - [x] Thread-Detail-Seite rendert `PollBlock` wenn Poll existiert

- [x] **2.6** 📈 Trending & Discovery (Hot-Score-Algorithmus) ✅ _(22. Feb 2026)_
  - [x] `getTrendingThreads()` ersetzt naive `last_reply_at`-Sortierung durch Hot-Score
  - [x] Formel: `score = (replies * 3 + views / 20) / (ageHours + 2)^1.5`
  - [x] Kandidaten-Pool: letzte 14 Tage, top 100, dann in-memory sortiert

- [x] **2.7** ⚡ Realtime Updates (Supabase Realtime) ✅ _(22. Feb 2026)_
  - [x] `RealtimePostBanner.tsx` — Client-Komponente, abonniert `forum_posts` INSERT-Events für aktuellen Thread

- [ ] **2.8** 📌 Admin-Editorial: Forum-Threads featuren ⬜
  - [ ] Analog zur Rezept-Featuring-Funktion im Admin-Dashboard für `/discover`: Admins können einzelne Forum-Threads als „Featured" markieren
  - [ ] Featured Threads erscheinen prominent auf `/forum` (eigene „Empfohlen vom Team"-Sektion, hervorgehobene Card mit `border-emerald-500/40`)
  - [ ] DB: `is_featured boolean`, `featured_at timestamptz`, `featured_until timestamptz` (NULL = kein Ablauf) auf `forum_threads`
  - [ ] Migration: `forum_thread_featuring.sql` — Spalten + RLS (nur Service-Role darf schreiben)
  - [ ] Admin-Dashboard: Neuer Tab „Forum Featured" in `DashboardTabs` analog zu Discover-Editorial-Tab — Suche, Toggle, optionales Ablaufdatum
  - [ ] `forum-service.ts`: `getFeaturedThreads()` — lädt aktive Featured-Threads für `/forum`-Index (respektiert `featured_until`)
  - [x] Banner erscheint bei neuen Antworten: "N neue Antworten — klicken zum Laden"
  - [x] Klick auf Banner: `router.refresh()` + Counter-Reset
  - [x] Auch auf Threads ohne Antworten aktiv (nutzt `thread.created_at` als Baseline)

---

### Phase 3 — Vision (Ökosystem)

- [ ] **3.1** 🏆 Awards & Auszeichnungen (BotlCoins, Premium-Feature)
- [ ] **3.2** 📖 Brau-Tagebücher (chronologische Thread-Updates)
- [ ] **3.3** 👥 Social Graph / Nutzer folgen — Follower-System, „Beiträge von Leuten denen ich folge"-Feed. _(Hinweis: @Mention-Autocomplete und -Notifications aus 1.9 sind bereits implementiert — dieser Punkt betrifft den darüber hinausgehenden Social-Graph-Aspekt)_
- [ ] **3.4** 📸 Showcase-Feed (Bier-Foto-Grid, Instagram-Modus) — 🚫 **blockiert** bis 1.5 Bild-Upload implementiert

---

### Phase 4 — Moonshot

- [ ] Brau-Stammtisch (Audio/Video Community-Events)
- [ ] Direct Messages (1:1 zwischen Brauern)
- [ ] Social Graph (Usern folgen, "Für dich"-Feed)
- [ ] Kurzform-Video-Embeds (Brau-Tipps)
- [ ] BotlGuide-KI im Forum (Thread-Zusammenfassungen, Antwort-Vorschläge)

---

## 1. Ist-Analyse: Kritische Bewertung

### 1.1 Was funktioniert ✅

| Feature               | Bewertung | Kommentar                                                                                                                      |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Kategorien-System** | ★★★☆☆     | Solide Grundlage, 5 Kategorien mit Icons, slug-basiertes Routing                                                               |
| **Thread-Erstellung** | ★★★☆☆     | Zod-Validierung, Profanity-Filter, optionaler Brew-Link → durchdacht                                                           |
| **Brew-Linking**      | ★★★★☆     | Geniales Feature! Direkte Verknüpfung von Rezept ↔ Diskussion, auto-detection von `/brew/UUID` in Replies, Inline-Preview-Card |
| **Quoting-System**    | ★★★☆☆     | Funktional mit `> **@User** schrieb:` Syntax, grüner Indikator-Balken                                                          |
| **@Autor-Mention**    | ★★☆☆☆     | Tab-Completion funktioniert, aber nur für `@Autor` (Thread-Ersteller), keine echten User-Mentions                              |
| **Tier-Integration**  | ★★★★☆     | Avatar-Border, Tier-Badge neben dem Namen, "Original Poster"-Label — wertig                                                    |
| **Report-System**     | ★★★☆☆     | Solide Basis: Modal mit kategorisierten Gründen, schreibt in shared `reports`-Tabelle                                          |
| **Notifications**     | ★★★☆☆     | In-App + E-Mail (mit Opt-in), feed-Integration bei Thread-Erstellung                                                           |
| **Dark Theme Design** | ★★★★☆     | Konsistentes zinc/emerald Design, glassmorphe Header, durchdachte Hover-States                                                 |
| **Profanity Filter**  | ★★★☆☆     | `cleanText()` läuft auf Titel und Content — guter erster Schutz                                                                |

### 1.2 Kritische Schwächen ❌

#### Architektonische Probleme

| Problem                                  | Schwere     | Details                                                                                                  |
| ---------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| **Kein Voting-System**                   | 🔴 Kritisch | KEIN Upvote/Downvote → kein Weg, Qualität sichtbar zu machen. Reddit's gesamtes Modell basiert darauf.   |
| **Keine Suche**                          | 🔴 Kritisch | Kein Suchfeld, kein Full-Text-Index, keine Search-Route. User müssen blind durch Kategorien browsen.     |
| **Keine Pagination**                     | 🔴 Kritisch | ALLE Threads pro Kategorie werden geladen. Bei 100+ Threads bricht die Performance.                      |
| **Kein Edit/Delete**                     | 🟠 Hoch     | User können weder Threads noch Posts bearbeiten oder löschen. Tippfehler bleiben für immer.              |
| **`is_locked` nicht enforced**           | 🟠 Hoch     | DB-Feld existiert, aber `createPost()` prüft NICHT ob Thread gesperrt ist.                               |
| **`view_count` tot**                     | 🟡 Mittel   | Spalte existiert, wird nie hochgezählt. Täuscht Daten-Vollständigkeit vor.                               |
| **`reply_count` dual-sourced**           | 🟡 Mittel   | DB-Trigger zählt hoch UND Service berechnet aus `posts(count)` + 1. Verwirrend, potentiell inkonsistent. |
| **Hardcoded Category-UUID**              | 🟡 Mittel   | `BrewDiscussionButton` hat `30f4a869-...` direkt im Code → bricht bei Kategorie-Änderung                 |
| **`any`-Types überall**                  | 🟡 Mittel   | `ForumPost` akzeptiert `post: any`, Service-Layer ohne Typing → kein TypeScript-Schutz                   |
| **Keine Rate-Limits**                    | 🟡 Mittel   | Kein Spam-Schutz über Profanity hinaus. User könnte 100 Posts/Minute erstellen.                          |
| **Notifications nur an Thread-Autor**    | 🟡 Mittel   | Nur der OP bekommt Benachrichtigung, nicht alle Teilnehmer. Thread-Abonnements fehlen.                   |
| **`revalidatePath` mit UUID statt Slug** | 🟠 Hoch     | Nach Thread-Erstellung wird `/forum/${categoryId}` revalidiert statt `/forum/${slug}` — Cache-Bug.       |

#### UX-Defizite

| Problem                       | Details                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Flat Reply-Struktur**       | Alle Antworten chronologisch — bei langen Threads geht der Kontext verloren. `parent_id` existiert, wird aber ignoriert. |
| **Kein Rich Text**            | Nur `whitespace-pre-wrap` Plaintext. Kein Markdown, keine Formatierung, keine Bilder in Posts.                           |
| **Keine Bilder-Uploads**      | Einzige Bilder kommen von verlinkten Brews. Keine eigenen Fotos von Brauprozessen, Equipment, etc.                       |
| **Kein User-Profil im Forum** | Kein Weg, die Forum-Aktivität eines Users zu sehen (Posts, Threads, Reputation).                                         |
| **Keine Sortier-Optionen**    | Nur `last_reply_at DESC`. Kein "Meiste Antworten", "Älteste", "Beliebteste".                                             |
| **Keine Thread-Previews**     | In der Kategorie-Ansicht wird Content mit `substring(0, 140)` abgeschnitten — kein intelligentes Preview.                |
| **Sticky-Input am Mobile**    | Reply-Input ist `sticky bottom-0` mit `bg-black` — überlappt möglicherweise Content.                                     |
| **Keine Empty-State CTAs**    | Leere Kategorien zeigen einen deaktivierten Button "Sei der Erste" — warum deaktiviert?!                                 |
| **Kein Thread-Status**        | Kein "Gelöst", "Offen", "In Diskussion" — wichtig für Hilfe-Threads.                                                     |

### 1.3 Verpasste Chancen

1. **Community-Identität fehlt:** Kein Karma, kein Reputation-System, kein Grund regelmäßig zurückzukehren
2. **Content-Discovery ist null:** Kein "Trending", kein "Top der Woche", keine Empfehlungen
3. **Brew-Integration nur oberflächlich:** Das Brew-Linking ist ein Juwel, aber es wird nicht ausgereizt — keine automatischen Brew-Feeds, keine "Wer hat dieses Rezept nachgebraut"-Diskussionen
4. **Kein Social Graph:** Kein Folgen von Usern, kein "Beiträge von Leuten die ich folge"
5. **Null Echtzeit:** Keine Live-Updates, kein "jemand tippt gerade", kein Realtime-Feed
6. **Keine Polls/Umfragen:** Klassiker für Community-Engagement ("Welches Hopfen bevorzugt ihr?")
7. **SEO verschenkt:** Forum-Content ist goldwert für SEO. Keine `<meta>` Tags, keine `generateMetadata`, kein strukturiertes Schema.

---

## 2. Benchmark: Was Reddit, X und Instagram richtig machen

### 2.1 Reddit — Der König der Foren

| Feature                         | Warum es funktioniert                                         | BotlLab-Adaption                                                                |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Voting (Up/Down)**            | Crowd-Intelligence. Beste Antworten steigen nach oben.        | → **BotlLab Vote System**: Upvote + "Prost! 🍻" Reaction statt generischem Like |
| **Subreddits**                  | Selbstorganisierende Communities.                             | → Bereits als "Kategorien" vorhanden, aber ausbaufähig zu User-created Channels |
| **Flair-System**                | Tags für Threads (z.B. "Frage", "Rezept-Tipp", "Problem").    | → **Thread-Tags**: `[Frage]` `[Rezept]` `[Equipment]` `[Showcase]`              |
| **Karma**                       | Langfrist-Motivation. Gute Beiträge werden über Zeit belohnt. | → **Brau-Reputation**: Punkte für Votes, akzeptierte Antworten, etc.            |
| **Awards**                      | Geben Wertschätzung, schaffen Premium-Monetarisierung.        | → **Hopfen-Awards**: "Goldener Hopfen", "Meisterbräu-Award" (Premium-Feature!)  |
| **Best Sort / Hot / New / Top** | User wählt was relevant ist.                                  | → Sortier-Bar: "Neueste", "Beliebteste", "Meiste Antworten", "Unbeantwortet"    |
| **Saved Posts**                 | Bookmarks für später.                                         | → **Lesezeichen**: Posts merken, eigene Sammlung pflegen                        |
| **Crossposting**                | Content in mehrere Communities teilen.                        | → Thread-Sharing in Brewery-Feeds                                               |
| **Markdown + Rich Media**       | Formatierter Content mit Bildern, Code-Blöcken, Links.        | → Markdown-Editor mit Bild-Upload, Brew-Embeds, Code-Snippets für Rezepte       |

### 2.2 X (Twitter) — Echtzeit & Engagement

| Feature                       | Warum es funktioniert                          | BotlLab-Adaption                                                                              |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Real-time Feed**            | Sofortige Updates. Suchtfaktor durch FOMO.     | → **Live-Feed**: Supabase Realtime für neue Posts, Live-Typing-Indicator                      |
| **Quote-Repost**              | Content wird verstärkt, nicht nur beantwortet. | → **Quote-Share**: Thread mit eigenem Kommentar im Feed teilen                                |
| **Threads**                   | Lange Narrativen in verketteten Posts.         | → **Brau-Tagebücher**: Verkettete Posts über mehrere Brautage                                 |
| **Spaces (Audio)**            | Live-Community-Events.                         | → (Zukunft) **Brau-Stammtisch**: Scheduled Audio/Video für Community-Events                   |
| **Trending Topics**           | Was die Community gerade beschäftigt.          | → **Trending im Forum**: "🔥 Diese Woche diskutiert: IPA-Hopfen-Trends"                       |
| **Bookmark / Lists**          | Organisiertes Speichern.                       | → Lesezeichen + "Meine Listen" (z.B. "Rezept-Ideen", "Equipment-Tipps")                       |
| **Engagement-Metriken**       | Views, Likes, Replies, Reposts sichtbar.       | → Views, Votes, Replies als Metriken unter jedem Thread                                       |
| **Notifications mit Kontext** | "@User hat auf deine Antwort reagiert"         | → Rich-Notifications: "Tim hat deinen Beitrag hochgevotet", "3 neue Antworten auf dein Thema" |

### 2.3 Instagram — Visuell & Community

| Feature                    | Warum es funktioniert                          | BotlLab-Adaption                                                                   |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Grid-Ansicht**           | Visueller Einstieg, sofortige Orientierung.    | → **Showcase-Feed**: Bier-Fotos im Grid mit Rezept-Link (separater Tab "Showcase") |
| **Stories**                | Vergänglicher Content, tägliche Touch-Points.  | → **Brau-Stories**: "Heute gebraut 🍺" — 24h-Content mit Brew-Link                 |
| **Carousel-Posts**         | Mehrere Bilder pro Post → Schritt-für-Schritt. | → **Bildergalerien** in Forum-Posts: Brau-Prozess-Dokumentation                    |
| **Explore/Discover**       | Algorithmus-basierte Empfehlungen.             | → Bereits `/discover` vorhanden — Cross-Promotion mit Forum-Beiträgen              |
| **Saved Collections**      | Thematisch geordnete Sammlungen.               | → "Meine Sammlung": Rezepte + Forum-Posts + Brauer in einer Collection             |
| **Direct Messages**        | Private 1:1 Kommunikation.                     | → (Zukunft) **Direkte Nachrichten** zwischen Brauern                               |
| **Reels/Short-Form Video** | Snackable Content.                             | → (Zukunft) Kurze Brau-Tipps als Video-Embeds                                      |

---

## 3. Die Vision: BotlLab Community 2.0

### 3.1 Leitbild

> **"Das Forum ist nicht ein Feature von BotlLab — es IST BotlLab."**

Das Forum wird zum Herzstück der Plattform: Jeder Brew, jede Bewertung, jedes Rezept mündet hier in Diskussion. Es ist der Ort, wo Wissen entsteht, Brauer sich vernetzen und die Community ihre Identität findet.

### 3.2 Key Principles

1. **Community First** — Jede Feature-Entscheidung fragt: "Bringt das Leute zusammen?"
2. **Content is King** — Hochwertiger Content wird belohnt und sichtbar gemacht
3. **Brew-Native** — Brau-spezifische Features, die kein allgemeines Forum bieten kann
4. **Progressive Engagement** — Vom Leser zum Poster zum Community-Leader
5. **Mobile-Native** — Touch-first Design, Bottom-Sheet-Interaktionen, Swipe-Gestures

### 3.3 Feature-Pyramide (Priorität)

```
                    ┌─────────────────┐
                    │    🏆 VISION     │  Brau-Stories, Audio-Stammtisch,
                    │   (6-12 Monate)  │  AI-Rezept-Assistent, Video-Embeds
                    ├─────────────────┤
                  ┌─┤  🚀 AMBITION    ├─┐  Real-time, Awards, DMs, Polls,
                  │ │  (3-6 Monate)   │ │  Thread-Tags, Notifications 2.0,
                  │ ├─────────────────┤ │  User-Profiles, Trending
                  │┌┤  ⚡ FOUNDATION   ├┐│  Voting, Search, Pagination,
                  │││   (1-3 Monate)  │││  Edit/Delete, Rich Text, Images,
                  ││├─────────────────┤││  Threaded Replies, Sort, Bookmarks
                  │││ 🔧 DEBT FIXES   │││  is_locked, view_count, types,
                  │││  (Sofort/Woche 1)│││  rate-limits, revalidate-bug,
                  │││                  │││  hardcoded UUID, reply_count
                  └┘└──────────────────┘└┘
```

---

## 4. Feature-Roadmap (Phasen)

### Phase 0: Tech Debt & Quick Wins (Woche 1-2)

> **Motto:** "Erst das Fundament reparieren, bevor wir ausbauen."

| #    | Task                                                                                                                                                                                                                                                                                                                                                     | Aufwand | Impact              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------- |
| 0.1  | **Enforce `is_locked`** — Check in `createPost()` ob Thread gesperrt ist, UI-Hinweis "Dieser Thread ist gesperrt"                                                                                                                                                                                                                                        | 15 min  | 🟢 Bug-Fix          |
| 0.2  | **View-Counter aktivieren** — Supabase RPC oder DB-Trigger bei Thread-Aufruf, `view_count` hochzählen                                                                                                                                                                                                                                                    | 30 min  | 🟢 Daten            |
| 0.3  | **`reply_count` konsolidieren** — Service nutzt nur noch DB-Trigger-Count, entfernt `posts(count)` Query                                                                                                                                                                                                                                                 | 20 min  | 🟢 Konsistenz       |
| 0.4  | **Hardcoded UUID entfernen** — `BrewDiscussionButton` nutzt Slug-Lookup statt UUID                                                                                                                                                                                                                                                                       | 20 min  | 🟢 Wartbarkeit      |
| 0.5  | **TypeScript-Types** — `post: any` → korrektes Interface aus `database.types.ts` ableiten                                                                                                                                                                                                                                                                | 45 min  | 🟢 DX               |
| 0.6  | **revalidatePath-Bug** — Slug statt UUID für Category-Revalidation                                                                                                                                                                                                                                                                                       | 10 min  | 🟢 Bug-Fix          |
| 0.7  | **Rate-Limiting** — Max 3 Threads/Stunde, Max 20 Posts/Stunde pro User                                                                                                                                                                                                                                                                                   | 45 min  | 🟢 Sicherheit       |
| 0.8  | **Empty-State CTAs** — "Sei der Erste" Button aktivieren → direkt zu `/forum/create` mit Category prefilled                                                                                                                                                                                                                                              | 15 min  | 🟢 UX               |
| 0.9  | **SEO Basics** — `generateMetadata()` für alle Forum-Seiten (Title, Description, OpenGraph)                                                                                                                                                                                                                                                              | 45 min  | 🟢 SEO              |
| 0.10 | **Thread-Status: Gelöst** — Neues Feld `is_solved boolean`, OP kann eigenen Thread als "Gelöst ✅" markieren                                                                                                                                                                                                                                             | 30 min  | 🟢 UX               |
| 0.11 | **DSGVO Bug-Fix: Forum-Post-Anonymisierung** — Bei Account-Delete darf kein `CASCADE DELETE` auf `forum_posts.author_id` laufen (würde Threads zerstören). Stattdessen: `author_id = NULL`, Display-Name → "Gelöschter Nutzer". **Aktuell ist `ON DELETE CASCADE` gesetzt — kritischer DSGVO-Bug!**                                                      | 45 min  | 🔴 DSGVO-Pflicht    |
| 0.12 | **AGB §4 erweitern** — Aktuell werden nur "Threads und Posts" erwähnt. Vor jedem Bild-Upload-Feature muss §4 um explizite Regelung für Bild-Uploads (Nutzungsrecht, Moderationsvorbehalt, Copyright-Versicherung) ergänzt werden                                                                                                                         | 30 min  | 🟠 Rechtssicherheit |
| 0.13 | **Datenschutzerklärung §3.2 erweitern** — Derzeit werden nur "Rezepte, Flaschen, Bewertungen" aufgelistet. "Forum-Inhalte (Threads, Posts, Forum-Bilder)" müssen als eigene Datenkategorie mit Rechtsgrundlage, Speicherdauer und Löschbedingungen aufgenommen werden                                                                                    | 30 min  | 🟠 DSGVO            |
| 0.14 | **Urheberrechts-Checkbox beim Bild-Upload** — Vor Upload eigener Bilder (Forum + bereits bestehender Brew-Label-Upload) Bestätigung einblenden: _"Ich versichere, dass ich die Urheberrechte an diesem Bild besitze oder zur Veröffentlichung berechtigt bin."_ — schützt vor §§ 97 ff. UrhG-Haftung. Gilt auch rückwirkend für bestehenden Brew-Upload! | 20 min  | 🟠 Urheberrecht     |
| 0.15 | **Interne Moderations-Fristdokumentation** — DSA-Mindestpflicht: definierte Bearbeitungszeiten für gemeldete Inhalte festlegen und intern dokumentieren: rechtswidrige Inhalte ≤ 24h, sonstige Meldungen ≤ 7 Tage. Report-System existiert ✅, aber keine SLA-Dokumentation                                                                              | 30 min  | 🟡 DSA              |

**Geschätzter Gesamtaufwand Phase 0:** ~8-9 Stunden (inkl. Compliance-Items 0.11–0.15)

---

### Phase 1: Foundation — Die Grundpfeiler (Monat 1-2)

> **Motto:** "Jetzt wird das Forum benutzbar."

#### 1.1 🔍 Forum-Suche

**Konzept:** Full-Text-Search über Thread-Titel + Content + Posts, mit Autocomplete und Highlight.

```
┌─────────────────────────────────────────────────────┐
│ 🔍  IPA Hopfen Empfehlung...               [⌘K]    │
├─────────────────────────────────────────────────────┤
│  THREADS                                            │
│  ┌─────────────────────────────────────────────┐    │
│  │ 📌 Welcher Hopfen für American IPA?         │    │
│  │    in Rezepte & Zutaten • 12 Antworten      │    │
│  ├─────────────────────────────────────────────┤    │
│  │ 🍺 Citra vs. Mosaic — der große Vergleich   │    │
│  │    in Rezepte & Zutaten • 24 Antworten      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  POSTS (Passende Antworten)                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ "...für ein IPA empfehle ich Cascade für     │    │
│  │  die Bitterung und Citra für Aroma..."       │    │
│  │  — @BrewMaster99 in "Hopfen-Guide 2024"     │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Umsetzung:**

- Supabase `tsvector`-Column auf `forum_threads` und `forum_posts`
- GIN-Index für performante Full-Text-Search
- API-Route `/api/forum/search?q=...` mit Debounce
- Integration in Header-Suchleiste (wie `/discover` Search-Slot)
- Keyboard-Shortcut `⌘K` / `Ctrl+K` für Quick-Search

**Aufwand:** 2-3 Tage

---

#### 1.2 ⬆️ Vote-System (Der Game-Changer)

**Konzept:** Reddit-inspiriertes Voting, aber Brewing-themed.

```
┌────────────────────────────────────────────────────┐
│          ┌──────┐                                  │
│          │  ⬆   │  ← Upvote (emerald glow)        │
│          │  14  │  ← Netto-Score                   │
│          │  ⬇   │  ← Downvote (rose glow)         │
│          └──────┘                                  │
│  ☞ Oder neben dem Post:                            │
│                                                    │
│  [🍻 Prost! 14]  [⬇ 2]  [💬 12]  [🔖]  [⚑]      │
│                                                    │
│  Reaction-Variante (ohne Downvote):                │
│  [🍻 Prost! 14]  [💡 Hilfreich 8]  [🔥 3]        │
└────────────────────────────────────────────────────┘
```

**Feature-Details:**

| Aspekt               | Design-Entscheidung                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vote-Typ**         | **Empfehlung: Reaction-System** statt Up/Down. Positiver Community-Ton. `🍻 Prost!` (allgemein), `💡 Hilfreich` (für Tipps), `🔥 Feuer` (für Hype). Downvotes vergiften Communities. |
| **DB-Schema**        | `forum_votes` (id, post_id/thread_id, user_id, reaction_type, created_at) mit UNIQUE(target_id, user_id, type)                                                                       |
| **Score-Berechnung** | Summe aller Reactions als "Karma" auf User-Profil                                                                                                                                    |
| **Sort by Votes**    | "Beliebteste" Sortierung = SUM(votes) auf Thread/Post-Ebene                                                                                                                          |
| **Optimistic UI**    | Sofortiges visuelles Feedback, Server-Confirmation im Hintergrund                                                                                                                    |
| **Animation**        | Micro-Interaction: Vote-Button pulst kurz in emerald/amber                                                                                                                           |

**Aufwand:** 3-4 Tage (DB + API + Frontend + Animations)

---

#### 1.3 📄 Pagination & Infinite Scroll

**Konzept:** Cursor-basierte Pagination für Thread-Listen, Infinite Scroll für Posts.

| Seite                         | Methode                                    | Details                                   |
| ----------------------------- | ------------------------------------------ | ----------------------------------------- |
| `/forum` (Index)              | Statisch: 6 → **20 Recent + "Mehr laden"** | Button-basiert                            |
| `/forum/[slug]` (Kategorie)   | **Infinite Scroll**                        | 20 Threads initial, Intersection Observer |
| `/forum/thread/[id]` (Thread) | **Lazy-Load Posts**                        | 30 Posts initial, "Ältere laden" oben     |

**Aufwand:** 2 Tage

---

#### 1.4 ✏️ Edit & Delete

**Konzept:** Thread-Ersteller und Post-Autoren können eigene Inhalte bearbeiten (mit History) und löschen.

| Feature          | Details                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| **Edit**         | Inline-Edit (Textarea ersetzt Content), "Bearbeitet" Badge mit Timestamp    |
| **Edit-History** | Optional: `forum_post_edits`-Tabelle für Transparenz (wie Reddit "edited")  |
| **Delete**       | Soft-Delete (`deleted_at`), Content wird zu "[Gelöscht]", Antworten bleiben |
| **Zeitlimit**    | Bearbeiten nur innerhalb 48h nach Erstellung? (Optional, Reddit hat keins)  |
| **Admin-Delete** | Admins können jederzeit Threads/Posts löschen                               |

**Aufwand:** 2-3 Tage

---

#### 1.5 📝 Rich Text (Markdown + Medien)

**Konzept:** WYSIWYG-artiger Editor mit Markdown-Support und Bild-Upload.

```
┌─────────────────────────────────────────────────────┐
│ [B] [I] [H] [📋] [🔗] [📷] [🍺 Brew] [Code]       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ## Mein erstes IPA                                  │
│                                                     │
│ **Zutaten:**                                        │
│ - 5kg Pale Malt                                     │
│ - 60g Cascade (60 min)                              │
│ - 40g Citra (Dry Hop)                               │
│                                                     │
│ ![Brauprozess](/uploads/brew-process.jpg)            │
│                                                     │
│ > Pro-Tipp: Die Stammwürze bei 16°P halten!         │
│                                                     │
│ Rezept verknüpft: [Mein Cascade IPA]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tech-Stack:**

- **Editor:** `@tiptap/react` (headless, voll customizable) oder `react-markdown` für Rendering
- **Bild-Upload:** Supabase Storage Bucket `forum-uploads`, Resize via Edge Function (max 1200px, max 5MB, nur jpeg/png/webp)
- **Custom Extensions:** `BrwEmbed` (Brew-Preview als Block), `MentionSuggestion` (echte @User-Mentions)
- **Rendering:** Server-Side Markdown → HTML mit `rehype-sanitize` für XSS-Schutz

> ⚠️ **Rechtliche & technische Voraussetzungen — MUSS VOR Bild-Upload-Launch erfüllt sein:**
>
> Die komplette `pending → review → approve/reject`-Pipeline existiert bereits für Brew-Labels und Brauerei-Logos. Sie muss für Forum-Bilder 1:1 ausgeweitet werden. Ohne diese Basis ist unkontrollierter Upload-Content **rechtlich nicht vertretbar**.
>
> | #   | Voraussetzung                                                                                                         | Referenz       |
> | --- | --------------------------------------------------------------------------------------------------------------------- | -------------- |
> | 1   | **AGB §4 erweitern** — Bild-UGC, Nutzungsrecht, Copyright-Versicherung                                                | Phase 0.12     |
> | 2   | **Datenschutz §3.2 ergänzen** — `forum-uploads` Bucket, Speicherdauer, Löschbedingungen                               | Phase 0.13     |
> | 3   | **Urheberrechts-Checkbox** im Upload-Dialog                                                                           | Phase 0.14     |
> | 4   | **Supabase Storage Bucket `forum-uploads`** mit RLS (`owner = auth.uid()`, private)                                   | Tech-Vorarbeit |
> | 5   | **`forum_post_images` Tabelle** + DB-Trigger → `moderation_status = 'pending'` bei INSERT                             | Abschnitt 7.5  |
> | 6   | **`ModerationView.tsx` erweitern** — Tab "Forum-Bilder" analog zu Brew-Moderation                                     | Abschnitt 7.5  |
> | 7   | **`moderation-actions.ts` erweitern** — `PendingItem type` um `'forum_image'`, `rejectItem()` für Forum-Storage-Pfade | Abschnitt 7.5  |
> | 8   | **Account-Deletion-Handler** — Bei User-Löschung Forum-Bilder aus Storage entfernen (DSGVO Art. 17)                   | Phase 0.11     |

**Aufwand:** 4-5 Tage Bild-Editor (zzgl. ~2 Tage Moderation-Pipeline-Erweiterung aus Abschnitt 7.5)

---

#### 1.6 🔖 Lesezeichen (Bookmarks)

**Konzept:** Threads und Posts merken, eigene Sammlung.

- Neuer Button `🔖` neben Vote/Reply Buttons
- `forum_bookmarks`-Tabelle (user_id, target_id, target_type, created_at)
- Eigene Seite `/forum/saved` mit gespeicherten Threads/Posts
- Optional: Collections ("IPA-Ideen", "Equipment-Tipps")

**Aufwand:** 1-2 Tage

---

#### 1.7 🔀 Sortier-Optionen

**Konzept:** Bar über der Thread-Liste mit Sortier-Chips.

```
[🕐 Neueste]  [🔥 Beliebteste]  [💬 Meiste Antworten]  [❓ Unbeantwortet]  [✅ Gelöst]
```

| Sort             | Query                                             |
| ---------------- | ------------------------------------------------- |
| Neueste          | `ORDER BY last_reply_at DESC` (aktuell einzige)   |
| Beliebteste      | `ORDER BY vote_count DESC` (nach Phase 1.2)       |
| Meiste Antworten | `ORDER BY reply_count DESC`                       |
| Unbeantwortet    | `WHERE reply_count = 0 ORDER BY created_at DESC`  |
| Gelöst           | `WHERE is_solved = true ORDER BY created_at DESC` |

**Aufwand:** 1 Tag

> **✅ Teilweise umgesetzt (Jan 2026):** `🕐 Neueste` und `🔥 Beliebteste` sind live auf `/forum` (`?tab=new|top`) und `/forum/[slug]` (`?sort=new|top`) via URL-Parameter. Die restlichen 3 Optionen (Meiste Antworten, Unbeantwortet, Gelöst) folgen nach Phase 1.2 (Voting) und Phase 0.10 (`is_solved`).

---

#### 1.8 🎨 Forum-Seitenstruktur — Komplettes Redesign

> **✅ Vollständig umgesetzt (Jan 2026)**
> Implementierte Dateien: `app/forum/_components/ForumThreadCard.tsx`, `ForumSidebar.tsx`, `ForumRightRail.tsx`, `app/forum/page.tsx` (neu), `app/forum/[slug]/page.tsx` (neu), `app/forum/thread/[id]/page.tsx` (Sidebar hinzugefügt), `lib/forum-service.ts` (erweitert: `getTrendingThreads`, `getForumStats`, `getCategoryWithStats`). Build: ✅ erfolgreich.

> **Orientierung:** Reddit (Feed-Struktur, Voting, Sidebar), X/Twitter (sauberes Feed-Layout, Trending-Widget), Threads by Meta (Karten-Design, Mobile-First), BotlLab Discover (Section-Header-Pattern, Filter-Chips, Seitenaufbau).
>
> Das aktuelle Forum ist eine **einfache Liste in einem Container**. Das neue Forum ist eine **Community-Plattform mit echtem Information-Design**.

---

##### Struktur-Vergleich: Jetzt vs. Neu

| Bereich             | Aktuell                                           | Neu                                                                                       |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Layout**          | 1 Spalte, volle Breite, simpler Container         | Desktop 3-spaltig (Sidebar + Feed + Widget-Spalte)                                        |
| **Forum-Index**     | Hero-Card + Kategorie-Grid + flache Thread-Liste  | Tabbed Feed + Trending-Sektion + Kategorie-Rail                                           |
| **Kategorie-Seite** | Breadcrumb + Thread-Liste                         | Kategorien-Hero + Filter-Chips + reiche Thread-Cards                                      |
| **Thread-Card**     | Titel + Kategorie-Badge + Author + Antworten-Zahl | Avatar + Kategorie-Chip + Titel + 2-Zeilen-Preview + Brew-Thumbnail + Voting + Meta-Zeile |
| **Thread-Seite**    | Einfache Post-Liste                               | Sticky-Header + Voting-Spalte + Thread-Body + Antwort-Baum                                |
| **Navigation**      | Kein Weg zwischen Kategorien                      | Persistent Kategorie-Sidebar (Desktop) / Horizontal-Scroll-Rail (Mobile)                  |
| **CTAs**            | Ein Button oben rechts                            | FAB auf Mobile, Inline-CTAs in Leer-States, Quick-Post in Sidebar                         |

---

##### Layout-Grundstruktur (Desktop)

```
┌─ /forum — Desktop (max-w-7xl) ────────────────────────────────────────────┐
│ Header (BotlLab Navigation)                                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─ Linke Sidebar ──┐  ┌─ Main Feed (flex-1) ─────────┐  ┌─ Right ────┐  │
│  │ 220px, sticky    │  │                               │  │ 300px      │  │
│  │                  │  │  [Für dich][Trending][Neu][▼] │  │ sticky     │  │
│  │ 📋 Kategorien    │  │  ─────────────────────────── │  │            │  │
│  │ ─────────────    │  │                               │  │ 🔥 Trending│  │
│  │ 📢 Ankündigungen │  │  ┌─ Thread-Card ───────────┐ │  │ ─────────  │  │
│  │ 📜 Rezept-Tipps  │  │  │ [Avatar] [Kategorie]    │ │  │ #1 "IPA-.. │  │
│  │ 🔧 Technik & ... │  │  │ Titel des Threads       │ │  │ #2 "Weizen │  │
│  │ 🛒 Marktplatz    │  │  │ Preview-Text...         │ │  │ #3 "Hopfen │  │
│  │ ☕ Off-Topic     │  │  │ [Brew-Thumbnail]        │ │  │            │  │
│  │                  │  │  │ 🍻12  💬8  👁 340  2 Std│ │  │ 📊 Stats   │  │
│  │ ─────────────    │  │  └─────────────────────────┘ │  │ ─────────  │  │
│  │ [+ Neues Thema]  │  │                               │  │ 247 User   │  │
│  │                  │  │  ┌─ Thread-Card ───────────┐ │  │ 12 online  │  │
│  │ ─────────────    │  │  │ ...                     │ │  │ 38 Threads │  │
│  │ 🏆 Mein Profil   │  │  └─────────────────────────┘ │  │ diese Woche│  │
│  │ Reputation: 142  │  │                               │  │            │  │
│  │ [🔖 Gespeichert] │  │  [Mehr laden / Infinite ↓]   │  │ [Profil]   │  │
│  └──────────────────┘  └───────────────────────────────┘  └────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

##### Layout-Grundstruktur (Mobile)

```
┌─ /forum — Mobile ───────────────────────┐
│ Header                          [🔍] [+] │  ← Suchicon + FAB im Header
├──────────────────────────────────────────┤
│ ← Horizontal-Scroll-Rail ──────────────▶ │
│  [📢 Alle] [📜 Rezepte] [🔧 Technik] ... │  ← Kategorie-Chips, scrollbar
├──────────────────────────────────────────┤
│                                          │
│  [🕐 Neu]  [🔥 Trending]  [👤 Für dich] │  ← Tab-Bar, sticky
│  ────────────────────────────────────── │
│                                          │
│  ┌─ Thread-Card ──────────────────────┐ │
│  │ [Avatar] @BrewMaster • 2 Std.      │ │
│  │ [Rezepte]                          │ │
│  │ IPA-Hopfen: Der große Vergleich    │ │
│  │ "Ich schwanke zwischen Citra und   │ │
│  │  Mosaic für mein nächstes Batch..."│ │
│  │ ┌──────────────────────────────┐  │ │
│  │ │ 🍺 Mein Cascade IPA v2       │  │ │  ← Brew-Vorschau-Chip
│  │ │    ABV 5.8% · IBU 42         │  │ │
│  │ └──────────────────────────────┘  │ │
│  │ 🍻 14   💬 8   👁 340             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌─ Thread-Card ──────────────────────┐ │
│  │ [Avatar] @HopfenKönig • gestern    │ │
│  │ [Frage]                            │ │
│  │ Gärtemperatur bei untergärigem ... │ │
│  │ "Hat jemand Erfahrung mit Keller.. │ │
│  │ 🍻 5   💬 12   👁 180              │ │
│  └────────────────────────────────────┘ │
│                                          │
│                 ╔═══╗                    │
│                 ║ + ║  ← FAB, sticky    │
│                 ╚═══╝                    │
└──────────────────────────────────────────┘
```

---

##### Seite 1: Forum-Index `/forum` — Neues Design

**Was ändert sich:**

Die aktuelle Hero-Card + Kategorie-Grid + flache Thread-Liste wird aufgebrochen in eine echte **Section-basierte Discover-artike Page** — analog zur `/discover`-Seite mit `SectionHeader`-Pattern, horizontalem Scroll, Tabs und Trending-Widgets.

```
┌─ /forum — Neue Seitenstruktur ─────────────────────────────────────────────┐
│                                                                            │
│  ── HERO (kompakt, kein großes Banner) ──────────────────────────────────  │
│  Community Forum                               [+ Neues Thema]            │
│  Diskutieren · Entdecken · Lernen                                          │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  ── SECTION: 🔥 Trending diese Woche  [Alle anzeigen →] ────────────────  │
│  (horizontal scrollbare Cards, wie Discover "Featured")                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ "IPA-Hopfen: │  │ "Equipment   │  │ "Mein erstes │  │ "Saison mit  │  │
│  │  Vergleich"  │  │  unter 200€" │  │  Märzen 🍺"  │  │  Koriander?" │  │
│  │              │  │              │  │              │  │              │  │
│  │ 🍻47  💬32   │  │ 🍻39  💬28   │  │ 🍻31  💬18   │  │ 🍻22  💬11   │  │
│  │ Rezepte      │  │ Technik      │  │ Rezepte      │  │ Off-Topic    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                    ◄ scroll ►                                              │
│                                                                            │
│  ── SECTION: # Kategorien ───────────────────────────────────────────────  │
│  (Kompakter als jetzt: 5 Karten in 1 Zeile, Icon + Titel + Thread-Zahl)  │
│  [📢 Ankündigungen 12]  [📜 Rezepte 84]  [🔧 Technik 56]  [🛒 Markt 23]  │
│                                                                            │
│  ── SECTION: Aktuelle Diskussionen ── [🕐 Neu | 🔥 Hot | 👤 Für dich]    │
│  (Tabbed Feed, Standard-Thread-Cards — s. Thread-Card-Design unten)       │
│  ┌─ Thread-Card ─────────────────────────────────────────────────────┐   │
│  │ [Ava] @BrewMaster [Rezepte] • vor 2 Std.              🍻14 💬8 👁340 │  │
│  │ IPA-Hopfen: Der große Vergleich — Citra vs. Mosaic vs. Simcoe      │   │
│  │ "Nach 3 Batches mit verschiedenen Sorten möchte ich meine..."      │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│  ┌─ Thread-Card ─────────────────────────────────────────────────────┐   │
│  │ ...                                                                │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design-Referenzen:**

- **SectionHeader-Muster** aus `/discover` — Icon in `bg-zinc-900 rounded-lg border-zinc-800`, Titel, Count, "Alle anzeigen →" Link
- **Horizontaler Scroll** (Trending-Sektion) → identisch zu Discover's Featured/Trending-Carousel
- **Tabbed Feed** → X/Twitter "Für dich / Trending / Neueste"
- **Kompakte Kategorie-Rail** → Reddit's Sidebar ohne die Kategorientext-Menge

---

##### Seite 2: Kategorie `/forum/[slug]` — Neues Design

**Was ändert sich:**

Statt Breadcrumb + roher Liste: Kategorie-Hero mit Stats, Filter-Zelle, reiche Thread-Cards.

```
┌─ /forum/rezepte — Neue Seitenstruktur ─────────────────────────────────────┐
│                                                                             │
│  ── KATEGORIE-HERO ──────────────────────────────────────────────────────  │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  📜                                                                   ║  │
│  ║  Rezepte & Zutaten                          84 Threads · 312 Posts   ║  │
│  ║  Teile deine Rezepte, diskutiere Zutaten,   🟢 3 aktive Diskussionen ║  │
│  ║  finde Inspiration für dein nächstes Bier                            ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                             │
│  ── FILTER-ZEILE ────────────────────────────────────────────────────────  │
│  [🕐 Neueste] [🔥 Top] [💬 Meiste Antworten] [❓ Offen] [✅ Gelöst]       │
│  Tags: [Alle ▾] [Frage ×] [IPA ×]              [🔍 Suchen]               │
│                                                                             │
│  ── THREAD-LISTE ────────────────────────────────────────────────────────  │
│  ┌─ Thread-Card ────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌─────┐  @BrewMaster99  [💡 Tipp] [IPA]       vor 2 Std.          │  │
│  │  │ Ava │  IPA-Hopfen: Citra vs. Mosaic — mein Erfahrungsbericht     │  │
│  │  └─────┘  "Nach drei Batches habe ich festgestellt, dass Citra      │  │
│  │            für Aroma-Hops unschlagbar ist, Mosaic aber..."           │  │
│  │                                                                      │  │
│  │  [🍺 Cascade IPA v2   ABV 5.8%  IBU 42]  ← Brew-Preview-Chip       │  │
│  │                                                                      │  │
│  │  🍻 14   💬 8 Antworten   👁 340 Aufrufe              [Teilen] [🔖] │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Thread-Card (gepinnt) ────── 📌 ───────────────────────────────────┐  │
│  │  ┌─────┐  Admin  [📌 Gepinnt]                       3 Tage alt     │  │
│  │  │     │  Willkommen in Rezepte & Zutaten — Regeln & FAQ           │  │
│  │  └─────┘  🍻 31   💬 2   👁 1.2k                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│                       [+ Neuen Thread erstellen]  ← sticky CTA Mobile     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Design-Referenzen:**

- **Kategorie-Hero** → Reddit's Subreddit-Banner, aber kompakter und im BotlLab-Stil
- **Filter-Zeile** → Entdeckungsseite-Filter-Chips (ABV/IBU-Muster aus Discover) + Tags
- **Pinned-Thread-Card** → Visuell abgesetzt (emerald-linker Balken oder `📌`-Badge)

---

##### Seite 3: Thread-Detail `/forum/thread/[id]` — Neues Design

**Was ändert sich:**

Der OP-Post und die Reply-Liste bekommen klares Information-Design mit sichtbarer Vote-Achse, Breadcrumb-Header und sauberem Antwort-Baum.

```
┌─ /forum/thread/[id] — Neue Seitenstruktur ─────────────────────────────────┐
│                                                                             │
│  ← Forum / Rezepte & Zutaten                                    [⋮ Mehr]  │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  [💡 Tipp] [IPA] [Equipment]          ← Thread-Tags                       │
│  IPA-Hopfen: Citra vs. Mosaic vs. Simcoe                                   │
│  @BrewMaster99  •  Meister  •  15. Feb 2026  •  340 Aufrufe               │
│                                                                             │
│  ╔═ OP ════════════════════════════════════════════════════════════════╗   │
│  ║  ┌─────────┐   @BrewMaster99                           OP          ║   │
│  ║  │  Avatar │   Meister · Mitglied seit 2023                         ║   │
│  ║  └─────────┘                                                        ║   │
│  ║                                                                      ║   │
│  ║  "Nach drei Batches mit verschiedenen Hopfen möchte ich hier        ║   │
│  ║   meine Erfahrungen teilen. Citra liefert das fruchtigste Aroma,    ║   │
│  ║   Mosaic ist komplexer, Simcoe hat die beste Bitterung..."           ║   │
│  ║                                                                      ║   │
│  ║  ┌────────────────────────────────────────────────────────────┐     ║   │
│  ║  │ 🍺 Verknüpftes Rezept: Cascade IPA v2                     │     ║   │
│  ║  │    ABV 5.8% · IBU 42 · Pale Ale · All-Grain               │     ║   │
│  ║  └────────────────────────────────────────────────────────────┘     ║   │
│  ║                                                                      ║   │
│  ║  [🍻 Prost! 14]  [💡 Hilfreich 6]  [🔥 3]                          ║   │
│  ║  [💬 Antworten]  [🔖 Merken]  [↗ Teilen]  [⚑ Report]               ║   │
│  ╚══════════════════════════════════════════════════════════════════════╝   │
│                                                                             │
│  ── 8 Antworten ──────────── [Beliebteste ▾] ─────────────────────────── │
│                                                                             │
│  ┌─ Post ─────────────────────────────────────────────────────────────┐   │
│  │ [Ava]  @HopfenKönig · Kenner · vor 1 Std.          🍻 8  [↩️ 3]   │   │
│  │ "Volle Zustimmung bei Citra! Ein Tipp: mit 80°C Whirlpool-Hopfen  │   │
│  │  bekommst du noch mehr Tropen-Aroma heraus ohne Bitterung..."      │   │
│  │ [💡 Hilfreich 8]  [↩️ Antworten]                                   │   │
│  │                                                                      │   │
│  │  ┌─ Antwort ──────────────────────────────────────────────────┐    │   │
│  │  │ [Ava]  @BrewMaster99 · vor 45 Min.                🍻 3    │    │   │
│  │  │ "Danke! Welche Temperatur empfiehlst du genau?"           │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Post ─────────────────────────────────────────────────────────────┐   │
│  │ [Ava]  @MalzMeister · vor 3 Std.                      🍻 5        │   │
│  │ "Simcoe sollte man nicht unterschätzen! Gerade für..."             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Deine Antwort ─────────────────────────────────────────────────────┐  │
│  │ Schreibe eine Antwort...                                    [Senden]│  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Design-Referenzen:**

- **OP-Card** → Visuell abgesetzt (leicht erhöhter `bg-zinc-900/40`, linker emerald-Streifen)
- **Reaction-Bar** → Unter OP und jedem Post: `[🍻 Prost! N]  [💡 N]  [🔥 N]`
- **Antwort-Einrückung** → 1 Ebene sichtbar im Main-Thread, ab 2. Ebene "N weitere Antworten" collapsed (Phase 2.2)
- **Sticky Reply-Box** → Nicht `sticky bottom-0` mit `bg-black` wie aktuell, sondern am Ende der Liste als natürliche Box — auf Mobile als Bottom-Sheet

---

##### Neue Thread-Card — Design-System

Die Thread-Card ist das wichtigste UI-Element des Forums. Sie erscheint auf 3 Seiten (Index, Kategorie, Suche) und muss auf Desktop und Mobile funktionieren.

```
┌─ Thread-Card — Anatomie ──────────────────────────────────────────────────┐
│                                                                            │
│  ┌───┐  @Username · [Tier-Badge]               [Kategorie-Chip]           │
│  │Av.│  Zeitstempel (relativ: "vor 2 Std." / "gestern" / "14. Jan.")      │
│  └───┘                                                                    │
│                                                                            │
│  📌 Titel des Threads (font-bold, truncate bei 2 Zeilen)                  │
│                                                                            │
│  Preview-Text (max. 2 Zeilen, text-zinc-400, line-clamp-2)                │
│  "Erster Satz des Thread-Inhalts der sich über etwas mehr als..."         │
│                                                                            │
│  [Optional: Brew-Preview-Chip ──────────────────────────────────────────] │
│  │ 🍺 Rezeptname   ABV · IBU · Stil                                       │
│                                                                            │
│  [Optional: Tags ──────────] [Frage] [IPA] [Anfänger]                    │
│                                                                            │
│  ── Meta-Zeile ─────────────────────────────────────────────────────────  │
│  🍻 14    💬 8 Antworten    👁 340    ···                [🔖]  [↗]        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Prioritäts-Varianten (nach Feature-Phase):**

| Variante                      | Phase | Inhalt                                                                             |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------- |
| **Minimal** (jetzt umsetzbar) | 0     | Avatar + Author + Kategorie + Titel + Zeit + Antwort-Count                         |
| **Standard**                  | 1     | + 2-Zeilen-Preview + View-Count + Brew-Chip                                        |
| **Rich**                      | 1-2   | + Voting-Count + Tags + Bookmark-Button                                            |
| **Full**                      | 2-3   | + Reactions inline + Teilen-Button + "X neue Antworten seit deinem letzten Besuch" |

---

##### Technische Umsetzung

| Schritt                         | Details                                                                                                                                     | Aufwand  | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| **Neues Layout-Grid**           | `/forum/layout.tsx` unverändert; `page.tsx` erhält 3-spaltige CSS-Grid-Struktur mit `lg:grid-cols-[220px_1fr_300px]`                        | 1 Tag    | ✅     |
| **Kategorie-Sidebar (Desktop)** | Server-Component `ForumSidebar.tsx` — Kategorien via `getForumCategories()`, aktive Kategorie highlighted, „Neues Thema"-CTA                | 1 Tag    | ✅     |
| **Trending-Widget**             | `ForumRightRail.tsx` — Top-5 Threads via `getTrendingThreads()` (last_reply_at letzte 30 Tage); Community-Stats-Widget                      | 0.5 Tage | ✅     |
| **Neue Thread-Card**            | `ForumThreadCard.tsx` — wiederverwendbar auf Index, Kategorie, Suche; Standard-Variante mit Avatar, Tier-Badge, 2-Zeilen-Preview, Brew-Chip | 1 Tag    | ✅     |
| **Kategorie-Hero**              | `/forum/[slug]/page.tsx` mit `getCategoryWithStats(slug)` — Icon, Titel, Beschreibung, Thread-Count, Accent-Farben                          | 0.5 Tage | ✅     |
| **Tabbed Feed**                 | URL-Params `?tab=new\|top` auf Index, `?sort=new\|top` auf Kategorie-Seite                                                                  | 0.5 Tage | ✅     |
| **Horizontal Trending Scroll**  | Trending-Carousel auf Forum-Index mit `overflow-x-auto` im Discover-Section-Header-Pattern                                                  | 0.5 Tage | ✅     |
| **FAB (Mobile)**                | Floating Action Button `fixed bottom-6 right-6 lg:hidden` auf Index und Kategorie-Seite                                                     | 0.5 Tage | ✅     |
| **Sticky Sidebar**              | `sticky top-24` mit `max-h-[calc(100vh-6rem)] overflow-y-auto`; auch in Thread-Detail-Seite                                                 | 0.5 Tage | ✅     |

**~~Geschätzter Aufwand:~~ ~6-7 Tage** → **Tatsächlicher Aufwand: ~1 Tag** (dank bestehender Komponenten-Architektur und Wiederverwendung des Discover-Patterns)

> ⚠️ **Abhängigkeiten:** Dieses Redesign nutzt `view_count` (Phase 0.2), Voting (Phase 1.2 für Trending-Widget), und Tags (Phase 2.1 für vollen Nutzen der Filter-Zeile). Die Basis-Struktur ist aber bereits ohne diese Features deploybar — die Slots bleiben einfach leer bis die Features folgen.

---

### Phase 2: Ambition — Community-Motor (Monat 2-4)

> **Motto:** "Jetzt wird aus dem Forum eine Community."

#### 2.1 🏷️ Thread-Tags / Flair-System

**Konzept:** User wählen beim Erstellen Tags, die den Thread-Typ kennzeichnen.

**Vordefinierte Tags:**
| Tag | Farbe | Kontext |
|-----|-------|---------|
| `Frage` | 🔵 Blue | Hilfe gesucht |
| `Rezept` | 🟢 Green | Rezept-Diskussion |
| `Showcase` | 🟡 Amber | "Schaut was ich gebraut hab!" |
| `Equipment` | 🟣 Purple | Hardware, Tools |
| `Tipp` | 🟢 Emerald | How-To, Best Practice |
| `Problem` | 🔴 Rose | Hilfe bei Fehler |
| `Diskussion` | ⚪ Zinc | Offener Diskurs |
| `Neuigkeit` | 🟠 Orange | News & Updates |

**Filterbar:** Tags werden als klickbare Filter in der Kategorie-Ansicht und auf `/forum` angezeigt.

**Aufwand:** 2-3 Tage

---

#### 2.2 🧵 Threaded Replies (Verschachtelte Antworten)

**Konzept:** `parent_id` endlich nutzen! Antworten können direkt unter dem referenzierten Post angezeigt werden — wie Reddit's Collapsed Threads.

```
┌ Post von @BrewMaster ──────────────────────────┐
│ "Für ein IPA empfehle ich Cascade..."           │
│ [🍻 14] [💬 3] [↩️ Antworten]                    │
│                                                 │
│   ┌ @HopfenKönig ──────────────────────────┐   │
│   │ "Cascade ist super, aber Citra hat      │   │
│   │  mehr Aroma-Punch!"                     │   │
│   │ [🍻 8] [💬 1] [↩️]                       │   │
│   │                                         │   │
│   │   ┌ @BrewMaster ──────────────────┐     │   │
│   │   │ "Stimmt, als Dry Hop ist       │     │   │
│   │   │  Citra unschlagbar!"           │     │   │
│   │   │ [🍻 3] [↩️]                    │     │   │
│   │   └────────────────────────────────┘     │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   ┌ @MalzMeister ─────────────────────────┐    │
│   │ "Vergiss Simcoe nicht!"                │    │
│   │ [🍻 5] [↩️]                             │    │
│   └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Design-Entscheidungen:**

- Max Nesting-Tiefe: 3 Ebenen (danach flatten wie Reddit)
- Collapse/Expand für Sub-Threads
- Mobile: Reduzierte Einrückung, Swipe-to-Reply

**Aufwand:** 4-5 Tage

---

#### 2.3 👤 Forum-User-Profil

**Konzept:** Dedizierte Forum-Sektion auf der Brewer-Profilseite.

```
┌─ @HopfenKönig ─────────────────────────────────────┐
│                                                     │
│  🍺 Brau-Reputation: 847                            │
│  📊 142 Beiträge • 23 Threads • Mitglied seit 2024 │
│                                                     │
│  🏅 Achievements:                                   │
│  [💬 Forum-Pionier] [🔥 Hot-Take 10x] [💡 Helfer]   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  📌 Letzte Beiträge    🧵 Threads    🔖 Gespeichert │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  • "Cascade ist super, aber Citra hat mehr..."      │
│    in "Hopfen-Empfehlung" • vor 2 Stunden • 🍻 8   │
│                                                     │
│  • "Für die Gärtemperatur empfehle ich..."          │
│    in "Erstes Weizen" • vor 1 Tag • 🍻 14          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Aufwand:** 3-4 Tage

---

#### 2.4 🔔 Notifications 2.0

**Konzept:** Vollständiges Benachrichtigungs-System mit Thread-Subscriptions.

| Trigger                                        | Empfänger                        | Kanal           |
| ---------------------------------------------- | -------------------------------- | --------------- |
| Neue Antwort auf meinen Thread                 | Thread-Autor                     | In-App + E-Mail |
| Neue Antwort auf Thread den ich abonniert habe | Alle Abonnenten                  | In-App + E-Mail |
| Jemand hat meinen Post hochgevotet             | Post-Autor                       | In-App          |
| `@Mention` in einem Post                       | Genannter User (echte Mentions!) | In-App + E-Mail |
| Mein Thread wurde als "Gelöst" markiert        | Alle Teilnehmer                  | In-App          |
| Neuer Thread in abonnierter Kategorie          | Kategorie-Abonnenten             | In-App          |

**Neue DB-Tabelle:**

```sql
forum_subscriptions (
  id uuid,
  user_id uuid,
  target_type enum('thread', 'category'),
  target_id uuid,
  notify_email boolean DEFAULT false,
  created_at timestamptz
)
```

**Auto-Subscribe:** User wird automatisch Abonnent wenn er in einem Thread antwortet.

**Aufwand:** 3-4 Tage

---

#### 2.5 📊 Polls / Umfragen

**Konzept:** Threads können eine eingebettete Umfrage enthalten.

```
┌─ Umfrage: Welcher Hopfen für IPA? ──────────────────┐
│                                                      │
│  ████████████████████████████░░░░░░  Citra (42%)     │
│  ████████████████░░░░░░░░░░░░░░░░░  Mosaic (28%)    │
│  ████████████░░░░░░░░░░░░░░░░░░░░░  Cascade (19%)   │
│  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░  Simcoe (11%)    │
│                                                      │
│  87 Stimmen • Endet in 3 Tagen                       │
│  [Bereits abgestimmt ✅]                              │
└──────────────────────────────────────────────────────┘
```

**DB-Schema:**

```sql
forum_polls (id, thread_id, question, ends_at, multiple_choice boolean)
forum_poll_options (id, poll_id, label, sort_order)
forum_poll_votes (id, option_id, user_id, created_at) UNIQUE(option_id, user_id)
```

**Aufwand:** 3-4 Tage

---

#### 2.6 📈 Trending & Discovery

**Konzept:** Algorithmische Gewichtung für "Was ist gerade heiß?"

**Hot-Score-Formel (Reddit-inspiriert):**

```
hot_score = log10(max(|votes|, 1)) + (created_timestamp / 45000)
```

**Trending-Widget auf `/forum`:**

```
🔥 Trending diese Woche
━━━━━━━━━━━━━━━━━━━━━━
1. "Das beste Equipment unter 200€" — 47 Votes, 32 Antworten
2. "Neuer BotlLab-Feature: Label-Editor 2.0" — 39 Votes
3. "Hilfe: Mein Weizen schmeckt nach Banane 🍌" — 28 Votes
```

**Cross-Promotion mit `/discover`:**

- Trending Forum-Threads als Karte in der Discover-Seite
- "Community diskutiert" Sektion in Discover

**Aufwand:** 2-3 Tage

---

#### 2.7 ⚡ Realtime Updates (Supabase Realtime)

**Konzept:** Live-Updates ohne Page-Refresh.

| Feature                  | Implementierung                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **Neue Posts**           | Supabase Channel auf `forum_posts` WHERE `thread_id = X` → "2 neue Antworten" Banner |
| **Live Vote-Count**      | Optimistic UI + Realtime-Broadcast für Vote-Changes                                  |
| **Typing Indicator**     | Supabase Presence: "BrewMaster tippt..." (optional, kann nervig sein)                |
| **New Thread Indicator** | Auf Kategorie-Seite: "5 neue Threads seit deinem letzten Besuch"                     |

**Aufwand:** 2-3 Tage

---

#### 2.8 📌 Admin-Editorial: Forum-Threads featuren

**Konzept:** Admins können einzelne Forum-Threads manuell als „Featured" markieren — analog zur bestehenden Rezept-Featuring-Funktion im Admin-Dashboard für `/discover`. Featured Threads erscheinen prominent auf der Forum-Startseite und geben dem Team ein kuratorisches Steuerungsinstrument für Qualitätsinhalte und Community-Highlights.

**Orientierung:** Die `/discover`-Seite hat bereits ein vollständiges Editorial-System (Admin-Tab, `is_featured`-Flag, prominente Platzierung im Feed). Dieses Muster wird 1:1 auf das Forum übertragen.

**Feature-Details:**

| Aspekt                         | Design-Entscheidung                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DB-Schema**                  | `is_featured boolean DEFAULT false`, `featured_at timestamptz`, `featured_until timestamptz` (NULL = kein Ablauf) auf `forum_threads`            |
| **Migration**                  | Neue Migration `forum_thread_featuring.sql` — Spalten + RLS (nur Service-Role/Admin darf schreiben)                                              |
| **Admin-UI**                   | Neuer Tab „Forum Featured" in `app/admin/dashboard/DashboardTabs.tsx` — Thread-Suche nach Titel/ID, Toggle-Button, optionales Ablaufdatum setzen |
| **Forum-Index**                | Neue Sektion „📌 Empfohlen vom Team" auf `/forum` — über der Trending-Sektion, visuelle Abhebung durch `border-emerald-500/40 bg-emerald-500/5`  |
| **Automatisches Ablaufen**     | `featured_until`-Check direkt in `getFeaturedThreads()` — kein Cron nötig, abgelaufene Threads werden einfach nicht mehr angezeigt               |
| **Max. gleichzeitig featured** | Soft-Limit: Admin-UI zeigt Warnung ab 5 gleichzeitig aktiven Featured-Threads                                                                    |

**Technische Umsetzung:**

```ts
// lib/forum-service.ts
export async function getFeaturedThreads() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("forum_threads")
    .select(
      "*, author:profiles(id, display_name, avatar_url:logo_url, tier), category:forum_categories(title, slug)",
    )
    .eq("is_featured", true)
    .or(`featured_until.is.null,featured_until.gt.${now}`)
    .order("featured_at", { ascending: false })
    .limit(5);
  return data || [];
}
```

**Admin-Flow:**

```
Admin-Dashboard → Tab „Forum Featured"
  → Suchfeld: Thread-Titel eingeben → passende Threads erscheinen als Cards
  → [📌 Als Featured markieren] → optionales Enddatum wählen → Speichern
  → Thread ist sofort auf /forum in der „Empfohlen"-Sektion sichtbar
  → [✕ Entfernen] jederzeit möglich — kehrt zurück in normale Sortierung
```

**Aufwand:** 1-2 Tage (Migration + Admin-Tab + `getFeaturedThreads()` + Forum-Index-Sektion)

---

### Phase 3: Vision — Das Ökosystem (Monat 4-8)

> **Motto:** "Von Forum zu Community-Plattform."

#### 3.1 🏆 Awards & Auszeichnungen

**Konzept:** Premium-User können Posts mit speziellen Awards auszeichnen.

| Award             | Kosten          | Visuell                    |
| ----------------- | --------------- | -------------------------- |
| 🍻 Prost!         | Gratis (= Vote) | Kleines Icon               |
| 🌿 Hopfen-Award   | 5 BotlCoins     | Grüner Glow um Post        |
| 🏅 Meisterbräu    | 20 BotlCoins    | Goldener Rahmen + Badge    |
| 💎 Diamant-Hopfen | 50 BotlCoins    | Full-Width animated Banner |

**BotlCoins:** Premium-User erhalten monatlich Coins mit ihrem Abo. Gratis-User können sie durch Achievements verdienen.

**Aufwand:** 4-5 Tage

---

#### 3.2 📖 Brau-Tagebücher (Brew Journals)

**Konzept:** Spezielle Thread-Art, die chronologische Updates über einen Brauprozess ermöglicht — wie X/Twitter-Threads, aber mit Brew-Link und Timeline-UI.

```
┌─ 📖 Brau-Tagebuch: "Mein erstes Märzen" ───────────────┐
│  Verknüpft: [Münchner Märzen 2025]  🕐 Begonnen: 15.3. │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ● Tag 1: Einmaischen                     15. März      │
│  │  "Heute geht's los! 15kg Münchner Malz..."           │
│  │  [📷 3 Bilder] [🍻 12]                                │
│  │                                                       │
│  ● Tag 3: Hauptgärung                     17. März      │
│  │  "Die Gärung ist voll im Gang! SG 1.052 → 1.020"     │
│  │  [📷 1 Foto] [📊 Messwerte] [🍻 8]                    │
│  │                                                       │
│  ● Tag 14: Nachgärung                     28. März      │
│  │  "Ab in die Flaschen! 6.7g/L CO2 Ziel..."            │
│  │  [📷 2 Bilder] [🍻 15]                                │
│  │                                                       │
│  ○ Nächster Eintrag... (nur Autor)                       │
│                                                          │
│  [💬 24 Kommentare]                                       │
└──────────────────────────────────────────────────────────┘
```

**Warum das genial ist:**

- Bindung: User kehren zurück um Updates zu lesen
- Content: Automatisch wertvoller, dokumentarischer Inhalt
- Brew-Integration: Direkte Verknüpfung mit Session-Logs
- Community: Andere Brauer können begleiten und Tipps geben

**Aufwand:** 5-6 Tage

---

#### 3.3 👥 Echte @Mentions

**Konzept:** `@Username` mit Autocomplete-Dropdown, nicht nur `@Autor`.

- Typing `@` öffnet Dropdown mit User-Suche
- Supabase-Query auf `profiles` mit `display_name ILIKE '%query%'`
- Rendered als klickbarer Link zum Profil
- Löst Notification beim genannten User aus

**Aufwand:** 2-3 Tage

---

#### 3.4 📸 Showcase-Feed (Instagram-Modus)

**Konzept:** Separater Tab/View für visuelle Posts — Bier-Fotos im Grid.

```
┌─ Forum ─ [Diskussionen]  [📸 Showcase]  [📊 Trending] ─┐
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ 📷   │ │ 📷   │ │ 📷   │ │ 📷   │                    │
│  │      │ │      │ │      │ │      │                    │
│  │IPA   │ │Stout │ │Weizen│ │Märzen│                    │
│  │🍻 24 │ │🍻 18 │ │🍻 31 │ │🍻 12 │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ 📷   │ │ 📷   │ │ 📷   │ │ 📷   │                    │
│  │      │ │      │ │      │ │      │                    │
│  │Lager │ │Saison│ │Porter│ │Pils  │                    │
│  │🍻 9  │ │🍻 15 │ │🍻 7  │ │🍻 22 │                    │
│  └──────┘ └──────┘ └──────┘ └──────┘                    │
└──────────────────────────────────────────────────────────┘
```

**Aufwand:** 3-4 Tage

---

#### 3.5 🤖 BotlGuide im Forum (AI-Assistent)

**Konzept:** Der BotlGuide (existiert bereits als Feature) wird in Forum-Threads eingebunden.

- "Frag den BotlGuide" Button unter Threads der Kategorie "Fragen"
- AI liest Thread-Content und gibt eine Antwort basierend auf dem Wissensstand
- Markiert als "🤖 BotlGuide-Vorschlag" — Community kann dagegen voten
- Optional: Automatische Antwort auf Threads die 24h unbeantwortet sind

**Aufwand:** 3-4 Tage (Integration mit bestehendem BotlGuide)

---

#### 3.6 📱 Mobile UX Revolution

**Konzept:** Forum komplett für Mobile optimieren mit nativen Patterns.

| Pattern                    | Inspiration      | Details                                          |
| -------------------------- | ---------------- | ------------------------------------------------ |
| **Bottom-Sheet Reply**     | Instagram        | Reply-Input als Bottom-Sheet statt sticky footer |
| **Swipe Actions**          | iOS Mail         | Swipe links: Bookmark. Swipe rechts: Vote.       |
| **Pull-to-Refresh**        | All native apps  | Neuladen durch Herunterziehen                    |
| **Long-Press Menu**        | iOS Context Menu | Post-Aktionen (Reply, Quote, Report, Share)      |
| **Floating Action Button** | Material Design  | "+" FAB für neuen Thread, überall sichtbar       |
| **Haptic Feedback**        | iOS              | Vibration bei Vote, Achievement, etc.            |

**Aufwand:** 4-5 Tage

---

### Phase 4: Moonshot — Langfrist-Vision (Monat 6-12+)

| Feature                               | Beschreibung                                                              | Inspiration               |
| ------------------------------------- | ------------------------------------------------------------------------- | ------------------------- |
| **🎙️ Brau-Stammtisch**                | Scheduled Audio-Rooms für Live-Diskussionen                               | X Spaces, Clubhouse       |
| **📹 Video-Embeds**                   | Kurze Brau-Clips (30s-3min) direkt im Thread                              | Instagram Reels           |
| **🌐 Multi-Language**                 | Forum auf Englisch + weitere Sprachen                                     | Reddit                    |
| **💬 Direct Messages**                | Private 1:1 und Gruppen-Nachrichten                                       | Instagram DMs             |
| **🏪 Marketplace**                    | Equipment kaufen/verkaufen/tauschen                                       | Reddit r/homebrewexchange |
| **📅 Events**                         | Community Brew-Days, Wettbewerbe, Tastings                                | Meetup, Eventbrite        |
| **🗺️ Lokale Gruppen**                 | Regionale Sub-Communities (München, Berlin, Wien...)                      | Reddit local subs         |
| **📊 Recipe Discussions Auto-Thread** | Jedes veröffentlichte Rezept bekommt automatisch einen Diskussions-Thread | StackOverflow linked Q&A  |
| **🏆 Wettbewerbe**                    | Community-Brauwettbewerbe mit Voting-Phasen                               | Reddit "Best Of"          |
| **🔗 API & Webhooks**                 | Externe Integration (Discord-Bot, Slack-Notifications)                    | GitHub Webhooks           |

---

## 5. Technische Architektur-Empfehlungen

### 5.1 Aktuelle Architektur (simpel, aber limitiert)

```
Browser → Next.js SSR → Supabase (direct query)
         Server Actions → Supabase (insert/update)
```

### 5.2 Ziel-Architektur (skalierbar)

```
Browser ─→ Next.js App Router
           ├─ Server Components (SSR reads)
           ├─ Server Actions (mutations)
           ├─ API Routes (search, paginated queries, votes)
           └─ Client Components
              ├─ Supabase Realtime (WebSocket)
              ├─ Optimistic Updates (React 19 useOptimistic)
              └─ Infinite Scroll (Intersection Observer)

Supabase ─→ PostgreSQL
            ├─ Full-Text Search (tsvector + GIN index)
            ├─ Materialized Views (hot_score, trending)
            ├─ DB Functions (vote, subscribe, increment_view)
            └─ Edge Functions (image resize, email)

Storage ─→ Supabase Storage (forum-uploads bucket)
           ├─ Image optimization (Edge Function)
           └─ CDN delivery
```

### 5.3 Neue DB-Tabellen (Gesamtübersicht)

```sql
-- Phase 0
ALTER TABLE forum_threads ADD COLUMN is_solved boolean DEFAULT false;

-- Phase 1
CREATE TABLE forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('thread', 'post')),
  user_id uuid NOT NULL REFERENCES profiles(id),
  reaction_type text NOT NULL DEFAULT 'prost' CHECK (reaction_type IN ('prost', 'helpful', 'fire')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(target_id, user_id, reaction_type)
);

CREATE TABLE forum_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('thread', 'post')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_id)
);

-- Phase 2
CREATE TABLE forum_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  icon text
);

CREATE TABLE forum_thread_tags (
  thread_id uuid REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, tag_id)
);

CREATE TABLE forum_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  target_type text NOT NULL CHECK (target_type IN ('thread', 'category')),
  target_id uuid NOT NULL,
  notify_email boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE TABLE forum_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  question text NOT NULL,
  ends_at timestamptz,
  multiple_choice boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE forum_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE forum_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES forum_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(option_id, user_id)
);

-- Phase 3
CREATE TABLE forum_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  cost integer NOT NULL DEFAULT 0,
  description text
);

CREATE TABLE forum_post_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('thread', 'post')),
  award_id uuid NOT NULL REFERENCES forum_awards(id),
  giver_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### 5.4 Performance-Indexes

```sql
-- Voting
CREATE INDEX idx_forum_votes_target ON forum_votes(target_id, target_type);
CREATE INDEX idx_forum_votes_user ON forum_votes(user_id);

-- Bookmarks
CREATE INDEX idx_forum_bookmarks_user ON forum_bookmarks(user_id);

-- Full-Text Search
ALTER TABLE forum_threads ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(content, '')), 'B')
  ) STORED;
CREATE INDEX idx_forum_threads_search ON forum_threads USING GIN(search_vector);

ALTER TABLE forum_posts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('german', coalesce(content, ''))) STORED;
CREATE INDEX idx_forum_posts_search ON forum_posts USING GIN(search_vector);

-- Subscriptions
CREATE INDEX idx_forum_subscriptions_target ON forum_subscriptions(target_type, target_id);

-- Hot Score (materialized view, refreshed every 5 min)
CREATE MATERIALIZED VIEW forum_hot_threads AS
SELECT
  t.id,
  t.title,
  t.category_id,
  COALESCE(v.vote_count, 0) as vote_count,
  t.reply_count,
  t.view_count,
  LOG(GREATEST(COALESCE(v.vote_count, 0), 1)) +
    (EXTRACT(EPOCH FROM t.created_at) / 45000) as hot_score
FROM forum_threads t
LEFT JOIN (
  SELECT target_id, COUNT(*) as vote_count
  FROM forum_votes WHERE target_type = 'thread'
  GROUP BY target_id
) v ON v.target_id = t.id
ORDER BY hot_score DESC;
```

---

## 6. Gamification & Engagement-Mechaniken

### 6.1 Brau-Reputation (Karma)

| Aktion                                  | Punkte |
| --------------------------------------- | ------ |
| Thread erstellen                        | +5     |
| Antwort schreiben                       | +2     |
| "Prost!" erhalten                       | +3     |
| "Hilfreich" erhalten                    | +5     |
| "Feuer" erhalten                        | +4     |
| Eigener Thread als "Gelöst" markiert    | +10    |
| Award erhalten (Hopfen)                 | +15    |
| Award erhalten (Meisterbräu)            | +30    |
| Award erhalten (Diamant)                | +50    |
| Downvote erhalten (falls implementiert) | -2     |

### 6.2 Forum-Achievements (Integration mit bestehendem System)

| Achievement              | Bedingung                                 | Badge   |
| ------------------------ | ----------------------------------------- | ------- |
| 📝 Erster Beitrag        | 1. Forum-Post                             | Bronze  |
| 💬 Diskussions-Starter   | 10 Threads erstellt                       | Silber  |
| 🏆 Community-Held        | 100 "Hilfreich"-Votes erhalten            | Gold    |
| 🔥 Trend-Setter          | Thread mit 50+ Votes                      | Gold    |
| 📖 Tagebuch-Autor        | 1. Brau-Tagebuch abgeschlossen            | Silber  |
| 🎯 Problem-Löser         | 20 eigene Antworten als "Gelöst" markiert | Gold    |
| 🌟 Top-Brauer des Monats | Höchste Reputation im Monat               | Platin  |
| 💎 1000er Club           | 1000 Reputation                           | Diamant |

### 6.3 Wiederkehr-Trigger

| Mechanik                  | Details                                                |
| ------------------------- | ------------------------------------------------------ |
| **Daily Digest E-Mail**   | "3 neue Antworten auf Threads die du verfolgst"        |
| **Weekly Trending**       | "Die Top 5 Diskussionen dieser Woche"                  |
| **Streak-System**         | "Du hast 7 Tage am Stück gepostet! 🔥"                 |
| **Level-Up-Push**         | "Du bist jetzt 'Forum-Veteran' (Level 5)!"             |
| **Personalisierter Feed** | "Basierend auf deinen Interessen: Neue IPA-Diskussion" |

---

## 7. Moderation & Trust System

> **Wichtig:** BotlLab hat bereits eine solide Moderation-Infrastruktur für Bild-Inhalte. Dieser Abschnitt beschreibt sowohl was existiert als auch was für das Forum ergänzt werden muss.

### 7.0 Ist-Zustand: Admin & Moderation — Lückenanalyse

Das Admin-Dashboard (`/admin/dashboard`) hat bereits: Overview, Content, Moderation (Bilder), Reports, Users, Business, Settings, System. Folgender Stand ist relevant für das Forum:

| Bereich                                    | Status                                                                                                                             | Bewertung |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Brew-Labels / Brauerei-Logos**           | `ModerationView.tsx` — Pending-Queue, Approve/Reject mit Begründung, physisches Delete aus Storage                                 | ✅ Fertig |
| **Reports (Forum + Brews + User)**         | `ReportsView.tsx` — unterstützt bereits `forum_thread` und `forum_post` als `target_type`, Content-Preview, Delete/Dismiss/Resolve | ✅ Fertig |
| **DB-Trigger `moderation_status`**         | Automatisch `pending` bei Bild-Upload → in Admin-Queue                                                                             | ✅ Fertig |
| **E-Mail-Benachrichtigung**                | `sendImageApprovedEmail()` / `sendImageRejectedEmail()` in `lib/email.ts`, Templates vorhanden                                     | ✅ Fertig |
| **Physische Löschung**                     | `rejectItem()` löscht Datei aus Supabase Storage, setzt Default-Bild                                                               | ✅ Fertig |
| **Forum-Bilder**                           | Kein Bucket, keine `forum_post_images`-Tabelle, keine Queue, keine Pipeline                                                        | ❌ Fehlt  |
| **Thread Pin/Lock (Admin)**                | `is_pinned` + `is_locked` in DB vorhanden, aber **kein Admin-UI** und `is_locked` wird im App-Code nicht ausgewertet               | ❌ Fehlt  |
| **Forum-Kategorien Management**            | Nur über DB-Migration/Seed-Script — kein Admin-UI                                                                                  | ❌ Fehlt  |
| **Thread zwischen Kategorien verschieben** | Nicht implementiert                                                                                                                | ❌ Fehlt  |
| **Forum-spezifische User-Sperre**          | Kein temporäres Posting-Verbot (nur globaler Account-Delete)                                                                       | ❌ Fehlt  |
| **Moderations-Audit-Log**                  | Kein Log wer wann was moderiert hat                                                                                                | ❌ Fehlt  |

### 7.1 Community-Moderation (Skalierbar)

| Role             | Rechte                                                | Bedingung       |
| ---------------- | ----------------------------------------------------- | --------------- |
| **User**         | Posten, Voten, Melden                                 | Registriert     |
| **Trusted User** | Können "Low Quality" flaggen (Community-Review-Queue) | 500+ Reputation |
| **Moderator**    | Pin, Lock, Delete, Move, Edit-Tag, Mute User          | Manuell ernannt |
| **Admin**        | Alles + Category-Management + User-Bans               | System-Admin    |

### 7.2 Auto-Moderation

| Feature            | Details                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| **Spam-Detection** | Duplicate-Content-Check, Link-Ratio-Check, neue User in Moderation-Queue |
| **Auto-Lock**      | Threads mit 3+ Reports automatisch gesperrt bis Review                   |
| **Slow-Mode**      | Für kontroverse Threads: Max 1 Reply pro 5 Minuten                       |
| **Shadow-Mute**    | Problematische User sehen ihre Posts noch, andere nicht                  |
| **Word-Filter V2** | Regex-basierte Blocklist (statt nur Wort-Ersatz), Admin-konfigurierbar   |

### 7.3 Moderation-Dashboard Enhancement

```
┌─ Moderation Queue ──────────────────────────────────────┐
│                                                          │
│  📊 Offene Reports: 7  |  ⚡ Auto-Flagged: 3           │
│                                                          │
│  [Alle] [Forum] [Bilder] [Profile]                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🚩 Report #1247                    vor 15 min      │  │
│  │ Thread: "Billige *** kaufen!!!"                    │  │
│  │ Grund: Spam (3x gemeldet)                         │  │
│  │ Auto-Status: ⚠️ Gesperrt                          │  │
│  │ [✅ Freigeben] [🗑️ Löschen] [⚖️ Warn User]        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 7.4 Forum-Admin-Tab (fehlt — neuer `ForumAdminView.tsx` im Admin-Dashboard)

Ein dedizierter Forum-Tab im bestehenden Admin-Dashboard ist für den operativen Betrieb notwendig. Alle Forum-Aktionen müssen ohne direkten DB-Zugriff ausführbar sein.

| Funktion                                           | Priorität       | Details                                                                                                                                             |
| -------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thread Pin/Unpin**                               | 🔴 Hoch         | `is_pinned`-Toggle. Derzeit nur über direkten DB-Schreibzugriff möglich                                                                             |
| **Thread Lock/Unlock**                             | 🔴 Hoch         | `is_locked`-Toggle. **Doppelt kaputt:** DB-Feld existiert, aber a) kein Admin-UI zum Setzen und b) App-Code prüft `is_locked` beim Posten nicht aus |
| **Thread löschen (Browse & Delete)**               | 🔴 Hoch         | Admin kann via `deleteReportedContent()` aus Reports-Tab heraus löschen ✅, aber kein direktes Durchsuchen + Löschen ohne vorherigen Report         |
| **Thread zwischen Kategorien verschieben**         | 🟠 Mittel       | `category_id`-Update per Dropdown                                                                                                                   |
| **Kategorie erstellen / bearbeiten / archivieren** | 🟠 Mittel       | Aktuell nur via DB-Migration                                                                                                                        |
| **Forum-User-Sperre**                              | 🟠 Mittel       | Temporäres Posting-Verbot ohne globalen Account-Ban (z. B. `forum_banned_until timestamptz` in `profiles`)                                          |
| **Massenmoderation**                               | 🟡 Nice-to-have | Mehrere Reports gleichzeitig abarbeiten (bulk resolve/dismiss)                                                                                      |
| **Moderations-Audit-Log**                          | 🟡 Nice-to-have | Wer hat wann was moderiert — DSA-relevant                                                                                                           |

**Umsetzung:** Neue Datei `app/admin/dashboard/views/ForumAdminView.tsx`, Einbindung in das bestehende Tab-Router-System. Aufwand: ~3-4 Tage.

### 7.5 Forum-Bild-Moderation Pipeline (Voraussetzung für Phase 1.5)

Für Forum-Bilder muss dieselbe Pipeline wie für Brew-Labels aufgebaut werden. Das ist kein optionales Nice-to-have — **ohne diese Pipeline darf kein Forum-Bild-Upload deployed werden** (vgl. Abschnitt 9 — Rechtsgrundlagen).

```
User lädt Bild hoch
       │
       ▼
/api/forum/upload-image (NEU)
  ├─ Dateityp-Check: nur jpeg/png/webp
  ├─ Größen-Check: max 5MB server-side
  ├─ Urheberrechts-Checkbox-Flag geprüft?
  └─ Upload → Supabase Storage `forum-uploads` (private, RLS: Auth-User only)
       │
       ▼
forum_post_images Tabelle (NEU, Trigger → moderation_status = 'pending')
  └─ Bild-Platzhalter im Post sichtbar (Blur/Skeleton für Autor)
       │
       ▼
Admin Dashboard → ModerationView.tsx (ERWEITERN)
  ├─ Neuer Tab "Forum-Bilder" lädt pending forum_post_images
  ├─ Approve → moderation_status = 'approved', Bild für alle sichtbar
  └─ Reject  → moderation_status = 'rejected'
              physisches Löschen aus Storage (analog zu rejectItem() in moderation-actions.ts)
              User-Benachrichtigung via sendImageRejectedEmail() (existierendes Template)
```

**Neue DB-Tabelle:**

```sql
CREATE TABLE forum_post_images (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id                     uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  image_url                   text NOT NULL,
  storage_path                text NOT NULL,        -- für physisches Löschen
  moderation_status           text NOT NULL DEFAULT 'pending'
                              CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderated_by                uuid REFERENCES profiles(id),
  moderated_at                timestamptz,
  moderation_rejection_reason text,
  created_at                  timestamptz DEFAULT now()
);

ALTER TABLE forum_post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved forum images are public"   ON forum_post_images FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "Authors see own images"             ON forum_post_images FOR SELECT USING (auth.uid() = (SELECT author_id FROM forum_posts WHERE id = post_id));
CREATE POLICY "Authors can upload images"          ON forum_post_images FOR INSERT WITH CHECK (auth.uid() = (SELECT author_id FROM forum_posts WHERE id = post_id));
```

**Code-Änderungen (minimal dank bestehender Pipeline):**

- `lib/actions/moderation-actions.ts` — `PendingItem type` von `'brew' | 'brewery'` auf `'brew' | 'brewery' | 'forum_image'` erweitern; `rejectItem()` für Forum-Storage-Pfade ergänzen
- `app/admin/dashboard/views/ModerationView.tsx` — Neuen Sub-Tab "Forum-Bilder" hinzufügen
- Kein neues E-Mail-Template nötig — `sendImageRejectedEmail()` und `sendImageApprovedEmail()` sind wiederverwendbar

**Aufwand:** ~2 Tage

---

## 8. Mobile-First UX-Vision

### 8.1 Forum Home (`/forum`) — Redesign

**Aktuell:** Statisches Grid mit 5 Kategorien + 6 "Aktuelle Diskussionen"

**Vision:**

```
┌─────────────────────────────────┐
│  ←  Community Forum      [🔍]  │  ← Integrated in Header
├─────────────────────────────────┤
│                                 │
│  [Für dich] [Trending] [Neu]    │  ← Horizontale Tabs
│  ─────────────────────────────  │
│                                 │
│  🔥 TRENDING                    │
│  ┌─────────────────────────┐    │
│  │ "IPA-Hopfen: Der große  │    │
│  │  Vergleich 2025"        │    │
│  │  🍻 47  💬 32  👁 1.2k   │    │
│  │  @BrewMaster • Rezepte  │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ "Equipment unter 200€"  │    │
│  │  🍻 39  💬 28  👁 890    │    │
│  │  @HopfenKönig • Equip.  │    │
│  └─────────────────────────┘    │
│                                 │
│  ── KATEGORIEN ──────────────   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │ 📢 │ │ 📜 │ │ 🔧 │ │ 🛒 │   │
│  │News│ │Rez.│ │Tech│ │Shop│   │
│  └────┘ └────┘ └────┘ └────┘   │
│                                 │
│  ── NEUESTE ─────────────────   │
│  • "Mein erstes Weizen"  💬 3  │
│  • "Starter-Set Empf."   💬 7  │
│  • "Gärtemperatur Prob."  💬 12 │
│                                 │
│          [+ Neues Thema]        │  ← FAB oder sticky CTA
│                                 │
└─────────────────────────────────┘
```

### 8.2 Thread-View — Redesign

```
┌─────────────────────────────────┐
│  ← Forum / Rezepte      [⋮]    │
├─────────────────────────────────┤
│                                 │
│  [Frage] [Equipment]            │  ← Tags
│                                 │
│  IPA-Hopfen: Der große          │
│  Vergleich 2025                 │
│                                 │
│  ┌─ @BrewMaster ─ Meister ──┐  │
│  │ "Welchen Hopfen empfehlt  │  │
│  │  ihr für ein klassisches  │  │
│  │  American IPA? Ich         │  │
│  │  schwanke zwischen..."    │  │
│  │                           │  │
│  │ 🍺 [Mein Cascade IPA]     │  │
│  │                           │  │
│  │ 🍻 47  💡 12  🔥 8        │  │
│  │ [💬 Antworten] [🔖] [⚑]   │  │
│  └───────────────────────────┘  │
│                                 │
│  ── 32 Antworten ────────────   │
│  [Beliebteste ▼]                │
│                                 │
│  ┌─ @HopfenKönig (💡 Best) ─┐  │
│  │ "Cascade für Bitterung,   │  │
│  │  Citra für Aroma —        │  │
│  │  unschlagbar!"            │  │
│  │ 🍻 24  [↩️ 3 Antworten]   │  │
│  └───────────────────────────┘  │
│    ┌─ @MalzMeister ─────────┐  │
│    │ "Simcoe nicht vergessen!│  │
│    │  🍻 5 [↩️]              │  │
│    └─────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 💬 Schreibe eine Antwort...     │  ← Bottom-Sheet Style
│                           [➤]  │
└─────────────────────────────────┘
```

---

## Zusammenfassung: Priorisierte Reihenfolge

| Prio | Feature                                                            | Phase | Aufwand            | Impact                 |
| ---- | ------------------------------------------------------------------ | ----- | ------------------ | ---------------------- |
| 🔴   | **DSGVO: Forum-Post-Anonymisierung** (ON DELETE CASCADE Bug)       | 0     | 45min              | Rechtspflicht          |
| 🔴   | Tech Debt Fixes (is_locked, view_count, types, etc.)               | 0     | 5-6h               | Stabilität             |
| 🔴   | SEO Metadata                                                       | 0     | 45min              | Sichtbarkeit           |
| 🔴   | Thread-Status "Gelöst"                                             | 0     | 30min              | UX                     |
| 🟠   | **AGB §4 + Datenschutz §3.2 für Forum & Bilder**                   | 0     | 1h                 | DSGVO-Compliance       |
| 🟠   | **Urheberrechts-Checkbox beim Bild-Upload**                        | 0     | 20min              | Urheberrecht           |
| 🟠   | Vote/Reaction-System                                               | 1     | 3-4 Tage           | 🔥🔥🔥 Game-Changer    |
| 🟠   | Forum-Suche mit FTS                                                | 1     | 2-3 Tage           | 🔥🔥🔥 Fundamental     |
| 🟠   | Pagination/Infinite Scroll                                         | 1     | 2 Tage             | 🔥🔥 Skalierbarkeit    |
| 🟠   | Edit & Delete                                                      | 1     | 2-3 Tage           | 🔥🔥 Grundfunktion     |
| 🟠   | **Forum-Bild-Moderation Pipeline** (vor Bild-Upload)               | 1     | 2 Tage             | Moderationspflicht     |
| 🟡   | Rich Text / Markdown                                               | 1     | 4-5 Tage           | 🔥🔥 Content-Qualität  |
| 🟡   | Bookmarks                                                          | 1     | 1-2 Tage           | 🔥 Retention           |
| 🟡   | Sort Options (🕐 Neueste ✅ · 🔥 Beliebteste ✅ · 3 weitere offen) | 1     | ~~1 Tag~~ 0.5 Tag  | 🔥 Teilweise umgesetzt |
| ✅   | **Redesign: 3-Column Layout, ThreadCard, Sections**                | 1     | ~~6-7 Tage~~ 1 Tag | 🔥🔥🔥 Umgesetzt!      |
| �🟡  | Thread-Tags / Flair                                                | 2     | 2-3 Tage           | 🔥🔥 Organisation      |
| 🟡   | Threaded Replies                                                   | 2     | 4-5 Tage           | 🔥🔥 UX-Revolution     |
| 🟡   | **Forum-Admin-Tab** (ForumAdminView.tsx)                           | 2     | 3-4 Tage           | 🔥 Admin-UX            |
| 🟢   | User-Profil Forum-Stats                                            | 2     | 3-4 Tage           | 🔥 Community           |
| 🟢   | Notifications 2.0 / Subscriptions                                  | 2     | 3-4 Tage           | 🔥🔥 Engagement        |
| 🟢   | Polls                                                              | 2     | 3-4 Tage           | 🔥 Engagement          |
| 🟢   | Trending & Discovery                                               | 2     | 2-3 Tage           | 🔥🔥 Discovery         |
| 🟢   | Realtime Updates                                                   | 2     | 2-3 Tage           | 🔥🔥 Modernität        |
| 🔵   | Awards System                                                      | 3     | 4-5 Tage           | 🔥 Monetarisierung     |
| 🔵   | Brau-Tagebücher                                                    | 3     | 5-6 Tage           | 🔥🔥 Unique Feature    |
| 🔵   | Echte @Mentions                                                    | 3     | 2-3 Tage           | 🔥 UX                  |
| 🔵   | Showcase-Feed                                                      | 3     | 3-4 Tage           | 🔥🔥 Visual Content    |
| 🔵   | BotlGuide im Forum                                                 | 3     | 3-4 Tage           | 🔥 AI-Integration      |
| 🔵   | Mobile UX Revolution                                               | 3     | 4-5 Tage           | 🔥🔥 Mobile Experience |
| ⚪   | Moonshot Features                                                  | 4     | Variabel           | Langfrist-Vision       |

---

**Gesamtaufwand Phase 0-2: ca. 40-55 Tage Entwicklung** (inkl. Compliance & Admin-Tab)
**Gesamtaufwand Phase 0-3: ca. 65-85 Tage Entwicklung**

---

## 9. Rechtliche Rahmenbedingungen & Compliance

> **Basis:** Analyse der Rechtsdokumente Stand Januar 2026 — AGB (11 Abschnitte), Datenschutzerklärung (DSGVO-konform), Impressum (§ 5 TMG).

### 9.1 Stärken: Was bereits gut geregelt ist ✅

| Dokument            | Regelung                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **AGB §3.1**        | 18+ Pflicht für alkoholbezogene Plattform ✅                                                                         |
| **AGB §4.1**        | Lizenz-Einräumung für UGC (Threads, Posts) an BotlLab, inkl. nach Account-Löschung ✅                                |
| **AGB §4.2**        | Moderationsvorbehalt: Recht zu löschen, sperren, moderieren ✅                                                       |
| **AGB §4.3**        | Haftungsausschluss für Nutzer-Ratschläge (Druckbehälter, Hygiene) — **besonders wichtig für Brau-Tipps im Forum** ✅ |
| **Datenschutz §5**  | DSGVO-Rechtsgrundlagen explizit genannt (Art. 6 Abs. 1 lit. b und f) ✅                                              |
| **Datenschutz §8**  | Vollständige DSGVO-Nutzerrechte aufgeführt inkl. Art. 17 (Löschung) ✅                                               |
| **Datenschutz §10** | Sicherheitsmaßnahmen: HTTPS, RLS, Backups ✅                                                                         |
| **Impressum**       | § 5 TMG vollständig, EU-Streitschlichtungshinweis, §§ 8-10 TMG Haftungsprivileg ✅                                   |
| **Report-System**   | Vorhanden für `forum_thread`, `forum_post`, `brew`, `user`, `brewery` → TMG §10 Kenntnis-Privilege ✅                |

### 9.2 Lücken — DSGVO

| Lücke                                                | Risiko                                                                                                                                                                     | Empfehlung                                                                                                                    | Phase             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **`ON DELETE CASCADE` auf `forum_posts.author_id`**  | Bei Account-Delete werden alle Posts gelöscht — zerstört Diskussions-Threads. Außerdem: AGB §4.1 sieht Content-Lizenz nach Account-Löschung vor, DB-Logik widerspricht dem | Soft-Delete: `author_id = NULL`, Display-Name → "Gelöschter Nutzer", Post-Inhalt bleibt erhalten                              | **0.11 — Sofort** |
| **Forum-Bilder fehlen in Datenschutz §3.2**          | Bei Bild-Upload-Launch: fehlende Transparenzpflicht nach Art. 13 DSGVO                                                                                                     | §3.2 um "Forum-Inhalte inkl. Bild-Uploads (Supabase Storage `forum-uploads`)" ergänzen mit Speicherdauer und Löschbedingungen | **0.13**          |
| **Keine Lösch-Kaskade für Forum-Bilder aus Storage** | Art. 17 DSGVO (Recht auf Vergessenwerden): physische Bild-Dateien bei Account-Delete nicht automatisch gelöscht                                                            | `forum_post_images.storage_path` bei User-Deletion aus Storage entfernen (analog zu `rejectItem()`)                           | **7.5**           |
| **Keine Rechtsgrundlage für Forum-Bilder in §3.2**   | Wenn Bilder personenbezogene Daten enthalten (Fotos von Personen etc.)                                                                                                     | Art. 6 Abs. 1 lit. a (Einwilligung über Checkbox) als Rechtsgrundlage explizit dokumentieren                                  | **0.13**          |

### 9.3 Lücken — Urheberrecht (UrhG §§ 15 ff., 97 ff.)

| Lücke                                                                                             | Risiko                                                                                                                             | Empfehlung                                                                                                          | Phase    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| **Kein Copyright-Confirmation-Checkbox** beim Bild-Upload (weder Forum noch aktuelle Brew-Labels) | Nutzer laden Fremdbilder hoch; bei Meldung durch Rechteinhaber haftet BotlLab wenn keine "Notice & Takedown"-Dokumentation besteht | Pflicht-Checkbox vor Upload: _"Ich versichere, Rechteinhaber zu sein oder zur Veröffentlichung berechtigt zu sein"_ | **0.14** |
| **AGB §4.1 nennt nur "Threads und Posts"**                                                        | Lizenz-Einräumung für Forum-Bilder rechtlich unklar                                                                                | AGB §4.1 explizit um "Bild- und Medien-Uploads" erweitern                                                           | **0.12** |

### 9.4 DSA (Digital Services Act) & TMG

BotlLab hat weit weniger als 10 Millionen Nutzer und gilt damit als **"Very Small Online Platform"** (VSOP) im Sinne des DSA. Das bedeutet:

| DSA-Anforderung                           | Status                                | Handlungsbedarf                                                          |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| **Zugängliche Nutzungsbedingungen**       | ✅ AGB vorhanden                      | Keine                                                                    |
| **Meldemechanismus für illegale Inhalte** | ✅ Report-System vorhanden            | Keine                                                                    |
| **Transparenzbericht**                    | ✅ Nicht erforderlich (< 1 Mio. User) | Keine                                                                    |
| **Widerspruchsverfahren** (Art. 20 DSA)   | ⚠️ Nicht dokumentiert                 | Minimal: Hinweis in Moderations-E-Mails auf `support@`-Adresse           |
| **Definierte Bearbeitungszeiten**         | ⚠️ Nicht festgelegt                   | Intern dokumentieren: rechtswidrig ≤ 24h, sonstige ≤ 7 Tage (Phase 0.15) |
| **Algorithmische Transparenz**            | ✅ Kein Pflicht für VSOP              | Keine                                                                    |

**NetzDG:** Gilt **nicht** für BotlLab. NetzDG erfasst nur "soziale Netzwerke" mit ≥ 2 Mio. registrierten Nutzern im Inland. BotlLab ist a) unter dieser Grenze und b) als Nischen-Community-Forum nicht primär "soziales Netzwerk" im NetzDG-Sinne.

### 9.5 Jugendschutz & Alkohol-Content

| Aspekt                                       | Status                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Altersbeschränkung 18+**                   | ✅ AGB §3.1. Keine technische Verifizierung — bei der Zielgruppe (Hobbybrauer) und Plattformgröße akzeptabel |
| **JMStV (Jugendmedienschutz-Staatsvertrag)** | Alkohol-Plattform → Altersgate bei Registrierung ist hinreichend ✅                                          |
| **JuSchG**                                   | Kein Verkauf, keine Werbung für Alkohol an Minderjährige — nicht unmittelbar anwendbar ✅                    |
| **Haftung für Brau-Ratschläge**              | ✅ Explizit in AGB §4.3 ausgeschlossen                                                                       |

### 9.6 Prioritätenmatrix: Rechtliche Handlungen

```
SOFORT (vor nächstem Deploy)
└── Phase 0.11 — DSGVO Bug-Fix: ON DELETE CASCADE auf forum_posts.author_id entfernen,
                 Soft-Delete + Anonymisierung implementieren

KURZFRISTIG (innerhalb von 2 Wochen)
├── Phase 0.12 — AGB §4 um Bild-Uploads und Forum-Media erweitern
├── Phase 0.13 — Datenschutz §3.2 um Forum-Inhalte, Bilder, Storage ergänzen
├── Phase 0.14 — Urheberrechts-Checkbox in Bild-Upload-Dialogen (Brew + Forum)
└── Phase 0.15 — Interne SLA-Dokumentation für Report-Bearbeitung

VOR BILD-UPLOAD-LAUNCH (nicht verhandelbar)
├── 7.5 — Forum-Bild-Moderation-Pipeline vollständig aufgebaut
├── Account-Deletion-Handler für forum_post_images Storage
└── 0.12 + 0.13 abgeschlossen

MITTELFRISTIG
├── Forum-Admin-Tab (7.4) — Pin, Lock, Category-Management
├── Widerspruchs-Hinweis in Moderations-E-Mails (DSA Art. 20)
└── Löschfristen für Forum-Bilder dokumentieren

BEI WACHSTUM (> 50k aktive User)
├── Automatisierte CSAM-Detection (PhotoDNA o.ä.)
├── Prüfung DSA-Transparenzbericht-Pflicht (ab 1 Mio. User)
└── Offizieller DMCA-Takedown-Prozess etablieren
```

---

> _"Das BotlLab Forum hat das Potential, der zentrale Treffpunkt der deutschsprachigen Hobbybrauer-Community zu werden. Die technische Basis ist solide, das Brew-Linking-Feature ist ein Juwel, und das Design-System ist konsistent. Was fehlt, sind die Mechaniken die aus Besuchern eine Community machen: Voting, Search, Social Features. Mit diesem Roadmap verwandeln wir ein funktionales Forum in eine lebendige Plattform."_
