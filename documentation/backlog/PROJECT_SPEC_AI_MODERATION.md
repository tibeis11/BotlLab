# Projekt-Spezifikation: AI-Gestützte Content Moderation

## Status
**BACKLOG** (Aktivierung bei ~500+ Bild-Uploads/Monat oder nach Launch der Forum-Bild-Funktion)

> **Update Feb 2026:** Scope erweitert. Ursprünglich nur Labels/Kronkorken. Durch den geplanten Forum-Bild-Upload (Roadmap Phase 1.5) und die wachsende Text-Content-Menge ist eine zweistufige AI-Moderation — Bilder via Google Cloud Vision, Text via Google Gemini Flash — die logische Skalierungsstufe über der bestehenden manuellen Moderation-Pipeline.

## Zusammenfassung

Dieses Dokument beschreibt die Integration von AI-Moderation als **Beschleunigungsschicht** über der bestehenden `pending → review → approve/reject` Pipeline in `lib/actions/moderation-actions.ts`. AI ersetzt den menschlichen Admin **nicht** — sie sortiert klare Fälle vorab aus, sodass der Admin nur noch Grenzfälle sieht.

**Zwei Bereiche:**
1. **Bild-Moderation** (Google Cloud Vision SafeSearch) — für Brew-Labels, Brauerei-Logos und Forum-Bilder (`forum_post_images`)
2. **Text-Moderation** (Google Gemini Flash) — für Forum-Posts und Thread-Titel, als Ergänzung zum bestehenden `profanity.ts`-Filter

**Aktivierungs-Schwelle:**
- Bild-Moderation: Ab ~500 Uploads/Monat macht manuelles Review jeden Upload unwirtschaftlich
- Text-Moderation: Ab ~200 Forum-Posts/Tag oder bei erstem juristische Vorfall durch User-Content

---

## Teil 1: Bild-Moderation (Google Cloud Vision SafeSearch)

### Architektur

### Ablauf (integriert in bestehende Pipeline)

```
User lädt Bild hoch (Brew-Label, Brauerei-Logo, Forum-Bild)
       │
       ▼
Server Action (z. B. /api/forum/upload-image oder bestehender Label-Upload)
       │
       ├─ detectSafeSearch(imageBuffer) ──── [NEU: AI-Vorprüfung]
       │        │
       │        ├─ SAFE (VERY_UNLIKELY / UNLIKELY)
       │        │    └─ moderation_status = 'approved' direkt
       │        │       (kein Admin-Review nötig)
       │        │
       │        ├─ UNSICHER (POSSIBLE)
       │        │    └─ moderation_status = 'pending'
       │        │       → erscheint in Admin ModerationView wie bisher
       │        │
       │        └─ UNSAFE (LIKELY / VERY_LIKELY)
       │             └─ Upload wird abgebrochen
       │                moderation_status = 'rejected' direkt
       │                User-Benachrichtigung via sendImageRejectedEmail()
       │                optionaler Sicherheits-Log-Eintrag
       │
       └─ Bild wird in Supabase Storage gespeichert (bei SAFE/PENDING)
```

**Wichtig:** Das ist eine Erweiterung der bestehenden `moderation-actions.ts` Pipeline — kein Ersatz. `POSSIBLE`-Bilder landen weiterhin in der `ModerationView.tsx` zur menschlichen Prüfung.

### Tech Stack
- **Provider:** Google Cloud Platform (GCP)
- **Service:** Cloud Vision API (Feature: SafeSearch Detection)
- **Bibliothek:** `@google-cloud/vision` (Node.js)
- **Integration:** `lib/moderation-ai.ts` (neue Datei), aufgerufen aus Bild-Upload-Server-Actions

---

## Implementierung (Schritt-für-Schritt)

