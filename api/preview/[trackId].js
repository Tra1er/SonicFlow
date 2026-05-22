/**
 * Vercel Serverless: GET /api/preview/[trackId]
 * Scrape audio preview URL from Spotify Embed Player.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { trackId } = req.query;

  if (!trackId || trackId.length < 10) {
    return res.status(400).json({ error: 'Invalid track ID', url: null });
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(200).json({ url: null });
    }

    const html = await response.text();

    // Extract audio preview URL from embedded JSON
    const regex = /"audioPreview":\{"url":"(https:\/\/[^"]+)"\}/;
    const match = html.match(regex);
    const url = match ? match[1] : null;

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ url });
  } catch (err) {
    console.error(`[Preview] Error for ${trackId}:`, err.message);
    return res.status(200).json({ url: null });
  }
}
