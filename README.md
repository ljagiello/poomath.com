# 💩 Poo Math

A generic **Burning Man RV pump-out & water planner**. It estimates how many
gray/black **pump-outs** and fresh-water **refills** your rig needs across the
event, when they fall, and the risk around them — then drafts a copy-ready reply
for your camp's RV survey.

Built with [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5 runes) and
prerendered to static files.

## What it does

- **Event window & phases** — set gates-open / close dates; the **Event** week is
  always planned, while **Pre-build** and **Strike** nights are selectable toggles.
- **Key nights / burns** — editable list (Man Burn, Temple Burn, …); the ⭐ one is
  drawn bold on the chart with a tank-status check.
- **Rig presets** — travel trailers, fifth wheels, motorhomes, plus rentals like
  **Cruise America** and **El Monte RV** — or go fully custom.
- **Crew** — per-person arrive/depart dates, gender (women & men use water
  differently), and a per-person use multiplier.
- **Water model** — showers, sink → gray, toilet → black, porta-potty offload, and
  configurable service triggers. Drinking/cooking water is assumed bottled, so it
  doesn't count toward refills.
- **Monte Carlo** — 1000 seeded random scenarios for a likely / "service-by" date
  per pump-out, plus a weather-closure overflow-risk estimate.
- **Tank-level chart**, **service timeline**, and a **draft reply**.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

## Check & build

```bash
npm run check      # svelte-check / TypeScript
npm run build      # builds via @sveltejs/adapter-vercel → ./.vercel/output
npm run preview    # preview the production build
```

Deployed on **Vercel** (zero-config SvelteKit). Every route is prerendered, so it
ships as static assets with no serverless functions.

## Layout

| Path | What |
|---|---|
| `src/lib/model.ts` | Types, presets, defaults, and the `simulate()` water/waste model |
| `src/lib/montecarlo.ts` | Seeded Monte-Carlo pump-out risk + weather-closure overflow risk |
| `src/lib/facts.ts` | Rotating "poo facts" |
| `src/lib/components/TankChart.svelte` | Canvas tank-level chart |
| `src/routes/+page.svelte` | The planner UI |

## Notes on the numbers

Defaults scale metered residential water data down to playa conservation (no gray
dumping → every gallon in is waste you pump out). Sources are cited inline under
the "Data behind these numbers" and weather-history disclosures in the app.
