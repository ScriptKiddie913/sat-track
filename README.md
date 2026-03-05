# Real-Time Satellite Tracker (Live Public Data Only)

This implementation is a complete satellite-tracking module using **real live orbital data** from public sources, with no simulated/fake catalog data.

## System Overview

Pipeline (continuous):

TLE ingestion → orbit propagation (SGP4) → ECI/ECEF/geodetic transforms → coverage footprint calculation → country intersection → pass prediction → timeline indexing → WebSocket/API visualization.

## Architecture

### Backend
- In-memory satellite catalog (no DB required)
- TLE + SATCAT ingestion every 6 hours
- SGP4 propagation every 1 second
- Coverage footprint + geospatial intersection against world country polygons
- Pass prediction over a target location
- Timeline index for retrospective queries
- REST APIs + WebSocket stream (`/ws`)

### Frontend
- Cesium 3D globe
- Live satellite markers (lat/lon/alt)
- Orbit/ground track lines
- Coverage/country visibility metadata in info panel
- Pass timeline interface
- Filtering by classification/type/country

## Live Data Sources
- CelesTrak active TLE feed:
  - `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`
- CelesTrak SATCAT:
  - `https://celestrak.org/pub/satcat.csv`

## API

### Local Node server APIs
- `GET /api/health`
- `GET /api/catalog`
- `GET /api/positions`
- `GET /api/ground-track?norad=<id>&minutes=100&stepSec=60`
- `GET /api/passes?norad=<id>&lat=<lat>&lon=<lon>&hours=24`
- `GET /api/timeline/query?lat=<lat>&lon=<lon>&radiusKm=100&since=<ISO>`

### WebSocket
- `ws://<host>/ws`
- Emits payload every second:
  - `satId`, `name`, `lat`, `lon`, `alt`, `velocityKms`, `footprintKm`, `countries`, etc.

## Deploy / Run

### Local
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

### Vercel
This repository includes `vercel.json` and serverless API handlers:
- `/api/catalog`
- `/api/positions`
- `/api/ground-track`
- `/api/passes`

> Note: Vercel serverless environment is request/response oriented; WebSocket streaming is provided by `server.js` for standard Node hosting. On Vercel, frontend automatically uses API polling fallback.

## Performance Notes
- Designed for large active catalogs in memory.
- 1-second update cadence.
- Country intersection uses Turf geospatial operations.
- Timeline keeps rolling in-memory records for queryability.
