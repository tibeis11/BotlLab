# Subscription Lifecycle Management - Master Plan (V2.0)

**Project:** BotlLab Subscription Lifecycle & Payment System
**Status:** ✅ **Implemented** (Ready for Go-Live)
**Priority:** P0 (Blocker for Monetization)
**Last Updated:** 2026-01-20
**Owner:** Backend Team
**Legal Review:** Initial Checks Passed (§ 312k BGB Compliant)

---

## 🚨 EXECUTIVE SUMMARY

**Status (20.01.2026):** All Phases (0, 1, 2) are technically implemented.
- **Legal:** Cancellation Button (§ 312k BGB) implemented.
- **Expiry:** Real-time & Daily Cron Job active.
- **Payments:** Stripe integration ready (Test Mode).
- **Barrier:** `NEXT_PUBLIC_ENABLE_PAYMENTS=false` is active.

**Next Action:** Wait for Business Registration (Gewerbe), then follow `STRIPE_SETUP_GUIDE.md` and `GO_LIVE_CHECKLIST.md`.

---

## 📝 Problem Statement (History)

**Problem:** BotlLab has a premium infrastructure but lacks a legally compliant subscription lifecycle. Users with expired subscriptions retain access (revenue leak), and the current plan lacks critical EU consumer protection compliance features.

**Root Cause:** Initial focus on "Happy Path" features missed critical "Sad Path" and legal requirements (GDPR, BGB § 312k, EU Withdrawal Rights).

**Impact:**

- ⚖️ **Legal Risk:** Non-compliance with German "Kündigungsbutton" law and Right of Withdrawal.
- 💸 **Revenue Leak:** No auto-downgrade for expired users.
- 🛡️ **Fraud Risk:** Vulnerable to card testing attacks.

**Solution:** Phased rollout starting with a Legal Compliance Shield (Phase 0), followed by robust retention logic (Phase 1) and hardened payment integration (Phase 2).

---

## 🛡️ PHASE 0: LEGAL COMPLIANCE SHIELD (Week 1) - BLOCKER

**Goal:** Ensure all subscription flows meet strict EU/German consumer protection laws _before_ taking the first payment.

### 0.1 EU Right of Withdrawal Waiver (Widerrufsrecht)

**Requirement:** Digital goods consumed immediately (like SaaS access) require the user to explicitly waive their 14-day right of withdrawal to get instant access.

**Implementation Strategy:**

- **Checkbox:** Must be present at checkout (Stripe Checkout or Pre-Checkout modal).
- **Text:** "I agree that the execution of the contract shall begin before the expiration of the revocation period. I am aware that with this consent, I lose my right of revocation with the beginning of the execution of the contract."
- **Storage:** Log the timestamp and IP of this consent in the `subscription_history` table.

### 0.2 "Kündigungsbutton" Law (§ 312k BGB)

**Requirement:** Contracts concluded online must be cancelable online. The cancellation process **must** be reachable via a prominently labeled button ("Contracts here" or "Cancel Contracts") and followed by a confirmation page.

**UI Flow:**

1.  **Button:** "Cancel Subscription" (clearly visible in Dashboard > Account).
2.  **Confirmation Page:** A dedicated page or modal summarizing:
    - Termination date.
    - Reason (optional).
    - **Final Button:** "Cancel Now with Payment Obligation" (analogous strictly worded confirmation).
3.  **Receipt:** Immediate email confirmation of cancellation (Durable Medium).

### 0.3 B2C Focus (Simplified Tax Handling)

**Decision:** Initial launch targets **Private Consumers (B2C)** only.

**Impact:**

