/**
 * SonicFlow — Client-side SPA Router (hash-based)
 */

const routes = {};
let currentRouteHash = null;
let onChangeCallbacks = [];

/** Register a route handler */
export function route(path, handler) {
  routes[path] = handler;
}

/** Navigate to a path */
export function navigate(hash) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  window.location.hash = hash;
}

/** Get the current route path (without params) */
export function getCurrentRoute() {
  const hash = window.location.hash || '#/home';
  const path = hash.split('?')[0];
  return path.startsWith('#') ? path.slice(1) : path;
}

/** Register a route change callback */
export function onRouteChange(callback) {
  onChangeCallbacks.push(callback);
  return () => {
    onChangeCallbacks = onChangeCallbacks.filter(cb => cb !== callback);
  };
}

/** Handle hash change */
async function handleRoute() {
  const hash = window.location.hash || '#/home';
  if (hash === currentRouteHash) return;
  currentRouteHash = hash;

  const path = getCurrentRoute();

  // Notify listeners
  onChangeCallbacks.forEach(cb => {
    try { cb(path); } catch (e) { console.error('[Router] Callback error:', e); }
  });

  // Find matching route
  const handler = routes[path];
  if (!handler) {
    // Try to find a default or redirect
    if (routes['/home']) {
      navigate('/home');
    }
    return;
  }

  // Get the content container
  const content = document.getElementById('page-content');
  if (!content) return;

  // Animate out
  content.style.opacity = '0';
  content.style.transform = 'translateY(10px)';

  await new Promise(r => setTimeout(r, 150));

  // Clear and render new page
  content.innerHTML = '';

  try {
    await handler(content);
  } catch (err) {
    console.error(`[Router] Error rendering ${path}:`, err);
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h2 class="empty-state-title">Something went wrong</h2>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }

  // Animate in
  requestAnimationFrame(() => {
    content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  });
}

/** Initialize the router */
export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // Handle initial route
  handleRoute();
}
