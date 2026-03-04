# Roadmap: `/b/[id]` — Das Perfekte Digitale Flaschenetikett

**Status:** In Umsetzung 🚧 — Core implementiert, Phasen 12/13 offen  
**Erstellt:** 2026-03-03  
**Letztes Update:** 2026-03-03 (Phasen 1–11 Core implementiert, Content-First-Umstrukturierung abgeschlossen)  
**Priorität:** Hoch (Core Consumer UX)  
**Basis:** Deep-Dive Audit 2026-03-03 + Gamification Research 2026-03-03

---

## 🎯 Vision & Nutzungskontext

`/b/[id]` ist **kein Marketing-Auftritt, keine SEO-Seite, keine Share-Seite.**

Es ist ein **digitales Flaschenetikett** — erreichbar ausschließlich über den QR-Code auf der physischen Flasche.

### Der Moment der Wahrheit

```
User hält Flasche in der Hand
       ↓
QR-Code scannen
       ↓
/b/[id] lädt auf dem Smartphone
       ↓
User befindet sich in einer sozialen Situation
(Party, Grillen, Bier-Tasting, Keller)
```

**Primäre Bedürfnisse (Content-First — above the fold):**

1. _Was trinke ich gerade?_ — Sofortige visuelle Bestätigung (Label, Name, Beschreibung)
2. _Wie stark / bitter / was ist das?_ — ABV, IBU, Stil-Details, Inhaltsstoffe
3. _Was ist drin?_ — Details, Zutaten, Batch-Info, vollständiges Rezept

**Sekundäre Bedürfnisse (Interaktion — nach Scroll-Trenner):** 4. _Was denke ich davon?_ — VibeCheck, Bewertung abgeben, Kronkorken sammeln 5. Deep Engagement Gamification (Beat the Brewer) — als Continuation nach Bewertung 6. Community-Features (Stash, Brew Bounties) — Retention, nicht Erstbesuch 7. Wer steckt dahinter? (Brauerei)

**Non-Goals dieser Seite:**

- SEO / Google-Indexierung
- Social Sharing
- Wiederkehrende Navigation
- Desktop-Optimierung (99% Mobile)

---

## 📊 Aktueller Zustand (Pre-Roadmap)

| Dimension                    | Bewertung | Begründung                                                                                              |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| **Performance**              | ★★☆☆☆     | 9 sequenzielle Requests, externer ipify-Call blockiert                                                  |
| **Loading UX**               | ★★☆☆☆     | Schwarzer Spinner, kein Skeleton                                                                        |
| **Content-Hierarchie**       | ★★☆☆☆     | Rating/Kronkorken erst nach 8 Blocks                                                                    |
| **Feedback/Toasts**          | ★☆☆☆☆     | 7× `alert()` — mobiler UX-Killer                                                                        |
| **Code-Qualität**            | ★★☆☆☆     | `any` durchgehend, 20+ console.logs, duplizierte Logik                                                  |
| **Type Safety**              | ★★☆☆☆     | Keine Interfaces für Bottle, Brew, Brewery, Rating                                                      |
| **Accessibility**            | ★★☆☆☆     | Keine ARIA-Rollen auf Modals, Sliders ohne Labels                                                       |
| **Fehlerbehandlung**         | ★★☆☆☆     | Mehrere silently swallowed Errors                                                                       |
| **Zwei-Welten-Trennung**     | ★★★☆☆     | Collection-Link zeigt auf Brauer-Dashboard                                                              |
| **Features**                 | ★★★★☆     | Viele Features vorhanden; Flaschennummer/Batch sichtbar machen fehlt                                    |
| **Gamification-Architektur** | ★★☆☆☆     | 6 gleichzeitige CTAs → Decision Paralysis; kein progressives Tier-Modell; Feedback-Loops fehlen         |
| **Standortdaten**            | ★★☆☆☆     | Vercel Geo-IP zeigt CDN-Knoten (Frankfurt/München) statt echten Nutzerstandort; Analytics-Karte wertlos |

---

## 🗺️ Phasen-Übersicht

| Phase        | Bezeichnung                    | Schwerpunkt                                                  | Aufwand |
| ------------ | ------------------------------ | ------------------------------------------------------------ | ------- |
| **Phase 1**  | Performance & Loading          | ipify entfernen, Requests parallelisieren, Skeleton          | Hoch    |
| **Phase 2**  | Content-Hierarchie             | Rating & Kronkorken nach oben, visuelle Überarbeitung        | Mittel  |
| **Phase 3**  | Feedback & Mobile UX           | alert() → Toasts, Inline-Feedback, Cap-Flow vereinheitlichen | Mittel  |
| **Phase 4**  | Physikalisches Etikett digital | Flaschennummer + Batch/Session-Infos anzeigen                | Gering  |
| **Phase 5**  | Code-Qualität & Type Safety    | Types, 'use client', console.logs, Dead Code                 | Mittel  |
| **Phase 6**  | Fehlerbehandlung               | Alle Server-Action-Calls abgesichert, Retry-Logik            | Mittel  |
| **Phase 7**  | Accessibility                  | ARIA-Rollen, Focus-Traps, Screen-Reader-Support              | Mittel  |
| **Phase 8**  | Zwei-Welten-Konsistenz         | Consumer vs. Brewer Links, Routing-Guards                    | Gering  |
| **Phase 9**  | Image-Optimierung              | next/image, WebP, Responsive Sizes, Priority                 | Gering  |
| **Phase 10** | DSGVO & Datenschutz            | IP-Abhängigkeit eliminieren, Duplicate-Check refactorn       | Mittel  |
| **Phase 11** | Progressive Gamification Stack | Tier-Modell, VibeCheck first, Beat-the-Brewer nach Rating    | Hoch    |
| **Phase 12** | Standortdaten (Geo-Consent)    | Browser Geolocation nach Star-Rating (Tier 2), DSGVO-konform | Mittel  |
| **Phase 13** | Direct Sales / Shop Link       | Conversion-Feature am Ende der Seite                         | Gering  |

---

---

## Phase 1 — Performance & Loading

**Status:** ✅ Core implementiert — Tests ausstehend

**Ziel:** `/b/[id]` muss auf Mobilnetz in ≤ 1.5 Sekunden nutzbar sein. Der User steht mit der Flasche in der Hand — jede Sekunde zählt.

### 1.1 — ipify-Abhängigkeit eliminieren

**Problem:** `fetch('https://api.ipify.org?format=json')` wird in `fetchBottleInfo()` an **erster Stelle** ausgeführt — bevor auch nur die Flasche geladen wird. Bei schlechtem LTE blockiert dieser externe Call das gesamte Rendering.

**Lösung:** IP-basierten Duplicate-Check ersetzen durch:

- Wenn eingeloggt: `user.id` als primären Duplicate-Guard
- Wenn anonym: `session_hash` (bereits in `trackBottleScan` implementiert) oder `localStorage`-Flag pro `brew_id`
- IP komplett aus Client-seitigem Code entfernen

**Betroffene Dateien:**

- `app/b/[id]/page.tsx` — `fetch(ipify)` entfernen, `setUserIp` State entfernen
- `app/b/[id]/page.tsx` — `loadRatings()` IP-Check umschreiben auf `user.id` / localStorage
- `app/b/[id]/page.tsx` — `submitRating()` IP-Payload entfernen
- `app/api/ratings/check/route.ts` — User-ID- und/oder LocalStorage-Token-basierter Check
- `app/api/ratings/submit/route.ts` — IP ausschließlich server-seitig via Header (`x-forwarded-for`), niemals vom Client

**Checkliste:**

- [x] `fetch('https://api.ipify.org')` aus `fetchBottleInfo()` entfernen
- [x] `userIp` State und alle Referenzen entfernen
- [x] `loadRatings()`: IP-Check durch `user.id`-Check ersetzen (wenn `user` vorhanden)
- [x] `loadRatings()`: Anonymer Duplicate-Check via `localStorage.getItem('rated_' + brewId)`
- [x] `submitRating()`: IP aus Client-Payload entfernen
- [x] `submitRating()`: `localStorage.setItem('rated_' + brewId, '1')` nach erfolgreichem Submit
- [x] `/api/ratings/check` Route auf User-ID-Check aktualisieren
- [x] `/api/ratings/submit` Route: IP nur noch via `req.headers.get('x-forwarded-for')` (server-seitig)
- [x] `console.log('User IP:', ipData.ip)` entfernen
- [ ] Testen: Anonym raten blockiert zweites Rating (localStorage)
- [ ] Testen: Eingeloggt raten blockiert zweites Rating (user_id)
- [ ] Testen: Nach Logout + neuem Account kann nicht erneut geratet werden

---

### 1.2 — Request-Wasserfall parallelisieren

**Problem:** `fetchBottleInfo()` macht 9 sequenzielle Netzwerk-Calls. Auf Mobilnetz: 3–6 Sekunden bis interaktiv.

**Aktueller Wasserfall (sequenziell):**

```
1. fetch(ipify)                     ~300ms
2. query(bottles)                   ~100ms
3. query(brewing_sessions)          ~100ms  [wartet auf 2]
4. query(brews)                     ~100ms  [wartet auf 2]
5. trackBottleScan()                ~200ms  [wartet auf 4]
6. query(breweries)                 ~100ms  [wartet auf 4]
7. query(brewery_members)           ~100ms  [wartet auf 4]
8. query(profiles)                  ~100ms  [wartet auf 4]
9. loadRatings() + checkCapCollected ~200ms [wartet auf 4]
```

**Gesamte TTI: ~1.4s minimum, real 2–5s auf Mobilnetz**

**Ziel-Architektur (parallelisiert):**

```
1. query(bottles)                              [sofort starten]
   ↓ sobald bottle.brew_id bekannt:
2a. query(brews)                               [parallel starten]
2b. query(brewing_sessions)                    [parallel starten]
   ↓ sobald brew bekannt:
3a. query(breweries) + query(brewery_members)  [parallel]
3b. query(profiles)                            [parallel]
3c. loadRatings()                              [parallel]
3d. checkCapCollected()                        [parallel]
3e. trackBottleScan()                          [fire-and-forget, non-blocking]
```

