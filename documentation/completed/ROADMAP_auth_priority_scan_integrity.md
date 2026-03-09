# Auth Priority & Scan Integrity Roadmap

**Status:** In Progress 🟡  
**Last Updated:** 2026-03-09  
**Priority:** High  
**Kontext:** Diese Roadmap fasst alle offenen Fixes und Designentscheidungen rund um Duplicate-Checks, Auth-Reihenfolge und Scan-Integrität für Rating, Beat the Brewer (BTB) und VibeCheck zusammen.

---

## 📋 Fortschritts-Checkliste

**Phase 1 — Auth-Loading Guard**
- [x] 1.1 `authLoading` aus `useAuth()` holen
- [x] 1.2 `useEffect([id, authLoading])` + Guard `if (authLoading) return`

**Phase 2 — localStorage-Bereinigung**
- [x] 2.1 `submitRating`: `localStorage.setItem` nur für anonyme User
- [x] 2.2 `checkCapCollected`: user-scoped Cache-Keys
- [x] 2.3 `claimCap`: user-scoped `localStorage.setItem`

**Phase 3 — BTB useEffect-Deps**
- [x] 3.1 `BeatTheBrewerGame.tsx`: `isLoggedIn` zu `useEffect`-deps hinzufügen

**Phase 4 — VibeCheck: Token-only Duplicate Check**
- [x] 4.1 Migration: Tabelle `vibe_check_used_nonces` mit COALESCE-Index (nicht PRIMARY KEY, da session_id nullable)
- [x] 4.2 Migration: RLS auf `vibe_check_used_nonces` (INSERT: authenticated + anon via service_role; SELECT: kein direkter Zugriff für Enduser)
- [x] 4.3 Migration: alten `(bottle_id, ip_hash)` Unique-Index auf `anonymous_game_sessions` für vibe_check droppen
- [x] 4.4 `submitVibeCheck`: HMAC-Validierung via `lib/qr-token.ts` ZUERST, dann Nonce-Check `(token, bottle_id, brew_id, session_id)` — `INSERT ... ON CONFLICT DO NOTHING` + Rückgabe-Check statt SELECT-then-INSERT
- [x] 4.5 `VibeCheck.tsx`: `qrToken`, `bottleId` und `sessionId` Props ergänzen/nutzen
- [x] 4.6 `page.tsx`: Values an `<VibeCheck>` übergeben
- [x] 4.7 UI-Feedback bei bereits genutztem Token: "Du hast für diesen Sud bereits VibeCheck gespielt."
- [x] 4.8 `hasSubmittedVibeCheck()` entfernen / als deprecated markieren

**Phase 5 — Rating: Token-only Duplicate Check**
- [x] 5.1 Migration: Tabelle `rating_used_nonces` mit COALESCE-Index + RLS
- [x] 5.2 `submitRating`: Token HMAC-Validierung ZUERST, dann Nonce-Check, dann Rezept-Duplicate-Check (`user_id + brew_id`)
- [x] 5.3 Frontend: Bei abgelehntem Rating (Rezept schon bewertet) — alte Bewertung des Users anzeigen statt reiner Fehlermeldung
- [x] 5.4 Fehlermeldung unterscheidet klar: "Token ungültig", "Token bereits verwendet", "Rezept bereits bewertet"

**Phase 6 — BTB: Token-only Duplicate Check**
- [x] 6.1 QR-Token für BTB als **verpflichtend** festlegen (Design-Entscheidung)
- [x] 6.2 Migration: `btb_used_nonces` auf COALESCE-Index + RLS migrieren
- [x] 6.3 `submitBeatTheBrewer`: HMAC-Validierung ZUERST; `INSERT ... ON CONFLICT` statt SELECT-then-INSERT
- [x] 6.4 localStorage-Keys auf `sessionId` umstellen

**Phase 7 — Cleanup**
- [x] 7.1 Alte Constraints und Indizes droppen
- [x] 7.2 Dead Code (`hasSubmittedVibeCheck`, `hasPlayedBeatTheBrewer`, alte Anon-Pfade) entfernen

**Phase 8 — Konsolidierung Event-Tabellen**
- [x] 8.1 `tasting_score_events.user_id` auf nullable setzen
- [x] 8.2 `session_token` (UNIQUE, nullable) + `ip_hash` Spalten hinzufügen
- [x] 8.3 RLS: `session_token` darf nur vom selben Anon-Token lesbar sein, nicht querab von anderen Usern
- [x] 8.4 Historische Daten aus `anonymous_game_sessions` migrieren (mit Rollback-Strategie)
- [x] 8.5 `DROP TABLE anonymous_game_sessions` + `anonymous_game_sessions_backup` (Migration `20260309150000`)
- [x] 8.6 `aggregate-analytics` Edge Function: Double-Query ersetzen durch Single-Query mit `user_id IS NULL` Filter
- [x] 8.7 `analytics-admin-actions.ts`: `.not('user_id', 'is', null)` für User-spezifische Auswertungen ergänzen

