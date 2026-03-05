const satellite = require('satellite.js');
const turf = require('@turf/turf');
const worldCountries = require('world-countries');

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const SATCAT_URL = 'https://celestrak.org/pub/satcat.csv';
const EARTH_RADIUS_KM = 6371;

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function classifyName(name, objectType) {
  const n = `${name}`.toUpperCase();
  if (objectType === 'DEBRIS') return 'debris';
  if (/(STARLINK|INTELSAT|SES|EUTELSAT|INMARSAT|TELSTAR|COMM)/.test(n)) return 'communication';
  if (/(GPS|GALILEO|GLONASS|BEIDOU|NAV)/.test(n)) return 'navigation';
  if (/(SENTINEL|LANDSAT|SPOT|WORLDVIEW|GAOFEN|RADARSAT|METEOR|NOAA)/.test(n)) return 'earth_observation';
  if (/(USA|NROL|KOSMOS|YAOGAN|MIL|DEFENSE)/.test(n)) return 'military';
  if (/(HUBBLE|JWST|SCIENCE|XMM|SWIFT|FERMI)/.test(n)) return 'scientific';
  return objectType === 'ROCKET BODY' ? 'debris' : 'other';
}

function orbitClass(mm) {
  if (mm > 11.25) return 'LEO';
  if (mm >= 0.99 && mm <= 1.01) return 'GEO';
  if (mm > 1.01 && mm <= 11.25) return 'MEO';
  return 'HEO';
}

class SatelliteTracker {
  constructor() {
    this.satellites = [];
    this.timeline = [];
    this.maxTimeline = 60000;
    this.lastIngestionAt = null;
    this.countryFeatures = worldCountries.map((c) => turf.feature(c.geometry, {
      name: c.name.common,
      cca2: c.cca2,
      cca3: c.cca3,
    }));
  }

  async ingest() {
    const [tleRes, satcatRes] = await Promise.all([fetch(TLE_URL), fetch(SATCAT_URL)]);
    if (!tleRes.ok || !satcatRes.ok) {
      throw new Error(`ingestion failed tle=${tleRes.status} satcat=${satcatRes.status}`);
    }

    const [tleText, satcatText] = await Promise.all([tleRes.text(), satcatRes.text()]);
    const satcatMap = this.parseSatcat(satcatText);

    const lines = tleText.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
    const next = [];

    for (let i = 0; i + 2 < lines.length; i += 3) {
      const name = lines[i]?.trim();
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];
      if (!name || !line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;
      const norad = Number(line1.slice(2, 7));
      const satrec = satellite.twoline2satrec(line1, line2);
      const meta = satcatMap.get(norad) || {};
      const mm = Number(line2.slice(52, 63));
      next.push({
        norad,
        name,
        line1,
        line2,
        epoch: line1.slice(18, 32).trim(),
        objectType: meta.objectType || '',
        country: meta.owner || '',
        category: classifyName(name, meta.objectType || ''),
        orbitClass: orbitClass(mm),
        satrec,
      });
    }

    this.satellites = next;
    this.lastIngestionAt = new Date().toISOString();
    return next.length;
  }

  parseSatcat(csv) {
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return new Map();
    const header = parseCsvLine(lines[0]);
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const map = new Map();
    for (let i = 1; i < lines.length; i += 1) {
      const row = parseCsvLine(lines[i]);
      const norad = Number(row[idx.NORAD_CAT_ID] || 0);
      if (!norad) continue;
      map.set(norad, { owner: row[idx.OWNER] || '', objectType: row[idx.OBJECT_TYPE] || '' });
    }
    return map;
  }

