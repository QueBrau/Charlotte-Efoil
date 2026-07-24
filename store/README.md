# Charlotte eFoil Store

Premium Waydoo e-commerce experience built with Next.js App Router, Supabase, and anime.js.

## Features

- Full Waydoo product catalog (Supabase-backed, demo fallback offline)
- Package configurator with compatibility rules and live pricing
- Persistent shopping cart (Zustand)
- Dealer checkout flow (no online card payments)
- Invoice PDF generation + admin email workflow
- Estimated sales tax by shipping state (provider abstraction)

## Development

```bash
cd store
npm install
npm run dev
```

Open [http://localhost:5173/waydoo](http://localhost:5173/waydoo) from the main site (Vite proxies to the Next.js store on port 3456).

From the repo root, run both servers together:

```bash
npm run dev
```

This starts the marketing site (Vite) and the Waydoo shop (Next.js at `/waydoo`).

Without Supabase env vars, the app serves the full demo catalog from `src/lib/catalog/demo-data.ts`.

## Environment

Copy `.env.example` to `.env.local` and fill in values:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — catalog + auth
- `SUPABASE_SERVICE_ROLE_KEY` — order submission, invoice storage
- `AWS_*` + `SES_*` — admin invoice email notifications

## Database

Apply migrations and seed:

```bash
npm run generate:product-media-seed   # from imported manifest (after import:waydoo-media)
npm run seed:store                    # applies store/supabase migrations + seeds
```

Or manually:

```bash
psql $DATABASE_URL -f supabase/migrations/001_ecommerce_schema.sql
psql $DATABASE_URL -f supabase/seed/001_waydoo_catalog.sql
psql $DATABASE_URL -f supabase/seed/002_product_media_import.sql
```

Create public storage buckets named `invoices` and `product-media` (the importer creates `product-media` when Supabase env vars are set).

## Deployment

Deploy the `store/` directory as a standalone Next.js app (Netlify with `@netlify/plugin-nextjs`, Vercel, etc.).

Link from the marketing site navigation when ready.