**Phase 9 — Vibe Analytics Dashboard**
- [x] 9.1 Aggregations-Query für Vibe-Daten (JSONB Array unnest)
- [x] 9.2 Panel "Trinkanlässe & Vibes" im Brauer-Dashboard
- [x] 9.3 Mindestschwellwert (≥10 VibeChecks) für statistische Auswertungen implementieren
- [x] 9.4 Tageszeit-Korrelation (Heatmap)

---

## Executive Summary

Auf der Flaschenseite (`/b/[id]`) gibt es eine **Race Condition** zwischen Auth-Initialisierung und dem initialen Datenladen. Da `user` beim ersten Render noch `null` ist (Supabase Auth ist async), laufen alle drei Features in den localStorage/anon-Zweig — und zeigen einem frisch eingeloggten User fälschlicherweise den State eines vorherigen Users auf dem gleichen Gerät.

Unabhängig davon wurde beim Design von VibeCheck erkannt, dass ein Duplicate-Check per `bottle_id + user_id` falsch ist: Wird eine Flasche neu befüllt (neuer Brausud, gleiche `bottle_id`), sollte der User VibeCheck erneut ausfüllen dürfen — weil es ein Momentaufnahme-Check ist ("wo trinkst du das Bier gerade?"), kein dauerhaftes Profil.

---

## Architektur-Übersicht & Kontrolllogik

Um Duplicate-Probleme zu lösen, trennen wir das System ab sofort strikt in **Kontroll-Tabellen** (Habe ich die Erlaubnis?) und **Ergebnis-Tabellen** (Wo speichern wir die Auswertung ab?).

| Aktion | Token Check (Zugangs-Kontrolle) | Limitierung (User/Sud Check) | Ziel-Tabelle (Daten) |
| :--- | :--- | :--- | :--- |
| **Rating** | `rating_used_nonces` | Nur 1x pro Rezept (`user_id + brew_id`) | `ratings` |
| **BTB** | `btb_used_nonces` | Nur 1x pro Sud (`user_id + session_id`) | `tasting_score_events` |
| **VibeCheck** | `vibe_check_used_nonces` | Keine Limitation (Scan reicht als Beweis) | `tasting_score_events` |

---

## Gewünschte Prioritäts-Hierarchie (nach diesen Fixes)

```
1. QR-Token    → einmal pro Scan-Anlass (absolut, kein User-Override)
2. Eingeloggter User → Server-DB-Check (authoritative, überschreibt localStorage)
3. Anonym      → localStorage / IP (nur wenn Auth wirklich nicht vorhanden)
```

## Migration Concepts for Nonce Tables

**Problem:** Static QR tokens printed on labels are deterministic algorithms of `bottle_id` + a secret. They do not change when a bottle is refilled. If we burn a token forever based only on its `nonce` or `bottle_id`, the QR code becomes useless for future refills (new brewing sessions).

**Solution:** We scope the usage of a QR token to the specific liquid inside the bottle. A token is considered "used" only for a specific combination of `(nonce, bottle_id, session_id, brew_id)`. If the bottle is refilled, `session_id` and `brew_id` change, allowing the static QR token to be scanned again for actions like VibeCheck, Rating, and BTB.

**Technical Hurdle:** `session_id` is a nullable column in our database. PostgreSQL does not allow `NULL` values in standard composite `PRIMARY KEY` constraints.

**Database Architecture:**
To enforce this unique combination while supporting `NULL` session IDs, we must:
1. Use a surrogate `UUID` primary key.
2. Create a `UNIQUE INDEX` that uses `COALESCE` to handle the `NULL` values safely.

**⚠️ Sicherheits-Kritisch — TOCTOU Race Condition:**
Das naive Muster `SELECT → prüfen → INSERT` ist **nicht atomar**. Zwei Requests mit identischem Token, die zur selben Millisekunde eintreffen, können beide den SELECT-Check bestehen, bevor einer committed. Das führt zu:
- Erster INSERT: Erfolg
- Zweiter INSERT: DB-Constraint-Verletzung → unkontrollierter 500-Fehler

**Die sichere Implementierungsstrategie:**
```ts
// ❌ FALSCH: SELECT-then-INSERT
const existing = await supabase.from('vibe_check_used_nonces').select().match({nonce, bottle_id, ...}).single();
if (existing) throw new Error('bereits verwendet');
await supabase.from('vibe_check_used_nonces').insert({nonce, bottle_id, ...});

// ✅ RICHTIG: INSERT ... ON CONFLICT
const { error } = await adminClient.from('vibe_check_used_nonces').insert({nonce, bottle_id, ...});
if (error?.code === '23505') {
  throw new Error('Dieser Scan wurde bereits verwendet.');
}
if (error) throw new Error('Datenbankfehler');
```
Der PostgreSQL-Fehlercode `23505` ist der Unique-Violation-Code. Wir fangen ihn explizit ab und wandeln ihn in eine benutzerfreundliche Meldung um.

