# BotlLab Premium System - Executive Summary

**Created:** 2026-01-19  
**Status:** 🟡 Infrastructure Complete, Lifecycle Missing  
**Readiness:** 55% (Blocker: Payment & Expiry Automation)

---

## 🎯 TL;DR

BotlLab has a **world-class premium infrastructure** (90% complete) but is **missing critical subscription lifecycle management**. We can collect payments but can't prevent users from keeping access after expiry.

**Critical Gap:** No automatic downgrade when subscriptions expire → potential revenue leak.

**Solution:** 4-6 week phased rollout (see ROADMAP_SUBSCRIPTION_LIFECYCLE.md)

---

## 📊 CURRENT STATE

### ✅ What Works (90% Complete)

#### 1. Database Schema (100%)

- `subscription_tier`, `subscription_status`, `subscription_expires_at` fields exist
- `subscription_history` audit table
- `enterprise_codes` for manual provisioning
- Proper constraints and indexes

#### 2. Tier System (100%)

- 4 tiers defined: free, brewer (€4.99/mo), brewery (€14.99/mo), enterprise (€0 beta)
- Feature flags per tier (AI credits, logos, analytics, team limits)
- Clean TypeScript types

#### 3. Permission System (100%)

- `getUserPremiumStatus()` - comprehensive status check
- `canUseAI()` - atomic credit check (race-condition proof)
- Owner-based checks (prevents admin abuse)
- Monthly credit reset automation

#### 4. API Protection (100%)

- `/api/generate-image` - returns 402 on limit
- `/api/generate-text` - returns 402 on limit
- `/api/premium/status` - full status endpoint
- Analytics access gated by tier

#### 5. UI Components (95%)

- `PremiumBadge` - visual tier indicator
- `AICreditsDisplay` - real-time counter
- `BreweryTierWidget` - shows premium benefits or upgrade path
- Account page with subscription details

#### 6. Enterprise Code System (100%)

- Redemption codes with expiry and usage limits
- Atomic redemption (prevents double-use)
- Manual provisioning workflow

---

### ❌ What's Missing (CRITICAL GAPS)

#### 1. Expiry Automation (0% - P0 BLOCKER)

**Problem:** Users with `subscription_expires_at < NOW()` keep full access.

**Missing Components:**

- No check in `getUserPremiumStatus()` to enforce expiry
- No cron job to batch-process expired subs
- No automatic downgrade to free tier

**Impact:** Revenue leak if we start charging.

**Solution:** Phase 1 of ROADMAP_SUBSCRIPTION_LIFECYCLE.md (2-3 days)

---

#### 2. Stripe Payment Integration (0% - P0 BLOCKER)

**Problem:** No way to collect actual money.

**Missing Components:**

- No Stripe SDK initialization
- No checkout session API
- No webhook handler for subscription events
- No customer portal for self-service

**Impact:** Cannot monetize even with expiry checks.

**Solution:** Phase 2 of ROADMAP_SUBSCRIPTION_LIFECYCLE.md (2-3 weeks)

---

#### 3. Webhook Event Handling (0% - P0 BLOCKER)

**Problem:** Stripe events (payment success, cancellation, renewal) don't sync to database.

**Missing Handlers:**

- `checkout.session.completed` → upgrade user
- `invoice.paid` → extend `subscription_expires_at`
- `invoice.payment_failed` → set status to 'paused'
- `customer.subscription.deleted` → downgrade to free

**Impact:** Subscriptions become out-of-sync with Stripe.

**Solution:** Part of Phase 2

---

#### 4. Lifecycle Notifications (30% - P2)

**Problem:** Users don't know when subscription expires or payment fails.

**Missing:**

- Expiry warning emails (7 days before)
- Downgrade notification emails
- Failed payment dunning emails
- Renewal confirmation emails

**Impact:** Higher churn, confused users.

**Solution:** Phase 3 (1 week)

---

#### 5. Grace Period Logic (0% - P2)

**Problem:** Immediate hard cutoff on expiry is harsh.

**Missing:**

- 7-day grace period with reduced access
- Win-back campaigns for expired users
- Dunning retry logic (already in Stripe, needs config)

