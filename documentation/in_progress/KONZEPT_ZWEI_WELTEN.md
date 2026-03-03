# KONZEPT: DIE ZWEI WELTEN VON BotlLab (Brauer vs. Trinker)

## 🎯 Ausgangslage & Das "Marktplatz-Dilemma"

BotlLab ist ein **Two-Sided Marketplace**:

1. **Die Brauer (Angebot / B2B):** Erstellen Rezepte, füllen Flaschen ab, generieren QR-Codes, zahlen (potenziell) für Analytics.
2. **Die Trinker (Nachfrage / B2C):** Scannen Flaschen, hinterlassen Ratings, sammeln Kronkorken, generieren die Daten.

**Der aktuelle Konflikt:**
Da wir uns aktuell in der Seed-Phase befinden, fokussiert sich unsere gesamte Startseite (`/`) und das Marketing darauf, **Brauer zu gewinnen**, damit das System mit Leben (Rezepten, Bieren) gefüllt wird (Das Henne-Ei-Problem: Ohne Bier gibt es nichts zu scannen).
Gleichzeitig führt dies dazu, dass echte Konsumenten, die über einen QR-Code auf einer Flasche in die App kommen, in einen "Brauer-Trichter" rutschen (Team-Gründung etc.), der sie komplett verwirrt.

**Das Ziel der "Zwei Welten"-Architektur:**

- Die Homepage (`/`) bleibt die Vertriebsmaschine für Brauer (B2B). Brauer spüren: "Das ist die ultimative Plattform für Hobbysieder & Craft-Brauereien".
- Der Trinker / Konsument kommt _nicht_ über die B2B-Homepage, sondern **fast ausschließlich über den Flaschenscan (`/b/[id]`)** in das System. Diesen Einstiegspunkt (Entry Point) nutzen wir als Weiche, um ihn in eine völlig vom Brau-Prozess isolierte "Untappd-Konkurrenz"-Welt (B2C) zu leiten.

---

## 🚦 Phase 1: Die Entry-Point-Weiche (Smart Onboarding)

Wir trennen die Nutzertypen nicht durch zwei verschiedene Apps, sondern durch kontextabhängiges Onboarding.

### Szenario A: Der Brauer (via Startseite)

- **Weg:** Nutzer besucht `botllab.de`, klickt auf "Jetzt losbrauen" -> Registrierung -> `/team/create`.
- **Erlebnis:** "Willkommen in der Brau-Zentrale." Alles dreht sich um Sude, Etikettendruck und Team-Management.
- **Navigation:** `Dashboard`, `Meine Biere`, `Rezepte`, `Bier scannen / trinken` (Brauer sind oft auch Trinker).

### Szenario B: Der Trinker (via Flaschenscan)

- **Weg:** Nutzer scannt den BotlLab-QR-Code auf einer Party -> Landet auf `botllab.de/b/[bottleId]`.
- **Erlebnis:** Er liest die Flascheninfos, will das Bier bewerten oder den digitalen Kronkorken sichern -> Klickt auf "Jetzt Kronkorken speichern" -> Registrierung **mit Parameter (`?intent=drink`)**.
- **Die Weiche im Code:** Nach dem Login erkennt das System, dass er noch kein Team hat _UND_ einen Drink-Intent hat.
- **Das Ergebnis:** Anstatt ihn auf `/team/create` zu zwingen, wird ihm still und leise ein "Konsumenten-Profil" erstellt. Er landet nach der Verifizierung **wieder direkt auf der Flaschenseite (`/b/[id]`)**, das Popup "Prost! Gutes Bier?" öffnet sich.

### 👉 Die goldene Regel:

**"Zwinge niemals einen Nutzer dazu, ein Team zu gründen, es sei denn, er klickt aktiv auf den Button 'Bier brauen'."**

---

## 🍺 Phase 2: Das "My Cellar" (Mein Bierkeller) Dashboard für Trinker

