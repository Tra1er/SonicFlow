/**
 * Auth Routes – Spotify OAuth 2.0 (PKCE Flow)
 *
 * POST /api/auth/token   – Exchange authorization code for access + refresh tokens
 * POST /api/auth/refresh – Refresh an expired access token
 */

import { Router } from 'express';

const router = Router();

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// ---------------------------------------------------------------------------
// POST /api/auth/token
// Exchange an authorization code (+ PKCE code_verifier) for tokens.
// Body: { code, code_verifier, redirect_uri }
// ---------------------------------------------------------------------------
router.post('/token', async (req, res, next) => {
  try {
    const { code, code_verifier, redirect_uri } = req.body;

    if (!code || !code_verifier || !redirect_uri) {
      return res.status(400).json({
        error: 'Missing required fields: code, code_verifier, redirect_uri',
      });
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      code_verifier,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Auth] Token exchange failed:', data);
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// Refresh an access token using a refresh token.
// Body: { refresh_token }
// ---------------------------------------------------------------------------
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing required field: refresh_token',
      });
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.SPOTIFY_CLIENT_ID,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', data);
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
