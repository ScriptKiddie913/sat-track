import type { JammingZone, AISVessel, ADSBFlight, GroundStation, GodsEyeMode } from './types'

export const JAMMING_ZONES: JammingZone[] = [
  { id: 'jam1', name: 'Eastern Mediterranean', center: [35.0, 34.0], radiusKm: 350, type: 'GPS/GNSS', severity: 'high', active: true, source: 'Russian EW' },
  { id: 'jam2', name: 'Black Sea / Crimea', center: [44.5, 33.5], radiusKm: 280, type: 'GPS/GNSS', severity: 'high', active: true, source: 'Russian EW' },
  { id: 'jam3', name: 'Northern Norway / Kola', center: [69.0, 33.0], radiusKm: 200, type: 'GPS', severity: 'medium', active: true, source: 'Russian EW' },
  { id: 'jam4', name: 'Baltic / Kaliningrad', center: [54.7, 20.5], radiusKm: 180, type: 'GPS/GNSS', severity: 'medium', active: true, source: 'Russian EW' },
  { id: 'jam5', name: 'South China Sea (Spratly)', center: [10.0, 114.0], radiusKm: 300, type: 'AIS/GPS', severity: 'high', active: true, source: 'PLA Navy' },
  { id: 'jam6', name: 'Northern Syria / Aleppo', center: [36.2, 37.1], radiusKm: 150, type: 'GPS', severity: 'high', active: true, source: 'Multiple' },
  { id: 'jam7', name: 'Eastern Ukraine / Donbas', center: [48.0, 38.5], radiusKm: 250, type: 'GPS/GNSS', severity: 'high', active: true, source: 'Russian EW' },
  { id: 'jam8', name: 'Persian Gulf / Strait of Hormuz', center: [26.5, 56.0], radiusKm: 200, type: 'GPS/AIS', severity: 'medium', active: true, source: 'IRGC' },
  { id: 'jam9', name: 'Sea of Japan / Vladivostok', center: [43.0, 132.0], radiusKm: 150, type: 'GPS', severity: 'medium', active: true, source: 'Russian Pacific Fleet' },
  { id: 'jam10', name: 'Taiwan Strait', center: [24.5, 119.5], radiusKm: 120, type: 'GPS/AIS', severity: 'medium', active: true, source: 'PLA' },
  { id: 'jam11', name: 'Red Sea / Yemen Coast', center: [14.0, 42.5], radiusKm: 180, type: 'GPS/AIS', severity: 'high', active: true, source: 'Houthi forces' },
  { id: 'jam12', name: 'North Korea / DMZ', center: [38.3, 127.0], radiusKm: 100, type: 'GPS', severity: 'medium', active: true, source: 'KPA' },
]

export const ADSB_FLIGHTS: ADSBFlight[] = [
  { id: 'UAL234', callsign: 'UAL234', type: 'commercial', path: [[40.64, -73.78], [41.5, -60], [45, -40], [48, -20], [50, -5], [51.47, -0.45]], diverted: false },
  { id: 'THY718', callsign: 'THY718', type: 'commercial', path: [[41.26, 28.74], [40.5, 30], [39, 32], [37.5, 35.5], [35, 38], [33.8, 35.5]], diverted: true },
  { id: 'RSD401', callsign: 'RSD401', type: 'military', path: [[55.97, 37.41], [54, 35], [52, 33], [50, 33.5], [48, 34], [45, 33.5]], diverted: false },
  { id: 'SIA21', callsign: 'SIA21', type: 'commercial', path: [[1.36, 103.99], [5, 100], [10, 95], [15, 88], [20, 82], [25.25, 55.36]], diverted: false },
  { id: 'QFA7', callsign: 'QFA7', type: 'commercial', path: [[-33.95, 151.18], [-25, 145], [-15, 130], [-5, 115], [5, 100], [10, 85]], diverted: false },
  { id: 'FORTE12', callsign: 'FORTE12', type: 'surveillance', path: [[38.75, -104.53], [38, -100], [37.5, -95], [38, -85], [39, -78], [38.95, -77.46]], diverted: false },
  { id: 'AFR7', callsign: 'AFR7', type: 'commercial', path: [[49.01, 2.55], [48, 5], [45, 10], [40, 20], [35, 30], [33.94, 35.49]], diverted: false },
  { id: 'RRR8741', callsign: 'RRR8741', type: 'military', path: [[59.80, 30.26], [58, 35], [55, 40], [52, 45], [50, 50], [48, 55]], diverted: false },
  { id: 'UAVRQ4', callsign: 'RQ4B', type: 'surveillance', path: [[38.17, -1.17], [37, 5], [36, 10], [35.5, 15], [35.8, 20], [36, 25]], diverted: false },
  { id: 'EJU322', callsign: 'EJU322', type: 'commercial', path: [[51.15, -0.19], [51.5, 2], [52, 5], [52.5, 7], [52.38, 9.69]], diverted: true },
]

