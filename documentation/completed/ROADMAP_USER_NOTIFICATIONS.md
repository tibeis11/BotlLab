# Roadmap: User Notifications System

**Status:** ✅ Completed (2026-01-31)
**Priority:** Medium (User Experience / Trust)
**Dependencies:** Manual Moderation (Done), Reporting System (Done)

---

## 📋 Übersicht

Aktuell finden Moderations-Entscheidungen und Meldungs-Bearbeitungen "stumm" statt. Der Nutzer erfährt nicht, ob sein gemeldetes Bier gelöscht wurde oder ob sein hochgeladenes Logo akzeptiert wurde, es sei denn, er prüft es manuell.

Wir müssen ein **Benachrichtigungs-System** implementieren, um den Feedback-Loop zu schließen.

---

## 📧 Anwendungsfälle (Scope)

### 1. Feedback für Melder ("Melden"-Funktion)

Wenn ein Nutzer einen Inhalt meldet (Spam, NSFW etc.), soll er Feedback erhalten, sobald der Admin die Meldung bearbeitet hat.

- **Trigger:** Admin setzt Status auf `resolved` (Erledigt) oder `dismissed` (Ignoriert).
- **Empfänger:** Der Ersteller des Reports (`reporter_id`).
- **Kanal:** E-Mail.
- **Inhalt:**
  - _Betreff:_ Update zu deiner Meldung auf BotlLab.
  - _Body:_ "Danke für deine Wachsamkeit. Wir haben deine Meldung vom [Datum] geprüft und entsprechende Schritte eingeleitet." (Neutral formuliert, keine Details zur Strafe).

### 2. Feedback für Content-Ersteller (Moderation)

Wenn ein Nutzer ein Brauerei-Logo oder Rezept-Bild hochlädt, landet es oft in einer `pending`-Warteschlange.

- **Trigger:** Admin akzeptiert (`approved`) oder lehnt ab (`rejected`).
- **Empfänger:** Der Besitzer der Brauerei oder des Rezepts.
- **Kanal:** E-Mail + In-App (Optional).
- **Inhalt:**
  - _Fall Approval:_ "Dein Bild für [Name] ist jetzt live!"
  - _Fall Rejection:_ "Dein Bild für [Name] konnte nicht veröffentlicht werden. Bitte beachte unsere Richtlinien."

---

## 🛠 Technische Umsetzung

### Architektur

Da diese Aktionen asynchron passieren, bietet sich eine Lösung via **Supabase Edge Functions** oder direkter Integration in die **Server Actions** an.

### Option A: Server Actions (Einfacher Start)

Direkt in `content-reporting-actions.ts` und `moderation-actions.ts` den E-Mail-Versand auslösen, nachdem das DB-Update erfolgreich war.

- _Pro:_ Einfach zu implementieren, kein separater Deno-Service nötig.
- _Con:_ Macht die User-Interaktion minimal langsamer (warten auf E-Mail-API).

### Option B: Database Webhooks (Robuster)

Ein Database Trigger ruft eine Edge Function auf, wenn sich `moderation_status` ändert.

- _Pro:_ Entkoppelt, funktioniert auch bei manuellen DB-Änderungen.
- _Con:_ Komplexeres Setup.

### Provider

- **Service:** Resend (bereits für Auth geplant/genutzt?) oder AWS SES.
- **Templates:** React-Email für saubere HTML-Mails.

---

## ✅ Abgeschlossen

- [x] Email-Provider (Resend) eingerichtet.
- [x] Email-Templates erstellt (`ReportResolved`, `ImageApproved`, `ImageRejected`, `ForumReply`).
- [x] Integration in `lib/actions/content-reporting-actions.ts`.
- [x] Integration in `lib/actions/moderation-actions.ts` (Image Moderation).
- [x] In-App Notifications für alle Moderations-Ereignisse.

### Forum & Social

- [x] In-App Notifications für Forum-Antworten & @autor Mentions.
- [x] Frontend: Bell-Widget im Header (aktiviert).
- [x] E-Mail-Benachrichtigung für Forum-Antworten implementiert.

---

