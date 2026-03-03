# Brew Detail Page — Redesign Roadmap

**Datei:** `app/brew/[id]/page.tsx`  
**Status:** ✅ Abgeschlossen — Alle Phasen implementiert (27.02.2026)  
**Inspiration:** YouTube Music (Album-Detail — prominentes Cover, kompakte Actionbar, tabellarische Content-Tabs)

---

## 0. Status-Checkliste

### Phase 1: Layout-Refactor ✅ Abgeschlossen

- [x] `page.tsx` von 1488 → 651 Zeilen refactored (schlanker Shell)
- [x] `BrewHero.tsx` erstellt (Bild + Stats + Actionbar)
- [x] `BrewTabNav.tsx` erstellt (4 Tabs + Scrollbar hidden)
- [x] `BrewRecipeTab.tsx` erstellt (kompletter Rezept-Inhalt)
- [x] `BrewRatingsTab.tsx` erstellt (Histogram + Charts + QR-CTA)
- [x] `BrewCommentsTab.tsx` erstellt (Stub)
- [x] `BrewSimilarTab.tsx` erstellt (Stub)
- [x] `BrewActionButton.tsx` erstellt (wiederverwendbar, `<Link>` wenn `href`)
- [x] URL-State für Tab (`?tab=rezept` deep-link) — `useSearchParams` + `router.replace`
- [x] `MinimalStickyHeader` (Brew-Name beim Scrollen) — IntersectionObserver auf Sentinel

### Phase 2: Hero-Zone ✅ Abgeschlossen (mit kleinen Abweichungen)

- [x] Actionbar mit Labels (Remix / Speichern / Teilen / Forum)
- [x] Gleichmäßige Verteilung via `grid grid-cols-4`
- [x] Stats Row (★ · ❤ · Brauart-Badge)
- [x] Mobile: Bild `w-full aspect-square` ohne Padding
- [x] Desktop: Bild links, Hero-Text rechts
- [ ] Overflow-Sheet (Mobile): Melden / QR-Code / Native Share — noch offen
- [ ] Like-Button in der Actionbar integriert (aktuell noch LikeButton-Komponente in HeroStats)

### Phase 3: Ratings Tab ✅ Abgeschlossen

- [x] Rating-Histogram (5-Balken)
- [x] TasteRadarChart verschoben hierher
- [x] FlavorTagCloud verschoben hierher
- [x] QR-Bewertungs-CTA
- [x] Kein Rating-Form (nur via QR-Scan — USP)
- [ ] Filter "Nur verifizierte Bewertungen" — noch offen (wartet auf Phase 6)
- [ ] `qr_verified`-Badge auf Einzelbewertungen — noch offen (wartet auf Phase 6)

### Phase 4: Kommentare (hybrides System) ✅ Abgeschlossen

- [x] DB-Migration: `forum_threads.thread_type` + Unique Index auf `(brew_id) WHERE thread_type = 'brew_comments'`
- [x] Server Action `postBrewComment` + `getBrewComments` + `getBrewDiscussionThreads` in `lib/actions/brew-comments-actions.ts`
- [x] `BrewCommentsTab.tsx` — Eingabe + Liste + verschachtelte Antworten + Likes + Login-CTA
- [x] "Weitere Diskussionen im Forum"-Block

### Phase 4b: Forum-Infrastruktur ✅ Abgeschlossen

- [x] `forum_categories` Eintrag "rezept-kommentare" (sort_order 999, hidden)
- [x] Feed-Filter: `getRecentThreads` + `getTrendingThreads` filtern `.neq('thread_type', 'brew_comments')`
- [x] Kontext-Banner `BrewCommentsBanner.tsx` in `/forum/thread/[id]` (Cyan-Banner mit Link zum Rezept)
- [x] RLS: neue Policy erlaubt Usern nur `thread_type = 'discussion'` — `brew_comments` nur via Service-Role (Server Action)

### Phase 5: Ähnliche Rezepte ✅ Abgeschlossen

- [x] `BrewSimilarTab.tsx` — echte Inhalte via Supabase (gleicher Stil, sortiert nach `quality_score`)
- [x] "Vom selben Brauer"-Sektion
- [x] `BrewCard`-Komponente mit Bild, Name, Stil, Avg-Rating-Badge

### Phase 6: QR-Verifikation ✅ Abgeschlossen

