# Masterplan: Integration der Internationalisierung (i18n) in BotlLab

**Status:** ⏸️ **On Hold / Future**  
**Priority:** Low  
**Datum:** 20.01.2026

Dieses Dokument beschreibt den detaillierten, kleinschrittigen Plan, um die Anwendung _BotlLab_ vollständig mehrsprachig (lokalisierbar) zu machen. Wir verwenden **`next-intl`**, da dies der Industriestandard für den Next.js App Router ist.

---

## ⚠️ Vorwarnung & Backup

**Dieser Umbau greift tief in die Dateistruktur ein.**
Bevor wir beginnen:

1.  Git Status prüfen (muss clean sein).
2.  Einen neuen Branch erstellen: `git checkout -b feature/i18n-migration`.
3.  Backup des `app/` Ordners machen, falls etwas schiefgeht.

---

## Phase 1: Installation & Basiskonfiguration

### 1.1 Abhängigkeiten installieren

Wir benötigen das Hauptpaket.

```bash
npm install next-intl
```

### 1.2 Ordnerstruktur für Übersetzungen erstellen

Wir lagern die Texte _außerhalb_ des `app` Ordners, damit sie sauber getrennt sind.

1.  Erstelle Ordner: `messages/` (im Root, neben `app/` und `package.json`).
2.  Erstelle Datei: `messages/de.json` (Basissprache).
3.  Erstelle Datei: `messages/en.json` (Zielsprache).

**Struktur der JSON-Dateien:**
Wir nutzen Namespaces (kategorisiert), um Variablenkonflikte zu vermeiden.

_Beispiel `messages/de.json`:_

```json
{
  "General": {
    "welcome": "Willkommen bei BotlLab",
    "logout": "Abmelden",
    "save": "Speichern"
  },
  "Dashboard": {
    "title": "Hallo, {name}",
    "brew_count": "{count, plural, =0 {Keine Sude} one {1 Sud} other {# Sude}}"
  }
}
```

### 1.3 Konfigurationsdatei erstellen (`src/i18n.ts` oder root `i18n.ts`)

Erstelle eine Datei `i18n.ts` im Root-Verzeichnis (oder `src/` falls vorhanden).

_Inhalt:_

```typescript
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

// Unterstützte Sprachen
const locales = ["de", "en"];

export default getRequestConfig(async ({ locale }) => {
  // Validiere, ob die angeforderte Sprache existiert
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

### 1.4 Next.js Config anpassen

Modifiziere `next.config.mjs` (oder `.js`), um das Plugin zu laden.

_Inhalt `next.config.mjs`:_

```javascript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... deine bestehende Config behalten
};

export default withNextIntl(nextConfig);
```

---

## Phase 2: Routing & Middleware (Der kritische Teil)

Damit URLs wie `/de/dashboard` oder `/en/dashboard` funktionieren, brauchen wir Middleware.

### 2.1 Middleware erstellen

Erstelle `middleware.ts` im Root-Verzeichnis (gleiche Ebene wie `app/`).

_Inhalt:_

```typescript
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // Eine Liste aller unterstützten Sprachen
  locales: ["de", "en"],

  // Standard-Sprache, wenn keine erkannt wird
  defaultLocale: "de",

  // Ob das Präfix für die Standardsprache ausgeblendet werden soll (z.B. /dashboard statt /de/dashboard)
  // Empfehlung für SEO: 'always' (immer Präfix) oder 'as-needed'
  localePrefix: "always",
});

