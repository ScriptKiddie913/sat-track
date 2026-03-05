const { SatelliteTracker } = require('./tracker');

const state = global.__SAT_TRACKER_STATE__ || {
  tracker: new SatelliteTracker(),
  lastRefresh: 0,
  refreshMs: 6 * 60 * 60 * 1000,
  lock: null,
};

global.__SAT_TRACKER_STATE__ = state;

async function ensureIngested() {
  const now = Date.now();
  if (state.tracker.satellites.length && now - state.lastRefresh < state.refreshMs) return state.tracker;
  if (state.lock) return state.lock;
  state.lock = (async () => {
    await state.tracker.ingest();
    state.lastRefresh = Date.now();
    state.lock = null;
    return state.tracker;
  })();
  return state.lock;
}

module.exports = { ensureIngested };
