/**
 * SonicFlow — Sidebar Navigation
 */

import { icon } from '../js/icons.js';
import { navigate, onRouteChange, getCurrentRoute } from '../js/router.js';
import { logout } from '../js/auth.js';
import * as state from '../js/state.js';

const NAV_ITEMS = [
  { path: '/home', label: 'Home', icon: 'home' },
  { path: '/playlists', label: 'Playlists', icon: 'music' },
  { path: '/discovery', label: 'Discover', icon: 'compass' },
  { path: '/taste', label: 'Taste Profile', icon: 'user' },
  { path: '/recent', label: 'Recently Played', icon: 'clock' },
  { path: '/moods', label: 'Mood Explorer', icon: 'palette' },
  { path: '/queue', label: 'Queue', icon: 'list' },
];

/**
 * Render the sidebar navigation.
 */
export function renderNavbar(container) {
  const nav = document.createElement('nav');
  nav.className = 'navbar glass';
  nav.id = 'navbar';

  const user = state.getState('user');
  const avatarUrl = user?.images?.[0]?.url || '';
  const userName = user?.display_name || 'User';

  nav.innerHTML = `
    <div class="navbar-header">
      <div class="navbar-logo">
        <span class="text-gradient">SonicFlow</span>
      </div>
      ${avatarUrl ? `
        <div class="navbar-user">
          <div class="navbar-avatar">
            <img src="${avatarUrl}" alt="${userName}">
          </div>
          <span class="navbar-username">${userName}</span>
        </div>
      ` : `
        <div class="navbar-user">
          <div class="navbar-avatar navbar-avatar-placeholder">${userName[0]}</div>
          <span class="navbar-username">${userName}</span>
        </div>
      `}
    </div>

    <ul class="navbar-menu" id="navbar-menu">
      ${NAV_ITEMS.map(item => `
        <li class="navbar-item" data-path="${item.path}">
          <a href="#${item.path}" class="navbar-link">
            <span class="navbar-icon">${icon(item.icon)}</span>
            <span class="navbar-label">${item.label}</span>
          </a>
        </li>
      `).join('')}
    </ul>

    <div class="navbar-footer">
      <button class="navbar-link" id="navbar-logout">
        <span class="navbar-icon">${icon('logout')}</span>
        <span class="navbar-label">Logout</span>
      </button>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .navbar {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--space-5) var(--space-4);
      background: rgba(15, 15, 42, 0.85);
      border-right: 1px solid var(--border-subtle);
      overflow-y: auto;
    }
    .navbar-header {
      margin-bottom: var(--space-8);
    }
    .navbar-logo {
      font-size: var(--font-size-xl);
      font-weight: 800;
      margin-bottom: var(--space-6);
      padding-left: var(--space-3);
    }
    .navbar-user {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: rgba(255,255,255,0.04);
    }
    .navbar-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .navbar-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .navbar-avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gradient-primary);
      color: white;
      font-weight: 600;
      font-size: var(--font-size-sm);
    }
    .navbar-username {
      font-size: var(--font-size-sm);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .navbar-menu {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .navbar-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      transition: all var(--transition-fast);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      width: 100%;
    }
    .navbar-link:hover {
      color: var(--text-primary);
      background: rgba(255,255,255,0.06);
    }
    .navbar-item.active .navbar-link {
      color: white;
      background: rgba(139, 92, 246, 0.15);
      border-left: 3px solid var(--color-purple);
    }
    .navbar-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    .navbar-footer {
      margin-top: auto;
      padding-top: var(--space-4);
      border-top: 1px solid var(--border-subtle);
    }
    @media (max-width: 768px) {
      .navbar-label, .navbar-username, .navbar-logo {
        display: none;
      }
      .navbar-user {
        justify-content: center;
        padding: var(--space-2);
      }
      .navbar-link {
        justify-content: center;
        padding: var(--space-3);
      }
      .navbar {
        padding: var(--space-3) var(--space-2);
        align-items: center;
      }
    }
  `;
  nav.appendChild(style);

  container.appendChild(nav);

  // Highlight active route
  updateActiveNav(getCurrentRoute());

  // Listen for route changes
  onRouteChange((path) => updateActiveNav(path));

  // Logout
  nav.querySelector('#navbar-logout').addEventListener('click', logout);

  // Prevent default on nav links (let hash router handle it)
  nav.querySelectorAll('.navbar-item a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const path = a.closest('.navbar-item').dataset.path;
      navigate(path);
    });
  });
}

/** Update the active nav item */
export function updateActiveNav(path) {
  const items = document.querySelectorAll('.navbar-item');
  items.forEach(item => {
    item.classList.toggle('active', item.dataset.path === path);
  });
}
