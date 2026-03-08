# Roadmap: QR-Verified Gate — Physischer Flaschenzugang als Voraussetzung

**Status:** Implementiert ✅  
**Erstellt:** 2026-03-08  
**Priorität:** Hoch  

---

## Legende

| Status | Bedeutung |
|--------|-----------|
| ✅ | Erledigt |
| 🔲 | Offen |
| 🔴 | Kritisch — sofort beheben |
| 🟠 | Hoch — vor nächstem Release |
| 🟡 | Mittel — nächste Iteration |
| 🔵 | Niedrig / Nice-to-have |

---

## Kernprinzip

> **Bewertungen, BTB und VibeCheck setzen voraus, dass die Person die Flasche physisch in der Hand hält.**  
> Der Nachweis erfolgt durch Scannen des QR-Codes auf dem Etikett. Wer die URL direkt aufruft, bekommt die Seite zu sehen — aber keine interaktiven Features.

---

## Designentscheidung: Pre-Signed Token direkt im QR-Code (Option A)

Der ursprüngliche Ansatz mit einer separaten `/q/`-Route wurde verworfen. Grund: `/q/` ist im QR-Code-Inhalt für technisch versierte Nutzer sofort als "QR-Tracking-Route" erkennbar — das gibt unnötig Einblick in die Systemarchitektur.

**Gewählte Lösung:** Der HMAC-Token wird **beim Drucken des Etiketts** in die QR-Code-URL eingebettet. Der QR-Code zeigt direkt auf `/b/`:

```
botllab.de/b/ABC123?_t=a3f8k2m9
```

- `_t` ist ein permanenter, bottle-spezifischer HMAC-Token — **kein Timestamp**, Etiketten laufen nie ab
- Die URL wird nach der Verifikation per `history.replaceState` sofort bereinigt — im Browser sieht man nur `botllab.de/b/ABC123`
- Tracking (`scan_source = 'qr_code'`) erfolgt auf `/b/` wenn `_t` vorhanden und gültig ist
- Token ist 8 Bytes / 16 Hex-Zeichen kurz → QR-Code bleibt kompakt (+16 Zeichen gegenüber bisher)

---

## Bereits implementiert ✅

- **Analytics-Tipp** im `ScanSourceBreakdownCard` entfernt.
- **Phase 0.1:** `/q/[id]` auf einfachen Fallback-Redirect vereinfacht (302 → `/b/[id]`).
- **Phase 0.2:** `lib/qr-token.ts` — HMAC-Token-Generierung (server-only).
- **Phase 0.2:** `lib/actions/qr-token-actions.ts` — Server Actions `verifyQrToken()` + `generateQrTokensForBottles()`.
- **Phase 0.2:** Label-Generatoren aktualisiert (`label-printer.ts`, `label-renderer.ts`, `pdf-generator-legacy.ts`).
- **Phase 0.2:** `inventory/page.tsx` — Pre-generiert Tokens via Server Action, alle 3 QR-URL-Stellen nutzen `/b/?_t=`.
- **Phase 1.2:** `useQrVerification` Hook erstellt — prüft `_t`-Param, verifiziert via Server Action, cached in localStorage (24h), bereinigt URL.
- **Phase 1.2:** Hook in `/b/[id]/page.tsx` integriert — `isQrVerified` steuert Feature-Sichtbarkeit.
- **Phase 2.1:** BTB hinter QR-Gate — zeigt Lock-Karte wenn nicht gescannt.
- **Phase 2.2:** VibeCheck hinter QR-Gate — zeigt Lock-Karte wenn nicht gescannt.
- **Phase 2.3:** `qr_verified`-Flag auf Ratings korrekt gesetzt (nutzt `isQrVerified` statt `true`).
- **Phase 2.4:** RatingCTA zeigt Hinweis für nicht-QR-verifizierte Nutzer.
- **Phase 3.1:** Late Reveal — `flavor_profile` nicht mehr im initialen Brew-Query auf `/b/[id]`. Server Action `checkBrewHasFlavorProfile()` gibt nur Boolean zurück.
- **Phase 3.2:** Nonce-basierter Anti-Replay — `btb_used_nonces`-Tabelle mit `(nonce, bottle_id, brew_id)` Unique Constraint. QR-Token wird beim BTB-Submit als Nonce mitgeschickt und verbraucht. Bei Neubefüllung (neues Bier) funktioniert das gleiche Token erneut.
- **Env:** `QR_TOKEN_SECRET` in `.env.local` generiert.

