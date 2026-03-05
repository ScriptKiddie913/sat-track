import { NextResponse } from 'next/server'

// Prevent Next.js static caching of this route
export const dynamic = 'force-dynamic'

/* ── Ship type classifier (matches vessel-tra logic) ── */
function shipTypeName(t: number): string {
  if (t === 30) return 'Fishing'
  if (t === 31 || t === 32 || t === 52) return 'Tug'
  if (t === 35 || t === 36 || t === 55) return 'Military'
  if (t >= 40 && t <= 49) return 'High Speed'
  if (t >= 60 && t <= 69) return 'Passenger'
  if (t >= 70 && t <= 79) return 'Cargo'
  if (t >= 80 && t <= 89) return 'Tanker'
  if (t === 50) return 'Pilot'
  if (t === 51) return 'SAR'
  return 'Unknown'
}

/* ── MMSI first-3-digits → flag emoji ── */
const MID_FLAGS: Record<string, string> = {
  '201':'\u{1F1E6}\u{1F1F1}','205':'\u{1F1E7}\u{1F1EA}','209':'\u{1F1E8}\u{1F1FE}',
  '211':'\u{1F1E9}\u{1F1EA}','219':'\u{1F1E9}\u{1F1F0}','220':'\u{1F1E9}\u{1F1F0}',
  '224':'\u{1F1EA}\u{1F1F8}','225':'\u{1F1EA}\u{1F1F8}','226':'\u{1F1EB}\u{1F1F7}',
  '227':'\u{1F1EB}\u{1F1F7}','228':'\u{1F1EB}\u{1F1F7}','230':'\u{1F1EB}\u{1F1EE}',
  '232':'\u{1F1EC}\u{1F1E7}','233':'\u{1F1EC}\u{1F1E7}','234':'\u{1F1EC}\u{1F1E7}',
  '235':'\u{1F1EC}\u{1F1E7}','237':'\u{1F1EC}\u{1F1F7}','238':'\u{1F1ED}\u{1F1F7}',
  '240':'\u{1F1EC}\u{1F1F7}','244':'\u{1F1F3}\u{1F1F1}','245':'\u{1F1F3}\u{1F1F1}',
  '247':'\u{1F1EE}\u{1F1F9}','248':'\u{1F1F2}\u{1F1F9}','249':'\u{1F1F2}\u{1F1F9}',
  '255':'\u{1F1F5}\u{1F1F9}','256':'\u{1F1F2}\u{1F1F9}','257':'\u{1F1F3}\u{1F1F4}',
  '258':'\u{1F1F3}\u{1F1F4}','259':'\u{1F1F3}\u{1F1F4}','261':'\u{1F1F5}\u{1F1F1}',
  '263':'\u{1F1F5}\u{1F1F9}','265':'\u{1F1F8}\u{1F1EA}','266':'\u{1F1F8}\u{1F1EA}',
  '271':'\u{1F1F9}\u{1F1F7}','272':'\u{1F1FA}\u{1F1E6}','273':'\u{1F1F7}\u{1F1FA}',
  '301':'\u{1F1E6}\u{1F1EE}','303':'\u{1F1FA}\u{1F1F8}','308':'\u{1F1E7}\u{1F1F8}',
  '311':'\u{1F1E7}\u{1F1F8}','316':'\u{1F1E8}\u{1F1E6}','338':'\u{1F1FA}\u{1F1F8}',
  '345':'\u{1F1F2}\u{1F1FD}','351':'\u{1F1F5}\u{1F1E6}','352':'\u{1F1F5}\u{1F1E6}',
  '353':'\u{1F1F5}\u{1F1E6}','354':'\u{1F1F5}\u{1F1E6}','355':'\u{1F1F5}\u{1F1E6}',
  '356':'\u{1F1F5}\u{1F1E6}','357':'\u{1F1F5}\u{1F1E6}','366':'\u{1F1FA}\u{1F1F8}',
  '367':'\u{1F1FA}\u{1F1F8}','368':'\u{1F1FA}\u{1F1F8}','369':'\u{1F1FA}\u{1F1F8}',
  '370':'\u{1F1F5}\u{1F1E6}','371':'\u{1F1F5}\u{1F1E6}','372':'\u{1F1F5}\u{1F1E6}',
  '373':'\u{1F1F5}\u{1F1E6}','374':'\u{1F1F5}\u{1F1E6}',
  '401':'\u{1F1E6}\u{1F1EB}','403':'\u{1F1F8}\u{1F1E6}','405':'\u{1F1E7}\u{1F1E9}',
  '412':'\u{1F1E8}\u{1F1F3}','413':'\u{1F1E8}\u{1F1F3}','414':'\u{1F1E8}\u{1F1F3}',
  '416':'\u{1F1F9}\u{1F1FC}','422':'\u{1F1EE}\u{1F1F7}','425':'\u{1F1EE}\u{1F1F6}',
  '428':'\u{1F1EE}\u{1F1F1}','431':'\u{1F1EF}\u{1F1F5}','432':'\u{1F1EF}\u{1F1F5}',
  '440':'\u{1F1F0}\u{1F1F7}','441':'\u{1F1F0}\u{1F1F7}','447':'\u{1F1F0}\u{1F1FC}',
  '461':'\u{1F1F4}\u{1F1F2}','466':'\u{1F1F6}\u{1F1E6}',
  '470':'\u{1F1E6}\u{1F1EA}','471':'\u{1F1E6}\u{1F1EA}','477':'\u{1F1ED}\u{1F1F0}',
  '503':'\u{1F1E6}\u{1F1FA}','512':'\u{1F1F3}\u{1F1FF}','525':'\u{1F1EE}\u{1F1E9}',
  '533':'\u{1F1F2}\u{1F1FE}','538':'\u{1F1F2}\u{1F1ED}','548':'\u{1F1F5}\u{1F1ED}',
  '559':'\u{1F1F8}\u{1F1EC}','563':'\u{1F1F8}\u{1F1EC}','564':'\u{1F1F8}\u{1F1EC}',
  '565':'\u{1F1F8}\u{1F1EC}','567':'\u{1F1F9}\u{1F1ED}','574':'\u{1F1FB}\u{1F1F3}',
  '601':'\u{1F1FF}\u{1F1E6}','603':'\u{1F1E6}\u{1F1F4}','605':'\u{1F1E9}\u{1F1FF}',
  '622':'\u{1F1EA}\u{1F1EC}','636':'\u{1F1F1}\u{1F1F7}','637':'\u{1F1F1}\u{1F1F7}',
  '657':'\u{1F1F3}\u{1F1EC}','701':'\u{1F1E6}\u{1F1F7}','710':'\u{1F1E7}\u{1F1F7}',
  '725':'\u{1F1E8}\u{1F1F1}','730':'\u{1F1E8}\u{1F1F4}','760':'\u{1F1F5}\u{1F1EA}',
  '770':'\u{1F1FA}\u{1F1FE}',
}
function mmsiFlag(mmsi: string): string {
  return MID_FLAGS[mmsi.slice(0, 3)] || '\u{1F3F3}\u{FE0F}'
}