Für den Konsumenten bauen wir ein komplett getrenntes User-Dashboard, das extrem auf **Gamification und Sammelleidenschaft (Untappd-Style)** ausgerichtet ist.

- **URL:** `/me` oder `/my-cellar`
- **Kein Hinweis auf Brauen, Rezept-Kalkulation oder Etikettendruck.**

### Was sieht der Trinker hier?

1. **Das Kronkorken-Regal (Phygital Collection):**
   Eine visuell starke Darstellung (vielleicht sogar 3D-CSS oder Grid) aller gesammelten Kronkorken. Klick auf einen Kronkorken zeigt: "Getrunken am 14. August, Rauensteiner Helles, ★★★★".
2. **Die Geschmacks-DNA (Das "Bier-Horoskop"):**
   "Du hast 24 Biere getestet. Du bevorzugst zu 70% herbe, fruchtige IPAs." Eine Grafik, die er gerne per Screenshot auf Instagram teilt.
3. **Phygital Rewards (Das Untappd-Killer-Feature):**
   Eine Sektion "Belohnungen". _Beispiel: "Du hast 5 BotlLab-Biere der Rauensteiner Brauerei verifiziert getrunken! Zeige diesen Code im Taproom vor und erhalte dein 6. Bier gratis."_
4. **Meine Reise (Verifizierte Historie):**
   Eine Timeline, die zeigt, wo und wann er Biere getrunken hat (im Gegensatz zu Untappd mit dem Label "Verifiziert via QR", was Status in der Community aufbaut).

---

## 🛠️ Phase 3: Der Rollenwechsel (Vom Trinker zum Brauer)

Ein Konsument (Trinker) könnte irgendwann das Interesse am Brauen entwickeln – BotlLab ist der perfekte Funnel, um ihn den Einstieg ins Brauen zu ermöglichen.

- Im Trinker-Dashboard (`/me`) gibt es ganz unten (oder im Profilmenü) einen einzigen, eleganten Button:
  **"Werde selbst zum Brauer. Erstelle jetzt dein erstes Rezept."**
- Klickt er darauf, wird er durch den `/team/create` Flow geleitet und "schaltet" seine App in den Brauer-Modus um.

## 🔄 Technische Umsetzung (Skizze für den Code)

Die Umsetzung ist verblüffend simpel, weil es nur eine Routing-Logik ist:

1. **Die `/dashboard` Route wird smart:**

   ```typescript
   // In app/dashboard/page.tsx (oder middleware.ts)
   const user = await supabase.auth.getUser();
   const { data: teams } = await supabase
     .from("team_members")
     .select("*")
     .eq("user_id", user.id);

   if (teams.length > 0) {
     // Ist ein Brauer -> zum Team-Dashboard
     redirect(`/team/${teams[0].team_id}`);
   } else {
     // Kein Team. Prüfe ob er vom Scan kam oder einfach ein allgemeiner Login war
     // -> Leite auf das reine Trinker-Dashboard um (oder auf /team/create falls er "Brauer werden" klickte)
     redirect(`/my-cellar`);
   }
   ```

2. **Die Trennung der Menüs:**
   Die `SideNav` (Sidebar) prüft `userMode === "brewer"` vs `userMode === "drinker"`.
   Der Trinker sieht nur: "Mein Keller", "Meine Ratings", "Map", "Einstellungen".

---

## 🚀 Marketing-Strategie: "Ein Produkt, zwei Gesichter"

1. **Die B2B-Brauer Kampagne (Aktueller Fokus):**
   - _Zielgruppe:_ Hobbybrauer, Craft-Beer-Brands.
   - _Botschaft auf B2B-Kanälen:_ "Digitalisiere deine Brauerei. Drucke smarte Etiketten. Verstehe deine Trinker mit unserem Enterprise Analytics Dashboard." (Unsere USP-Roadmap).
   - _Landingpage:_ `botllab.de` (Startseite).