- [x] DB-Migration: `ALTER TABLE ratings ADD COLUMN qr_verified BOOLEAN NOT NULL DEFAULT FALSE` + Partial-Index
- [x] `app/b/[id]/page.tsx` schreibt `qr_verified: true` im Rating-Payload (Route nur per QR-Scan erreichbar)
- [x] `app/api/ratings/submit/route.ts` persistiert `qr_verified` in die DB
- [x] "QR ✓"-Badge (Cyan) auf Bewertungskarten in `BrewRatingsTab.tsx`

### Mobile UX Fixes ✅ Abgeschlossen

- [x] Scrollbar im Tab-Menü versteckt (`[&::-webkit-scrollbar]:hidden`)
- [x] Button-Verteilung gleichmäßig (`grid grid-cols-4`)
- [x] Skalierungs-Formatierungsproblem behoben (2-Zeilen-Layout)
- [x] Forum-Button navigiert korrekt via `<Link>` (war Bug: `href` ignoriert)

---

## 1. Analyse der aktuellen Seite

### Was gut funktioniert

- 12-Spalten-Grid (4 Bild / 8 Content) auf Desktop ist solide
- Sticky Sidebar mit Bild + Actions
- Rezept-Scaler mit Effizienz-Eingabe
- Hop-Alpha-Korrektur
- TasteRadarChart + FlavorTagCloud (gut, aber begraben)
- Remix-Herkunft sichtbar

### Was nicht funktioniert

| Problem                                                  | Ursache                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Alles in einem einzigen Scroll                           | Kein Tab-System, User muss weit scrollen für Ratings |
| Ratings ganz am Ende                                     | Geringes Engagement, kaum jemand scrollt bis dorthin |
| Keine Kommentarfunktion direkt on-page                   | Link führt zu Forum, unterbricht UX                  |
| Ähnliche Rezepte fehlen                                  | Kein Discovery-Flow von der Detail-Seite aus         |
| Mobil: aktuelle Kolumnen-Struktur bricht zusammen        | 4+8 Stack wird zu einzelnem langen Scroll            |
| Hero-Bild zu klein (aspect-square, max 4 Spalten)        | Kein "Album-Feeling", kein visueller Wow-Effekt      |
| Actionbar (Share / Forum / Library / Remix) zu versteckt | Runde Buttons ohne Labels, schwer verständlich       |

---

## 2. Vision & Design-Prinzipien

### YouTube Music als Referenz

- **Bild dominiert** die obere Zone (nicht eingeengt in eine Seitenleiste)
- **Unterhalb des Bildes:** Titel + Metadaten + Actionbar in einer kompakten Zeile
- **Tab-Navigation** für den Inhalt — der User entscheidet, was er sehen will
- **Mobile-first:** Auf Mobile ist das Bild fullwidth, Tabs sind horizontal scrollbar

### Unsere Adaption für BotlLab