---

## 📖 Technische Dokumentation der Implementierung

Die Implementierung des Benachrichtigungssystems wurde am 31.01.2026 abgeschlossen. Das System bietet eine duale Strategie: **In-App Notifications** für Echtzeit-Feedback innerhalb der Anwendung und **E-Mail-Benachrichtigungen** via Resend für externe Erreichbarkeit.

### 1. Core Services & Infrastruktur

#### **E-Mail Service (`lib/email.ts`)**

Ein zentraler Service für den E-Mail-Versand wurde implementiert. Er nutzt das **Resend SDK** und lädt lokale HTML-Templates.

- **Funktion:** `sendEmail` ersetzt Platzhalter im Format `{{variable}}` in den HTML-Dateien.
- **Helper-Funktionen:** Spezifische Wrapper wie `sendImageApprovedEmail`, `sendImageRejectedEmail`, `sendReportResolvedEmail` und `sendForumReplyEmail` vereinfachen den Aufruf in den Actions.

#### **Notifications Action (`lib/actions/notification-actions.ts`)**

Ein neuer Server-Action-Service zur Erstellung von Datenbank-Benachrichtigungen.

- **Admin-Client:** Nutzt den `SUPABASE_SERVICE_ROLE_KEY`, um Benachrichtigungen für andere Nutzer zu erstellen (umgeht RLS-Einschränkungen beim Einfügen).

#### **Supabase Server Helper (`lib/supabase-server.ts`)**

Erweiterung um `createAdminClient()`, um konsistenten Zugriff auf administrative Funktionen über den Service-Role-Key zu ermöglichen.

### 2. Backend Integration (Server Actions)

Die Benachrichtigungslogik wurde direkt in die betroffenen Workflows integriert:

- **Bild-Moderation (`lib/actions/moderation-actions.ts`):**
  - Beim `approveItem` oder `rejectItem` wird nun der Ersteller des Inhalts (Brew oder Brewery-Besitzer) ermittelt.
  - Es wird sowohl eine In-App Notification (`image_approved` / `image_rejected`) als auch eine E-Mail versendet.
- **Reporting System (`lib/actions/content-reporting-actions.ts`):**
  - Wenn ein Admin eine Meldung auf `resolved` setzt, erhält der Melder eine Benachrichtigung (`report_resolved`) und eine Bestätigungs-E-Mail.
- **Forum Workflow (`lib/actions/forum-actions.ts`):**
  - Bei Antworten oder @autor Mentions wird der Thread-Autor benachrichtigt.
  - Inklusive E-Mail-Benachrichtigung mit Vorschau des Beitrags.

### 3. Frontend & UI

#### **Header & Notification Bell**

- **`NotificationBell.tsx`:** Erweitert um das Rendering der neuen Typen. Icons und Links wurden für die neuen Ereignisse angepasst (z.B. Direktlink zum genehmigten Bier).
- **`UserNotificationContext.tsx`:** Das Typ-System wurde um `image_approved`, `image_rejected` und `report_resolved` erweitert, um Typsicherheit im gesamten Frontend zu gewährleisten.

### 4. E-Mail Templates (`emails/`)

Folgende Templates wurden im Corporate Design (Dark Mode / Cyan / Zinc) erstellt:

- `image-approved.html`: Bestätigung mit Link zum Item.
- `image-rejected.html`: Ablehnung mit Angabe des Grundes und Link zur Bearbeitung.
- `report-resolved.html`: Feedback an den Melder (neutral formuliert).
- `forum-reply.html`: Benachrichtigung über neue Foren-Beiträge mit Textvorschau.

### 5. Sicherheit & Performance

- Alle E-Mail-Versand-Operationen laufen **asynchron** innerhalb der Server Actions (try-catch Blöcke), um den Hauptprozess bei Fehlern im Mail-Service nicht zu blockieren.
- Der Zugriff auf Nutzer-E-Mails erfolgt über den Admin-Client (`auth.admin.getUserById`), da E-Mail-Adressen in Supabase Auth geschützt sind.

---

**Status: Alle Systeme sind live und einsatzbereit.**
