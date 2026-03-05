import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')

  const cacheKey = 'satcat'
  const cached = cache.get(cacheKey)

  let rows: string[]

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    rows = cached.data
  } else {
    try {
      const res = await fetch(
        'https://celestrak.org/pub/satcat.csv',
        {
          headers: { 'User-Agent': 'SatIntel/1.0' },
          signal: AbortSignal.timeout(30000),
        }
      )
      if (!res.ok) throw new Error(`SATCAT ${res.status}`)
      const csv = await res.text()
      rows = csv.split('\n').slice(1)
      cache.set(cacheKey, { data: rows, ts: Date.now() })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch SATCAT' }, { status: 502 })
    }
  }

  let satellites = rows
    .map((row) => {
      const cols = row.split(',')
      if (cols.length < 13) return null
      return {
        name: cols[0]?.trim(),
        noradId: cols[2]?.trim(),
        ownerCode: cols[5]?.trim(),
        launchDate: cols[6]?.trim(),
        period: parseFloat(cols[9]) || 0,
        inclination: parseFloat(cols[10]) || 0,
        apogee: parseInt(cols[11]) || 0,
        perigee: parseInt(cols[12]) || 0,
        status: cols[4]?.trim(),
      }
    })
    .filter((s): s is NonNullable<typeof s> => !!s?.name && !!s?.noradId)

  if (country) {
    satellites = satellites.filter(
      (s) =>
        s.ownerCode === country.toUpperCase() ||
        s.ownerCode?.includes(country.toUpperCase())
    )
  }

  // Return summary stats
  const countryCounts: Record<string, number> = {}
  satellites.forEach((s) => {
    const c = s.ownerCode || 'UNK'
    countryCounts[c] = (countryCounts[c] || 0) + 1
  })

  return NextResponse.json({
    satellites: satellites.slice(0, 500),
    total: satellites.length,
    countryCounts,
  })
}
