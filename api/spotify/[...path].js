/**
 * Vercel Serverless: GET /api/spotify/[...path]
 * Proxy requests to the Spotify Web API.
 */

async function safeFetchAndParse(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    cache: 'no-store'
  });
  
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { error: 'Non-JSON response', body: text };
  }
  
  return { status: res.status, ok: res.ok, data };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

  let url = null;
  try {
    // Get the path segments using Vercel's route param (which is extremely robust)
    let spotifyPath = '';
    if (req.query && req.query.path) {
      if (Array.isArray(req.query.path)) {
        spotifyPath = req.query.path.join('/');
      } else {
        spotifyPath = req.query.path;
      }
    }

    // Fallback in case req.query.path is somehow not set
    if (!spotifyPath) {
      const parsedUrl = new URL(req.url, 'http://localhost');
      let cleanPath = parsedUrl.pathname.replace(/^\/api\/spotify/, '');
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }
      spotifyPath = cleanPath;
    }

    // If still empty or if it got matched as the placeholder literal
    if (!spotifyPath || spotifyPath === '[...path]') {
      return res.status(400).json({ error: 'No Spotify API path specified' });
    }

    // 'playlists/:id/tracks' → 'playlists/:id/items' (both GET and POST compatibility)
    const playlistTracksRegex = /^playlists\/([^/]+)\/tracks$/;
    if (playlistTracksRegex.test(spotifyPath)) {
      spotifyPath = spotifyPath.replace(playlistTracksRegex, 'playlists/$1/items');
    }

    // Special routing: 'top/tracks' → 'me/top/tracks', 'top/artists' → 'me/top/artists'
    if (spotifyPath.startsWith('top/')) {
      spotifyPath = `me/top/${spotifyPath.slice(4)}`;
    }
    // 'playlists' → 'me/playlists' (when GET and no sub-path)
    if (spotifyPath === 'playlists' && req.method === 'GET') {
      spotifyPath = 'me/playlists';
    }
    // 'recent' → 'me/player/recently-played'
    if (spotifyPath === 'recent') {
      spotifyPath = 'me/player/recently-played';
    }

    url = new URL(`https://api.spotify.com/v1/${spotifyPath}`);

    // Forward query params directly from req.url to avoid duplicates/array conversions
    const parsedUrl = new URL(req.url, 'http://localhost');
    parsedUrl.searchParams.forEach((value, key) => {
      if (key !== 'path') {
        url.searchParams.set(key, value);
      }
    });

    // Handle POST (create playlist, add tracks)
    if (req.method === 'POST') {
      // For creating a playlist, we need the user ID
      if (spotifyPath === 'playlists' || spotifyPath === 'me/playlists') {
        // First get user ID
        const meRes = await safeFetchAndParse('https://api.spotify.com/v1/me', {
          headers: { Authorization: auth },
        });
        if (!meRes.ok) return res.status(meRes.status).json(meRes.data);

        const createRes = await safeFetchAndParse(`https://api.spotify.com/v1/users/${meRes.data.id}/playlists`, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        return res.status(createRes.status).json(createRes.data);
      }

      // Generic POST proxy
      const postRes = await safeFetchAndParse(url.toString(), {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      return res.status(postRes.status).json(postRes.data);
    }

    // GET proxy
    const getRes = await safeFetchAndParse(url.toString(), {
      headers: { Authorization: auth },
    });
    return res.status(getRes.status).json(getRes.data);
  } catch (err) {
    console.error('[Spotify Proxy]', err);
    return res.status(500).json({ 
      error: 'Proxy request failed',
      message: err.message,
      attemptedUrl: url ? url.toString() : 'unknown'
    });
  }
}

