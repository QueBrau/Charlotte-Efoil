# CharlotteEfoil Backend

A Supabase (Postgres) backend fronted by Netlify Functions. It captures contact
and reservation submissions and tracks visitor analytics (unique visitors,
sessions, page views, and interaction events).

## Architecture

```
Browser (static Vite site)
   │  fetch / sendBeacon  (text/plain or JSON, same origin)
   ▼
Netlify Functions  (/api/contact, /api/reservations, /api/track)
   │  service-role key (server-side only)  →  RPC calls
   ▼
Supabase Postgres  (RLS on, no public access; service role only)
```

Why a function layer instead of calling Supabase from the browser?

- The **service-role key stays server-side** — the database is never exposed.
- We validate input, run a **honeypot spam check**, and **hash visitor IPs**.
- Row Level Security is enabled with **no public policies**, so the anon key has
  zero access to any table. Only the functions (service role) can read/write.

## Database design

### Lead / submission side (people who contact us)

| Table | Purpose | Key relationships |
|---|---|---|
| `leads` | One row per unique person (deduped by `email`). | parent of submissions & reservations |
| `contact_submissions` | Every contact-form submit. | `lead_id → leads` |
| `reservation_requests` | Every reservation request. | `lead_id → leads` |
| `interest_types` | Lookup of interest options (lesson/demo/corporate/family). | — |
| `reservation_request_interests` | M:N join of a request to its interests. | `→ reservation_requests`, `→ interest_types` |

A person can submit many times; each submission links back to one `lead`,
deduped by email, so "thousands of people" stay clean and queryable.

### Analytics side (visitor tracking)

| Table | Purpose | Key relationships |
|---|---|---|
| `visitors` | One row per unique browser (deduped by a localStorage token). Optional `lead_id` links a visitor to a person once they submit a form. | `lead_id → leads` |
| `sessions` | A single visit (30-min inactivity window). Holds referrer/UTM/device. | `visitor_id → visitors` |
| `page_views` | Each page load. | `session_id → sessions`, `visitor_id → visitors` |
| `events` | Custom interactions (cta_click, phone_click, form_start, form_submit, …). | `session_id → sessions`, `visitor_id → visitors` |

**Unique visitors** = distinct `visitors.id`. A persistent token in
`localStorage` identifies the browser across sessions; a `sessionStorage` token
groups activity into sessions.

### Reporting views (`0003_views.sql`)

- `analytics_daily_traffic` — unique visitors / sessions / page views per day
- `analytics_new_vs_returning` — new vs returning visitors per day
- `analytics_top_pages` — most-viewed pages with unique reach
- `analytics_traffic_sources` — first-touch UTM / referrer breakdown
- `analytics_event_counts` — interaction volume by event type
- `analytics_lead_overview` — leads with submission/reservation counts
- `analytics_daily_submissions` — contact vs reservation submissions per day

## Setup

### 1. Create the database

