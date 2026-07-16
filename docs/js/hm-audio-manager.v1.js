/*
 * Healing Mart Audio Manager v1.1.0 Unified
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
    manifestPromise: null,
    buffers: new Map(),
    loading: new Map(),
    active: new Map(),
    lastPlayed: new Map(),
    maxVoices: 24,
    voiceCount: 0
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

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

    if (state.manifestPromise) {
      return state.manifestPromise;
    }

    state.manifestPromise = (async () => {
      const response = await fetch(`${state.baseUrl}sounds.json`, {
        cache: "force-cache"
      });

      if (!response.ok) {
        throw new Error("Sound manifest load failed");
      }

      state.manifest = await response.json();
      return state.manifest;
    })();

    try {
      return await state.manifestPromise;
    } finally {
      state.manifestPromise = null;
    }
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

  function registerSource(name, source) {
    if (!state.active.has(name)) {
      state.active.set(name, new Set());
    }

    state.active.get(name).add(source);
    state.voiceCount += 1;

    source.addEventListener("ended", () => {
      const set = state.active.get(name);

      if (set) {
        set.delete(source);

        if (set.size === 0) {
          state.active.delete(name);
        }
      }

      state.voiceCount = Math.max(0, state.voiceCount - 1);
    }, { once: true });
  }

  function stop(name) {
    const set = state.active.get(name);

    if (!set) {
      return 0;
    }

    let stopped = 0;

    set.forEach((source) => {
      try {
        source.stop();
        stopped += 1;
      } catch (error) {
        // 이미 종료된 소스는 무시합니다.
      }
    });

    state.active.delete(name);
    return stopped;
  }

  function stopAll() {
    let stopped = 0;

    Array.from(state.active.keys()).forEach((name) => {
      stopped += stop(name);
    });

    return stopped;
  }

  function fallback(name, item) {
    if (!state.enabled) {
      return;
    }

    const context = ensureContext();

    if (!context || !state.gain) {
      return;
    }

    const frequency = item && item.fallbackHz ? item.fallbackHz : 720;
    const oscillator = context.createOscillator();
    const localGain = context.createGain();
    const now = context.currentTime;

    oscillator.type = frequency < 300 ? "triangle" : "sine";
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

    let item = null;

    try {
      const manifest = await loadManifest();
      item = manifest.sounds[name];

      if (!item) {
        throw new Error(`Unknown sound: ${name}`);
      }

      const nowMs = performance.now();
      const cooldownMs = Number.isFinite(options.cooldownMs)
        ? Math.max(0, options.cooldownMs)
        : Math.max(0, Number(item.cooldownMs) || 0);
      const previousMs = state.lastPlayed.get(name) || 0;

      if (!options.force && cooldownMs > 0 && nowMs - previousMs < cooldownMs) {
        return false;
      }

      if (state.voiceCount >= state.maxVoices && !options.force) {
        return false;
      }

      state.lastPlayed.set(name, nowMs);

      const context = ensureContext();
      const buffer = await load(name);
      const source = context.createBufferSource();
      const localGain = context.createGain();
      const defaultVolume = Number.isFinite(item.defaultVolume)
        ? item.defaultVolume
        : 1;
      const requestedVolume = Number.isFinite(options.volume)
        ? options.volume
        : defaultVolume;

      localGain.gain.value = clamp(requestedVolume, 0, 2);
      source.buffer = buffer;
      source.playbackRate.value = Number.isFinite(options.rate)
        ? clamp(options.rate, 0.1, 4)
        : 1;
      source.loop = Boolean(options.loop);

      source.connect(localGain);
      localGain.connect(state.gain);
      source.start(0, Number.isFinite(options.offset) ? Math.max(0, options.offset) : 0);
      registerSource(name, source);
      return true;
    } catch (error) {
      fallback(name, item);
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

  async function preloadCategory(category) {
    if (!state.enabled) {
      return [];
    }

    const manifest = await loadManifest();
    const names = Object.keys(manifest.sounds).filter((name) => {
      return manifest.sounds[name].category === category;
    });

    return preload(names);
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    storeEnabled(state.enabled);

    if (state.enabled) {
      ensureContext();
    } else {
      stopAll();
    }

    return state.enabled;
  }

  function setVolume(value) {
    if (!Number.isFinite(value)) {
      return state.volume;
    }

    state.volume = clamp(value, 0, 1);

    if (state.gain) {
      state.gain.gain.value = state.volume;
    }

    return state.volume;
  }

  function setMaxVoices(value) {
    if (Number.isFinite(value)) {
      state.maxVoices = Math.max(1, Math.floor(value));
    }

    return state.maxVoices;
  }

  function resetCache() {
    stopAll();
    state.buffers.clear();
    state.loading.clear();
    state.manifest = null;
    state.manifestPromise = null;
  }

  window.HMAudio = Object.freeze({
    init({ baseUrl, volume = 0.75, maxVoices = 24 } = {}) {
      state.baseUrl = String(baseUrl || "").replace(/\/?$/, "/");
      setVolume(volume);
      setMaxVoices(maxVoices);

      if (state.enabled) {
        ensureContext();
      }

      return this;
    },
    unlock: ensureContext,
    play,
    preload,
    preloadCategory,
    stop,
    stopAll,
    setEnabled,
    setVolume,
    setMaxVoices,
    resetCache,
    getManifest: loadManifest,
    isEnabled: () => state.enabled,
    getVolume: () => state.volume
  });
})();
