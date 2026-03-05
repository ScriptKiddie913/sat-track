/**
 * /api/ships/live  — Server-Sent Events proxy for AISStream
 *
 * This is the vessel-tra server-side approach ported to a Vercel Edge function.
 * It is a SECONDARY / supplementary feed — the primary AISStream connection is
 * the direct client-side WebSocket in page.tsx (which always works in the browser
 * regardless of Vercel plan). This SSE proxy is kept for environments where the
 * Edge Runtime's outbound WebSocket is available and stable.
 *
 * Sends a `:keep-alive` comment every 10 s to prevent proxy timeouts.
 * Stream closes after 25 s; the browser EventSource auto-reconnects.
 */

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const AIS_WS_URL = 'wss://stream.aisstream.io/v0/stream'
const AIS_API_KEY = '8b9d8625829bd9614947be967c141babc5931e79'

// ── Ship type classifier (matches vessel-tra logic) ──────────────────────────
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

// ── MMSI first-3-digits → flag emoji ─────────────────────────────────────────
const MID: Record<string, string> = {
  '201':'🇦🇱','202':'🇦🇩','203':'🇦🇹','205':'🇧🇪','206':'🇧🇾','207':'🇧🇬',
  '209':'🇨🇾','210':'🇨🇾','211':'🇩🇪','213':'🇬🇪','214':'🇲🇩','215':'🇲🇹',
  '216':'🇦🇲','218':'🇩🇪','219':'🇩🇰','220':'🇩🇰','224':'🇪🇸','225':'🇪🇸',
  '226':'🇫🇷','227':'🇫🇷','228':'🇫🇷','229':'🇲🇹','230':'🇫🇮','231':'🇫🇴',
  '232':'🇬🇧','233':'🇬🇧','234':'🇬🇧','235':'🇬🇧','236':'🇬🇮','237':'🇬🇷',
  '238':'🇭🇷','239':'🇬🇷','240':'🇬🇷','241':'🇬🇷','242':'🇲🇦','243':'🇭🇺',
  '244':'🇳🇱','245':'🇳🇱','246':'🇳🇱','247':'🇮🇹','248':'🇲🇹','249':'🇲🇹',
  '250':'🇮🇪','251':'🇮🇸','252':'🇱🇮','253':'🇱🇺','254':'🇲🇨','255':'🇵🇹',
  '256':'🇲🇹','257':'🇳🇴','258':'🇳🇴','259':'🇳🇴','261':'🇵🇱','262':'🇲🇪',
  '263':'🇵🇹','264':'🇷🇴','265':'🇸🇪','266':'🇸🇪','267':'🇸🇰','268':'🇸🇲',
  '269':'🇨🇭','270':'🇨🇿','271':'🇹🇷','272':'🇺🇦','273':'🇷🇺','274':'🇲🇰',
  '275':'🇱🇻','276':'🇪🇪','277':'🇱🇹','278':'🇸🇮','279':'🇷🇸',
  '301':'🇦🇮','303':'🇺🇸','304':'🇦🇬','305':'🇦🇬','308':'🇧🇸','309':'🇧🇸',
  '310':'🇧🇲','311':'🇧🇸','312':'🇧🇿','314':'🇧🇧','316':'🇨🇦','319':'🇰🇾',
  '321':'🇨🇷','323':'🇨🇺','325':'🇩🇲','327':'🇩🇴','329':'🇬🇵','330':'🇬🇩',
  '331':'🇬🇱','332':'🇬🇹','334':'🇭🇳','336':'🇭🇹','338':'🇺🇸','339':'🇯🇲',
  '341':'🇰🇳','343':'🇱🇨','345':'🇲🇽','347':'🇲🇶','348':'🇲🇸','350':'🇳🇮',
  '351':'🇵🇦','352':'🇵🇦','353':'🇵🇦','354':'🇵🇦','355':'🇵🇦','356':'🇵🇦',
  '357':'🇵🇦','358':'🇵🇷','359':'🇸🇻','361':'🇵🇲','362':'🇹🇹','364':'🇹🇨',
  '366':'🇺🇸','367':'🇺🇸','368':'🇺🇸','369':'🇺🇸','370':'🇵🇦','371':'🇵🇦',
  '372':'🇵🇦','373':'🇵🇦','374':'🇵🇦','375':'🇻🇨','376':'🇻🇨','377':'🇻🇨',
  '378':'🇻🇬','379':'🇻🇮',
  '401':'🇦🇫','403':'🇸🇦','405':'🇧🇩','408':'🇧🇭','410':'🇧🇹','412':'🇨🇳',
  '413':'🇨🇳','414':'🇨🇳','416':'🇹🇼','422':'🇮🇷','423':'🇦🇿','425':'🇮🇶',
  '428':'🇮🇱','431':'🇯🇵','432':'🇯🇵','434':'🇹🇲','436':'🇰🇿','438':'🇯🇴',
  '440':'🇰🇷','441':'🇰🇷','443':'🇵🇸','445':'🇰🇵','447':'🇰🇼','450':'🇱🇧',
  '451':'🇰🇬','453':'🇲🇴','455':'🇲🇻','457':'🇲🇳','459':'🇳🇵','461':'🇴🇲',
  '463':'🇵🇰','466':'🇶🇦','468':'🇸🇾','470':'🇦🇪','471':'🇦🇪','472':'🇹🇯',
  '473':'🇾🇪','477':'🇭🇰',
  '503':'🇦🇺','506':'🇲🇲','508':'🇧🇳','510':'🇫🇲','511':'🇵🇼','512':'🇳🇿',
  '514':'🇰🇭','515':'🇰🇭','516':'🇨🇽','518':'🇨🇰','520':'🇫🇯','523':'🇨🇨',
  '525':'🇮🇩','529':'🇰🇮','531':'🇱🇦','533':'🇲🇾','536':'🇲🇵','538':'🇲🇭',
  '540':'🇳🇷','542':'🇳🇺','544':'🇵🇬','546':'🇵🇫','548':'🇵🇭','553':'🇸🇧',
  '555':'🇦🇸','557':'🇼🇸','559':'🇸🇬','561':'🇱🇰','563':'🇸🇬','564':'🇸🇬',
  '565':'🇸🇬','566':'🇸🇬','567':'🇹🇭','570':'🇹🇴','572':'🇹🇻','574':'🇻🇳',
  '576':'🇻🇺','577':'🇻🇺',
  '601':'🇿🇦','603':'🇦🇴','605':'🇩🇿','607':'🇸🇭','608':'🇦🇨','609':'🇧🇮',
  '610':'🇧🇯','611':'🇧🇼','612':'🇨🇫','613':'🇨🇲','615':'🇨🇬','616':'🇰🇲',
  '617':'🇨🇻','619':'🇨🇮','621':'🇩🇯','622':'🇪🇬','624':'🇪🇹','625':'🇪🇷',
  '626':'🇬🇦','627':'🇬🇭','629':'🇬🇲','630':'🇬🇼','631':'🇬🇶','632':'🇬🇳',
  '633':'🇧🇫','634':'🇰🇪','636':'🇱🇷','637':'🇱🇷','642':'🇱🇾','644':'🇱🇸',
  '645':'🇲🇺','647':'🇲🇬','649':'🇲🇱','650':'🇲🇿','654':'🇲🇷','655':'🇲🇼',
  '656':'🇳🇪','657':'🇳🇬','659':'🇳🇦','660':'🇷🇪','661':'🇷🇼','662':'🇸🇩',
  '663':'🇸🇳','664':'🇸🇨','665':'🇸🇭','666':'🇸🇴','667':'🇸🇱','668':'🇸🇹',
  '669':'🇸🇿','670':'🇹🇩','671':'🇹🇬','672':'🇹🇳','674':'🇹🇿','675':'🇺🇬',
  '676':'🇨🇩','677':'🇹🇿','678':'🇿🇼','679':'🇿🇲',
  '701':'🇦🇷','710':'🇧🇷','720':'🇧🇴','725':'🇨🇱','730':'🇨🇴','735':'🇪🇨',
  '740':'🇫🇰','745':'🇬🇫','750':'🇬🇾','755':'🇵🇾','760':'🇵🇪','765':'🇸🇷',
  '770':'🇺🇾','775':'🇻🇪',
}

