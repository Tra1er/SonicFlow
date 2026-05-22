/**
 * Vercel Serverless: POST /api/auth/refresh
 * Refresh an expired access token.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing required field: refresh_token' });
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.SPOTIFY_CLIENT_ID,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    console.error('[Auth Refresh]', err);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
}
