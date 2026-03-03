# 🚀 Deployment Checkliste - BotlLab Subscription System

**Status:** Code vollständig implementiert ✅  
**Letzte Aktualisierung:** 2026-01-19  
**Zeitaufwand:** ~2-3 Stunden

---

## ✅ ERLEDIGT

- [x] Phase 0: Kündigungsbutton & Legal Shield
- [x] Phase 1: Expiry Automation (Real-time + Cron)
- [x] Phase 2: Stripe Integration (Complete)
- [x] Lokale Datenbank-Migration angewendet

---

## 📋 NÄCHSTE SCHRITTE

### 🎯 SCHRITT 1: Stripe Account Setup (30 Min)

**1.1 Stripe Account erstellen**

```
https://dashboard.stripe.com/register
```

- Wähle: Deutschland als Land
- Verwende deine Business-Email
- **WICHTIG:** Aktiviere erst **Test Mode**, nicht Live Mode!

**1.2 Produkte in Stripe erstellen**

**Produkt 1: Heimbrauer (Brewer)**

1. Gehe zu: Products → "Create Product"
2. Name: `Heimbrauer`
3. Description: `50 AI Credits/Monat, Custom Logos, Analytics`
4. Price: `€4.99` / Monat
5. Recurring: Monthly
6. Tax Behavior: Inclusive (MwSt. wird angezeigt)
7. **Kopiere die Price-ID:** `price_xxxxxxxxxxxxx`

**Produkt 2: Brauerei (Brewery)**

1. Products → "Create Product"
2. Name: `Brauerei`
3. Description: `Unbegrenzte AI Credits, Team-Features, Priority Support`
4. Price: `€14.99` / Monat
5. Recurring: Monthly
6. Tax Behavior: Inclusive
7. **Kopiere die Price-ID:** `price_yyyyyyyyyyy`

**1.3 Stripe Tax aktivieren**

1. Settings → Tax
2. Enable "Automatic Tax Collection"
3. Wähle: Germany als Heimatland
4. Aktiviere EU Tax Compliance

---

### 🔐 SCHRITT 2: Environment Variables setzen (15 Min)

**2.1 Lokale Entwicklung (.env.local)**

Erstelle/Aktualisiere `botllab-app/.env.local`:

```bash
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs
STRIPE_PRICE_BREWER=price_xxxxxxxxxxxxx
STRIPE_PRICE_BREWERY=price_yyyyyyyyyyy

# Commercial Barrier (WICHTIG!)
NEXT_PUBLIC_ENABLE_PAYMENTS=false

# Supabase (bereits vorhanden)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App URL
NEXT_PUBLIC_URL=http://localhost:3000
```

**Wo findest du die Stripe Keys?**

- `STRIPE_SECRET_KEY`: Dashboard → Developers → API Keys → Secret Key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Dashboard → Developers → API Keys → Publishable Key
- `STRIPE_WEBHOOK_SECRET`: Kommt in Schritt 4 (Webhook Setup)

**2.2 Vercel Production Environment**

Nach dem Deploy zu Vercel:

1. Gehe zu: Vercel Dashboard → Dein Projekt → Settings → Environment Variables
2. Füge **alle** obigen Variables hinzu
3. **WICHTIG:** `NEXT_PUBLIC_ENABLE_PAYMENTS=false` (erst nach Gewerbeanmeldung auf `true`)

---

### 🗄️ SCHRITT 3: Production Database Migration (10 Min)

**Option A: Supabase CLI (Empfohlen)**

```bash
cd botllab-app

# Mit Production verbinden
npx supabase link --project-ref YOUR_PROJECT_REF

# Migration deployen
npx supabase db push
```

**Option B: Manuell via Supabase Dashboard**

1. Gehe zu: Supabase Dashboard → SQL Editor
2. Öffne die Datei: `supabase/migrations/20260119200000_add_expiry_function.sql`
3. Kopiere den Inhalt und führe ihn aus
4. Verifiziere: `SELECT * FROM expire_subscriptions();` sollte funktionieren

---

### ⚡ SCHRITT 4: Edge Function & Cron Job deployen (20 Min)

**4.1 Edge Function deployen**

```bash
cd botllab-app

# Function deployen
npx supabase functions deploy expire-subscriptions --project-ref YOUR_PROJECT_REF

# Test (manuell ausführen)
npx supabase functions invoke expire-subscriptions --project-ref YOUR_PROJECT_REF
```

**4.2 Cron Schedule erstellen**

```bash
# Daily um 00:00 UTC
npx supabase functions schedule create expire-subscriptions \
  --cron "0 0 * * *" \
  --project-ref YOUR_PROJECT_REF
```

**Verifizierung:**

- Gehe zu: Supabase Dashboard → Edge Functions → expire-subscriptions
- Check: "Schedules" Tab zeigt "0 0 \* \* \*"
- Check: "Logs" Tab nach dem nächsten Mitternacht

---

### 🪝 SCHRITT 5: Stripe Webhook registrieren (15 Min)

**5.1 Webhook-Endpoint in Stripe registrieren**

1. Gehe zu: Stripe Dashboard → Developers → Webhooks
2. Click "Add Endpoint"
3. **Endpoint URL:** `https://botllab.com/api/stripe/webhook`
4. **Events to send:** Wähle folgende aus:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Click "Add Endpoint"