**Impact:** Higher churn, worse UX.

**Solution:** Phase 4 (3 days)

---

#### 6. Monitoring & Alerting (0% - P2)

**Problem:** No visibility into subscription health.

**Missing:**

- Admin dashboard (MRR, churn rate, active subs)
- Alert on high churn
- Alert on webhook failures
- Alert on expiry job failures

**Impact:** Blind to revenue issues.

**Solution:** Phase 5 (1 week)

---

## 🚨 WHY DID WE MISS THIS?

### Root Cause Analysis

**We built the "Happy Path" (upgrades, features, UI) but forgot the "Sad Path" (expiry, downgrades, failures).**

**What We Did Right:**
✅ Designed flexible schema with all necessary fields  
✅ Built atomic permission checks (race-condition proof)  
✅ Created beautiful premium UI  
✅ Implemented manual provisioning (enterprise codes)  
✅ Protected with RLS and security best practices

**What We Overlooked:**
❌ Expiry is a field but never enforced  
❌ Status has 'expired' state but nothing sets it  
❌ Payment integration was "deferred" indefinitely  
❌ Webhook handling assumed but never implemented

**Classic MVP Pitfall:** Focused on getting users IN to premium, forgot about getting them OUT when time's up.

---

## 📈 READINESS SCORECARD

| Category               | Status      | Score   | Blocker for Monetization? |
| ---------------------- | ----------- | ------- | ------------------------- |
| Database Schema        | ✅ Complete | 100%    | No                        |
| Tier Configuration     | ✅ Complete | 100%    | No                        |
| Permission Checks      | ✅ Complete | 100%    | No                        |
| API Protection         | ✅ Complete | 100%    | No                        |
| Premium UI             | ✅ Complete | 95%     | No                        |
| **Expiry Automation**  | ❌ Missing  | **0%**  | **YES - P0**              |
| **Payment Processing** | ❌ Missing  | **0%**  | **YES - P0**              |
| **Webhook Handlers**   | ❌ Missing  | **0%**  | **YES - P0**              |
| Customer Portal        | ❌ Missing  | 0%      | YES - P1                  |
| Notifications          | ⚠️ Partial  | 30%     | No - P2                   |
| Grace Period           | ❌ Missing  | 0%      | No - P2                   |
| Monitoring             | ❌ Missing  | 0%      | No - P2                   |
| **OVERALL**            | 🟡 Blocked  | **55%** | -                         |

**Interpretation:**

- **Infrastructure:** World-class (90%+)
- **Lifecycle:** Non-existent (0%)
- **Monetization Ready:** No (blocked by P0 items)

---

## 🎯 THE PERFECT PLAN

### Phase 1: Expiry Automation (Week 1) - CRITICAL

**Goal:** Prevent revenue leakage

**Deliverables:**

1. Add expiry check to `getUserPremiumStatus()` - auto-downgrade on access
2. Create `expire_subscriptions()` database function - batch processing
3. Deploy Edge Function - daily cron at 00:00 UTC
4. Setup GitHub Actions fallback - redundancy

**Outcome:** Users auto-downgrade when subscription expires (real-time + daily batch).

**Estimated Time:** 2-3 days  
**Priority:** P0 - CRITICAL

---

### Phase 2: Stripe Integration (Week 2-3) - CRITICAL

**Goal:** Enable payment collection

**Deliverables:**

1. Stripe client initialization (`lib/stripe.ts`)
2. Checkout session API (`/api/stripe/create-checkout`)
3. Webhook handler (`/api/stripe/webhook`) - handles 5 events
4. Customer portal integration (`/api/stripe/portal`)
5. Frontend payment flow
6. Comprehensive testing in Stripe test mode

**Outcome:** Users can subscribe, pay, and we sync state with webhooks.

**Estimated Time:** 2-3 weeks  
**Priority:** P0 - CRITICAL

---

### Phase 3: Notifications (Week 4) - HIGH

**Goal:** Reduce churn via proactive communication

**Deliverables:**

1. Email service integration (Resend/SendGrid)
2. Expiry warning emails (7 days before)
3. Downgrade notification emails
4. Failed payment dunning emails
5. In-app notification banners
6. Edge Function for daily warning checks

