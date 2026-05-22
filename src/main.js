/**
 * SonicFlow — App Entry Point
 */

import { login, handleCallback, isAuthenticated } from './js/auth.js';
import { route, initRouter, navigate } from './js/router.js';
import { renderNavbar } from './components/navbar.js';
import { renderPlayer } from './js/player.js';
import { icon } from './js/icons.js';
import * as state from './js/state.js';
import api from './js/api.js';

// --- Boot ---

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');

  // Handle OAuth callback
  if (window.location.pathname === '/callback' || window.location.search.includes('code=')) {
    app.innerHTML = `
      <div class="login-page">
        <div class="spinner spinner-lg"></div>
        <p style="margin-top: var(--space-4); color: var(--text-secondary);">Connecting to Spotify...</p>
      </div>
    `;
    const success = await handleCallback();
    if (!success) {
      app.innerHTML = `
        <div class="login-page">
          <h1 class="login-logo text-gradient">SonicFlow</h1>
          <p style="color: var(--color-error); margin-bottom: var(--space-4);">Authentication failed. Please try again.</p>
          <button class="login-btn" id="retry-login">${icon('spotify', 24)} Try Again</button>
        </div>
      `;
      app.querySelector('#retry-login').addEventListener('click', login);
      return;
    }
  }

  // Check auth
  if (!isAuthenticated()) {
    renderLoginPage(app);
    return;
  }

  // Load user profile
  try {
    const profile = await api.getProfile();
    state.setState('user', profile);
  } catch (err) {
    console.error('[App] Failed to load profile:', err);
  }

  // Render app shell
  renderAppShell(app);
});

// --- Login Page ---

function renderLoginPage(app) {
  app.innerHTML = `
    <div class="login-page">
      <h1 class="login-logo">
        <span class="text-gradient">SonicFlow</span>
      </h1>
      <p class="login-subtitle">
        Discover new music through your playlists. Find similar tracks, explore moods, and build your perfect listening queue.
      </p>

      <div class="login-features">
        <div class="login-feature animate-slide-up" style="animation-delay:0.1s">
          <div class="login-feature-icon">🎵</div>
          <h3>Song Discovery</h3>
          <p>Find tracks similar to your favorites</p>
        </div>
        <div class="login-feature animate-slide-up" style="animation-delay:0.2s">
          <div class="login-feature-icon">🎧</div>
          <h3>Audio Previews</h3>
          <p>Listen to 30-second previews instantly</p>
        </div>
        <div class="login-feature animate-slide-up" style="animation-delay:0.3s">
          <div class="login-feature-icon">📊</div>
          <h3>Taste Profile</h3>
          <p>Explore your music DNA and top genres</p>
        </div>
      </div>

      <button class="login-btn animate-slide-up" style="animation-delay:0.4s" id="login-btn">
        ${icon('spotify', 24)}
        Connect with Spotify
      </button>

      <p style="margin-top: var(--space-6); color: var(--text-tertiary); font-size: var(--font-size-xs); position: relative; z-index: 2;">
        We only request access to read your playlists and listening history.
      </p>
    </div>
  `;

  app.querySelector('#login-btn').addEventListener('click', login);
}

// --- App Shell ---

function renderAppShell(app) {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="app-sidebar" id="app-sidebar"></aside>
      <main class="app-main">
        <div class="app-content" id="page-content" style="opacity:1;transition:opacity 0.15s ease,transform 0.15s ease;"></div>
      </main>
    </div>
  `;

  // Render sidebar
  renderNavbar(document.getElementById('app-sidebar'));

  // Render player bar
  renderPlayer(document.body);

  // Register routes (lazy-load page modules)
  route('/home', async (el) => {
    const { render } = await import('./pages/home.js');
    await render(el);
  });

  route('/playlists', async (el) => {
    const { render } = await import('./pages/playlists.js');
    await render(el);
  });

  route('/discovery', async (el) => {
    const { render } = await import('./pages/discovery.js');
    await render(el);
  });

  route('/taste', async (el) => {
    const { render } = await import('./pages/taste.js');
    await render(el);
  });

  route('/recent', async (el) => {
    const { render } = await import('./pages/recent.js');
    await render(el);
  });

  route('/trackdna', async (el) => {
    const { render } = await import('./pages/trackdna.js');
    await render(el);
  });

  route('/moods', async (el) => {
    const { render } = await import('./pages/moods.js');
    await render(el);
  });

  route('/queue', async (el) => {
    const { render } = await import('./pages/queue.js');
    await render(el);
  });

  // Start router
  initRouter();

  // Default to home if no hash
  if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
    navigate('/home');
  }
}