interface ShipRecord {
  id: string; name: string; type: string
  lat: number; lng: number; course: number; speed: number
  flag: string; source: string
}

async function fetchWithTimeout(
  url: string, headers: Record<string, string> = {}, timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal, headers })
  } finally {
    clearTimeout(timer)
  }
}

/* ── BarentsWatch / Kystverket (Norwegian AIS, public) ── */
async function fetchBarentsWatch(): Promise<ShipRecord[]> {
  const ships: ShipRecord[] = []
  const urls = [
    'https://live.ais.barentswatch.no/v1/latest/combined',
    'https://apis.kystverket.no/ais-beta/v1/boundingbox?topleftlat=82&topleftlon=-5&bottomrightlat=50&bottomrightlon=35&modelType=Simple',
  ]
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {
        Accept: 'application/json', 'User-Agent': 'ShipTracker/3.0',
      })
      if (!res.ok) continue
      const data = await res.json()
      const rows: any[] = Array.isArray(data) ? data : (data.vessels || data.data || [])
      for (const s of rows) {
        const mmsi = String(s.mmsi || '')
        const lat = s.lat ?? s.latitude
        const lon = s.lon ?? s.longitude
        if (!mmsi || lat == null || lon == null) continue
        if (Number(lat) === 0 && Number(lon) === 0) continue
        ships.push({
          id: mmsi, name: String(s.name || s.shipname || 'IDENTIFYING...').trim(),
          type: shipTypeName(Number(s.shipType || s.ship_type || 0)),
          lat: Number(lat), lng: Number(lon),
          course: Number(s.courseOverGround || s.cog || 0),
          speed: Number(s.speedOverGround || s.sog || 0),
          flag: mmsiFlag(mmsi), source: 'BarentsWatch',
        })
      }
      if (ships.length > 0) break
    } catch { /* source unavailable */ }
  }
  return ships
}