```
┌─────────────────────────────────────────────────────┐
│  ← Zurück      Brauerei-Name              🔗  ⋯     │  ← MinimalHeader
├─────────────────────────────────────────────────────┤
│                                                     │
│          [  BILD  ]  (fullwidth mobile /            │
│                       links auf Desktop)           │
│                                                     │
│  Style-Badge  |  IPA  |  Remix Tag                  │
│  **Galaxy IPA**                                     │  ← Hero-Zone
│  ★ 4.2  (17)  ·  ❤ 34  ·  🔁 8×  ·  👁 201        │
│                                                     │
│  [↓ Speichern]  [♻ Remix]  [↑ Teilen]  [⋯ Mehr]   │  ← Actionbar
├─────────────────────────────────────────────────────┤
│  [ Rezept ]  [ Bewertungen ]  [ Kommentare ]  [ Ähnliche ]  │  ← Tabs
├─────────────────────────────────────────────────────┤
│                                                     │
│                  Tab-Inhalt                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. Struktur der neuen Seite

### 3.1 MinimalHeader (sticky)

- Zurück-Pfeil
- Brew-Name (truncated, erscheint erst nach Scroll)
- Brauerei-Logo (klein)
- Rechts: Share + Overflow-Menü

**Mobil:** nur Icons (Zurück, Share)  
**Desktop:** voller Brew-Name + Brauerei-Name

---

### 3.2 Hero-Zone (neu gestaltet, inspiriert von YT Music)

**Desktop (lg+):**

```
┌────────────────┬──────────────────────────────────┐
│                │  IPA · Handcrafted Ale            │
│   Quadratisches│  **Galaxy IPA**                  │
│      Bild      │                                  │
│   (340×340)    │  ★ 4.2  ·  ❤ 34  ·  🔁 8×       │
│                │  ad-brewery                       │
│                │                                  │
│                │  [Remix] [Speichern] [Teilen] [⋯]│
└────────────────┴──────────────────────────────────┘
```

**Mobile:**

```
┌─────────────────────┐
│  Fullwidth Bild     │
│  (aspect-square)    │
│  mit Gradient unten │
├─────────────────────┤
│  IPA · Handcrafted  │
│  **Galaxy IPA**     │
│  ★ 4.2 ❤ 34 🔁 8× │
│  [Remix][Spen][Tei] │
└─────────────────────┘
```

**Wichtige Änderungen vs. heute:**

- Bild auf Mobile: fullwidth statt eingeklemmt
- Social Stats in **einer Zeile** direkt unter Titel (wie YT Music: Plays + Likes + ...)
- Actionbar: **Text-Labels** unter Icons, größer, klarer — kein Rätselraten mehr
- Brauerei-Link: direkt in der Hero-Zone, nicht separat unten

**Actionbar Buttons:**
| Icon | Label | Funktion |
|---|---|---|
| `Shuffle` | Remix | Rezept remixen |
| `Library` | Speichern | In Team-Bibliothek |
| `Share2` | Teilen | Share Sheet / Copy Link |
| `Heart` | Gefällt mir | Like (ersetzt separaten LikeButton) |
| `MoreHorizontal` | Mehr | Overflow: Melden, Forum-Link, QR-Code |

---

### 3.3 Tab-Navigation

**4 Tabs:**

```
[ Rezept ]  [ Bewertungen (17) ]  [ Kommentare (3) ]  [ Ähnliche ]
```

- Active State: weißer Text + `border-b-2 border-white`
- Inaktiv: `text-zinc-500`
- Tab-Counts: dynamisch aus API
- Mobil: horizontal scrollbar wenn alle 4 nicht passen

**URL-State:** Tab wird in Query-Param gespiegelt: `/brew/[id]?tab=bewertungen` → Deep-Link-fähig, SEO-freundlich

---

### 3.4 Tab 1: Rezept

**Enthält alles, was jetzt im langen Scroll steht:**

```
Kurzinfo-Strip (ABV · IBU · EBC · OG)
──────────────────────────────────────
Beschreibung (wenn vorhanden)
──────────────────────────────────────
Rezept-Scaler  |  Ausschlag: [20L]  SHA: [75%]
──────────────────────────────────────
Malze
──────────────────────────────────────
Hopfen (mit Alpha-Korrektur)
──────────────────────────────────────
Hefe
──────────────────────────────────────
Maischplan (Hauptguss / Nachguss + Rasten)
──────────────────────────────────────
Kochplan / Gärung
──────────────────────────────────────
Wasserchemie (Schaltbar: nur anzeigen wenn relevant)
──────────────────────────────────────
Brauanleitung (Steps, wenn vorhanden)
──────────────────────────────────────
Notizen (wenn vorhanden)
──────────────────────────────────────
Remix-Abstammung (wenn Remix)
```

**Keine Änderung an der Inhaltsstruktur** — nur die Positionierung in den Tab-Container wandert.

---

### 3.5 Tab 2: Bewertungen

**Konzept: Ausschließlich QR-verifizierte Bewertungen**

Bewertungen können **nur** über den QR-Code-Scan auf der Flasche (`/b/[bottle_id]`) abgegeben werden — nicht direkt auf der Brew-Seite. Die Brew-Seite zeigt Bewertungen nur an.

**Warum kein unverified Rating-Button auf der Brew-Seite?**
Das ist der USP: _Jede Bewertung auf BotlLab kommt von jemandem, der das Bier wirklich in der Hand hatte._ Unverified Ratings würden dieses Versprechen verwässern — eine Bewertung nach Lesen der Zutatenliste ist nicht dasselbe wie ein echtes Tasting. Kein anderes Homebrew-Portal kann diese Garantie geben.

**Aufbau:**

```
┌── Bewertungs-Zusammenfassung ──────────────────────┐
│   ★ 4.2  aus 17 Bewertungen  (alle QR-verifiziert) │
│   ─────────────────                                │
│   5★ ████████████ 8                                │
│   4★ ████████     6                                │
│   3★ ██           2                                │
│   2★ █            1                                │
│   1★              0                                │
└────────────────────────────────────────────────────┘
┌── TasteRadarChart + FlavorTagCloud ────────────────┐
│  (werden hierher verschoben, besser sichtbar)      │
└────────────────────────────────────────────────────┘
┌── Einzelne Bewertungen ────────────────────────────┐
│  Filter: Alle · Mit Kommentar · Neueste · Top       │
│  ─────────────────────────────────────              │
│  [Avatar] Nutzername  ★★★★☆  vor 3 Tagen          │
│           "Sehr ausgewogen, toller Abgang..."       │
│           Aroma: fruchtig · Hopfen: mittel          │
└────────────────────────────────────────────────────┘
┌── CTA ─────────────────────────────────────────────┐
│  🍺 Du hast dieses Bier getrunken?                  │
│  Scan den QR-Code auf der Flasche, um es zu        │
│  bewerten. Deine Meinung zählt — verifiziert.      │
└────────────────────────────────────────────────────┘
```

**Hinweis für leeren Zustand (0 Bewertungen):**

> Noch keine Bewertungen. Der Brauer kann QR-Code-Labels für seine Flaschen erstellen — jeder Scan ermöglicht eine verifizierte Bewertung.

**Datenmodell-Erweiterung:**

```sql
ALTER TABLE ratings ADD COLUMN qr_verified BOOLEAN NOT NULL DEFAULT FALSE;
-- Weg A (/brew/[id]) bleibt technisch möglich, aber kein UI-Einstiegspunkt mehr
-- Weg B (/b/[bottle_id]) setzt qr_verified = true
```

---

### 3.6 Tab 3: Kommentare

**Konzept: Hybrides System — Forum-Infrastruktur, eigenständige Kommentar-UX**

Weder ein komplett unabhängiges System (neue Tabelle) noch eine direkte Vermischung mit Nutzer-initiierten Forum-Threads. Stattdessen:

- **Datenbasis:** Existierende Forum-Tabellen (`forum_threads`, `forum_posts`) werden genutzt — keine neue Tabelle, kein Schema-Overhead
- **Kanonischer System-Thread:** Pro Brew wird automatisch beim ersten Kommentar ein dedizierter `brew_comments`-Thread erstellt (system-generiert, nicht vom Nutzer initiiert)
- **Eigenständige UX:** Auf der Brew-Seite sieht der Nutzer ein Kommentarsystem — kein Forum-UI, kein Forum-Kontext
- **Forum-Sichtbarkeit:** Der System-Thread erscheint im Forum mit einem "Rezept-Diskussion"-Badge, damit Forum-Nutzer mitreden können

**Warum nicht eine separate Tabelle?**
Forum-Infrastruktur (RLS, Notifications, Like-Actions, Profanity-Filter, Reporting) wird kostenlos wiederverwendet.

**Warum nicht direkt in Nutzer-Threads schreiben?**
Pro Brew kann es mehrere Nutzer-initiierte Forum-Threads geben — es gibt kein eindeutiges Ziel. Der System-Thread löst das Routing-Problem.

**DB-Änderung (minimal):**

```sql
-- Neuer thread_type für System-generierte Kommentar-Threads
ALTER TABLE forum_threads
  ADD COLUMN thread_type TEXT NOT NULL DEFAULT 'discussion',
  ADD COLUMN brew_id UUID REFERENCES brews(id) ON DELETE CASCADE;

