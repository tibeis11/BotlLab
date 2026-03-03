# Deployment & Go-Live Strategy

## 1. Local Cleanup (Vorbereitung)

**Wichtig:** `supabase db push` überträgt **nur** die Datenbank-Struktur (Schema) und _seeding_ Daten aus Migrations-Dateien. Deine lokalen Testdaten (Rezepte, User, Sessions) werden **NICHT** auf den Live-Server übertragen. Du musst deine lokale Datenbank also technisch gesehen nicht leeren.

Falls du dennoch mit einer sauberen lokalen Datenbank starten möchtest, um sicherzustellen, dass keine Altlasten vorhanden sind, kannst du diesen SQL-Befehl im lokalen SQL Editor ausführen:

```sql
-- VORSICHT: Löscht alle geschäftlichen Daten (Rezepte, Brauereien etc.) lokal!
TRUNCATE TABLE
  public.notifications,
  public.likes,
  public.user_achievements,
  public.collected_caps,
  public.ratings,
  public.brewery_feed,
  public.bottles,
  public.brews,
  public.brewery_members,
  public.breweries
  CASCADE;
```

## 2. Supabase Deployment (Live-Gang)

Um die Änderungen auf Supabase (Cloud) zu bringen:

1.  **Login:**
    ```bash
    npx supabase login
    ```
2.  **Projekt verknüpfen** (falls noch nicht geschehen):

    ```bash
    npx supabase link --project-ref <deine-project-ref-id>
    ```

    _(Die ID findest du im Supabase Dashboard URL: app.supabase.com/project/PROJECT_ID)_

3.  **Schema pushen:**
    ```bash
    npx supabase db push
    ```
    _Dies wendet alle noch nicht gelaufenen Migrationen aus `supabase/migrations` auf die Live-Datenbank an._

## 3. Daten-Migration für bestehende Rezepte & Flaschen (Kritisch!)

**Das Problem:**

1.  Bestehende User in der Cloud haben Rezepte (`brews`) oder Flaschen (`bottles`), die noch keiner Brauerei (`brewery_id`) zugeordnet sind.
2.  **Flaschen:** Früher hingen Flaschen nur am Rezept (`brew_id`). Das neue System nutzt zusätzlich `session_id` (Brauvorgang). Alte Flaschen haben diese ID nicht.

**Die Lösung:**
Das System ist so gebaut, dass es "Legacy-Flaschen" (ohne Session) problemlos unterstützt. Sie tauchen im Inventar auf, haben aber keine detaillierten Session-Daten (wie Gärverlauf).
Wir müssen lediglich sicherstellen, dass sie einer **Brauerei** gehören.

Führe nach dem Deployment (`db push`) das folgende Skript **einmalig** im **SQL Editor des Supabase Dashboards** (im Browser) aus.

Das Skript macht Folgendes:

1. Sucht User mit verwaisten Rezepten/Flaschen.
2. Prüft, ob der User schon in einer Brauerei ist.
3. Falls NEIN: Erstellt automatisch eine "Private Brewery" für den User.
4. Ordnet die verwaisten Daten dieser (oder der existierenden) Brauerei zu.

### SQL Skript: `CLOUD_MIGRATION.sql`

```sql
DO $$
DECLARE
    r RECORD;
    b_id UUID;
    existing_brewery_id UUID;
BEGIN
    -- Schleife durch alle User, die verwaiste Brews oder Bottles haben
    FOR r IN (
        SELECT DISTINCT user_id
        FROM brews
        WHERE brewery_id IS NULL AND user_id IS NOT NULL
        UNION
        SELECT DISTINCT user_id
        FROM bottles
        WHERE brewery_id IS NULL AND user_id IS NOT NULL
    ) LOOP

        RAISE NOTICE 'Bearbeite User: %', r.user_id;
        b_id := NULL;

        -- 1. Prüfen, ob User schon IRGENDEINE Brauerei hat
        SELECT brewery_id INTO existing_brewery_id
        FROM brewery_members
        WHERE user_id = r.user_id
        ORDER BY joined_at ASC
        LIMIT 1;

        IF existing_brewery_id IS NOT NULL THEN
            -- User hat schon eine Brauerei -> wir nehmen die
            b_id := existing_brewery_id;
            RAISE NOTICE ' -> Existierende Brauerei gefunden: %', b_id;
        ELSE
            -- 2. Keine Brauerei gefunden -> Neue "Private Brewery" anlegen
            INSERT INTO breweries (name, created_at)
            VALUES ('Private Brewery', NOW())
            RETURNING id INTO b_id;

            RAISE NOTICE ' -> Neue Private Brewery erstellt: %', b_id;

            -- 3. User als Admin/Owner hinzufügen
            INSERT INTO brewery_members (brewery_id, user_id, role)
            VALUES (b_id, r.user_id, 'owner');
        END IF;

        -- 4. Verwaiste Rezepte updaten
        UPDATE brews
        SET brewery_id = b_id
        WHERE user_id = r.user_id AND brewery_id IS NULL;

        -- 5. Verwaiste Flaschen updaten
        UPDATE bottles
        SET brewery_id = b_id
        WHERE user_id = r.user_id AND brewery_id IS NULL;

    END LOOP;
END $$;
```

## 4. Premium/Subscription System Checklist

**⚠️ CRITICAL für Monetarisierung - siehe ROADMAP_SUBSCRIPTION_LIFECYCLE.md**

### Phase 1: Expiry Automation (MUST HAVE vor Paid Users)

- [ ] Real-time expiry check in `getUserPremiumStatus()` deployed
- [ ] Database function `expire_subscriptions()` created
- [ ] Edge Function `expire-subscriptions` scheduled (daily 00:00 UTC)
- [ ] GitHub Actions fallback configured
- [ ] Test: Manual expiry trigger verified
- [ ] Test: 100+ test users processed without errors
- [ ] Audit trail in `subscription_history` validated

### Phase 2: Stripe Integration (MUST HAVE für Monetarisierung)

- [ ] Stripe account configured (products created)
- [ ] Stripe keys in environment variables:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_PRICE_BREWER`
  - [ ] `STRIPE_PRICE_BREWERY`
- [ ] Checkout session API deployed (`/api/stripe/create-checkout`)
- [ ] Webhook handler deployed (`/api/stripe/webhook`)
- [ ] Webhook registered in Stripe Dashboard
- [ ] Test: Successful payment flow end-to-end
- [ ] Test: Failed payment handling
- [ ] Test: Subscription cancellation
- [ ] Customer portal functional
- [ ] Rollback plan documented

### Phase 3-5: Optional (Nice to Have)

- [ ] Email notifications configured (Resend/SendGrid)
- [ ] Grace period logic implemented
- [ ] Admin dashboard deployed
- [ ] Alert system configured (Slack/Email)

## 5. Git & Vercel Checklist

Bevor du den Code pusht:

- [ ] **Code Pushen:**
  ```bash
  git add .
  git commit -m "feat: New Brewery System & Migrations"
  git push
  ```
- [ ] **Environment Variables (Vercel):**
      Stelle sicher, dass in Vercel/Netlify die ENV-Vars stimmen:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (für Admin-Funktionen)
  - **Premium/Stripe Variables** (siehe Phase 2 oben)
