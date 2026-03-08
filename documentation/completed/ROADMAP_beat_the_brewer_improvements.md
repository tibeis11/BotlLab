# Roadmap: Beat the Brewer — Bugs, UX & Architektur

Basierend auf einer vollständigen Code-Review von `BeatTheBrewerGame.tsx`, `RadarChart.tsx`, `FlavorGameSlider`, `VibeCheck.tsx`, `beat-the-brewer-actions.ts`, `flavor-profile-config.ts`, `rating-analytics.ts`, `aggregate-analytics/index.ts`, `brew/[id]/page.tsx` und `team/.../analytics/brew/[brewId]/page.tsx`.

---

## Legende

| Status | Bedeutung |
|--------|-----------|
| ✅ | Erledigt |
| 🔲 | Offen |
| 🔴 | Kritisch — sofort beheben |
| 🟠 | Hoch — vor nächstem Release |
| 🟡 | Mittel — nächste Iteration |
| 🔵 | Niedrig / Refactoring |

---

## Phase 1 — Kritische Architektur: Anonyme Abgaben (BTB + VibeCheck)

> **Kernprinzip:** Spielen ist kostenlos und ohne Login möglich. Daten sind wertvoll — auch ohne Account. Wer Punkte und Leaderboard will, muss sich registrieren. Wer sich nach dem Spielen registriert, bekommt seine Abgabe rückwirkend zugewiesen.

### 1.0 — ✅ Voraussetzung: BTB-Sichtbarkeit von Rating-Gate entkoppeln 🔴

**Problem:** In `app/b/[id]/page.tsx` war BTB hinter einer harten Bedingung gesperrt:
```tsx
{brew.flavor_profile && (hasAlreadyRated || showBeatTheBrewer) && (
```
Anonyme Gäste die noch nie ge-rated haben, sahen BTB schlicht nie — die Komponente renderte gar nicht. Alle Server-Action-Fixes aus Phase 1.1 wären ohne diese Änderung wirkungslos.

**Fix (direkt implementiert):**
```tsx
// Neu: Bedingung auf brew.flavor_profile reduziert
{brew.flavor_profile && (
```
BTB ist nun für **alle** Besucher sichtbar sobald ein Flavor Profile gesetzt ist. `showBeatTheBrewer` steuert weiterhin den Einblende-Effekt nach Rating — nicht mehr die Sichtbarkeit selbst.

### 1.1 — Anonyme Beat the Brewer Abgabe

**Problem:** `submitBeatTheBrewer` wirft sofort einen Error wenn kein User eingeloggt ist. Nicht-eingeloggte User können nicht spielen.

**Lösung:**

1. **Server Action refactorn** — `submitBeatTheBrewer` in zwei Pfade aufteilen:
   - `user` vorhanden → bestehender Flow (Score + IQ + `tasting_score_events`)
   - kein `user` → anonyme Abgabe in neue Tabelle `anonymous_game_sessions` mit einem `session_token` (UUID, 7 Tage TTL)

2. **Neue DB-Tabelle `anonymous_game_sessions` (Gesichert):**
   ```sql
   CREATE TABLE anonymous_game_sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     session_token TEXT UNIQUE NOT NULL,
     event_type TEXT NOT NULL,          -- 'beat_the_brewer' | 'vibe_check'
     brew_id UUID REFERENCES brews(id),
     payload JSONB NOT NULL,            -- slider_values / vibes
     match_score NUMERIC,
     match_percent INT,
     claimed_by_user_id UUID,
     ip_hash TEXT NOT NULL,             -- SHA256(IP + User-Agent) für Limitierung
     flavor_profile_id UUID REFERENCES flavor_profiles(id) ON DELETE SET NULL, -- ← NEU (Korrektur 1)
     created_at TIMESTAMPTZ DEFAULT NOW(),
     expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
   );

   -- Sicherheits-Policies (RLS)
   ALTER TABLE anonymous_game_sessions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow inserts for anon" ON anonymous_game_sessions FOR INSERT WITH CHECK (
     jsonb_typeof(payload) = 'object'
   );
   -- Nur Service Role darf lesen & updaten (Claiming-Flow):
   CREATE POLICY "Service role only" ON anonymous_game_sessions
     FOR ALL USING (auth.role() = 'service_role');
   
   -- Verhindert Spam: Nur 1 anonymer Record pro Brew & IP
   CREATE UNIQUE INDEX idx_anon_sessions_limit ON anonymous_game_sessions (brew_id, ip_hash) 
   WHERE claimed_by_user_id IS NULL AND event_type = 'beat_the_brewer';
   ```

   **⚠️ Kritische Voraussetzung — `flavor_profiles` muss nullable `user_id` + `ip_hash` erhalten:**
   ```sql
   -- user_id ist bereits nullable (aus bestehendem Schema), aber ip_hash fehlt noch.
   -- Der Partial Index verhindert IP-Spam bei anonymen Abgaben:
   ALTER TABLE flavor_profiles ADD COLUMN IF NOT EXISTS ip_hash TEXT;
   CREATE UNIQUE INDEX idx_flavor_profiles_anon_ip 
     ON flavor_profiles (brew_id, ip_hash) WHERE user_id IS NULL;
   ```
   
   **Diese Migration muss VOR `anonymous_game_sessions` laufen** (FK-Referenz).

