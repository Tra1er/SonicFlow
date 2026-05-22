/**
 * SonicFlow — Discovery Queue Page
 */

import * as state from '../js/state.js';
import * as player from '../js/player.js';
import api from '../js/api.js';
import { createTrackCard } from '../components/trackcard.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { icon } from '../js/icons.js';
import { formatDuration, shuffleArray } from '../js/utils.js';

export async function render(container) {
  renderQueue(container);

  // Subscribe to queue changes
  state.subscribe('discoveryQueue', () => renderQueue(container));
}

function renderQueue(container) {
  const queue = state.getQueue();

  if (queue.length === 0) {
    container.innerHTML = `
      <div class="page-enter">
        <div class="section-header">
          <div>
            <h1 class="section-title">Discovery Queue</h1>
            <p class="section-subtitle">Your collection of discovered tracks</p>
          </div>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">🎵</div>
          <h3 class="empty-state-title">Your queue is empty</h3>
          <p class="empty-state-text">Start exploring to add tracks! Use the Discover or Mood Explorer pages to find new music.</p>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6)">
            <button class="btn btn-primary" onclick="window.location.hash='#/discovery'">${icon('compass', 16)} Discover</button>
            <button class="btn btn-secondary" onclick="window.location.hash='#/moods'">${icon('palette', 16)} Explore Moods</button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const totalMs = queue.reduce((sum, t) => sum + (t.duration_ms || 0), 0);

  container.innerHTML = `
    <div class="page-enter">
      <div class="queue-header">
        <div>
          <h1 class="section-title">Discovery Queue</h1>
          <div class="queue-stats">${queue.length} tracks • ${formatDuration(totalMs)} total</div>
        </div>
        <div class="queue-header-actions">
          <button class="btn btn-primary btn-sm" id="queue-play-all">${icon('play', 14)} Play All</button>
          <button class="btn btn-secondary btn-sm" id="queue-shuffle">${icon('shuffle', 14)} Shuffle</button>
          <button class="btn btn-spotify btn-sm" id="queue-export">${icon('spotify', 14)} Export to Spotify</button>
          <button class="btn btn-danger btn-sm" id="queue-clear">${icon('trash', 14)} Clear</button>
        </div>
      </div>

      <div class="queue-list" id="queue-list"></div>
    </div>
  `;

  // Render track list
  const listEl = container.querySelector('#queue-list');
  queue.forEach((track, index) => {
    const row = document.createElement('div');
    row.className = 'queue-track';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = 'var(--space-2)';

    // Reorder buttons
    const orderBtns = document.createElement('div');
    orderBtns.className = 'queue-track-order';
    orderBtns.innerHTML = `
      <button data-action="up" data-index="${index}" ${index === 0 ? 'disabled style="opacity:0.2"' : ''}>${icon('chevronUp', 14)}</button>
      <button data-action="down" data-index="${index}" ${index === queue.length - 1 ? 'disabled style="opacity:0.2"' : ''}>${icon('chevronDown', 14)}</button>
    `;
    row.appendChild(orderBtns);

    // Track card
    const card = createTrackCard(track, {
      showActions: true,
      onRemove: (t) => {
        state.removeFromQueue(t.id);
        showToast(`Removed "${t.name}" from queue`, 'info');
      },
    });
    card.style.flex = '1';
    row.appendChild(card);

    listEl.appendChild(row);
  });

  // Reorder click handler
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const index = parseInt(btn.dataset.index);
    if (action === 'up' && index > 0) {
      state.reorderQueue(index, index - 1);
    } else if (action === 'down' && index < queue.length - 1) {
      state.reorderQueue(index, index + 1);
    }
  });

  // Play All
  container.querySelector('#queue-play-all').addEventListener('click', () => {
    if (queue.length > 0) {
      player.setTrack(queue[0]);
      showToast('Playing queue', 'success');
    }
  });

  // Shuffle
  container.querySelector('#queue-shuffle').addEventListener('click', () => {
    const shuffled = shuffleArray(queue);
    state.clearQueue();
    shuffled.forEach(t => state.addToQueue(t));
    showToast('Queue shuffled!', 'success');
  });

  // Clear
  container.querySelector('#queue-clear').addEventListener('click', () => {
    showModal({
      title: 'Clear Queue',
      body: `<p>Are you sure you want to remove all ${queue.length} tracks from your discovery queue?</p>`,
      actions: [
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal },
        {
          label: 'Clear All',
          class: 'btn-danger',
          onClick: () => {
            state.clearQueue();
            closeModal();
            showToast('Queue cleared', 'info');
          },
        },
      ],
    });
  });

  // Export to Spotify
  container.querySelector('#queue-export').addEventListener('click', () => {
    showModal({
      title: 'Export to Spotify',
      body: `
        <p style="margin-bottom:var(--space-4)">Create a new Spotify playlist with ${queue.length} tracks.</p>
        <input type="text" class="input" id="export-playlist-name" placeholder="Playlist name" value="SonicFlow Discovery" style="margin-bottom:var(--space-3)">
        <input type="text" class="input" id="export-playlist-desc" placeholder="Description (optional)" value="Discovered with SonicFlow ✨">
      `,
      actions: [
        { label: 'Cancel', class: 'btn-ghost', onClick: closeModal },
        {
          label: 'Create Playlist',
          class: 'btn-spotify',
          onClick: async () => {
            const nameInput = document.getElementById('export-playlist-name');
            const descInput = document.getElementById('export-playlist-desc');
            const name = nameInput?.value || 'SonicFlow Discovery';
            const desc = descInput?.value || '';

            try {
              // Create playlist
              const playlist = await api.createPlaylist(name, desc, false);

              // Add tracks (in batches of 100)
              const uris = queue.map(t => t.uri).filter(Boolean);
              for (let i = 0; i < uris.length; i += 100) {
                await api.addTracksToPlaylist(playlist.id, uris.slice(i, i + 100));
              }

              closeModal();
              showToast(`🎉 Playlist "${name}" created with ${uris.length} tracks!`, 'success', 5000);
            } catch (err) {
              showToast(`Failed to export: ${err.message}`, 'error');
            }
          },
        },
      ],
    });
  });
}