**⚠️ Sicherheits-Kritisch — HMAC-Validierung ist PFLICHT vor DB-Check:**
Bevor ein Token in der Nonce-Tabelle gesucht oder verbrannt wird, **muss** zwingend die kryptografische Signatur des Tokens über `lib/qr-token.ts` geprüft werden. Niemals darf die Applikation davon ausgehen, dass ein Token valide ist, nur weil es in der Datenbank noch nicht vorkommt — sonst kann jede beliebige Zeichenkette als Token eingeschleust werden.

```ts
// Reihenfolge der Validierung (unveränderlich):
// 1. HMAC-Signatur prüfen → ungültig → 400-Fehler
// 2. Nonce-Tabelle auf Duplikat prüfen (via INSERT ON CONFLICT) → 409-Fehler
// 3. Business Logic Check (z.B. Rezept schon bewertet) → 409-Fehler
// 4. Aktion ausführen und Ergebnis persistieren
```

**⚠️ Sicherheits-Kritisch — Rate Limiting:**
Auch mit korrekt gebrannten Token-Nonces ist ein serverseitiges Rate-Limiting auf alle drei Server Actions (`submitVibeCheck`, `submitRating`, `submitBeatTheBrewer`) notwendig, um automatisierte Masseneingaben zu verhindern. Hierfür nutzen wir das existierende `lib/api-rate-limit.ts`.

**Migration Blueprint:**
```sql
CREATE TABLE IF NOT EXISTS public.vibe_check_used_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce TEXT NOT NULL,
  bottle_id UUID NOT NULL REFERENCES public.bottles(id) ON DELETE CASCADE,
  brew_id UUID NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash TEXT  -- SHA-256-Hash, niemals Plain-IP speichern
);

-- Die kritische Stelle: Eindeutigkeit auch bei NULL-session_id erzwingen
CREATE UNIQUE INDEX IF NOT EXISTS unique_vibe_check_nonce 
ON public.vibe_check_used_nonces (
  nonce, 
  bottle_id, 
  brew_id, 
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- RLS: Kein Enduser darf direkt lesen/schreiben — ausschließlich via service_role (Server Action)
ALTER TABLE public.vibe_check_used_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.vibe_check_used_nonces
  USING (false)  -- kein direkter Zugriff für authenticated/anon roles
  WITH CHECK (false);
```
*(Exakt dieses Pattern inkl. RLS für `rating_used_nonces` und `btb_used_nonces` replizieren)*

---

## Phase 1 — Auth-Loading Guard

### Problem

`useEffect([id])` läuft sofort nach Mount — `user` aus `useAuth()` ist zu diesem Zeitpunkt `null`, weil Supabase die Session async aus dem localStorage liest. Dadurch:

- `loadRatings()` nimmt den `else`-Zweig (anon) → liest `localStorage.getItem('botllab_rated_' + brewId)` → findet Flag vom vorherigen User → setzt `hasAlreadyRated = true` → User B sieht fälschlich "Kronkorken gesammelt"
- `checkCapCollected()` liest ebenfalls unscoped lokalStorage → gleicher false positive

### Fix

**`app/b/[id]/page.tsx`**

```ts
// vorher
const { user } = useAuth();

// nachher
const { user, loading: authLoading } = useAuth();
```

```ts
// useEffect
useEffect(() => {
  async function fetchBottleInfo() {
    if (!id) return;
    if (authLoading) return; // ← neu: warten bis auth resolved
    // ...rest
  }
  fetchBottleInfo();
}, [id, authLoading]); // ← authLoading als dep
```

**Auswirkung:** Minimal — supabase liest Session aus localStorage (~5-50ms). Die Page zeigt kurz nur den Skeleton, dann korrekte Auth-State.

---

## Phase 2 — localStorage-Bereinigung

### Problem A — `submitRating` setzt unscoped Flag

Nach erfolgreichem Rating-Submit:
```ts
localStorage.setItem('botllab_rated_' + brewId, '1'); // ← auch für eingeloggte User!
```
Nächster anonymer Besucher auf dem Gerät sieht fälschlich "bereits bewertet".

### Fix A

```ts
// Nur für anonyme User cachen — eingeloggte User sind server-authoritative
if (!user) localStorage.setItem('botllab_rated_' + brewId, '1');
```

### Problem B — `checkCapCollected` und `claimCap` unscoped

```ts
localStorage.getItem('botllab_cap_' + brewId)       // ← kein User-Kontext
localStorage.setItem('botllab_cap_' + brewId, '1')  // ← gilt für alle User auf Gerät
```

### Fix B

