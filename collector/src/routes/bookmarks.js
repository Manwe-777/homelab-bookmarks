import { Router } from 'express';

const router = Router();

const MINUTES_IN_DAY = 1440;
const TIME_WINDOW = 30; // ±30 minutes window

// Get time-aware boost for a domain based on current minute of day
function getTimeBoost(db, domain, currentMinute) {
  // Build list of nearby minutes, wrapping around midnight
  const nearbyMinutes = [];
  for (let i = -TIME_WINDOW; i <= TIME_WINDOW; i++) {
    nearbyMinutes.push((currentMinute + i + MINUTES_IN_DAY) % MINUTES_IN_DAY);
  }

  const placeholders = nearbyMinutes.map(() => '?').join(',');
  const nearbyVisits = db.prepare(`
    SELECT SUM(visit_count) as count
    FROM domain_minutes
    WHERE domain = ? AND minute IN (${placeholders})
  `).get(domain, ...nearbyMinutes);

  const totalVisits = db.prepare(`
    SELECT SUM(visit_count) as count
    FROM domain_minutes
    WHERE domain = ?
  `).get(domain);

  if (!totalVisits?.count || totalVisits.count === 0) {
    return 1.0; // No history, neutral boost
  }

  const nearbyCount = nearbyVisits?.count || 0;
  const ratio = nearbyCount / totalVisits.count;

  // Boost ranges from 0.5 (rarely visited at this time) to 1.5 (frequently visited)
  // A site visited 100% at this time gets 1.5x, 0% gets 0.5x, 50% gets 1.0x
  return 0.5 + ratio;
}

router.get('/bookmarks', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  // Get base bookmarks
  const rows = req.db.prepare(`
    SELECT domain, url, title, visit_count as visits, last_seen, score
    FROM domain_stats
    ORDER BY score DESC
    LIMIT ?
  `).all(limit * 2); // Fetch more to allow reordering

  // Apply time-aware boosting
  const boosted = rows.map(row => {
    const timeBoost = getTimeBoost(req.db, row.domain, currentMinute);
    return {
      ...row,
      timeBoost,
      adjustedScore: row.score * timeBoost
    };
  });

  // Sort by adjusted score
  boosted.sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Take top N
  const top = boosted.slice(0, limit).map(row => ({
    url: row.url || `https://${row.domain}`,
    domain: row.domain,
    title: row.title || row.domain,
    visits: row.visits,
    last_seen: row.last_seen,
    score: Math.round(row.adjustedScore * 100) / 100
  }));

  res.json({ top });
});

// Update a bookmark
router.put('/bookmarks/:domain', (req, res) => {
  const { domain } = req.params;
  const { url, title } = req.body;

  const existing = req.db.prepare(`
    SELECT domain FROM domain_stats WHERE domain = ?
  `).get(domain);

  if (!existing) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }

  req.db.prepare(`
    UPDATE domain_stats
    SET url = ?, title = ?
    WHERE domain = ?
  `).run(url, title, domain);

  res.json({ success: true });
});

// Delete a bookmark
router.delete('/bookmarks/:domain', (req, res) => {
  const { domain } = req.params;

  req.db.prepare(`DELETE FROM domain_stats WHERE domain = ?`).run(domain);
  req.db.prepare(`DELETE FROM domain_minutes WHERE domain = ?`).run(domain);
  req.db.prepare(`DELETE FROM visits WHERE domain = ?`).run(domain);

  res.json({ success: true });
});

export default router;
