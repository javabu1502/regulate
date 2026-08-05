# Regulate

A nervous system regulation app. Body-first tools — somatic exercises, guided breathing, grounding, bilateral tapping — built on polyvagal theory and Somatic Experiencing research, for the moments when thinking your way out isn't working.

**Completely free. No accounts, no subscriptions, no ads, no tracking.** Everything lives in your browser's localStorage; nothing ever leaves your device.

Live at [regulate-liart.vercel.app](https://regulate-liart.vercel.app).

## What's inside

- **SOS mode** — state-matched crisis flow: tell it how your body feels, get the right tool immediately
- **14 somatic exercises** — shaking, havening, orienting, pendulation, vagus nerve massage, and more
- **Guided breathing** — box, physiological sigh, coherence, with voice guidance and haptics
- **Body scan, 5-4-3-2-1 grounding, affirmations, sleep tools, calming games**
- **Guided meditations** — grounding, processing, self-compassion, regulation, sleep
- **Safety plan & toolkit** — warning signs, reasons for living, your people
- **Journal & practice insights** — what you tried, what actually helped

Installable as a PWA and designed to work offline — a crisis tool can't depend on a connection.

## Principles

- **Somatic first.** The body leads; explanations come after.
- **Crisis first.** Every screen assumes the user might be at their worst.
- **No gamification.** No streaks, points, mascots, or guilt.
- **Private by architecture.** localStorage only — there is no backend to trust.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest
npm run build   # regenerates public/audio-manifest.json, then next build
```

Stack: Next.js (App Router), Tailwind v4, TypeScript. No database, no API routes for user data.

Audio lives in `public/audio/`; `scripts/generate-audio-manifest.mjs` builds the manifest the service worker uses to precache clips for offline playback. Recording scripts are in `RECORDING_SCRIPTS.md` and `MEDITATION_SCRIPTS.md` (the in-code copy in `somatic/page.tsx` is canonical where they differ).

## Deploy

Deployed on Vercel; `npm run build` is the whole story.
