/**
 * SonicFlow — Global Audio Preview Player
 */

import api from './api.js';
import * as state from './state.js';
import { icon } from './icons.js';
import { formatDuration, getAlbumArt, getArtistNames } from './utils.js';

let audio = null;
let currentTrack = null;
let isPlaying = false;
let volume = 0.7;
let progressInterval = null;

/** Initialize the audio element */
function initAudio() {
  if (audio) return;
  audio = new Audio();
  audio.volume = volume;

  audio.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayerUI();
    // Auto-play next in queue
    playNext();
  });

  audio.addEventListener('error', () => {
    isPlaying = false;
    updatePlayerUI();
  });
}

/** Set and play a track */
export async function setTrack(track) {
  initAudio();

  if (!track) return;
  currentTrack = track;
  state.setState('playingTrack', track);
  updatePlayerUI();

  // Fetch preview URL
  try {
    const data = await api.getPreviewUrl(track.id);
    if (data.url) {
      audio.src = data.url;
      audio.play();
      isPlaying = true;
      startProgressUpdate();
      updatePlayerUI();
    } else {
      console.warn('[Player] No preview available for', track.name);
      // Still show track info but indicate no preview
      isPlaying = false;
      updatePlayerUI();
    }
  } catch (err) {
    console.error('[Player] Failed to get preview:', err);
    isPlaying = false;
    updatePlayerUI();
  }
}

/** Play */
export function play() {
  if (!audio?.src) return;
  audio.play();
  isPlaying = true;
  startProgressUpdate();
  updatePlayerUI();
}

/** Pause */
export function pause() {
  if (!audio) return;
  audio.pause();
  isPlaying = false;
  stopProgressUpdate();
  updatePlayerUI();
}

/** Toggle play/pause */
export function toggle() {
  if (isPlaying) pause();
  else play();
}

/** Set volume (0–1) */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = volume;
  updateVolumeUI();
}

/** Seek to position (0–1) */
export function seek(fraction) {
  if (!audio?.duration) return;
  audio.currentTime = fraction * audio.duration;
  updateProgressUI();
}

/** Play next track in queue */
export function playNext() {
  const queue = state.getQueue();
  if (!currentTrack || queue.length === 0) return;
  const idx = queue.findIndex(t => t.id === currentTrack.id);
  const nextIdx = idx + 1;
  if (nextIdx < queue.length) {
    setTrack(queue[nextIdx]);
  }
}

/** Play previous track in queue */
export function playPrev() {
  const queue = state.getQueue();
  if (!currentTrack || queue.length === 0) return;
  const idx = queue.findIndex(t => t.id === currentTrack.id);
  const prevIdx = idx - 1;
  if (prevIdx >= 0) {
    setTrack(queue[prevIdx]);
  }
}

/** Get the currently playing track */
export function getCurrentTrack() {
  return currentTrack;
}

/** Check if currently playing */
export function getIsPlaying() {
  return isPlaying;
}

// --- Progress tracking ---

function startProgressUpdate() {
  stopProgressUpdate();
  progressInterval = setInterval(updateProgressUI, 250);
}

function stopProgressUpdate() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function updateProgressUI() {
  if (!audio) return;
  const fill = document.getElementById('player-progress-fill');
  const timeCurrent = document.getElementById('player-time-current');
  const timeTotal = document.getElementById('player-time-total');

  if (fill && audio.duration) {
    const pct = (audio.currentTime / audio.duration) * 100;
    fill.style.width = `${pct}%`;
  }
  if (timeCurrent) {
    timeCurrent.textContent = formatDuration(audio.currentTime * 1000);
  }
  if (timeTotal) {
    timeTotal.textContent = formatDuration((audio.duration || 0) * 1000);
  }
}