**Checkliste:**

- [x] `brewing_sessions`- und `brews`-Query mit `Promise.all()` parallelisieren (beide brauchen nur `bottle.brew_id` / `bottle.session_id`)
- [x] Nach Brew-Load: `breweries`, `brewery_members`, `profiles`, `loadRatings()`, `checkCapCollected()` in einem `Promise.all()` bündeln
- [x] `trackBottleScan()` als non-blocking fire-and-forget — nicht auf dessen Ergebnis warten
- [x] `profile_views`-Update als non-blocking fire-and-forget (kein `await`)
- [x] Gesamte `fetchBottleInfo()` in saubere `try/catch/finally` mit `setLoading(false)` im `finally`
- [ ] Ladezeit auf Mobilnetz benchmarken (Chrome DevTools → Network Throttling "Slow 4G")

---

### 1.3 — Skeleton Loading statt Spinner

**Problem:** Schwarzer Screen mit weißem Spinner gibt keine visuellen Hinweise. Der User weiß nicht, was lädt und verliert den QR-Kontext.

**Ziel-Skeleton (entsprechend dem echten Layout):**

```
[████████████████████]  ← Label-Bild Skeleton (aspect-square)
[████████] [████]       ← Name + Style-Badge Skeleton
[███] [███] [███]       ← Stats-Grid (ABV/IBU/Farbe) Skeleton
[████████████████████]  ← Details-Box Skeleton
```

**Checkliste:**

- [x] `BottleLabelSkeleton`-Komponente erstellen: `app/b/[id]/components/BottleLabelSkeleton.tsx`
- [x] Skeleton zeigt: Quadratisches Bild-Placeholder, Titel-Block, 3er Stats-Grid, Details-Block
- [x] `loading.tsx` im `/b/[id]/`-Ordner anlegen (Next.js Suspense Boundary) — zeigt `BottleLabelSkeleton`
- [x] `error.tsx` im `/b/[id]/`-Ordner anlegen — zeigt Fehler-UI mit "Erneut versuchen"-Button
- [x] `isLoading`-State auf einzelne Sektionen aufteilen (Bild/Stats sofort, Ratings können nachladen)
- [x] Ratings-Sektion: eigenes Loading-Skeleton während `loadRatings()` läuft
- [ ] Testen: Skeleton ist auf Slow 4G sichtbar und fühlt sich schnell an

---

### 1.4 — `confetti` lazy importieren

**Problem:** `import confetti from 'canvas-confetti'` wird statisch geladen (~25KB gzipped) — bei jedem Besuch, obwohl es nur bei ~5% der Visits ausgelöst wird (nur bei erfolgreichem Cap-Claim).

**Checkliste:**

- [x] Statischen Import `import confetti from 'canvas-confetti'` entfernen
- [x] In `collectCap()` und `handleClaimCap()`: `const confetti = (await import('canvas-confetti')).default` vor Verwendung einfügen
- [ ] Testen: Confetti-Animation funktioniert noch nach dynamischem Import

---

---

## Phase 2 — Content-Hierarchie

**Ziel:** Die wichtigste Consumer-Action (Bewertung + Kronkorken) muss ohne Scrollen erreichbar sein. Der User steht mit dem Handy in der Hand — er scrollt nicht durch 8 Sektionen.

### 2.1 — Neue Seiten-Struktur definieren

**Aktuelle Reihenfolge (Problem):**

```
1. Label-Bild (Hero)
2. Name + Stil + Beschreibung
3. Stats-Grid (ABV/IBU/Farbe)
4. Details-Sektion (Zutaten)
5. "Vollständiges Rezept"-Link
6. Beat the Brewer
7. Vibe Check
8. Stash Button
9. Brew Bounties
10. Kronkorken-Section  ← KERN-CTA — viel zu weit unten!
11. Bewertungen
12. Brauerei-Link
13. Footer
```

**Neue Reihenfolge (Ziel & implementiert) — Content-First mit progressiver Gamification:**

```
══ Content-Bereich (Produktinformationen zuerst) ══
1. Label-Bild (Hero)                                   [above fold]
2. Name + Stil + Flaschennummer + Scan-Zähler          [above fold]
3. Beschreibung (Kurztext)                              [above fold]
4. Stats-Grid (ABV/IBU/Farbe)                          [above fold]
5. Details-Sektion (Zutaten, Batch-Info, Messwerte)     [scrollbar]
6. "Vollständiges Rezept"-Link                          [scrollbar]
7. Bewertungen (Liste, max. 3 initial)                  [scrollbar]
── Trenner: "Mitmachen" ──
══ Interaktions-Bereich (Gamification nach Content) ══
── Tier 1: Single-Tap Engagement ──
8. VibeCheck (1 Tap auf Occasions-Emoji)                [nach Scroll-Trenner]
   └ Sofortiger Community-Vergleich nach Tap
── Tier 2: Quick Engagement ──
9. Bewerten & Kronkorken (Rating CTA + Cap)             [nach VibeCheck]
10. Rating Modal (inline, direkt nach CTA)
── Tier 3: Deep Engagement (nach Rating-Submit) ──
11. Beat the Brewer (erscheint nach Rating)
── Trenner: "Community" ──
── Tier 4: Community (für treue Fans) ──
12. Stash + Brew Bounties
13. Brauerei-Link + Team-Avatare
14. Footer
```

**Design-Entscheidung (2026-03-03):** Die ursprüngliche Tier-Architektur platzierte Gamification (VibeCheck, Rating) above the fold direkt nach den Stats. In der Praxis ging dadurch der Kern-Zweck der Seite — _Produktinformationen vermitteln_ — zu sehr verloren. **Content-First** bedeutet: Beschreibung, Werte, Inhaltsstoffe und Rezept stehen immer vor jeder Interaktion. Die Gamification-Elemente folgen erst nach einem klar sichtbaren Trenner.

**Checkliste:**

- [x] JSX-Struktur in `page.tsx` gemäß Content-First-Architektur umbauen
- [x] Beschreibung direkt unter Name/Stil platzieren (vor Stats)
- [x] Details/Inhaltsstoffe direkt nach Stats platzieren (vor Gamification)
- [x] "Vollständiges Rezept"-Link nach Details platzieren
- [x] Bewertungsliste nach Rezept-Link, vor Gamification-Trenner
- [x] Visuellen Trenner "Mitmachen" vor VibeCheck einfügen
- [x] VibeCheck, Rating CTA, Beat the Brewer nach dem Trenner
- [x] Beat-the-Brewer-Block wird erst nach Rating-Submit eingeblendet
- [x] Stash + Brew Bounties ans Ende (Tier 4) — weg aus der primären Sicht
- [x] Visuellen Trenner "Community" zwischen Tier 3 und Tier 4

---

### 2.2 — Kern-CTA-Block (`RatingCTABlock`)

**Problem:** Der aktuelle Kronkorken-Block ist 80+ Zeilen tief vergraben, nutzt `pt-24 mt-32` und hat einen floating Hero-Cap. Das macht Repositionierung schwer.

**Ziel:** Kompakter CTA-Block direkt nach den Stats:

- Zeigt aktuellen Durchschnitt (★ 4.2 aus 12 Bewertungen) ODER "Sei der Erste"
- Zeigt User-Status (bereits bewertet / Cap gesammelt)
- Primär-Button je nach State

**Checkliste:**

- [x] Neuen `RatingCTABlock`-Component erstellen: `app/b/[id]/components/RatingCTABlock.tsx`
- [x] Zeigt: Durchschnittsbewertung mit Sternen (falls vorhanden) oder "Noch keine Bewertungen"
- [x] Zeigt: Anzahl Bewertungen
- [x] State-abhängiger CTA-Button:
  - [x] Noch nicht bewertet: "💬 Bewerten & Kronkorken sammeln" (primary)
  - [x] Bewertet, kein Cap: "🥇 Kronkorken sammeln" (secondary)
  - [x] Bewertet & Cap gesammelt: "✓ Bewertet · Kronkorken gesammelt" (disabled/success)
- [x] Kronkorken-Bild kleiner und inline statt als floating Hero
- [x] Animierter Zustand: Cap leuchtet auf wenn `capCollected = true`
- [x] Alten gigantischen Kronkorken-Block entfernen oder massiv vereinfachen

---

### 2.3 — Bewertungsliste inline

**Problem:** Die Bewertungsliste ist am Ende der Seite. Nach dem Abgeben einer Bewertung sieht der User keinen sofortigen Kontext.

**Checkliste:**

- [x] Bewertungen direkt unter dem Kern-CTA-Block (Rating/Cap) platzieren
- [x] Maximal 3 Bewertungen initial — "Alle X Bewertungen anzeigen"-Toggle
- [x] Neueste Bewertung direkt nach eigenem Submit als erste anzeigen (optimistic UI)
- [x] Wenn 0 Bewertungen: "Noch keine Bewertungen — sei der Erste!" statt leer

---

---

## Phase 3 — Feedback & Mobile UX

**Status:** ✅ Core implementiert — Tests ausstehend

**Ziel:** Keine einzige `alert()`-Verwendung mehr. Alle User-Interaktionen geben natives, gestyltes Feedback.

### 3.1 — Toast-System einführen

**Problem:** 7× `alert()` in `page.tsx` — blockiert den Thread, ist nicht stylebar, auf Mobile besonders störend (Browser-Dialog).

**Checkliste:**