User-scoped Keys:
```ts
const capKey = user?.id ? `botllab_cap_${user.id}_${brewId}` : null;
```
- Fast-path in `checkCapCollected`: nur wenn `capKey` vorhanden und `user.id` bekannt
- `claimCap` Erfolgshandler: mit user-scopedKey schreiben

---

## Phase 3 — BTB useEffect-Deps

### Problem

In `BeatTheBrewerGame.tsx`:
```ts
useEffect(() => {
  if (!isLoggedIn) return;  // tritt beim ersten Render ab → nichts passiert
  getBrewBTBResult(brewId, sessionId).then(...)
}, [brewId, sessionId]);    // ← isLoggedIn fehlt!
```

Wenn `isLoggedIn` nach auth-resolve auf `true` wechselt, wird der Effect nicht neu ausgeführt. Das historische Ergebnis wird nie geladen.

### Fix

```ts
}, [brewId, sessionId, isLoggedIn]); // ← isLoggedIn ergänzt
```

---

## Phase 4 — VibeCheck: Token-only Duplicate Check

*(Erledigt, Konzept siehe oben)*

---

## Phase 5 — Rating (Bewertung): Duplicate Check

### Design-Entscheidung

Auch bei einer Bewertung geht es um den konkreten Sud, der gerade in der Flasche ist.
Wichtig: **Bewertungen sind ausschließlich über die Flaschenseite mit einem gültigen QR-Code und Token erlaubt!**
Wird eine Flasche neu befüllt (neue Session/Brew), darf und soll der User das neue Bier bewerten können.

**Neue Logik:**
1. **QR-Scan-Zwang:**
   - Ein valides Token muss zwingend übergeben werden.
   - Wir verbrennen es für die Kombination `(Token, Bottle_ID, Brew_ID, Session_ID)`.
   - In der Datenbank: Wir migrieren analog zu VibeCheck mit einer Tabelle `rating_used_nonces`.

2. ** Kein By-Pass möglich:**
   - Ohne valides Token wird keine Bewertung zugelassen.
   - Eine Bewertung ist an die Flasche und diesen spezifischen QR-Scan geknüpft.

### Migration

```sql
CREATE TABLE IF NOT EXISTS public.rating_used_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce TEXT NOT NULL,
  bottle_id UUID NOT NULL REFERENCES public.bottles(id) ON DELETE CASCADE,
  brew_id UUID NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_rating_nonce 
ON public.rating_used_nonces (
  nonce, 
  bottle_id, 
  brew_id, 
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
```

### Code-Änderungen

**`submitRating` (Server Action) — Reihenfolge der Checks:**
1. Token vorhanden? → Nein → Fehler abbrechen
2. HMAC-Signatur des Tokens via `lib/qr-token.ts` prüfen → ungültig → Fehler
3. `INSERT INTO rating_used_nonces ... ON CONFLICT DO NOTHING` → `23505` → Fehler: "Scan bereits verwendet"
4. Auth-User: `SELECT FROM ratings WHERE user_id = X AND brew_id = Y` → bereits vorhanden → Fehler: "Rezept bereits bewertet"
5. Rating persistieren

**`RatingCard` / Frontend — UX-Kritisch:**
- `qrToken` durchleiten.
- `localStorage`-Handling weiterhin für Anonyme (Prüfung auf `botllab_rated_ + brewId`), um anonyme Mehrfach-Ratings auf demselben Browser zu verhindern.
- **⚠️ UX-Problem:** Wenn Check 4 greift (User hat bereits bewertet), soll die UI **nicht** einfach einen Fehler zeigen. Stattdessen: Die **alte Bewertung des Users anzeigen** ("Du hast dieses Bier am [Datum] mit [X] Sternen bewertet. Möchtest du es bearbeiten?"). Das verhindert Frustration bei einem User, der nach Monaten eine neue Flasche desselben Bieres scannt.
- Fehlertexte müssen die genaue Ursache unterscheiden:
  - "QR-Code konnte nicht verifiziert werden" (HMAC-Fehler)
  - "Dieser Scan wurde bereits genutzt" (`23505` Nonce-Fehler)
  - "Du hast dieses Rezept bereits bewertet" (User-Duplicate)

---

## Phase 6 — Beat the Brewer (BTB): Duplicate Check

### Design-Entscheidung

Das "Beat the Brewer"-Spiel bezieht sich auf die konkreten Messwerte eines Abfüllvorgangs (Sud / Session).
Daher hängt BTB nicht global am Rezept, sondern **an der Session** (genau wie die physikalischen Flaschen-Parameter).

**Logik:**
1. **QR-Scan ist VERPFLICHTEND für BTB:**
   - Das Token wird analog zu VibeCheck für die Kombination `(Token, Bottle_ID, Brew_ID, Session_ID)` in `btb_used_nonces` verbrannt.
   - Ohne valides Token ist die Action nicht aufrufbar — gleiches Prinzip wie beim Rating.
   - Da `btb_used_nonces` bereits im Schema existiert, müssen wir sicherstellen, dass die Indizes korrekt mit `COALESCE` für nullable `session_id` arbeiten.

