/**
 * SonicFlow — Simple Reactive State Manager
 */

const state = {};
const listeners = {};

// Load persisted queue from localStorage
try {
  const savedQueue = localStorage.getItem('sonicflow_queue');
  if (savedQueue) state.discoveryQueue = JSON.parse(savedQueue);
} catch { /* ignore */ }

if (!state.discoveryQueue) state.discoveryQueue = [];

/** Get a state value */
export function getState(key) {
  return state[key];
}

/** Set a state value and notify subscribers */
export function setState(key, value) {
  state[key] = value;
  if (listeners[key]) {
    listeners[key].forEach(cb => {
      try { cb(value); } catch (e) { console.error(`[State] Listener error for ${key}:`, e); }
    });
  }
}

/** Subscribe to state changes */
export function subscribe(key, callback) {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(callback);
  // Return unsubscribe function
  return () => {
    listeners[key] = listeners[key].filter(cb => cb !== callback);
  };
}

// --- Discovery Queue helpers ---

function persistQueue() {
  try {
    localStorage.setItem('sonicflow_queue', JSON.stringify(state.discoveryQueue));
  } catch { /* ignore */ }
}

/** Get the queue */
export function getQueue() {
  return state.discoveryQueue || [];
}

/** Add a track to the queue (deduplicate by id) */
export function addToQueue(track) {
  if (!track?.id) return;
  const queue = getQueue();
  if (queue.find(t => t.id === track.id)) return false; // already in queue
  state.discoveryQueue = [...queue, track];
  persistQueue();
  setState('discoveryQueue', state.discoveryQueue);
  return true;
}

/** Remove a track from the queue */
export function removeFromQueue(trackId) {
  state.discoveryQueue = getQueue().filter(t => t.id !== trackId);
  persistQueue();
  setState('discoveryQueue', state.discoveryQueue);
}

/** Clear the queue */
export function clearQueue() {
  state.discoveryQueue = [];
  persistQueue();
  setState('discoveryQueue', state.discoveryQueue);
}

/** Reorder the queue (move item from fromIndex to toIndex) */
export function reorderQueue(fromIndex, toIndex) {
  const queue = [...getQueue()];
  const [item] = queue.splice(fromIndex, 1);
  queue.splice(toIndex, 0, item);
  state.discoveryQueue = queue;
  persistQueue();
  setState('discoveryQueue', state.discoveryQueue);
}