- [x] Prüfen: Ist `sonner`, `react-hot-toast` oder ähnliches bereits in `package.json`?
- [x] Falls nicht: Einfache `ToastContext`-Komponente erstellen (`app/components/Toast.tsx`)
- [x] Toast-Provider in `app/b/[id]/page.tsx` oder `app/layout.tsx` einbinden
- [x] Alle 7 `alert()`-Calls ersetzen:
  - [x] "Kronkorken erfolgreich gesammelt!" → Success-Toast + Confetti (kein alert)
  - [x] "Fehler beim Sammeln: ..." → Error-Toast
  - [x] "Bitte logge dich ein..." → Info-Toast mit Login-Link-Button
  - [x] "Sitzung abgelaufen. Bitte neu einloggen." → Warning-Toast
  - [x] "Du hast bereits eine Bewertung abgegeben..." → Info-Toast
  - [x] "Fehler: IP-Adresse konnte nicht ermittelt werden" → entfällt durch Phase 1.1
  - [x] "Fehler: " + result.error → Error-Toast
- [ ] Testen: Alle Feedback-Pfade auf echtem Smartphone durchgehen

---

### 3.2 — Cap-Claim-Flow vereinheitlichen

**Problem:** Es gibt zwei separate Code-Pfade für das Kronkorken-Sammeln:

1. `collectCap()` — direkt via Supabase-Insert, für bereits Bewertete
2. `handleClaimCap()` — via `/api/bottle-caps/claim` mit Auth-Header, für frisch Bewertete

Beide tun dasselbe aber unterschiedlich. Das ist fragil, schwer wartbar und führt zu inkonsistentem Verhalten bei Fehlern.

**Checkliste:**

- [x] `collectCap()` und `handleClaimCap()` zu einer einzigen `claimCap(ratingId?: string)` Funktion zusammenführen
- [x] Einheitlich über `/api/bottle-caps/claim` Route
- [x] Auth-Check in der Funktion selbst: Wenn kein User → Redirect zu Login mit `callbackUrl`
- [x] `setCollectingCap` State vereinheitlichen (ein State für beide Pfade)
- [x] Confetti-Auslösung an einem Ort (nur in `claimCap`, nicht doppelt)
- [x] Legacy `collectCap()` Funktion nach Migration entfernen
- [ ] Testen: Beide Pfade (direkt sammeln, nach Rating sammeln) funktionieren

---

### 3.3 — Rating-Modal: IP-Guard entfernen

**Problem:** `handleStartRating()` prüft ob `!userIp` und blockt das Modal-Öffnen wenn keine IP vorhanden. Nach Phase 1.1 (IP entfernen) muss diese Guard weg.

**Checkliste:**

- [x] `handleStartRating()`: `if (!userIp || !data?.brews?.id) return;` → `if (!data?.brews?.id) return;`
- [x] IP-Guard aus `submitRating()` entfernen
- [x] Alle anderen `userIp`-Referenzen in `page.tsx` entfernen (nach Phase 1.1 Checkliste)
- [x] `userIp` State komplett entfernen

---

### 3.4 — Auto-Claim nach Login: URL-Cleanup verbessern

**Problem:** Der Auto-Claim nach Login-Redirect könnte Race Condition haben zwischen `router.replace()` und `handleClaimCap()`.

**Checkliste:**

- [x] `router.replace()` (URL-Cleanup) BEFORE `handleClaimCap()`-Aufruf via `await`
- [x] `hasAutoClaimedRef` einführen um doppeltes Auslösen zu verhindern
- [x] `searchParams`-Dependency aus dem AutoClaim-`useEffect` korrekt handhaben

---

---

## Phase 4 — Das Physikalische Etikett Digital Spiegeln

**Ziel:** Die Seite soll bewusst machen, was der User bereits in der Hand hält — die physische Flasche. Flaschennummer, Batch-Infos und Herstellungsdaten sind echte Daten die geladen aber nicht gezeigt werden.

### 4.1 — Flaschennummer anzeigen

**Problem:** `data.bottle_number` wird im Supabase-Select geladen aber **nirgends im UI angezeigt**. Der User sieht z.B. "Flasche #47" auf dem physischen Etikett — das digitale Label sollte das spiegeln.

**Checkliste:**

- [x] Flaschennummer als kleines Badge im Header: `#47` neben dem Stil-Badge
- [x] Nur anzeigen wenn `data.bottle_number !== null`
- [x] Stil: Kleines, dezentes Badge in Zinc-Tönen (nicht dominieren, aber klar erkennbar)
- [ ] Alternative Platzierung: Im Footer als "Flasche #47 · Digitale ID: abc123"

---

### 4.2 — Batch/Session-Informationen nutzen

**Problem:** `session`-Daten werden geladen und in `displayData` zusammengeführt, aber wichtige Session-Felder werden nicht angezeigt.

**Nützliche Session-Felder:**

- `session.brewed_at` → "Gebraut am 15.01.2026"
- `session.bottling_date` → "Abgefüllt am 28.01.2026"
- `session.batch_number` → "Batch #3"
- `session.volume_liters` → Exaktes Batch-Volumen (statt Schätzung)

**Checkliste:**

- [x] Im Details-Block: "Gebraut am [Datum]" anzeigen (wenn `session.brewed_at`)
- [x] Im Details-Block: "Batch #[Nummer]" anzeigen (wenn `session.batch_number`)
- [x] `session.volume_liters` für `estimatedBatchVolume` bevorzugen gegenüber der eigenen Schätzformel
- [x] `session.bottling_date` bevorzugen gegenüber `data.filled_at` (Session-Datum ist akkurater)
- [x] Fallback: Wenn keine Session-Daten → aktuelles Schätz-Verfahren beibehalten

---

### 4.3 — Scan-Zähler anzeigen

**Problem:** Die Seite trackt Scans (via Analytics), zeigt dem User aber keinen sozialen Beweis.

**Checkliste:**

- [x] Scan-Count für diese Flasche laden: `SELECT COUNT(*) FROM bottle_scans WHERE bottle_id = $1`
- [x] Als dezentes Badge einbauen: "🔍 12 Scans" oder "12 Personen haben diese Flasche gescannt"
- [x] Platzierung: Im Header-Bereich oder nahe dem Rating-Block
- [x] Erst anzeigen ab ≥ 2 Scans (ersten eigenen Scan nicht zeigen)
- [x] Performance: Scan-Count parallel mit anderen Queries laden (nicht blockierend)

---

---

## Phase 5 — Code-Qualität & Type Safety

**Ziel:** `page.tsx` von 1.365 Zeilen auf wartbaren, typsicheren Code reduzieren. Keine `any`-Types in den kritischen Datenpfaden.

### 5.1 — Typen einführen

**Problem:** Alle State-Variablen sind `any`: `data`, `profile`, `brewery`, `team`, `ratings`.

**Checkliste:**

- [x] Interface `BottleWithBrew` erstellen: `{ id, bottle_number, brew_id, session_id, filled_at, brews: BrewData, session: SessionData | null }`
- [x] Interface `BrewData` erstellen: alle relevanten Felder aus dem Supabase-Select
- [x] Interface `BreweryData` erstellen
- [x] Interface `RatingData` erstellen
- [x] `data` State: von `any` auf `BottleWithBrew | null`
- [x] `ratings` State: von `any[]` auf `RatingData[]`
- [x] `brewery` State: von `any` auf `BreweryData | null`
- [x] `team` State: von `any[]` auf `TeamMember[]`
- [x] `RateBrewModal`: `currentUser: any` → `currentUser: User | null` (aus `@supabase/supabase-js`)
- [x] Alle `catch (err: any)` → `catch (err: unknown)` mit Type-Guard

---

### 5.2 — `'use client'`-Direktiven ergänzen

**Problem:** `FlavorTagSelector.tsx`, `TasteSlider.tsx`, und `RateBrewModal.tsx` verwenden Client-Hooks (`useState`, `useEffect`, `useRef`) ohne `'use client'`-Direktive am Dateianfang.

**Checkliste:**

- [x] `app/b/[id]/components/FlavorTagSelector.tsx`: `'use client';` an Zeile 1 einfügen
- [x] `app/b/[id]/components/TasteSlider.tsx`: `'use client';` an Zeile 1 einfügen
- [x] `app/b/[id]/components/RateBrewModal.tsx`: `'use client';` an Zeile 1 einfügen
- [x] Alle drei auf TypeScript-Fehler prüfen nach Direktiv-Ergänzung

---

### 5.3 — `renderIngredientList` extrahieren und refactorn

**Problem:** 160 Zeilen globale `const` außerhalb des Components in `page.tsx`. Enthält 2× duplizierte `parseAmount`-Funktion.

**Checkliste:**

- [x] `renderIngredientList` in eigene Datei extrahieren: `app/b/[id]/components/IngredientList.tsx`
- [x] Duplizierte `parseAmount`-Funktion konsolidieren (einmalige Definition)
- [x] Props typisieren: `items: IngredientItem[] | string | null`
- [x] Interface `IngredientItem`: `{ name: string; amount?: number | string; unit?: string }`
- [x] Als React Component `<IngredientList items={...} mode={...} />`
- [x] In `page.tsx` durch Component-Aufruf ersetzen

---

### 5.4 — console.log Cleanup

**Problem:** 20+ `console.log`/`console.warn` Statements in Production — potenzielle Daten-Leaks, Performance-Impact.

**Checkliste:**

- [x] `console.log("Fetching bottle:", id)` entfernen
- [x] `console.log('User IP:', ipData.ip)` entfernen (entfällt durch Phase 1.1)
- [x] `console.log("Bottle loaded:", bottle)` entfernen
- [x] `console.log("Brew loaded:", brew, "Session:", sessionData)` entfernen
- [x] `console.log("Loading ratings for brew:", brew.id)` entfernen
- [x] `console.log('User hat bereits bewertet (Server Check)')` entfernen
- [x] `console.log('Sende Rating:', payload)` entfernen
- [x] `console.log("Benutzer hat bereits bewertet. Checke via API...")` entfernen
- [x] `console.log('Rating erfolgreich eingefügt:', result.rating)` entfernen
- [x] `console.log("Claiming Cap - Sending:", { ... })` entfernen
- [x] `console.log("Auto-claiming cap for rating:", claimRatingId)` entfernen
- [x] Error-Logs (`console.error`) behalten — mit `[b/[id]]`-Prefix versehen
- [ ] Optional: Debug-Logs hinter `process.env.NODE_ENV === 'development'` Guard