2. **User-Session-Check (Sud-gebunden):**
   - Im Gegensatz zur Bewertung (die pro Rezept limitiert ist), ist BTB pro **Sud** (`session_id`) limitiert.
   - Ein User darf für jeden neuen Sud desselben Biers erneut spielen.
   - Serverseitig (eingeloggt): Check, ob User in `beat_the_brewer_results` bereits einen Eintrag für diese `session_id` hat.
   - Clientseitig/Anonym: LocalStorage-Prüfung basierend auf `session_id` statt `brew_id` (z.B. `botllab_btb_ + sessionId`).

### Migration / Schema-Anpassung

Die bestehende Tabelle `btb_used_nonces` muss geupdated/neu angelegt werden, um das neue Nullable-Constraint-Konzept zu unterstützen, falls es noch nicht so implementiert ist:

```sql
-- Falls existierend mit altem Constraint:
-- DROP TABLE public.btb_used_nonces; 

CREATE TABLE IF NOT EXISTS public.btb_used_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce TEXT NOT NULL,
  bottle_id UUID NOT NULL REFERENCES public.bottles(id) ON DELETE CASCADE,
  brew_id UUID NOT NULL REFERENCES public.brews(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.brewing_sessions(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_hash TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_btb_nonce 
ON public.btb_used_nonces (
  nonce, 
  bottle_id, 
  brew_id, 
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
```

### Code-Änderungen

**`submitBeatTheBrewer` (Server Action):**
- Token gegen `btb_used_nonces` prüfen und verbrauchen.
- Serverseitiger Limitierung-Check gegen `beat_the_brewer_results` unter Nutzung der `session_id` (und nicht `brew_id`).

**Frontend (`BeatTheBrewerGame.tsx`):**
- LocalStorage Speicherung/Auslesen an `sessionId` koppeln.
- Laden historischer Ergebnisse an `sessionId` binden.

---

## Phase 7 — Cleanup & Data Migration Strategy

Die Umstellung auf asynchrone Token-Nonces erfordert, dass wir alte Code-Pfade, veraltete Datenbank-Constraints und abgelöste System-Checks strikt entfernen, ohne dabei historische Daten für die Analytics-Auswertungen zu zerstören.

### 1. Database Cleanup (Vorsichtiges "Dropping")
- **Alte Constraints entfernen**: Veraltete `UNIQUE`-Indizes auf Spalten wie `bottle_id + user_id` oder in der Tabelle `anonymous_game_sessions` (wie `idx_anon_sessions_vc_bottle_limit`) müssen mittels `DROP INDEX` entfernt werden. Damit erlauben wir Refills, schützem das System aber über die neuen `_used_nonces`-Tabellen.
- **Kein Datenverlust in Basis-Tabellen**: Bestehende Datensätze in `ratings`, `beat_the_brewer_results` und `analytics_events` bleiben komplett unberührt. Die neuen Strukturen prüfen lediglich *zukünftige* Berechtigungen.

### 2. Code Cleanup (Dead Code entfernen)
- **Veraltete Checks**: Funktionen wie `hasSubmittedVibeCheck` oder alte Logik-Blöcke, die `anonymous_game_sessions` rein zur Duplicate-Verification verwendet haben, abklemmen und löschen.
- **Frontend-Altlasten**: Props oder States, die auf falschen Annahmen basierten (wie "hat schon mal IRGENDEIN Bier aus dieser Flasche bewertet"), saubermachen.

### 3. Analytics Kompatibilität (Legacy & Zukunfts-Daten)
- **Historische Daten sind sicher**: Die Hintergrund-Jobs (Supabase Edge Function `aggregate-analytics`) gruppieren die Daten anhand der `bottle_scans` direkt nach `brew_id` und `brewery_id` zum genauen Zeitpunkt des Scans. Sie setzen **keine** 1:1-Relation zwischen `bottle_id` und `brew_id` voraus.
- **Nahtloser Übergang**: Da die Edge Functions einfach das aggregieren, was historisch geloggt wurde, fließen die neuen Daten automatisch und perfekt getrennt nach Sud/Rezept in die Dashboards ein. Wenn eine Flasche neu befüllt wird, fließen ab dem Refill-Zeitpunkt alle Events sauber in den Topf der neuen `brew_id` / `session_id`.