3. **Anonymer Schreibpfad — Kernpunkt (Korrektur 1):**

   Der anonyme Submit muss in **zwei** Tabellen schreiben — nicht nur `anonymous_game_sessions`. Der Grund: `getBrewFlavorProfile()` in `rating-analytics.ts` liest **ausschließlich** aus `flavor_profiles`. Ohne diesen Schritt sind anonyme Abgaben auf der Rezeptseite und im Brauer-Dashboard vollständig unsichtbar — der gesamte Wert anonymer Daten würde verpuffen.

   ```ts
   // Server Action — anonymer Pfad:
   // Schritt 1: flavor_profiles befüllen (user_id = NULL, ip_hash für Spam-Schutz)
   const { data: fp } = await supabase
     .from('flavor_profiles')
     .insert({ brew_id, user_id: null, ip_hash,
               sweetness, bitterness, body, roast, fruitiness })
     .select('id').single();

   // Schritt 2: anonymous_game_sessions mit FK auf flavor_profiles
   await supabase.from('anonymous_game_sessions').insert({
     brew_id, session_token, event_type: 'beat_the_brewer',
     payload: playerProfile, match_score, match_percent,
     ip_hash, flavor_profile_id: fp.id
   });
   ```

4. **`session_token` im Client speichern** — `localStorage.setItem('btb_pending_token', token)` direkt nach anonymer Abgabe. Token zusätzlich als URL-Parameter `?claim_token=...` an den Registrierungs-Link anhängen.

5. **Reveal-Phase für Gäste:** Zeigt das Ergebnis ohne Punkte-Badge. Stattdessen ein CTA:
   > „Dein Score: **73%** — Registriere dich um Punkte zu sammeln und dich mit anderen zu messen!"

### 1.2 — Post-Registrierung Attribution

**Problem:** User registriert sich via QR-Code-Flow — seine soeben erspielte Abgabe muss sicher seinem neuen Account zugewiesen werden.

**Lösung:**

1. Nach Registrierung: Hook liest `localStorage.getItem('btb_pending_token')` oder URL-Param aus.
2. **Atomarer Server-Call (WICHTIG):** Ein einziger RPC/Transaction-Block, der alles kaskadiert — verhindert Race Conditions und inkonsistente Teilzustände:
   ```sql
   -- Schritt A: Session atomar claimen (verhindert Double-Claim durch AND-Bedingung)
   UPDATE anonymous_game_sessions 
   SET claimed_by_user_id = new_user_id 
   WHERE session_token = $1 AND claimed_by_user_id IS NULL 
   RETURNING *, flavor_profile_id;
   ```
3. **`flavor_profiles.user_id` patchen (Korrektur 2):**
   ```ts
   // Nach erfolgreichem Claim: flavor_profiles-Eintrag dem neuen User zuweisen.
   // Resultat: Die Abgabe erscheint in der User-History, und der ip_hash-Block
   // für dieses Brew wird aufgehoben (neuer Scan nach Registrierung möglich).
   if (claimedSession.flavor_profile_id) {
     await supabase.from('flavor_profiles')
       .update({ user_id: newUserId })
       .eq('id', claimedSession.flavor_profile_id)
       .is('user_id', null); // Safety: nur updaten wenn noch anonym
   }
   ```
4. Bei Erfolg: Score in `tasting_score_events` eintragen, IQ-Punkte vergeben.
5. `localStorage.removeItem('btb_pending_token')` nach erfolgreichem Claim.

### 1.3 — Anonyme VibeCheck Abgabe

- Gleicher IP-Hash Ansatz wie bei BTB (`CREATE UNIQUE INDEX idx_vibe_limit ON anonymous_game_sessions (brew_id, ip_hash) WHERE event_type = 'vibe_check'`).
- Das garantiert, dass beim QR-Code-Scan pro Smartphone-Session nur exakt einmal das Community-Vibe-Profil beeinflusst wird.

