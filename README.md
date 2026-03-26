# LAG Auto — AutoReply AI

AI-powered sales email and SMS generator for Landsperg Automotive Group.

## What It Does

- **Email generation** — Personalized initial reply emails from customer internet leads
- **SMS generation** — 5-line punchy text messages for buyers who prefer texting
- **Follow-up sequences** — 48-hour check-in and 7-day re-engagement emails, auto-generated
- **Vehicle lookup** — Parses lagauto.ca URLs or freeform vehicle names (e.g. "2026 Hyundai Santa Fe Hybrid Calligraphy")
- **Real resource links** — AutoTrader.ca reviews, YouTube walkarounds, and OEM spec pages embedded in every email

## Quick Start

```bash
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on **Cloudflare Pages** via `wrangler.toml`.

```bash
npm run build
npx wrangler pages deploy
```

## Stack

- React (single-file JSX)
- Claude claude-sonnet-4-20250514 (Anthropic)
- Next.js / Cloudflare Pages edge runtime

## Built For

Les Landsperg / Landsperg Automotive Group (LAG Auto) — Red Deer & Leduc, Alberta, Canada

**Built by Hilary Kai**
