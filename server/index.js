/**
 * SonicFlow Express Server
 * 
 * Main entry point for the backend proxy/middleware server.
 * Handles Spotify OAuth, Spotify API proxying, Last.fm API proxying,
 * and audio preview URL scraping.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import spotifyRoutes from './routes/spotify.js';
import lastfmRoutes from './routes/lastfm.js';
import previewRoutes from './routes/preview.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies (used by some auth flows)
app.use(express.urlencoded({ extended: true }));

// CORS – allow requests from the Vite dev server
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/lastfm', lastfmRoutes);
app.use('/api/preview', previewRoutes);

// Health-check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[SonicFlow] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[SonicFlow] Server running on http://localhost:${PORT}`);
});

export default app;
