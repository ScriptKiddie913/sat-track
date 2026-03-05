const { ensureIngested } = require('../lib/tracker-singleton');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const tracker = await ensureIngested();
    const norad = Number(req.query.norad);
    const minutes = Number(req.query.minutes || 100);
    const stepSec = Number(req.query.stepSec || 60);
    res.status(200).json({ norad, points: tracker.groundTrack(norad, minutes, stepSec) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
