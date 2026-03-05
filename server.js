const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { SatelliteTracker } = require('./lib/tracker');

const PORT = process.env.PORT || 3000;
const INGEST_MS = 6 * 60 * 60 * 1000;
const STREAM_MS = 1000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const tracker = new SatelliteTracker();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, satellites: tracker.satellites.length, lastIngestionAt: tracker.lastIngestionAt });
});

app.get('/api/catalog', (_req, res) => {
  res.json({ count: tracker.satellites.length, updatedAt: tracker.lastIngestionAt, satellites: tracker.catalog() });
});

app.get('/api/positions', (_req, res) => {
  res.json({ ts: new Date().toISOString(), positions: tracker.propagateAt(new Date()) });
});

app.get('/api/ground-track/:norad', (req, res) => {
  const { norad } = req.params;
  const minutes = Number(req.query.minutes || 100);
  const stepSec = Number(req.query.stepSec || 60);
  res.json({ norad: Number(norad), points: tracker.groundTrack(norad, minutes, stepSec) });
});

app.get('/api/passes/:norad', (req, res) => {
  const { norad } = req.params;
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const hours = Number(req.query.hours || 24);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'lat and lon required' });
  res.json({ norad: Number(norad), target: { lat, lon }, passes: tracker.predictPasses(norad, lat, lon, hours) });
});


app.get('/api/ground-track', (req, res) => {
  const norad = Number(req.query.norad);
  const minutes = Number(req.query.minutes || 100);
  const stepSec = Number(req.query.stepSec || 60);
  res.json({ norad, points: tracker.groundTrack(norad, minutes, stepSec) });
});

app.get('/api/passes', (req, res) => {
  const norad = Number(req.query.norad);
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const hours = Number(req.query.hours || 24);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(norad)) return res.status(400).json({ error: 'norad, lat and lon required' });
  res.json({ norad, target: { lat, lon }, passes: tracker.predictPasses(norad, lat, lon, hours) });
});
app.get('/api/timeline/query', (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radiusKm = Number(req.query.radiusKm || 100);
  const since = req.query.since || null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'lat and lon required' });
  res.json({ matches: tracker.timelineQuery(lat, lon, radiusKm, since) });
});

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'hello', intervalMs: STREAM_MS }));
});

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

async function ingestLoop() {
  try {
    const count = await tracker.ingest();
    // eslint-disable-next-line no-console
    console.log(`Ingested ${count} satellites at ${tracker.lastIngestionAt}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Ingestion error', err.message);
  }
}

async function start() {
  await ingestLoop();
  setInterval(ingestLoop, INGEST_MS);
  setInterval(() => {
    const ts = new Date();
    const positions = tracker.propagateAt(ts);
    broadcast({ type: 'positions', ts: ts.toISOString(), positions });
  }, STREAM_MS);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Satellite tracker running on http://localhost:${PORT}`);
  });
}

start();
