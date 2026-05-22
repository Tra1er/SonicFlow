/**
 * SonicFlow — Modal Dialog
 */

let overlay = null;

/**
 * Show a modal dialog.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body - HTML string
 * @param {Array<{label: string, class?: string, onClick: function}>} opts.actions
 */
export function showModal({ title, body, actions = [] }) {
  closeModal(); // close any existing

  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  const actionsHTML = actions.map((a, i) =>
    `<button class="btn ${a.class || 'btn-secondary'}" data-action="${i}">${a.label}</button>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">${title}</h3>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">${actionsHTML}</div>
    </div>
  `;

  // Backdrop click closes
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Action buttons
  overlay.querySelectorAll('[data-action]').forEach(btn => {
    const idx = parseInt(btn.dataset.action);
    btn.addEventListener('click', () => {
      if (actions[idx]?.onClick) actions[idx].onClick();
    });
  });

  // ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
}

/** Close the modal */
export function closeModal() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}