### 1.4 — Analytics & Garbage Collection (Korrektur 3)

**Wichtige Klarstellung zur Datenpipeline — das war ein Fehler in der ursprünglichen Roadmap:**

`getBrewFlavorProfile()` in `rating-analytics.ts` wird **on-demand** aufgerufen (nicht über `aggregate-analytics`). Das Community-Geschmacksprofil auf der Rezeptseite und im Brauer-Dashboard ist durch Korrektur 1 automatisch korrekt — `aggregate-analytics` muss dafür **nicht** angepasst werden.

`aggregate-analytics` ist für Zeitreihen-Metriken zuständig (daily counts, Kohorten usw.). Hier ist der neue Auftrag:

**Neue Felder in `analytics_brewery_daily`:**
```sql
ALTER TABLE analytics_brewery_daily 
  ADD COLUMN IF NOT EXISTS btb_plays_total INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS btb_plays_anonymous INT DEFAULT 0;
```

**Neuer Block in `aggregate-analytics/index.ts` (brewery-Loop):**
```ts
// Voraussetzung: brewIdsForThisBrewery aus dem bereits vorhandenen brews-Fetch ableiten
const { count: btbAuthenticated } = await supabase
  .from('tasting_score_events')
  .select('id', { count: 'exact', head: true })
  .eq('event_type', 'beat_the_brewer')
  .in('brew_id', brewIdsForThisBrewery)
  .gte('created_at', `${dateStr}T00:00:00.000`)
  .lt('created_at', `${dateStr}T23:59:59.999`);

const { count: btbAnonymous } = await supabase
  .from('anonymous_game_sessions')
  .select('id', { count: 'exact', head: true })
  .eq('event_type', 'beat_the_brewer')
  .in('brew_id', brewIdsForThisBrewery)
  .gte('created_at', `${dateStr}T00:00:00.000`)
  .lt('created_at', `${dateStr}T23:59:59.999`);

// In analytics_brewery_daily.upsert ergänzen:
// btb_plays_total: (btbAuthenticated || 0) + (btbAnonymous || 0)
// btb_plays_anonymous: btbAnonymous || 0
```

Damit können Brauer im Dashboard sehen: „Heute 47 Scans — 12 BTB-Plays (9 eingeloggt, 3 anonym)"

**Dead-Data Cleanup via pg_cron:**
```sql
-- Täglich abgelaufene, ungeclaimte Sessions löschen
SELECT cron.schedule('cleanup-anon-sessions', '0 3 * * *', $$
  DELETE FROM anonymous_game_sessions 
  WHERE expires_at < NOW() AND claimed_by_user_id IS NULL;
$$);

-- Verwaiste anonyme flavor_profiles (ohne Session-Referenz, älter als 8 Tage)
SELECT cron.schedule('cleanup-anon-flavor-profiles', '0 4 * * *', $$
  DELETE FROM flavor_profiles 
  WHERE user_id IS NULL 
    AND created_at < NOW() - INTERVAL '8 days'
    AND id NOT IN (SELECT flavor_profile_id FROM anonymous_game_sessions WHERE flavor_profile_id IS NOT NULL);
$$);
```

---

## Phase 2 — Kritische Bugs (sofort beheben)

### 2.1 — Slider-Track-Farbe komplett kaputt 🔴

**Datei:** `BeatTheBrewerGame.tsx` — `FlavorGameSlider`

**Bug:** `dim.color` ist ein Tailwind-Klassenstring (`'text-amber-400'`), wird aber als CSS-`backgroundColor`-Value verwendet. Browser ignoriert das — alle Slider-Tracks sind farblos.

**Fix:** `dim.color` → `dim.hexColor`

```tsx
// Vorher:
style={{ backgroundColor: dim.color, opacity: 0.6 }}

// Nachher:
style={{ backgroundColor: dim.hexColor, opacity: 0.6 }}
```

Gleicher Fix für den Thumb:
```tsx
// Vorher:
style={{ backgroundColor: dim.color, borderColor: 'rgba(255,255,255,0.3)' }}

// Nachher:
style={{ backgroundColor: dim.hexColor, borderColor: 'rgba(255,255,255,0.3)' }}
```

### 2.2 — Slider-Thumb clippt aus Container 🔴

**Bug:** `left: calc(${percent}% - 10px)` — bei 0% liegt der Thumb 10px außerhalb links, bei 100% 10px zu weit rechts.