### 4. Frontend-Auswertungen (Notwendige Anpassungen!)
Da eine Flasche (`bottle_id`) nun im Laufe ihres Lebens **mehrfach befüllt** werden kann (verschiedene `brew_id`s), müssen wir im Frontend bei der Anzeige von "Flaschen-Metriken" aufpassen, ob wir die *Lebenszeit der Flasche* oder *den aktuellen Inhalt* meinen:
- **Betroffene Stellen identifizieren:**
  - `getBottleJourney` in `analytics-actions.ts`: Bisher macht die Query `.eq('bottle_id', id)` – was künftig eine Map-Darstellung über alle jemals in der Flasche gewesenen Biere hinweg ergibt. Wenn nur die aktuelle Reise gezeigt werden soll, muss zwingend `.eq('brew_id', currentBrewId)` ergänzt werden.
  - Scan-Zähler auf `/b/[id]/page.tsx`: Der Zähler sucht aktuell nur nach `.eq('bottle_id', bottle.id)`. Wird die Flasche neu befüllt, zeigt das "neue Bier" den kumulierten Scan-Count aller alten Biere an. Das muss auf `.eq('brew_id', current_brew_id)` geändert werden.
  - "Mein Keller" Statistiken: Queries, die stumpf auf `bottle_id` gruppieren, müssen eventuell überarbeitet werden.

---

## Phase 8 — Konsolidierung der Event-Tabellen (Technical Debt Abbau)

### Hintergrund & Historie
Aktuell landen die Ergebnisse für Spiele (Beat the Brewer) und VibeChecks von **eingeloggten** Usern in der Tabelle `tasting_score_events`.
Aktionen von **Gästen (anonymen Usern)** landen hingegen in einer komplett separaten Hilfstabelle `anonymous_game_sessions`.

Der historische Grund dafür: `tasting_score_events` wurde seinerzeit mit einem absolut strengen Datenbank-Constraint angelegt: `user_id UUID NOT NULL` (Ein Event **musste** zwingend einem registrierten Profil gehören).
Da Gäste logischerweise noch keine User-ID besitzen, wurde die Tabelle `anonymous_game_sessions` als eine Art "Warteraum" erschaffen. Gäste bekamen stattdessen lokal einen kryptografischen `session_token` in den Browser gelegt, der mit dem Eintrag verknüpft wurde.
Das Konzept sah vor: Sobald sich der Gast registriert (`claimAnonymousSession`), sucht die Datenbank nach dem Token, zieht die Punkte aus der Gast-Tabelle heraus und schreibt sie ordnungsgemäß mit neuer User-ID in die Haupttabelle `tasting_score_events`.

### Auswirkung des alten Setups
Dass die Daten auf zwei Tabellen verteilt sind, erzeugt Komplexität und Fehleranfälligkeit:
- **Analytics & Dashboards:** Wenn wir berechnen wollen "Wie viele BTBs gab es insgesamt?", müssen wir immer in zwei Tabellen quer-suchen und die Summe bilden.
- **Code-Duplizierung:** Funktionen wie `submitVibeCheck` haben fast identischen Code, nur dass die eine Variante in Tabelle A und die andere in Tabelle B schreibt.
- **Inkonsistenz:** Bei der `ratings`-Tabelle war die `user_id` von Anfang an optional (nullable) – dort mischen und managen wir anonyme und eingeloggte Ratings völlig problemlos in derselben Tabelle.

### Die neue Strategie (Zusammenlegung)
Da wir in Phase 7 sowieso an tiefgreifenden Datenbank-Strukturen und Legacy-Constraints aufräumen, nutzen wir die Gelegenheit, diese Altlast direkt komplett zu beseitigen. Wir führen die Tabellen zusammen!

**Migrations-Plan:**
1. **Nullability aufheben:** Wir machen in der Zieltabelle `tasting_score_events` die Spalte `user_id` optional (`ALTER COLUMN user_id DROP NOT NULL;`).
2. **Gäste-Metadaten integrieren:** Wir fügen die Spalten `session_token` (TEXT, UNIQUE, nullable) und `ip_hash` (TEXT) ebenfalls zu `tasting_score_events` hinzu.
3. **RLS aktualisieren:** Die bestehenden RLS-Policies auf `tasting_score_events` müssen angepasst werden:
   - Auth-User: Darf nur seine eigenen `user_id`-Events sehen
   - Anon-User: Darf **kein** Event sehen (kein direktes Lesen via Client)
   - Der `session_token` darf **niemals** für andere User lesbar sein
4. **Pauschal-Insert:** Ab sofort werden **alle** neuen BTB- und VibeCheck-Ereignisse (ob Gast oder Auth) in die Haupttabelle geschrieben. 
   - Bei Auth-Usern ist die `user_id` gefüllt, `session_token` ist leer.
   - Bei Gästen ist die `user_id` leer, dafür liegt der Wert im `session_token`.
5. **Daten-Migration mit Rollback-Strategie:** Wir migrieren die bestehenden historischen Daten per SQL aus der alten `anonymous_game_sessions` in `tasting_score_events`.
   - Vor der Migration: `CREATE TABLE anonymous_game_sessions_backup AS SELECT * FROM anonymous_game_sessions;`
   - Nach erfolgreicher Verifikation (Row-Count-Vergleich): `DROP TABLE anonymous_game_sessions;`
   - Backup erst nach 30 Tagen droppen, wenn keine Probleme aufgetreten sind.
