const { ensureIngested } = require('../lib/tracker-singleton');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const tracker = await ensureIngested();
    const norad = Number(req.query.norad);
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const hours = Number(req.query.hours || 24);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(norad)) {
      res.status(400).json({ error: 'norad, lat, lon required' });
      return;
    }
    res.status(200).json({ norad, passes: tracker.predictPasses(norad, lat, lon, hours) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