function mmsiFlag(mmsi: string): string {
  return MID[mmsi.slice(0, 3)] ?? '🏳️'
}

// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const encoder = new TextEncoder()

  // TransformStream is more reliable than ReadableStream.start() in edge
  // environments for long-lived async operations like WebSocket proxying.
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Fire-and-forget: runs in background while we immediately return the stream.
  ;(async () => {
    // Keep-alive timer — sends SSE comment every 10 s to prevent proxy timeouts
    const keepAlive = setInterval(async () => {
      try { await writer.write(encoder.encode(': keep-alive\n\n')) } catch { /* closed */ }
    }, 10_000)

    // Per-request static data cache (name, type) keyed by MMSI
    const staticCache = new Map<string, { name: string; type: string }>()

    try {
      const ws = new WebSocket(AIS_WS_URL)

      await new Promise<void>((resolve) => {
        const closeTimer = setTimeout(() => { try { ws.close() } catch { /* ignore */ } }, 25_000)

        ws.addEventListener('open', () => {
          ws.send(
            JSON.stringify({
              APIKey: AIS_API_KEY,
              // 4 × 4 global grid — matches vessel-tra server.py exactly
              BoundingBoxes: [
                [[-90, -180], [-45, -90]], [[-90, -90],  [-45,   0]],
                [[-90,    0], [-45,  90]], [[-90,  90],  [-45, 180]],
                [[-45, -180], [  0, -90]], [[-45, -90],  [  0,   0]],
                [[-45,    0], [  0,  90]], [[-45,  90],  [  0, 180]],
                [[  0, -180], [ 45, -90]], [[  0, -90],  [ 45,   0]],
                [[  0,    0], [ 45,  90]], [[  0,  90],  [ 45, 180]],
                [[ 45, -180], [ 90, -90]], [[ 45, -90],  [ 90,   0]],
                [[ 45,    0], [ 90,  90]], [[ 45,  90],  [ 90, 180]],
              ],
              FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
            }),
          )
        })

        ws.addEventListener('message', async (event) => {
          try {
            const msg = JSON.parse(event.data as string)
            const mmsi = String(msg?.MetaData?.MMSI ?? '')
            if (!mmsi) return
            const mt = msg.MessageType

            if (mt === 'ShipStaticData') {
              const sd = msg.Message?.ShipStaticData
              if (sd) {
                staticCache.set(mmsi, {
                  name: sd.Name?.trim() || staticCache.get(mmsi)?.name || '',
                  type: shipTypeName(sd.Type ?? 0),
                })
              }
            } else if (mt === 'PositionReport') {
              const pr = msg.Message?.PositionReport
              if (!pr) return
              const lat = pr.Latitude
              const lng = pr.Longitude
              if (lat == null || lng == null || (lat === 0 && lng === 0)) return

              const cached = staticCache.get(mmsi)
              const ship = {
                id: mmsi,
                name:
                  cached?.name ||
                  String(msg.MetaData?.ShipName ?? '').trim() ||
                  'IDENTIFYING...',
                type: cached?.type || 'Unknown',
                lat,
                lng,
                course: pr.Cog ?? 0,
                speed: pr.Sog ?? 0,
                flag: mmsiFlag(mmsi),
              }
              try {
                await writer.write(encoder.encode(`data: ${JSON.stringify(ship)}\n\n`))
              } catch { ws.close() /* client disconnected */ }
            }
          } catch { /* parse error — skip message */ }
        })

        ws.addEventListener('close', () => { clearTimeout(closeTimer); resolve() })
        ws.addEventListener('error', () => { try { ws.close() } catch { /* ignore */ } })
      })
    } catch { /* WebSocket constructor failed — Edge Runtime may not support it */ }

    clearInterval(keepAlive)
    try { await writer.close() } catch { /* already closed */ }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
