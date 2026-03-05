import { NextResponse } from 'next/server'

// Allow up to 10s for WebSocket data collection on Vercel
export const maxDuration = 10

// In-memory cache for serverless (shared within warm instance)
let cachedShips: any[] = []
let cacheTimestamp = 0
const CACHE_TTL = 60_000 // 60 seconds

interface AISShip {
  mmsi: string
  name: string
  type: string
  lat: number
  lng: number
  course: number
  speed: number
  country: string
}

// MMSI MID → country
const MID: Record<string, string> = {
  '201':'🇦🇱','203':'🇦🇹','205':'🇧🇪','209':'🇨🇾','211':'🇩🇪','219':'🇩🇰','220':'🇩🇰',
  '224':'🇪🇸','225':'🇪🇸','226':'🇫🇷','227':'🇫🇷','228':'🇫🇷','230':'🇫🇮','232':'🇬🇧',
  '233':'🇬🇧','234':'🇬🇧','235':'🇬🇧','237':'🇬🇷','238':'🇭🇷','240':'🇬🇷','244':'🇳🇱',
  '245':'🇳🇱','247':'🇮🇹','248':'🇲🇹','249':'🇲🇹','255':'🇵🇹','256':'🇲🇹','257':'🇳🇴',
  '258':'🇳🇴','259':'🇳🇴','261':'🇵🇱','263':'🇵🇹','265':'🇸🇪','266':'🇸🇪','271':'🇹🇷',
  '272':'🇺🇦','273':'🇷🇺','301':'🇦🇮','303':'🇺🇸','308':'🇧🇸','311':'🇧🇸','316':'🇨🇦',
  '338':'🇺🇸','345':'🇲🇽','351':'🇵🇦','352':'🇵🇦','353':'🇵🇦','354':'🇵🇦','355':'🇵🇦',
  '356':'🇵🇦','357':'🇵🇦','366':'🇺🇸','367':'🇺🇸','368':'🇺🇸','369':'🇺🇸','370':'🇵🇦',
  '371':'🇵🇦','372':'🇵🇦','373':'🇵🇦','374':'🇵🇦','401':'🇦🇫','403':'🇸🇦','405':'🇧🇩',
  '412':'🇨🇳','413':'🇨🇳','414':'🇨🇳','416':'🇹🇼','422':'🇮🇷','425':'🇮🇶','428':'🇮🇱',
  '431':'🇯🇵','432':'🇯🇵','440':'🇰🇷','441':'🇰🇷','447':'🇰🇼','461':'🇴🇲','466':'🇶🇦',
  '470':'🇦🇪','471':'🇦🇪','477':'🇭🇰','503':'🇦🇺','512':'🇳🇿','525':'🇮🇩','533':'🇲🇾',
  '538':'🇲🇭','548':'🇵🇭','559':'🇸🇬','563':'🇸🇬','564':'🇸🇬','565':'🇸🇬','567':'🇹🇭',
  '574':'🇻🇳','601':'🇿🇦','603':'🇦🇴','605':'🇩🇿','622':'🇪🇬','636':'🇱🇷','637':'🇱🇷',
  '657':'🇳🇬','701':'🇦🇷','710':'🇧🇷','725':'🇨🇱','730':'🇨🇴','760':'🇵🇪','770':'🇺🇾',
}

function mmsiCountry(mmsi: string): string {
  return MID[mmsi.slice(0, 3)] || '🏳️'
}

function shipTypeName(tid: number): string {
  if (tid === 30) return 'Fishing'
  if (tid === 31 || tid === 32 || tid === 52) return 'Tug'
  if (tid === 35 || tid === 36 || tid === 55) return 'Military'
  if (tid >= 40 && tid <= 49) return 'High Speed'
  if (tid >= 60 && tid <= 69) return 'Passenger'
  if (tid >= 70 && tid <= 79) return 'Cargo'
  if (tid >= 80 && tid <= 89) return 'Tanker'
  if (tid === 51) return 'SAR'
  return 'Unknown'
}

const AIS_API_KEY = '8b9d8625829bd9614947be967c141babc5931e79'

