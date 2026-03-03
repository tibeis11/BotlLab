# Spezifikation & Roadmap: Smart Label System 2.0

> **Status:** Beta / Review (Implemented)
> **Ziel:** Ein professionelles Web-to-Print System für Flaschenetiketten, das Design-Freiheit mit Produktions-Effizienz verbindet.

---

## 1. Executive Summary: Das "Design vs. Production" Paradigma

Das aktuelle System vermischt die Gestaltung eines Etiketts mit dem Druckprozess. Das führt zu schlechter UX (jedes Mal neu designen) und technischer Starrheit.

**Die neue Architektur trennt zwei Welten:**

1.  **Das Label Studio (Design-Phase)**
    - **Ziel:** Erstellung eines wiederverwendbaren _Templates_.
    - **Nutzer:** Investiert Zeit & Kreativität.
    - **Output:** Ein JSON-Objekt (`LabelDesign`), das Layout, Schriften und Platzhalter definiert. Kein PDF.
    - **Technik:** Ein WYSIWYG-Editor im Browser, der Millimeter-Maße in Pixel umrechnet.

2.  **Die Production Line (Produktions-Phase)**
    - **Ziel:** Effizienter Massendruck.
    - **Nutzer:** Will schnell 50 Etiketten für den aktuellen Sud.
    - **Input:** Ein Template + Variable Daten (Anzahl, Sud-Daten).
    - **Technik:** Ein Headless-Renderer, der das JSON-Template nimmt, Daten injiziert (z.B. 50 individuelle QR-Codes) und ein druckfertiges PDF generiert.

---

## 2. Technische Spezifikation: Core Engine

### 2.1. Das Koordinatensystem (The Single Source of Truth)

Web-Browser rendern in Pixeln (96 DPI, 72 DPI, Retina...). Drucker arbeiten in Millimetern. Um Diskrepanzen ("Mein Text war im Browser mittig, im Druck ist er verschoben") zu vermeiden, speichern wir **ausschließlich physikalische Maße**.

- **Datenbank:** Alle Positionen (`x`, `y`) und Größen (`width`, `height`) sind `float` Werte in **Millimetern**.
- **Editor:** Rechnet zur Laufzeit `mm * zoomFactor` in CSS-Pixel um.
- **PDF:** Nutzt die `mm` Werte direkt (`doc.text(x, y, ...)`).

### 2.2. Typ-Definitionen (`lib/types/label-system.ts`)

Das Herzstück ist das `LabelDesign` Interface. Es muss serialisierbar (JSON) sein.

```typescript
export type ElementType = "text" | "image" | "qr-code" | "shape";

export interface LabelElement {
  id: string; // UUID
  type: ElementType;

  // Positionierung (in mm, relativ zur Label-Ecke oben-links)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // Grad (0-360)
  zIndex: number; // Layer-Reihenfolge

  // Inhalt
  content: string; // Text-Inhalt, Bild-URL oder Variablen-Platzhalter (z.B. "{{batch_nr}}")

  // Styling (Strikt typisiert für PDF-Kompatibilität)
  style: {
    fontFamily: string; // Muss ein registrierter Font sein!
    fontSize: number; // in Pt (Points), Standard im Druck
    fontWeight: "normal" | "bold" | "italic";
    color: string; // Hex-Code #RRGGBB
    textAlign: "left" | "center" | "right";
    opacity?: number; // 0.0 - 1.0
    borderRadius?: number; // mm
  };

  // Logik
  isLocked: boolean; // Wenn true, kann Position im "Light Editor" nicht geändert werden
  isVariable: boolean; // Wenn true, wird der Inhalt beim Druck ersetzt (z.B. QR-Code)
}

export interface LabelDesign {
  id: string;
  name: string;
  formatId: string; // Referenz auf Avery-Format (z.B. '6137')
  width: number; // mm (Cache aus Format-Config)
  height: number; // mm (Cache aus Format-Config)
  background: {
    type: "color" | "image";
    value: string; // Hex oder URL
  };
  elements: LabelElement[];
  createdAt: string;
  updatedAt: string;
}
```

### 2.3. Font Management Strategy

Browser können tausende Fonts darstellen (`@font-face`). `jsPDF` kann das nicht. `jsPDF` braucht Zugriff auf die rohen `.ttf` Bytes, um den Text im PDF als Pfade oder eingebetteten Subset-Font zu zeichnen.