**Fix:** Korrekte Formel für range-input Thumb-Offset:
```tsx
style={{ left: `calc(${percent}% * (1 - 20px/100%) + calc(10px * (1 - ${percent}/100 * 2)))` }}
```

Einfacher Ansatz der funktioniert:
```tsx
const thumbOffset = (percent / 100) * (containerWidth - 20); // containerWidth via useRef
```

Oder pragmatisch mit padding auf dem Track-Container:
```tsx
// Track-Container bekommt px-2.5, Thumb-Formel bleibt einfach
```

### 2.3 — Gast-User UX: Falscher Vertrag kommuniziert 🔴

**Bug:** Text sagt „Du musst angemeldet sein, um Punkte zu erhalten" — impliziert Spielen ohne Login sei möglich. In Wirklichkeit verursacht Submit einen Server-Error.

**Fix (sobald Phase 1 implementiert):** Text wird korrekt, weil es dann tatsächlich so funktioniert.  
**Sofort-Fix bis dahin:** Submit-Button für Gäste durch einen „Anmelden um zu spielen"-Button ersetzen.

### 2.4 — Kein Guard wenn Brew kein Flavor-Profil hat 🔴

**Bug:** Der BTB-Block wird gerendert, obwohl `flavor_profile` nicht gesetzt ist. Fehler kommt erst nach Submit.

**Fix in `page.tsx`:** BTB-Komponente nur rendern wenn `data.flavor_profile` valide ist:
```tsx
{isValidFlavorProfile(data.brew?.flavor_profile) && (
  <BeatTheBrewerGame ... />
)}
```
Wenn kein Profil: optionaler Hinweis-Block „Der Brauer hat noch kein Geschmacksprofil hinterlegt."

### 2.5 — Race Condition bei tasting_iq Update 🔴

**Datei:** `beat-the-brewer-actions.ts`

**Bug:** Read-then-write (nicht atomar) — bei schnellen parallelen Requests kann IQ doppelt vergeben werden.

**Fix:** Atomic SQL increment statt Read+Write.
**WICHTIG:** Diese Funktion darf nicht von außen (Client) manipulierbar sein!

```sql
CREATE OR REPLACE FUNCTION increment_tasting_iq(user_id UUID, delta INT)
RETURNS TABLE(new_tasting_iq INT) AS $$
  UPDATE profiles SET tasting_iq = tasting_iq + delta WHERE id = user_id
  RETURNING tasting_iq;
$$ LANGUAGE SQL
SECURITY DEFINER; -- Läuft mit Admin-Rechten, damit wir RLS nicht aufbrechen müssen

-- Client-Zugriff verbieten, nur Server-Actions (via Service Role) dürfen das:
REVOKE ALL ON FUNCTION increment_tasting_iq FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_tasting_iq FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_tasting_iq TO service_role;
```

---

## Phase 3 — UX-Verbesserungen

### 3.1 — Already-Played-State: Ergebnisse nachladen 🟠

**Problem:** User der bereits gespielt hat sieht nur „Du hast bereits gespielt. Probiere ein anderes!". Sein historisches Ergebnis ist nirgendwo abrufbar.

**Fix:**
1. Neue Server Action `getBrewBTBResult(brewId): BeatTheBrewerResult | null` — lädt den gespeicherten Eintrag aus `tasting_score_events` inkl. `metadata.slider_values` und `metadata.brewer_values`
2. In `page.tsx`: falls `alreadyPlayed`, wird das historische Result mitgegeben
3. `BeatTheBrewerGame` rendert bei `alreadyPlayed && historicalResult` direkt die Reveal-Phase mit dem alten Score
4. Kleiner „gespielt am [Datum]"-Hinweis im Header

### 3.2 — Mini-Radar im Spielmodus entfernen 🟠

**Problem:** Der Live-Radar ohne Brewer-Profil ist nicht informativ, nimmt 200px Höhe weg und schiebt den Submit-Button weit nach unten.

**Fix:**
- Mini-Radar komplett aus der Playing-Phase entfernen
- Stattdessen: kleiner visueller Indikator wie z.B. 5 Farbpunkte (je Dimension eine Dot) die sich proportional zur Slider-Position füllen — kompakt, 24px hoch, vermittelt denselben Überblick
- Radar nur in der Reveal-Phase zeigen (weniger Verwirrung, mehr Impact)

### 3.3 — Slider-Defaults: Unberührte Slider visuell markieren 🟠

**Problem:** Alle Slider starten bei 50%. Ein User der nicht interagiert hat gibt ein valides Profil ab. Keine Unterscheidung zwischen „bewusst auf 50%" und „nie angefasst".

