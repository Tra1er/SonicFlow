/**
 * SonicFlow — Recently Played Page
 */

import api from '../js/api.js';
import { createTrackCard } from '../components/trackcard.js';
import { timeAgo, getTimeGroup, formatDuration } from '../js/utils.js';

export async function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="section-header">
        <div>
          <h1 class="section-title">Recently Played</h1>
          <p class="section-subtitle">Your listening timeline</p>
        </div>
      </div>

      <div class="recent-stats" id="recent-stats">
        <div class="skeleton-card" style="height:90px"></div>
        <div class="skeleton-card" style="height:90px"></div>
        <div class="skeleton-card" style="height:90px"></div>
      </div>

      <div id="recent-timeline">
        ${Array(8).fill('<div class="skeleton" style="height:56px;border-radius:var(--radius-md);margin-bottom:var(--space-2)"></div>').join('')}
      </div>
    </div>
  `;

  try {
    const data = await api.getRecentlyPlayed(50);
    const items = data.items || [];

    // Stats
    const uniqueTracks = new Set(items.map(i => i.track?.id)).size;
    const uniqueArtists = new Set(items.flatMap(i => i.track?.artists?.map(a => a.name) || [])).size;
    const totalMs = items.reduce((sum, i) => sum + (i.track?.duration_ms || 0), 0);

    const statsEl = document.getElementById('recent-stats');
    statsEl.innerHTML = `
      <div class="stat-card animate-slide-up">
        <div class="stat-card-value text-gradient">${uniqueTracks}</div>
        <div class="stat-card-label">Unique Tracks</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.05s">
        <div class="stat-card-value text-gradient">${uniqueArtists}</div>
        <div class="stat-card-label">Unique Artists</div>
      </div>
      <div class="stat-card animate-slide-up" style="animation-delay:0.1s">
        <div class="stat-card-value text-gradient">${Math.round(totalMs / 60000)}m</div>
        <div class="stat-card-label">Listening Time</div>
      </div>
    `;

    // Group by time period
    const groups = {};
    items.forEach(item => {
      if (!item.track) return;
      const group = getTimeGroup(item.played_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    const timelineEl = document.getElementById('recent-timeline');
    timelineEl.innerHTML = '';

    const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    groupOrder.forEach(groupName => {
      const groupItems = groups[groupName];
      if (!groupItems || groupItems.length === 0) return;

      const section = document.createElement('div');
      section.className = 'recent-group animate-slide-up';
      section.innerHTML = `<div class="recent-group-title">${groupName}</div>`;

      groupItems.forEach(item => {
        const card = createTrackCard(item.track, { showActions: true });
        // Add played_at time indicator
        const timeSpan = document.createElement('span');
        timeSpan.className = 'track-card-duration';
        timeSpan.style.fontSize = 'var(--font-size-xs)';
        timeSpan.style.color = 'var(--text-tertiary)';
        timeSpan.style.flexShrink = '0';
        timeSpan.textContent = timeAgo(item.played_at);
        card.querySelector('.track-card-info')?.after(timeSpan);
        section.appendChild(card);
      });

      timelineEl.appendChild(section);
    });

    if (items.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎵</div>
          <h3 class="empty-state-title">No recent history</h3>
          <p class="empty-state-text">Listen to some music on Spotify first!</p>
        </div>
      `;
    }
  } catch (err) {
    document.getElementById('recent-timeline').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Failed to load history</h3>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }
}
