const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const SATCAT_URL = 'https://celestrak.org/pub/satcat.csv';

let cache = { ts: 0, data: null };
const CACHE_MS = 10 * 60 * 1000;

function orbitClass(mm) {
  if (mm > 11.25) return 'LEO';
  if (mm >= 0.99 && mm <= 1.01) return 'GEO';
  if (mm > 1.01 && mm <= 11.25) return 'MEO';
  return 'HEO';
}

function parseTLE(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean);
  const satellites = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) continue;
    const norad = Number(l1.slice(2, 7));
    satellites.push({
      name: name.trim(),
      norad,
      epoch: l1.slice(18, 32).trim(),
      inc: Number(l2.slice(8, 16)),
      raan: Number(l2.slice(17, 25)),
      ecc: Number(`0.${l2.slice(26, 33).trim()}`),
      argPerigee: Number(l2.slice(34, 42)),
      meanAnomaly: Number(l2.slice(43, 51)),
      meanMotion: Number(l2.slice(52, 63)),
    });
  }
  return satellites;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function parseSatcat(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return new Map();
  const header = parseCsvLine(lines[0]);
  const index = Object.fromEntries(header.map((h, i) => [h, i]));
  const map = new Map();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const norad = Number(row[index.NORAD_CAT_ID] || 0);
    if (!Number.isFinite(norad) || norad <= 0) continue;
    map.set(norad, {
      country: row[index.OWNER] || '',
      type: row[index.OBJECT_TYPE] || '',
    });
  }
  return map;
}

async function buildCatalog() {
  const [tleResponse, satcatResponse] = await Promise.all([fetch(TLE_URL), fetch(SATCAT_URL)]);
  if (!tleResponse.ok) throw new Error(`TLE download failed (${tleResponse.status})`);
  if (!satcatResponse.ok) throw new Error(`SATCAT download failed (${satcatResponse.status})`);

  const [tleText, satcatText] = await Promise.all([tleResponse.text(), satcatResponse.text()]);
  const satellites = parseTLE(tleText);
  const metadata = parseSatcat(satcatText);

  for (const sat of satellites) {
    const m = metadata.get(sat.norad) || {};
    sat.country = m.country || '';
    sat.type = m.type || '';
    sat.orbitClass = orbitClass(sat.meanMotion);
  }
  return satellites;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const now = Date.now();
    if (!cache.data || now - cache.ts > CACHE_MS) {
      cache = { ts: now, data: await buildCatalog() };
    }
    res.status(200).json(cache.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
