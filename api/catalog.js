const { ensureIngested } = require('../lib/tracker-singleton');

module.exports = async function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const tracker = await ensureIngested();
    res.status(200).json({ count: tracker.satellites.length, updatedAt: tracker.lastIngestionAt, satellites: tracker.catalog() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
