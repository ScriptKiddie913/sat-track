import { NextResponse } from 'next/server'

let _cache: { data: any; ts: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 min

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json(_cache.data)
  }

  try {
    const res = await fetch(
      'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=80',
      {
        headers: { 'User-Agent': 'SatIntel/1.0 (satellite-tracker)' },
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!res.ok) throw new Error(`EONET responded ${res.status}`)

    const data = await res.json()
    const events = (data.events || []).map((ev: any) => {
      const geom = ev.geometry || [{}]
      const coords = geom.length > 0 ? geom[geom.length - 1].coordinates || [0, 0] : [0, 0]
      const cats = (ev.categories || []).map((c: any) => c.title)
      return {
        id: ev.id,
        title: ev.title,
        category: cats[0] || 'Unknown',
        lng: coords[0],
        lat: coords[1],
        date: geom.length > 0 ? geom[geom.length - 1].date : null,
      }
    })

    const payload = { events, count: events.length, ts: Date.now() }
    _cache = { data: payload, ts: Date.now() }
    return NextResponse.json(payload)
  } catch (err: any) {
    return NextResponse.json({ events: [], count: 0, error: err.message })
  }
}