---

## Phase 0 — Umbau: `/q/` Route rückbauen 🔴

### 0.1 — `/q/[id]` auf einfachen Fallback-Redirect vereinfachen

Die Route `app/q/[id]/route.ts` wird vereinfacht: nur noch ein stiller Redirect auf `/b/[id]` ohne Token-Generierung und ohne Tracking. So landen alte gedruckte `/q/`-Etiketten nicht auf einer 404, sind aber auch nicht QR-verifiziert (`isQrVerified = false`, Features gesperrt).

### 0.2 — Label-Generatoren: `/q/` → `/b/?_t=<token>`

Alle fünf Stellen werden so umgestellt, dass beim Drucken ein permanenter HMAC-Token eingebettet wird:

```ts
// Neue server-seitige Hilfsfunktion: lib/qr-token.ts
import { createHmac } from 'crypto';

export function generateQrToken(bottleId: string): string {
  const secret = process.env.QR_TOKEN_SECRET!;
  return createHmac('sha256', secret)
    .update(bottleId)
    .digest('hex')
    .slice(0, 16); // 16 Hex-Zeichen = 8 Byte, kurz genug für kompakte QR-Codes
}

// Verwendung in den Generatoren (server-seitig):
const token = generateQrToken(bottle.id);
const qrUrl = `${baseUrl}/b/${short_code || id}?_t=${token}`;
```

**Wichtig:** `generateQrToken` darf nur server-seitig aufgerufen werden (Server Actions, Route Handlers, `api/`-Endpunkte). Das Secret verlässt den Server nie.

**Betroffene Dateien:**
- `lib/label-printer.ts`
- `lib/label-renderer.ts`
- `lib/pdf-generator-legacy.ts`
- `app/team/[breweryId]/inventory/page.tsx` (3 Stellen: `qr_code`-Variable, ZIP-Export, QR-Modal)

---

## Phase 1 — Token-Infrastruktur 🟠

### 1.1 — Token-Verifikations-Server-Action 🔴

**Ziel:** Client-seitige Verifikation ohne das Secret zu exponieren.

```ts
// lib/actions/qr-token-actions.ts
'use server'
import { createHmac, timingSafeEqual } from 'crypto';

export async function verifyQrToken(
  token: string,
  bottleId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const secret = process.env.QR_TOKEN_SECRET;
    if (!secret) return { valid: false, reason: 'misconfigured' };

    // Erwarteten Token server-seitig neu berechnen
    const expected = createHmac('sha256', secret)
      .update(bottleId)
      .digest('hex')
      .slice(0, 16);

    // Längenmismatch vor timingSafeEqual prüfen (würde sonst werfen)
    if (token.length !== expected.length) {
      return { valid: false, reason: 'invalid_signature' };
    }

    // Timing-safe Vergleich verhindert Timing-Angriffe
    const match = timingSafeEqual(
      Buffer.from(token,    'utf8'),
      Buffer.from(expected, 'utf8')
    );
    return match ? { valid: true } : { valid: false, reason: 'invalid_signature' };

  } catch {
    return { valid: false, reason: 'parse_error' };
  }
}
```

**Sicherheitshinweise:**
- `QR_TOKEN_SECRET` verlässt **nie** den Server
- Server Action gibt nur `{ valid: boolean }` zurück — kein Secret-Material
- `timingSafeEqual` verhindert Timing-Angriffe
- Token ist bottle-spezifisch — ein Token für Flasche A schaltet Flasche B nie frei

