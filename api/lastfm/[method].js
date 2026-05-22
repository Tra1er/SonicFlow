/**
 * Vercel Serverless: GET /api/lastfm/[method]
 * Proxy requests to the Last.fm API.
 * 
 * Routes:
 * /api/lastfm/similar    → track.getSimilar
 * /api/lastfm/track-info → track.getInfo
 * /api/lastfm/artist-info → artist.getInfo
 * /api/lastfm/top-tags   → track.getTopTags
 */

const METHOD_MAP = {
  'similar': 'track.getSimilar',
  'track-info': 'track.getInfo',
  'artist-info': 'artist.getInfo',
  'top-tags': 'track.getTopTags',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { method: routeMethod } = req.query;
    const lfmMethod = METHOD_MAP[routeMethod];

    if (!lfmMethod) {
      return res.status(400).json({ error: `Unknown method: ${routeMethod}. Use: ${Object.keys(METHOD_MAP).join(', ')}` });
    }

    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', lfmMethod);
    url.searchParams.set('api_key', process.env.LASTFM_API_KEY);
    url.searchParams.set('format', 'json');

    // Forward query params (except 'method' which is the route param)
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'method') {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[Last.fm]', err);
    return res.status(500).json({ error: 'Last.fm request failed' });
  }
}