---

### 5.5 — Dead Code entfernen

**Checkliste:**

- [x] `DrinkingConfirmationPrompt.tsx`: `ENGAGEMENT_THRESHOLDS` Konstante entfernen (definiert, nie verwendet)
- [x] `BeatTheBrewerGame.tsx`: `setTimeout` für `setShowBrewer` in Cleanup-Ref verpacken (Memory Leak bei Unmount)
- [x] `FlavorTagSelector.tsx`: `groupedTags`-Berechnung in `useMemo` wrappen (statische Daten, unnötig re-berechnet)
- [x] `RadarChart.tsx`: `RadarProfile`-Interface durch shared `FlavorProfile`-Type ersetzen
- [x] `VibeCheck.tsx`: Fehlenden Fallback ergänzen wenn `alreadySubmitted=true` aber `communityVibes` leer → "Danke für deinen Input!" statt null-Render

---

### 5.6 — Batch-Volumen-Schätzung vereinfachen

**Problem:** Die `estimatedBatchVolume`-Berechnung (Grain-Mass → Volume aus OG) ist 30 Zeilen komplex und liefert nur einen Schätzwert. Wenn Session-Daten vorhanden sind, ist sie unnötig.

**Checkliste:**

- [x] Logik: `const batchVolume = session?.volume_liters ?? estimatedBatchVolume`
- [x] Wenn `session.volume_liters` vorhanden: direkt verwenden, Schätz-Algorithmus überspringen
- [x] Schätz-Algorithmus als Fallback-only klar kommentieren: `// Fallback wenn keine Session-Daten vorhanden`

---

---

## Phase 6 — Fehlerbehandlung

**Ziel:** Kein Fehler darf vom User unbemerkt verschluckt werden. Kein Server-Action-Call ohne Error-Handling.

### 6.1 — Profile View Counter: Race Condition eliminieren

**Problem:** `update({ total_profile_views: (profileData?.total_profile_views || 0) + 1 })` — Client-seitiger Read-then-Write. Bei gleichzeitigen Scans (mehrere Leute scannen dieselbe Flasche) gehen Increments verloren.

**Checkliste:**

- [x] Supabase RPC anlegen oder Raw SQL nutzen: `UPDATE profiles SET total_profile_views = total_profile_views + 1 WHERE id = $1`
- [x] Als fire-and-forget non-blocking ausführen (kein `await`, kein Error-Impact auf Page-Load)
- [x] In Server Action kapseln: `incrementProfileViews(userId: string)`

---

### 6.2 — BrewBounties: Fehlende Fehlerbehandlung

**Problem:** `load()` in `BrewBounties.tsx` hat kein `catch` — bei Fehler bleibt Component für immer loading.

**Checkliste:**

- [x] `try/catch/finally` um `load()` einbauen
- [x] Bei Fehler: `setLoading(false)` + leeres Array zeigen statt ewiger Spinner
- [x] `handleClaim()`: Error-Toast bei fehlgeschlagenem Claim (via Toast aus Phase 3.1)

---

### 6.3 — StashButton: Fehlende Fehlerbehandlung

**Checkliste:**

- [x] `handleAdd()`: Error-Toast bei Fehler (statt silent fail)
- [x] `handleRemove()`: Error-Toast bei Fehler
- [x] `isInStash()`-Check: Fehler → im Zweifel `false` annehmen (safe default, kein Crash)

---

### 6.4 — BeatTheBrewerGame: Unmount Cleanup

**Problem:** `setTimeout(() => setShowBrewer(true), 600)` wird nicht gecleaned wenn Component unmountet. Memory Leak.

**Checkliste:**

- [x] `const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)`
- [x] `timeoutRef.current = setTimeout(...)` statt nackter `setTimeout`
- [x] `useEffect(() => () => clearTimeout(timeoutRef.current), [])` als Cleanup-Return

---

### 6.5 — Globale Error-Boundary für `/b/[id]`

**Problem:** Kein `error.tsx` im `/b/[id]/`-Verzeichnis. JS-Crashes zeigen Next.js Standard-Error-Seite ohne Kontext.

**Checkliste:**

- [x] `app/b/[id]/error.tsx` erstellen (`'use client'`)
- [x] Zeigt: Freundliche Fehlermeldung ("Oops, hier ist was schiefgelaufen")
- [x] "Erneut versuchen"-Button (`reset()` aus Next.js Error-Props)
- [x] QR-Code Kontext bewahren: Hinweis "Scanne den QR-Code nochmal"
- [ ] Optional: Minimal-Info der Flasche auch im Error-State zeigen (nur id aus URL)

---

---

## Phase 7 — Accessibility

**Ziel:** Die Seite ist von Menschen mit Sehbehinderungen und Screen-Readern grundlegend nutzbar.

### 7.1 — Modals: ARIA-Rollen & Focus Management

**Problem:** Keines der Modal-Overlays (`RateBrewModal`, `StashButton`-Modal, `DrinkingConfirmationPrompt`) hat `role="dialog"`, `aria-modal`, Focus-Trap oder Escape-Key-Handler.

**Checkliste (für alle 3 Modals):**

- [x] `RateBrewModal.tsx`: `role="dialog" aria-modal="true" aria-labelledby="ratemodal-title"` auf Container
- [x] `RateBrewModal.tsx`: Schließen mit Escape-Key (`useEffect(() => { ... }, [isOpen])`)
- [x] `RateBrewModal.tsx`: Fokus auf ersten interaktiven Element beim Öffnen; zurück auf Trigger beim Schließen
- [x] `StashButton.tsx` Modal: `role="dialog"`, Escape-Handler, Focus-Management
- [x] `DrinkingConfirmationPrompt.tsx`: `role="alertdialog"` (da nicht explizit durch User-Aktion geöffnet)
- [x] Close-Buttons "✕" auf allen Modals: `aria-label="Schließen"` ergänzen

---

### 7.2 — TasteSlider: Screen-Reader-Support

**Checkliste:**

- [x] `<input type="range">`: `aria-label={label}`, `aria-valuemin="1"`, `aria-valuemax="10"`, `aria-valuenow={displayValue}` hinzufügen
- [x] `id`-Prop korrekt auf das `<input>` anwenden (wird aktuell ignoriert)
- [x] `<label htmlFor={id}>` korrekt mit `<input id={id}>` verbinden

---

### 7.3 — FlavorTagSelector: Toggle-State

**Checkliste:**

- [x] Alle Tag-Buttons: `aria-pressed={selectedTags.includes(tag.value)}` hinzufügen
- [x] Disabled Buttons (maxSelection erreicht): `aria-disabled="true" title="Maximum von X Tags erreicht"`

---

### 7.4 — RadarChart: SVG-Semantik

**Checkliste:**

- [x] `<svg role="img" aria-label="Geschmacks-Radar-Chart">` setzen
- [x] `<title>Dein Geschmacksprofil vs. Brauer-Profil</title>` innerhalb SVG einfügen
- [ ] Optional `<desc>` mit textueller Zusammenfassung der Hauptwerte

---

### 7.5 — Stern-Rating: Labels

**Checkliste:**

- [x] `RateBrewModal.tsx`: Stern-Buttons mit `aria-label="Mit [X] von 5 Sternen bewerten"` versehen
- [x] Aktuell ausgewählter Stern: `aria-pressed="true"` (alle anderen `aria-pressed="false"`)

---

---

## Phase 8 — Zwei-Welten-Konsistenz

**Ziel:** Die Seite unterscheidet korrekt zwischen Consumer (Drinker) und Brewer-Context für alle weiterführenden Links.

### 8.1 — Collection-Link korrigieren

**Problem:** Nach Kronkorken-Sammeln erscheint "In der Sammlung ansehen" → `/dashboard/collection`. Für Drinker ist der korrekte Pfad `/my-cellar/collection`. Brauer landen korrekt im Dashboard.

**Checkliste:**

- [x] `app_mode` aus dem Profil laden (oder aus Auth-Context verfügbar machen)
- [x] Collection-Link: `isDrinker ? '/my-cellar/collection' : '/dashboard/collection'`
- [ ] Prüfen ob weitere Links auf `dashboard/*` zeigen und ob sie Drinker-aware sein müssen
- [ ] Testen: Drinker-User sieht nach Cap-Claim Link zu `/my-cellar/collection`

---

### 8.2 — Pre-Login Intent erhalten

**Problem:** Wenn ein anonymer User auf "Bewerten" klickt und zum Login weitergeleitet wird, muss der `app_mode=drinker` Context erhalten bleiben.

**Checkliste:**

- [x] Login-Redirect aus `/b/[id]` immer mit `?intent=drink` ergänzen
- [x] Auth-Callback-Handler setzt `app_mode = 'drinker'` wenn `intent=drink` im URL vorhanden
- [ ] Testen: Anonym auf `/b/[id]` → "Bewerten" → Login → Callback → zurück auf `/b/[id]` mit `app_mode = 'drinker'`
- [ ] Testen: Registrierte Brauer die `/b/[id]` besuchen behalten `app_mode = 'brewer'`

---

---

## Phase 9 — Image-Optimierung

**Ziel:** Label-Bilder (oft 2–4MB) auf Mobilnetz in WebP, responsive Größen und mit Blur-Placeholder liefern.

### 9.1 — Hero-Bild: `<img>` → `next/image`

**Problem:** `<img src={brew.image_url} alt={brew.name} className="w-full h-full object-cover">` lädt immer das Original-Bild in voller Größe. Kein WebP, kein lazy loading, kein responsive sizing.

**Checkliste:**

