/**
 * SonicFlow — Track DNA Page
 */

import api from '../js/api.js';
import * as player from '../js/player.js';
import { createTrackCard } from '../components/trackcard.js';
import { getHashParams, formatNumber, getAlbumArt, buildHash } from '../js/utils.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';

export async function render(container) {
  const params = getHashParams();

  if (!params.track || !params.artist) {
    container.innerHTML = `
      <div class="empty-state page-enter">
        <div class="empty-state-icon">🧬</div>
        <h2 class="empty-state-title">Track DNA</h2>
        <p class="empty-state-text">Select a track from your playlists or discovery results to see its DNA.</p>
        <button class="btn btn-primary" style="margin-top:var(--space-4)" onclick="window.location.hash='#/playlists'">Browse Playlists</button>
      </div>
    `;
    return;
  }

  const { track, artist, id, image } = params;

  container.innerHTML = `
    <div class="page-enter">
      <div class="trackdna-hero">
        <div class="trackdna-art">
          <img src="${image || ''}" alt="${track}" onerror="this.style.background='var(--bg-surface)'">
        </div>
        <div class="trackdna-info">
          <h1>${track}</h1>
          <p class="artist">${artist}</p>
          <div class="trackdna-stats" id="dna-stats">
            <div class="trackdna-stat"><div class="skeleton" style="width:60px;height:24px"></div><div class="trackdna-stat-label">Listeners</div></div>
            <div class="trackdna-stat"><div class="skeleton" style="width:60px;height:24px"></div><div class="trackdna-stat-label">Play Count</div></div>
          </div>
          <div class="trackdna-tags" id="dna-tags">
            <div class="skeleton" style="width:60px;height:24px;border-radius:var(--radius-full)"></div>
            <div class="skeleton" style="width:80px;height:24px;border-radius:var(--radius-full)"></div>
            <div class="skeleton" style="width:50px;height:24px;border-radius:var(--radius-full)"></div>
          </div>
          <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2)">
            <button class="btn btn-primary btn-sm" id="dna-play">${icon('play', 14)} Preview</button>
            <button class="btn btn-secondary btn-sm" id="dna-discover">${icon('compass', 14)} Find Similar</button>
          </div>
        </div>
      </div>

      <div class="trackdna-grid">
        <div class="card" id="dna-radar-section">
          <h3 style="margin-bottom:var(--space-4)">Tag DNA</h3>
          <div id="dna-radar" class="dna-radar">
            <div class="spinner" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
          </div>
        </div>

        <div class="card" id="dna-similar-section">
          <h3 style="margin-bottom:var(--space-4)">Similar Tracks</h3>
          <div id="dna-similar">
            ${Array(4).fill('<div class="skeleton" style="height:52px;border-radius:var(--radius-md);margin-bottom:var(--space-2)"></div>').join('')}
          </div>
        </div>

        <div class="card" id="dna-artist-section" style="grid-column: 1 / -1">
          <h3 style="margin-bottom:var(--space-4)">About ${artist}</h3>
          <div id="dna-artist-bio">
            <div class="skeleton" style="height:60px;border-radius:var(--radius-md)"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Play button
  container.querySelector('#dna-play').addEventListener('click', () => {
    if (id) player.setTrack({ id, name: track, artists: [{ name: artist }], album: { images: [{ url: image }] } });
  });

  // Discover button
  container.querySelector('#dna-discover').addEventListener('click', () => {
    navigate(buildHash('/discovery', { track, artist, id, image }));
  });

  // Load all data in parallel
  const [tagsResult, infoResult, similarResult, artistResult] = await Promise.allSettled([
    api.getTopTags(artist, track),
    api.getTrackInfo(artist, track),
    api.getSimilarTracks(artist, track, 6),
    api.getArtistInfo(artist),
  ]);

  // Tags
  const tagsEl = document.getElementById('dna-tags');
  const tags = tagsResult.status === 'fulfilled'
    ? (tagsResult.value.toptags?.tag || []).slice(0, 8)
    : [];

  if (tags.length > 0) {
    tagsEl.innerHTML = tags.map((t, i) => {
      const hue = (i * 45) % 360;
      return `<span class="chip" style="background:hsla(${hue},60%,60%,0.12);color:hsl(${hue},60%,65%);border-color:hsla(${hue},60%,60%,0.25)">${t.name}</span>`;
    }).join('');
  } else {
    tagsEl.innerHTML = '<span class="chip">No tags available</span>';
  }

  // Track info (listeners, playcount)
  const statsEl = document.getElementById('dna-stats');
  if (infoResult.status === 'fulfilled') {
    const info = infoResult.value.track || {};
    statsEl.innerHTML = `
      <div class="trackdna-stat">
        <div class="trackdna-stat-value">${formatNumber(info.listeners)}</div>
        <div class="trackdna-stat-label">Listeners</div>
      </div>
      <div class="trackdna-stat">
        <div class="trackdna-stat-value">${formatNumber(info.playcount)}</div>
        <div class="trackdna-stat-label">Play Count</div>
      </div>
    `;
  }

  // DNA Radar (tag visualization)
  const radarEl = document.getElementById('dna-radar');
  if (tags.length >= 3) {
    renderRadar(radarEl, tags.slice(0, 6));
  } else {
    radarEl.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:var(--space-8)">Not enough tags for visualization</p>';
  }

  // Similar tracks
  const similarEl = document.getElementById('dna-similar');
  if (similarResult.status === 'fulfilled') {
    const similarTracks = similarResult.value.similartracks?.track || [];
    similarEl.innerHTML = '';

    if (similarTracks.length === 0) {
      similarEl.innerHTML = '<p style="color:var(--text-tertiary)">No similar tracks found.</p>';
    } else {
      const enriched = await Promise.all(
        similarTracks.slice(0, 6).map(async (st) => {
          try {
            const result = await api.search(`${st.name} ${st.artist?.name}`, 'track', 1);
            return result.tracks?.items?.[0] || null;
          } catch { return null; }
        })
      );
      enriched.filter(Boolean).forEach(t => {
        similarEl.appendChild(createTrackCard(t));
      });
    }
  } else {
    similarEl.innerHTML = '<p style="color:var(--text-tertiary)">Failed to load similar tracks.</p>';
  }

  // Artist bio
  const bioEl = document.getElementById('dna-artist-bio');
  if (artistResult.status === 'fulfilled') {
    const artistInfo = artistResult.value.artist || {};
    const bio = artistInfo.bio?.summary || '';
    const cleanBio = bio.replace(/<a [^>]+>.*?<\/a>/g, '').trim();
    const similarArtists = (artistInfo.similar?.artist || []).slice(0, 5);

    bioEl.innerHTML = `
      ${cleanBio ? `<p style="color:var(--text-secondary);line-height:1.7;margin-bottom:var(--space-4)">${cleanBio.slice(0, 400)}${cleanBio.length > 400 ? '...' : ''}</p>` : ''}
      ${similarArtists.length > 0 ? `
        <div>
          <p style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-bottom:var(--space-2)">Similar Artists</p>
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
            ${similarArtists.map(a => `<span class="chip">${a.name}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } else {
    bioEl.innerHTML = '<p style="color:var(--text-tertiary)">Artist info unavailable.</p>';
  }
}