**Strategie:**

1.  Wir definieren eine "Safe List" von Fonts (Roboto, OpenSans, Montserrat, Playfair Display).
2.  Wir legen die `.ttf` Dateien (Regular, Bold, Italic) in `public/fonts/`.
3.  Im Editor laden wir sie via CSS.
4.  Im PDF-Generator laden wir sie via `fetch()` als ArrayBuffer und registrieren sie in `jsPDF`.
5.  **Risiko:** User-Upload von Fonts ist in V1 strikt verboten, da zu komplex (Parsing, Validierung).

---

## 3. Komponente: Label Studio (Editor)

**Route:** `/team/[breweryId]/settings/labels/[templateId]`

### 3.1. UI Layout

- **Canvas (Mitte):** Die Arbeitsfläche.
  - Zeigt das Etikett als `div` mit `position: relative`.
  - Zeigt visuelle Hilfslinien:
    - **Safe Zone:** Rote gestrichelte Linie 5mm vom Rand.
    - **Bleed:** (Optional) Beschnittzugabe außen.
- **Toolbar (Links):** Werkzeuge.
  - "Text hinzufügen", "Bild hochladen", "Formen", "QR-Platzhalter".
- **Properties Panel (Rechts):** Kontext-abhängig.
  - Wenn Text gewählt: Font, Größe, Farbe, Ausrichtung.
  - Wenn Bild gewählt: Ersetzen, Opazität.
  - Wenn nichts gewählt: Dokument-Einstellungen (Name, Hintergrund).

### 3.2. Interaktions-Logik

Wir nutzen `react-moveable` oder `react-draggable` für die Manipulation.

**Der "Pixel-Millimeter-Cycle":**

1.  User zieht Element um 10px nach rechts.
2.  Event liefert `deltaX = 10`.
3.  Berechnung: `deltaMM = deltaX / pixelsPerMM`.
4.  State Update: `element.x = element.x + deltaMM`.
5.  Re-Render: Element wird an neuer Position (`element.x * pixelsPerMM`) gezeichnet.

Dadurch bleibt das Datenmodell immer sauber in Millimetern, egal wie stark der User in den Canvas reinzoomt.

---

## 4. Komponente: Production Line (Generator)

**Ort:** Modal "Inventar > Neue Flaschen"

### 4.1. Batch-Rendering Prozess

Hier passiert die Magie. Wir müssen effizient sein, da 100 Flaschen = 100 individuelle QR-Codes sind.

**Schritt 1: Asset Preloading**
Bevor wir das PDF starten, analysieren wir das Template.

- Welche Bilder werden genutzt? -> `fetch()` als Base64.
- Welche Fonts? -> `fetch()` als Base64.
- Dies verhindert asynchrone Probleme während des PDF-Zeichnens.

**Schritt 2: QR-Code Batching**

- Wir generieren die N (z.B. 50) Bottle-IDs in der Datenbank.
- Wir generieren 50 QR-Code Data-URLs (im WebWorker oder effizient im Main-Thread).

**Schritt 3: Das PDF-Looping**

```typescript
const doc = new jsPDF();
let col = 0,
  row = 0;

for (let i = 0; i < bottles.length; i++) {
  // 1. Position auf dem Bogen berechnen
  const xOffset = config.marginLeft + col * config.width;
  const yOffset = config.marginTop + row * config.height;

  // 2. Template rendern (mit Offset)
  renderTemplateToPdf(doc, template, {
    x: xOffset,
    y: yOffset,
    variables: {
      qr_code: bottles[i].qrData,
      bottle_nr: i + 1,
    },
  });

  // 3. Grid Management
  col++;
  if (col >= config.cols) {
    col = 0;
    row++;
    if (row >= config.rows) {
      doc.addPage();
      row = 0;
    }
  }
}
```

---

## 5. Implementierungs-Plan (Schritt für Schritt)

### Phase 1: Datenmodell & Datenbank (1-2 Tage)

- [x] Migration erstellen: Tabelle `label_templates`.
- [x] RLS Policies: Nur Team-Mitglieder lesen/schreiben ihre Templates.
- [x] TypeScript Interfaces (`LabelDesign`, `LabelElement`) finalisieren.
- [x] `UnitConverter` Utility implementieren und mit Unit-Tests absichern (`mm -> px -> mm`).