**Fix:** `FlavorGameSlider` bekommt ein `touched`-Flag:
```tsx
const [touched, setTouched] = useState(false);
```
- Unberührt: Thumb grau, Track grau, Prozent-Badge zeigt „—" statt „50%"
- Touched: Thumb bekommt `dim.hexColor`, Track wird farbig
- Submit disabled solange mind. 0 Slider `touched === false`? Oder zumindest ein Hinweis: „Tipp: Stelle alle Regler ein um ein genaues Ergebnis zu get."

### 3.4 — Friend-Challenge: Kein Layout-Shift beim Nachladen 🟠

**Problem:** `FriendHeadToHead`-Block erscheint nach einem asynchronen Request ohne Übergang — teleportiert ins Layout.

**Fix:**
```tsx
// Skeleton während acceptFriendChallenge läuft
const [challengeLoading, setChallengeLoading] = useState(!!challengeToken);

// Nach dem reveal: Skeleton zeigen, dann einblenden
{challengeToken && (
  challengeLoading
    ? <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse h-40" />
    : acceptedChallenge && <FriendHeadToHead ... />
)}
```

### 3.5 — Error-State: Klarer Retry-Flow 🟠

**Problem:** Nach Server-Fehler werden alle 5 Slider wieder gezeigt — User weiß nicht ob er alles neu eingeben muss.

**Fix:**
- Error-State in eigene Phase: `'error'`
- Error-Phase zeigt: Fehlermeldung (sanitiert, keine rohen Server-Messages), einen „Erneut versuchen"-Button der zurück zu `'playing'` (mit den gespeicherten Slider-Werten!) führt
- Server-Fehler-Messages sanitieren: intern loggen, extern nur generische Meldungen zeigen

### 3.6 — Community-Radar im BTB-Reveal 🟠

**Problem:** Nach dem Reveal sieht der Spieler seinen Score und den Brauer-Vergleich — aber niemals das aggregierte Community-Profil. Dabei ist genau der Reveal-Moment die emotionale Spitze des Erlebnisses und der ideale Kontext: „So haben die letzten 47 Spieler dieses Bier eingeschätzt." Diese Chart existiert nur auf `/brew/[id]` im Bewertungs-Tab — für die meisten QR-Scanner unerreichbar.

**Fix:** Im Reveal-State von `BeatTheBrewerGame` den `communityProfile`-Wert aus `getBrewFlavorProfile()` laden und als dritten Overlay im Radar anzeigen:
```tsx
// Im Reveal-Block, nach dem Submit:
const communityProfile = await getBrewFlavorProfile(brewId);
// RadarChart bekommt ein drittes optionales Profil:
<RadarChart
  playerProfile={result.playerValues}
  brewerProfile={result.brewerProfile}
  communityProfile={communityProfile}  // ← neu, als gestrichelter Ring
  size={280}
/>
```
Legende: Cyan = Spieler, Amber = Brauer-Ziel, Gestrichelt/Grau = Community-Durchschnitt.

`communityProfile` ist erst ab `MIN_COMMUNITY_PROFILES = 3` verfügbar — falls `null`, wird der Ring einfach nicht gerendert.

### 3.7 — Tasting IQ Kontext im Reveal-Block 🟠

**Problem:** Nach dem Spiel bekommt der User Tasting IQ Punkte — aber er sieht sie im QR-Scan-Flow nie als Kontext. Eine einzige Zeile würde den Registrierungs-CTA von „Punkte sammeln" zu „Status erlangen" upgraden — ein massiver Unterschied in der Nutzer-Motivation.

**Fix:** Im `BeatTheBrewerResult` Return-Wert wird `newTastingIQ` bereits mitgeliefert. Im Reveal-Block hinzufügen:
```tsx
{/* Für eingeloggte User: */}
<div className="text-center text-xs text-text-muted mt-3">
  Dein Tasting IQ: <span className="font-bold text-brand">{result.newTastingIQ}</span>
  {/* Rang aus getTastingIQ() nachladen oder zum Submit mitzugeben */}
  {rank && <span className="text-text-disabled"> — Top {Math.round((rank / totalPlayers) * 100)}% aller Taster</span>}
</div>

{/* Für anonyme Gäste: */}
<div className="text-center text-xs text-text-muted mt-3">
  Mit einem Account würdest du für diesen Score <span className="font-bold text-brand">+{result.pointsAwarded} Tasting IQ</span> erhalten.
</div>
```

---

