/**
 * Vercel Serverless: GET /api/spotify/[...path]
 * Proxy requests to the Spotify Web API.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });

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

    const url = new URL(`https://api.spotify.com/v1/${spotifyPath}`);

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
        const meRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: auth },
        });
        const me = await meRes.json();
        if (!meRes.ok) return res.status(meRes.status).json(me);

        const createRes = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        const createData = await createRes.json();
        return res.status(createRes.ok ? 200 : createRes.status).json(createData);
      }

      // Generic POST proxy
      const postRes = await fetch(url.toString(), {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const postData = await postRes.json();
      return res.status(postRes.ok ? 200 : postRes.status).json(postData);
    }

    // GET proxy
    const response = await fetch(url.toString(), {
      headers: { Authorization: auth },
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    console.error('[Spotify Proxy]', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}