- **No VAT-ID Validation:** We treat every user as a consumer.
- **Universal VAT:** Everyone pays the VAT rate of their country (e.g., 19% in DE).
- **Invoicing:** Simplified invoices without Reverse-Charge complexity.
- **Terms:** ToS should state the service is intended for private use (though businesses can buy it, they just don't get special tax treatment).

### 0.4 Durable Medium (Order Confirmation)

**Requirement:** Every transaction must result in an invoice/confirmation emailed to the user.

- **Action:** Integrate Stripe Invoice emails or SendGrid transaction receipts containing the PDF invoice.

---

## 🛑 PHASE 0.5: COMMERCIAL BARRIER (Pre-Launch)

**Goal:** Prevent ANY upgrades until the legal entity (Gewerbe) is registered, while allowing code deployment.

### 0.5.1 "Coming Soon" Feature Flag

**Risk:** Activating payments before business registration = Tax Evasion / Legal Risk.
**Solution:** A global kill-switch for payment initiation.

- **Env Var:** `NEXT_PUBLIC_ENABLE_PAYMENTS=false`
- **UI Behavior:**
  - If `false`: Upgrade buttons show "Coming Soon" or open a "Waitlist" modal.
  - If `true`: Redirects to Stripe Checkout.
- **API Behavior:** The `/api/stripe/create-checkout` route returns 503 (Service Unavailable) if the flag is false.

**Benefits:**

- Allows safe testing in Prod (we can enable it for our specific User ID or via Env Var).
- Builds hype (Waitlist).
- Zero risk of accidental illegal revenue.

---

## 🎯 PHASE 1: DATA RETENTION & EXPIRY (Week 2) - REFINED

**Goal:** Prevent revenue leakage while preserving user data during downgrades ("Read-Only Mode").

### 1.1 "Read-Only Mode" Logic

**Concept:** If a user downgrades from **Brewery (Unlimited)** to **Free (5 Recipes)** but has 50 recipes, do **not** delete the 45 excess recipes.

**Implementation in `lib/permissions.ts`:**

1.  **Storage:** Keep all data intact in the database.
2.  **Enforcement:**
    - **View:** User can _view_ all 50 recipes.
    - **Edit/Create:** Block creation of _new_ recipes if `count > limit`.
    - **Edit Existing:** Block editing of existing recipes (optional, or allow read-only).

```typescript
// Conceptual Check
export async function canCreateRecipe(userId: string) {
  const count = await getRecipeCount(userId);
  const limit = await getTierLimit(userId); // Returns 5 for Free

  if (count >= limit) {
    throw new Error(
      "Recipe limit reached. Upgrade to add more or delete old recipes."
    );
  }
  return true;
}
```

### 1.2 Real-Time Expiry Check

**File:** `lib/premium-checks.ts`
Enforce expiry check _before_ returning premium status. If `now > expires_at`, effectively return `free` tier capabilities even if the DB record hasn't been updated by the cron job yet.

### 1.3 Batch Clean-up Job

**File:** `supabase/functions/expire-subscriptions/index.ts`
Daily cron job to:

1.  Identify expired subscriptions.
2.  Update `subscription_status` to `'expired'`.
3.  Log the event.
4.  Trigger an email: "Your subscription has ended. You are now on the Free plan."

---

## 💳 PHASE 2: HARDENED STRIPE INTEGRATION (Week 3)

**Goal:** robust payment processing resilient to network failures and fraud attempts.

### 2.1 Rate Limiting (Anti-Fraud)

**Risk:** Malicious actors using the checkout endpoint to test stolen credit card numbers.
**Mitigation:** Implement strict Rate Limiting on `/api/stripe/create-checkout`.

**Implementation:**

- Use Upstash Redis or Supabase DB to track IP/User attempts.
- **Limit:** Max 3 checkout creation attempts per hour per user/IP.

### 2.2 Webhook Resilience & Polling

**Problem:** Webhooks can fail or be delayed. Relying solely on webhooks leaves users in a "paid but not upgraded" limbo.
**Solution:** Polling Bridge.

**Frontend Flow (`/dashboard/account`):**

1.  User returns from Stripe (Success URL).
2.  Frontend shows: "Verifying payment..."
3.  Frontend polls `/api/stripe/check-status?session_id=...` every 2s (max 5 times).
4.  **Backend (`check-status`):**
    - Checks Stripe API directly for payment status.
    - If paid but DB not updated: **Proactively updates DB** (idempotent operation).
    - Returns success to Frontend.

### 2.3 Idempotent Webhooks

Ensure `app/api/stripe/webhook/route.ts` can handle the same event multiple times without side effects (e.g., don't extend subscription twice if the same `invoice.paid` event arrives twice).

---

## 📅 TIMELINE & PRIORITIES

| Phase       | Feature                                  | Priority         | Est. Time  |
| :---------- | :--------------------------------------- | :--------------- | :--------- |
| **Phase 0** | **Legal Shield (Waiver, Cancel Button)** | **P0 (Blocker)** | **3 Days** |
|             | Durable Medium (Email Receipts)          | P1               | 1 Day      |
| **Phase 1** | Expiry Logic & Read-Only Mode            | P1               | 2 Days     |
|             | Daily Cron Job (Supabase Edge Function)  | P1               | 1 Day      |
| **Phase 2** | Stripe Checkout & Webhooks               | P0 (Blocker)     | 3 Days     |
|             | **Rate Limiting & Security Hardening**   | **P1**           | **1 Day**  |
|             | Polling Fallback Mechanism               | P2               | 1 Day      |

---

## ✅ CHECKLIST FOR LAUNCH

- [ ] **Legal:** Withdrawal waiver text approved.
- [ ] **Legal:** "Kündigungsbutton" visible and functional.
- [ ] **Tech:** Subscription downgrade does NOT delete user data (Read-Only verified).
- [ ] **Security:** Rate limiting active on checkout endpoints.
- [ ] **Resilience:** Polling mechanism implemented for payment success page.
- [ ] **Testing:** Verify "Card Testing" protection works.

---

## 📝 NEXT STEPS

**Immediate Actions (This Week):**

1. ✅ Create this roadmap document
2. ⏳ Implement **Phase 0.5 (Commercial Barrier)** immediately to safe-guard app.
3. ⏳ Implement Phase 1.1 (real-time expiry check) which works even without payments.

**Week 2:**

- Setup Stripe account (Testing Mode Only).
- Implement checkout flow but keep it hidden behind the `NEXT_PUBLIC_ENABLE_PAYMENTS` flag.

**Week 3:**

- Complete webhook handlers.
- Verify security with extensive testing.

---

## 📚 REFERENCES

- [Stripe Subscription Docs](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [BGB § 312k (Kündigungsbutton)](https://www.gesetze-im-internet.de/bgb/__312k.html)