6. **Altlasten löschen:** Die nun nutzlose Tabelle `anonymous_game_sessions` werfen wir nach Verifikation per `DROP TABLE` weg.

**Vereinfachte Logik (`claimAnonymousSession`):**
Anstatt aufwändig Datensätze von A nach B umkopieren zu müssen, macht der Prozess nach einer Registrierung künftig nur noch ein simpleres, unendlich viel schnelleres Update:
```sql
UPDATE tasting_score_events 
SET user_id = :neue_user_id 
WHERE session_token = :token_des_gastes;
```

**Ergebnis:** Eine einzige "Source of Truth" für jegliche Event-Analysen, drastisch verschlankter TypeScript-Logikcode und perfekte Konsistenz innerhalb der Datenbank.

### Auswirkungen auf `/analytics` (Edge Functions) und `/admin/dashboard`
Da wir die Tabellenlandschaft verändern, müssen natürlich auch jene Scripte angepasst werden, die aktuell in *beiden* Tabellen suchen:

1. **`supabase/functions/aggregate-analytics/index.ts` (Das Herz der Analytics):**
   - **Bisher:** Bei der täglichen Aggregation (`analytics_brewery_daily`) wurden für `btb_plays_total` und `btb_plays_anonymous` zwei separate Queries gemacht: Einmal auf `tasting_score_events` (Auth) und einmal auf `anonymous_game_sessions` (Anon).
   - **Neu:** Zukünftig gibt es nur noch *eine* einzige Query auf `tasting_score_events`.
     - Möchten wir die Anon-Spiele weiterhin getrennt tracken, filtern wir innerhalb dieser Query einfach via `.is('user_id', null)`.
     - Der Code in der Edge-Function wird drastisch kürzer und spart Datenbankaufrufe.

2. **`/admin/dashboard` / `analytics-admin-actions.ts`:**
   - **Bisher:** Das Admin-Dashboard sucht z.B. nach "False Negatives" (Gescannte Flaschen ohne Interaktion) und zieht sich dafür aktuell nur die *eingeloggten* BTBs aus `tasting_score_events`.
   - **Neu:** Da bald auch Gast-Events mit `user_id = null` in dieser Tabelle liegen, könnte der Set-Abgleich im Admin-Menü fehlschlagen, wenn er einen String `"null::brew_id"` baut.
   - **Fix:** Jegliche Admin-Analysen, die explizit nur angemeldete User betrachten wollen, müssen schlicht ein `.not('user_id', 'is', null)` an die bestehenden Supabase-Queries auf `tasting_score_events` anhängen.

Beide Anpassungen sind reines Refactoring (ca. 10 Zeilen Code) und führen eher dazu, dass die Metriken exakter werden, da das historische Raten "welche Tabelle nutze ich wann" komplett entfällt.

---

## Phase 9 — Vibe Analytics für Brauer (Das "Trinkanlass"-Dashboard)

Nachdem wir in Phase 8 alle VibeChecks zentralisiert haben (sowohl Auth als auch Anon liegen dann zusammen in `tasting_score_events`), ist es extrem einfach, diese Daten für Brauer auszuwerten. Der VibeCheck ist nicht nur ein Gimmick, sondern liefert tiefe Konsumentenpsychologie, die wir auf der `/analytics`-Seite der Brauerei verbauen.

**Folgende 4 Insights bauen wir in das neue Panel "Trinkanlässe & Vibes" ein:**

### 1. Der "Community Vibe" pro Rezept (Top Vibes)
- **Was wir darstellen:** Ein Radial Chart (Radar) oder eine saubere Tag-Liste mit Prozentbalken, die zeigen: Welches spezifische Bier wird am häufigsten in welcher Situation getrunken (z.B. Top 5: 40% `friends`, 30% `bbq`, etc.).
- **Brauer-Mehrwert:** Der Brauer sieht, ob der reale Trinkanlass zu seiner ursprünglichen Idee des Rezepts (z.B. "komplexes Stout für den Kaminabend") passt oder ob die Konsumenten es als Party-Bier entfremden.

### 2. Die Zielgruppe verstehen (Social vs. Solo)
- **Was wir darstellen:** Einen einfachen Pie-Chart oder Doughnut-Chart, der alle abgesetzten Vibes in Kategorien bündelt: "Social" (z.B. `party`, `friends`, `festival`) gegen "Solo/Relaxing" (z.B. `couch`, `gaming`, `reading`).
- **Brauer-Mehrwert:** Liefert direkt anwendbare Vorgaben für Marketing-Bilder auf Social Media ("Das perfekte Bier zum Grillen") oder das Layout künftiger Smart-Labels.

