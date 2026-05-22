/**
 * SonicFlow — Search Bar Component
 */

import { icon } from '../js/icons.js';
import api from '../js/api.js';
import { debounce, getAlbumArt, getArtistNames } from '../js/utils.js';
import * as player from '../js/player.js';

/**
 * Render a search bar into a container.
 */
export function renderSearchBar(container, options = {}) {
  const { placeholder = 'Search for a song...', onSelect } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-container';
  wrapper.innerHTML = `
    <div class="input-group">
      <span class="input-icon">${icon('search')}</span>
      <input type="text" class="input input-with-icon" placeholder="${placeholder}" id="search-input">
    </div>
    <div class="search-results-dropdown" id="search-dropdown" style="display:none"></div>
  `;

  container.appendChild(wrapper);

  const input = wrapper.querySelector('#search-input');
  const dropdown = wrapper.querySelector('#search-dropdown');

  const doSearch = debounce(async (query) => {
    if (!query || query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    try {
      const data = await api.search(query, 'track', 6);
      const tracks = data.tracks?.items || [];

      if (tracks.length === 0) {
        dropdown.innerHTML = '<div style="padding: var(--space-4); color: var(--text-tertiary); text-align: center;">No results found</div>';
        dropdown.style.display = '';
        return;
      }

      dropdown.innerHTML = tracks.map(track => `
        <div class="track-card" data-track-id="${track.id}">
          <div class="track-card-art">
            <img src="${getAlbumArt(track, 2)}" alt="${track.name}" loading="lazy">
          </div>
          <div class="track-card-info">
            <div class="track-card-name">${track.name}</div>
            <div class="track-card-artist">${getArtistNames(track)}</div>
          </div>
        </div>
      `).join('');

      dropdown.style.display = '';

      // Store track data for click handling
      dropdown._tracks = tracks;
    } catch (err) {
      console.error('[Search] Error:', err);
      dropdown.style.display = 'none';
    }
  }, 300);

  input.addEventListener('input', () => doSearch(input.value.trim()));

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && dropdown.innerHTML) {
      dropdown.style.display = '';
    }
  });

  // Click on result
  dropdown.addEventListener('click', (e) => {
    const card = e.target.closest('.track-card');
    if (!card) return;

    const trackId = card.dataset.trackId;
    const track = dropdown._tracks?.find(t => t.id === trackId);
    if (!track) return;

    if (onSelect) {
      onSelect(track);
    } else {
      player.setTrack(track);
    }

    input.value = '';
    dropdown.style.display = 'none';
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  return { input, wrapper };
}