**Outcome:** Users get reminders before expiry, reducing accidental churn.

**Estimated Time:** 1 week  
**Priority:** P2 - HIGH

---

### Phase 4: Grace Period (Week 5) - MEDIUM

**Goal:** Give users time to fix payment issues

**Deliverables:**

1. Grace period logic (7 days after expiry)
2. Reduced access during grace (5 AI credits/day)
3. Win-back email campaigns
4. Stripe dunning configuration (automatic retries)

**Outcome:** Failed payments get 3 retry attempts, users can self-recover.

**Estimated Time:** 3 days  
**Priority:** P2 - MEDIUM

---

### Phase 5: Monitoring (Week 6) - MEDIUM

**Goal:** Track subscription health proactively

**Deliverables:**

1. Admin dashboard (`/admin/subscriptions`)
   - Active subs by tier
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - Expiring soon (next 7 days)
2. Alert system (Slack/Email)
   - High churn rate (>10% in 7 days)
   - Webhook failures
   - Cron job failures
3. Database views for metrics

**Outcome:** Real-time visibility into revenue and subscription health.

**Estimated Time:** 1 week  
**Priority:** P2 - MEDIUM

---

## 📅 IMPLEMENTATION TIMELINE

```
Week 1:  [████████████████████] Phase 1 - Expiry Automation (CRITICAL)
Week 2:  [██████████▓▓▓▓▓▓▓▓▓▓] Phase 2 - Stripe (Part 1) (CRITICAL)
Week 3:  [▓▓▓▓▓▓▓▓▓▓██████████] Phase 2 - Stripe (Part 2) (CRITICAL)
Week 4:  [████████████████████] Phase 3 - Notifications (HIGH)
Week 5:  [████████░░░░░░░░░░░░] Phase 4 - Grace Period (MEDIUM)
Week 6:  [████████████████████] Phase 5 - Monitoring (MEDIUM)

Legend: █ Development  ▓ Testing  ░ Buffer/Polish
```

**Critical Path:** Phase 1 → Phase 2 (everything else is parallel)

**Total Duration:** 4-6 weeks (depends on testing thoroughness)

---

## ✅ DEFINITION OF DONE

### Phase 1 (Expiry)

- [ ] User with expired sub gets auto-downgraded on next login
- [ ] Daily cron processes all expired users (0 missed)
- [ ] Audit trail captured in `subscription_history`
- [ ] Performance impact < 100ms per request
- [ ] Zero false positives (enterprise users protected)
- [ ] Tested with 100+ concurrent expirations

### Phase 2 (Stripe)

- [ ] User can complete checkout flow end-to-end
- [ ] Successful payment upgrades user immediately
- [ ] Failed payment sets status to 'paused'
- [ ] Subscription cancellation downgrades at period end
- [ ] Renewal extends `subscription_expires_at` correctly
- [ ] Webhook signature verification working
- [ ] Tested in production with real card
- [ ] Rollback plan documented and tested

### Phase 3-5 (Optional but Recommended)

- [ ] Users receive email 7 days before expiry
- [ ] Users receive email on expiry
- [ ] Grace period allows 7-day reduced access
- [ ] Admin dashboard shows live metrics
- [ ] Alerts trigger on anomalies

---

## 🔐 SECURITY CONSIDERATIONS

### Already Secure ✅

- Row-Level Security (RLS) on all tables
- Owner-based permission checks (prevents admin abuse)
- Atomic AI credit checks (race-condition proof)
- GDPR-compliant logging (no PII in logs)
- Stripe customer IDs stored securely

### Must Implement ⚠️

- **Webhook signature verification** (Phase 2)
- **Service role key protection** (server-only)
- **Rate limiting on redemption codes** (prevent brute force)
- **Idempotent webhook handlers** (prevent duplicate processing)

---

## 💰 REVENUE IMPACT ANALYSIS

### Current State (Beta)

- All users: `enterprise` tier (€0/month)
- Total MRR: €0
- No payment collection

### After Phase 1+2 (Monetization Ready)

- Free users: Limited features
- Brewer users: €4.99/month
- Brewery users: €14.99/month
- Enterprise users: Grandfathered (lifetime free for beta testers)