## Phase 4 — Radar Chart & Visualisierungen

### 4.1 — RadarChart: Hardcoded Farben durch CSS-Custom-Properties ersetzen 🟡

**Problem:** SVG verwendet `rgba(24,24,27,0.8)` für Background, `rgb(6,182,212)` für Player und `rgb(245,158,11)` für Brewer — hardcoded, am Token-System vorbei.

**Fix:** CSS-Custom-Properties via `style`-Prop:
```tsx
// Neue Props oder über computed CSS vars
const playerColor = 'var(--color-brand)';    // aus dem Token
const brewerColor = 'var(--color-rating)';   // amber/gold Token
const bgColor = 'var(--color-surface)';
```

Oder: Farb-Props zu `RadarChart` hinzufügen, Default=aktuell, in `FLAVOR_DIMENSIONS` `hexColor` verwenden für Dimension-Dots.

### 4.2 — SVG-Labels: Clipping bei kleinen Größen 🟡

**Problem:** Bei `size=200` liegt die Süße-Beschriftung bei y≈6px — fast außerhalb des SVG. Bereits im Screenshot sichtbar.

**Fix:**
1. `labelR` erhöhen: `size * 0.49` statt `size * 0.47`
2. Labels mit `fontSize` skalieren: `Math.max(9, size * 0.055)` statt festes `11`
3. Background-Rect hinter Labels (white/transparent) für bessere Lesbarkeit

### 4.3 — Dimension-Breakdown: Dual-Bar zeigt falsches Bild 🟠

**Problem:** Player- und Brewer-Bar liegen absolut übereinander (beide bei `left: 0`). Brewer-Bar wird zuletzt gerendert und deckt Player-Bar ab wenn `brewer < player`. Das Ergebnis täuscht den User.

**Fix:** Bars nebeneinander oder gestapelt ersetzen durch ein klareres Format:
```
Süße:    Player ████░░░ 73%     Brewer ██████░ 85%    Δ12%  ⚠
Körper:  Player ████░░░ 68%     Brewer ████░░░ 65%    Δ3%   ✓
```

Oder: eine einzige Composite-Bar pro Dimension, bei der Position-Marker für Player (Cyan) und Brewer (Amber) angezeigt werden — ähnlich einer Skala mit zwei Zeigern.

### 4.4 — Diff-Badge: Konsistentes Format 🟡

**Problem:** Nah am Ziel = Icon (`<Check size={10} />`), weit weg = Text (`Δ23%`) — inkonsistenter Mix.

**Fix:** Immer Text-Format:
```
✓ ±3%      (grün, nah)
△ ±18%     (rot, weit)
```

### 4.5 — Perception Gap KPI auf der Analytics-Seite 🟠

**Problem:** Das Analytics-Dashboard zeigt den Community-vs-Brauer-Radar visuell, aber keine Headline-Kennzahl. Dabei ist die Antwort auf „wie gut wird mein Bier so wahrgenommen wie ich es geplant habe?" die wertvollste einzige Metrik der gesamten Seite — und alle Daten dafür liegen bereits vor.

- `brews.flavor_profile` = Brauer-Intention
- `AVG(flavor_profiles WHERE brew_id = X)` = Community-Wahrnehmung
- Differenz = Perception Gap Score

**Fix:** Neue Metric Card auf der Brew-Analytics-Seite (`team/.../analytics/brew/[brewId]/page.tsx`):

Berechnung auf dem Server:
```ts
// Bereits vorhanden: brewerProfile + communityProfile
let perceptionAccuracy: number | null = null;
if (brewerProfile && communityProfile) {
  const dims: (keyof typeof brewerProfile)[] = ['sweetness', 'bitterness', 'body', 'roast', 'fruitiness'];
  const avgDiff = dims.reduce((sum, d) => sum + Math.abs(brewerProfile[d] - communityProfile[d]), 0) / dims.length;
  perceptionAccuracy = Math.round((1 - avgDiff) * 100); // 0–100%
}
```

UI:
```tsx
<AnalyticsMetricCard
  title="Wahrnehmungsgenauigkeit"
  value={perceptionAccuracy !== null ? `${perceptionAccuracy}%` : '-'}
  subValue={perceptionAccuracy !== null
    ? perceptionAccuracy >= 80 ? "Dein Bier wird sehr genau so wahrgenommen wie geplant"
    : perceptionAccuracy >= 60 ? "Leichte Abweichung zwischen Absicht und Wahrnehmung"
    : "Große Abweichung — prüfe das Radar für Details"
    : "Noch nicht genug Profil-Daten"}
  icon={<Target size={16} />}
/>
```