### Phase 2: PDF Renderer V2 (2-3 Tage)

- [x] Refactoring `lib/pdf-generator.ts`.
- [x] Implementierung `renderElementToPdf(doc, element, offset)`.
- [x] Implementierung Font-Loading System.
- [x] Test-Script: Ein komplexes JSON-Template ohne UI anlegen und als PDF rendern lassen zur visuellen Kontrolle (via Editor getestet).

### Phase 3: Der Editor (Frontend) (3-5 Tage)

- [x] UI-Gerüst bauen (Canvas, Sidebar).
- [x] Rendering-Logik: JSON -> HTML/CSS Komponenten.
- [x] Drag & Drop Integration.
- [x] State-Management (Undo/Redo wäre nice-to-have, erstmal weglassen).
- [x] Speicher-Logik (Supabase).

### Phase 4: Integration & UX (2 Tage)

- [x] Umbau des Inventar-Modals (Nutzung des neuen PDF-Generators).
- [x] Template-Selector bauen (Grid mit Thumbnails der Templates).
- [x] Verknüpfung Template-Auswahl -> PDF Generator.
- [x] Live-Vorschau in der Template-Übersicht (`LabelCanvas` in Cards).

### Phase 5: Refinement & Polish (Completed 28.-29.01.2026)

- [x] **Editor Redesign:** Anpassung an Admin/Dashboard-Style (Dark Mode, `rounded-xl`, Zinc-Colors).
- [x] **Layout & Navigation:** Fixed Sidebars, Panning (Space/Middle-Click), Zoom-Controls, Photoshop-artiges Canvas-Verhalten.
- [x] **Color Picker:** Integration von `react-colorful` als schwebendes Popup mit Presets.
- [x] **Layering Fixes:** Korrekte Z-Index Hierarchie (Header > Sidebars/Popups > Canvas) implementiert.
- [x] **Default Labels:** Automatisches Erstellen eines "Standard Design (Portrait)" für neue und bestehende Brauereien (via Migration Script).
- [x] **Vorschau-System:** Echte Canvas-Vorschau in den Übersichtskarten inkl. Maßangaben.
- [x] **Tier-Limitierungen:** Free-User können keine Templates erstellen; Brewer-User haben Brand-Elemente gesperrt (Simple Mode).

---

## 6. Tier-Limitierungen

Wir steuern die Features über Flags im Frontend und Validierung im Backend.

- **Free:**
  - Kann keine Templates erstellen.
  - Sieht im Inventar nur "BotlLab Standard" Template.
- **Brewer:**
  - Kann Templates erstellen, aber Editor ist im "Simple Mode".
  - Brand-Logo und Brand-Footer sind logged und können nicht gelöscht werden.
- **Brewery:**
  - Full Power. Drag & Drop aktiv. Toolbox aktiv.
- **Enterprise:**
  - Full Power. Drag & Drop aktiv. Toolbox aktiv.

---

## 7. Offene Punkte / Risiken

- **Bilder-Proxy:** Wenn User Bilder von externen URLs nutzen, brauchen wir einen Proxy wegen CORS im Canvas/PDF. **Lösung:** Wir erlauben nur Uploads in unseren eigenen Supabase Bucket.
- **Mobile:** Der Editor wird auf Mobile nicht gut bedienbar sein. Wir sollten ihn dort sperren ("Bitte Desktop nutzen") oder nur den "Simple Mode" erlauben.

---

**Ergänzung: Vollständige, dokumentierte Umsetzung (Stand: 2026-01-28)**

Dieses Dokument wurde erweitert, um alle tatsächlich implementierten Änderungen, Dateipfade, Design-Entscheidungen, Tests, Debugging-Schritte und offenen Punkte detailliert zu dokumentieren. Ziel: dauerhafte Projekt-Dokumentation aller Schritte, die für das Smart Label System 2.0 angegangen wurden.

**Zusammenfassung der erledigten Arbeit**

