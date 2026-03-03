# Interne Moderations-Fristdokumentation (DSA)

**Erstellt:** 22. Feb 2026  
**Status:** Gültig  
**Grundlage:** Digital Services Act (DSA), Art. 16 (Notice-and-Takedown)

---

## Zweck

Dieses Dokument definiert die internen Bearbeitungsfristen für gemeldete Inhalte auf der BotlLab-Plattform, gemäß den Anforderungen des Digital Services Act (DSA) und dem deutschen Netzwerkdurchsetzungsgesetz (NetzDG).

---

## Meldewege

Nutzer können Inhalte melden über:
- **Report-Funktion im Forum** (3-Punkt-Menü → "Melden") auf jedem Thread/Post
- **E-Mail:** [support@botllab.de](mailto:support@botllab.de)
- **Admin-Panel:** `/admin` → Reports-Übersicht

Alle Meldungen werden in der Datenbank-Tabelle `reports` erfasst.

---

## Bearbeitungsfristen (SLA)

| Inhaltskategorie | Frist | Maßnahme |
|---|---|---|
| **Rechtswidrige Inhalte** (Volksverhetzung, CSAM, Aufruf zu Gewalt, Terrorismus) | **≤ 24 Stunden** | Sofortige Sperrung des Inhalts + Kontos, ggf. Strafanzeige |
| **Urheberrechtsverletzungen** (Copyright-Meldung nach §§ 97 ff. UrhG) | **≤ 24 Stunden** | Notice-and-Takedown: Inhalt entfernen, Nutzer informieren |
| **Sonstige AGB-Verstöße** (Spam, Beleidigungen, Fehlinformationen, Werbung) | **≤ 7 Tage** | Prüfung, ggf. Löschung / Verwarnung des Nutzers |
| **Technische Bugs / Fehlmeldungen** | **≤ 14 Tage** | Prüfung ohne Eskalation |

---

## Eskalationsprozess

```
Meldung eingeht
    │
    ▼
Automatische Erfassung in reports-Tabelle (status: 'pending')
    │
    ▼ (innerhalb 4h bei rechtswidrigen Inhalten, 24h bei sonstigen)
Initiale Prüfung durch Admin
    │
    ├─ Eindeutig rechtswidrig → sofortige Sperrung, report.status = 'resolved'
    │
    ├─ Grenzfall → weitere Prüfung, report.status = 'under_review'
    │
    └─ Kein Verstoß → Meldung abgelehnt, report.status = 'dismissed'
```

---

## Nutzerkommunikation

- **Melder:** Erhält keine automatische Benachrichtigung über das Ergebnis (Stand: Feb 2026 — geplantes Feature)
- **Gemeldeter Nutzer:** Erhält E-Mail-Benachrichtigung bei Löschung seines Inhalts (Template: `report-resolved.html`)

---

## Aufbewahrung

- Meldungen und Entscheidungen werden in der Datenbank-Tabelle `reports` dauerhaft protokolliert
- Gelöschte Inhalte werden als soft-delete markiert (Inhalt wird auf NULL gesetzt), nicht physisch gelöscht, um Dokumentation zu gewährleisten
- Aufbewahrungsfrist der Meldungshistorie: **3 Jahre** (entsprechend gesetzlicher Vorgaben)

---

## Verantwortlichkeit

| Rolle | Verantwortung |
|---|---|
| **BotlLab Admin** | Tägliche Prüfung der reports-Tabelle, Eskalation bei Bedarf |
| **Entwickler** | Technische Umsetzung von Moderationstools, Sicherung der Logs |

---

## Technische Referenzen

- **Reports-Tabelle:** `public.reports` in Supabase
- **Admin-Panel:** `app/admin/` → Reports-Sektion
- **E-Mail-Template:** `emails/report-resolved.html`
- **DSA-Grundlage:** Art. 16 DSA (Notice-and-Takedown), Art. 17 DSA (Interne Beschwerdemechanismen)

---

## Änderungshistorie

| Datum | Änderung | Autor |
|---|---|---|
| 22. Feb 2026 | Ersterfassung | BotlLab Team |
