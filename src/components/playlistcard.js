/**
 * SonicFlow — Playlist Card Component
 */

/**
 * Create a playlist card DOM element.
 * @param {object} playlist - Spotify playlist object
 * @param {function} onClick - Click handler
 * @returns {HTMLElement}
 */
export function createPlaylistCard(playlist, onClick) {
  const el = document.createElement('div');
  el.className = 'playlist-card';
  el.dataset.playlistId = playlist.id;

  const artUrl = playlist.images?.[0]?.url ||
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23161638" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236a6a8a" font-size="30">♪</text></svg>';

  const trackCount = playlist.tracks?.total || 0;
  const owner = playlist.owner?.display_name || '';

  el.innerHTML = `
    <div class="playlist-card-art">
      <img src="${artUrl}" alt="${playlist.name}" loading="lazy">
    </div>
    <div class="playlist-card-body">
      <div class="playlist-card-name" title="${playlist.name}">${playlist.name}</div>
      <div class="playlist-card-meta">${trackCount} tracks${owner ? ` • ${owner}` : ''}</div>
    </div>
  `;

  if (onClick) {
    el.addEventListener('click', () => onClick(playlist));
  }

  return el;
}
