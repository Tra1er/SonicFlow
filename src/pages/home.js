/**
 * SonicFlow — Home / Dashboard Page
 */

import api from '../js/api.js';
import * as state from '../js/state.js';
import * as player from '../js/player.js';
import { createTrackCard } from '../components/trackcard.js';
import { formatNumber } from '../js/utils.js';
import { navigate } from '../js/router.js';
import { buildHash } from '../js/utils.js';

export async function render(container) {
  const user = state.getState('user');

  // Skeleton loading
  container.innerHTML = `
    <div class="page-home page-enter">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>

      <div class="home-welcome">
        <div class="home-avatar">
          ${user?.images?.[0]?.url
            ? `<img src="${user.images[0].url}" alt="${user.display_name}">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--gradient-primary);font-size:1.5rem;font-weight:700;color:white;">${(user?.display_name || 'U')[0]}</div>`
          }
        </div>
        <div class="home-greeting">
          <h1>${getGreeting()}, <span class="text-gradient">${user?.display_name || 'there'}</span></h1>
          <p>Ready to discover something new?</p>
        </div>
      </div>

      <div class="home-stats" id="home-stats">
        <div class="stat-card skeleton-card"></div>
        <div class="stat-card skeleton-card"></div>
        <div class="stat-card skeleton-card"></div>
      </div>

      <div class="home-quick-discover">
        <div class="section-header">
          <div>
            <h2 class="section-title">Quick Discovery</h2>
            <p class="section-subtitle">Songs you might like based on your recent listening</p>
          </div>
        </div>
        <div id="home-discover-content">
          <div style="display:flex;gap:var(--space-2);flex-direction:column">
            <div class="skeleton" style="height:60px;border-radius:var(--radius-md)"></div>
            <div class="skeleton" style="height:60px;border-radius:var(--radius-md)"></div>
            <div class="skeleton" style="height:60px;border-radius:var(--radius-md)"></div>
          </div>
        </div>
      </div>

      <div class="home-recent">
        <div class="section-header">
          <div>
            <h2 class="section-title">Recently Played</h2>
            <p class="section-subtitle">Your latest tracks</p>
          </div>
          <button class="btn btn-ghost" onclick="window.location.hash='#/recent'">See All →</button>
        </div>
        <div id="home-recent-content">
          <div style="display:flex;gap:var(--space-2);flex-direction:column">
            <div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>
            <div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>
            <div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>
            <div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>
            <div class="skeleton" style="height:56px;border-radius:var(--radius-md)"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load data in parallel
  try {
    const [playlistsData, recentData] = await Promise.all([
      api.getPlaylists(50, 0),
      api.getRecentlyPlayed(20),
    ]);

    // Stats
    const statsEl = document.getElementById('home-stats');
    if (!statsEl) return;

    const totalPlaylists = playlistsData.total || 0;
    const recentItems = recentData.items || [];
    const uniqueArtists = new Set(recentItems.flatMap(i => i.track?.artists?.map(a => a.name) || [])).size;

    statsEl.innerHTML = `
      <div class="stat-card animate-slide-up" style="animation-delay:0.1s">
        <div class="stat-card-value text-gradient">${totalPlaylists}</div>
        <div class="stat-card-label">Playlists</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.15s">
        <div class="stat-card-value text-gradient">${uniqueArtists}</div>
        <div class="stat-card-label">Recent Artists</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.2s">
        <div class="stat-card-value text-gradient">${state.getQueue().length}</div>
        <div class="stat-card-label">In Queue</div>
      </div>
    `;

    // Recently played
    const recentEl = document.getElementById('home-recent-content');
    if (!recentEl) return;
    recentEl.innerHTML = '';
    const recentTracks = recentItems.slice(0, 5);
    recentTracks.forEach(item => {
      if (item.track) {
        recentEl.appendChild(createTrackCard(item.track));
      }
    });

    // Quick Discovery — pick a random recent track and find similar
    const discoverEl = document.getElementById('home-discover-content');
    if (!discoverEl) return;

    if (recentItems.length > 0) {
      const randomItem = recentItems[Math.floor(Math.random() * Math.min(recentItems.length, 10))];
      const seedTrack = randomItem.track;

      if (seedTrack) {
        try {
          const artistName = seedTrack.artists?.[0]?.name;
          const similar = await api.getSimilarTracks(artistName, seedTrack.name, 5);
          const similarTracks = similar.similartracks?.track || [];

          const freshDiscoverEl = document.getElementById('home-discover-content');
          if (!freshDiscoverEl) return;

          if (similarTracks.length > 0) {
            freshDiscoverEl.innerHTML = `<p style="font-size:var(--font-size-sm);color:var(--text-tertiary);margin-bottom:var(--space-3)">Because you listened to <strong style="color:var(--text-primary)">${seedTrack.name}</strong></p>`;

            // Search Spotify for each similar track to get full data
            const enriched = await Promise.all(
              similarTracks.slice(0, 3).map(async (st) => {
                try {
                  const result = await api.search(`${st.name} ${st.artist.name}`, 'track', 1);
                  const found = result.tracks?.items?.[0];
                  if (found) return { ...found, _match: parseFloat(st.match) || 0 };
                } catch { /* skip */ }
                return null;
              })
            );

            const finalDiscoverEl = document.getElementById('home-discover-content');
            if (!finalDiscoverEl) return;

            enriched.filter(Boolean).forEach(track => {
              finalDiscoverEl.appendChild(createTrackCard(track, { match: track._match, large: true }));
            });
          } else {
            freshDiscoverEl.innerHTML = '<p style="color:var(--text-tertiary)">No similar tracks found. Try exploring your playlists!</p>';
          }
        } catch {
          const errDiscoverEl = document.getElementById('home-discover-content');
          if (errDiscoverEl) {
            errDiscoverEl.innerHTML = '<p style="color:var(--text-tertiary)">Explore your playlists to discover new music!</p>';
          }
        }
      }
    }
  } catch (err) {
    console.error('[Home] Load error:', err);
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
