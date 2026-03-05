import { NextResponse } from 'next/server'

const cache: { data: any; ts: number } | null = null
let _cache: { data: any; ts: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 min

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data)
  }

  try {
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      {
        headers: { 'User-Agent': 'SatIntel/1.0 (satellite-tracker)' },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!res.ok) throw new Error(`USGS responded ${res.status}`)

    const data = await res.json()
    const quakes = (data.features || []).slice(0, 200).map((f: any) => {
      const p = f.properties || {}
      const coords = f.geometry?.coordinates || [0, 0, 0]
      return {
        id: f.id,
        mag: p.mag,
        place: p.place,
        time: p.time,
        lng: coords[0],
        lat: coords[1],
        depth: coords[2],
        tsunami: p.tsunami,
      }
    })

    const payload = { quakes, count: quakes.length, ts: Date.now() }
    _cache = { data: payload, ts: Date.now() }
    return NextResponse.json(payload)
  } catch (err: any) {
    return NextResponse.json({ quakes: [], count: 0, error: err.message })
  }
}
