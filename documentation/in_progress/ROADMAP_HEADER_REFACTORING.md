# Roadmap: Global Header Refactoring & 3-Welten-Farbkonzept

## 🎯 Ausgangssituation & Ziel
Aktuell existieren im Projekt **6 Header-Artfakte** (davon 4 vollwertige Navigationskomponenten), die insgesamt über 2.200 Zeilen Code umfassen:

| Datei | Zeilen | Kontext | Verwendet in |
|---|---|---|---|
| `app/components/Header.tsx` | 712 | Öffentlich / Universal | `/discover`, `/forum`, `/brew`, `/tools`, `/pricing`, `/` |
| `app/dashboard/components/AdminHeader.tsx` | 709 | Brewer Dashboard | `/dashboard`, `/account` (brewer) |
| `app/team/components/SquadHeader.tsx` | 558 | Team-Kontext | `/team/[id]/*` |
| `app/my-cellar/components/ConsumerHeader.tsx` | 318 | Consumer Dashboard | `/my-cellar`, `/account` (consumer) |
| `app/brew/[id]/components/MinimalStickyHeader.tsx` | ~50 | Minimal (kein Menü) | `/brew/[id]` – bleibt vorerst unverändert |
| `app/team/[id]/sessions/[id]/_components/SessionHeader.tsx` | ~80 | Minimal Kontext | Session-Detail-Seite – bleibt unverändert |

**Das Ziel:**
Ein einziger, zentraler `<GlobalHeader />` (Composition Pattern), der über Props (Slots) von kleinen "Wrapper"-Komponenten gesteuert wird. Der GlobalHeader kümmert sich automatisch um das neue **3-Welten-Farbkonzept** (Türkis/Cyan für User, Orange für Team, Lila für Public).

---

## 🏗 Architektur-Konzept (Future State)

Wir wechseln von "Fat Components" zu "Composition":

```tsx
// 1. Der Core (kümmert sich um Layout, Mobile-Menu State, Farben)
<GlobalHeader colorZone="team" mobileMenu={<MobileTeamNav />}>
  <DesktopNavLeft />
  <DesktopNavRight />
</GlobalHeader>

// 2. Die Wrapper (ersetzen die aktuellen riesigen Dateien)
export function SquadHeader() {
  return (
    <GlobalHeader colorZone="team" mobileMenu={<SquadMobile />}>
       <SquadTabs />
       <SquadActions />
    </GlobalHeader>
  )
}
```

---

## � Code-Analyse: Konkrete Probleme (Ist-Zustand)

### Problem 1: Inkonsistentes Supabase-Fetching (BUG-Risiko ⚠️)
Die vier Header verwenden **unterschiedliche Supabase-Clients**:
- `Header.tsx` + `SquadHeader.tsx` → `useSupabase()` Hook (reaktiv, Auth-aware)
- `ConsumerHeader.tsx` + `AdminHeader.tsx` → direktes `supabase`-Singleton-Import

Das Singleton-Pattern reagiert nicht korrekt auf Session-Changes (z.B. Tab-Wechsel, Token-Refresh). Alle Header müssen auf `useSupabase()` migriert werden.

### Problem 2: 4x doppelte `scrollbarCompensation`-Logik
Jeder Header hat identische Zeilen, die beim Öffnen des Mobile-Menüs die Scrollbar-Breite kompensieren (`window.innerWidth - document.documentElement.clientWidth`). Diese 8+ doppelten `useEffect`-Blöcke gehören in den `GlobalHeader` Core.

### Problem 3: Profil-Auto-Creating nur in `Header.tsx` (Fehlende Konsistenz)
Nur `Header.tsx` enthält Logik, um ein fehlendes Profil bei `PGRST116`-Error automatisch anzulegen (Fallback für alte Accounts). `AdminHeader.tsx`, `ConsumerHeader.tsx` und `SquadHeader.tsx` haben diesen Fallback NICHT. Das kann für bestimmte User zu einem Crash-Loop führen. Diese Logik muss in den neuen `useHeaderData()` Hook und gilt dann für alle.

### Problem 4: Logout-Handler divergiert
Jeder der 4 Header hat eine eigene `handleLogout`-Funktion. Sie sind nicht identisch – einige führen zusätzliche State-Resets durch. Das führt zu inkonsistentem Logout-Verhalten je nach Kontext.

### Problem 5: `Props API` der öffentlichen `Header.tsx` ist zu komplex
Die öffentliche `Header.tsx` hat bereits 5 Props (`breweryId`, `discoverSearchSlot`, `discoverMobileActions`, `forumSearchSlot`, `forumMobileActions`), die alle optionale `ReactNode` Slots für Spezialfälle sind. Das skaliert nicht. Der `GlobalHeader` sollte dieses Slot-Konzept vereinfachen und verallgemeinern.

