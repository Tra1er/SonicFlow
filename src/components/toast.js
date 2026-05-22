/**
 * SonicFlow — Toast Notification System
 */

let container = null;

function ensureContainer() {
  if (container) return;
  container = document.createElement('div');
  container.className = 'toast-container';
  container.id = 'toast-container';
  document.body.appendChild(container);
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3000) {
  ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-message">${message}</div>
    <button class="toast-close">&times;</button>
    <div class="toast-progress" style="animation-duration:${duration}ms"></div>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));

  container.appendChild(toast);

  // Auto dismiss
  const timer = setTimeout(() => dismiss(toast), duration);
  toast._timer = timer;
}

function dismiss(toast) {
  if (toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove());
}