2. **Die B2C-Trinker Kampagne (Trojanisches Pferd gegen Untappd):**
   - _Zielgruppe:_ Beer-Geeks, Festival-Besucher, Bier-Käufer.
   - _Botschaft auf B2C-Kanälen (z.B. Instagram via QR-Codes, Flyer an Flaschenhalsen):_ "Stop Faking, Start Tracking. Sammle echte Flaschen, nicht nur Pixel. Analysiere deine Bier-DNA."
   - _Landingpage:_ Die Flaschenseite selbst (`/b/[id]`) ist der Vertriebskanal! Die Brauereien machen die B2C-Werbung für uns, indem sie unsere Etiketten drucken.

## Fazit

Indem wir den "Brauer/Team-erstellen"-Zwang für reine Scanner entfernen und stattdessen das **"My Cellar"**-Erlebnis (Phase 2) schaffen, beheben wir die kognitive Dissonanz sofort.
Der Brauer behält seine hochprofessionelle Brau-Zentrale (Startseite), und der Trinker bekommt ein spielerisches, sammellastiges Profil (Einstieg via Flasche). Aus einem Tool werden zwei passgenaue Erlebnisse, die die Daten füreinander generieren.

---

## 🏗️ Phase 4: Daten-Migration & Umsetzung (Der Übergang)

Um das System von der aktuellen "Jeder muss eine Brauerei gründen"-Logik auf die saubere Zwei-Welten-Architektur umzustellen, gehen wir in drei konkreten Schritten vor:

### 1. Die Datenbank-Migration (Aufräumen der Altlasten)

Aktuell hat fast jeder Konsument notgedrungen eine "Fake-Brauerei" angelegt, weil das `dashboard/page.tsx` sie dazu zwang.

- **Neues Status-Feld:** Wir erweitern die Tabelle `profiles` um eine Spalte `app_mode` (Werte: `'drinker'` oder `'brewer'`). Standard für Neuregistrierungen über Flaschenscans ist ab sofort `'drinker'`.
- **Fake-Brauereien identifizieren:** Wir nutzen ein SQL-Skript, um Brauereien aufzuspüren, die keine Sude (`brews` = 0) und keine Rezepte haben, deren Account-Aktivität aber aus Flaschen-Scans besteht.
- **Bereinigung:** Diesen Usern weisen wir `app_mode = 'drinker'` zu und löschen ihre leeren Platzhalter-Brauereien restlos. Echten Brauern weisen wir `app_mode = 'brewer'` zu.

### 2. Anpassung des Frontends (Der neue Flow)

Die kognitive Dissonanz nach dem Login wird restlos entfernt:

- **Der Post-Login-Redirect:** Beim Login checkt das System den `app_mode`.
  - Ist es ein `drinker` -> Weiterleitung auf `/my-cellar` (Dashboard für Scans & Gamification).
  - Ist es ein `brewer` -> Weiterleitung auf `/dashboard` (Profi-Werkzeuge).
- **Das B2C-Onboarding reparieren:** Beim Scannen einer Flasche (`/b/[id]`) und der anschließenden Registrierung wird unsichtbar der Parameter `intent: 'drinker'` übergeben. Der Nutzer wird dadurch nach dem Login direkt in die Gamification-Welt geleitet, ohne jemals den "Erstelle deine Brauerei"-Screen zu sehen.

### 3. Die Brücke zwischen den Welten bauen ("Der Flip")

Wie bei Airbnb ("Become a Host") bauen wir einen prominenten Button in das Drinker-Profil (`/my-cellar`) ein. Hier platzieren wir unseren genialen Aufruf:

> **"Werde vom Genießer zum Macher: Gründe deine eigene Brauerei"**

Erst wenn dieser Button geklickt wird, triggern wir den B2B-Funnel (Abfrage nach Brauerei-Namen, Equipment-Profilen etc.) und der Account wird zum vollwertigen `brewer` hochgestuft.
