import { Router } from 'express';

const router = Router();

// Get settings
router.get('/settings', (req, res) => {
  const mergeToRoot = req.db.prepare(`SELECT value FROM settings WHERE key = ?`).get('mergeToRoot');
  const ignoredDomains = req.db.prepare(`SELECT value FROM settings WHERE key = ?`).get('ignoredDomains');

  res.json({
    mergeToRoot: mergeToRoot ? JSON.parse(mergeToRoot.value) : false,
    ignoredDomains: ignoredDomains ? JSON.parse(ignoredDomains.value) : []
  });
});

// Update settings
router.put('/settings', (req, res) => {
  const { mergeToRoot, ignoredDomains } = req.body;

  if (mergeToRoot !== undefined) {
    req.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `).run('mergeToRoot', JSON.stringify(mergeToRoot));
  }

  if (ignoredDomains !== undefined) {
    req.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `).run('ignoredDomains', JSON.stringify(ignoredDomains));
  }

  res.json({ success: true });
});

export default router;
