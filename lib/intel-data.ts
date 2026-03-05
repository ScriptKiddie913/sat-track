import type { JammingZone } from './types'

export const JAMMING_ZONES: JammingZone[] = [
  {
    id: 'jam-1',
    name: 'Eastern Mediterranean',
    center: [35.0, 34.0],
    radiusKm: 350,
    type: 'GPS/GNSS',
    severity: 'high',
    active: true,
  },
  {
    id: 'jam-2',
    name: 'Black Sea / Crimea',
    center: [44.5, 33.5],
    radiusKm: 280,
    type: 'GPS/GNSS',
    severity: 'high',
    active: true,
  },
  {
    id: 'jam-3',
    name: 'Northern Norway / Kola',
    center: [69.0, 33.0],
    radiusKm: 200,
    type: 'GPS',
    severity: 'medium',
    active: true,
  },
  {
    id: 'jam-4',
    name: 'Baltic / Kaliningrad',
    center: [54.7, 20.5],
    radiusKm: 180,
    type: 'GPS/GNSS',
    severity: 'medium',
    active: true,
  },
  {
    id: 'jam-5',
    name: 'South China Sea',
    center: [16.0, 112.0],
    radiusKm: 300,
    type: 'AIS/GPS',
    severity: 'high',
    active: true,
  },
]

// Simulated ADS-B flight paths with diversions
export const ADSB_FLIGHTS = [
  {
    id: 'UAL234',
    callsign: 'UAL234',
    type: 'commercial',
    path: [
      [40.6413, -73.7781], [41.5, -60.0], [45.0, -40.0], [48.0, -20.0], [50.0, -5.0], [51.47, -0.4543],
    ] as [number, number][],
    diverted: false,
  },
  {
    id: 'THY718',
    callsign: 'THY718',
    type: 'commercial',
    path: [
      [41.2611, 28.7416], [40.5, 30.0], [39.0, 32.0], [37.5, 35.5], [35.0, 38.0], [33.8, 35.5],
    ] as [number, number][],
    diverted: true,
  },
  {
    id: 'RSD401',
    callsign: 'RSD401',
    type: 'military',
    path: [
      [55.9726, 37.4146], [54.0, 35.0], [52.0, 33.0], [50.0, 33.5], [48.0, 34.0], [45.0, 33.5],
    ] as [number, number][],
    diverted: false,
  },
]

// Simulated AIS vessel positions
export const AIS_VESSELS = [
  {
    id: 'V001',
    name: 'USS GERALD FORD',
    type: 'warship',
    lat: 36.5,
    lng: 14.5,
    course: 90,
    speed: 18,
    flag: '🇺🇸',
  },
  {
    id: 'V002',
    name: 'COSCO SHANGHAI',
    type: 'cargo',
    lat: 1.2,
    lng: 103.8,
    course: 270,
    speed: 12,
    flag: '🇨🇳',
  },
  {
    id: 'V003',
    name: 'NORD STREAM TANKER',
    type: 'tanker',
    lat: 55.5,
    lng: 15.0,
    course: 180,
    speed: 8,
    flag: '🇷🇺',
  },
  {
    id: 'V004',
    name: 'INS VIKRAMADITYA',
    type: 'warship',
    lat: 15.4,
    lng: 73.8,
    course: 240,
    speed: 20,
    flag: '🇮🇳',
  },
  {
    id: 'V005',
    name: 'EVER GIVEN',
    type: 'cargo',
    lat: 30.0,
    lng: 32.5,
    course: 350,
    speed: 10,
    flag: '🇵🇦',
  },
]