export const AIS_VESSELS: AISVessel[] = [
  { id: 'V001', name: 'USS GERALD FORD (CVN-78)', type: 'warship', lat: 36.5, lng: 14.5, course: 90, speed: 18, flag: '\u{1F1FA}\u{1F1F8}' },
  { id: 'V002', name: 'COSCO SHANGHAI', type: 'cargo', lat: 1.2, lng: 103.8, course: 270, speed: 12, flag: '\u{1F1E8}\u{1F1F3}' },
  { id: 'V003', name: 'NORD STREAM TANKER', type: 'tanker', lat: 55.5, lng: 15.0, course: 180, speed: 8, flag: '\u{1F1F7}\u{1F1FA}' },
  { id: 'V004', name: 'INS VIKRAMADITYA (R33)', type: 'warship', lat: 15.4, lng: 73.8, course: 240, speed: 20, flag: '\u{1F1EE}\u{1F1F3}' },
  { id: 'V005', name: 'EVER GIVEN', type: 'cargo', lat: 30.0, lng: 32.5, course: 350, speed: 10, flag: '\u{1F1F5}\u{1F1E6}' },
  { id: 'V006', name: 'USS NIMITZ (CVN-68)', type: 'warship', lat: 25.2, lng: 55.3, course: 120, speed: 15, flag: '\u{1F1FA}\u{1F1F8}' },
  { id: 'V007', name: 'LIAONING (CV-16)', type: 'warship', lat: 18.5, lng: 112.0, course: 200, speed: 16, flag: '\u{1F1E8}\u{1F1F3}' },
  { id: 'V008', name: 'HMS QUEEN ELIZABETH (R08)', type: 'warship', lat: 50.8, lng: -1.1, course: 180, speed: 12, flag: '\u{1F1EC}\u{1F1E7}' },
  { id: 'V009', name: 'JS IZUMO (DDH-183)', type: 'warship', lat: 34.0, lng: 136.0, course: 90, speed: 14, flag: '\u{1F1EF}\u{1F1F5}' },
  { id: 'V010', name: 'CHARLES DE GAULLE (R91)', type: 'warship', lat: 43.1, lng: 5.9, course: 170, speed: 18, flag: '\u{1F1EB}\u{1F1F7}' },
  { id: 'V011', name: 'MAERSK EINDHOVEN', type: 'cargo', lat: -6.2, lng: 106.8, course: 310, speed: 14, flag: '\u{1F1E9}\u{1F1F0}' },
  { id: 'V012', name: 'AKADEMIK CHERSKIY', type: 'research', lat: 54.5, lng: 19.5, course: 270, speed: 6, flag: '\u{1F1F7}\u{1F1FA}' },
  { id: 'V013', name: 'MSC ANNA', type: 'cargo', lat: 31.2, lng: 121.5, course: 90, speed: 16, flag: '\u{1F1E8}\u{1F1ED}' },
  { id: 'V014', name: 'CRUDE OIL TANKER (VLCC)', type: 'tanker', lat: 22.0, lng: 60.0, course: 240, speed: 11, flag: '\u{1F1F1}\u{1F1F7}' },
  { id: 'V015', name: 'MYSTERY VESSEL (AIS OFF)', type: 'unknown', lat: 13.5, lng: 42.0, course: 0, speed: 0, flag: '?' },
]

