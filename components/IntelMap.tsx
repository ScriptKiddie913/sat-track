'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useSatelliteStore } from '@/store/satelliteStore'
import {
  getSatellitePosition,
  getFullOrbitPath,
  getCoverageFootprint,
  classifyOrbit,
} from '@/lib/propagate'
import { guessOwnerFromName, getOwnerInfo } from '@/lib/country-map'
import { JAMMING_ZONES, ADSB_FLIGHTS, AIS_VESSELS, GROUND_STATIONS } from '@/lib/intel-data'
import { GIBS_LAYERS, getGIBSDate, getNDVIDate } from '@/lib/gibs-layers'
import type { TLESatellite, AISVessel } from '@/lib/types'

// ── Satellite icon — detailed SVG with solar panels ──
function createSatIcon(color: string, size: number, isLocked: boolean): L.DivIcon {
  const glow = isLocked
    ? `filter:drop-shadow(0 0 8px ${color}) drop-shadow(0 0 3px ${color});`
    : `filter:drop-shadow(0 0 3px ${color});`
  const pulse = isLocked
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"><animate attributeName="r" from="8" to="15" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`
    : ''
  const body = isLocked
    ? `<rect x="12" y="12" width="8" height="8" rx="1" fill="${color}" opacity="0.95"/><rect x="3" y="14" width="10" height="4" rx="1" fill="${color}" opacity="0.7"/><rect x="19" y="14" width="10" height="4" rx="1" fill="${color}" opacity="0.7"/><line x1="16" y1="8" x2="16" y2="12" stroke="${color}" stroke-width="1.5"/><circle cx="16" cy="7" r="1.5" fill="${color}"/>`
    : `<rect x="13" y="13" width="6" height="6" rx="1" fill="${color}" opacity="0.95"/><rect x="5" y="14.5" width="9" height="3" rx="0.5" fill="${color}" opacity="0.65"/><rect x="18" y="14.5" width="9" height="3" rx="0.5" fill="${color}" opacity="0.65"/><line x1="16" y1="10" x2="16" y2="13" stroke="${color}" stroke-width="1"/><circle cx="16" cy="9" r="1" fill="${color}"/>`
  return L.divIcon({
    className: 'sat-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg viewBox="0 0 32 32" width="${size}" height="${size}" style="${glow}">${body}${pulse}</svg>`,
  })
}