async function fetchFromAISStream(): Promise<AISShip[]> {
  // AISStream is WebSocket-only. Open a short-lived connection,
  // collect ships for a few seconds, then close.
  // Vercel serverless functions have a 10s default / 60s max timeout.
  const WebSocket = (await import('ws')).default

  return new Promise((resolve) => {
    const ships = new Map<string, AISShip>()
    const timeout = setTimeout(() => {
      try { ws.close() } catch {}
      resolve(Array.from(ships.values()))
    }, 5000) // collect for 5 seconds

    let ws: InstanceType<typeof WebSocket>
    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream')
    } catch {
      clearTimeout(timeout)
      resolve([])
      return
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [
          [[-90, -180], [90, 180]], // global
        ],
        FilterMessageTypes: ['PositionReport'],
      }))
    }

    ws.onmessage = (event: { data: any }) => {
      try {
        const msg = JSON.parse(String(event.data))
        const mmsi = String(msg?.MetaData?.MMSI || '')
        if (!mmsi) return
        const mt = msg.MessageType
        if (mt === 'PositionReport') {
          const pr = msg.Message.PositionReport
          const lat = pr?.Latitude
          const lng = pr?.Longitude
          if (lat == null || lng == null || (lat === 0 && lng === 0)) return
          ships.set(mmsi, {
            mmsi,
            name: String(msg.MetaData?.ShipName || '').trim() || 'IDENTIFYING...',
            type: shipTypeName(pr.NavigationalStatus || 0),
            lat,
            lng: lng,
            course: pr.Cog || 0,
            speed: pr.Sog || 0,
            country: mmsiCountry(mmsi),
          })
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onerror = () => {
      clearTimeout(timeout)
      resolve(Array.from(ships.values()))
    }

    ws.onclose = () => {
      clearTimeout(timeout)
      resolve(Array.from(ships.values()))
    }
  })
}

// Fallback: try public AIS REST APIs
async function fetchFromPublicAPIs(): Promise<AISShip[]> {
  const ships: AISShip[] = []
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; SatIntel/1.0)',
    'Accept': 'application/json',
  }

  // Try BarentsWatch (Norwegian AIS, no auth needed for public)
  const bwUrls = [
    'https://live.ais.barentswatch.no/v1/latest/combined',
  ]
  for (const url of bwUrls) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data.vessels || data.data || [])
      for (const item of items) {
        const mmsi = String(item.mmsi || item.MMSI || '')
        const lat = item.latitude ?? item.lat
        const lng = item.longitude ?? item.lon
        if (!mmsi || lat == null || lng == null) continue
        ships.push({
          mmsi,
          name: String(item.name || item.shipName || 'IDENTIFYING...').trim(),
          type: shipTypeName(Number(item.shipType || item.type || 0)),
          lat: Number(lat),
          lng: Number(lng),
          course: Number(item.courseOverGround || item.cog || item.course || 0),
          speed: Number(item.speedOverGround || item.sog || item.speed || 0),
          country: mmsiCountry(mmsi),
        })
      }
      if (ships.length > 0) break
    } catch { /* try next */ }
  }

  return ships
}

export async function GET() {
  const now = Date.now()

  // Return cached data if still fresh
  if (cachedShips.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json({
      ships: cachedShips,
      count: cachedShips.length,
      source: 'cache',
      ts: cacheTimestamp,
    })
  }

  // Try AISStream WebSocket first
  let ships: AISShip[] = []
  try {
    ships = await fetchFromAISStream()
  } catch {
    // Fallback to REST APIs
  }

  // If AISStream didn't yield enough, try public APIs too
  if (ships.length < 10) {
    try {
      const publicShips = await fetchFromPublicAPIs()
      // Merge by MMSI, AISStream takes priority
      const existing = new Set(ships.map(s => s.mmsi))
      for (const s of publicShips) {
        if (!existing.has(s.mmsi)) {
          ships.push(s)
        }
      }
    } catch { /* ignore */ }
  }

  // Update cache if we got new data
  if (ships.length > 0) {
    cachedShips = ships.slice(0, 1000) // cap at 1000
    cacheTimestamp = now
  }

  return NextResponse.json({
    ships: cachedShips,
    count: cachedShips.length,
    source: ships.length > 0 ? 'live' : 'cache',
    ts: now,
  })
}