/** Render a radar/polar chart of tags using CSS */
function renderRadar(container, tags) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40;

  container.innerHTML = '';
  container.style.width = size + 'px';
  container.style.height = size + 'px';
  container.style.position = 'relative';

  // Draw concentric rings
  [0.33, 0.66, 1].forEach(ratio => {
    const r = maxR * ratio;
    const ring = document.createElement('div');
    ring.className = 'dna-radar-ring';
    ring.style.width = r * 2 + 'px';
    ring.style.height = r * 2 + 'px';
    container.appendChild(ring);
  });

  // Plot dots and labels
  const maxCount = Math.max(...tags.map(t => parseInt(t.count) || 1));
  tags.forEach((tag, i) => {
    const angle = (i / tags.length) * Math.PI * 2 - Math.PI / 2;
    const ratio = Math.max(0.3, (parseInt(tag.count) || 1) / maxCount);
    const r = maxR * ratio;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    // Dot
    const dot = document.createElement('div');
    dot.className = 'dna-radar-dot';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    container.appendChild(dot);

    // Label
    const labelR = maxR + 20;
    const lx = cx + Math.cos(angle) * labelR;
    const ly = cy + Math.sin(angle) * labelR;
    const label = document.createElement('div');
    label.className = 'dna-radar-label';
    label.style.left = lx + 'px';
    label.style.top = ly + 'px';
    label.textContent = tag.name;
    container.appendChild(label);
  });

  // Connect dots with lines (SVG overlay)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  const points = tags.map((tag, i) => {
    const angle = (i / tags.length) * Math.PI * 2 - Math.PI / 2;
    const ratio = Math.max(0.3, (parseInt(tag.count) || 1) / maxCount);
    const r = maxR * ratio;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', points);
  polygon.setAttribute('fill', 'rgba(139,92,246,0.15)');
  polygon.setAttribute('stroke', 'rgba(139,92,246,0.6)');
  polygon.setAttribute('stroke-width', '2');
  svg.appendChild(polygon);
  container.appendChild(svg);
}
