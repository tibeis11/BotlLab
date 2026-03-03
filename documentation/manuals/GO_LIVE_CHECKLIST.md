# 🚀 GO-LIVE Checkliste - Der Tag X

Diese Checkliste verwendest du, sobald du dein Gewerbe angemeldet hast und bereit bist, Stripe live zu schalten.

## 1. Stripe Finalisieren

- [ ] **Account erstellen:** Siehe `STRIPE_SETUP_GUIDE.md`
- [ ] **Produkte erstellen:** Heimbrauer (€4.99) & Brauerei (€14.99)
- [ ] **API Keys holen:** `pk_test_...`, `sk_test_...` (oder Live-Keys)
- [ ] **Webhook Secret holen:** `whsec_...`

## 2. Environment Variables setzen (Vercel)

Gehe zu [Vercel Dashboard](https://vercel.com) → Settings → Environment Variables.
Füge hinzu:

```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product IDs
STRIPE_PRICE_BREWER=price_...
STRIPE_PRICE_BREWERY=price_...

# Feature Flag (Damit Zahlungen möglich sind!)
NEXT_PUBLIC_ENABLE_PAYMENTS=true
```

## 3. Stripe Webhook registrieren

- URL: `https://botllab.com/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## 4. Cron Job prüfen

- Im Supabase Dashboard prüfen, ob der Schedule `0 0 * * *` für `expire-subscriptions` aktiv ist.

## 5. Deployment

- Da Vercel automatisch deployed, sobald du die Env-Vars änderst (meistens Trigger nötig), oder einfach:
- Einmal `git push` machen (auch wenn leer), um Redeploy zu triggern.

---

**Viel Erfolg! Dein BotlLab ist bereit für Kunden! 🍻**
