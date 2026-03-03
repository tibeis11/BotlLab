# Roadmap: Manuelle Content Moderation (V2 - Secure & Strict)

> **Status:** ✅ Abgeschlossen (Completed)
> **Date:** 22.01.2026

## Übersicht

Implementierung eines rechtssicheren und manipulationsgeschützten "Human-in-the-Loop" Moderationssystems.

**Sicherheitsziele:**

1.  **Manipulationsschutz:** Änderungen an Bild-URLs erzwingen _immer_ einen neuen Review (per Datenbank-Trigger). ✅
2.  **Keine Leichen im Keller:** Abgelehnte Bilder werden physisch aus dem Storage gelöscht. ✅
3.  **Auditing:** Jede Moderationsentscheidung wird protokolliert (Wer, Wann, Warum). ✅
4.  **Rechtssicherheit:** User stimmt vor Upload explizit den Richtlinien zu. ✅
5.  **Sichtbarkeit:** Ungeprüfte Inhalte sind für die Öffentlichkeit unsichtbar. ✅

---

## Phase 1: Datenbank (Erweitert) - ✅ Fertig

Wir benötigen detaillierteres Tracking als nur einen Status.

### 1.1 Tabelle `brews` erweitern

- Spalten `moderation_status`, `moderation_rejection_reason`, `moderated_at`, `moderated_by` hinzugefügt.
- Migration: `20260121_moderation_schema.sql` (Angewendet)

### 1.2 Sicherheits-Trigger (Anti-Bypass)

- Trigger `handle_brew_image_change` implementiert.
- Trigger setzt Status auf `pending`, wenn sich die `image_url` ändert.

---

## Phase 2: Backend & Storage (Secure) - ✅ Fertig

### 2.1 Storage Policy

- "Clean Storage" Strategie implementiert: 1 Rezept = 1 Bild.
- Altes Bild wird vor neuem Upload gelöscht.
- Cache-Busting (`?t=...`) implementiert.

### 2.2 Server Actions (`actions/moderation-actions.ts`)

- `auditImage` Action implementiert.
- Physisches Löschen (`storage.remove`) bei `rejectBrew` implementiert.
- Fallback auf Default-Label bei Ablehnung.

---

## Phase 3: Frontend & UX - ✅ Fertig

### 3.1 Legal Checkbox (Upload Dialog)

- `LegalModal` in `BrewEditor` integriert. User muss zustimmen.

### 3.2 Anzeige-Logik (Feedback Loops)

- **Editor:** Zeigt gelben Banner (Pending) oder roten Banner (Rejected + Grund).
- **Public (Brew Card):**
  - Pending: Filtert/Unsichtbar in Feeds. Zeigt Default Placeholder.
  - Rejected: Zeigt Default Label (Safe). Fallback auf Placeholder.
  - Approved: Zeigt Bild.

### 3.3 Visibility Guards

- `DiscoverWidget`: Filtert `moderation_status != 'pending'`.
- `BreweryPage`: Filtert `moderation_status != 'pending'`.
- `RecipePage`: Hard-Check im UI, rendert Bild-URL nicht wenn Status `pending`.

---

## Phase 4: Admin Dashboard (`/admin/dashboard/moderation`) - ✅ Fertig

### Features

- Queue View implementiert.
- Quick Actions (Approve/Reject) implementiert.

---

## Phase 5: Brewery Profiles Extension - ✅ Fertig

Erweiterung des Systems auf **Brauerei-Logos**.

### 5.1 Datenbank & Backend

- Tabelle `breweries`: Spalten `moderation_status`, `moderated_at` etc. hinzugefügt.
- Trigger `handle_brewery_logo_change`: Setzt Status bei Logo-Update auf `pending`.
- `moderation-actions.ts`: Refactoring zu polymorphen Actions (`approveItem`, `rejectItem` für `brew` | `brewery`).

### 5.2 Admin Dashboard Update

- Anzeige von **Logo-Uploads** in der Queue.
- Unterscheidung zwischen Label/Cap (Rezept) und Logo (Profil).

### 5.3 Frontend Visibility Guards

- **Settings Page:** Zeigt gelben "In Prüfung"-Banner für den Owner.
- **Public Profiles:** Fallback auf Default-Icon, solange Logo `pending` ist.
- **Widgets & Discover:** Filtert Logos in Übersichten (`DiscoverWidget`, `BreweryPage`), wenn nicht approved.

---

## Abschlussbericht

Das Moderationssystem ist vollständig implementiert und "scharf" geschaltet. Es gibt keine bekannten Lücken ("Gaps") in der Sichtbarkeit von ungeprüften Inhalten mehr (sowohl für Rezepte als auch für Brauerei-Profile).