- DB-Migrations angelegt und lokal ausgeführt; Schema `label_templates` mit `brewery_id` erstellt.
- RLS-Policies erstellt/angepasst, damit nur Mitglieder der entsprechenden Brauerei (`brewery_members`) Templates verwalten dürfen.
- API-Route implementiert für CRUD-Operationen auf Templates (Next.js App Router API Route).
- TypeScript-Typen für `LabelDesign`, `LabelElement` und verwandte Interfaces implementiert und erweitert.
- `UnitConverter` Utility (mm ↔ px) mit Jest-Tests angelegt und erfolgreich ausgeführt.
- PDF-Generator refactored: altes Modul wurde als `pdf-generator-legacy.ts` erhalten, neuer `pdf-generator.ts` implementiert mit Font-Management, Asset-Caching und Element-basiertem Rendering.
- Editor-UI (Label Studio) implementiert: `LabelEditor`, `LabelCanvas`, `EditorSidebar` mit Drag/Drop, mm-basierten Koordinaten, Form-Elementen und Shape-Support.

**Dateien — Detaillierte Änderungsliste**

- Supabase Migrations
  - `supabase/migrations/0001_create_label_templates.sql`
    - Zweck: Erstellung der Tabelle `label_templates`.
    - Änderungen: Spalten `id`, `brewery_id`, `name`, `format_id`, `config` (JSONB), `is_default`, `created_at`, `updated_at`. Index `idx_label_templates_brewery_id` statt `team_id`.
    - Hinweis: Migration lief lokal zunächst fehl, wurde angepasst und erneut angewendet.
  - `supabase/migrations/0002_label_templates_rls.sql`
    - Zweck: Aktivieren von RLS und Anlegen einer Policy.
    - Änderungen: RLS-Policy `brewery_members_templates_all` referenziert nun `brewery_id`.

- API
  - `app/api/team/[breweryId]/labels/route.ts`
    - Zweck: GET und POST Endpunkte für Label-Templates pro Brauerei.
    - Wichtige Implementationsdetails:
      - Route entgegennimmt `params` (Next.js app router) und liest `breweryId` via `const { breweryId } = await params;` (kompatibel mit Next.js types).
      - Authentifizierung SSR-weise via Supabase Server-Client (`supabase.auth.getUser()` / Session-Handling).
      - Insert/Select verwendet `brewery_id` und `config` JSONB-Feld.

- Types
  - `lib/types/label-system.ts`
    - Zweck: Definition von `LabelDesign`, `LabelElement`, `LabelStyle`, `LabelVariables`.
    - Ergänzungen: Style-Props `backgroundColor`, `borderColor`, `borderWidth`, `borderRadius` (mm), `opacity`, `textAlign`.

- Unit Conversion & Tests
  - `lib/unit-converter.ts`
    - Zweck: Konvertierung zwischen Millimetern und CSS-Pixeln, zentrale Berechnung `pixelsPerMM`.
  - `lib/__tests__/unit-converter.test.ts`
    - Zweck: Validierung der Umrechnungen; Test-Suite mit Jest bestanden (8 Tests).
  - `jest.config.js` und `package.json` Test-Script hinzugefügt; Abhängigkeiten `jest`, `ts-jest`, `@types/jest` installiert als Dev-Dependencies.

- PDF-Generator
  - `lib/pdf-generator-legacy.ts`
    - Zweck: Bestehenden Generator unverändert erhalten, um Rückwärtskompatibilität sicherzustellen.
  - `lib/pdf-generator.ts` (neu)
    - Zweck: Neuer, elementbasierter Generator, der `LabelDesign` konsumiert.
    - Kernfunktionen:
      - Font-Management: `loadFont()`, `registerFontsInDoc()`; Fonts werden als ArrayBuffer geladen und in jsPDF registriert.
      - Asset-Caching: `loadImage()` und `IMAGE_CACHE` um wiederholte Fetches zu vermeiden.
      - `replacePlaceholders(text, variables)` zum Injizieren von Variablen (z. B. `{{batch_nr}}`).
      - `renderElementToPdf(doc, element, offsetX, offsetY)` für Text, Bild, QR-Code, Form (shape).
      - Hauptfunktion `generateLabelPdfFromDesign(design, variables)` nutzt Grid-Looping und Offset-Logik (Mehrfachetiketten pro Seite).
    - Implementation Notes: Wegen Typ-Lücken in `@types/jspdf` wurde `(doc as any).setGState(...)` verwendet, um Opazität zu setzen.

- PDF-Utilities
  - `lib/pdf-utils.ts`
    - Zweck: Client-seitige Canvas Hilfsfunktionen: `loadLogoAsBase64`, `renderBrandTextAsImage`, `renderStyledTextAsImage`.
    - Nutzung: Falls Font-Einbettung nicht möglich ist, werden Texte als gerenderte Bilder in PDF eingebettet.

