/**
 * SonicFlow — Discovery Page (Core Feature)
 */

import api from '../js/api.js';
import * as state from '../js/state.js';
import * as player from '../js/player.js';
import { createTrackCard } from '../components/trackcard.js';
import { renderSearchBar } from '../components/searchbar.js';
import { showToast } from '../components/toast.js';
import { icon } from '../js/icons.js';
import { getHashParams, getAlbumArt, buildHash } from '../js/utils.js';
import { navigate } from '../js/router.js';

export async function render(container) {
  const params = getHashParams();

  // If no seed track, show search interface
  if (!params.track || !params.artist) {
    renderSearchMode(container);
    return;
  }

  // We have a seed track — show discovery results
  renderDiscoveryMode(container, params);
}

function renderSearchMode(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="discovery-search">
        <h1 class="section-title">Discover New Music</h1>
        <p>Search for a song to find similar tracks you'll love</p>
        <div id="discovery-search-bar" style="margin-top:var(--space-6)"></div>
      </div>
    </div>
  `;

  renderSearchBar(container.querySelector('#discovery-search-bar'), {
    placeholder: 'Search for a song to start discovering...',
    onSelect: (track) => {
      const hash = buildHash('/discovery', {
        track: track.name,
        artist: track.artists?.[0]?.name,
        id: track.id,
        image: getAlbumArt(track, 1),
      });
      navigate(hash);
    },
  });
}

async function renderDiscoveryMode(container, params) {
  const { track, artist, id, image } = params;

  container.innerHTML = `
    <div class="page-enter">
      <div class="discovery-seed">
        <div class="discovery-seed-art">
          <img src="${image || ''}" alt="${track}" onerror="this.style.display='none'">
        </div>
        <div class="discovery-seed-info">
          <p style="font-size:var(--font-size-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-2)">Finding tracks similar to</p>
          <h2>${track}</h2>
          <p>${artist}</p>
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" id="seed-play">${icon('play', 14)} Preview</button>
            <button class="btn btn-secondary btn-sm" id="seed-dna">${icon('dna', 14)} Track DNA</button>
          </div>
        </div>
      </div>

      <div class="discovery-controls">
        <button class="btn btn-primary" id="add-all-queue">${icon('plus', 16)} Add All to Queue</button>
        <button class="btn btn-ghost" id="back-search">${icon('search', 16)} New Search</button>
      </div>

      <div class="section-header">
        <h2 class="section-title">Similar Tracks</h2>
      </div>

      <div class="discovery-results" id="discovery-results">
        ${Array(6).fill(`
          <div class="skeleton" style="height:70px;border-radius:var(--radius-md)"></div>
        `).join('')}
      </div>
    </div>
  `;

  // Seed track play button
  container.querySelector('#seed-play').addEventListener('click', () => {
    if (id) player.setTrack({ id, name: track, artists: [{ name: artist }], album: { images: [{ url: image }] } });
  });

  // Track DNA button
  container.querySelector('#seed-dna').addEventListener('click', () => {
    navigate(buildHash('/trackdna', { track, artist, id, image }));
  });

  // Back to search
  container.querySelector('#back-search').addEventListener('click', () => {
    navigate('/discovery');
  });

  // Load similar tracks
  let discoveredTracks = [];
  const resultsEl = document.getElementById('discovery-results');
  if (!resultsEl) return;

  try {
    let success = false;
    if (id) {
      try {
        console.log(`[Discovery] Fetching audio features for seed track: ${id}`);
        const features = await api.getAudioFeatures(id);
        console.log('[Discovery] Audio features received:', features);
        
        // Fetch recommendations from Spotify targeting these features (omitting strict tempo/instrumentalness to prevent empty results)
        const recParams = {
          seed_tracks: id,
          limit: 20
        };
        if (features) {
          if (features.danceability !== undefined && features.danceability !== null) recParams.target_danceability = features.danceability;
          if (features.energy !== undefined && features.energy !== null) recParams.target_energy = features.energy;
          if (features.valence !== undefined && features.valence !== null) recParams.target_valence = features.valence;
          if (features.acousticness !== undefined && features.acousticness !== null) recParams.target_acousticness = features.acousticness;
        }

        const recData = await api.getRecommendations(recParams);
        discoveredTracks = recData.tracks || [];
        
        // Only set success = true if we actually got recommendations, otherwise fall back to Last.fm
        if (discoveredTracks.length > 0) {
          success = true;
        } else {
          console.log('[Discovery] Spotify Recommendations returned 0 results, falling back to Last.fm');
        }
      } catch (err) {
        console.warn('[Discovery] Spotify Recommendations based on audio features failed, falling back to Last.fm:', err);
      }
    }

    if (success) {
      resultsEl.innerHTML = '';
      if (discoveredTracks.length === 0) {
        resultsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">No similar tracks found</h3>
            <p class="empty-state-text">Try a different song or check the spelling.</p>
          </div>
        `;
        return;
      }

      discoveredTracks.forEach(t => {
        t._match = 0.9; // Direct recommendation match score
        resultsEl.appendChild(createTrackCard(t, { match: t._match, large: true }));
      });
    } else {
      let similarTracks = [];
      try {
        const data = await api.getSimilarTracks(artist, track, 20);
        similarTracks = data.similartracks?.track || [];
      } catch (err) {
        console.warn('[Discovery] Last.fm similar tracks failed:', err);
      }

      if (similarTracks.length === 0) {
        resultsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3 class="empty-state-title">No similar tracks found</h3>
            <p class="empty-state-text">Try a different song or check the spelling.</p>
          </div>
        `;
        return;
      }

      resultsEl.innerHTML = '';

      // Enrich each similar track with Spotify data
      const enrichPromises = similarTracks.map(async (st) => {
        try {
          const searchQuery = `${st.name} ${st.artist?.name || ''}`;
          const result = await api.search(searchQuery, 'track', 1);
          const found = result.tracks?.items?.[0];
          if (found) {
            found._match = parseFloat(st.match) || 0;
            return found;
          }
        } catch { /* skip */ }
        return null;
      });

      const enrichedResults = await Promise.all(enrichPromises);
      discoveredTracks = enrichedResults.filter(Boolean);

      const finalResultsEl = document.getElementById('discovery-results');
      if (finalResultsEl) {
        // Sort by match score
        discoveredTracks.sort((a, b) => (b._match || 0) - (a._match || 0));

        discoveredTracks.forEach(t => {
          finalResultsEl.appendChild(createTrackCard(t, { match: t._match, large: true }));
        });

        if (discoveredTracks.length === 0) {
          finalResultsEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:var(--space-8)">Could not find these tracks on Spotify. Try a different seed track.</p>';
        }
      }
    }
  } catch (err) {
    const errResultsEl = document.getElementById('discovery-results');
    if (errResultsEl) {
      errResultsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3 class="empty-state-title">Discovery Failed</h3>
          <p class="empty-state-text">${err.message}</p>
        </div>
      `;
    }
  }

  // Add all to queue
  container.querySelector('#add-all-queue').addEventListener('click', () => {
    let added = 0;
    discoveredTracks.forEach(t => {
      if (state.addToQueue(t)) added++;
    });
    showToast(`Added ${added} tracks to queue`, 'success');
  });
}