export const config = {
  // Matcher: Ignoriert interne Next.js Pfade, API Routes und statische Dateien
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

### 2.2 Navigations-Helper erstellen

Erstelle: `lib/navigation.ts` (oder `navigation.ts`).
Das ist notwendig, damit wir `Link`, `redirect` und `useRouter` benutzen können, die automatisch das Sprach-Präfix beachten.

_Inhalt:_

```typescript
import { createSharedPathnamesNavigation } from "next-intl/navigation";

export const locales = ["de", "en"] as const;
export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });
```

---

## Phase 3: Ordnerstruktur Migration (Verschiebung der Dateien)

Das ist der riskanteste Schritt. Wir müssen alle "sichtbaren" Seiten in einen `[locale]` Ordner verschieben.

### 3.1 `[locale]` Ordner erstellen

Erstelle `app/[locale]/`.

### 3.2 Dateien verschieben

Verschiebe folgende Dateien/Ordner **IN** `app/[locale]/`:

- `app/page.tsx`
- `app/layout.tsx` (Dies wird das Root-Layout für lokalisierte Seiten)
- `app/dashboard/`
- `app/login/`
- `app/team/`
- `app/discover/`
- `app/error.tsx`, `app/not-found.tsx` (benötigen Anpassung)

**NICHT verschieben (bleiben im Root `app/`):**

- `app/api/` (API Routen brauchen keine Sprache im Pfad, oder werden anders gehandhabt)
- `app/globals.css`
- `app/favicon.ico`

### 3.3 Root Layout Anpassung (`app/[locale]/layout.tsx`)

Da das Layout nun dynamisch ist, ändern sich die Props.

_Änderung:_

```typescript
// Alt
export default function RootLayout({ children }: { children: React.ReactNode }) { ... }

// Neu
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Lade Nachrichten für die Client-Seite (wichtig für Interaktivität)
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## Phase 4: Komponenten Refactoring (Fleißarbeit)

Jetzt müssen wir durch jede einzelne Datei gehen und die Texte ersetzen.

### 4.1 Server Components (z.B. `page.tsx`)

```typescript
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");

  return <h1>{t("title")}</h1>;
}
```

### 4.2 Client Components (mit `use client`)

Funktioniert identisch, da wir den `NextIntlClientProvider` im Layout haben.

```typescript
"use client";
import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations("General");

  return <button>{t("save")}</button>;
}
```

### 4.3 Umgang mit Variablen (Interpolation)

Wenn du dynamische Daten hast:
_DE.json_: `"welcome": "Hallo {name}, du hast {count} Punkte"`

_Code:_

```typescript
t("welcome", { name: userName, count: 150 });
```

### 4.4 Links ersetzen

Alle Importe von `next/link` müssen ersetzt werden durch unseren Helper.

_Alt:_ `import Link from 'next/link';`
_Neu:_ `import {Link} from '@/lib/navigation';` (aus Phase 2.2)

---

## Phase 5: Spezielle Herausforderungen

### 5.1 Datumsformatierung (`date-fns`)

Aktuell wird `import { de } from "date-fns/locale";` oft fest importiert.
Dies muss dynamisch werden.

_Lösung:_
Erstelle einen Hook oder Helper `useDateLocale`, der basierend auf `useLocale()` aus `next-intl` das richtige date-fns Objekt (`de` oder `enUS`) zurückgibt.

### 5.2 Datenbank-Inhalte (Supabase)

Inhalte, die aus der DB kommen (z.B. Rezeptnamen, Beschreibungen) werden **nicht** automatisch übersetzt.

**Strategie:**

1.  **UI-Texte** (Buttons, Labels): Über `messages/*.json`.
2.  **User-Content** (Rezept "Mein super Bier"): Bleibt Originalsprache.
3.  **System-Daten** (Bier-Stile "Pilsner", "Weizen"):
    - Entweder in der DB Speichern als Keys (`STYLE_PILSNER`) und im Frontend übersetzen.
    - Oder eine Mapping-Funktion nutzen: `t(`styles.${dbValue}`)`.

### 5.3 Bilder & Alt-Texte

Auch `alt`-Tags müssen übersetzt werden:
`<img src="..." alt={t('profile_image_alt')} />`

### 5.4 Metadata (SEO)

Für `generateMetadata`:

```typescript
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("home_title"),
    description: t("home_desc"),
  };
}
```

---

## Phase 6: Der Umschalter (Language Switcher)

Wir brauchen im Header eine Komponente zum Wechseln.

_Komponente `LanguageSwitcher.tsx`:_

```typescript
"use client";
import { useRouter, usePathname } from "@/lib/navigation";

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select onChange={(e) => handleChange(e.target.value)}>
      <option value="de">Deutsch</option>
      <option value="en">English</option>
    </select>
  );
}
```

---

## Checkliste für den Rollout

1.  [ ] Backup erstellt?
2.  [ ] `next-intl` installiert?
3.  [ ] `messages/de.json` angelegt und erste Texte übertragen?
4.  [ ] `files` verschoben nach `app/[locale]`?
5.  [ ] `middleware.ts` aktiv?
6.  [ ] `layout.tsx` angepasst mit Provider?
7.  [ ] Erster Test: `/en/login` aufrufen (sollte funktionieren, evtl. noch englische Texte fehlen, aber Seite rendert).
8.  [ ] Alle `Link` Komponenten ausgetauscht?
9.  [ ] Alle harten Strings in Komponenten durch `{t('key')}` ersetzt?
10. [ ] `date-fns` Locale dynamisch gemacht?

## Empfehlung für den Start

Fang **nur** mit der Login-Seite (`app/login/page.tsx`) an.

1. Installieren & Config.
2. Verschiebe nur Login Route (zum Testen, auch wenn Struktur dann kurzzeitig hybrid ist – besser: alles verschieben, aber nur Login refaktorieren).
3. Bekomme die Middleware zum Laufen.
4. Wenn `/de/login` und `/en/login` "Hallo" vs "Hello" anzeigen, hast du gewonnen. Dann arbeite dich durch den Rest.