-- Index für schnelles Lookup: "Gibt es schon einen brew_comments-Thread für diese Brew?"
CREATE UNIQUE INDEX idx_forum_threads_brew_comments
  ON forum_threads(brew_id)
  WHERE thread_type = 'brew_comments';
```

**Aufbau auf der Brew-Seite:**

```
┌── Kommentar schreiben ─────────────────────────────┐
│  [Avatar] Schreib einen Kommentar...               │
│                                         [Senden]   │
└────────────────────────────────────────────────────┘
┌── Kommentar-Liste ──────────────────────────────────┐
│  Sortieren: Neueste · Top                           │
│  ─────────────────────────────────────              │
│  [Avatar] Nutzername  vor 2 Tagen                   │
│           "Hab das letzte Woche gebraut, Top!"     │
│           ❤ 3  Antworten (2)                       │
│    └─ [Avatar] anderer User  vor 1 Tag              │
│               "Wie war die Gärtemperatur?"          │
└────────────────────────────────────────────────────┘
┌── Weitere Diskussionen im Forum ───────────────────┐
│  💬 "Galaxy IPA — erste Erfahrungen?" (12 Posts)   │
│  💬 "Hopfenalternative gesucht" (4 Posts)           │
│  → Alle Diskussionen im Forum anzeigen              │
└────────────────────────────────────────────────────┘
```

**Logik beim Kommentar-Absenden:**

```typescript
async function postBrewComment(
  brewId: string,
  content: string,
  parentId?: string,
) {
  // 1. Suche kanonischen System-Thread für diese Brew
  let thread = await getBrewCommentsThread(brewId);

  // 2. Falls nicht vorhanden: automatisch erstellen
  if (!thread) {
    thread = await createSystemThread({
      brew_id: brewId,
      thread_type: "brew_comments",
      title: `Kommentare zu ${brewName}`, // intern, nie direkt gezeigt
    });
  }

  // 3. Post in diesem Thread erstellen (nutzt existierende Forum-Post-Logik)
  await createForumPost({ thread_id: thread.id, content, parent_id: parentId });
}
```

**RLS:** Identisch mit bestehenden Forum-Posts — nur authentifizierte Nutzer können kommentieren, jeder kann lesen.

---

### 3.7 Tab 4: Ähnliche Rezepte

> ⚠️ **Wichtige Abgrenzung:** "Ähnliche Rezepte" ist **nicht** "Persönliche Empfehlungen".
>
> - **Ähnliche Rezepte** (dieser Tab): brew-zentrisch, objektiv — jeder Nutzer sieht dieselbe Liste. Frage: _"Was ist diesem Rezept ähnlich?"_
> - **Persönliche Empfehlungen** (Discover-Seite): nutzer-zentrisch, individuell — basiert auf deinem Verhalten. Frage: _"Was passt zu dir?"_
>
> Klicks in diesem Tab **trainieren den Discover-Algorithmus** (einseitig), aber Discover-Personalisierung taucht **nicht** hier auf. Kein Verwischen.

**Konzept: Zwei objektive Ähnlichkeitsquellen**

#### A) Inhaltlich ähnlich (Content-Based)

Gleicher Style + ähnliche Zutaten (Hopfen-Overlap, ähnliches ABV/IBU-Profil).  
Nutz die bestehende `recommendation-engine.ts` — Funktion `getPersonalizedBrews` kann um eine "similar-to-brew"-Variante erweitert werden.

#### B) Kollaborativ ähnlich (Collaborative)

"Nutzer, denen dieses Rezept gefällt, mögen auch..." — basiert auf Likes-Überschneidungen. Anonym und brew-zentrisch, kein Nutzerprofil nötig.

```
┌── Ähnliche Rezepte ────────────────────────────────┐
│  [PortraitCard] [PortraitCard] [PortraitCard] →   │
│  Citra IPA · Mosaic Pale Ale · ...                 │
└────────────────────────────────────────────────────┘
┌── Vom selben Brauer ───────────────────────────────┐
│  [PortraitCard] [PortraitCard] →                  │
└────────────────────────────────────────────────────┘
┌── Auch beliebt bei Fans dieses Rezepts ────────────┐
│  [PortraitCard] [PortraitCard] [PortraitCard] →   │
└────────────────────────────────────────────────────┘
```

**Implementierung:**

- Inhaltlich ähnlich: SQL + einfaches Scoring (Style match = +3, IBU in ±15 = +2, Hop overlap = +1)
- Kollaborativ: `likes`-Tabelle JOIN auf andere Brews der Nutzer, die diesen Brew auch geliked haben

---

## 4. Technische Umsetzungsschritte

### Phase 1: Layout-Refactor (Grundstruktur)

**Aufwand: ~4–6h**

1. `page.tsx` aufteilen → Extraktion in Subkomponenten:
   - `BrewHero.tsx` — Hero-Zone (Bild + Stats + Actionbar)
   - `BrewTabNav.tsx` — Tab-Leiste mit URL-State
   - `BrewRecipeTab.tsx` — alles aus dem bisherigen Rezept-Scroll
   - `BrewRatingsTab.tsx` — Bewertungen + Charts
   - `BrewCommentsTab.tsx` — Kommentare (zunächst Stub)
   - `BrewSimilarTab.tsx` — Ähnliche (zunächst Stub)

2. URL-State für Tab:

   ```tsx
   const tab = searchParams.get("tab") ?? "rezept";
   ```

3. Mobile Layout:
   - Bild: `w-full aspect-square` ohne Padding
   - Hero-Zone: `px-4 py-3`
   - Tabs: `overflow-x-auto whitespace-nowrap`

### Phase 2: Hero-Zone Redesign

**Aufwand: ~3h**

1. Actionbar mit Labels:

   ```tsx
   <ActionButton icon={Shuffle} label="Remix" onClick={handleRemix} accent />
   <ActionButton icon={Library} label="Speichern" onClick={handleSave} />
   <ActionButton icon={Share2} label="Teilen" onClick={handleShare} />
   <ActionButton icon={Heart} label={String(likeCount)} active={isLiked} onClick={handleLike} />
   <ActionButton icon={MoreHorizontal} label="Mehr" onClick={() => setOverflow(true)} />
   ```

2. Stats Row: `★ 4.2 · ❤ 34 · 🔁 8× · 👁 201` in einer Zeile

3. Desktop: Bild links sticky, Hero-Text rechts (wie jetzt, aber CSS bereinigt)

4. Overflow-Sheet (Mobile):
   - Melden
   - Link ins Forum
   - QR-Code anzeigen
   - Teilen (Native Share API)

### Phase 3: Ratings Tab

**Aufwand: ~3h**

1. Rating-Histogram rendern (5-Balken)
2. TasteRadarChart + FlavorTagCloud **aus dem alten Scroll hierher verschieben**
3. Filteroption: "Nur verifizierte Bewertungen" (für später, wenn QR-Scan aktiv)
4. Bewertungs-CTA: disabled ohne Login, mit Hinweistext

### Phase 4: Kommentare (hybrides System)

**Aufwand: ~5h**

1. **DB-Migration (minimal):**
   - `forum_threads`: neues Feld `thread_type TEXT DEFAULT 'discussion'` + `brew_id UUID`
   - `UNIQUE INDEX` auf `(brew_id) WHERE thread_type = 'brew_comments'`
   - Keine neue Tabelle — existierende Forum-RLS + Policies gelten automatisch

2. **Server Action `postBrewComment`:**
   - Lookup oder Erstellen des kanonischen `brew_comments`-Threads für die Brew
   - Wiederverwendung von `createForumPost` mit `parent_id` für Antworten

3. **`BrewCommentsTab.tsx`:**
   - Kommentar-Eingabe (Textarea, max 500 Zeichen)
   - Kommentar-Liste: lädt Posts aus dem `brew_comments`-Thread (paginated)
   - Antworten (1 Ebene tief auf der Brew-Seite, tiefere Hierarchie nur im Forum)
   - Like-Counter: existierende Forum-Post-Like-Action
   - Profanity-Filter: `lib/profanity.ts` (bereits vorhanden)

4. **"Weitere Diskussionen"-Block:**
   - Query: `forum_threads WHERE brew_id = [id] AND thread_type = 'discussion'`
   - Zeigt Nutzer-initiierte Threads mit Post-Count
   - Link ins Forum für jede Diskussion

### Phase 4b: Forum-Infrastruktur für brew_comments

**Aufwand: ~2–3h — parallel zu Phase 4 oder direkt danach**

**Ziel:** `brew_comments`-Threads landen nicht im normalen Forum-Feed. Stattdessen gibt es einen dedizierten Bereich im Forum.

1. **Eigener Forum-Bereich "Rezept-Diskussionen":**
   - Neue Kategorie/Sektion ausschließlich für system-generierte `brew_comments`-Threads
   - Nicht im allgemeinen Feed sichtbar — nur über die Brew-Seite oder direkt über diesen Bereich erreichbar
   - Im Forum-Hauptmenü als eigener Eintrag sichtbar: "💬 Rezept-Kommentare"

2. **Forum-Feed-Filter:**

   ```sql
   -- Standard-Feed: nur normale Threads
   SELECT * FROM forum_threads
   WHERE thread_type = 'discussion'
   ORDER BY latest_post_at DESC;
   ```

   `brew_comments`-Threads werden aktiv ausgefiltert — kein versehentliches Auftauchen im Feed.

3. **Thread-Detail-View (`/forum/thread/[id]`) — Kontext-Banner:**
   Falls jemand direkt auf einen `brew_comments`-Thread navigiert, erscheint ein Banner:

   ```
   ┌── 🍺 Rezept-Diskussion ──────────────────────────┐
   │  Kommentare zu "Galaxy IPA"  → Zum Rezept        │
   └──────────────────────────────────────────────────┘
   ```

   Komponente: `BrewCommentsBanner.tsx` (bedingt gerendert wenn `thread.thread_type === 'brew_comments'`)

4. **RLS: Kein manuelles Erstellen von brew_comments-Threads durch Nutzer:**

   ```sql
   CREATE POLICY "users_can_only_create_discussion_threads"
     ON forum_threads FOR INSERT TO authenticated
     WITH CHECK (thread_type = 'discussion');
   -- Service-Role (Server Actions) ist von RLS ausgenommen → darf brew_comments erstellen
   ```

5. **Forum-Hauptseite:** Rezept-Kommentare-Bereich erscheint als eigene Kachel/Sektion — klar als "Rezept-Kommentare" gelabelt, getrennt von allgemeinen Diskussionen.

### Phase 5: Ähnliche Rezepte

**Aufwand: ~4h**

1. Supabase-RPC oder Server Action:

   ```sql
   -- Inhaltlich ähnlich: gleicher Style + ähnliche Werte
   SELECT b.*,
     (CASE WHEN b.style = $1 THEN 3 ELSE 0 END +
      CASE WHEN ABS(b.ibu - $2) < 15 THEN 2 ELSE 0 END +
      CASE WHEN ABS(b.abv - $3) < 1.5 THEN 1 ELSE 0 END) AS similarity_score
   FROM brews b
   WHERE b.is_public = true AND b.id != $4
   ORDER BY similarity_score DESC, b.quality_score DESC
   LIMIT 6;
   ```

2. Kollaborativ:

   ```sql
   SELECT b.id, b.name, COUNT(*) as overlap
   FROM likes l1
   JOIN likes l2 ON l2.user_id = l1.user_id AND l2.brew_id != $1
   JOIN brews b ON b.id = l2.brew_id
   WHERE l1.brew_id = $1 AND b.is_public = true
   GROUP BY b.id, b.name
   ORDER BY overlap DESC
   LIMIT 6;
   ```

3. `BrewSimilarTab.tsx` mit `DiscoverBrewCard` Portrait-Variant

### Phase 6: QR-Scan-Verifikation für Bewertungen

**Aufwand: ~2h — deutlich kleiner als gedacht, da der Scan-Flow bereits existiert**

Der QR-Code-Flow ist bereits implementiert:

- `lib/label-printer.ts` generiert QR-Codes mit `https://botllab.de/b/[bottle.id]`
- `app/b/[id]/page.tsx` ist die Scan-Landingpage mit bestehendem `RateBrewModal`
- `trackBottleScan` mit `scan_source: 'qr_code'` wird bereits aufgerufen

