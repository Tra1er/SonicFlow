/**
 * SonicFlow — Playlists Page
 */

import api from '../js/api.js';
import { createPlaylistCard } from '../components/playlistcard.js';
import { createTrackCard } from '../components/trackcard.js';
import { debounce, formatDuration } from '../js/utils.js';
import { icon } from '../js/icons.js';

let allPlaylists = [];
let offset = 0;
let total = 0;
let expandedPlaylistId = null;

export async function render(container) {
  allPlaylists = [];
  offset = 0;
  total = 0;
  expandedPlaylistId = null;

  container.innerHTML = `
    <div class="page-enter">
      <div class="section-header">
        <div>
          <h1 class="section-title">Your Playlists</h1>
          <p class="section-subtitle">Browse your playlists and discover similar tracks</p>
        </div>
      </div>

      <div class="playlists-filter">
        <div class="input-group">
          <span class="input-icon">${icon('search')}</span>
          <input type="text" class="input input-with-icon" placeholder="Filter playlists..." id="playlist-filter">
        </div>
      </div>

      <div class="playlists-grid" id="playlists-grid">
        ${Array(8).fill('<div class="skeleton-card"></div>').join('')}
      </div>

      <div style="text-align:center;margin-top:var(--space-6)" id="load-more-wrap" style="display:none">
        <button class="btn btn-secondary" id="load-more-btn">Load More</button>
      </div>
    </div>
  `;

  // Filter
  const filterInput = container.querySelector('#playlist-filter');
  filterInput.addEventListener('input', debounce(() => {
    renderGrid(filterInput.value.trim().toLowerCase());
  }, 200));

  // Load more button
  container.querySelector('#load-more-btn').addEventListener('click', () => loadMore());

  // Initial load
  await loadMore();
}

async function loadMore() {
  try {
    const data = await api.getPlaylists(20, offset);
    total = data.total || 0;
    const items = data.items || [];
    allPlaylists.push(...items);
    offset += items.length;

    renderGrid('');

    const loadMoreWrap = document.getElementById('load-more-wrap');
    if (loadMoreWrap) {
      loadMoreWrap.style.display = offset >= total ? 'none' : '';
    }
  } catch (err) {
    console.error('[Playlists] Load error:', err);
  }
}

function renderGrid(filter) {
  const grid = document.getElementById('playlists-grid');
  if (!grid) return;

  const filtered = filter
    ? allPlaylists.filter(p => p.name.toLowerCase().includes(filter))
    : allPlaylists;

  grid.innerHTML = '';

  filtered.forEach(playlist => {
    const card = createPlaylistCard(playlist, (pl) => toggleExpand(pl));
    grid.appendChild(card);

    // If this playlist is expanded, show tracks after it
    if (playlist.id === expandedPlaylistId) {
      const expanded = document.createElement('div');
      expanded.className = 'playlist-tracks-expanded';
      expanded.id = 'playlist-expanded';
      expanded.innerHTML = `
        <div class="playlist-tracks-header">
          <h3>${playlist.name} — Tracks</h3>
          <button class="btn btn-ghost btn-sm" id="close-expanded">${icon('x', 16)} Close</button>
        </div>
        <div class="playlist-tracks-list" id="playlist-tracks-list">
          <div style="text-align:center;padding:var(--space-8)"><div class="spinner" style="margin:0 auto"></div></div>
        </div>
      `;
      grid.appendChild(expanded);

      expanded.querySelector('#close-expanded').addEventListener('click', () => {
        expandedPlaylistId = null;
        renderGrid(filter);
      });

      // Load tracks
      loadPlaylistTracks(playlist.id);
    }
  });
}

async function toggleExpand(playlist) {
  if (expandedPlaylistId === playlist.id) {
    expandedPlaylistId = null;
  } else {
    expandedPlaylistId = playlist.id;
  }
  const filterInput = document.getElementById('playlist-filter');
  renderGrid(filterInput?.value?.trim().toLowerCase() || '');
}

async function loadPlaylistTracks(playlistId) {
  const listEl = document.getElementById('playlist-tracks-list');
  if (!listEl) return;

  try {
    const data = await api.getPlaylistTracks(playlistId);
    const items = data.items || [];

    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-tertiary);padding:var(--space-4)">No tracks in this playlist.</p>';
      return;
    }

    items.forEach(item => {
      if (item.track && item.track.id) {
        listEl.appendChild(createTrackCard(item.track, { showActions: true }));
      }
    });
  } catch (err) {
    listEl.innerHTML = `<p style="color:var(--color-error);padding:var(--space-4)">Failed to load tracks: ${err.message}</p>`;
  }
}