---

### 1.2 — `useQrVerification` Hook auf `/b/[id]` 🔴

**Ziel:** Einmaliger Ablauf auf der Client-Seite, der Token prüft, in localStorage speichert, und die URL bereinigt.

```ts
// lib/hooks/useQrVerification.ts
// Gibt zurück: { isQrVerified: boolean, isLoading: boolean }
```

**Ablauf:**

```
Seite lädt
│
├─ URL hat ?_t=<token>?
│   ├─ Ja → Server Action verifyQrToken() aufrufen
│   │         ├─ valid: true  → localStorage.setItem('qr_verified_<bottleId>', expires_at)
│   │         │                  history.replaceState('/b/<id>') → URL clean
│   │         │                  isQrVerified = true
│   │         └─ valid: false → isQrVerified = false (Token gefälscht oder abgelaufen)
│   │
│   └─ Nein → localStorage['qr_verified_<bottleId>'] prüfen
│               ├─ vorhanden + nicht abgelaufen → isQrVerified = true (Return Visit)
│               └─ fehlt oder abgelaufen        → isQrVerified = false
```

**localStorage-Format:**
```json
{
  "qr_verified_<bottleId>": 1741650000000
}
```
Der Wert ist ein Unix-Timestamp (ms) — `expires_at = now + 24h`. Vor jedem Read wird ablaufgeprüft und bei Ablauf der Key gelöscht.

**24h TTL:** Man scannt ein Bier mittags, bewertet es abends — das ist der Core-Use-Case. Eine Woche wäre zu großzügig (hat man die Flasche noch?). 1h wäre zu kurz.

**Tracking-Integration:** Wenn der Token gültig ist, wird `scan_source = 'qr_code'` explizit an `trackBottleScan()` übergeben — ersetzt die bisherige „kein Referrer"-Heuristik für neue Etiketten.

---

## Phase 2 — Feature Gates 🟠

### 2.1 — BTB hinter QR-Gate 🟠

**Datei:** `app/b/[id]/components/BeatTheBrewerGame.tsx`

```tsx
// Prop übergeben
<BeatTheBrewerGame isQrVerified={isQrVerified} ... />

// Im Component:
if (!isQrVerified) {
  return (
    <div className="...">
      <QrCode className="..." />
      <p>Scanne den QR-Code auf der Flasche um Beat the Brewer zu spielen.</p>
    </div>
  );
}
```

---

### 2.2 — VibeCheck hinter QR-Gate 🟠

**Datei:** `app/b/[id]/components/VibeCheck.tsx`

Gleiche Logik wie 2.1 — Prop `isQrVerified` übergeben, Fallback-UI wenn nicht verifiziert.

---

### 2.3 — `qr_verified` Flag auf Ratings korrekt setzen 🟠

**Aktuelles Problem:** In `page.tsx` ist `qr_verified: true` **immer** hardcoded — egal woher der User kommt.

**Fix:**
```tsx
// In handleRatingSubmit (page.tsx)
qr_verified: isQrVerified, // aus useQrVerification Hook
```

Das Flag auf der Bewertung wird damit zum echten Signal — Brauer sehen in der Analytics-Ansicht ob eine Bewertung von einem echten Scan stammt.

**Wichtig:** Ratings sind weiterhin ohne QR möglich (z. B. über `/brew/[id]` Seiten). Nur auf `/b/[id]` ist `qr_verified` nun korrekt.

---

### 2.4 — RatingCTABlock: Hinweis wenn nicht QR-verifiziert 🟡

Falls jemand `/b/[id]` ohne QR-Scan aufruft (z. B. geteilter Link), bekommt er statt des Rating-Formulars einen Hinweis:

```
"Diese Bewertungsseite ist für QR-Scans vom Flaschenetikett gedacht.
 Zum Rezept: [→ Rezeptseite öffnen]"
```

