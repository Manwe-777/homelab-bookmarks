import express from 'express';
import cors from 'cors';
import { initDb } from './db/index.js';
import trackRoutes from './routes/track.js';
import bookmarksRoutes from './routes/bookmarks.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json());

// Initialize database
const db = initDb(process.env.DB_PATH || './data/bookmarks.db');

// Inject db into request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/api', trackRoutes);
app.use('/api', bookmarksRoutes);
app.use('/api', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Collector running on port ${PORT}`);
});
