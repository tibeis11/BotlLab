# Dokumentation: Like-System (Brews)

**Status:** ✅ **Abgeschlossen** (Live)  
**Datum:** 20.01.2026

Dieses Dokument beschreibt die technische Umsetzung des "Like"-Systems für Rezepte (`brews`) in der BotlLab-App.

---

## 1. Architektur-Entscheidungen

### 1.1 Scope

Das Like-System ist **exklusiv f�r Rezepte** (`brews`) konzipiert.
_Begr�ndung:_ Forum-Posts erhalten bei Bedarf eigene Tabellen.

### 1.2 Privacy & Security (RLS)

- **Sichtbarkeit:** "Private View". Ein User kann nur seine **eigenen** Likes aus der `likes`-Tabelle lesen.
- **Datenschutz:** Es ist �ffentlich NICHT einsehbar, _wer_ ein Rezept geliked hat.
- **Konsequenz:** Client-seitiges Z�hlen (`select count(*) from likes`) ist nicht m�glich. Die Gesamtanzahl muss in der `brews` Tabelle liegen.

---

## 2. Datenbank-Schema

### 2.1 Tabelle: `likes`

```sql
table likes (
  id uuid primary key,
  user_id uuid references auth.users,
  brew_id uuid references brews,
  constraint unique_like unique(user_id, brew_id)
);
```

### 2.2 Tabelle: `brews` (Erweiterung)

- `likes_count` (int, default 0): Wird via Trigger automatisch aktualisiert.

---

## 3. Implementierungs-Phasen

### Phase 2: Performance & Privacy (Abgeschlossen ✅)

1.  **Denormalisierung:** `likes_count` zur `brews` Tabelle hinzufügen.
2.  **Trigger:** `ON INSERT` / `ON DELETE` aktualisieren `likes_count`.
3.  **RLS Hardening:** `SELECT` Policy auf `auth.uid() = user_id` beschränken.

### Phase 3: Social Features (🚧 In Arbeit)

- **Benachrichtigungen**: Tabelle `notifications` erstellen & Trigger für Likes. (Abgeschlossen ✅) including UI (Bell in Header, AdminHeader, SquadHeader).
- **Feed**: Eintrag in `brewery_feed` (Future).
- **Favorites Page:** Eigene gelikete Rezepte anzeigen (Next Step).

---

## 4. API & Frontend

### Fetching (Lesen)

- **Liste:** `likes_count` wird direkt mit `brews` geladen.
- **Eigener Status:** "Bulk Fetching" der eigenen Like-IDs oder `user_has_liked()` Computed Field.

### Mutation (Schreiben)

- **Action:** `toggleBrewLike` -> Insert `likes` -> Trigger update `brews` -> Revalidate.