**Projected MRR (Conservative):**

- 100 Brewer subs × €4.99 = €499
- 50 Brewery subs × €14.99 = €750
- **Total: ~€1,250/month**

**Projected MRR (Optimistic):**

- 500 Brewer subs × €4.99 = €2,495
- 200 Brewery subs × €14.99 = €2,998
- **Total: ~€5,500/month**

### Risk: Revenue Leakage Without Phase 1

If we launch payments without expiry checks:

- User subscribes for 1 month (€14.99)
- Subscription expires
- User keeps access forever
- **Lost revenue: €14.99/month per user × 12 months = €179.88/year**

With 100 users: **€17,988/year lost** 🚨

---

## 🎯 RECOMMENDED ACTION PLAN

### This Week (Days 1-3)

1. **Monday:** Implement real-time expiry check in `getUserPremiumStatus()`
2. **Tuesday:** Create `expire_subscriptions()` database function
3. **Wednesday:** Deploy Edge Function with cron schedule
4. **Thursday:** Testing and validation
5. **Friday:** Deploy to production, monitor logs

### Next 2 Weeks (Days 4-14)

1. Setup Stripe account and products
2. Implement checkout session API
3. Build webhook handler (5 events)
4. Integrate customer portal
5. End-to-end testing in Stripe test mode
6. Production deployment with monitoring

### Weeks 4-6 (Optional but Recommended)

1. Email notification system
2. Grace period logic
3. Admin dashboard
4. Alert configuration

---

## 📚 RELATED DOCUMENTS

- **[ROADMAP_SUBSCRIPTION_LIFECYCLE.md](ROADMAP_SUBSCRIPTION_LIFECYCLE.md)** - Detailed technical implementation plan
- **[ROADMAP_PREMIUM_SYSTEM.md](ROADMAP_PREMIUM_SYSTEM.md)** - Original premium infrastructure roadmap
- **[DEPLOYMENT_PREP.md](DEPLOYMENT_PREP.md)** - Production deployment checklist
- **[PROJECT_SPEC_BOTLLAB.md](PROJECT_SPEC_BOTLLAB.md)** - Overall project specification

---

## 🤔 FAQ

### Q: Can we launch without Phase 1?

**A: NO.** We'd have infinite free premium access for anyone who subscribes once. Revenue leak.

### Q: Can we do Phase 2 without Phase 1?

**A: Technically yes, but DON'T.** You'd collect money but give lifetime access. Bad business.

### Q: Why wasn't this implemented originally?

**A: MVP focus on features, not lifecycle.** Classic mistake - we built the "subscribe" path but not the "expire" path.

### Q: How long until we can take payments?

**A: 3-4 weeks minimum** (Phase 1 + Phase 2 with thorough testing).

### Q: What if a webhook fails?

**A: Implement retry logic + daily reconciliation script.** Stripe provides webhook retry, but we need monitoring.

### Q: Do we need Phase 3-5?

**A: Not immediately, but recommended for churn reduction and revenue visibility.**

---

## 🎯 SUCCESS METRICS

### Phase 1 Success:

- ✅ 0 users with expired subs retain access
- ✅ Daily cron runs successfully 30 days straight
- ✅ Audit trail shows all downgrades
- ✅ Performance stays under 100ms

### Phase 2 Success:

- ✅ 10 successful test payments
- ✅ 5 successful cancellations
- ✅ All webhooks processed correctly
- ✅ 0 webhook signature failures
- ✅ First real payment in production

### Overall Success:

- ✅ MRR > €1,000/month
- ✅ Churn rate < 5%/month
- ✅ 0 revenue leakage incidents
- ✅ Payment success rate > 95%

---

## 📞 ESCALATION

**If blocked on:**

- Stripe setup → Contact Stripe support
- Webhook issues → Check Stripe Dashboard logs
- Performance problems → Add database indexes
- False positive expiry → Review enterprise protection logic

**Emergency contacts:**

- Stripe Support: https://support.stripe.com
- Supabase Support: https://supabase.com/support

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Next Review:** After Phase 1 completion  
**Owner:** Backend Team  
**Status:** 🔴 ACTION REQUIRED