- [x] `next/image` Import ergänzen
- [x] Hero-Bild: `<Image src={brew.image_url} alt={brew.name} fill sizes="(max-width: 672px) 100vw, 672px" priority className="object-cover" />`
- [x] `fill` statt `width/height` wegen aspect-ratio Container
- [x] `priority` setzen (LCP-Element — above the fold, höchste Priorität)
- [x] `next.config.ts`: Supabase Storage URL-Domain whitelisten (falls noch nicht vorhanden)
- [x] Fallback beibehalten wenn `brew.image_url` null: Emoji-Placeholder bleibt

---

### 9.2 — Brewery-Logo & Avatare

**Checkliste:**

- [x] Brewery-Logo `<img src={brewery.logo_url}>` → `<Image src={brewery.logo_url} fill alt={brewery.name} className="object-cover" sizes="64px" />`
- [x] Team-Avatare → `<Image fill sizes="32px" alt={member.name} />`

---

### 9.3 — Blur-Placeholder für Hero-Bild

**Checkliste:**

- [x] `placeholder="blur"` auf dem Hero `<Image>` aktivieren
- [x] `blurDataURL` als low-res base64 Thumbnail via Supabase Storage Transform API generieren
- [x] Verhindert Layout-Shift (CLS) beim Laden des echten Bildes

---

---

## Phase 10 — DSGVO & Datenschutz

**Ziel:** Alle personenbezogenen Daten werden nur zweckgebunden und ohne externe Drittanbieter verarbeitet.

### 10.1 — ipify vollständig eliminieren (DSGVO)

**Problem:** `api.ipify.org` ist ein US-Drittanbieter. Jeder Seitenaufruf sendet die IP des Users an einen externen Service ohne explizite Einwilligung. DSGVO Art. 13 Transparenzpflicht verletzt.

**Checkliste:**

- [x] Bestätigen dass nach Phase 1.1 kein `fetch(ipify)` mehr im Code existiert
- [x] Datenschutzerklärung prüfen: Wird ipify dort erwähnt? → Eintrag entfernen
- [x] Server-seitige IP-Nutzung: Nur via `req.headers.get('x-forwarded-for')` aus Vercel-Infrastruktur
- [x] IP wird **nicht gespeichert** — nur für Anti-Spam-Check verwendet und danach verworfen → in DSE dokumentieren

---

### 10.2 — localStorage-Token für anonyme Duplikat-Prüfung

**Kontext:** Folge aus Phase 1.1 — IP-basierter Check wird durch localStorage-basierten Check ersetzt.

**Checkliste:**

- [x] `localStorage.setItem('botllab_rated_' + brewId, '1')` nach erfolgreichem Rating-Submit
- [x] `localStorage.getItem('botllab_rated_' + brewId)` in `loadRatings()` für Duplicate-Check
- [x] `'botllab_cap_' + brewId`: Analog für Cap-Collection-Status (ergänzend zur DB-Prüfung)
- [x] Datenschutzerklärung: Lokale Speicherung für Duplikat-Prüfung dokumentieren (kein Server-Transfer, rein lokal, kein Cookie)

---

---

## Phase 11 — Progressive Gamification Stack

**Ziel:** Gamification-Elemente eskalieren progressiv — jede abgeschlossene Aktion öffnet die nächste. Statt 6 gleichzeitiger CTAs (Decision Paralysis) gibt es einen natürlichen Fluss von minimalem zu tiefem Engagement. Jeder Tier liefert Brauer-Analytics — von Occasions-Daten bis zum Flavor-Perception-Gap.

### Theoretische Grundlage

**BJ Fogg Behavior Model:** `Verhalten = Motivation × Fähigkeit × Auslöser`

Beim QR-Scan ist der optimale Moment bereits eingetreten:

- **Motivation:** HOCH — User hält Produkt in der Hand, ist neugierig
- **Fähigkeit:** HOCH — Smartphone entsperrt, Browser offen
- **Auslöser:** BEREITS ERFOLGT — der Scan selbst

**Foot-in-the-Door-Effekt (Freedman & Fraser, 1966):** User, die eine kleine Aktion ausgeführt haben, sind signifikant wahrscheinlicher bereit, eine größere Folgeaktion zu machen. Daher: Tier 1 so leicht wie möglich halten.

**Self-Determination Theory (Deci & Ryan):** Gamification wirkt nachhaltig wenn sie diese drei Grundbedürfnisse bedient:

| Bedürfnis       | Was es bedeutet                            | Euer Element                     |
| --------------- | ------------------------------------------ | -------------------------------- |
| **Autonomy**    | Ich entscheide selbst, wie viel ich teile  | VibeCheck (1 Tap reicht)         |
| **Competence**  | Mein Input ist wertvoll, ich bin gut darin | Beat the Brewer ← perfekt!       |
| **Relatedness** | Meine Meinung hat soziale Bedeutung        | „64% hatten auch Party-Stimmung“ |

**Paradox of Choice (Barry Schwartz, 2004):** Mehr als 3–4 gleichwertige Optionen gleichzeitig führen zu Decision Paralysis und keiner Wahl. Aktuelle Seite zeigt 6 CTAs gleichzeitig — daher bricht die Interaktionsrate ein.

---

### Das „Consent through Delight“-Prinzip

Jede Tier-Eingabe erzeugt **sofort** ein sichtbares, persönliches Ergebnis. Dateneingabe fühlt sich nicht wie Arbeit an — sondern wie ein Spiel.

| Tier       | Input           | Sofortiger Feedback-Loop                   | Analytics-Wert für Brauer   |
| ---------- | --------------- | ------------------------------------------ | --------------------------- |
| **Tier 0** | (passiv)        | Scan-Zähler, Ø Rating                      | Social Proof, Reichweite    |
| **Tier 1** | VibeCheck-Tap   | „64% hatten auch Party-Stimmung 🎉“        | Occasions-Daten, Kontext    |
| **Tier 2** | Stern-Rating    | „Du liegst 0.3 Sterne über dem Ø“          | Kern-Qualitätsdaten         |
| **Tier 3** | Beat the Brewer | Reveal: wie nah war der User am Brauer?    | Flavor-Perception-Gap       |
| **Tier 3** | Taste Sliders   | Radar-Chart erscheint live während Eingabe | Detailliertes Flavor-Profil |

---

### Tier-Übersicht

**Tier 0 — Passiv (0 Aktionen, immer sichtbar)**

- Scan-Zähler: „47 Personen haben diese Flasche gescannt“
- Durchschnitts-Rating: ★ 4.2 aus 12 Bewertungen
- _Analytics-Wert:_ Social Proof, Benchmarking über Chargen

**Tier 1 — Single-Tap (≤ 2 Sekunden)**

- VibeCheck: Ein Tap auf das passende Occasions-Emoji
- Vorschläge: 🎉 Party · 🍺 Chill · 🔎 Tasting · 🏠 Zuhause · 🍽️ Essen
- Sofortige Community-Verteilung erscheint nach Tap
- Muss **above the fold** liegen — kein Scrollen nötig
- _Analytics-Wert:_ Occasions-Daten — wann, wo, in welchem Kontext wird getrunken? Gold für Positionierung.

**Tier 2 — Quick Engagement (5–15 Sekunden)**

- Erscheint nach Tier-1-Tap mit kleiner Transition
- Alternativ: Sofort sichtbar für User, die direkt bewerten wollen (Skip-Tier-1-Option)
- Star-Rating (1–5) + Kronkorken sammeln
- Kronkorken-Collect als Belohnung für die Bewertung
- _Analytics-Wert:_ Kern-Qualitätsdaten, Trend-Tracking über Chargen

**Tier 3 — Deep Engagement (30–60 Sekunden, opt-in)**

- Erscheint erst **nach Rating-Submit** als Einladung
- Framing: _„Jetzt vergleich dich mit dem Brauer →“_ (kein generischer Titel)
- Beat the Brewer: User gibt Flavor-Einschätzung ein → Reveal: Brauer-Profil
- TasteSlider: Eingabe-Methode für den Flavor-Radar (nicht mehr separat)
- FlavorTags: Optionaler „Details hinzufügen“-Schritt nach Radar
- Reveal-Moment ist intrinsisch motivierend — User _will_ wissen wie nah er lag
- _Analytics-Wert:_ Flavor-Perception-Gap — wo weicht Konsumenten-Wahrnehmung vom Rezept-Intent ab?

**Tier 4 — Deferred Community (für treue Fans)**

- Brew Bounties: Motiviert zur Rückkehr (nicht für Erstbesuch)
- Stash: Langzeit-Engagement, dezenter Link statt prominenter Block
- Ganz unten, nach allen anderen Tiers
- _Analytics-Wert:_ Retention-Daten, Community-Engagement

---

### 11.1 — Tier-Architektur im Layout verankern

**Status:** ✅ Implementiert (Content-First-Variante)

**Betroffene Datei:** `app/b/[id]/page.tsx`

**Ursprüngliches Konzept:** Gamification (VibeCheck, Rating) direkt nach Stats above the fold.  
**Finale Entscheidung:** Content-First — Beschreibung, Werte, Details, Rezept und Bewertungen stehen vor der Gamification. Interaktions-Elemente folgen nach einem Trenner ("Mitmachen").

**Checkliste:**

- [x] Beschreibung direkt unter Name/Stil platzieren — wichtigste Produktinfo zuerst
- [x] Details/Inhaltsstoffe direkt nach Stats-Grid platzieren
- [x] Vollständiges-Rezept-Link nach Details
- [x] Bewertungsliste vor Gamification-Trenner
- [x] Trenner "Mitmachen" als klare visuelle Grenze zwischen Content und Interaktion
- [x] VibeCheck nach dem Trenner — erster Interaktionspunkt
- [x] Tier-2-Block (Rating/Cap) nach VibeCheck
- [x] Beat the Brewer: Wird nach Rating-Submit als CTA eingeblendet (State: `showBeatTheBrewer`)
- [x] TasteSlider und FlavorTagSelector nicht mehr als eigenständige Sektionen — Teil des Beat-the-Brewer-Flows
- [x] Stash-Button: aus prominenter Block-Position in dezenten Link-Button ("Merke dir diese Flasche")
- [x] Brew Bounties ans Ende der Seite (Tier 4)
- [x] Trenner "Community" zwischen Tier 3 und Tier 4
---