---

## �🗺 Phasen-Planung

### Phase 1: Fundament & Data-Layer (Vorbereitung)
*Bevor wir UI neu bauen, müssen wir die Datenbeschaffung zentralisieren.*
- [ ] **`useHeaderData()` Hook erstellen** → `app/lib/hooks/useHeaderData.ts`
  - Holt `user`, `profile`, `activeBrewery`, `userBreweries`
  - Enthält die **Profil-Auto-Creation Logik** (PGRST116 Fallback aus `Header.tsx`)
  - Nutzt ausschließlich `useSupabase()` (kein direkter Singleton-Import)
  - Zentralisiert `handleLogout()` mit konsistenter State-Cleanup-Logik
  - Enthält `scrollbarCompensation` für Mobile-Menu (`isMobileMenuOpen`-Abhängigkeit)
- [ ] **`<GlobalMobileMenu />` auslagern** → `app/components/ui/GlobalMobileMenu.tsx`
  - Nimmt `colorZone`, `userLinks`, `teamLinks`, `publicLinks` als Props
  - Die 3 Farb-Zonen-Tabs (Personal/Team/Discover) sind direkt eingebaut
  - Kein Header importiert mehr eigenes Mobile-Menu-HTML

### Phase 2: Der `<GlobalHeader />` Core (Bau der Master-Komponente)
- [ ] **Basis-Gerüst bauen:** `app/components/ui/GlobalHeader/GlobalHeader.tsx` anlegen.
- [ ] **Props definieren:** 
  - `colorZone: 'personal' | 'team' | 'public'` (Übernimmt Hover-States, Mobile-Tab-Farben, etc.)
  - `leftContent?: ReactNode` (z.B. Logo + Desktop Links)
  - `centerContent?: ReactNode` (z.B. Searchbar)
  - `rightActions?: ReactNode` (z.B. Notifications, Avatar, Theme-Toggle)
  - `mobileContent?: ReactNode`
- [ ] **CSS & Styling:** Integration der 3-Welten-Logik direkt im Header (Orange für Team, Purple für Public, Cyan für Labor).

### Phase 3: Wrapper-Migration (Schrittweiser Austausch)
*Die alten Header werden nach und nach ihrer Logik beraubt und rufen nur noch den GlobalHeader auf.*
- [ ] **Schritt 3.1: ConsumerHeader Refactoring (`/my-cellar`)**
  - Umbauen auf `<GlobalHeader colorZone="personal">`.
  - Bereinigen der `app/my-cellar/components/ConsumerHeader.tsx` (von ~320 Zeilen auf ca. 50 Zeilen).
- [ ] **Schritt 3.2: AdminHeader Refactoring (`/dashboard`)**
  - Umbauen auf `<GlobalHeader colorZone="personal">`.
  - Bereinigen der `app/dashboard/components/AdminHeader.tsx` (von ~700 Zeilen auf ca. 70 Zeilen).
- [ ] **Schritt 3.3: SquadHeader Refactoring (`/team/[id]`)**
  - Umbauen auf `<GlobalHeader colorZone="team">`.
  - Anpassen an die orangene Farbwelt.
- [ ] **Schritt 3.4: Public Header Refactoring (`/discover`, `/forum` etc.)**
  - Umbauen auf `<GlobalHeader colorZone="public">`.
  - Anpassen an die lila Farbwelt für Community/Entdecken.

### Phase 4: Aufräumarbeiten & Optimierung
- [ ] **Code löschen:** Alte States und doppelte Mobile-Menu-HTML-Blöcke komplett entfernen.
- [ ] **Performance Check:** Sicherstellen, dass das Re-Rendern (z.B. beim Öffnen des Mobile Menüs) optimal ist und nicht die gesamte App neu rendert.
- [ ] **Mobile & Responsive Test:** Durchklicken aller 3 Farbzonen auf dem Smartphone.

---

## 🎨 Token- & Zonen-Mapping (Referenz für Phase 2)

| Zone | Prop | Hauptfarbe | Anwendungsgebiet |
| :--- | :--- | :--- | :--- |
| **User** | `colorZone="personal"` | `--brand` / `cyan-500` | `/dashboard`, `/my-cellar`, Profil, Achievements |
| **Team** | `colorZone="team"` | `--accent-orange` / `orange-500` | `/team/*`, Team-Einstellungen, Team-Feed |
| **Public** | `colorZone="public"` | `--accent-purple` / `purple-500` | `/discover`, `/forum`, `/tools`, `/pricing` |

Dieses Mapping garantiert, dass Menüpunkte beim Hovern die richtige Farbe kriegen und das Mobile-Dashboard sofort visualisiert, in welchem Modus der User sich befindet.