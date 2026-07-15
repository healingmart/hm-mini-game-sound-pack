/*
 * Healing Mart Audio Manager v1.0.1
 * Original work by Healing Mart
 */
(() => {
  "use strict";

  const STORE_KEY = "hm-mini-game-sound-enabled";

  function readStoredEnabled() {
    try {
      return localStorage.getItem(STORE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function storeEnabled(value) {
    try {
      localStorage.setItem(STORE_KEY, value ? "1" : "0");
    } catch (error) {
      // 저장이 제한된 환경에서도 현재 페이지에서는 정상 작동합니다.
    }
  }

  const state = {
    enabled: readStoredEnabled(),
    baseUrl: "",
    volume: 0.75,
    context: null,
    gain: null,
    manifest: null,
    buffers: new Map(),
    loading: new Map()
  };

  function ensureContext() {
    if (!state.enabled) {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!state.context) {
      state.context = new AudioContextClass();
      state.gain = state.context.createGain();
      state.gain.gain.value = state.volume;
      state.gain.connect(state.context.destination);
    }

    if (state.context.state === "suspended") {
      state.context.resume().catch(() => {});
    }

    return state.context;
  }

  async function loadManifest() {
    if (state.manifest) {
      return state.manifest;
    }

    const response = await fetch(`${state.baseUrl}sounds.json`, {
      cache: "force-cache"
    });

    if (!response.ok) {
      throw new Error("Sound manifest load failed");
    }

    state.manifest = await response.json();
    return state.manifest;
  }

  async function load(name) {
    if (state.buffers.has(name)) {
      return state.buffers.get(name);
    }

    if (state.loading.has(name)) {
      return state.loading.get(name);
    }

    const job = (async () => {
      try {
        const context = ensureContext();

        if (!context) {
          throw new Error("AudioContext unavailable");
        }

        const manifest = await loadManifest();
        const item = manifest.sounds[name];

        if (!item) {
          throw new Error(`Unknown sound: ${name}`);
        }

        const response = await fetch(`${state.baseUrl}${item.file}`, {
          cache: "force-cache"
        });

        if (!response.ok) {
          throw new Error(`Sound load failed: ${name}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        state.buffers.set(name, buffer);
        return buffer;
      } finally {
        state.loading.delete(name);
      }
    })();

    state.loading.set(name, job);
    return job;
  }

  function fallback(name) {
    if (!state.enabled) {
      return;
    }

    const context = ensureContext();

    if (!context || !state.gain) {
      return;
    }

    const item = state.manifest && state.manifest.sounds[name];
    const frequency = item && item.fallbackHz ? item.fallbackHz : 720;
    const oscillator = context.createOscillator();
    const localGain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    localGain.gain.setValueAtTime(0.035, now);
    localGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    oscillator.connect(localGain);
    localGain.connect(state.gain);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
  }

  async function play(name, options = {}) {
    if (!state.enabled) {
      return false;
    }

    try {
      const context = ensureContext();
      const buffer = await load(name);
      const source = context.createBufferSource();
      const localGain = context.createGain();

      localGain.gain.value = Number.isFinite(options.volume)
        ? Math.max(0, options.volume)
        : 1;

      source.buffer = buffer;
      source.playbackRate.value = Number.isFinite(options.rate)
        ? Math.max(0.1, options.rate)
        : 1;

      source.connect(localGain);
      localGain.connect(state.gain);
      source.start();
      return true;
    } catch (error) {
      fallback(name);
      return false;
    }
  }

  async function preload(names) {
    if (!state.enabled) {
      return [];
    }

    ensureContext();
    return Promise.allSettled((names || []).map(load));
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    storeEnabled(state.enabled);

    if (state.enabled) {
      ensureContext();
    }

    return state.enabled;
  }

  function setVolume(value) {
    if (!Number.isFinite(value)) {
      return state.volume;
    }

    state.volume = Math.max(0, Math.min(1, value));

    if (state.gain) {
      state.gain.gain.value = state.volume;
    }

    return state.volume;
  }

  window.HMAudio = Object.freeze({
    init({ baseUrl, volume = 0.75 } = {}) {
      state.baseUrl = String(baseUrl || "").replace(/\/?$/, "/");
      setVolume(volume);

      if (state.enabled) {
        ensureContext();
      }

      return this;
    },
    unlock: ensureContext,
    play,
    preload,
    setEnabled,
    setVolume,
    isEnabled: () => state.enabled
  });
})();