### 11.2 — VibeCheck: Sofort-Feedback implementieren

**Problem:** Der aktuelle VibeCheck zeigt nach dem Tap keine sofortige Community-Antwort. Der Feedback-Loop fehlt — das ist der Kern des Tier-1-Erlebnisses. Ohne ihn gibt es keinen „Moment of Delight“ und keine Motivation für Tier 2.

**Betroffene Datei:** `app/b/[id]/components/VibeCheck.tsx`

**Checkliste:**

- [x] Nach Tap auf Vibe-Option: Prozent-Verteilung aller Community-Votes sofort einblenden
- [x] Format: „🎉 Party — 64% · 🍺 Chill — 22% · 🔎 Tasting — 14%“
- [x] Eigene Auswahl hervorheben (fett + farbiger Hintergrund)
- [x] Animation: Balken erscheinen nach Tap mit kurzer Einblend-Animation (150ms)
- [x] State `alreadySubmitted = true`: nach Tap sofort gesetzt, kein zweites Abschicken möglich
- [x] Transition zu Tier-2-Block: `setShowRatingCTA(true)` nach VibeCheck-Tap auslösen
- [x] Offline-Fallback: Wenn communityVibes-Query fehlschlägt → „Danke für deinen Input!“ ohne Zahlen
- [x] Analytics: Prüfen ob `occasion_type` in `bottle_scans` oder eigener `vibe_checks`-Tabelle gespeichert wird

---

### 11.3 — Beat the Brewer: Post-Rating-Einbindung

**Problem:** Beat the Brewer ist aktuell statisch im Layout vergraben. Es soll als Continuation nach dem Rating erscheinen — der natürliche nächste Schritt nach „ich habe bewertet“.

**Betroffene Dateien:** `app/b/[id]/components/BeatTheBrewerGame.tsx`, `app/b/[id]/page.tsx`

**Checkliste:**

- [x] Nach erfolgreichem Rating-Submit: `setShowBeatTheBrewer(true)` auslösen
- [x] Beat-the-Brewer-Block animiert einblenden (slide-in oder fade-in, 300ms)
- [x] Framing: „Jetzt zeig, ob du den Geschmack genauso wahrnimmst wie der Brauer →“ (kein generischer Titel)
- [x] Wenn User kein Rating abgegeben hat: Beat the Brewer weiter unten verfügbar, aber nicht prominent
- [x] Reveal-Mechanismus: Erst User-Radar zeigen → Nach „Aufdecken“-Button: Brauer-Radar mit Overlay
- [x] Numerischer Score nach Reveal: „Du warst X% nah am Brauer“
- [x] Prüfen: Werden Flavor-Daten aus Beat-the-Brewer aktuell in der DB persistiert?
- [x] Falls nicht: Flavor-Perception-Gap pro Dimension in DB speichern (Analytics-Grundlage)

---

### 11.4 — TasteSlider / FlavorTag: Getrennte Verantwortlichkeiten

**Problem:** `TasteSlider` (quantitatives Profil: Bitterkeit 7.2/10, Süße 3.1/10) ist sowohl im `RateBrewModal` als auch als Basis für Beat the Brewer vorhanden — der User wird zweimal nach denselben quantitativen Werten gefragt.

**Wichtige Erkenntnis nach Codebase-Audit:** `FlavorTagSelector` (kategorische Tags: Zitrus, Karamell, Diacetyl) und `TasteSlider` (quantitative Achsen) sind **zwei völlig verschiedene Datensätze** mit unterschiedlichen Konsumenten:

| Datum                           | DB-Feld                      | Konsumenten                                                                   |
| ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| FlavorTags (kategorial)         | `ratings.flavor_tags TEXT[]` | Off-Flavor-Alarm, Daily Report, Anomalie-Detektor, Brew-Analytics (6 Dateien) |
| TasteSlider-Werte (quantitativ) | `flavor_profiles` (neu)      | Radar-Chart, Beat-the-Brewer-Vergleich                                        |

**Konzept-Entscheidung (präzisiert):**

- **Tier 2 (RateBrewModal): `TasteSlider` entfernen** — quantitative Werte kommen ausschließlich aus Beat the Brewer
- **Tier 2 (RateBrewModal): `FlavorTagSelector` BLEIBT** — schnelle kategorische Tags (5 Sek., 1 Reihe Chips). Nur so bleibt Off-Flavor-Alarm flächendeckend.
- **Tier 3 (Beat the Brewer):** TasteSlider → Radar-Vergleich mit Brauer-Profil — einzige Stelle für quantitative Slider-Werte

**Warum FlavorTags im Modal bleiben müssen:** 6 Dateien lesen `ratings.flavor_tags` für Off-Flavor-Erkennung. Wenn Tags nur noch via Beat the Brewer (~30-40% Conversion) erfasst werden, verliert der Off-Flavor-Alarm seine statistische Basis. Ein fehlerhafter Sud mit Diacetyl wird erst erkannt wenn >=3 Beat-the-Brewer-Spieler ihn gemeldet haben — statt >=3 aller Rater.

**Betroffene Dateien:** `app/b/[id]/components/TasteSlider.tsx`, `app/b/[id]/components/RateBrewModal.tsx`, `app/b/[id]/components/FlavorTagSelector.tsx`

**Checkliste:**

- [x] **`RateBrewModal.tsx`: TasteSlider-Sektion vollständig entfernen**
- [x] `RateBrewModal.tsx` danach: Sterne + Kommentar + `FlavorTagSelector` (kompakt, 1 Reihe, optional) + Submit
- [x] `FlavorTagSelector` im Modal: auf max. 1 Reihe Chips begrenzen, kein Scrollen, Label: Quick Impressions (optional)
- [x] `FlavorTagSelector` NICHT aus Modal entfernen — nur den TasteSlider
- [x] TasteSlider ist die einzige Eingabe-Methode für den Beat-the-Brewer Flavor-Radar
- [x] TasteSlider nicht mehr als eigenständige Sektion im Label-Seiten-Layout
- [ ] Testen: `ratings.flavor_tags` wird nach Rating-Submit korrekt in DB gespeichert
- [ ] Testen: TasteSlider-Werte erscheinen ausschließlich im Beat-the-Brewer-Flow
- [ ] Testen: Off-Flavor-Alarm erkennt Diacetyl-Tags nach diesem Umbau noch korrekt

---

### 11.6 — Flavor-Profil Datenmodell: Zwei Quellen, sauber getrennt

**Architektur-Klarstellung (nach Codebase-Audit):**

Es gibt DREI Flavor-Datenpfade im System — sie muessen sauber getrennt bleiben:

```
1. brews.flavor_profile (JSONB)       Brauer-definiertes Soll-Profil, via FlavorProfileEditor.
                                       Nicht von Nutzern erfasst. Rezeptseite: NICHT betroffen.

2. ratings.flavor_tags (TEXT[])        Kategorische Tags vom Rater: Zitrus, Karamell, Diacetyl.
                                       BLEIBT in RateBrewModal. 6 Dateien lesen dieses Feld
                                       (Off-Flavor-Alarm, Daily Report, Anomalie-Detektor, Analytics).
                                       Kein Schema-Bruch noetig.

3. flavor_profiles.* (neue Tabelle)   Quantitative Slider-Werte aus Beat the Brewer.
                                       bitterness, sweetness, body, roast, fruitiness (0.0-1.0).
                                       rating_id FK (nullable), user_id, brew_id, created_at.
```

**Betroffene Dateien:** `lib/database.types.ts`, `app/b/[id]/components/BeatTheBrewerGame.tsx`, `app/api/ratings/submit/route.ts`, `lib/actions/analytics-actions.ts`, `lib/rating-analytics.ts`, `app/team/[breweryId]/analytics/components/StyleBenchmarkCard.tsx`, `app/team/[breweryId]/analytics/components/BatchComparisonCard.tsx`, `supabase/migrations/`

**Checkliste:**

- [x] DB-Schema: `flavor_profiles`-Tabelle anlegen (Migration): `rating_id FK nullable`, `user_id`, `brew_id`, Slider-Achsen (0.0-1.0), `created_at`
- [x] `BeatTheBrewerGame.tsx`: Nach Slider-Input `upsert` in `flavor_profiles` mit `rating_id`
- [x] Beat the Brewer ohne Rating: `rating_id = NULL` (anonymes Profil fuer Aggregat-Analytics)
- [x] `/api/ratings/submit`: Slider-Felder aus Payload entfernen (werden nicht mehr vom Modal gesendet)
- [x] `/api/ratings/submit`: `flavor_tags` BLEIBT im Payload — aendert sich nicht
- [x] `database.types.ts`: `FlavorProfile`-Interface fuer neue Tabelle definieren
- [x] `rating-analytics.ts` und `analytics-actions.ts`: `flavor_tags`-Queries laufen WEITERHIN auf `ratings` — kein Bruch
- [x] `StyleBenchmarkCard`: Taste-Profile aus `flavor_profiles JOIN ratings` aggregieren (statt aus `ratings` direkt)
- [x] `BatchComparisonCard`: Selbe Umstellung wie StyleBenchmarkCard
- [ ] Testen: Rating ohne Beat-the-Brewer → `flavor_profiles`-Eintrag fehlt, `flavor_tags` in `ratings` vorhanden
- [ ] Testen: Rating + Beat-the-Brewer → `flavor_profiles.rating_id` korrekt verknuepft
- [ ] Testen: Off-Flavor-Alarm liest nach Umbau WEITERHIN korrekt aus `ratings.flavor_tags`

---

### 11.5 — Brew Bounties & Stash: Tier-4-Positionierung

