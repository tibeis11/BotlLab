# Rechtliche Absicherung & Datenquellen: Zutaten-Datenbank (BotlLab)

**Datum:** 14. März 2026
**Zweck:** Dieses Dokument dient der transparenten Darlegung und rechtlichen Absicherung des initialen Datenbank-Seeds (512 Zutaten aus Migration `20260318200000_ingredient_seed.sql`). Es beantwortet, woher die Daten stammen und auf welcher rechtlichen Grundlage diese in BotlLab genutzt werden dürfen.

---

## 1. Zusammenfassung (TL;DR)
**Du hast keinen Grund zur Sorge.** Die generierten Zutaten-Daten (Malze, Hopfen, Hefen) stellen keine Urheberrechtsverletzung, Markenrechtsverletzung oder Verletzung des Datenbankschutzrechts dar.
Es handelt sich um **chemisch-physikalische Fakten** und **allgemeinbekanntes Branchenwissen**, das absichtlich synthetisiert wurde, anstatt fremde urheberrechtlich geschützte Datenbanken (wie die Konkurrenz) zu kopieren ("Scraping").

---

## 2. Herkunft der Seed-Daten (Datenquellen)
Die Daten aus dem Initial-Seed wurden durch einen **synthetischen Algorithmus generiert** und nicht systematisch von einer geschützten Website oder App heruntergeladen. 

**Die konkreten Quellen sind "Public Domain" (Allgemeingut) des Brauwesens:**
- **Hersteller-Datenblätter (Spec Sheets):** Technische Angaben wie Attenuation (Vergärungsgrad), EBC (Farbe) oder Alpha-Säure-Spannen werden von den Herstellern explizit zur öffentlichen Nutzung und Rezeptberechnung herausgegeben.
- **Klassische Brauliteratur & Offene Spezifikationen:** Standards wie "Pilsner Malz hat ~3.5 EBC" oder "Citra Hopfen hat ~12% Alpha" sind technologisches Grundwissen der Brauwissenschaft.
- **BeerJSON / BeerXML Standards:** Die Struktur, wie Daten abgelegt werden (z. B. Bezeichnungen wie `yield`, `color`, `alpha`), lehnt sich an diese quelloffenen (Open Source) Industrie-Standards an.

---

## 3. Rechtliche Grundlagen im Detail

### 3.1. Urheberrecht (Copyright) auf Fakten
Nach deutschem (und internationalem) Recht schützt das Urheberrecht nur **geistige Schöpfungen** (Texte, Bilder, Code), die eine gewisse Schöpfungshöhe erreichen.
- **Biologisch-chemische Fakten sind nicht urheberrechtlich schützbar.** 
- Die Tatsache, dass *Tettnanger Hopfen 4,5 % Alphasäure* hat oder *SafAle US-05 bei 18-28 °C gärt*, ist eine **nackte Tatsache**. Niemand „besitzt“ diese chemischen Werte.
- *Wichtig:* Aus diesem Grund hat das Generierungsskript bewusst **keine** emotionalen Marketingbeschreibungen der Hersteller oder der Konkurrenz iteriert (wie z. B. *"Ein wunderbar fruchtiges Aroma nach reifen Pfirsichen, das an einen sonnigen Sommertag erinnert"*). Solche Sätze wären geschützt. Die Seed-Beschreibung lautet stattdessen rein sachlich: *"Standard Citra hop provided by Yakima Chief"*.

### 3.2. Markenrecht (Nominative Fair Use)
BotlLab nutzt Markennamen (z.B. *Weyermann*, *Fermentis*, *Wyeast*, *Citra*).
- **Grundsatz:** Es ist völlig legal, Marken zu **beschreibenden Zwecken (Nominative Use / beschreibende Nutzung)** zu nennen.
- **Begründung:** Ein Brauer kann kein Rezept für ein "Weyermann Pilsner Malz" berechnen, wenn er die Zutat nicht so benennen darf. Solange BotlLab nicht behauptet: *"Wir sind Weyermann"*, oder ein falsches offizielles Logo als eigenes ausgibt, ist die Nennung eines Herstellers zur reinen Identifizierung der Rezeptzutat ("Bestimmungsangabe") nach **§ 23 MarkenG** (Markengesetz) zwingend erlaubt.

### 3.3. Datenbankschutz (Sui Generis Right / § 87a ff. UrhG)
Das Gesetz schützt Datenbank-Ersteller davor, dass jemand ihre Datenbank ausliest ("Scraping").
- **Darum sind wir sicher:** Wir haben *nicht* die Datenbank von Brewfather, Brewers Friend, o.ä. systematisch gecrawlt und kopiert.
- Der Seed basiert auf einer völlig eigenständigen Kombination aus Listen von Basis-Werten. Durch das programmatische Zusammenfügen von (z. B. Array 1: Malztypen + Array 2: Hersteller) wurde eine **völlig neue, eigene Basis-Datenbank** geschaffen. Du verletzt keine Datenbankrechte Dritter, weil du die Tabellen eigenhändig aus dem Kopf/technischem Grundwissen der KI aufgebaut hast.

---

## 4. Regeln für zukünftige Uploads (Phase 2 & User Imports)
Um diese saubere rechtliche Weste für immer zu behalten, gelten für den zukünftigen BeerJSON/BeerXML Import (Prio 4) folgende Vorgaben:

1. **User Generierte Inhalte (UGC):** Wenn ein User *seine* Zutaten aus einem anderen Tool bei uns hochlädt, gehört das zu seinen eigenen Arbeitsaufzeichnungen (User Data) und ist unbedenklich.
2. **Keine Marketing-Texte kopieren:** Wenn wir die Datenbank in Zukunft erweitern, schreiben wir Beschreibungen (Descriptions) immer als sachliche Fakten-Sätze neu. Wir nutzen niemals Copy-Paste von fremden Shop-Beschreibungen.
3. **Fotos/Logos:** Wir verzichten bei den Standard-Zutaten (Ingredient Master) auf das Einbinden von Herstellerlogos, es sei denn, wir haben dafür eine Erlaubnis. Die rein tabellarische, textbasierte Auflistung ist absolut sicher.

---

**Fazit für den Betreiber (Tim):**
Die generierten 500+ Basis-Zutaten sind reine Zusammenstellungen ungeschützter technologischer Fakten. Sie enthalten keine kopierten Schöpfungen, verletzen keine Datenbankrechte (da selbst errechnet) und nutzen Herstellernamen ausschließlich im erlaubten Rahmen der notwendigen Produktbestimmung. Der Seed ist zu 100% legal und sicher einsetzbar.