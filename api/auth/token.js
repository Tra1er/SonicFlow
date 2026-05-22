/**
 * Vercel Serverless: POST /api/auth/token
 * Exchange authorization code for tokens (PKCE flow).
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, code_verifier, redirect_uri } = req.body;
    if (!code || !code_verifier || !redirect_uri) {
      return res.status(400).json({ error: 'Missing required fields: code, code_verifier, redirect_uri' });
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      code_verifier,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    console.error('[Auth Token]', err);
    return res.status(500).json({ error: 'Token exchange failed' });
  }
}