**Problem:** Brew Bounties und Stash erscheinen gleichwertig mit Tier-1/2-Elementen. Sie sind Retention-Features, keine First-Visit-Features.

**Betroffene Dateien:** `app/b/[id]/components/BrewBounties.tsx`, `app/b/[id]/components/StashButton.tsx`

**Checkliste:**

- [x] Brew Bounties ans Ende der Seite verschieben (nach Beat the Brewer)
- [x] Stash-Button: aus prominentem Block in dezenten `<button>` mit Icon „Merke dir diese Flasche“
- [x] Stash und Bounties optional in einem ausklappbaren „Mehr entdecken“-Bereich begraben
- [x] Framing für Bounties: „Komm zurück wenn du mehr davon trinkst“ — Kontext für Retention setzen
- [ ] Testen: First-Visit-UX ohne Stash/Bounties-Ablenkung prüfen

---

## Phase 12 â€” Standortdaten: Echte Nutzerpositionen statt CDN-StÃ¤dte

**Problem:** Vercel's `geo`-Header liefert den Standort des CDN-Edge-Nodes (Frankfurt / MÃ¼nchen), nicht den echten Nutzerstandort. Die Analytics-Karte zeigt immer dieselben zwei Punkte â€” kein Mehrwert fÃ¼r Brauer.

**LÃ¶sung:** `navigator.geolocation` â†’ lat/lng â†’ serverseitiges Reverse-Geocoding via Nominatim (EU, DSGVO-konform) â†’ nur Stadt + Region + Land persistieren.

---

### 12.1 — GeoConsent-UI: Opt-in nach Star-Rating-Abgabe

**Konzept:** Der einzig verlässliche Signal-Moment, dass jemand das Bier **gerade trinkt**, ist eine erfolgreiche Star-Rating-Abgabe (Tier 2). Wer 1–5 Sterne vergibt, hat das Bier mit sehr hoher Wahrscheinlichkeit soeben konsumiert — und befindet sich noch am Trinkort. Außerdem entsteht nach dem Submit-Toast ein natürlicher Pause-Moment, in dem eine kurze Rückfrage nicht störend wirkt.

**Warum NICHT nach VibeCheck (Tier 1):**  
Ein VibeCheck-Tap (Emoji) ist impulsiv und dauert unter 1 Sekunde. Der User könnte sich noch im Supermarkt befinden oder die Flasche für später kaufen. Kein verlässliches Signal.

**Trigger-Bedingungen (alle müssen erfüllt sein):**

| #   | Bedingung                                           | Warum                                                |
| --- | --------------------------------------------------- | ---------------------------------------------------- |
| 1   | Star-Rating erfolgreich submittet                   | Klares Signal: Bier wurde getrunken                  |
| 2   | `localStorage('botllab_geo_asked')` nicht gesetzt   | Nie mehr als einmal fragen                           |
| 3   | User ist im Drinker-Modus (`app_mode !== 'brewer'`) | Brauer bewerten nicht ihre eigene Brew von unterwegs |
| 4   | ~2 Sekunden nach dem Bestätigungs-Toast             | Natürliche Pause, kein sofortiges Overlay            |

**Betroffene Dateien:** `app/b/[id]/components/GeoConsentPrompt.tsx` (neu), `app/b/[id]/components/RateBrewModal.tsx`, `app/b/[id]/page.tsx`

**Checkliste:**

- [ ] Neue Komponente `GeoConsentPrompt.tsx`: Bottom-Sheet (gleicher Stil wie RateBrewModal)
- [ ] Text: "Darf BotlLab deinen ungefähren Standort speichern? Hilft dem Brauer zu sehen, wo seine Biere getrunken werden. Kein GPS-Track, nur Stadt + Region."
- [ ] CTA: "Ja, gerne" / "Nein danke" — explizites Opt-in, kein Pre-Select, kein Dark Pattern
- [ ] `localStorage`-Flag setzen: `botllab_geo_asked = 'granted' | 'denied'` — danach nie mehr zeigen
- [ ] `RateBrewModal.tsx`: Nach erfolgreichem Submit-Callback → `onRatingComplete()`-Prop aufrufen
- [ ] `/b/[id]/page.tsx`: `onRatingComplete` → nach 2s Verzögerung GeoConsentPrompt zeigen (wenn alle Bedingungen erfüllt)
- [ ] Bedingung `app_mode !== 'brewer'` aus AuthContext prüfen bevor Prompt gezeigt wird
- [ ] Testen: Prompt erscheint erst nach Star-Rating, nicht nach VibeCheck oder Seitenaufruf
- [ ] Testen: Zweiter Besuch → Prompt nie wieder (Flag in localStorage)
- [ ] Testen: Brewer-Modus → kein Prompt, auch nicht nach Rating
- [ ] Testen: "Nein danke" → kein `navigator.geolocation`-Aufruf, kein erneuter Prompt

---

### 12.2 â€” Reverse-Geocode Server Route

**Konzept:** Client sendet nur lat/lng an interne API. Server fragt Nominatim ab â€” lat/lng verlassen nie den eigenen Server.

**Betroffene Dateien:** `app/api/geo/resolve/route.ts` (neu), `lib/actions/geo-actions.ts` (neu)

**Checkliste:**

- [ ] `app/api/geo/resolve/route.ts`: POST-Route, akzeptiert `{ lat, lng }`
- [ ] Server-seitiger Fetch zu `nominatim.openstreetmap.org/reverse` mit korrektem `User-Agent` Header
- [ ] Response: `{ city, region, country }` â€” lat/lng **nie** persistent speichern oder loggen
- [ ] Rate-Limit: Max 1 Request/Sekunde (Nominatim-TOS), via `api-rate-limit.ts`
- [ ] Fehlerfall: Server-Error â†’ Client fÃ¤llt auf Vercel-Geo-Header zurÃ¼ck
- [ ] `lib/actions/geo-actions.ts`: Client-Helper `resolveUserLocation()` der Browser-Geolocation-API aufruft + POST zur Route sendet
- [ ] Testen: Route gibt korrekte Stadt zurÃ¼ck fÃ¼r bekannte Koordinaten (z.B. Berlin)

---

### 12.3 â€” Standort in Scan-Tracking persistieren

**Konzept:** `bottle_scans`-Tabelle bekommt neue optionale Felder. Bestehende Scans bleiben NULL.

**Betroffene Dateien:** `app/b/[id]/page.tsx`, `app/api/scans/track/route.ts`, `supabase/migrations/`

**Checkliste:**

- [ ] Migration: `ALTER TABLE bottle_scans ADD COLUMN IF NOT EXISTS detected_city TEXT, ADD COLUMN IF NOT EXISTS detected_region TEXT, ADD COLUMN IF NOT EXISTS geo_consent_given BOOLEAN DEFAULT FALSE`
- [ ] `/api/scans/track`: Optionale Felder `city`, `region`, `country`, `geo_consent_given` im Body akzeptieren
- [ ] `/b/[id]/page.tsx`: Nach `resolveUserLocation()` â†’ `trackBottleScan()` mit Geo-Daten aufrufen
- [ ] Fallback: Wenn kein Consent â†’ Vercel `geo`-Header verwenden (bestehende Logik bleibt erhalten)
- [ ] Brauer-Analytics: Standort-Karte auf `detected_city` umstellen (statt Vercel-Geo)
- [ ] Testen: Scan mit Consent â†’ `detected_city` korrekt in DB gespeichert
- [ ] Testen: Scan ohne Consent â†’ `geo_consent_given = false`, Vercel-Geo als Fallback aktiv
- [ ] Testen: Mehrfach-Scans selber Flasche â†’ Geo-Daten unabhÃ¤ngig pro Scan-Eintrag

---

### 12.4 â€” DSGVO-Dokumentation & Datenschutz-Update

**Konzept:** Geo-Consent erfordert DatenschutzerklÃ¤rung-Update und interne Dokumentation.

**Betroffene Dateien:** `app/privacy/page.tsx`, `documentation/`

**Checkliste:**

- [ ] DatenschutzerklÃ¤rung: Abschnitt zu Standortdaten hinzufÃ¼gen (freiwillig, zweckgebunden, widerrufbar)
- [ ] Dokumentieren: Nominatim als Auftragsverarbeiter (EU, OpenStreetMap Foundation)
- [ ] Opt-out-MÃ¶glichkeit: In Account-Einstellungen "Standort-Daten lÃ¶schen" ermÃ¶glichen
- [ ] Interne Doku: `documentation/completed/GEO_CONSENT.md` nach Implementierung anlegen

---

## Phase 13 — Conversion & Direct Sales

**Ziel:** Nutzer, die das Bier mögen, direkt zum Shop der Brauerei führen.

### 13.1 — Shop-Button Integration

**Konzept:** Wenn eine Brauerei eine Website hinterlegt hat, wird diese am Ende der Seite als Shopping-Möglichkeit angeboten.

**Betroffene Dateien:** `app/b/[id]/components/ShopLink.tsx` (neu), `app/b/[id]/page.tsx`

**Checkliste:**

- [ ] Prüfen: Kann der Brauer im Dashboard (`/team/.../settings`) seine Website bearbeiten? Falls nein → Input-Feld ergänzen
- [ ] `ShopLink.tsx` erstellen:
  - Zeigt Button "🌐 Website / Shop von [Brauerei] besuchen"
  - Icon: External Link oder Shopping Cart
  - Position: Ganz unten, nach Stash/Bounties, vor Footer
- [ ] `page.tsx`: `ShopLink` einbinden (nur wenn `brewery.website` vorhanden)
- [ ] Analytics: Klick-Tracking auf den Button (`track('outbound_click', { target: 'shop' })`)

## ✅ Gesamt-Checkliste (Index)

