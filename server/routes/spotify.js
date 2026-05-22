/**
 * Spotify API Proxy Routes
 *
 * Proxies requests to the Spotify Web API, forwarding the Authorization
 * header from the client. This keeps the flow simple — the client manages
 * its own access token and sends it with every request.
 */

import { Router } from 'express';

const router = Router();
const SPOTIFY_API = 'https://api.spotify.com/v1';

/**
 * Helper: proxy a GET request to Spotify.
 */
async function proxyGet(spotifyPath, req, res) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const url = new URL(`${SPOTIFY_API}${spotifyPath}`);
    // Forward query parameters
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: auth },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error(`[Spotify Proxy] GET ${spotifyPath} error:`, err.message);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}

/**
 * Helper: proxy a POST request to Spotify.
 */
async function proxyPost(spotifyPath, req, res) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const response = await fetch(`${SPOTIFY_API}${spotifyPath}`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error(`[Spotify Proxy] POST ${spotifyPath} error:`, err.message);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}

// GET /api/spotify/me — Current user profile
router.get('/me', (req, res) => proxyGet('/me', req, res));

// GET /api/spotify/playlists — Current user's playlists
router.get('/playlists', (req, res) => proxyGet('/me/playlists', req, res));

// GET /api/spotify/playlists/:id/tracks — Tracks in a specific playlist
router.get('/playlists/:id/tracks', (req, res) =>
  proxyGet(`/playlists/${req.params.id}/items`, req, res)
);

// GET /api/spotify/playlists/:id/items — Tracks in a specific playlist
router.get('/playlists/:id/items', (req, res) =>
  proxyGet(`/playlists/${req.params.id}/items`, req, res)
);

// GET /api/spotify/top/:type — User's top tracks or artists
router.get('/top/:type', (req, res) =>
  proxyGet(`/me/top/${req.params.type}`, req, res)
);

// GET /api/spotify/recent — Recently played tracks
router.get('/recent', (req, res) =>
  proxyGet('/me/player/recently-played', req, res)
);

// GET /api/spotify/search — Search Spotify
router.get('/search', (req, res) => proxyGet('/search', req, res));

// POST /api/spotify/playlists — Create a new playlist for the current user
router.post('/playlists', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // First get the current user's ID
    const meRes = await fetch(`${SPOTIFY_API}/me`, {
      headers: { Authorization: auth },
    });
    const me = await meRes.json();
    if (!meRes.ok) return res.status(meRes.status).json(me);

    return proxyPost(`/users/${me.id}/playlists`, req, res);
  } catch (err) {
    console.error('[Spotify Proxy] Create playlist error:', err.message);
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// POST /api/spotify/playlists/:id/tracks — Add tracks to a playlist
router.post('/playlists/:id/tracks', (req, res) =>
  proxyPost(`/playlists/${req.params.id}/items`, req, res)
);

// POST /api/spotify/playlists/:id/items — Add tracks to a playlist
router.post('/playlists/:id/items', (req, res) =>
  proxyPost(`/playlists/${req.params.id}/items`, req, res)
);

export default router;