// ── Vessel icon — 10 hull types with caching ──
const _vesselIconCache = new Map<string, L.DivIcon>()
function createVesselIcon(type: string, course?: number): L.DivIcon {
  const tl = (type || '').toLowerCase()
  const rot = Math.round((course || 0) / 5) * 5
  const ck = `${tl}_${rot}`
  if (_vesselIconCache.has(ck)) return _vesselIconCache.get(ck)!

  const typeColors: Record<string, string> = {
    warship: '#ff1744', cargo: '#42a5f5', tanker: '#ff7043', passenger: '#66bb6a',
    fishing: '#fdd835', tug: '#ab47bc', military: '#ff1744', research: '#00bcd4',
    'high speed': '#e91e63', sar: '#76ff03', unknown: '#78909c',
  }
  const c = typeColors[tl] || '#78909c'
  let hull: string
  let sz = 28
  const vb = '0 0 32 32'

  if (tl === 'warship' || tl === 'military') {
    sz = 32
    hull = `<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".25"/><stop offset="100%" stop-color="#000" stop-opacity=".3"/></linearGradient></defs><path d="M16 1 L22 7 L23 12 L22 26 L19 30 L13 30 L10 26 L9 12 L10 7 Z" fill="${c}" stroke="rgba(255,255,255,.3)" stroke-width=".6"/><path d="M16 1 L22 7 L23 12 L22 26 L19 30 L13 30 L10 26 L9 12 L10 7 Z" fill="url(#wg)"/><rect x="13" y="8" width="6" height="5" rx="1" fill="rgba(0,0,0,.4)" stroke="rgba(255,255,255,.15)" stroke-width=".4"/><rect x="14" y="14" width="4" height="3" rx=".5" fill="rgba(0,0,0,.35)"/><line x1="16" y1="3" x2="16" y2="8" stroke="#fff" stroke-width="1" opacity=".7"/><circle cx="16" cy="3" r="1" fill="#fff" opacity=".6"/><line x1="10" y1="18" x2="7" y2="16" stroke="${c}" stroke-width="1.2" opacity=".7"/><line x1="22" y1="18" x2="25" y2="16" stroke="${c}" stroke-width="1.2" opacity=".7"/>`
  } else if (tl === 'cargo') {
    hull = `<path d="M16 2 L22 8 L22 25 L19 29 L13 29 L10 25 L10 8 Z" fill="${c}" opacity=".92"/><rect x="12" y="10" width="8" height="5" rx="1" fill="rgba(0,0,0,.3)" stroke="rgba(255,255,255,.1)" stroke-width=".3"/><rect x="12" y="16" width="8" height="5" rx="1" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.1)" stroke-width=".3"/><line x1="16" y1="10" x2="16" y2="21" stroke="rgba(255,255,255,.12)" stroke-width=".4"/><rect x="14" y="4" width="4" height="3" rx="1" fill="${c}" opacity=".7"/><line x1="16" y1="2" x2="16" y2="5" stroke="rgba(255,255,255,.4)" stroke-width=".8"/>`
  } else if (tl === 'tanker') {
    hull = `<ellipse cx="16" cy="16" rx="7" ry="13" fill="${c}" opacity=".9"/><ellipse cx="16" cy="16" rx="5" ry="10" fill="rgba(0,0,0,.15)"/><line x1="16" y1="4" x2="16" y2="28" stroke="rgba(255,255,255,.12)" stroke-width=".5"/><rect x="14" y="5" width="4" height="3" rx="1" fill="${c}" opacity=".7"/>`
  } else if (tl === 'passenger') {
    hull = `<rect x="9" y="4" width="14" height="24" rx="4" fill="${c}" opacity=".92"/><rect x="11" y="7" width="10" height="3" rx="1" fill="rgba(255,255,255,.25)"/><rect x="11" y="12" width="10" height="3" rx="1" fill="rgba(255,255,255,.2)"/><rect x="11" y="17" width="10" height="3" rx="1" fill="rgba(255,255,255,.15)"/><rect x="13" y="22" width="6" height="4" rx="1" fill="rgba(0,0,0,.2)"/><circle cx="16" cy="5" r="1" fill="rgba(255,255,255,.4)"/>`
  } else if (tl === 'fishing') {
    hull = `<path d="M16 3 L21 22 L16 19 L11 22 Z" fill="${c}" opacity=".9"/><line x1="16" y1="1" x2="16" y2="10" stroke="${c}" stroke-width="1.5" opacity=".8"/><line x1="16" y1="3" x2="12" y2="7" stroke="${c}" stroke-width=".8" opacity=".5"/><line x1="16" y1="4" x2="21" y2="8" stroke="${c}" stroke-width=".8" opacity=".5"/><circle cx="16" cy="1" r="1" fill="${c}" opacity=".6"/>`
  } else if (tl === 'tug') {
    hull = `<rect x="10" y="8" width="12" height="16" rx="3" fill="${c}" opacity=".92"/><rect x="12" y="4" width="8" height="6" rx="2" fill="${c}" opacity=".75"/><rect x="14" y="2" width="4" height="3" rx="1" fill="${c}" opacity=".6"/><line x1="10" y1="20" x2="7" y2="22" stroke="${c}" stroke-width="1.5" opacity=".5"/><line x1="22" y1="20" x2="25" y2="22" stroke="${c}" stroke-width="1.5" opacity=".5"/>`
  } else if (tl === 'research') {
    hull = `<path d="M16 3 L21 8 L21 24 L18 28 L14 28 L11 24 L11 8 Z" fill="${c}" opacity=".9"/><circle cx="16" cy="12" r="3" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.3)" stroke-width=".4"/><line x1="16" y1="2" x2="16" y2="7" stroke="#fff" stroke-width=".8" opacity=".5"/><circle cx="16" cy="1" r=".8" fill="#fff" opacity=".5"/>`
  } else if (tl === 'high speed') {
    hull = `<path d="M16 1 L23 10 L21 28 L16 30 L11 28 L9 10 Z" fill="${c}" opacity=".9"/><path d="M16 5 L20 10 L19 22 L16 24 L13 22 L12 10 Z" fill="rgba(255,255,255,.1)"/><line x1="9" y1="14" x2="6" y2="12" stroke="${c}" stroke-width="1" opacity=".6"/><line x1="23" y1="14" x2="26" y2="12" stroke="${c}" stroke-width="1" opacity=".6"/>`
  } else if (tl === 'sar') {
    hull = `<path d="M16 2 L22 8 L22 24 L19 28 L13 28 L10 24 L10 8 Z" fill="${c}" opacity=".9"/><path d="M12 11 L16 7 L20 11 L16 15 Z" fill="rgba(255,255,255,.35)" stroke="#fff" stroke-width=".5"/><line x1="16" y1="2" x2="16" y2="7" stroke="#fff" stroke-width="1" opacity=".6"/>`
  } else {
    hull = `<path d="M16 3 L22 12 L20 27 L16 30 L12 27 L10 12 Z" fill="${c}" opacity=".8"/><circle cx="16" cy="15" r="2" fill="rgba(255,255,255,.15)"/>`
  }

  const icon = L.divIcon({
    className: 'vessel-icon',
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    html: `<svg viewBox="${vb}" width="${sz}" height="${sz}" style="transform:rotate(${rot}deg);filter:drop-shadow(0 0 4px ${c}) drop-shadow(0 0 1px rgba(0,0,0,.8))">${hull}</svg>`,
  })
  _vesselIconCache.set(ck, icon)
  return icon
}

