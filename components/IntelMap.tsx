'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import L from 'leaflet'
import { useSatelliteStore } from '@/store/satelliteStore'
import {
  getSatellitePosition,
  getFullOrbitPath,
  getCoverageFootprint,
  classifyOrbit,
} from '@/lib/propagate'
import { guessOwnerFromName, getOwnerInfo } from '@/lib/country-map'
import { JAMMING_ZONES, ADSB_FLIGHTS, AIS_VESSELS } from '@/lib/intel-data'
import { GIBS_LAYERS } from '@/lib/gibs-layers'
import type { TLESatellite } from '@/lib/types'

// SVG satellite icon factory
function createSatIcon(color: string, size: number, isLocked: boolean): L.DivIcon {
  const glow = isLocked ? `filter: drop-shadow(0 0 6px ${color});` : ''
  return L.divIcon({
    className: 'sat-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="${glow}">
      <circle cx="12" cy="12" r="${isLocked ? 6 : 3}" fill="${color}" opacity="${isLocked ? 1 : 0.9}"/>
      ${isLocked ? `<circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"><animate attributeName="r" from="6" to="12" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/></circle>` : ''}
    </svg>`,
  })
}

// Ship icon
function createVesselIcon(type: string): L.DivIcon {
  const colors: Record<string, string> = {
    warship: '#ff3d3d',
    cargo: '#00ff88',
    tanker: '#ffab00',
  }
  const c = colors[type] || '#ffffff'
  return L.divIcon({
    className: 'vessel-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<svg viewBox="0 0 24 24" width="20" height="20">
      <polygon points="12,2 20,20 12,16 4,20" fill="${c}" opacity="0.85"/>
    </svg>`,
  })
}

// Plane icon
function createFlightIcon(diverted: boolean): L.DivIcon {
  const c = diverted ? '#ff3d3d' : '#00e5ff'
  return L.divIcon({
    className: 'flight-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="${c}"/>
    </svg>`,
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
  const imageryLayerRef = useRef<L.TileLayer | null>(null)
  const animFrameRef = useRef<number>(0)

  const {
    satellites,
    lockedId,
    showOrbits,
    showCoverage,
    showJamming,
    showFlights,
    showVessels,
    activeImageryLayer,
    timelineOffset,
    toggleLock,
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

    // ESRI World Imagery — high-res free satellite basemap
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        attribution: 'ESRI World Imagery',
      }
    ).addTo(map)

    // Country boundary overlay for geopolitical context
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 18,
        opacity: 0.5,
      }
    ).addTo(map)

    // Custom zoom control position
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Attribution
    L.control
      .attribution({ position: 'bottomright', prefix: false })
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

  // Jamming zones
  useEffect(() => {
    if (!mapRef.current) return

    // Clear old
    jammingRef.current.forEach((c) => mapRef.current!.removeLayer(c))
    jammingPulseRef.current.forEach((c) => mapRef.current!.removeLayer(c))
    jammingRef.current = []
    jammingPulseRef.current = []

    if (!showJamming) return

    JAMMING_ZONES.forEach((zone) => {
      if (!zone.active) return
      const sevColors = { high: '#ff3d3d', medium: '#ffab00', low: '#facc15' }
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
        </div>`,
        { className: 'intel-popup' }
      )

      jammingRef.current.push(circle)

      // Animated pulse ring
      const pulse = L.circle(zone.center, {
        radius: zone.radiusKm * 1000,
        color,
        fillColor: 'transparent',
        weight: 2,
        opacity: 0,
      }).addTo(mapRef.current!)
      jammingPulseRef.current.push(pulse)
    })

    // Animate pulse
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

  // AIS Vessels
  useEffect(() => {
    if (!mapRef.current) return

    vesselRef.current.forEach((m) => mapRef.current!.removeLayer(m))
    vesselRef.current.clear()

    if (!showVessels) return

    AIS_VESSELS.forEach((vessel) => {
      const marker = L.marker([vessel.lat, vessel.lng], {
        icon: createVesselIcon(vessel.type),
      }).addTo(mapRef.current!)

      marker.bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#fff;background:#111;padding:8px;border-radius:4px">
          <div style="color:#00e5ff;font-weight:bold">${vessel.flag} ${vessel.name}</div>
          <div>Type: ${vessel.type}</div>
          <div>Course: ${vessel.course}° · Speed: ${vessel.speed}kn</div>
        </div>`,
        { className: 'intel-popup' }
      )

      vesselRef.current.set(vessel.id, marker)
    })
  }, [showVessels])

  // Main satellite rendering loop
  useEffect(() => {
    if (!mapRef.current || satellites.length === 0) return

    const map = mapRef.current
    const now = new Date(Date.now() + timelineOffset * 60 * 1000)

    // Limit to manageable number for smooth rendering
    const maxSats = 2000
    const satsToRender = satellites.slice(0, maxSats)

    // Update positions
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
          icon: createSatIcon(ownerInfo.color, isLocked ? 18 : 8, isLocked),
        })
        marker.on('click', () => toggleLock(sat.noradId))
        marker.addTo(map)
        markersRef.current.set(sat.noradId, marker)
      } else {
        marker.setLatLng([pos.lat, pos.lng])
        if (isLocked !== (marker.options as any)._wasLocked) {
          marker.setIcon(createSatIcon(ownerInfo.color, isLocked ? 18 : 8, isLocked))
          ;(marker.options as any)._wasLocked = isLocked
        }
      }

      // Popup
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
            // Split at antimeridian
            const segments: [number, number][][] = [[]]
            for (let i = 1; i < path.length; i++) {
              if (Math.abs(path[i][1] - path[i - 1][1]) > 180) {
                segments.push([])
              }
              segments[segments.length - 1].push([path[i][0], path[i][1]])
            }
            // Draw each segment
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
          // Update coverage position
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
  }, [satellites, lockedId, showOrbits, showCoverage, timelineOffset, toggleLock])

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

        // Update coverage
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
