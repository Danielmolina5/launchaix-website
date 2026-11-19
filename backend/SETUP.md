# LaunchAI accounts, payments and support: go-live setup

Until these steps are done the site runs in **preview mode**: accounts and tickets live only
in the browser and the Stripe step is skipped. Preview mode refuses to run on launchaix.com,
so fake accounts can never exist on the real site. Customers always pay on Stripe's own
Payment Link page; there is no custom checkout.

## 1. Supabase (accounts, orders, support tickets)
1. Create a project at supabase.com.
2. SQL Editor → paste all of `supabase-schema.sql` → Run. It is safe to run again later.
   Then paste and run `supabase-grants.sql` (table permissions for new projects).
3. Authentication → Providers → Email: keep **Confirm email** OFF for the smoothest checkout,
   set minimum password length to 8, and turn on **leaked password protection**.
4. Authentication → URL Configuration: Site URL `https://www.launchaix.com`, and add
   `https://www.launchaix.com/account` to Redirect URLs.
5. Project Settings → API: put the **Project URL** and **anon public key** in `config.js`.
   The **service_role key** is secret: it only goes into Vercel (step 4), never in any file.
6. Make yourself a support agent (SQL Editor):
   `insert into public.admins (user_id) select id from auth.users where email = 'you@yourdomain.com';`

## 2. Stripe Payment Links
| Key in config.js | Product | Price |
|---|---|---|
| `leads`  | Daily Real Estate Leads | $49.99 / month, 7-day free trial |
| `video1` | 1 testimonial video | $59.99 one-time |
| `video2` | 2 testimonial videos | $99.99 one-time |
| `video3` | 3 testimonial videos | $134.99 one-time |
| `seo`    | SEO & Online Reputation | $349.99 / month (no trial) |
| `web`    | Professional Website (deposit) | $199 one-time |

For each link: After payment → Redirect to `https://www.launchaix.com/account?paid=1`.
Settings → Billing → Customer portal: turn on the login link, put it in `STRIPE_PORTAL_URL`.

## 3. Email for support alerts (Resend)
1. Create a free account at resend.com and verify the domain `launchaix.com`.
2. Create an API key.

## 4. Vercel
1. Copy `backend/api/stripe-webhook.js` and `backend/api/support-notify.js` into `/api/` at the repo root.
2. Settings → Environment Variables (Production):

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
| `STRIPE_WEBHOOK_SECRET` | from step 5 |
| `SUPPORT_EMAIL` | **your private support inbox** (never shown to customers) |
| `SUPPORT_FROM` | `LaunchAI Support <noreply@launchaix.com>` |
| `RESEND_API_KEY` | from step 3 |
| `SUPPORT_WEBHOOK_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `SITE_URL` | `https://www.launchaix.com` |

3. Merge the `headers` block from `vercel.json.example` into `vercel.json` (security headers).

## 5. Webhooks
- **Stripe** → Developers → Webhooks → endpoint `https://www.launchaix.com/api/stripe-webhook`,
  events `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- **Supabase** → Database → Webhooks → table `ticket_messages`, event INSERT, HTTP POST to
  `https://www.launchaix.com/api/support-notify`, header `x-webhook-secret` = your
  `SUPPORT_WEBHOOK_SECRET`.

## How support works
- Customers open requests from **Help** / the **Support** tab in their account and see every reply there.
- Each new customer message emails your private `SUPPORT_EMAIL`. Reply in
  `https://www.launchaix.com/admin.html` (support desk; staff only, enforced by the database).
- When you reply, the customer gets an email that a reply is waiting in their account. Your
  support address never appears in emails to customers or anywhere in the website code.

## Security summary
- Row Level Security on every table: customers can only see their own data.
- Paid orders can only be written by the Stripe webhook, which verifies Stripe's signature and
  holds anything that doesn't match the plan's price, payment type or currency as `review`.
- Only admins (listed in `public.admins`, which customers cannot edit) can reply as support,
  change ticket status or change order status.
- Customers can edit only their contact fields; the email on a ticket is taken from the account,
  not the browser. Built-in limits: 5 new tickets per hour, 20 messages per 10 minutes.
- All customer text is escaped before display and in emails; email subjects are stripped of
  line breaks (no header injection).

## Tests
`node backend/test-webhook.js` and `node backend/test-support.js`