// ── Flight icon ──
function createFlightIcon(diverted: boolean): L.DivIcon {
  const c = diverted ? '#ff3d3d' : '#00e5ff'
  return L.divIcon({
    className: 'flight-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${c}"/></svg>`,
  })
}

// ── Ground station icon ──
function createGSIcon(type: string): L.DivIcon {
  const colors: Record<string, string> = { launch: '#ff6600', sigint: '#ff0040', radar: '#ffee00', dsn: '#00ffcc' }
  const c = colors[type] || '#fff'
  return L.divIcon({
    className: 'gs-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="14" width="12" height="8" fill="${c}" opacity="0.8"/><polygon points="12,2 6,14 18,14" fill="${c}" opacity="0.9"/></svg>`,
  })
}

// ── Quake icon ──
function createQuakeIcon(mag: number): L.DivIcon {
  const s = Math.max(12, mag * 6)
  return L.divIcon({
    className: 'quake-icon',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><circle cx="12" cy="12" r="10" fill="#ff3d3d" opacity="0.5"/><circle cx="12" cy="12" r="5" fill="#ff3d3d" opacity="0.9"/><circle cx="12" cy="12" r="10" fill="none" stroke="#ff3d3d" stroke-width="1" opacity="0.4"><animate attributeName="r" from="5" to="12" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/></circle></svg>`,
  })
}

// ── EONET event icon ──
function createEventIcon(cat: string): L.DivIcon {
  const colors: Record<string, string> = { Wildfires: '#ff6600', 'Severe Storms': '#aa00ff', Volcanoes: '#ff0000', 'Sea and Lake Ice': '#00ccff', Floods: '#0066ff' }
  const c = colors[cat] || '#ffee00'
  return L.divIcon({
    className: 'eonet-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="12,2 4,20 20,20" fill="${c}" opacity="0.85"/><text x="12" y="17" text-anchor="middle" font-size="10" fill="#000" font-weight="bold">!</text></svg>`,
  })
}

