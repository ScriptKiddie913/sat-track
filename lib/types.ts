export interface TLESatellite {
  name: string
  line1: string
  line2: string
  noradId: string
}

export interface SatellitePosition {
  lat: number
  lng: number
  alt: number
  velocity: number
}

export interface SatelliteWithPosition extends TLESatellite {
  position: SatellitePosition | null
  ownerCode: string
  ownerName: string
  orbitType: string
  category: string
}

export interface CountryInfo {
  code: string
  name: string
  flag: string
  count: number
  color: string
}

export interface JammingZone {
  id: string
  name: string
  center: [number, number]
  radiusKm: number
  type: string
  severity: 'high' | 'medium' | 'low'
  active: boolean
}

export interface GIBSLayer {
  id: string
  name: string
  url: string
  resolution: string
  updateRate: string
  maxZoom: number
}

export type SatCategory = 'active' | 'starlink' | 'stations' | 'weather' | 'gps' | 'military' | 'science' | 'resource'