/* ── AISHub (global, free API key) ── */
async function fetchAISHub(): Promise<ShipRecord[]> {
  const ships: ShipRecord[] = []
  try {
    const url =
      'https://data.aishub.net/ws.php?username=AH_3868855&format=1&output=json&compress=0' +
      '&latmin=-90&latmax=90&lonmin=-180&lonmax=180'
    const res = await fetchWithTimeout(url, { 'User-Agent': 'ShipTracker/3.0' })
    if (!res.ok) return ships
    const payload = await res.json()
    let rows: any[] = []
    if (Array.isArray(payload) && payload.length >= 2 && !payload[0]?.ERROR) {
      rows = payload[1] || []
    }
    for (const s of rows) {
      const mmsi = String(s.MMSI || '')
      if (!mmsi || s.LATITUDE == null || s.LONGITUDE == null) continue
      if (Number(s.LATITUDE) === 0 && Number(s.LONGITUDE) === 0) continue
      ships.push({
        id: mmsi, name: String(s.NAME || 'IDENTIFYING...').trim(),
        type: shipTypeName(Number(s.SHIPTYPE || 0)),
        lat: Number(s.LATITUDE), lng: Number(s.LONGITUDE),
        course: Number(s.COG || 0), speed: Number(s.SOG || 0),
        flag: mmsiFlag(mmsi), source: 'AISHub',
      })
    }
  } catch { /* source unavailable */ }
  return ships
}

/* ── ShipXplorer (scrape-like, best-effort) ── */
async function fetchShipXplorer(): Promise<ShipRecord[]> {
  const ships: ShipRecord[] = []
  try {
    const res = await fetchWithTimeout(
      'https://www.shipxplorer.com/api/vi/signals/newest?limit=500',
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Referer: 'https://www.shipxplorer.com/',
        Accept: 'application/json',
      },
    )
    if (!res.ok) return ships
    const data = await res.json()
    const items: any[] = Array.isArray(data)
      ? data
      : (data.ships || data.data || data.vessels || [])
    for (const s of items) {
      const mmsi = String(s.mmsi || s.MMSI || '')
      const lat = s.lat ?? s.latitude
      const lon = s.lon ?? s.longitude
      if (!mmsi || lat == null || lon == null) continue
      if (Number(lat) === 0 && Number(lon) === 0) continue
      ships.push({
        id: mmsi, name: String(s.name || 'IDENTIFYING...').trim(),
        type: shipTypeName(Number(s.type || 0)),
        lat: Number(lat), lng: Number(lon),
        course: Number(s.course || s.cog || 0),
        speed: Number(s.speed || s.sog || 0),
        flag: mmsiFlag(mmsi), source: 'ShipXplorer',
      })
    }
  } catch { /* source unavailable */ }
  return ships
}

/* ── ShipInfo (best-effort) ── */
async function fetchShipInfo(): Promise<ShipRecord[]> {
  const ships: ShipRecord[] = []
  const urls = [
    'https://shipinfo.net/api/v1/ships/positions?limit=500',
    'https://shipinfo.net/api/vessels?format=json&limit=500',
  ]
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Referer: 'https://shipinfo.net/',
        Accept: 'application/json',
      })
      if (!res.ok) continue
      const data = await res.json()
      const items: any[] = Array.isArray(data)
        ? data
        : (data.ships || data.data || [])
      for (const s of items) {
        const mmsi = String(s.mmsi || '')
        const lat = s.lat ?? s.latitude
        const lon = s.lon ?? s.longitude
        if (!mmsi || lat == null || lon == null) continue
        if (Number(lat) === 0 && Number(lon) === 0) continue
        ships.push({
          id: mmsi, name: String(s.name || 'IDENTIFYING...').trim(),
          type: shipTypeName(Number(s.type || 0)),
          lat: Number(lat), lng: Number(lon),
          course: Number(s.course || 0), speed: Number(s.speed || 0),
          flag: mmsiFlag(mmsi), source: 'ShipInfo',
        })
      }
      if (ships.length > 0) break
    } catch { /* source unavailable */ }
  }
  return ships
}

/* ── Aggregate all sources in parallel ── */
export async function GET() {
  const [bw, ah, sx, si] = await Promise.allSettled([
    fetchBarentsWatch(),
    fetchAISHub(),
    fetchShipXplorer(),
    fetchShipInfo(),
  ])

  const allShips = new Map<string, ShipRecord>()
  const sources: Record<string, number> = {}

  for (const result of [bw, ah, sx, si]) {
    if (result.status === 'fulfilled') {
      for (const ship of result.value) {
        if (!allShips.has(ship.id)) {
          allShips.set(ship.id, ship)
          sources[ship.source] = (sources[ship.source] || 0) + 1
        }
      }
    }
  }

  const ships = Array.from(allShips.values()).slice(0, 2000)

  return NextResponse.json(
    { ships, count: ships.length, sources, ts: Date.now() },
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
  )
}