Nur anzeigen wenn sowohl `brewerProfile` als auch `communityProfile` vorhanden (ab `MIN_COMMUNITY_PROFILES = 3` BTB-Plays).

---

## Phase 5 — Spiellogik & Architektur

### 5.1 — ✅ Brauer darf eigenes Bier nicht spielen 🟡

**Problem:** Ein Brauer der sein `flavor_profile` selbst eingestellt hat, kann es exakt abtippen. Kein Guard vorhanden.

**Fix:** In `page.tsx` das `app_mode`-Attribut des aktuellen Users prüfen. Wenn `app_mode === 'brewer'` UND der User der Inhaber der Brewery ist die das Bier gebraut hat: BTB-Block nicht rendern oder disablen mit Hinweis.

In der Server Action als zusätzlichen Schutz:
```ts
// Prüfe ob User Inhaber der Brauerei ist
const { data: ownership } = await supabase
  .from('breweries').select('owner_id')
  .eq('id', brew.brewery_id).single();
if (ownership?.owner_id === user.id) {
  throw new Error('Als Brauer kannst du dein eigenes Bier nicht spielen.');
}
```

### 5.2 — ✅ Scoring-Kalibrierung: Mindest-Spread einführen 🔵

**Problem:** Zufälliges 50/50/50/50/50-Profil gegen ein beliebiges Brewer-Profil ergibt ~40-55%. Der Spread zwischen „zufällig geraten" und „wirklich gut" ist zu klein.

**Überlegung:** Zwei Optionen:
- **Option A:** Formel auf quadratische Bestrafung für Abweichungen umstellen (große Abweichungen stärker bestrafen)
- **Option B:** Linearen Minimum-Score einführen: Score = max(0, euclidean_result - 0.2) → renormalisiert auf 0-100 → zufällige Abgaben landen bei ~30%, gute bei 90%+

Empfehlung: Option B, da einfach zu implementieren und sofort wirksam. Braucht kein DB-Migration, nur Änderung in `calculateMatchScore` in `flavor-profile-config.ts`.

### 5.3 — ✅ Tooltip/Info für Dimensionen 🟡

**Problem:** `FLAVOR_DIMENSIONS.description` wird nirgendwo im UI gezeigt. Neue User wissen nicht was „Körper" oder „Röstmalz" bedeutet.

**Fix:** Info-Icon (Lucide `Info size={12}`) neben jedem Dimension-Label in `FlavorGameSlider`. Tooltip oder kleines Expand-Panel beim Tap/Hover zeigt `dim.description`.

```tsx
<label className="text-sm font-bold text-text-primary flex items-center gap-2">
  <span style={{ backgroundColor: dim.hexColor }} ... />
  {dim.label}
  <Popover content={dim.description}>
    <Info size={12} className="text-text-disabled cursor-help" />
  </Popover>
</label>
```

### 5.4 — ✅ FlavorGameSlider & TasteSlider zusammenführen 🔵

**Problem:** Zwei fast-identische Custom-Range-Slider-Implementierungen mit unterschiedlichen Bugs. `TasteSlider` hat das `isSet`-Pattern (besser), `FlavorGameSlider` hat die `touched`-Logik noch nicht. Beide haben den Thumb-Clip-Bug.

**Fix:** Einen einzigen `UniversalSlider`-Primitive bauen, der beide Use Cases abdeckt:
```tsx
<UniversalSlider
  value={value}        // 0–1 | undefined
  onChange={onChange}
  color={hexColor}     // für Track/Thumb
  minLabel="Trocken"
  maxLabel="Süß"
  showIsSet            // aktiviert das isSet-Visual aus TasteSlider
/>
```

---

## Zusammenfassung & Reihenfolge

