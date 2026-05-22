/**
 * SonicFlow — Utility Functions
 */

/** Format milliseconds to "m:ss" */
export function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Relative time string: "2 hours ago", "just now" */
export function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now - d) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return d.toLocaleDateString();
}

/** Debounce a function */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Truncate a string */
export function truncate(str, len = 30) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

/** Generate a random ID */
export function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

/** Format large numbers: 1234567 → "1.2M" */
export function formatNumber(n) {
  if (!n) return '0';
  n = Number(n);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

/** Shuffle an array (Fisher-Yates) */
export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Get album art URL from a Spotify track object, with fallback */
export function getAlbumArt(track, size = 0) {
  const images = track?.album?.images || track?.images || [];
  if (images.length === 0) return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23161638" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236a6a8a" font-size="30">♪</text></svg>';
  // size: 0 = largest, 1 = medium, 2 = small
  return images[size]?.url || images[0]?.url;
}

/** Get artist name(s) from a Spotify track */
export function getArtistNames(track) {
  if (!track?.artists) return 'Unknown';
  return track.artists.map(a => a.name).join(', ');
}

/** Parse hash parameters: #/discovery?track=X&artist=Y → {track, artist} */
export function getHashParams() {
  const hash = window.location.hash;
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) return {};
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  const obj = {};
  for (const [key, value] of params) {
    obj[key] = decodeURIComponent(value);
  }
  return obj;
}

/** Build a hash URL with params */
export function buildHash(path, params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return `#${path}`;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `#${path}?${qs}`;
}

/** Classify a date into time groups */
export function getTimeGroup(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
}
