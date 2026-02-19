import { Router } from 'express';

const router = Router();

router.get('/stats', (req, res) => {
  try {
    const db = req.db;

    // Top sites by visit count
    const topSites = db.prepare(`
      SELECT domain, title, visit_count, last_seen
      FROM domain_stats
      ORDER BY visit_count DESC
      LIMIT 20
    `).all();

    // Visits by day of week (0=Sunday .. 6=Saturday)
    const byDayOfWeek = db.prepare(`
      SELECT CAST(strftime('%w', timestamp / 1000, 'unixepoch') AS INTEGER) AS day,
             COUNT(*) AS count
      FROM visits
      GROUP BY day
      ORDER BY day
    `).all();

    // Visits by hour of day (0-23)
    const byHour = db.prepare(`
      SELECT (minute_of_day / 60) AS hour,
             COUNT(*) AS count
      FROM visits
      WHERE minute_of_day IS NOT NULL
      GROUP BY hour
      ORDER BY hour
    `).all();

    res.json({ topSites, byDayOfWeek, byHour });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