Create a project at [supabase.com](https://supabase.com), then apply the
migrations in `supabase/migrations/` **in order**:

**Option A — Supabase SQL editor:** paste and run each file (`0001`, `0002`, `0003`).

**Option B — Supabase CLI:**

```bash
npm i -g supabase
supabase link --project-ref YOUR_PROJECT_REF
supabase db push        # or: psql "$DB_URL" -f supabase/migrations/0001_schema.sql ...
```

### 2. Configure environment variables

Copy `.env.example` to `.env` for local dev, and set the same values in
**Netlify → Site settings → Environment variables** for production:

| Variable | Where to find it | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API | |
| `SUPABASE_SERVICE_ROLE_KEY` | same page | **secret**, server-only |
| `TRACKING_IP_SALT` | `openssl rand -hex 32` | IP hashing salt |
| `ADMIN_PASSWORD` | `openssl rand -hex 24` | password for the `/admin` dashboard |
| `SES_REGION` | e.g. `us-east-1` | your SES region |
| `SES_ACCESS_KEY_ID` | IAM user | needs `ses:SendEmail` |
| `SES_SECRET_ACCESS_KEY` | IAM user | **secret** |
| `SES_FROM_EMAIL` | verified sender | verified identity/domain in SES |
| `NOTIFY_EMAIL` | your inbox | where reservations are routed (default `hello@charlotteefoil.com`) |
| `MAIL_FOOTER_ADDRESS` | your mailing address | CAN-SPAM footer for bulk campaigns |
| `SITE_URL` | optional | used for unsubscribe links (auto-detected) |
| `ALLOWED_ORIGIN` | optional | lock API to your domain |

## Email (Amazon SES)

All email — the reservation notification **and** bulk marketing campaigns — is
sent through **Amazon SES**, which is built for cheap volume (~$0.10 per 1,000
emails, so 3,000 contacts twice a month is well under a dollar).

### Setup

1. In AWS SES, **verify your sending domain** (charlotteefoil.com) and set up
   DKIM. Verify `SES_FROM_EMAIL`.
2. **Request production access** — new SES accounts are sandboxed (can only send
   to verified addresses, ~200/day). Production access lifts this and raises your
   send-rate quota.
3. Create an **IAM user** with an `ses:SendEmail` policy and put its keys in
   `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` (never use root credentials).
4. Set the SES env vars locally and in Netlify.

### Reservation notifications

When a reservation is submitted, `/api/reservations` saves it and emails a
formatted summary to `NOTIFY_EMAIL`, with the requester set as reply-to. If SES
isn't configured, the submission is still stored — only the email is skipped.

### Bulk campaigns (email blast)

From the `/admin` dashboard → **Email campaign**: enter a subject and message
(basic HTML), and send to every contact who hasn't unsubscribed. The flow:

- `POST /api/admin?action=send_campaign` creates a row in `email_campaigns` and
  triggers `send-campaign-background` (a Netlify **background function**, 15-min
  limit) so large sends don't time out.
- The background sender loads the `email_audience` view, sends via SES with
  bounded concurrency + throttle backoff, appends a CAN-SPAM footer with your
  `MAIL_FOOTER_ADDRESS` and a one-click **unsubscribe** link, and records each
  send in `email_sends`.
- Unsubscribes hit `/api/unsubscribe?token=…`, which sets `leads.unsubscribed_at`
  and removes the contact from the audience (also honored via the
  `List-Unsubscribe` header).

Campaign status and sent/failed counts appear in the dashboard's campaign
history. Make sure your SES send-rate quota comfortably covers your list size.

### 3. Run locally

```bash
npm install
npx netlify dev        # serves the Vite site + functions at /api/*
```

Visit the site, submit a form, and confirm rows appear in `contact_submissions`
/ `reservation_requests` and that `visitors`, `sessions`, and `page_views` fill
in. (Plain `npm run dev` runs the site but not the `/api/*` functions.)

### 4. Deploy

Push to the connected repo (Netlify auto-builds) or run `npx netlify deploy --prod`.
The `netlify.toml` already points the build at `dist` and functions at
`netlify/functions`.

## API endpoints

| Endpoint | Method | Body |
|---|---|---|
| `/api/contact` | POST | `{ name, email, message, company(honeypot) }` |
| `/api/reservations` | POST | `{ first_name, last_name, email, phone, session_time, launch_location, preferred_date, interests[], terms_accepted, company }` |
| `/api/track` | POST | `{ visitor_token, session_token, events[], …context }` |
| `/api/admin` | GET | `?action=…` — requires `Authorization: Bearer <ADMIN_PASSWORD>` |

All responses are JSON; `/api/track` returns `204`.

## Admin dashboard

A password-gated analytics dashboard lives at **`/admin`** (`admin.html`). Sign in
with `ADMIN_PASSWORD`; the value is kept only in `sessionStorage` and sent as a
bearer token — no analytics data is ever exposed to unauthenticated visitors.

It shows:

- **Overview** — unique visitors, sessions, page views, pages/session, interactions, leads, and submission counts.
- **Traffic (30 days)** — daily unique visitors / sessions / views.
- **Top pages** — views, unique reach, and **average time on page**.
- **Traffic sources** — first-touch UTM / referrer.
- **Unique visitors** — one row per browser; click any row for a drill-down of
  every page they viewed (with time on page) and every link/button they clicked.
- **Recent clicks** — the latest link and CTA interactions across the site.

Time-on-page is measured client-side as *engaged* (visible) time and sent via
`sendBeacon` when the page is hidden or closed, then stored on the matching
`page_views` row (`0004_page_duration.sql`).

The dashboard is marked `noindex, nofollow`. For an extra layer, you can also
protect it with Netlify password protection or Netlify Identity.

## Scaling notes

- Hot paths are indexed (FKs, `created_at`, `email`, tokens, `path`).
- Counters (`visitors.total_sessions`, etc.) are updated inside the ingest RPC
  to avoid per-row trigger overhead.
- If `page_views`/`events` grow very large over years, consider monthly
  partitioning or periodically archiving raw events while keeping the views.
