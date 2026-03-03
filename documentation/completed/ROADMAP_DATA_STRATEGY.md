# Roadmap: Data Strategy & Monetization (Analytics)

**Status:** ✅ **Phase 0 & 1 Implemented** (Admin Analytics Live)  
**Datum:** 20.01.2026  
**Ziel:** Transformation der Plattform zu einer datengetriebenen "Business-Plattform" unter strikter Einhaltung von DSGVO und Nutzervertrauen.

---

## 1. Vision & Strategie

Um BotlLab langfristig zu monetarisieren, müssen wir Nutzerverhalten verstehen. Wir setzen dabei auf **First-Party Analytics** (keine Datenweitergabe an Dritte) mit Fokus auf Transparenz.

- **Identifizierung von Monetarisierungs-Triggern:** Wann stößt der Nutzer an Limits?
- **Feature-Nutzung:** Was nutzen Power-User?
- **Privacy-First:** Von "Kein Tracking" zu "Transparente interne Analyse".

---

## 2. Phase 0: Legal Compliance & User Trust (Voraussetzung)

Bevor technisch getrackt wird, muss die rechtliche Basis stehen. Transparenz schafft Vertrauen.

### 2.1 Cookie-Banner & Texte Update

- **Banner:** Textänderung von "Keine Tracker" zu "Kein Drittanbieter-Tracking". Hinweis auf anonyme Nutzungsanalyse zur Produktverbesserung. Granulare Auswahl (Essenziell vs. Analyse) ist optional, aber empfohlen.
- **Privacy Policy:**
  - Neue Sektion "Interne Nutzungsanalyse" (Zweck: Systemstabilität, Feature-Optimierung, Limit-Checks).
  - Klarstellung: Keine Weitergabe an Werbenetzwerke. Daten bleiben auf unseren Servern (Supabase).
  - Rechtsgrundlage: Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) für Produktverbesserung, mit Widerspruchsrecht.

### 2.2 Opt-Out Implementierung

- **Profil-Einstellung:** Neuer Toggle im User-Profil (`/dashboard/account`): "Helfe BotlLab zu verbessern (Anonyme Nutzungsdaten senden)".
  - _Standard:_ AN (Opt-Out Prinzip basierend auf Legitimate Interest) oder AUS (Opt-In), je nach Risikobereitschaft. Empfehlung: Opt-Out.
- **Technik:** Speicherung des Status in der `profiles` Tabelle (`analytics_opt_out: boolean`).

### 2.3 Daten-Löschkonzept

- **Retention Policy:** Rohdaten in `analytics_events` werden nach 12 Monaten gelöscht oder stark aggregiert.
- **User Rights:** Bei Account-Löschung (`delete-account`) müssen auch die verknüpften Analytics-Events anonymisiert (User-ID auf NULL setzen) oder gelöscht werden.

---

## 3. Phase 1: Tracking-Infrastruktur (Foundation)

Implementierung der technischen Erfassung in Supabase.

### 3.1 Tabelle: `analytics_events`

Eine flexible Tabelle für Aktionen.

| Spalte       | Typ           | Beschreibung                                                    |
| :----------- | :------------ | :-------------------------------------------------------------- |
| `id`         | `uuid`        | PK                                                              |
| `created_at` | `timestamptz` | Zeitstempel                                                     |
| `event_type` | `text`        | Art des Events (z.B. `limit_reached`, `brew_created`)           |
| `category`   | `text`        | Kategorie (`monetization`, `ux`, `system`)                      |
| `payload`    | `jsonb`       | Kontext (z.B. `{"limit": 10, "current": 10, "tier": "garage"}`) |
| `user_id`    | `uuid`        | Referenz zum User (NULL bei Opt-Out oder Anonym)                |
| `user_agent` | `text`        | Zur Erkennung von Gerätetypen (Mobile/Desktop) - _keine IP!_    |

**Security (RLS):**

- `insert`: Authenticated Users (nur eigene User-ID).
- `select`: Nur Service-Role (Admins). Niemand sonst kann Nutzungsdaten lesen.

### 3.2 Backend Service (`analytics-actions.ts`)

Zentrale Server Action `trackEvent(type, payload)`.

- **Logic Check:** Vor dem Speichern wird geprüft: Hat der User ein Opt-Out (`analytics_opt_out === true`) gesetzt?
  - _Wenn Ja:_ Entweder gar nicht speichern ODER `user_id` weglassen (echte Anonymisierung).
- **Sanitization:** Keine IPs speichern.

### 3.3 Wichtige Trigger-Events (Was wir messen)

1.  **Upgrade Pressure (Monetarisierung)**
    - `limit_reached_brews`: User klickt "Neues Rezept", wird blockiert.
    - `limit_reached_members`: Versuch, Teamlimit zu überschreiten.
2.  **Engagement & Feature Adoption**
    - `label_generated`: PDF Export genutzt (Werttreiber).
    - `qr_scan_external`: Flasche wurde gescannt.
3.  **Churn Risk**
    - `long_inactivity`: (Berechnet aus Abwesenheit events).

---

## 4. Phase 2: Aggregation & Intelligence

Visualisierung der Daten im Admin-Bereich.

### 4.1 Admin Dashboard (`/admin`)

Ein geschützter Bereich, nur für Super-Admins sichtbar.

- **Technik:** Nutzung von `recharts` für Graphen.
- **Metriken:**
  - _Upgrade Needs:_ Anzahl `limit_reached` Events pro Woche.
  - _Feature Health:_ Nutzungskurve neuer Features.

### 4.2 SQL Views

Materialized Views für Performance (z.B. `stats_daily_limits`).

---

## 5. Nächste Schritte (Action Plan)

1.  [ ] **Legal & DB Update:**
    - `profiles` Tabelle um `analytics_opt_out` erweitern.
    - Opt-Out Toggle im Profil-UI bauen.
    - Privacy Policy Texte updaten.
2.  [ ] **Infrastructure:**
    - `analytics_events` Tabelle anlegen.
    - `trackEvent` Action implementieren.
3.  [ ] **Integration:**
    - Tracking in `RecipeCreate` und `Inventory` einbauen.
4.  [ ] **Dashboard:**
    - Admin-Page aufsetzen.
