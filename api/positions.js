const { ensureIngested } = require('../lib/tracker-singleton');

module.exports = async function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const tracker = await ensureIngested();
    res.status(200).json({ ts: new Date().toISOString(), positions: tracker.propagateAt(new Date()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