**5.2 Signing Secret kopieren**

1. Nach dem Erstellen → Click auf den Webhook
2. Kopiere "Signing Secret" (beginnt mit `whsec_...`)
3. Füge in `.env.local` und Vercel hinzu:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. **Redeploy** zu Vercel (damit die neue Variable aktiv wird)

**5.3 Webhook testen**

1. In Stripe Dashboard → Webhooks → Dein Endpoint
2. Click "Send test webhook"
3. Wähle: `checkout.session.completed`
4. Check Response: Sollte `200 OK` zurückgeben

---

### 🧪 SCHRITT 6: Testing (30 Min)

**6.1 Lokales Testing (Commercial Barrier aktiv)**

```bash
cd botllab-app
npm run dev
```

1. Gehe zu: `http://localhost:3000/dashboard/account`
2. Click "Upgrade" → Sollte Nachricht zeigen: "Coming Soon"
3. ✅ **Keine Zahlung möglich** (wie gewünscht)

**6.2 Test Mode Testing (Barrier deaktiviert)**

1. Setze temporär: `NEXT_PUBLIC_ENABLE_PAYMENTS=true` (nur lokal!)
2. Restart Dev Server
3. Click "Upgrade" → Sollte zu Stripe Checkout weiterleiten
4. Verwende Stripe Test-Karte:
   - Nummer: `4242 4242 4242 4242`
   - Expiry: Beliebiges zukünftiges Datum
   - CVC: Beliebige 3 Ziffern
5. Zahlung abschließen
6. Check Datenbank:
   ```sql
   SELECT subscription_tier, subscription_status, subscription_expires_at
   FROM profiles
   WHERE id = 'YOUR_USER_ID';
   ```
7. Sollte zeigen: `tier = brewer`, `status = active`, `expires_at = +1 Monat`

**6.3 Kündigungsbutton testen**

1. Als Premium-User: Gehe zu Account
2. Click "Abo kündigen"
3. Bestätige im Modal
4. Check DB: `subscription_status = cancelled`
5. Check: `subscription_history` hat Eintrag

**6.4 Expiry testen**

```sql
-- Setze Ablauf in die Vergangenheit
UPDATE profiles
SET subscription_expires_at = NOW() - INTERVAL '1 day',
    subscription_status = 'active'
WHERE id = 'YOUR_USER_ID';
```

1. Gehe zu Dashboard (triggert `getUserPremiumStatus()`)
2. Check DB: Sollte automatisch downgraded sein
3. Verifiziere: `subscription_tier = free`, `subscription_status = expired`

---

### 🚀 SCHRITT 7: Production Deployment

**7.1 Git Commit & Push**

```bash
git add .
git commit -m "feat: Complete subscription lifecycle system (Phase 0-2)"
git push origin main
```

**7.2 Vercel Deployment**

- Vercel deployed automatisch
- Check Deployment Logs: Keine Fehler
- Check Environment Variables sind gesetzt

**7.3 Smoke Test Production**

1. Gehe zu: `https://botllab.com/dashboard/account`
2. Click "Upgrade"
3. Sollte "Coming Soon" zeigen (Commercial Barrier aktiv)
4. ✅ **Keine Zahlungen möglich** bis Gewerbe angemeldet

---

## 🛡️ WICHTIG: Commercial Barrier

**Aktueller Status:**

```bash
NEXT_PUBLIC_ENABLE_PAYMENTS=false  # ✅ Sicher
```

**Erst nach Gewerbeanmeldung:**

1. Stripe: Wechsle von Test Mode zu Live Mode
2. Erstelle Produkte in Live Mode neu (neue Price-IDs!)
3. Update Environment Variables:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...  # Nicht sk_test_!
   STRIPE_PRICE_BREWER=price_live_...
   STRIPE_PRICE_BREWERY=price_live_...
   NEXT_PUBLIC_ENABLE_PAYMENTS=true  # 🚀 Launch!
   ```
4. Redeploy zu Vercel

---

## 🎯 Success Criteria

**Du bist fertig, wenn:**

- [x] Code deployed zu Production
- [x] Database Migration applied
- [x] Edge Function läuft täglich
- [x] Stripe Webhook registriert & testet erfolgreich
- [x] Commercial Barrier aktiv (`ENABLE_PAYMENTS=false`)
- [x] "Upgrade" zeigt "Coming Soon"
- [x] Kündigungsbutton funktioniert
- [x] Expiry Check funktioniert (Real-time & Batch)

---

## 📞 Support & Troubleshooting

**Webhook funktioniert nicht?**

- Check Stripe Dashboard → Webhooks → Response Logs
- Check Vercel → Functions → Logs
- Verify: `STRIPE_WEBHOOK_SECRET` ist korrekt

**Migration schlägt fehl?**

- Check: Supabase Dashboard → Database → Logs
- Verify: No syntax errors in SQL
- Verify: Service Role hat genug Rechte

**Edge Function läuft nicht?**

- Check: Supabase Dashboard → Edge Functions → Logs
- Verify: Cron Schedule ist aktiv
- Test manuell: `npx supabase functions invoke expire-subscriptions`

**Questions?**
Dokumentation ist in `ROADMAP_SUBSCRIPTION_LIFECYCLE.md`

---

**Viel Erfolg! 🚀**