  propagateAt(time = new Date()) {
    const gmst = satellite.gstime(time);
    const out = [];
    for (const sat of this.satellites) {
      const pv = satellite.propagate(sat.satrec, time);
      if (!pv.position || !pv.velocity) continue;
      const geo = satellite.eciToGeodetic(pv.position, gmst);
      const lat = satellite.degreesLat(geo.latitude);
      const lon = satellite.degreesLong(geo.longitude);
      const alt = geo.height;
      const speed = Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2);
      const footprintKm = this.coverageRadiusKm(alt, 20);
      const countries = this.countriesInFootprint(lat, lon, footprintKm);
      out.push({
        satId: sat.norad,
        name: sat.name,
        lat,
        lon,
        alt,
        velocityKms: speed,
        orbitClass: sat.orbitClass,
        country: sat.country,
        type: sat.objectType,
        category: sat.category,
        footprintKm,
        countries,
      });
    }
    this.recordTimeline(time, out);
    return out;
  }

  coverageRadiusKm(altKm, minElevationDeg = 20) {
    const e = (minElevationDeg * Math.PI) / 180;
    const re = EARTH_RADIUS_KM;
    const rs = re + Math.max(0, altKm);
    const cosPsi = (re / rs) * Math.cos(e);
    const psi = Math.acos(Math.min(1, Math.max(-1, cosPsi))) - e;
    return Math.max(0, psi) * re;
  }

  countriesInFootprint(lat, lon, radiusKm) {
    const center = turf.point([lon, lat]);
    const circle = turf.circle([lon, lat], Math.max(1, radiusKm), { units: 'kilometers', steps: 64 });
    const visible = [];
    for (const country of this.countryFeatures) {
      if (turf.booleanIntersects(country, circle) || turf.booleanPointInPolygon(center, country)) {
        visible.push(country.properties.name);
      }
    }
    return visible;
  }

  groundTrack(norad, minutes = 100, stepSec = 60) {
    const sat = this.satellites.find((s) => s.norad === Number(norad));
    if (!sat) return [];
    const points = [];
    const start = Date.now();
    for (let t = 0; t <= minutes * 60; t += stepSec) {
      const at = new Date(start + t * 1000);
      const gmst = satellite.gstime(at);
      const pv = satellite.propagate(sat.satrec, at);
      if (!pv.position) continue;
      const geo = satellite.eciToGeodetic(pv.position, gmst);
      points.push({
        ts: at.toISOString(),
        lat: satellite.degreesLat(geo.latitude),
        lon: satellite.degreesLong(geo.longitude),
        alt: geo.height,
      });
    }
    return points;
  }

  predictPasses(norad, targetLat, targetLon, hours = 24, stepSec = 30) {
    const sat = this.satellites.find((s) => s.norad === Number(norad));
    if (!sat) return [];
    const now = Date.now();
    const passes = [];
    let current = null;

    for (let t = 0; t <= hours * 3600; t += stepSec) {
      const at = new Date(now + t * 1000);
      const gmst = satellite.gstime(at);
      const pv = satellite.propagate(sat.satrec, at);
      if (!pv.position) continue;
      const geo = satellite.eciToGeodetic(pv.position, gmst);
      const lat = satellite.degreesLat(geo.latitude);
      const lon = satellite.degreesLong(geo.longitude);
      const alt = geo.height;
      const footprintKm = this.coverageRadiusKm(alt, 20);
      const d = turf.distance(turf.point([targetLon, targetLat]), turf.point([lon, lat]), { units: 'kilometers' });
      const inside = d <= footprintKm;

      if (inside && !current) current = { start: at.toISOString(), peakDistanceKm: d, peakTs: at.toISOString() };
      if (inside && current && d < current.peakDistanceKm) {
        current.peakDistanceKm = d;
        current.peakTs = at.toISOString();
      }
      if (!inside && current) {
        current.end = at.toISOString();
        passes.push(current);
        current = null;
      }
    }
    if (current) {
      current.end = new Date(now + hours * 3600 * 1000).toISOString();
      passes.push(current);
    }
    return passes;
  }

  recordTimeline(time, positions) {
    const ts = time.toISOString();
    for (const p of positions) {
      this.timeline.push({
        time: ts,
        sat_id: p.satId,
        lat: p.lat,
        lon: p.lon,
        alt: p.alt,
        footprint_km: p.footprintKm,
      });
    }
    if (this.timeline.length > this.maxTimeline) {
      this.timeline.splice(0, this.timeline.length - this.maxTimeline);
    }
  }

  timelineQuery(lat, lon, radiusKm = 100, sinceIso = null) {
    const center = turf.point([lon, lat]);
    const sinceMs = sinceIso ? new Date(sinceIso).getTime() : 0;
    return this.timeline.filter((row) => {
      if (new Date(row.time).getTime() < sinceMs) return false;
      const d = turf.distance(center, turf.point([row.lon, row.lat]), { units: 'kilometers' });
      return d <= Math.max(radiusKm, row.footprint_km);
    });
  }

  catalog() {
    return this.satellites.map((s) => ({
      sat_id: s.norad,
      name: s.name,
      line1: s.line1,
      line2: s.line2,
      epoch: s.epoch,
      category: s.category,
      country: s.country,
      object_type: s.objectType,
      orbit_class: s.orbitClass,
    }));
  }
}

module.exports = { SatelliteTracker };
