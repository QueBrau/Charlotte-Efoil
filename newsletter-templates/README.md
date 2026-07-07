# CharlotteEfoil newsletter templates (MJML)

Ten MJML starter templates for the admin **Email marketing → Flyer designer**.
They compile to email-safe HTML for GrapesJS.

## Templates

| File | Style |
|------|--------|
| `01-hero-announcement.mjml` | Hero image + headline + CTA (welcome email) |
| `02-monthly-lake-update.mjml` | Monthly conditions & open dates |
| `03-summer-promo.mjml` | Bold promotional offer banner |
| `04-lesson-spotlight.mjml` | Product feature + bullets + image |
| `05-corporate-outing.mjml` | B2B corporate / team events |
| `06-open-dates.mjml` | Weekend availability list |
| `07-photo-gallery.mjml` | Two-column photo grid |
| `08-testimonial.mjml` | Quote + stars + social proof |
| `09-new-location.mjml` | New launch location announcement |
| `10-seasonal-tips.mjml` | Numbered tips list + CTA |

## Brand tokens

Shared layout: dark outer body, split hero (55/45), rounded light cards, pill badges, promo CTA block, Inter font.

- Outer body: `#0d1519`
- Hero panel: `#194055`
- Hero text: `#eef4f6` / muted `#c8e4ef`
- Cards: `#eef4f6` / tint `#dce8ee`
- Text: `#12303f` / muted `#5a6d78`
- Accent CTA: `#4fb0d4` / deep `#23546e`
- Success CTA: `#46c78f`

Use `{{SITE}}` in MJML for absolute URLs (replaced at compile time).

## Edit & rebuild

1. Edit `.mjml` files in this folder
2. Run `npm run build:templates`
3. Output updates `js/newsletter-templates.js` (picked up by the admin UI)

Every template includes the **CharlotteEfoil logo** at the top and uses **`lakenorman.jpg`** for photo placeholders. When a flyer is attached, the logo comes from the template; message-only sends still get the logo automatically at send time.