### 3. Trinkanlass vs. Tageszeit (Der Kontext)
- **Was wir darstellen:** Eine Heatmap oder ein Linien-Chart, das die getrackten Vibes (aus dem JSON-Array `metadata->'vibes'`) mit der Uhrzeit (`created_at`) kreuzt.
- **Brauer-Mehrwert:** Erkenntnisse wie: "Freitags um 17 Uhr wird auf `feierabend` gescannt, samstags um 23 Uhr dominiert `party`." Erlaubt es, die digitalen Angebote hinter dem QR-Code je nach Uhrzeit dynamisch und passend zur aktuellen "Stimmung" anzupassen.

### 4. Vibe-Clustering über das Portfolio
- **Was wir darstellen:** Einen aggregierten brauereiweiten Überblick. "Deine Brauerei steht insgesamt für XYZ."
- **Brauer-Mehrwert:** Deckt absolute Blinde Flecken im Portfolio auf. Wenn eine Brauerei feststellt, dass alle ihre Sorten im Vibe `sommer` oder `party` konsumiert werden, fehlt ihr eventuell ein dunkleres, ruhiges Bier (`winter`, `relaxing`) für eine ganzjährige Kundenbindung.

### ⚠️ UX: Mindest-Datenmenge beachten
Vibe-Auswertungen sind statistisch sinnlos unter einem Schwellwert. Wir implementieren:
- **< 10 VibeChecks:** Panel zeigt einen Hinweis: "Noch zu wenig Daten – teile deinen QR-Code, um mehr Einblicke zu erhalten"
- **10–49 VibeChecks:** Nur Top-Vibe-Liste, keine Tageszeit-Heatmap
- **≥ 50 VibeChecks:** Alle 4 Insights aktiviert

**Aggregations-Query (Beispiel für Top Vibes):**
```sql
-- Unnest des JSON-Arrays und Zählen der Häufigkeit
SELECT vibe, COUNT(*) as count
FROM (
  SELECT jsonb_array_elements_text(metadata->'vibes') as vibe
  FROM tasting_score_events
  WHERE event_type = 'vibe_check'
    AND brew_id = :brew_id
) sub
GROUP BY vibe
ORDER BY count DESC
LIMIT 10;
```

### Code-Änderungen

**`submitVibeCheck` in `lib/actions/beat-the-brewer-actions.ts`:**
- Auth-Pfad: `bottle_id + user_id` Duplicate-Check entfernen
- Anon-Pfad: `(bottle_id, ip_hash)` Constraint-Handling entfernen
- Für beide: Token-Nonce prüfen (analog zu BTB `btb_used_nonces`) → nach Submit verbrauchen

**`VibeCheck.tsx`:**
- Neue Prop: `qrToken?: string | null`
- Nach Submit: `sessionStorage.setItem('vibe_done_${qrToken}', '1')` → unterdrückt UI innerhalb der Browser-Session, cross-user-sicher
- `alreadySubmitted`-Prop-Logik durch sessionStorage-Check ersetzen

**`page.tsx`:**
- `<VibeCheck qrToken={qrToken} ...>` ergänzen

**`hasSubmittedVibeCheck()`:**
- Nicht mehr benötigt → als deprecated markieren / entfernen

---

## Verifikation nach den Fixes

| Szenario | Erwartetes Verhalten |
|---|---|
| User A bewertet auf Gerät, User B loggt sich ein und ruft Seite auf | User B sieht Bewertungs-CTA, nicht "Kronkorken gesammelt" |
| Eingeloggter User bewertet, loggt sich aus, Anon besucht Seite | Anon sieht keine "bereits bewertet" Warnung |
| Flasche wird neu befüllt (neuer Sud, gleiche bottle_id), User ruft Seite erneut auf | VibeCheck ist für neuen Scan-Anlass wieder möglich |
| User scannt gleiche Flasche zweimal (gleicher QR-Token) | VibeCheck nach erstem Submit unterdrückt (sessionStorage) |
| Neuer QR-Scan (neues Token) derselben Flasche | VibeCheck wieder freigeschaltet ✅ |
| BTB wird auf neuem Gerät nach Login aufgerufen | Historisches Ergebnis wird korrekt geladen (isLoggedIn in deps) |

---

## Relevante Dateien

- [app/b/[id]/page.tsx](../../app/b/[id]/page.tsx) — Phase 1, 2, 4.5
- [app/b/[id]/components/BeatTheBrewerGame.tsx](../../app/b/[id]/components/BeatTheBrewerGame.tsx) — Phase 3
- [app/b/[id]/components/VibeCheck.tsx](../../app/b/[id]/components/VibeCheck.tsx) — Phase 4.4, 4.6
- [lib/actions/beat-the-brewer-actions.ts](../../lib/actions/beat-the-brewer-actions.ts) — Phase 4.3, 4.7
- `supabase/migrations/YYYYMMDD_vibecheck_token_nonce.sql` — Phase 4.1, 4.2