| Phase    | Aufgabe                        | Anzahl Tasks |
| -------- | ------------------------------ | ------------ | -------------- |
| **1.1**  | ipify eliminieren              | 12           |
| **1.2**  | Wasserfall parallelisieren     | 6            |
| **1.3**  | Skeleton Loading               | 7            |
| **1.4**  | confetti lazy import           | 3            |
| **2.1**  | Neue Seitenstruktur            | 6            |
| **2.2**  | RatingCTABlock                 | 7            |
| **2.3**  | Bewertungen inline             | 4            |
| **3.1**  | Toast-System                   | 9            |
| **3.2**  | Cap-Flow vereinheitlichen      | 7            |
| **3.3**  | IP-Guard entfernen             | 4            |
| **3.4**  | Auto-Claim Cleanup             | 3            |
| **4.1**  | Flaschennummer anzeigen        | 4            |
| **4.2**  | Batch/Session-Info             | 5            |
| **4.3**  | Scan-Zähler                    | 5            |
| **5.1**  | Type Safety                    | 10           |
| **5.2**  | 'use client' ergänzen          | 4            |
| **5.3**  | IngredientList extrahieren     | 6            |
| **5.4**  | console.log Cleanup            | 13           |
| **5.5**  | Dead Code entfernen            | 5            |
| **5.6**  | Volumen-Schätzung vereinfachen | 3            |
| **6.1**  | View Counter Race Condition    | 3            |
| **6.2**  | BrewBounties Fehlerhandling    | 3            |
| **6.3**  | StashButton Fehlerhandling     | 3            |
| **6.4**  | BeatTheBrewer Memory Leak      | 3            |
| **6.5**  | Error-Boundary anlegen         | 5            |
| **7.1**  | Modal ARIA & Focus             | 6            |
| **7.2**  | TasteSlider ARIA               | 3            |
| **7.3**  | FlavorTagSelector ARIA         | 2            |
| **7.4**  | RadarChart SVG-Semantik        | 3            |
| **7.5**  | Stern-Rating Labels            | 2            |
| **8.1**  | Collection-Link korrigieren    | 4            |
| **8.2**  | Pre-Login Intent               | 4            |
| **9.1**  | Hero-Bild next/image           | 6            |
| **9.2**  | Logo & Avatare next/image      | 2            |
| **9.3**  | Blur-Placeholder               | 3            |
| **10.1** | ipify DSGVO-Abschluss          | 4            |
| **10.2** | localStorage Duplikat-Check    | 4            |
| **11.1** | Tier-Architektur Layout        | 8            |
| **11.2** | VibeCheck Sofort-Feedback      | 8            |
| **11.3** | Beat-the-Brewer Post-Rating    | 8            |
| **11.4** | TasteSlider/FlavorTag Flow     | 10           |
| **11.5** | Brew Bounties & Stash Tier 4   | 5            |
| **11.6** | Flavor-Profil Datenmodell      | 8            |
| **12.1** | GeoConsent-UI                  | 11           |
| **12.2** | Reverse-Geocode Server Route   | 7            |
| **12.3** | Standort in Scan-Tracking      | 8            |
| **12.4** | DSGVO-Dokumentation            | 4            |
| **13.1** | Shop-Button Integration        | 4            |
|          |                                | **GESAMT**   | **~257 Tasks** |

---

## 📁 Betroffene Dateien (Vollständige Liste)

| Datei                                                               | Phasen                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `app/b/[id]/page.tsx`                                               | 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.4, 8.1, 8.2, 9.1, 9.2, **11.1, 11.3** |
| `app/b/[id]/components/RateBrewModal.tsx`                           | 3.1, 3.3, 5.1, 5.2, 7.1, 7.5, **11.4**                                                                        |
| `app/b/[id]/components/TasteSlider.tsx`                             | 5.2, 7.2, **11.4**                                                                                            |
| `app/b/[id]/components/FlavorTagSelector.tsx`                       | 5.2, 5.5, 7.3, **11.4**                                                                                       |
| `app/b/[id]/components/RadarChart.tsx`                              | 5.5, 7.4                                                                                                      |
| `app/b/[id]/components/BeatTheBrewerGame.tsx`                       | 5.5, 6.4, **11.3**, **11.6**                                                                                  |
| `app/b/[id]/components/BrewBounties.tsx`                            | 6.2, **11.5**                                                                                                 |
| `app/b/[id]/components/StashButton.tsx`                             | 6.3, **11.5**                                                                                                 |
| `app/b/[id]/components/VibeCheck.tsx`                               | 5.5, **11.2**                                                                                                 |
| `app/b/[id]/components/DrinkingConfirmationPrompt.tsx`              | 5.5, 7.1                                                                                                      |
| `app/b/[id]/components/BottleLabelSkeleton.tsx`                     | 1.3 **(neu anlegen)**                                                                                         |
| `app/b/[id]/components/RatingCTABlock.tsx`                          | 2.2 **(neu anlegen)**                                                                                         |
| `app/b/[id]/components/IngredientList.tsx`                          | 5.3 **(neu anlegen)**                                                                                         |
| `app/b/[id]/loading.tsx`                                            | 1.3 **(neu anlegen)**                                                                                         |
| `app/b/[id]/error.tsx`                                              | 6.5 **(neu anlegen)**                                                                                         |
| `app/api/ratings/check/route.ts`                                    | 1.1, 10.2                                                                                                     |
| `app/api/ratings/submit/route.ts`                                   | 1.1, **11.6**                                                                                                 |
| `app/api/bottle-caps/claim/route.ts`                                | 3.2                                                                                                           |
| `lib/actions/analytics-actions.ts`                                  | 6.1 (`incrementProfileViews`)                                                                                 |
| `app/context/AuthContext.tsx`                                       | 8.1, 8.2 (app_mode für Drinker/Brewer)                                                                        |
| `next.config.ts`                                                    | 9.1 (Image-Domains)                                                                                           |
| `lib/database.types.ts`                                             | 5.1, **11.6**                                                                                                 |
| `app/b/[id]/components/GeoConsentPrompt.tsx`                        | **12.1** (neu anlegen)                                                                                        |
| `app/api/geo/resolve/route.ts`                                      | **12.2** (neu anlegen)                                                                                        |
| `app/team/[breweryId]/analytics/components/StyleBenchmarkCard.tsx`  | **11.6** (flavor_profiles als Datenquelle)                                                                    |
| `app/team/[breweryId]/analytics/components/BatchComparisonCard.tsx` | **11.6** (tasteProfile aus flavor_profiles)                                                                   |
| `lib/actions/analytics-actions.ts`                                  | 1.1, **11.6** (Off-Flavor bleibt auf ratings.flavor_tags)                                                     |
| `lib/rating-analytics.ts`                                           | **11.6** (flavor_tags-Query auf ratings unveraendert)                                                         |
| `lib/actions/geo-actions.ts`                                        | **12.2**, **12.3** (neu anlegen)                                                                              |
| `app/b/[id]/components/ShopLink.tsx`                                | **13.1** (neu anlegen)                                                                                        |

---

## 🚀 Empfohlene Umsetzungsreihenfolge

```
Phase 1.1 → 1.2 → 1.3 → 1.4   [Performance — höchste Prio, alles andere baut darauf auf]
Phase 5.2 → 5.4                 [Quick Wins — unabhängig, parallel möglich]
Phase 3.1 → 3.2 → 3.3 → 3.4   [Mobile UX — nach 1.1, da IP-State verschwindet]
Phase 2.1 → 2.2 → 2.3          [Content-Hierarchie — nach Phase 3 (Toast-System braucht CTA-Block)]
Phase 11.1 → 11.2 → 11.3       [Gamification Core — nach Phase 2 (Layout steht)]
Phase 11.4 → 11.6               [Gamification Detail + DB-Modell — nach 11.3]
Phase 11.5                       [Gamification Retention — nach 11.4]
Phase 12.1 → 12.2 → 12.3 → 12.4 [Standortdaten — nach Phase 11.1 (RateBrewModal onRatingComplete-Callback)]
Phase 13.1                       [Conversion — jederzeit möglich]
Phase 4.1 → 4.2 → 4.3          [Features — unabhängig, jederzeit möglich]
Phase 8.1 → 8.2                 [Zwei-Welten — nach 1.1 (sauberer Code-Stand)]
Phase 5.1 → 5.3 → 5.5 → 5.6   [Type Safety & Dead Code — nach Phase 2+3+11 (Code stabilisiert)]
Phase 6.5 → 6.1 → 6.2-6.4      [Fehlerhandling — jederzeit möglich]
Phase 9.1 → 9.2 → 9.3          [Images — unabhängig]
Phase 7.1 → 7.2-7.5             [Accessibility — zum Schluss (stabil auf Code aufsetzen)]
Phase 10.1 → 10.2               [DSGVO-Abschluss — nach Phase 1.1 bestätigt]
```

**Kritische Abhängigkeiten:**

- Phase 3.3 setzt Phase 1.1 voraus (`userIp` State muss weg)
- Phase 8.1 setzt Phase 1.1 voraus (bereinigter State)
- Phase 10.2 setzt Phase 1.1 voraus (localStorage als IP-Ersatz)
- Phase 11.1 setzt Phase 2.1 voraus (Tier-Architektur braucht neues Layout-Gerüst)
- Phase 11.3 setzt Phase 3.2 voraus (Rating-Submit ist Trigger — einheitlicher Cap/Rating-Flow muss stehen)
- Phase 11.4 setzt Phase 11.3 voraus (TasteSlider/FlavorTag werden in Beat-the-Brewer integriert)
- Phase 11.6 setzt Phase 11.4 voraus (DB-Modell erst bereinigen wenn UI umgebaut ist)
- Phase 12.1 setzt Phase 11.1 voraus (RateBrewModal muss `onRatingComplete`-Callback haben)
- Phase 12.3 setzt Phase 12.2 voraus (Server-Route muss stehen bevor Scan-Tracking sie aufruft)
- Phase 7.1–7.5 setzt Phase 2+3+11 voraus (finale Modal- und Gamification-Struktur muss stehen)
