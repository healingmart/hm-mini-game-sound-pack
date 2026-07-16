/*
 Healing Mart Audio Manager v1.2.0
 Backward-compatible common audio manager
 Original work by Healing Mart
*/
(() => {
  "use strict";

  const STORE_KEY = "hm-mini-game-sound-enabled";
  const VERSION = "1.2.0";

  const state = {
    enabled: localStorage.getItem(STORE_KEY) !== "0",
    baseUrl: "",
    volume: 0.75,
    context: null,
    gain: null,
    manifest: null,
    manifestPromise: null,
    buffers: new Map(),
    loading: new Map(),
    activeSources: new Set()
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/?$/, "/");
  }

  function ensureContext() {
    if (!state.enabled) return null;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!state.context || state.context.state === "closed") {
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

  function unlock() {
    const context = ensureContext();
    if (!context) return null;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    // A silent source started during a user gesture improves mobile unlock reliability.
    try {
      const buffer = context.createBuffer(1, 1, context.sampleRate || 44100);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    } catch (error) {
      // Unlock should remain non-fatal.
    }

    return context;
  }

  async function loadManifest() {
    if (state.manifest) return state.manifest;
    if (state.manifestPromise) return state.manifestPromise;
    if (!state.baseUrl) throw new Error("HMAudio.init baseUrl is required");

    state.manifestPromise = (async () => {
      const response = await fetch(
        state.baseUrl + "sounds.json?v=1.2.0",
        { cache: "no-store", mode: "cors" }
      );

      if (!response.ok) {
        throw new Error("Sound manifest load failed: HTTP " + response.status);
      }

      const manifest = await response.json();

      if (!manifest || !manifest.sounds || typeof manifest.sounds !== "object") {
        throw new Error("Invalid sound manifest");
      }

      state.manifest = manifest;
      return manifest;
    })().finally(() => {
      state.manifestPromise = null;
    });

    return state.manifestPromise;
  }

  async function load(name) {
    const soundName = String(name || "");
    if (!soundName) throw new Error("Sound name is required");

    if (state.buffers.has(soundName)) {
      return state.buffers.get(soundName);
    }

    if (state.loading.has(soundName)) {
      return state.loading.get(soundName);
    }

    const job = (async () => {
      const context = ensureContext();
      if (!context) throw new Error("AudioContext unavailable");

      const manifest = await loadManifest();
      const item = manifest.sounds[soundName];

      if (!item || !item.file) {
        throw new Error("Unknown sound: " + soundName);
      }

      const response = await fetch(
        state.baseUrl + item.file,
        { cache: "force-cache", mode: "cors" }
      );

      if (!response.ok) {
        throw new Error("Sound load failed: " + soundName + " HTTP " + response.status);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
      state.buffers.set(soundName, buffer);
      return buffer;
    })().finally(() => {
      state.loading.delete(soundName);
    });

    state.loading.set(soundName, job);
    return job;
  }

  function fallback(name) {
    if (!state.enabled) return false;

    const context = ensureContext();
    if (!context || !state.gain) return false;

    const item = state.manifest && state.manifest.sounds
      ? state.manifest.sounds[name]
      : null;
    const frequency = item && Number.isFinite(item.fallbackHz)
      ? item.fallbackHz
      : 720;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      oscillator.connect(gain);
      gain.connect(state.gain);
      oscillator.start(now);
      oscillator.stop(now + 0.09);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function play(name, options = {}) {
    if (!state.enabled && !options.force) return false;

    if (options.force && !state.enabled) {
      state.enabled = true;
    }

    // Run immediately before network awaits so the browser sees the user gesture.
    const context = unlock();
    if (!context || !state.gain) return false;

    try {
      const buffer = await load(name);

      if (context.state === "suspended") {
        await context.resume();
      }

      const source = context.createBufferSource();
      const localGain = context.createGain();

      source.buffer = buffer;
      source.playbackRate.value = Number.isFinite(options.rate)
        ? clamp(options.rate, 0.25, 4)
        : 1;
      localGain.gain.value = Number.isFinite(options.volume)
        ? clamp(options.volume, 0, 2)
        : 1;

      source.connect(localGain);
      localGain.connect(state.gain);

      state.activeSources.add(source);
      source.addEventListener("ended", () => {
        state.activeSources.delete(source);
        try { source.disconnect(); } catch (error) {}
        try { localGain.disconnect(); } catch (error) {}
      }, { once: true });

      source.start(0);
      return true;
    } catch (error) {
      console.warn("[HMAudio]", error);
      fallback(name);
      return false;
    }
  }

  async function preload(names) {
    if (!state.enabled) return [];
    unlock();
    return Promise.allSettled((names || []).map((name) => load(name)));
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    localStorage.setItem(STORE_KEY, state.enabled ? "1" : "0");

    if (state.enabled) {
      unlock();
    } else {
      stopAll();
    }

    return state.enabled;
  }

  function setVolume(value) {
    const volume = Number(value);
    if (!Number.isFinite(volume)) return state.volume;

    state.volume = clamp(volume, 0, 1);
    if (state.gain) {
      state.gain.gain.value = state.volume;
    }
    return state.volume;
  }

  function stopAll() {
    state.activeSources.forEach((source) => {
      try { source.stop(0); } catch (error) {}
    });
    state.activeSources.clear();
  }

  function clearCache() {
    state.manifest = null;
    state.manifestPromise = null;
    state.buffers.clear();
    state.loading.clear();
  }

  const api = {
    init({ baseUrl, volume = 0.75 } = {}) {
      const nextBaseUrl = normalizeBaseUrl(baseUrl);

      if (nextBaseUrl && nextBaseUrl !== state.baseUrl) {
        state.baseUrl = nextBaseUrl;
        clearCache();
      } else if (nextBaseUrl) {
        state.baseUrl = nextBaseUrl;
      }

      setVolume(volume);
      return api;
    },
    unlock,
    play,
    preload,
    setEnabled,
    setVolume,
    stopAll,
    clearCache,
    isEnabled: () => state.enabled,
    getVersion: () => VERSION
  };

  window.HMAudio = Object.freeze(api);
})();
