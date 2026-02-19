import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3101;
const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:3100';

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Serve stats page at /stats
app.get('/stats', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'stats.html'));
});

// Proxy to collector API (avoids CORS issues in iframe)

// GET bookmarks
app.get('/api/bookmarks', async (req, res) => {
  try {
    const response = await fetch(`${COLLECTOR_URL}/api/bookmarks?limit=${req.query.limit || 20}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// PUT bookmark (edit)
app.put('/api/bookmarks/:domain', async (req, res) => {
  try {
    const response = await fetch(`${COLLECTOR_URL}/api/bookmarks/${encodeURIComponent(req.params.domain)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// DELETE bookmark
app.delete('/api/bookmarks/:domain', async (req, res) => {
  try {
    const response = await fetch(`${COLLECTOR_URL}/api/bookmarks/${encodeURIComponent(req.params.domain)}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// GET settings
app.get('/api/settings', async (req, res) => {
  try {
    const response = await fetch(`${COLLECTOR_URL}/api/settings`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT settings
app.put('/api/settings', async (req, res) => {
  try {
    const response = await fetch(`${COLLECTOR_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET stats
app.get('/api/stats', async (req, res) => {
  try {
    const response = await fetch(`${COLLECTOR_URL}/api/stats`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Config endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    collectorUrl: COLLECTOR_URL
  });
});

app.listen(PORT, () => {
  console.log(`Dashboard widget running on port ${PORT}`);
});
