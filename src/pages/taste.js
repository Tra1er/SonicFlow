/**
 * SonicFlow — Taste Profile Page
 */

import api from '../js/api.js';
import { createTrackCard } from '../components/trackcard.js';
import { getAlbumArt, getArtistNames } from '../js/utils.js';
import * as player from '../js/player.js';

const TIME_RANGES = [
  { key: 'short_term', label: 'Last 4 Weeks' },
  { key: 'medium_term', label: 'Last 6 Months' },
  { key: 'long_term', label: 'All Time' },
];

let activeRange = 'medium_term';

export async function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="section-header">
        <div>
          <h1 class="section-title">Your Taste Profile</h1>
          <p class="section-subtitle">Explore your listening habits and top music</p>
        </div>
      </div>

      <div class="tabs" id="taste-tabs">
        ${TIME_RANGES.map(r => `
          <button class="tab ${r.key === activeRange ? 'active' : ''}" data-range="${r.key}">${r.label}</button>
        `).join('')}
      </div>

      <div id="taste-content">
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
          ${Array(5).fill('<div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>').join('')}
        </div>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelector('#taste-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    activeRange = tab.dataset.range;
    container.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.range === activeRange));
    loadTasteData();
  });

  loadTasteData();
}

async function loadTasteData() {
  const content = document.getElementById('taste-content');
  if (!content) return;

  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      ${Array(5).fill('<div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>').join('')}
    </div>
  `;

  try {
    const [tracksData, artistsData] = await Promise.all([
      api.getTopItems('tracks', activeRange, 20),
      api.getTopItems('artists', activeRange, 20),
    ]);

    const tracks = tracksData.items || [];
    const artists = artistsData.items || [];

    // Aggregate genres
    const genreMap = {};
    artists.forEach(a => {
      (a.genres || []).forEach(g => {
        genreMap[g] = (genreMap[g] || 0) + 1;
      });
    });
    const genres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]);

    content.innerHTML = `
      <!-- Top Tracks -->
      <div class="taste-section animate-slide-up">
        <div class="section-header">
          <h2 class="section-title">Top Tracks</h2>
        </div>
        <div class="taste-top-tracks" id="taste-tracks">
          ${tracks.map((t, i) => `
            <div class="taste-track-row" data-track-index="${i}">
              <span class="taste-track-rank ${i < 3 ? 'top-3' : ''}">${i + 1}</span>
              <div class="track-card-art">
                <img src="${getAlbumArt(t, 2)}" alt="${t.name}" loading="lazy">
              </div>
              <div class="track-card-info">
                <div class="track-card-name">${t.name}</div>
                <div class="track-card-artist">${getArtistNames(t)}</div>
              </div>
              <span class="track-card-duration" style="opacity:0.5">${t.album?.name || ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Top Artists -->
      <div class="taste-section animate-slide-up" style="animation-delay:0.1s">
        <div class="section-header">
          <h2 class="section-title">Top Artists</h2>
        </div>
        <div class="taste-artists-grid">
          ${artists.slice(0, 12).map(a => `
            <div class="taste-artist-card">
              <div class="taste-artist-img">
                <img src="${a.images?.[1]?.url || a.images?.[0]?.url || ''}" alt="${a.name}" loading="lazy">
              </div>
              <div class="taste-artist-name">${a.name}</div>
              <div class="taste-artist-genres">${(a.genres || []).slice(0, 2).join(', ')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Genre Cloud -->
      ${genres.length > 0 ? `
        <div class="taste-section animate-slide-up" style="animation-delay:0.2s">
          <div class="section-header">
            <h2 class="section-title">Genre Cloud</h2>
          </div>
          <div class="genre-cloud">
            ${genres.slice(0, 30).map(([genre, count], i) => {
              const maxCount = genres[0][1];
              const ratio = count / maxCount;
              const size = 0.7 + ratio * 1.0;
              const hue = (i * 37) % 360;
              const lightness = 55 + (1 - ratio) * 20;
              const opacity = 0.5 + ratio * 0.5;
              const delay = (i * 0.3) % 4;
              return `<span class="genre-bubble" style="
                font-size:${size}rem;
                color:hsl(${hue}, 70%, ${lightness}%);
                background:hsla(${hue}, 70%, ${lightness}%, 0.1);
                border-color:hsla(${hue}, 70%, ${lightness}%, 0.2);
                opacity:${opacity};
                animation-delay:${delay}s;
              ">${genre}</span>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Click on track row to play
    const trackRows = content.querySelectorAll('.taste-track-row');
    trackRows.forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.trackIndex);
        if (tracks[idx]) player.setTrack(tracks[idx]);
      });
    });

  } catch (err) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Failed to load taste data</h3>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }
}