**Einzige fehlende Verbindung:**

Heute gibt es zwei Wege zu einer Bewertung, die in dieselbe `ratings`-Tabelle schreiben — aber **nicht unterscheidbar** sind:

```
Weg A: /brew/[id]   → Bewertungs-Button → Rating  (kein Scan)
Weg B: /b/[bottle]  → RateBrewModal     → Rating  (echter QR-Scan)
```

Die Spalte `qr_verified` ist der einzige Marker, der diese beiden Wege auseinanderhält. Ohne sie gibt es kein "QR-verifiziert ✓"-Badge, weil du nicht weißt welche Bewertung woher kam.

1. `RateBrewModal` auf der `b/[id]`-Seite bekommt ein `qr_verified: true` Flag in der Submission
2. Rating-Submission schreibt `qr_verified = true` in die Ratings-Tabelle:
   ```sql
   ALTER TABLE ratings ADD COLUMN qr_verified BOOLEAN NOT NULL DEFAULT FALSE;
   ```
3. UI: "QR-verifiziert ✓" Badge auf Bewertungen im Ratings-Tab
4. Optional: Filter "Nur verifizierte Bewertungen anzeigen"

---

## 5. Priorisierung

| Phase | Feature                                       | Aufwand | Wert  | Priorität         |
| ----- | --------------------------------------------- | ------- | ----- | ----------------- |
| 1     | Layout-Refactor + Tabs                        | 4–6h    | ★★★★★ | **Sofort**        |
| 2     | Hero-Zone Redesign                            | 3h      | ★★★★★ | **Sofort**        |
| 3     | Ratings Tab (mit Charts)                      | 3h      | ★★★★☆ | **Sofort**        |
| 5     | Ähnliche Rezepte Tab                          | 4h      | ★★★★☆ | **Kurzfristig**   |
| 4     | Kommentare — Brew-Seite (hybrides System)     | 5h      | ★★★☆☆ | **Mittelfristig** |
| 4b    | Forum-Infrastruktur (eigener Bereich + RLS)   | 2–3h    | ★★★☆☆ | **Mittelfristig** |
| 6     | QR-Verifikation (Scan-Flow existiert bereits) | ~2h     | ★★★★★ | **Kurzfristig**   |

