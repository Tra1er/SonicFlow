/**
 * SonicFlow — Track Card Component
 */

import { icon } from '../js/icons.js';
import { getAlbumArt, getArtistNames, formatDuration } from '../js/utils.js';
import * as player from '../js/player.js';
import * as state from '../js/state.js';
import { navigate } from '../js/router.js';
import { showToast } from './toast.js';
import { buildHash } from '../js/utils.js';

/**
 * Create a track card DOM element.
 * @param {object} track - Spotify track object
 * @param {object} options
 * @param {number} [options.match] - Match percentage (0-1) for discovery results
 * @param {boolean} [options.showActions=true] - Show action buttons
 * @param {boolean} [options.large=false] - Use large card style
 * @param {string} [options.rank] - Rank number to display
 * @param {function} [options.onFindSimilar] - Custom find similar handler
 * @param {function} [options.onRemove] - Show remove button instead of add
 * @returns {HTMLElement}
 */
export function createTrackCard(track, options = {}) {
  const {
    match,
    showActions = true,
    large = false,
    rank,
    onRemove,
  } = options;

  const el = document.createElement('div');
  el.className = `track-card ${large ? 'track-card-lg' : ''} ${player.getCurrentTrack()?.id === track.id ? 'playing' : ''}`;
  el.dataset.trackId = track.id;

  const artUrl = getAlbumArt(track, large ? 1 : 2);
  const artistName = getArtistNames(track);
  const duration = track.duration_ms ? formatDuration(track.duration_ms) : '';

  let actionsHTML = '';
  if (showActions) {
    if (onRemove) {
      actionsHTML = `
        <div class="track-card-actions">
          <button class="btn-icon" data-action="play" title="Play preview">${icon('play', 16)}</button>
          <button class="btn-icon" data-action="similar" title="Find similar">${icon('compass', 16)}</button>
          <button class="btn-icon" data-action="remove" title="Remove">${icon('x', 16)}</button>
        </div>
      `;
    } else {
      actionsHTML = `
        <div class="track-card-actions">
          <button class="btn-icon" data-action="play" title="Play preview">${icon('play', 16)}</button>
          <button class="btn-icon" data-action="similar" title="Find similar">${icon('compass', 16)}</button>
          <button class="btn-icon" data-action="queue" title="Add to queue">${icon('plus', 16)}</button>
          <a class="btn-icon" href="${track.external_urls?.spotify || '#'}" target="_blank" rel="noopener" title="Open in Spotify">${icon('externalLink', 16)}</a>
        </div>
      `;
    }
  }

  el.innerHTML = `
    ${rank ? `<span class="taste-track-rank ${parseInt(rank) <= 3 ? 'top-3' : ''}">${rank}</span>` : ''}
    <div class="track-card-art">
      <img src="${artUrl}" alt="${track.name}" loading="lazy">
      <div class="track-card-art-overlay" data-action="play">${icon('play', 20)}</div>
    </div>
    <div class="track-card-info">
      <div class="track-card-name">${track.name}</div>
      <div class="track-card-artist">${artistName}</div>
    </div>
    ${match != null ? `<span class="track-card-match">${Math.round(match * 100)}%</span>` : ''}
    ${duration && !showActions ? `<span class="track-card-duration">${duration}</span>` : ''}
    ${actionsHTML}
  `;

  // Event delegation
  el.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;

    if (action === 'play') {
      e.stopPropagation();
      player.setTrack(track);
    } else if (action === 'similar') {
      e.stopPropagation();
      const hash = buildHash('/discovery', {
        track: track.name,
        artist: track.artists?.[0]?.name,
        id: track.id,
        image: getAlbumArt(track, 1),
      });
      navigate(hash);
    } else if (action === 'queue') {
      e.stopPropagation();
      const added = state.addToQueue(track);
      if (added) {
        showToast(`Added "${track.name}" to queue`, 'success');
      } else {
        showToast('Already in queue', 'info');
      }
    } else if (action === 'remove') {
      e.stopPropagation();
      if (onRemove) onRemove(track);
    } else if (!e.target.closest('a')) {
      // Default click - play the track
      player.setTrack(track);
    }
  });

  return el;
}