export default function IntelMap() {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const orbitsRef = useRef<Map<string, L.Polyline>>(new Map())
  const coverageRef = useRef<Map<string, L.Polygon>>(new Map())
  const jammingRef = useRef<L.Circle[]>([])
  const jammingPulseRef = useRef<L.Circle[]>([])
  const flightRef = useRef<Map<string, { marker: L.Marker; line: L.Polyline }>>(new Map())
  const vesselRef = useRef<Map<string, L.Marker>>(new Map())
  const stationRef = useRef<L.Marker[]>([])
  const quakeRef = useRef<L.Marker[]>([])
  const eventRef = useRef<L.Marker[]>([])
  const imageryLayerRef = useRef<L.TileLayer | null>(null)
  const godsEyeLayerRef = useRef<L.TileLayer | null>(null)
  const animFrameRef = useRef<number>(0)

  const {
    satellites,
    lockedId,
    showOrbits,
    showCoverage,
    showJamming,
    showFlights,
    showVessels,
    showSatellites,
    showStations,
    showQuakes,
    showEvents,
    activeImageryLayer,
    godsEyeMode,
    timelineOffset,
    toggleLock,
    quakes,
    events,
    liveVessels,
  } = useSatelliteStore()

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    })

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.5 }
    ).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('ESRI | CelesTrak | NASA GIBS')
      .addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Imagery layer management
  useEffect(() => {
    if (!mapRef.current) return
    if (imageryLayerRef.current) {
      mapRef.current.removeLayer(imageryLayerRef.current)
      imageryLayerRef.current = null
    }
    if (activeImageryLayer) {
      const layer = GIBS_LAYERS.find((l) => l.id === activeImageryLayer)
      if (layer) {
        imageryLayerRef.current = L.tileLayer(layer.url, {
          maxZoom: layer.maxZoom,
          opacity: 0.7,
          attribution: 'NASA GIBS',
        }).addTo(mapRef.current)
      }
    }
  }, [activeImageryLayer])

  // God's Eye HD layer management
  useEffect(() => {
    if (!mapRef.current) return
    if (godsEyeLayerRef.current) {
      mapRef.current.removeLayer(godsEyeLayerRef.current)
      godsEyeLayerRef.current = null
    }
    if (!godsEyeMode) return
    const dt = getGIBSDate()
    if (godsEyeMode === 's2hd') {
      godsEyeLayerRef.current = L.tileLayer(
        'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
        { maxZoom: 15, opacity: 0.92 }
      ).addTo(mapRef.current)
    } else if (godsEyeMode === 'ndvi') {
      godsEyeLayerRef.current = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${getNDVIDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        { maxZoom: 9, opacity: 0.85 }
      ).addTo(mapRef.current)
    } else if (godsEyeMode === 'fires_hd') {
      godsEyeLayerRef.current = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_Thermal_Anomalies_375m_Day/default/${dt}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
        { maxZoom: 8, opacity: 0.85 }
      ).addTo(mapRef.current)
    } else if (godsEyeMode === 'night_hd') {
      godsEyeLayerRef.current = L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/${dt}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
        { maxZoom: 8, opacity: 0.85 }
      ).addTo(mapRef.current)
    }
  }, [godsEyeMode])

  // Jamming zones
  useEffect(() => {
    if (!mapRef.current) return
    jammingRef.current.forEach((c) => mapRef.current!.removeLayer(c))
    jammingPulseRef.current.forEach((c) => mapRef.current!.removeLayer(c))
    jammingRef.current = []
    jammingPulseRef.current = []
    if (!showJamming) return

    JAMMING_ZONES.forEach((zone) => {
      if (!zone.active) return
      const sevColors: Record<string, string> = { high: '#ff3d3d', medium: '#ffab00', low: '#facc15' }
      const color = sevColors[zone.severity]

      const circle = L.circle(zone.center, {
        radius: zone.radiusKm * 1000,
        color,
        fillColor: color,
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '6 4',
      }).addTo(mapRef.current!)

      circle.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#111;padding:8px;border-radius:4px">
          <div style="color:${color};font-weight:bold">${zone.type} JAMMING</div>
          <div>${zone.name}</div>
          <div>Radius: ${zone.radiusKm}km</div>
          <div>Severity: ${zone.severity.toUpperCase()}</div>
          ${zone.source ? `<div style="color:#888">SRC: ${zone.source}</div>` : ''}
        </div>`,
        { className: 'intel-popup' }
      )
      jammingRef.current.push(circle)

      const pulse = L.circle(zone.center, {
        radius: zone.radiusKm * 1000,
        color,
        fillColor: 'transparent',
        weight: 2,
        opacity: 0,
      }).addTo(mapRef.current!)
      jammingPulseRef.current.push(pulse)
    })

    let phase = 0
    const animatePulse = () => {
      phase = (phase + 0.02) % 1
      jammingPulseRef.current.forEach((p, i) => {
        const zone = JAMMING_ZONES[i]
        if (!zone) return
        const r = zone.radiusKm * 1000 * (0.6 + phase * 0.4)
        p.setRadius(r)
        p.setStyle({ opacity: 0.5 * (1 - phase) })
      })
      animFrameRef.current = requestAnimationFrame(animatePulse)
    }
    animFrameRef.current = requestAnimationFrame(animatePulse)

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [showJamming])

  // ADS-B Flight paths
  useEffect(() => {
    if (!mapRef.current) return
    flightRef.current.forEach(({ marker, line }) => {
      mapRef.current!.removeLayer(marker)
      mapRef.current!.removeLayer(line)
    })
    flightRef.current.clear()
    if (!showFlights) return

    ADSB_FLIGHTS.forEach((flight) => {
      const lastPos = flight.path[flight.path.length - 1]
      const marker = L.marker(lastPos, {
        icon: createFlightIcon(flight.diverted),
      }).addTo(mapRef.current!)

      marker.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#111;padding:8px;border-radius:4px">
          <div style="color:${flight.diverted ? '#ff3d3d' : '#00e5ff'};font-weight:bold">${flight.callsign}</div>
          <div>Type: ${flight.type}</div>
          ${flight.diverted ? '<div style="color:#ff3d3d">⚠ DIVERTED</div>' : ''}
        </div>`,
        { className: 'intel-popup' }
      )

      const line = L.polyline(flight.path, {
        color: flight.diverted ? '#ff3d3d' : '#00e5ff',
        weight: 1.5,
        opacity: 0.5,
        dashArray: flight.diverted ? '8 4' : undefined,
      }).addTo(mapRef.current!)

      flightRef.current.set(flight.id, { marker, line })
    })
  }, [showFlights])

  // AIS Vessels — static + live, viewport culled
  useEffect(() => {
    if (!mapRef.current) return
    vesselRef.current.forEach((m) => mapRef.current!.removeLayer(m))
    vesselRef.current.clear()
    if (!showVessels) return

    const bounds = mapRef.current.getBounds().pad(0.3)

    // Merge static vessels from intel-data + live vessels from API
    const allVessels = [
      ...AIS_VESSELS,
      ...liveVessels.map((v: AISVessel) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        lat: v.lat,
        lng: v.lng,
        course: v.course,
        speed: v.speed,
        flag: v.flag,
      })),
    ]

    // Deduplicate by id (live takes priority for same id)
    const seen = new Set<string>()
    const deduped = []
    for (let i = allVessels.length - 1; i >= 0; i--) {
      if (!seen.has(allVessels[i].id)) {
        seen.add(allVessels[i].id)
        deduped.push(allVessels[i])
      }
    }

    deduped.forEach((vessel) => {
      if (!bounds.contains([vessel.lat, vessel.lng])) return
      const marker = L.marker([vessel.lat, vessel.lng], {
        icon: createVesselIcon(vessel.type, vessel.course),
      }).addTo(mapRef.current!)

      const tc: Record<string, string> = {
        warship: '#ff1744', cargo: '#42a5f5', tanker: '#ff7043', passenger: '#66bb6a',
        fishing: '#fdd835', tug: '#ab47bc', research: '#00bcd4', 'high speed': '#e91e63',
        sar: '#76ff03', unknown: '#78909c',
      }
      const typeColor = tc[(vessel.type || '').toLowerCase()] || '#78909c'

      marker.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#0d0d0d;padding:10px;border-radius:6px;border:1px solid ${typeColor}33">
          <div style="border-left:3px solid ${typeColor};padding-left:8px;margin-bottom:4px">
            <span style="color:${typeColor};font-weight:bold;font-size:12px">${vessel.flag} ${vessel.name}</span>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin-top:4px">
            <span style="color:#666">TYPE</span><span style="color:${typeColor}">${(vessel.type || 'Unknown').toUpperCase()}</span>
            <span style="color:#666">HDG</span><span>${vessel.course}°</span>
            <span style="color:#666">SPD</span><span>${vessel.speed} kn</span>
          </div>
        </div>`,
        { className: 'intel-popup' }
      )
      vesselRef.current.set(vessel.id, marker)
    })
  }, [showVessels, liveVessels])

  // Ground Stations
  useEffect(() => {
    if (!mapRef.current) return
    stationRef.current.forEach((m) => mapRef.current!.removeLayer(m))
    stationRef.current = []
    if (!showStations) return

    GROUND_STATIONS.forEach((gs) => {
      const m = L.marker([gs.lat, gs.lng], { icon: createGSIcon(gs.type) }).addTo(mapRef.current!)
      m.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#111;padding:8px;border-radius:4px">
          <div style="color:#ff6600;font-weight:bold">${gs.name}</div>
          <div>${gs.flag} · Type: ${gs.type.toUpperCase()}</div>
        </div>`,
        { className: 'intel-popup' }
      )
      stationRef.current.push(m)
    })
  }, [showStations])

  // Earthquakes
  useEffect(() => {
    if (!mapRef.current) return
    quakeRef.current.forEach((m) => mapRef.current!.removeLayer(m))
    quakeRef.current = []
    if (!showQuakes) return

    quakes.forEach((q) => {
      const m = L.marker([q.lat, q.lng], { icon: createQuakeIcon(q.mag) }).addTo(mapRef.current!)
      m.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#111;padding:8px;border-radius:4px">
          <div style="color:#ff3d3d;font-weight:bold">M${q.mag.toFixed(1)} EARTHQUAKE</div>
          <div>${q.place}</div>
          <div>Depth: ${q.depth.toFixed(1)} km</div>
          <div>${new Date(q.time).toUTCString()}</div>
        </div>`,
        { className: 'intel-popup' }
      )
      quakeRef.current.push(m)
    })
  }, [showQuakes, quakes])

  // NASA EONET Events
  useEffect(() => {
    if (!mapRef.current) return
    eventRef.current.forEach((m) => mapRef.current!.removeLayer(m))
    eventRef.current = []
    if (!showEvents) return

    events.forEach((ev) => {
      if (!ev.lat || !ev.lng) return
      const m = L.marker([ev.lat, ev.lng], { icon: createEventIcon(ev.category) }).addTo(mapRef.current!)
      m.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#111;padding:8px;border-radius:4px">
          <div style="color:#ffee00;font-weight:bold">${ev.title}</div>
          <div>Category: ${ev.category}</div>
          ${ev.date ? `<div>${new Date(ev.date).toUTCString()}</div>` : ''}
        </div>`,
        { className: 'intel-popup' }
      )
      eventRef.current.push(m)
    })
  }, [showEvents, events])

  // Main satellite rendering loop
  useEffect(() => {
    if (!mapRef.current || satellites.length === 0) return
    if (!showSatellites) {
      markersRef.current.forEach((m) => mapRef.current!.removeLayer(m))
      markersRef.current.clear()
      return
    }

    const map = mapRef.current
    const now = new Date(Date.now() + timelineOffset * 60 * 1000)
    const maxSats = 2000
    const satsToRender = satellites.slice(0, maxSats)

    satsToRender.forEach((sat: TLESatellite) => {
      const pos = getSatellitePosition(sat.line1, sat.line2, now)
      if (!pos || isNaN(pos.lat) || isNaN(pos.lng)) return

      const isLocked = sat.noradId === lockedId
      const ownerCode = guessOwnerFromName(sat.name)
      const ownerInfo = getOwnerInfo(ownerCode)
      const orbitType = classifyOrbit(pos.alt)

      let marker = markersRef.current.get(sat.noradId)

      if (!marker) {
        marker = L.marker([pos.lat, pos.lng], {
          icon: createSatIcon(ownerInfo.color, isLocked ? 28 : 16, isLocked),
        })
        marker.on('click', () => toggleLock(sat.noradId))
        marker.addTo(map)
        markersRef.current.set(sat.noradId, marker)
      } else {
        marker.setLatLng([pos.lat, pos.lng])
        if (isLocked !== (marker.options as any)._wasLocked) {
          marker.setIcon(createSatIcon(ownerInfo.color, isLocked ? 28 : 16, isLocked))
          ;(marker.options as any)._wasLocked = isLocked
        }
      }

      marker.unbindPopup()
      marker.bindPopup(
        `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e0e0e0;background:#0a0e1a;padding:10px 12px;border-radius:6px;border:1px solid rgba(0,229,255,0.2);min-width:200px">
          <div style="color:#00e5ff;font-weight:bold;font-size:12px;margin-bottom:6px">${sat.name}</div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 12px">
            <span style="color:#666">NORAD</span><span>${sat.noradId}</span>
            <span style="color:#666">OWNER</span><span>${ownerInfo.flag} ${ownerInfo.name}</span>
            <span style="color:#666">ORBIT</span><span>${orbitType}</span>
            <span style="color:#666">ALT</span><span>${pos.alt.toFixed(1)} km</span>
            <span style="color:#666">VEL</span><span>${pos.velocity.toFixed(2)} km/s</span>
            <span style="color:#666">LAT</span><span>${pos.lat.toFixed(4)}°</span>
            <span style="color:#666">LNG</span><span>${pos.lng.toFixed(4)}°</span>
          </div>
        </div>`,
        { className: 'intel-popup', maxWidth: 300 }
      )

      // Orbit path for locked satellite
      if (isLocked && showOrbits) {
        if (!orbitsRef.current.has(sat.noradId)) {
          const path = getFullOrbitPath(sat.line1, sat.line2, 200)
          if (path.length > 0) {
            const segments: [number, number][][] = [[]]
            for (let i = 1; i < path.length; i++) {
              if (Math.abs(path[i][1] - path[i - 1][1]) > 180) {
                segments.push([])
              }
              segments[segments.length - 1].push([path[i][0], path[i][1]])
            }
            segments.forEach((seg) => {
              if (seg.length < 2) return
              const line = L.polyline(seg, {
                color: ownerInfo.color,
                weight: 1.5,
                opacity: 0.6,
                dashArray: '4 4',
              }).addTo(map)
              orbitsRef.current.set(sat.noradId + '_' + Math.random(), line)
            })
          }
        }
      }

      // Coverage footprint for locked satellite
      if (isLocked && showCoverage) {
        if (!coverageRef.current.has(sat.noradId)) {
          const footprint = getCoverageFootprint(pos.lat, pos.lng, pos.alt)
          if (footprint.length > 0) {
            const polygon = L.polygon(footprint, {
              color: ownerInfo.color,
              fillColor: ownerInfo.color,
              fillOpacity: 0.05,
              weight: 1,
              opacity: 0.3,
            }).addTo(map)
            coverageRef.current.set(sat.noradId, polygon)
          }
        } else {
          const footprint = getCoverageFootprint(pos.lat, pos.lng, pos.alt)
          coverageRef.current.get(sat.noradId)?.setLatLngs(footprint)
        }
      }
    })

    // Clean up orbit lines for unlocked sats
    if (!lockedId) {
      orbitsRef.current.forEach((line) => map.removeLayer(line))
      orbitsRef.current.clear()
      coverageRef.current.forEach((poly) => map.removeLayer(poly))
      coverageRef.current.clear()
    }

    // Fly to locked satellite
    if (lockedId) {
      const locked = satsToRender.find((s) => s.noradId === lockedId)
      if (locked) {
        const lpos = getSatellitePosition(locked.line1, locked.line2, now)
        if (lpos) {
          map.setView([lpos.lat, lpos.lng], map.getZoom(), { animate: true })
        }
      }
    }
  }, [satellites, lockedId, showOrbits, showCoverage, showSatellites, timelineOffset, toggleLock])

  // Auto-update positions every 2 seconds
  useEffect(() => {
    if (!mapRef.current || satellites.length === 0) return

    const interval = setInterval(() => {
      const now = new Date(
        Date.now() + useSatelliteStore.getState().timelineOffset * 60 * 1000
      )
      const maxSats = 2000

      satellites.slice(0, maxSats).forEach((sat: TLESatellite) => {
        const pos = getSatellitePosition(sat.line1, sat.line2, now)
        if (!pos || isNaN(pos.lat) || isNaN(pos.lng)) return

        const marker = markersRef.current.get(sat.noradId)
        if (marker) {
          marker.setLatLng([pos.lat, pos.lng])
        }

        const coverage = coverageRef.current.get(sat.noradId)
        if (coverage) {
          const footprint = getCoverageFootprint(pos.lat, pos.lng, pos.alt)
          coverage.setLatLngs(footprint)
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [satellites])

  // Clean up all markers when satellites change
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        markersRef.current.forEach((m) => mapRef.current!.removeLayer(m))
        markersRef.current.clear()
        orbitsRef.current.forEach((l) => mapRef.current!.removeLayer(l))
        orbitsRef.current.clear()
        coverageRef.current.forEach((p) => mapRef.current!.removeLayer(p))
        coverageRef.current.clear()
      }
    }
  }, [satellites])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#060a14' }}
    />
  )
}
