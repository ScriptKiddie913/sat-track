const EARTH_RADIUS_KM = 6378.137;
const MU = 398600.4418;
const TWO_PI = Math.PI * 2;

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const detailsEl = document.getElementById('details');
const bodyEl = document.getElementById('catalog-body');
const statsEl = document.getElementById('stats');
const searchEl = document.getElementById('search');

let satellites = [];
let drawnPoints = [];
let filtered = [];

function classifyOrbit(mm) {
  if (mm > 11.25) return 'LEO';
  if (mm >= 0.99 && mm <= 1.01) return 'GEO';
  if (mm > 1.01 && mm <= 11.25) return 'MEO';
  return 'HEO';
}

function parseEpoch(epochRaw) {
  const yy = Number(epochRaw.slice(0, 2));
  const day = Number(epochRaw.slice(2));
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const jan1 = Date.UTC(year, 0, 1, 0, 0, 0);
  return new Date(jan1 + (day - 1) * 86400000);
}

function solveEccentricAnomaly(M, e) {
  let E = M;
  for (let i = 0; i < 8; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

function gmst(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525.0;
  let g = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t - (t * t * t) / 38710000;
  g = ((g % 360) + 360) % 360;
  return g * Math.PI / 180;
}

function propagate(sat, at) {
  const dt = (at - sat.epoch) / 1000;
  const n = sat.meanMotion * TWO_PI / 86400;
  const a = Math.cbrt(MU / (n * n));
  const M = (sat.meanAnomaly + n * dt) % TWO_PI;
  const E = solveEccentricAnomaly(M, sat.ecc);
  const nu = 2 * Math.atan2(Math.sqrt(1 + sat.ecc) * Math.sin(E / 2), Math.sqrt(1 - sat.ecc) * Math.cos(E / 2));
  const r = a * (1 - sat.ecc * Math.cos(E));

  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);

  const cosO = Math.cos(sat.raan), sinO = Math.sin(sat.raan);
  const cosI = Math.cos(sat.inc), sinI = Math.sin(sat.inc);
  const cosW = Math.cos(sat.argPerigee), sinW = Math.sin(sat.argPerigee);

  const x = (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb;
  const y = (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb;
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  const th = gmst(at);
  const xe = Math.cos(th) * x + Math.sin(th) * y;
  const ye = -Math.sin(th) * x + Math.cos(th) * y;
  const ze = z;

  const lon = Math.atan2(ye, xe);
  const lat = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye));
  const alt = Math.sqrt(xe * xe + ye * ye + ze * ze) - EARTH_RADIUS_KM;
  return { lat, lon, alt };
}

function project(lat, lon) {
  return {
    x: ((lon + Math.PI) / (2 * Math.PI)) * canvas.width,
    y: ((Math.PI / 2 - lat) / Math.PI) * canvas.height,
  };
}

function drawBaseMap() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i <= 12; i++) {
    const y = (i / 12) * canvas.height;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * canvas.width;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
}

function paint() {
  drawBaseMap();
  const now = new Date();
  drawnPoints = [];
  for (const sat of satellites) {
    const p = propagate(sat, now);
    const { x, y } = project(p.lat, p.lon);
    const color = sat.orbitClass === 'LEO' ? '#22c55e' : sat.orbitClass === 'MEO' ? '#f59e0b' : sat.orbitClass === 'GEO' ? '#38bdf8' : '#f43f5e';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 2, 2);
    sat.live = p;
    drawnPoints.push({ x, y, sat });
  }
  statsEl.textContent = `Satellites loaded: ${satellites.length.toLocaleString()} | Last update: ${now.toISOString()}`;
}

function renderTable() {
  bodyEl.innerHTML = '';
  for (const sat of filtered.slice(0, 400)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${sat.name}</td><td>${sat.country || 'Unknown'}</td><td>${sat.type || 'Unknown'}</td><td>${sat.orbitClass}</td>`;
    tr.onclick = () => showDetails(sat);
    bodyEl.appendChild(tr);
  }
}

function showDetails(sat) {
  const live = sat.live || { lat: 0, lon: 0, alt: 0 };
  detailsEl.innerHTML = `
    <strong>${sat.name}</strong><br/>
    NORAD: ${sat.norad}<br/>
    Country: ${sat.country || 'Unknown'}<br/>
    Type: ${sat.type || 'Unknown'}<br/>
    Orbit class: ${sat.orbitClass}<br/>
    Latitude: ${(live.lat * 180 / Math.PI).toFixed(2)}°<br/>
    Longitude: ${(live.lon * 180 / Math.PI).toFixed(2)}°<br/>
    Altitude: ${live.alt.toFixed(1)} km
  `;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  let nearest = null;
  let best = 99999;
  for (const p of drawnPoints) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < best) { best = d; nearest = p; }
  }
  if (nearest) showDetails(nearest.sat);
});

searchEl.addEventListener('input', () => {
  const q = searchEl.value.trim().toLowerCase();
  filtered = !q ? satellites : satellites.filter(s =>
    [s.name, s.country, s.type, s.orbitClass, String(s.norad)].join(' ').toLowerCase().includes(q)
  );
  renderTable();
});

async function loadCatalog() {
  const endpoints = ['/api/satellites', 'data/satellites.json'];
  let lastError = null;
  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`${url} -> HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No data endpoint available');
}

async function init() {
  satellites = (await loadCatalog()).map(s => ({
    ...s,
    inc: s.inc * Math.PI / 180,
    raan: s.raan * Math.PI / 180,
    argPerigee: s.argPerigee * Math.PI / 180,
    meanAnomaly: s.meanAnomaly * Math.PI / 180,
    epoch: parseEpoch(s.epoch),
  }));
  filtered = satellites;
  renderTable();
  paint();
  setInterval(paint, 1000);
}

init().catch(err => {
  detailsEl.textContent = `Failed to load catalog: ${err.message}. Ensure /api/satellites is reachable or rebuild data/satellites.json.`;
});