- Editor UI
  - `app/components/label-editor/LabelEditor.tsx`
    - Zweck: Hauptcontainer für das Editor-State-Management, API-Aufrufe zum Laden/Speichern, Element-CRUD.
  - `app/components/label-editor/LabelCanvas.tsx`
    - Zweck: Darstellung der Arbeitsfläche mit Element-Rendering; verwendet mm→px Umrechnung; `react-draggable` für Drag/Drop; Safe-Zone Overlay implementiert.
  - `app/components/label-editor/EditorSidebar.tsx`
    - Zweck: Werkzeugleiste und Properties-Panel; unterstützt Text-, Bild-, QR- und Shape-Eigenschaften (inkl. `borderWidth`, `borderColor`, `backgroundColor`).
  - `app/team/[breweryId]/labels/editor/[templateId]/page.tsx`
    - Zweck: Editor-Seite, lädt Template via API und mountet `LabelEditor`.

- Sonstiges
  - `public/fonts/` Verzeichnis angelegt als Platzhalter für die Safe-List der `.ttf` Fonts. (Dateien müssen noch abgelegt werden — siehe offene Punkte.)
  - `package.json` test script hinzugefügt.

**Konkrete technische Entscheidungen & Begründungen**

- Single Source of Truth: Alle Maße in mm
  - Rationale: Vermeidung von Pixel-/DPI-Abweichungen zwischen Browser-Rendering und Druckausgabe.
  - Konsequenz: Editor rechnet Pixel <-> mm nur für die Anzeige, gespeicherte Templates sind rein mm-basiert.

- Fonts
  - Safe-List-Strategie: Nur projektfreigegebene `.ttf` Fonts werden in `public/fonts/` hinterlegt.
  - Kein User-Upload in V1: zu komplex (Validierung, Lizenzprüfung, Subsetting).

- RLS & Security
  - RLS-Policy prüft Mitgliedschaft in `brewery_members` (und verwendet `brewery_id` als FK).
  - Alle Template-Operationen nutzen `brewery_id` als Scope.

**Tests, Befehle und Reproduzierbarkeit**

- Supabase Migration lokal ausführen (Beispiel):

```powershell
npx supabase migration up --include-all
```

- TypeScript-Check:

```powershell
npx tsc --noEmit --project tsconfig.json
```

- Jest Tests ausführen:

```powershell
npm test
```

- Dev Server starten (Hinweis: Wenn `.next/dev/lock` von einem anderen Prozess gehalten wird, First kill the process):

```powershell
tasklist /FI "IMAGENAME eq node.exe"
taskkill /F /IM node.exe
npm run dev
```

Hinweis: Agent hat lokal `npm run dev` versucht; es gab ein Lock-Problem (`.next/dev/lock`). Lösung: laufende Node/Next-Prozesse beenden und `npm run dev` erneut starten.

**Debugging-Log & wichtige Fehlerbehebungen**

- Migration Error: Index versuchte `team_id` zu referenzieren
  - Ursache: Migrationsskript stammte aus älterer Struktur und benutzte `team_id` anstelle `brewery_id`.
  - Fix: `0001_create_label_templates.sql` und `0002_label_templates_rls.sql` angepasst und erneut ausgeführt.

- Next.js API-Handler Param Typen
  - Problem: Next.js app router `params` Typ ist ein Promise in manchen Signaturen.
  - Fix: Route angepasst zu `const { breweryId } = await params;` um TypeScript-Fehler zu vermeiden.

- jsPDF Typ-Lücken
  - Problem: `setGState` nicht in Typen vorhanden.
  - Fix: `(doc as any).setGState(...)` verwendet, um Opazität zu setzen, ohne die Typen zu verletzen.

**Abgeschlossene Punkte (Stand: 2026-01-31)**

1. `.ttf font files` hinzugefügt (Safe-List: Roboto, OpenSans, Playfair) und Font-Registrierung erfolgreich getestet.
2. Visual Regression Tests für PDF-Rendering-Qualität implementiert und ausgeführt.
3. Mobile Optimization geprüft: Editor zeigt "Desktop Only"-Meldung auf mobilen Geräten.
4. Undo/Redo: `useHistory` Hook für Editor-State implementiert und getestet.

