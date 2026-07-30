import { Router } from 'express';

const router = Router();

/**
 * GET /api/history
 *
 * Returns recent browser visits, deduplicated by URL within the time window.
 *
 * Query params:
 *   hours  — how far back to look (default: 24)
 *   limit  — max rows (default: 100)
 *   unique — if 'true' (default), deduplicate by URL (keep most recent visit per URL)
 */
router.get('/history', (req, res) => {
  try {
    const db = req.db;
    const hours = Math.min(parseInt(req.query.hours) || 24, 168); // cap at 7 days
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const unique = req.query.unique !== 'false';

    const since = Date.now() - hours * 60 * 60 * 1000;

    let rows;
    if (unique) {
      // Most recent visit per URL within window
      rows = db.prepare(`
        SELECT url, domain, title, MAX(timestamp) as timestamp, minute_of_day
        FROM visits
        WHERE timestamp >= ?
        GROUP BY url
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(since, limit);
    } else {
      rows = db.prepare(`
        SELECT url, domain, title, timestamp, minute_of_day
        FROM visits
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(since, limit);
    }

    res.json({ visits: rows, hours, count: rows.length });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/digest
 *
 * A pre-aggregated summary designed for AI consumption.
 * Returns:
 *   - recentVisits: unique URLs from the last 24h (up to 50), most recent first
 *   - topSites: all-time top 20 domains by visit count
 *   - activityByHour: visit count per hour of day (pattern signal)
 *   - activityByDow: visit count per day of week (pattern signal)
 *   - totalVisits24h: raw visit count in last 24h
 */
router.get('/digest', (req, res) => {
  try {
    const db = req.db;
    const since24h = Date.now() - 24 * 60 * 60 * 1000;
    const since7d  = Date.now() - 7  * 24 * 60 * 60 * 1000;

    // Recent unique URLs (last 24h), most recent first
    const recentVisits = db.prepare(`
      SELECT url, domain, title, MAX(timestamp) as timestamp
      FROM visits
      WHERE timestamp >= ?
      GROUP BY url
      ORDER BY timestamp DESC
      LIMIT 50
    `).all(since24h);

    // Top domains all-time
    const topSites = db.prepare(`
      SELECT domain, title, visit_count, last_seen, url
      FROM domain_stats
      ORDER BY visit_count DESC
      LIMIT 20
    `).all();

    // Visit count per hour of day (last 7 days, to avoid startup noise)
    const activityByHour = db.prepare(`
      SELECT (minute_of_day / 60) AS hour, COUNT(*) AS count
      FROM visits
      WHERE timestamp >= ? AND minute_of_day IS NOT NULL
      GROUP BY hour
      ORDER BY hour
    `).all(since7d);

    // Visit count per day of week (last 7 days)
    const activityByDow = db.prepare(`
      SELECT CAST(strftime('%w', timestamp / 1000, 'unixepoch') AS INTEGER) AS dow,
             COUNT(*) AS count
      FROM visits
      WHERE timestamp >= ?
      GROUP BY dow
      ORDER BY dow
    `).all(since7d);

    // Total raw visits in last 24h
    const { total24h } = db.prepare(`
      SELECT COUNT(*) as total24h FROM visits WHERE timestamp >= ?
    `).get(since24h);

    res.json({
      recentVisits,
      topSites,
      activityByHour,
      activityByDow,
      totalVisits24h: total24h,
    });
  } catch (err) {
    console.error('Digest error:', err);
    res.status(500).json({ error: 'Failed to fetch digest' });
  }
});

export default router;