export const GROUND_STATIONS: GroundStation[] = [
  { name: 'Cape Canaveral SLC', lat: 28.562, lng: -80.577, type: 'launch', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Vandenberg SFB', lat: 34.742, lng: -120.573, type: 'launch', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Kennedy Space Center', lat: 28.608, lng: -80.604, type: 'launch', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Baikonur Cosmodrome', lat: 45.965, lng: 63.305, type: 'launch', flag: '\u{1F1F7}\u{1F1FA}' },
  { name: 'Vostochny Cosmodrome', lat: 51.884, lng: 128.334, type: 'launch', flag: '\u{1F1F7}\u{1F1FA}' },
  { name: 'Plesetsk Cosmodrome', lat: 62.927, lng: 40.577, type: 'launch', flag: '\u{1F1F7}\u{1F1FA}' },
  { name: 'Jiuquan SLC', lat: 40.958, lng: 100.291, type: 'launch', flag: '\u{1F1E8}\u{1F1F3}' },
  { name: 'Xichang SLC', lat: 28.246, lng: 102.027, type: 'launch', flag: '\u{1F1E8}\u{1F1F3}' },
  { name: 'Wenchang SLC', lat: 19.614, lng: 110.951, type: 'launch', flag: '\u{1F1E8}\u{1F1F3}' },
  { name: 'Satish Dhawan SHAR', lat: 13.720, lng: 80.230, type: 'launch', flag: '\u{1F1EE}\u{1F1F3}' },
  { name: 'Tanegashima Space Center', lat: 30.400, lng: 131.000, type: 'launch', flag: '\u{1F1EF}\u{1F1F5}' },
  { name: 'Guiana Space Centre', lat: 5.232, lng: -52.769, type: 'launch', flag: '\u{1F1EA}\u{1F1FA}' },
  { name: 'Semnan Launch Site', lat: 35.235, lng: 53.921, type: 'launch', flag: '\u{1F1EE}\u{1F1F7}' },
  { name: 'Sohae SLS (DPRK)', lat: 39.660, lng: 124.705, type: 'launch', flag: '\u{1F1F0}\u{1F1F5}' },
  { name: 'Naro Space Center', lat: 34.431, lng: 127.536, type: 'launch', flag: '\u{1F1F0}\u{1F1F7}' },
  { name: 'Palmachim AFB', lat: 31.897, lng: 34.690, type: 'launch', flag: '\u{1F1EE}\u{1F1F1}' },
  { name: 'Pine Gap (SIGINT)', lat: -23.799, lng: 133.737, type: 'sigint', flag: '\u{1F1E6}\u{1F1FA}' },
  { name: 'Menwith Hill (ECHELON)', lat: 54.008, lng: -1.688, type: 'sigint', flag: '\u{1F1EC}\u{1F1E7}' },
  { name: 'Buckley SFB (Missile Warn)', lat: 39.717, lng: -104.752, type: 'sigint', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Diego Garcia (Naval)', lat: -7.316, lng: 72.411, type: 'sigint', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Thule Air Base (Radar)', lat: 76.531, lng: -68.703, type: 'radar', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Fylingdales (Radar)', lat: 54.362, lng: -0.671, type: 'radar', flag: '\u{1F1EC}\u{1F1E7}' },
  { name: 'Goldstone DSN', lat: 35.427, lng: -116.890, type: 'dsn', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Canberra DSN', lat: -35.402, lng: 148.981, type: 'dsn', flag: '\u{1F1E6}\u{1F1FA}' },
  { name: 'Madrid DSN', lat: 40.432, lng: -4.249, type: 'dsn', flag: '\u{1F1EA}\u{1F1F8}' },
]

export const GODS_EYE_MODES: GodsEyeMode[] = [
  { id: 's2hd', label: 'TRUE COLOR HD', desc: 'Sentinel-2 Cloudless 10m Resolution' },
  { id: 'ndvi', label: 'NDVI', desc: 'MODIS 8-Day Vegetation Index 250m' },
  { id: 'fires_hd', label: 'ACTIVE FIRES', desc: 'VIIRS 375m Thermal Anomalies' },
  { id: 'night_hd', label: 'NIGHT LIGHTS', desc: 'VIIRS Day/Night Band' },
]
