/**
 * SonicFlow — Spotify PKCE Authentication
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = window.location.origin + '/callback';
const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-top-read',
  'user-read-recently-played',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

const API_BASE = import.meta.env.VITE_API_URL || '';

// --- PKCE Helpers ---

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Public API ---

/** Start the Spotify login flow */
export async function login() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64urlEncode(await sha256(codeVerifier));

  // Store verifier for callback
  localStorage.setItem('sonicflow_code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: SCOPES,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

/** Handle the OAuth callback — exchange code for tokens */
export async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    console.error('[Auth] OAuth error:', error);
    return false;
  }

  if (!code) return false;

  const codeVerifier = localStorage.getItem('sonicflow_code_verifier');
  if (!codeVerifier) {
    console.error('[Auth] No code verifier found');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Auth] Token exchange failed:', data);
      return false;
    }

    storeTokens(data);
    localStorage.removeItem('sonicflow_code_verifier');

    // Clean URL
    window.history.replaceState({}, '', '/');

    return true;
  } catch (err) {
    console.error('[Auth] Token exchange error:', err);
    return false;
  }
}

/** Get the current access token (auto-refreshes if expired) */
export async function getAccessToken() {
  const expiry = localStorage.getItem('sonicflow_token_expiry');
  const token = localStorage.getItem('sonicflow_access_token');

  if (!token) return null;

  // Refresh if expiring within 5 minutes
  if (expiry && Date.now() > Number(expiry) - 5 * 60 * 1000) {
    const refreshed = await refreshToken();
    if (!refreshed) return null;
    return localStorage.getItem('sonicflow_access_token');
  }

  return token;
}

/** Check if user is authenticated */
export function isAuthenticated() {
  return !!localStorage.getItem('sonicflow_access_token');
}

/** Logout — clear all tokens */
export function logout() {
  localStorage.removeItem('sonicflow_access_token');
  localStorage.removeItem('sonicflow_refresh_token');
  localStorage.removeItem('sonicflow_token_expiry');
  localStorage.removeItem('sonicflow_code_verifier');
  window.location.href = '/';
}

// --- Internal ---

function storeTokens(data) {
  localStorage.setItem('sonicflow_access_token', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('sonicflow_refresh_token', data.refresh_token);
  }
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem('sonicflow_token_expiry', expiresAt.toString());
}

async function refreshToken() {
  const refreshTok = localStorage.getItem('sonicflow_refresh_token');
  if (!refreshTok) return false;

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTok }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', data);
      logout();
      return false;
    }

    storeTokens(data);
    return true;
  } catch (err) {
    console.error('[Auth] Token refresh error:', err);
    return false;
  }
}