### 1. Google Cloud Setup
1. Projekt in der [Google Cloud Console](https://console.cloud.google.com/) erstellen.
2. **Cloud Vision API** im Marketplace aktivieren.
3. **Service Account** erstellen (Rolle: "Cloud Vision API User").
4. **JSON-Key** herunterladen und sicher speichern.

### 2. Environment Variables

```env
# Google Cloud Vision (Bild-Moderation)
GOOGLE_PROJECT_ID="botllab-vision-..."
GOOGLE_CLIENT_EMAIL="uploader@botllab-vision-....iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
# Hinweis: Vercel hat Probleme mit Linebreaks in ENV-Vars → JSON.parse() Workaround nötig (siehe Code)
```

### 3. Code-Logik (`lib/moderation-ai.ts` — neue Datei)

```typescript
// lib/moderation-ai.ts
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Vercel-Fix
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

export type ImageModerationResult =
  | 'auto_approved'   // VERY_UNLIKELY / UNLIKELY → kein Human-Review nötig
  | 'needs_review'    // POSSIBLE → in Admin-Queue
  | 'auto_rejected';  // LIKELY / VERY_LIKELY → sofort ablehnen

const AUTO_REJECT  = ['LIKELY', 'VERY_LIKELY'];
const AUTO_APPROVE = ['VERY_UNLIKELY', 'UNLIKELY'];

export async function checkImageSafety(imageBuffer: Buffer): Promise<ImageModerationResult> {
  try {
    const [result] = await client.safeSearchDetection(imageBuffer);
    const d = result.safeSearchAnnotation;

    // Sofort ablehnen bei eindeutig problematischem Content
    if (
      AUTO_REJECT.includes(d?.adult    ?? 'UNKNOWN') ||
      AUTO_REJECT.includes(d?.violence ?? 'UNKNOWN') ||
      AUTO_REJECT.includes(d?.racy     ?? 'UNKNOWN')
    ) {
      return 'auto_rejected';
    }

    // Direkt freigeben bei eindeutig sauberem Content
    if (
      AUTO_APPROVE.includes(d?.adult    ?? 'UNKNOWN') &&
      AUTO_APPROVE.includes(d?.violence ?? 'UNKNOWN') &&
      AUTO_APPROVE.includes(d?.racy     ?? 'UNKNOWN')
    ) {
      return 'auto_approved';
    }

    // Alles andere → menschliche Prüfung
    return 'needs_review';
  } catch (error) {
    // Bei API-Fehler: Fail-Safe → immer in menschliche Review-Queue
    console.error('[AI Moderation] Vision API error, falling back to manual review:', error);
    return 'needs_review';
  }
}
```

### 4. Integration in Upload-Flow

```typescript
// Beispiel: in /api/forum/upload-image oder Brew-Label-Upload-Action
import { checkImageSafety } from '@/lib/moderation-ai';
import { sendImageRejectedEmail } from '@/lib/email';

// Nach Upload in Supabase Storage, vor Setzen des moderation_status:
const aiResult = await checkImageSafety(imageBuffer);

if (aiResult === 'auto_rejected') {
  // Physisch löschen + User benachrichtigen
  await supabase.storage.from('forum-uploads').remove([storagePath]);
  await sendImageRejectedEmail(userEmail, 'Automatisch abgelehnt: Richtlinienverstoß erkannt');
  return { error: 'Bild entspricht nicht den Community-Richtlinien.' };
}

const moderationStatus = aiResult === 'auto_approved' ? 'approved' : 'pending';

await supabase
  .from('forum_post_images')  // oder brews / breweries
  .update({ moderation_status: moderationStatus })
  .eq('id', imageId);
// Bei 'pending' → erscheint automatisch in ModerationView.tsx wie bisher
```

---

## Teil 2: Text-Moderation (Google Gemini Flash)

BotlLab verwendet bereits `@google/generative-ai` (Gemini) für die Label-Generierung. Gemini Flash kann **kosteneffizient** als Ergänzung zum bestehenden `profanity.ts`-Filter für Forum-Inhalte genutzt werden — besonders für Kontext-abhängige Fälle die ein einfacher Wortfilter nicht erkennt (Hate-Speech, Spam, Off-Topic-Schleichwerbung).

### Wann aktivieren?
- Bestehender `profanity.ts`-Filter bleibt als **schnelle erste Schicht** (synchron, keine API-Kosten)
- Gemini-Check als **zweite Schicht** (asynchron nach dem Posten): nur wenn `profanity.ts` nichts gefunden hat

### Ablauf

```
User sendet Forum-Post
       │
       ├─ [Schicht 1, synchron] profanity.ts Check
       │    └─ Treffer → Ablehnung sofort, kein API-Call
       │
       └─ [Schicht 2, asynchron] Gemini Flash Content-Check
            ├─ post_content + thread_title an Gemini
            ├─ Antwort: { verdict: 'safe' | 'review' | 'spam' | 'harmful' }
            ├─ 'safe'    → keine Aktion
            ├─ 'spam'    → Post unsichtbar schalten, Report auto-erstellen
            ├─ 'review'  → Report auto-erstellen (für Admin-Queue)
            └─ 'harmful' → Post unsichtbar schalten, User-Warnung, Report auto-erstellen
```

### Code-Logik (`lib/moderation-ai.ts` — ergänzen)

```typescript
// Ergänzung zu lib/moderation-ai.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const TEXT_MODERATION_PROMPT = `
Du bist ein Content-Moderator für eine deutschsprachige Hobbybrauer-Community.
Analysiere den folgenden Text und antworte NUR mit einem JSON-Objekt.

Mögliche Verdicts:
- "safe": Normaler Community-Content, kein Problem
- "spam": Werbung, Affiliate-Links, repetitiver Spam, Bedeutungsloser Content
- "review": Grenzfall, sollte von einem Admin geprüft werden
- "harmful": Hate Speech, explizite Gewalt, Beleidigungen, illegale Inhalte

Antworte ausschließlich mit: {"verdict": "safe"|"spam"|"review"|"harmful", "reason": "kurze Begründung"}

Text zu prüfen:
`;

export type TextModerationResult = {
  verdict: 'safe' | 'spam' | 'review' | 'harmful';
  reason: string;
};

export async function checkTextContent(text: string): Promise<TextModerationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(TEXT_MODERATION_PROMPT + text.slice(0, 2000));
    const response = result.response.text().trim();
    return JSON.parse(response) as TextModerationResult;
  } catch {
    // Fail-Safe: bei Fehler immer 'safe' (kein false positive)
    return { verdict: 'safe', reason: 'API error, manual review recommended' };
  }
}
```

---

---

## Kosten-Analyse

### Google Cloud Vision (Bild-Moderation)

| Volumen | Monatliche Kosten |
|---------|-------------------|
| ≤ 1.000 Bilder | **0,00 €** (Free Tier) |
| 2.000 Bilder | ~**1,50 €** |
| 5.000 Bilder | ~**6,00 €** |
| 10.000 Bilder | ~**13,50 €** |

*Preis: ~$1.50 / 1.000 Einheiten (SafeSearch). Erste 1.000/Monat kostenlos.*

### Google Gemini Flash (Text-Moderation)

| Volumen | Monatliche Kosten |
|---------|-------------------|
| ≤ ~500.000 Input-Tokens/Monat | **0,00 €** (Free Tier Gemini 1.5 Flash) |
| ~5 Mio. Input-Tokens | ~**1,90 €** |

*Gemini 1.5 Flash: $0.075 / 1M Input-Tokens. Ein durchschnittlicher Forum-Post = ~150 Tokens → 5 Mio. Tokens ≈ 33.000 Posts. Für BotlLab auf absehbare Zeit kostenlos.*

### Gesamtbild

Ab ~2.000 Uploads + ~10.000 Forum-Posts/Monat: **< 5 € gesamt**. Der entscheidende Wert entsteht nicht durch Kostenersparnis, sondern durch deutlich reduzierte Admin-Arbeit und schnellere Reaktionszeiten auf problematischen Content.

---

## Skalierungs-Entscheidungsbaum

```
Aktueller Stand (< 500 Uploads/Monat):
  └─ Manuelle Moderation via ModerationView.tsx ← WIR SIND HIER

Nach Forum-Bild-Launch (~Phase 1.5):
  └─ Manuelle Moderation + forum_post_images Queue

Bei ~500+ Uploads/Monat ODER erstem juristischen Vorfall:
  └─ Bild-Moderation (Teil 1) aktivieren → AI-Vorsortierung

Bei ~200+ Forum-Posts/Tag:
  └─ Text-Moderation (Teil 2) aktivieren → asynchron im Hintergrund

Bei ~50.000+ aktiven Usern:
  └─ Prüfung automatisierter CSAM-Detection (PhotoDNA oder Google Child Safety API)
```

---

## Alternativen (Bewertet)

| Option | Vorteile | Nachteile | Entscheidung |
|--------|----------|-----------|--------------|
| **Google Cloud Vision** ✅ | Server-side, zuverlässig, 1.000/Monat kostenlos, deckt adult/violence/racy ab | Erfordert GCP-Setup | **Empfohlen für Bilder** |
| **Google Gemini Flash** ✅ | BotlLab nutzt Gemini bereits, großzügiges Free Tier, Kontext-sensitiv (versteht Brau-Kontext) | Kein offiziell strukturiertes SafeSearch-API | **Empfohlen für Text** |
| **nsfwjs (TensorFlow Client-Side)** ❌ | Kostenlos | Client-Side Bypass möglich, erkennt Gewalt schlecht, belastet User-Device | **Verworfen** |
| **AWS Rekognition** ❌ | Ähnliche Qualität wie Cloud Vision | Kein AWS-Ökosystem bei BotlLab, höherer Setup-Aufwand | **Verworfen** |
| **OpenAI Moderation API** 🟡 | Sehr gut bei Text-Moderation, kostenlos | Kein Bild-SafeSearch, Datenübertragung nach USA (DSGVO-Prüfung nötig) | **Alternative für Text** |
