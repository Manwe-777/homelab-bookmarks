import { Router } from 'express';
import { getSettings, isIgnored } from '../utils.js';

const router = Router();

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function getRootUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return url;
  }
}

function computeScore(visitCount, lastSeen) {
  const now = Date.now();
  const ageHours = (now - lastSeen) / (1000 * 60 * 60);
  const decayFactor = Math.exp(-ageHours / 168); // 1 week half-life
  return visitCount * decayFactor;
}

router.post('/track', (req, res) => {
  const { url, title, timestamp } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  const domain = extractDomain(url);
  if (!domain) {
    return res.status(400).json({ error: 'invalid url' });
  }

  // Get settings
  const settings = getSettings(req.db);

  // Check if domain is ignored
  if (isIgnored(domain, settings.ignoredDomains)) {
    return res.json({ success: true, ignored: true });
  }

  const ts = timestamp || Date.now();
  const date = new Date(ts);
  const minuteOfDay = date.getHours() * 60 + date.getMinutes();

  // Determine the URL to store
  const storeUrl = settings.mergeToRoot ? getRootUrl(url) : url;

  // Insert visit with minute of day
  req.db.prepare(`
    INSERT INTO visits (url, domain, title, timestamp, minute_of_day)
    VALUES (?, ?, ?, ?, ?)
  `).run(url, domain, title || '', ts, minuteOfDay);

  // Update minute stats for time-aware ranking
  req.db.prepare(`
    INSERT INTO domain_minutes (domain, minute, visit_count)
    VALUES (?, ?, 1)
    ON CONFLICT(domain, minute) DO UPDATE SET visit_count = visit_count + 1
  `).run(domain, minuteOfDay);

  // Update domain stats
  const existing = req.db.prepare(`
    SELECT visit_count, url, title_is_custom FROM domain_stats WHERE domain = ?
  `).get(domain);

  if (existing) {
    const newCount = existing.visit_count + 1;
    const score = computeScore(newCount, ts);

    // Only update URL if mergeToRoot is enabled or no custom URL is set
    const newUrl = settings.mergeToRoot ? getRootUrl(url) : (existing.url || storeUrl);

    req.db.prepare(`
      UPDATE domain_stats
      SET visit_count = ?, 
          last_seen = ?, 
          title = CASE 
            WHEN title_is_custom = 1 THEN title 
            ELSE COALESCE(?, title) 
          END,
          score = ?, 
          url = COALESCE(url, ?)
      WHERE domain = ?
    `).run(newCount, ts, title, score, newUrl, domain);
  } else {
    const score = computeScore(1, ts);
    req.db.prepare(`
      INSERT INTO domain_stats (domain, url, title, visit_count, last_seen, score, title_is_custom)
      VALUES (?, ?, ?, 1, ?, ?, 0)
    `).run(domain, storeUrl, title || '', ts, score);
  }

  res.json({ success: true });
});

export default router;
