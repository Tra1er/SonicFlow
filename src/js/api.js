/**
 * SonicFlow — API Client
 * Centralized API client for all backend endpoints.
 */

import { getAccessToken, logout } from './auth.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Make an authenticated API request */
async function request(path, options = {}) {
  const token = await getAccessToken();

  const config = {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.body);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let response = await fetch(url, config);

  // Auto-retry on 401 (token may have been refreshed)
  if (response.status === 401) {
    const newToken = await getAccessToken();
    if (newToken && newToken !== token) {
      config.headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, config);
    } else {
      logout();
      throw new Error('Authentication expired');
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `API error: ${response.status}`);
  }

  return response.json();
}

// --- Spotify endpoints ---

function getProfile() {
  return request('/api/spotify/me');
}

function getPlaylists(limit = 20, offset = 0) {
  return request(`/api/spotify/playlists?limit=${limit}&offset=${offset}`);
}

function getPlaylistTracks(id, limit = 100, offset = 0) {
  return request(`/api/spotify/playlists/${id}/items?limit=${limit}&offset=${offset}`);
}

function getTopItems(type, timeRange = 'medium_term', limit = 20) {
  return request(`/api/spotify/top/${type}?time_range=${timeRange}&limit=${limit}`);
}

function getRecentlyPlayed(limit = 50) {
  return request(`/api/spotify/recent?limit=${limit}`);
}

function search(query, type = 'track', limit = 10) {
  return request(`/api/spotify/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
}

function createPlaylist(name, description = '', isPublic = false) {
  return request('/api/spotify/playlists', {
    method: 'POST',
    body: { name, description, public: isPublic },
  });
}

function addTracksToPlaylist(playlistId, uris) {
  return request(`/api/spotify/playlists/${playlistId}/items`, {
    method: 'POST',
    body: { uris },
  });
}

// --- Last.fm endpoints ---

function getSimilarTracks(artist, track, limit = 20) {
  return request(`/api/lastfm/similar?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&limit=${limit}`);
}

function getTrackInfo(artist, track) {
  return request(`/api/lastfm/track-info?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
}

function getArtistInfo(artist) {
  return request(`/api/lastfm/artist-info?artist=${encodeURIComponent(artist)}`);
}

function getTopTags(artist, track) {
  return request(`/api/lastfm/top-tags?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
}

// --- Preview ---

function getPreviewUrl(trackId) {
  return request(`/api/preview/${trackId}`);
}

// --- Export all as default object ---

const api = {
  getProfile,
  getPlaylists,
  getPlaylistTracks,
  getTopItems,
  getRecentlyPlayed,
  search,
  createPlaylist,
  addTracksToPlaylist,
  getSimilarTracks,
  getTrackInfo,
  getArtistInfo,
  getTopTags,
  getPreviewUrl,
};

export default api;
