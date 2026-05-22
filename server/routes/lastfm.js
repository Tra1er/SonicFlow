/**
 * Last.fm API Proxy Routes
 *
 * Proxies requests to the Last.fm API, injecting the API key server-side
 * so it's never exposed to the client.
 */

import { Router } from 'express';

const router = Router();
const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/';

/**
 * Helper: make a Last.fm API request.
 */
async function lastfmRequest(method, params, res) {
  try {
    const url = new URL(LASTFM_API);
    url.searchParams.set('method', method);
    url.searchParams.set('api_key', process.env.LASTFM_API_KEY);
    url.searchParams.set('format', 'json');

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      console.error(`[Last.fm] ${method} error:`, data.message);
      return res.status(400).json(data);
    }

    return res.json(data);
  } catch (err) {
    console.error(`[Last.fm] ${method} request failed:`, err.message);
    return res.status(500).json({ error: 'Last.fm request failed' });
  }
}

// GET /api/lastfm/similar — Get similar tracks
// Query: artist, track, limit
router.get('/similar', (req, res) => {
  const { artist, track, limit } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: 'Missing artist or track parameter' });
  }
  return lastfmRequest('track.getSimilar', { artist, track, limit: limit || 20 }, res);
});

// GET /api/lastfm/track-info — Get track info (tags, play count, etc.)
// Query: artist, track
router.get('/track-info', (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: 'Missing artist or track parameter' });
  }
  return lastfmRequest('track.getInfo', { artist, track }, res);
});

// GET /api/lastfm/artist-info — Get artist info (bio, tags, similar artists)
// Query: artist
router.get('/artist-info', (req, res) => {
  const { artist } = req.query;
  if (!artist) {
    return res.status(400).json({ error: 'Missing artist parameter' });
  }
  return lastfmRequest('artist.getInfo', { artist }, res);
});

// GET /api/lastfm/top-tags — Get top tags for a track
// Query: artist, track
router.get('/top-tags', (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: 'Missing artist or track parameter' });
  }
  return lastfmRequest('track.getTopTags', { artist, track }, res);
});

export default router;