---

## 6. Offene Fragen / Entscheidungen

1. **Kommentare-Architektur:** ✅ Entschieden — hybrides System: Forum-Infrastruktur als Backbone, system-generierter `brew_comments`-Thread pro Brew, eigenständiger Bereich im Forum ("Rezept-Diskussionen"), Feed-Filter damit sie nicht im normalen Forum-Feed landen.

2. **Mobile Tab-Bar:** ✅ Entschieden — 4 Tabs (Rezept / Bewertungen / Kommentare / Ähnliche) sind die richtige Menge. Kein Braulog-Tab auf der öffentlichen Seite (gehört in den Team-Bereich).

3. **QR-Scan-Flow:** ✅ Geklärt — das System existiert bereits:
   - Labels werden mit QR-Code gedruckt → `https://botllab.de/b/[bottle.id]`
   - Flasche ist an ein Brew verknüpft; Scan landet auf `app/b/[id]/page.tsx`
   - Dort existiert bereits ein `RateBrewModal` und `trackBottleScan` mit `scan_source: 'qr_code'`
   - **Phase 6 reduziert sich damit auf einen einzigen Schritt:** `qr_verified = true` in die Rating-Submission schreiben, wenn die Bewertung über die `b/[id]`-Seite kommt. Die Scan-Verifikation ist implizit (echte Flasche = echte URL).
   - 100% Beweis ist nicht möglich und nicht nötig — die Hürde (physische Flasche mit gedrucktem QR-Code) schließt ~90% der Fake-Bewertungen aus.

