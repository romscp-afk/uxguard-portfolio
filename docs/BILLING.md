# UXGuard Billing & Subscriptions

Subscription plans, Free auto-activation, usage limits, and payment-ready upgrade flows.

## Plans (list prices)

| Plan | Monthly | Annual (11 months) |
|------|---------|--------------------|
| Free | $0 | $0 |
| Professional | $15 | $165 |
| Team | $39 | $429 |
| Enterprise | Custom | Custom |

Annual billing is charged as **11 × monthly** (one month free).


- **Live persistence:** Vercel Blob JSON collections (`subscriptions`, `user_usage`, `payment_transactions`, `subscription_events`) via `api/_lib/store.js`.
- **Plan source of truth:** `api/_lib/billing/plans.js` (server-side only).
- **Postgres/RLS reference:** `api/_lib/billing/schema.sql` for a future Supabase/Postgres migration.
- **Payments:** provider-agnostic interface under `api/_lib/billing/payments/` with `mock` (default) and Stripe stub.

Free activation happens on **register** and on **`GET /api/v1/auth/me`** / **`GET /api/v1/billing/subscription`** — never trust the browser alone.

## Environment variables

### Development

```bash
PAYMENT_PROVIDER=mock
ENABLE_MOCK_PAYMENTS=true
# Optional AI (unchanged)
# OPENAI_API_KEY=
# AI_MONTHLY_CREDITS=10
```

### PayPal

Use a PayPal **Business / Developer app** for the merchant that should receive funds
(login such as `romscp@gmail.com`). Configure **API credentials** — the email itself is not passed to PayPal Checkout.

```bash
PAYMENT_PROVIDER=paypal
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Sandbox first via [developer.paypal.com](https://developer.paypal.com/) → Apps & Credentials.

### Production (Stripe-ready)

```bash
PAYMENT_PROVIDER=stripe
ENABLE_MOCK_PAYMENTS=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=
STRIPE_TEAM_MONTHLY_PRICE_ID=
```

Never expose `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, PayPal secrets, or Blob/service-role keys to the frontend.

Mock payments are **blocked** when `NODE_ENV=production` unless `ALLOW_MOCK_PAYMENTS_IN_PROD=true` (admin override only).

Optional flags:

```bash
ENABLE_FOUNDING_MEMBER_PROGRAM=false
ALLOW_MOCK_PAYMENTS_IN_PROD=false
```

## Local setup

```bash
cd frontend
npm install
PAYMENT_PROVIDER=mock ENABLE_MOCK_PAYMENTS=true npm run dev:vercel
```

Open http://localhost:5174 → `/pricing`, register, open `/admin/billing`.

## Mock payment testing

1. Sign in as a Free user.
2. Visit `/upgrade` (or Pricing → Upgrade).
3. Choose Professional/Team and monthly/annual.
4. Continue to `/checkout/mock`.
5. Simulate **success** → redirects to `/checkout/success` (server re-fetches subscription).
6. Simulate **failed/cancelled** → Free plan unchanged.
7. On Billing, **Cancel at period end** → status `canceling`, access retained until period end.

```bash
cd frontend
UXGUARD_TEST=1 npm test
```

## Real payment provider (Stripe) next steps

1. Create Stripe products/prices matching Professional monthly/yearly and Team monthly.
2. Set env vars above; set `PAYMENT_PROVIDER=stripe`.
3. Implement checkout session creation in `payments/providers/stripe-provider.js`.
4. Wire `api/v1/billing/webhook.js` with signature verification + idempotent event handling for:
   - checkout completed, subscription created/updated/cancelled
   - invoice paid / payment failed / refund
5. Never activate paid plans from client success URLs alone.

## Subscription lifecycle

1. Register → Free subscription `active` + usage cycle.
2. Upgrade → mock/Stripe checkout → paid subscription `active`; previous Free marked `replaced`.
3. Cancel → `canceling` + `cancel_at_period_end`; paid features until `current_period_end`.
4. Period end → lazy `applyDueDowngrades` moves user to Free; content retained; new creates blocked by Free limits.

## Usage reset

- Each subscription has a usage cycle (`user_usage.cycle_start` / `cycle_end`).
- Free cycles start at activation (monthly).
- Paid cycles align with the billing period when activated.
- **AI credits** reset at cycle start (idempotent lazy reset).
- **Storage** does not reset.
- Portfolio / case study counts sync from actual records.

## Security

- Entitlements computed server-side from DB/store + plan config.
- Checkout and mock complete require auth.
- Mock blocked in production without override.
- Webhook stub requires Stripe secret when provider is stripe.
- Users only receive their own subscription payload from authenticated routes.

## Known limitations

- Stripe checkout/webhooks are stubs (Phase 3).
- Admin promotional tools / founding-member program not fully UI-wired.
- Email verification is not a separate gate; Free is provisioned on account creation.
- No dedicated cron — downgrades/resets use lazy evaluation on billing/AI requests.
- Postgres RLS policies are reference-only until migrated off Blob JSON.

## Recommended next steps

1. Complete Stripe provider + webhook idempotency.
2. Admin billing console (grant credits, force plan, audit log UI).
3. Downgrade UX for choosing which portfolio stays public / locking excess case studies.
4. Scheduled job for period-end downgrades independent of user traffic.
