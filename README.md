# Open Satellite Tracker (No Proprietary API)

A complete browser satellite tracker that uses **open public source files** instead of commercial tracking APIs.

## What it shows
- Live satellite positions propagated in real time from TLE elements.
- Type, country/owner, NORAD ID, and orbit class (LEO/MEO/GEO/HEO).
- Searchable catalog table and click-to-inspect details.

## Data sources (open/public)
- Active TLE catalog: CelesTrak `GROUP=active` file.
- Satellite metadata: CelesTrak SATCAT CSV.

## Update to all active satellites
Run:

```bash
python scripts/update_data.py
```

This downloads and rebuilds `data/satellites.json` with all active satellites.

## Run locally
```bash
python -m http.server 8080
```
Then open `http://localhost:8080`.

> Note: This repository includes a tiny sample catalog in `data/satellites.json` for offline/demo use. Rebuild with `scripts/update_data.py` to load the full current catalog.
