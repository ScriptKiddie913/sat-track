# Open Satellite Tracker (No Proprietary API)

A complete satellite tracker that runs in the browser and uses **open public source files** instead of proprietary satellite-tracking APIs.

## Features
- Live satellite positions propagated every second from TLE elements.
- Searchable catalog with details: NORAD ID, country/owner, type, orbit class, lat/lon/alt.
- Works locally with sample data and in production on Vercel with live catalog data.

## Open public data sources
- CelesTrak active TLE catalog (`GROUP=active`)
- CelesTrak SATCAT CSV metadata

## Vercel deployment (recommended)
This repo is Vercel-ready:
- `api/satellites.js` is a Vercel Serverless Function that fetches + merges live public catalogs.
- Frontend requests `/api/satellites` first, with fallback to local `data/satellites.json`.

### Deploy
1. Push this repo to GitHub.
2. Import into Vercel.
3. Deploy (no extra env vars needed).

## Local development
Run static app:

```bash
npm run serve
```

Then open `http://localhost:8080`.

## Optional: build/update local snapshot
If you want a local JSON snapshot from public sources:

```bash
npm run update-data
```

This regenerates `data/satellites.json`.

> Note: The repository includes a small sample `data/satellites.json` for offline/demo fallback.
