# ROADMAP: „Rezept vervollständigen" – Completeness Hints

**Abhängigkeit:** Setzt den internen Recipe Quality Score voraus (siehe `ROADMAP_discover_page.md` Phase 2.5)  
**Ziel:** Nutzer motivieren ihre Rezepte besser zu dokumentieren — ohne Zwang, ohne Druck, mit echtem Mehrwert.  
**Philosophie:** Kein Dark Pattern. Der Nutzer entscheidet. Wir zeigen nur, was möglich wäre.

---

## Konzept

Wenn ein Nutzer sein eigenes Rezept öffnet oder bearbeitet, sieht er eine dezente, nicht-aufdringliche Anzeige:  
**„Dein Rezept ist zu X% vollständig"** — mit konkreten Hinweisen was noch fehlt.

Der Clou: Der Nutzer weiß nicht, dass wir dahinter einen Ranking-Score haben. Er sieht nur, dass sein Rezept besser gefunden werden würde.

---

## UX-Konzept

### Wo wird es angezeigt?
1. **Auf der eigenen Rezept-Detailseite** — kleine Leiste oben, nur für den Besitzer sichtbar
2. **Im Rezept-Editor** — als Sidebar-Element oder Fortschrittsanzeige während dem Bearbeiten
3. **Im Dashboard** — optionaler Widget „Rezepte die du vervollständigen könntest" (max. 3 Vorschläge)

### Wie sieht es aus?
- Kleiner Banner: `✦ Dein Rezept könnte öfter gefunden werden` mit Expand-Pfeil
- Ausgeklappt: Liste mit konkreten fehlenden Feldern als anklickbare Chips:
  - `+ IBU hinzufügen` → öffnet direkt das richtige Feld im Editor
  - `+ Beschreibung schreiben` → Fokus auf Beschreibungs-Textarea
  - `+ Bild hochladen` → öffnet Upload-Dialog
- Jeder Chip zeigt wie viele Punkte er bringt: `+ IBU hinzufügen (+5 Punkte)`
- Fortschrittsbalken: `●●●●●○○○○○ 52 / 100`

### Tonalität
- **Nicht:** „Dein Rezept ist unvollständig ⚠️"
- **Ja:** „Noch ein paar Details und dein Rezept wird öfter entdeckt ✨"
- Hilft, nicht kritisiert.

---

## Technische Umsetzung

### Phase A – Score-Berechnung (Voraussetzung)
- [ ] `quality_score` Spalte und Trigger aus `ROADMAP_discover_page.md Phase 2.5` müssen fertig sein
- [ ] Neue Hilfsfunktion: `get_brew_score_breakdown(brew_id)` → gibt nicht nur den Score zurück, sondern auch **welche Felder fehlen**
  ```sql
  -- Gibt zurück z.B.:
  -- { score: 52, missing: ['ibu', 'description', 'image', 'fg'] }
  ```

### Phase B – Frontend-Komponente
- [ ] Neue Komponente `RecipeCompletenessHint.tsx`
- [ ] Props: `brewId`, `currentScore`, `missingFields[]`
- [ ] Nur rendern wenn: `currentUserId === brew.user_id` (nur Besitzer sieht es)
- [ ] Collapsed by default, expandierbar mit Animation
- [ ] Jedes `missingField` hat eine feste Aktion (deep-link in Editor-Tab oder Feld-Fokus)

### Phase C – Integration
- [ ] In `app/brew/[id]/page.tsx` einbauen (Rezept-Detailseite)
- [ ] In `app/brew/[id]/edit/page.tsx` als Sidebar-Element einbauen
- [ ] Optional: Dashboard-Widget das die 3 eigenen Rezepte mit niedrigstem Score listed

### Phase D – Analytics (optional, Privacy-konform)
- [ ] Tracken ob Nutzer nach dem Hint tatsächlich das Rezept bearbeiten
- [ ] Aggregiert messen: Verbessert sich der Ø-Score der Plattform über Zeit?

---

## Gamification-Erweiterung (Vision)

Wenn der Grundfeature gut angenommen wird, kann man das ausbauen:

- **Score-Meilensteine:** Bei 50, 75, 100 Punkten eine kleine Gratulations-Animation
- **„Vollständig"-Badge** auf der Rezeptkarte (nur sichtbar für den Besitzer) wenn Score ≥ 90
- **Leaderboard der best-dokumentierten Rezepte** (opt-in, Premium) — motiviert zur Qualität
- **Monatliche „Completeness Challenge":** Wer im Monat am meisten verbessert, wird featured

---

## Beispiel-Breakdown je Rezept

```
Rezept: "Münchner Hefeweizen"
──────────────────────────────────────────
Score: 62 / 100

✅ ABV angegeben           +5
✅ IBU angegeben           +5
✅ EBC angegeben           +5
✅ OG angegeben            +5
✅ Ausschlagvolumen        +5
✅ Stil angegeben          +5
✅ ≥ 2 Malze              +5
✅ ≥ 1 Hopfen             +5
✅ Hefe angegeben          +5

❌ FG / Zielextrakt fehlt  +5  → „Ziel-FG hinzufügen"
❌ Beschreibung zu kurz    +10 → „Beschreibung ausbauen"
❌ Kein eigenes Bild       +5  → „Bild hochladen"
❌ Noch nicht gebraut      +5  → (automatisch, wenn jemand kopiert)
❌ Noch keine Bewertung    +10 → (automatisch)
──────────────────────────────────────────
Potenzial: +35 Punkte möglich
```

---

## Priorisierung

| Schritt | Aufwand | Abhängigkeit |
|---|---|---|
| Score-Breakdown-Funktion in Supabase | S | Quality Score muss existieren |
| `RecipeCompletenessHint.tsx` Komponente | M | Score-Breakdown |
| Integration in Rezept-Detailseite | S | Komponente |
| Integration in Rezept-Editor | M | Komponente |
| Dashboard-Widget | M | Komponente |
| Gamification / Meilensteine | L | Alles oben |

---

## Status
`🔮 Backlog — wartet auf Fertigstellung von ROADMAP_discover_page.md Phase 2.5`
