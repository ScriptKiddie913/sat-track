import { NextRequest, NextResponse } from 'next/server'
import { parseTLEText } from '@/lib/tle-parser'
import { TLE_URLS } from '@/lib/satellites-data'
import type { SatCategory } from '@/lib/types'

const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 min

export async function GET(req: NextRequest) {
  const category = (req.nextUrl.searchParams.get('category') ?? 'active') as SatCategory
  const url = TLE_URLS[category]

  if (!url) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 })
  }

  const cacheKey = `tle_${category}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SatIntel/1.0 (satellite-tracker)' },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      throw new Error(`CelesTrak responded ${res.status}`)
    }

    const raw = await res.text()
    const satellites = parseTLEText(raw)

    const payload = { satellites, count: satellites.length, category, ts: Date.now() }
    cache.set(cacheKey, { data: payload, ts: Date.now() })

    return NextResponse.json(payload)
  } catch (err: any) {
    // Return cached if available, even stale
    if (cached) {
      return NextResponse.json(cached.data)
    }
    return NextResponse.json(
      { error: 'Failed to fetch TLE data', detail: err.message },
      { status: 502 }
    )
  }
}
