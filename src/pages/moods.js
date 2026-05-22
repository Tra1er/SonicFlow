/**
 * SonicFlow — Mood Explorer Page
 */

import api from '../js/api.js';
import * as state from '../js/state.js';
import * as player from '../js/player.js';
import { createTrackCard } from '../components/trackcard.js';
import { showToast } from '../components/toast.js';
import { icon } from '../js/icons.js';

const MOODS = [
  { id: 'chill', name: 'Chill Vibes', emoji: '🌊', query: 'chill vibes ambient relaxing', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', desc: 'Laid-back and soothing' },
  { id: 'workout', name: 'Workout Energy', emoji: '🔥', query: 'workout energy pump bass', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', desc: 'High-intensity motivation' },
  { id: 'latenight', name: 'Late Night', emoji: '🌙', query: 'late night r&b soul smooth', gradient: 'linear-gradient(135deg, #0c0c3a, #3a1c71)', desc: 'Smooth after-hours vibes' },
  { id: 'feelgood', name: 'Feel Good', emoji: '☀️', query: 'feel good happy upbeat pop', gradient: 'linear-gradient(135deg, #f7971e, #ffd200)', desc: 'Instant mood boost' },
  { id: 'melancholy', name: 'Melancholy', emoji: '🌧️', query: 'melancholy sad piano emotional', gradient: 'linear-gradient(135deg, #536976, #292e49)', desc: 'Beautifully somber tones' },
  { id: 'party', name: 'Party', emoji: '🎉', query: 'party dance club electronic', gradient: 'linear-gradient(135deg, #fc466b, #3f5efb)', desc: 'Get the party started' },
  { id: 'focus', name: 'Focus', emoji: '🎯', query: 'focus study concentration lo-fi instrumental', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)', desc: 'Deep work companion' },
  { id: 'roadtrip', name: 'Road Trip', emoji: '🚗', query: 'road trip rock indie adventure', gradient: 'linear-gradient(135deg, #eb5757, #f2994a)', desc: 'Open road anthems' },
  { id: 'romantic', name: 'Romantic', emoji: '💕', query: 'romantic love ballad slow', gradient: 'linear-gradient(135deg, #ee9ca7, #ffdde1)', desc: 'Love songs and ballads' },
  { id: 'throwback', name: 'Throwback', emoji: '📼', query: 'throwback 90s 2000s classic hits', gradient: 'linear-gradient(135deg, #c94b4b, #4b134f)', desc: 'Nostalgic hits' },
  { id: 'underground', name: 'Underground', emoji: '🎤', query: 'underground indie alternative experimental', gradient: 'linear-gradient(135deg, #1a2a6c, #b21f1f)', desc: 'Off the beaten path' },
  { id: 'acoustic', name: 'Acoustic', emoji: '🎸', query: 'acoustic unplugged folk singer songwriter', gradient: 'linear-gradient(135deg, #c9a96e, #8b6914)', desc: 'Raw and unplugged' },
];

let expandedMood = null;

export async function render(container) {
  expandedMood = null;

  container.innerHTML = `
    <div class="page-enter">
      <div class="section-header">
        <div>
          <h1 class="section-title">Mood Explorer</h1>
          <p class="section-subtitle">Discover tracks that match your current vibe</p>
        </div>
      </div>

      <div class="moods-grid" id="moods-grid">
        ${MOODS.map(mood => `
          <div class="mood-card animate-scale-in" data-mood="${mood.id}" style="background:${mood.gradient}">
            <div class="mood-card-emoji">${mood.emoji}</div>
            <div class="mood-card-name">${mood.name}</div>
            <div class="mood-card-desc">${mood.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Click handler
  container.querySelector('#moods-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.mood-card');
    if (!card) return;

    // Close button in expanded section
    if (e.target.closest('#close-mood-expanded')) {
      expandedMood = null;
      renderMoodsGrid();
      return;
    }

    const moodId = card.dataset.mood;
    if (moodId && !card.classList.contains('mood-expanded')) {
      expandedMood = expandedMood === moodId ? null : moodId;
      renderMoodsGrid();
    }
  });
}

function renderMoodsGrid() {
  const grid = document.getElementById('moods-grid');
  if (!grid) return;

  grid.innerHTML = MOODS.map(mood => {
    let html = `
      <div class="mood-card" data-mood="${mood.id}" style="background:${mood.gradient}">
        <div class="mood-card-emoji">${mood.emoji}</div>
        <div class="mood-card-name">${mood.name}</div>
        <div class="mood-card-desc">${mood.desc}</div>
      </div>
    `;

    if (mood.id === expandedMood) {
      html += `
        <div class="mood-expanded" id="mood-expanded-${mood.id}">
          <div class="mood-expanded-header">
            <h3>${mood.emoji} ${mood.name} Tracks</h3>
            <button class="btn btn-ghost btn-sm" id="close-mood-expanded">${icon('x', 16)} Close</button>
          </div>
          <div id="mood-tracks-${mood.id}">
            <div style="text-align:center;padding:var(--space-8)"><div class="spinner" style="margin:0 auto"></div></div>
          </div>
        </div>
      `;
      // Load tracks for this mood
      setTimeout(() => loadMoodTracks(mood), 100);
    }

    return html;
  }).join('');

  // Re-bind close button
  const closeBtn = grid.querySelector('#close-mood-expanded');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      expandedMood = null;
      renderMoodsGrid();
    });
  }
}

async function loadMoodTracks(mood) {
  try {
    const data = await api.search(mood.query, 'track', 10);
    const tracks = data.tracks?.items || [];

    const tracksEl = document.getElementById(`mood-tracks-${mood.id}`);
    if (!tracksEl) return;

    tracksEl.innerHTML = '';

    if (tracks.length === 0) {
      tracksEl.innerHTML = '<p style="color:var(--text-tertiary)">No tracks found for this mood.</p>';
      return;
    }

    tracks.forEach(track => {
      tracksEl.appendChild(createTrackCard(track, { large: true }));
    });
  } catch (err) {
    const tracksEl = document.getElementById(`mood-tracks-${mood.id}`);
    if (tracksEl) {
      tracksEl.innerHTML = `<p style="color:var(--color-error)">Failed to load tracks: ${err.message}</p>`;
    }
  }
}
