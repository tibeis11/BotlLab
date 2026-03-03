# BotlLab Mac Migration Guide

Dieser Guide hilft dir beim Umzug des BotlLab-Projekts von Windows auf deinen neuen Mac mini.

## 1. Vorbereitungen am Mac

### 1.1 Developer Tools installieren
Auf dem neuen Mac benötigen wir die gleichen Tools wie auf Windows, aber für macOS optimiert.

1.  **Homebrew** (Paketmanager für macOS):
    Öffne das Terminal und führe aus:
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```
2.  **Git & Node.js**:
    ```bash
    brew install git node
    ```
3.  **Python** (für Scripts):
    ```bash
    brew install python
    ```
4.  **Supabase CLI**:
    ```bash
    brew install supabase/tap/supabase
    ```
5.  **Docker Desktop**:
    Lade Docker Desktop für Mac (Apple Silicon) herunter und installiere es: https://www.docker.com/products/docker-desktop/
    *Starten nicht vergessen!*

### 1.2 VS Code & Extensions
Installiere VS Code für Mac.
Synchronisiere deine Extensions über deinen GitHub Account (unten links in VS Code auf das Profil-Icon -> "Turn on Settings Sync").

---

## 2. Projekt einrichten

### 2.1 Code holen
Wir nutzen Git als Quelle der Wahrheit. Klonen statt Kopieren vermeidet Probleme mit `node_modules`.

```bash
# In deinen gewünschten Ordner wechseln (z.B. ~/Developer)
mkdir -p ~/Developer
cd ~/Developer
git clone https://github.com/tibeis11/BotlLab.git
cd BotlLab/botllab-app
```

### 2.2 Environment Variablen (.env) wiederherstellen
Die `.env.local` Datei wird von Git ignoriert (Sicherheit).
Du musst diese manuell von deinem Windows-PC kopieren oder neu erstellen.

1.  Erstelle eine neue Datei `.env.local` im Ordner `botllab-app`.
2.  Füge den Inhalt deiner Windows `.env.local` ein (Supabase Keys, API Keys etc.).

### 2.3 Abhängigkeiten installieren

**Node.js Pakete:**
```bash
npm install
```

**Python Environment:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 3. Datenbank (Supabase) wiederherstellen

Wir haben auf Windows einen **Data-Dump** (`supabase/seed_migration.sql`) erstellt und ins Git gepusht.
Diesen nutzen wir nun, um den lokalen Docker-Container auf dem Mac mit deinen Testdaten zu füllen.

1.  **Supabase starten (Docker):**
    ```bash
    npx supabase start
    ```
    *Dies zieht die Docker-Images und wendet automatisch alle DB-Migrationen aus `supabase/migrations` an (Tabellenstruktur).*

2.  **Daten importieren:**
    Da die Datenbank jetzt leer ist (nur Tabellen, keine Daten), importieren wir den Dump:
    ```bash
    # Setzt die DB zurück und spielt den Dump ein
    psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed_migration.sql
    ```
    *(Falls `psql` nicht gefunden wird: `brew install libpq` und Pfad setzen, oder den Dump als neuen `supabase/seed.sql` kopieren und `npx supabase db reset` ausführen)*

---

## 4. Testen
Starte die App:
```bash
npm run dev
```
Öffne http://localhost:3000 und prüfe, ob alles läuft.

## WICHTIG: OneDrive & Mac
Vermeide es, das Projekt **direkt** in einem synchronisierten OneDrive-Ordner zu entwickeln (`~/OneDrive/...`), während die Sync-App läuft.
Node.js erzeugt tausende kleine Dateien in `node_modules`, was OneDrive extrem verlangsamt und zu Konflikten führen kann.
Nutze lieber einen lokalen Ordner (z.B. `~/Developer/BotlLab`) und pushe Code-Änderungen via Git.
