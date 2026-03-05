import type { SatCategory } from './types'

export const TLE_URLS: Record<SatCategory, string> = {
  active:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
  starlink:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  stations:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  weather:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle',
  gps: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
  military:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle',
  science:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle',
  resource:
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle',
}

// Curated multi-nation satellites — always available as fallback
export const CURATED_SATELLITES = [
  // USA
  { name: 'ISS (ZARYA)', noradId: '25544', ownerCode: 'US', category: 'stations' },
  { name: 'TDRS 13', noradId: '49035', ownerCode: 'US', category: 'communication' },
  { name: 'GPS BIIF-12', noradId: '41328', ownerCode: 'US', category: 'gps' },
  { name: 'NROL-82', noradId: '48500', ownerCode: 'US', category: 'military' },
  // China
  { name: 'BEIDOU-3 M23', noradId: '49808', ownerCode: 'CN', category: 'gps' },
  { name: 'YAOGAN-35A', noradId: '51838', ownerCode: 'CN', category: 'military' },
  { name: 'TIANGONG', noradId: '54216', ownerCode: 'CN', category: 'stations' },
  // Russia
  { name: 'GLONASS-M 58', noradId: '43508', ownerCode: 'RU', category: 'gps' },
  { name: 'COSMOS 2558', noradId: '53328', ownerCode: 'RU', category: 'military' },
  // Europe
  { name: 'GALILEO-FOC FM23', noradId: '48859', ownerCode: 'EU', category: 'gps' },
  { name: 'SENTINEL-2A', noradId: '40697', ownerCode: 'EU', category: 'resource' },
  { name: 'METOP-C', noradId: '43689', ownerCode: 'EU', category: 'weather' },
  // Israel
  { name: 'EROS-C', noradId: '53086', ownerCode: 'IL', category: 'military' },
  { name: 'OFEQ-16', noradId: '49464', ownerCode: 'IL', category: 'military' },
  // France
  { name: 'PLEIADES NEO 3', noradId: '48903', ownerCode: 'FR', category: 'resource' },
  { name: 'CSO-2', noradId: '48259', ownerCode: 'FR', category: 'military' },
  // Germany
  { name: 'SARAH-1', noradId: '56194', ownerCode: 'DE', category: 'military' },
  { name: 'ENMAP', noradId: '52319', ownerCode: 'DE', category: 'science' },
  // South Korea
  { name: 'KOMPSAT-6', noradId: '57251', ownerCode: 'KR', category: 'resource' },
  { name: 'ANASIS-II', noradId: '45830', ownerCode: 'KR', category: 'military' },
  // India
  { name: 'CARTOSAT-3', noradId: '44804', ownerCode: 'IN', category: 'resource' },
  { name: 'GSAT-30', noradId: '45026', ownerCode: 'IN', category: 'communication' },
  { name: 'IRNSS-1I', noradId: '43286', ownerCode: 'IN', category: 'gps' },
  // Turkey
  { name: 'TURKSAT 5B', noradId: '51162', ownerCode: 'TR', category: 'communication' },
  { name: 'GOKTURK-2', noradId: '39030', ownerCode: 'TR', category: 'resource' },
]