function updateVolumeUI() {
  const fill = document.getElementById('player-volume-fill');
  if (fill) fill.style.width = `${volume * 100}%`;

  const volBtn = document.getElementById('player-volume-btn');
  if (volBtn) volBtn.innerHTML = volume === 0 ? icon('volumeX', 16) : icon('volume2', 16);
}

// --- Render the player bar ---

export function renderPlayer(container) {
  const bar = document.createElement('div');
  bar.className = 'player-bar';
  bar.id = 'player-bar';
  bar.innerHTML = `
    <div class="player-empty" id="player-empty-msg">
      <span>Select a track to play a preview</span>
    </div>
    <div class="player-track-info" id="player-track-info" style="display:none">
      <div class="player-track-art">
        <img id="player-art" src="" alt="">
      </div>
      <div class="player-track-text">
        <div class="player-track-name" id="player-track-name"></div>
        <div class="player-track-artist" id="player-track-artist"></div>
      </div>
    </div>
    <div class="player-controls" id="player-controls" style="display:none">
      <div class="player-buttons">
        <button class="btn-icon" id="player-prev-btn" title="Previous">${icon('skipBack', 16)}</button>
        <button class="player-play-btn" id="player-play-btn" title="Play">${icon('play', 16)}</button>
        <button class="btn-icon" id="player-next-btn" title="Next">${icon('skipForward', 16)}</button>
      </div>
      <div class="player-progress">
        <span class="player-progress-time" id="player-time-current">0:00</span>
        <div class="player-progress-bar" id="player-progress-bar">
          <div class="player-progress-fill" id="player-progress-fill" style="width:0%"></div>
        </div>
        <span class="player-progress-time" id="player-time-total">0:00</span>
      </div>
    </div>
    <div class="player-right" id="player-right" style="display:none">
      <div class="waveform-bars" id="player-waveform">
        <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
      </div>
      <div class="player-volume">
        <button class="btn-icon" id="player-volume-btn">${icon('volume2', 16)}</button>
        <div class="player-volume-bar" id="player-volume-bar">
          <div class="player-volume-fill" id="player-volume-fill" style="width:70%"></div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(bar);

  // Event listeners
  bar.querySelector('#player-play-btn').addEventListener('click', toggle);
  bar.querySelector('#player-prev-btn').addEventListener('click', playPrev);
  bar.querySelector('#player-next-btn').addEventListener('click', playNext);

  // Progress bar seek
  bar.querySelector('#player-progress-bar').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    seek(fraction);
  });

  // Volume bar
  bar.querySelector('#player-volume-bar').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    setVolume(fraction);
  });

  // Volume button mute toggle
  bar.querySelector('#player-volume-btn').addEventListener('click', () => {
    setVolume(volume > 0 ? 0 : 0.7);
  });
}

/** Update the player UI to reflect current state */
function updatePlayerUI() {
  const emptyMsg = document.getElementById('player-empty-msg');
  const trackInfo = document.getElementById('player-track-info');
  const controls = document.getElementById('player-controls');
  const right = document.getElementById('player-right');
  const playBtn = document.getElementById('player-play-btn');
  const waveform = document.getElementById('player-waveform');

  if (!currentTrack) {
    if (emptyMsg) emptyMsg.style.display = '';
    if (trackInfo) trackInfo.style.display = 'none';
    if (controls) controls.style.display = 'none';
    if (right) right.style.display = 'none';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  if (trackInfo) trackInfo.style.display = '';
  if (controls) controls.style.display = '';
  if (right) right.style.display = '';

  const art = document.getElementById('player-art');
  const name = document.getElementById('player-track-name');
  const artist = document.getElementById('player-track-artist');

  if (art) art.src = getAlbumArt(currentTrack, 2);
  if (name) name.textContent = currentTrack.name;
  if (artist) artist.textContent = getArtistNames(currentTrack);

  if (playBtn) playBtn.innerHTML = isPlaying ? icon('pause', 16) : icon('play', 16);

  if (waveform) {
    waveform.classList.toggle('playing', isPlaying);
  }
}