```
Phase 1 (Anonym/Attribution):  ~3-4 Tage Implementierung
  └── 1.0 BTB-Gate entkoppeln              ✅ DONE (5 Minuten, direkt in page.tsx)
  └── 1.1 Anonyme BTB Abgabe + DB-Migration ✅ DONE
  └── 1.2 Post-Registrierung Attribution    ✅ DONE (claimAnonymousSession)
  └── 1.3 Anonyme VibeCheck Abgabe          ✅ DONE
  └── 1.4 Analytics-Integration + pg_cron Cleanup ✅ DONE

Phase 2 (Critical Bugs):        ~2 Stunden
  └── 2.1 Track-Farbe Fix (dim.hexColor)   ✅ DONE
  └── 2.2 Thumb-Clip Fix                   ✅ DONE (UniversalSlider)
  └── 2.3 Gast-User Kommunikation          ✅ DONE (korrekt nach Phase 1)
  └── 2.4 flavor_profile Guard in page.tsx ✅ DONE (isValidFlavorProfile)
  └── 2.5 Race Condition tasting_iq        ✅ DONE (increment_tasting_iq RPC)

Phase 3 (UX):                   ~2 Tage
  └── 3.1 Already-Played nachladen         ✅ DONE (historicalResult + getBrewBTBResult)
  └── 3.2 Mini-Radar entfernen             ✅ DONE (Dimension-Dots)
  └── 3.3 Slider touched-State             ✅ DONE
  └── 3.4 Friend-Challenge Skeleton        ✅ DONE (challengeLoading)
  └── 3.5 Error-State Retry-Flow           ✅ DONE ('error' phase)
  └── 3.6 Community-Radar im BTB-Reveal    ✅ DONE (communityProfile)
  └── 3.7 Tasting IQ Kontext im Reveal     ✅ DONE (pointsAwarded + newTastingIQ)

Phase 4 (Visualisierungen):     ~1-2 Tage
  └── 4.1 RadarChart Token-Farben          ✅ DONE (var(--color-brand/rating/surface))
  └── 4.2 SVG-Label-Clipping               ✅ DONE (viewBox padding + labelR)
  └── 4.3 Dual-Bar Fix                     ✅ DONE (separate gestapelte Bars)
  └── 4.4 Diff-Badge konsistentes Format   ✅ DONE (✓ ±X% / △ ±X%)
  └── 4.5 Perception Gap KPI (Analytics)   ✅ DONE (perceptionAccuracy)

Phase 5 (Logik/Langfristig):   ~2 Tage
  └── 5.1 isOwner-Guard              ✅ DONE
  └── 5.2 Scoring-Kalibrierung       ✅ DONE
  └── 5.3 Dimension-Tooltips         ✅ DONE
  └── 5.4 Slider-Refactoring         ✅ DONE
```

---

## Abhängigkeiten & Migrationen

| Migration | Zweck | Priorität |
|-----------|-------|-----------|
| `flavor_profiles`: `ip_hash` Spalte + Partial UNIQUE Index | **Voraussetzung für Korrektur 1** — muss zuerst laufen | 🔴 Hoch |
| `anonymous_game_sessions` Tabelle + RLS + `flavor_profile_id` FK | Phase 1.1/1.3 | 🔴 Hoch |
| `increment_tasting_iq` DB-Funktion (SECURITY DEFINER, REVOKE PUBLIC) | Phase 2.5 — Race Condition Fix | 🔴 Hoch |
| `analytics_brewery_daily`: Felder `btb_plays_total`, `btb_plays_anonymous` | Phase 1.4 | 🟠 Mittel |
| `aggregate-analytics` Edge Function: BTB-Zähler-Block | Phase 1.4 | 🟠 Mittel |
| `pg_cron`: Cleanup-Jobs für Sessions + verwaiste flavor_profiles | Phase 1.4 | 🟠 Mittel |

**Reihenfolge erzwungen durch Constraints:**
1. `flavor_profiles` Migration (`ip_hash` + Index) → läuft zuerst.
2. `anonymous_game_sessions` Migration (FK auf `flavor_profiles`) → läuft danach.
3. `increment_tasting_iq` Funktion → muss deployed sein bevor Server Action angepasst wird.
4. `analytics_brewery_daily` Schema-Update → bevor `aggregate-analytics` deployed wird.
5. `pg_cron` Jobs → nach `anonymous_game_sessions`-Tabelle aktivierbar.

---

*Erstellt: 8. März 2026 | Aktualisiert: 8. März 2026 nach erweiterter Code-Review von `rating-analytics.ts`, `aggregate-analytics/index.ts`, `brew/[id]/page.tsx`, `b/[id]/page.tsx`, `team/.../analytics/brew/[brewId]/page.tsx` und `BrewEditor.tsx`. Drei Architektur-Korrekturen eingearbeitet: (1) anonyme Abgaben schreiben direkt in `flavor_profiles`; (2) Claiming patcht `flavor_profiles.user_id`; (3) `aggregate-analytics` erhält BTB-Spielzähler. Vier System-Vernetzungs-Lücken identifiziert und adressiert: (0) BTB-Gate direkt in `page.tsx` gefixt ✅; (3.6) Community-Radar im Reveal; (3.7) Tasting IQ Kontext im Reveal; (4.5) Perception Gap KPI auf Analytics-Seite.*