4. **Algorithmus-Signale von der Brew-Detail-Seite:** Neue Tracking-Events die Phase 1–5 mitliefern sollen:

   | Signal                             | Stärke         | Implementierung                                                                      |
   | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
   | Tab geöffnet (welcher Tab)         | Mittel         | `trackEvent('brew_tab_view', {tab, brew_id})` beim Tab-Wechsel                       |
   | "Ähnliche Rezepte"-Card angeklickt | **Stark**      | Direkte Bestätigung: "dieses Paar gehört zusammen" → stärkstes kollaboratives Signal |
   | Rezept gespeichert / in Bibliothek | **Stark**      | Sicherstellen dass getrackt wird                                                     |
   | Remix-Klick                        | **Stark**      | "So gut, ich will es nachbrauen"                                                     |
   | Rating via QR abgegeben            | **Sehr stark** | `qr_verified = true` + Sternzahl als Feature                                         |
   | Kommentar geschrieben              | Stark          | Langer Engagement-Moment                                                             |
   | Scroll-Tiefe im Rezept-Tab         | Mittel         | `IntersectionObserver` auf Sections                                                  |
   | Share-Klick                        | Mittel         | Native Share / Copy Link                                                             |

   Besonders wertvoll: **Ähnliche-Rezepte-Klicks als Trainings-Loop** — jeder Klick von Brew A → Brew B ist ein direktes "diese gehören zusammen"-Signal für den kollaborativen Filter auf **Discover**. Die Signale fließen **einseitig** in den Discover-Algorithmus ein — die Brew-Detail-Seite selbst bleibt objektiv und zeigt keine personalisierten Inhalte.

---

## 7. Datei-Struktur nach dem Refactor

```
app/brew/[id]/
  page.tsx                      ← schlanker Shell (Data Fetching + Routing)
  layout.tsx                    ← (unverändert)
  components/
    BrewHero.tsx                ← neu: Bild + Stats + Actionbar
    BrewTabNav.tsx              ← neu: Tab-Leiste mit URL-State
    BrewRecipeTab.tsx           ← refactored aus page.tsx
    BrewRatingsTab.tsx          ← refactored aus page.tsx + Charts
    BrewCommentsTab.tsx         ← neu
    BrewSimilarTab.tsx          ← neu
    FlavorTagCloud.tsx          ← unverändert (verschoben nach BrewRatingsTab)
    TasteRadarChart.tsx         ← unverändert (verschoben nach BrewRatingsTab)
    BrewActionButton.tsx        ← neu: wiederverwendbarer Action-Button mit Label

app/forum/thread/[id]/
  components/
    BrewCommentsBanner.tsx      ← neu: Kontext-Banner für brew_comments Threads
```