Damit wird klar kommuniziert, dass `/b/` nicht zum Teilen gedacht ist, ohne den User hart auszusperren.

---

## Phase 3 — BTB Anti-Cheat: Late Reveal 🟡

### 3.1 — Brauer-Flavor-Daten erst nach Submit zurückgeben

**Aktuelles Problem:** Beim Laden der Seite werden alle Brauer-Daten (Flavor Profile, Zielwerte) an den Client übertragen. Wer die Network-Tab öffnet, sieht die Antworten bevor er spielt.

**Lösung — Late Reveal:**

1. `/b/[id]` lädt das Flavor Profile **nicht** mehr als Teil der initialen Daten
2. `submitBeatTheBrewer()` nimmt die User-Antworten entgegen, berechnet den Score **server-seitig** und gibt erst im Response die Brauer-Werte zurück
3. Client zeigt Ergebnis an — Brauer-Daten waren nie vorab abrufbar

```ts
// Neuer Return-Typ von submitBeatTheBrewer:
{
  success: true,
  matchPercent: 73,
  userValues: { ... },    // Was der User eingegeben hat
  brewerValues: { ... },  // Erst JETZT übertragen
  feedback: "..."
}
```

**Nebeneffekt:** Die Seite lädt minimal schneller (ein selects weniger beim Page-Load).

---

### 3.2 — Token-gebundener Submit (Nonce) 🔵

**Ziel:** Verhindert Replay-Attacks — jemand klaut einen gültigen QR-Token und spielt BTB unbegrenzt oft.

Der QR-Token wird beim BTB-Submit mitgeschickt. Server prüft:
1. Token ist gültig (Phase 1.2)
2. Token wurde noch **nicht** für BTB auf dieser Flasche verwendet (`anonymous_game_sessions` oder `tasting_score_events` als Nonce-Tabelle)

**Abhängigkeit:** Baut auf Phase 1 auf, kann separat nachgezogen werden.

---

## Umgebungsvariablen

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `QR_TOKEN_SECRET` | Min. 32 Zeichen, zufällig generiert. Nie im Frontend exponiert. | ✅ |

Zur Generierung: `openssl rand -base64 32`

---

## Rückwärtskompatibilität

| Szenario | Verhalten |
|---|---|
| Alte QR-Codes (zeigen auf `/b/` ohne `_t`) | Token fehlt → `isQrVerified = false` → Features gesperrt. Neue Etiketten drucken. |
| Alte QR-Codes (zeigen auf `/q/`) | Fallback-Redirect auf `/b/` ohne Token → `isQrVerified = false`. |
| Neue QR-Codes (`/b/?_t=...`) | Token gültig → `isQrVerified = true`, URL sofort bereinigt. |
| Gefälschter / manipulierter Token | Server Action gibt `valid: false` → `isQrVerified = false`. |
| Shared Link ohne `_t` (geteilte URL) | `isQrVerified = false` → Hinweis zur Rezeptseite, Features gesperrt. |
| Return Visit innerhalb 24h | localStorage-Hit → `isQrVerified = true`, kein erneuter Scan nötig. |
| Return Visit nach >24h | `isQrVerified = false` → erneuter Scan nötig. |

---

## Implementierungs-Reihenfolge

```
Phase 0.1  /q/[id] auf einfachen Fallback-Redirect vereinfachen
Phase 0.2  lib/qr-token.ts erstellen + Label-Generatoren umstellen
Phase 1.1  verifyQrToken() Server Action
Phase 1.2  useQrVerification Hook (inkl. Tracking-Integration)
Phase 2.3  qr_verified Flag Fix (Rating-Submit)
Phase 2.1  BTB Gate
Phase 2.2  VibeCheck Gate
Phase 2.4  RatingCTA Hinweis
Phase 3.1  BTB Late Reveal
Phase 3.2  Nonce-Schutz (optional)
```