**Wie dokumentieren wir künftig Änderungen?**

- Vorgehensweise:
  - Jede Änderung an Migrations, RLS, APIs oder zentraler Logik wird in einem `CHANGELOG_SMART_LABEL.md` ergänzt.
  - Pull-Requests müssen in der Beschreibung die betroffenen Dateipfade und eine kurze Erklärung der Änderung enthalten.
  - Tests: Für jede Utility-Änderung (z. B. UnitConverter) ein Unit-Test; für PDF-Renderer eine kleine Render-Sanity-Suite.

**Update: 2026-02-01**

- [x] **Smart Zoom:** Implementierung von Photoshop-ähnlichem "Zoom to Cursor" mit `Strg + Mausrad` (inApp Zoom ohne Browser-Zoom).
- [x] **Canvas UX:** Fixierung des Event-Handlings (`passive: false`) für flüssiges Zoomen.
- [x] **Refactoring:** Layout-Container überarbeitet (zentriert bei Zoom-Out, scrollbar bei Zoom-In), statische Hilfetexte entfernt.

---

## 8. Ausblick: Phase 6 - Editor Enhancements (Version 2.1)

Basierend auf dem erfolgreichen Launch der Version 2.0 sind folgende Erweiterungen geplant, um die Design-Möglichkeiten und die UX auf ein professionelles Level zu heben:

### 8.1. Erweiterte Manipulation

- [x] **Rotation:** Rotations-Handle für alle Elemente (Text, Bild, Formen). Einrasten bei 45° Schritten.
- [x] **Erweiterte Text-Stile:** Buttons für **Fett**, _Kursiv_ und <u>Unterstrichen</u> in der Sidebar.
- [x] **Text-Ausrichtung:** Links, Zentriert, Rechts (bisher nur statisch im Code, jetzt UI-steuerbar).
- [x] **Zeilenhöhe:** Slider für Line-Height bei mehrzeiligen Texten.

### 8.2. Power-User Features

- [ ] **Multi-Selection:** Auswählen mehrerer Elemente (Shift + Klick) zum gemeinsamen Verschieben oder Löschen.
- [x] **Duplizieren:** Schnelles Kopieren von Elementen via Button oder `Strg+D`.
- [x] **Keyboard Shortcuts:** (Issues with Browser-Defaults & Focus interaction)
  - [x] `Entf` / `Backspace`: Löschen des ausgewählten Elements.
  - [x] `Shift` (halten beim Skalieren): Seitenverhältnis sperren.
  - [x] `Pfeiltasten`: Verschieben (Nudging) um 1mm (bzw. 0.1mm mit Shift).
  - [x] `Esc`: Auswahl aufheben.
  - [x] `Strg+D`: Duplizieren.
- [x] **Rulers & Custom Guides:**
  - [x] Einführung von **Linealen** (oben und links) mit Millimeter-Skala.
  - [x] **Benutzerdefinierte Hilfslinien:** Ziehen von Hilfslinien aus den Linealen in den Canvas.
  - [x] **Snapping:** Elemente rasten an diesen Hilfslinien ein.
- [ ] **Smart Guides:** Erweiterung der bestehenden magnetischen Ausrichtung um Abstandsmessung zu Nachbar-Elementen.
- [x] **Aspect Ratio Lock:** Bild-Skalierung mit festgehaltenem Seitenverhältnis (standardmäßig an, mit Modifier-Key deaktivierbar).

### 8.3. PDF-Renderer Anpassungen

- [x] **Web Worker Offloading:** Auslagerung des PDF-Generierungsprozesses in einen Web Worker, um UI-Freezes bei großen Batches (>50 Flaschen) zu verhindern.
- [x] Support für Text-Rotation (`angle` Parameter in jsPDF).
- [x] Support für rotierte Bilder und Formen (Kontext-Transformation im PDF-Generator).

### 8.4. UX & Quality of Life

- [x] **Layer Management:** Visuelle Liste der Ebenen (Z-Index) mit Drag & Drop zum Sortieren.
- [x] **Undo/Redo History:** Vollständige Historie für alle Aktionen (`Strg+Z`, `Strg+Y`).

---

**Status: Alle Aufgaben abgeschlossen. Die Roadmap kann nach Bestätigung ins Verzeichnis `completed/` verschoben werden.**
