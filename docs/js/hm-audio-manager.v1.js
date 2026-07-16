/*
 Healing Mart Audio Manager v1.0.0
 Original work by Healing Mart
*/
(() => {
  "use strict";
  const STORE_KEY = "hm-mini-game-sound-enabled";
  const state = {
    enabled: localStorage.getItem(STORE_KEY) !== "0",
    baseUrl: "", context: null, gain: null, manifest: null,
    buffers: new Map(), loading: new Map()
  };
  function ensureContext() {
    if (!state.enabled) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!state.context) {
      state.context = new AC();
      state.gain = state.context.createGain();
      state.gain.gain.value = .75;
      state.gain.connect(state.context.destination);
    }
    if (state.context.state === "suspended") state.context.resume().catch(() => {});
    return state.context;
  }
  async function loadManifest() {
    if (state.manifest) return state.manifest;
    const response = await fetch(state.baseUrl + "sounds.json", {cache:"force-cache"});
    if (!response.ok) throw new Error("Sound manifest load failed");
    state.manifest = await response.json();
    return state.manifest;
  }
  async function load(name) {
    if (state.buffers.has(name)) return state.buffers.get(name);
    if (state.loading.has(name)) return state.loading.get(name);
    const job = (async () => {
      const context = ensureContext();
      if (!context) throw new Error("AudioContext unavailable");
      const manifest = await loadManifest();
      const item = manifest.sounds[name];
      if (!item) throw new Error("Unknown sound: " + name);
      const response = await fetch(state.baseUrl + item.file, {cache:"force-cache"});
      if (!response.ok) throw new Error("Sound load failed: " + name);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      state.buffers.set(name, buffer);
      state.loading.delete(name);
      return buffer;
    })();
    state.loading.set(name, job);
    return job;
  }
  function fallback(name) {
    if (!state.enabled) return;
    const context = ensureContext();
    if (!context || !state.gain) return;
    const item = state.manifest && state.manifest.sounds[name];
    const frequency = item && item.fallbackHz ? item.fallbackHz : 720;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.035, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .09);
    osc.connect(gain); gain.connect(state.gain);
    osc.start(now); osc.stop(now + .09);
  }
  async function play(name, options={}) {
    if (!state.enabled) return false;
    try {
      const context = ensureContext();
      const buffer = await load(name);
      const source = context.createBufferSource();
      const localGain = context.createGain();
      localGain.gain.value = Number.isFinite(options.volume) ? options.volume : 1;
      source.buffer = buffer;
      source.playbackRate.value = Number.isFinite(options.rate) ? options.rate : 1;
      source.connect(localGain); localGain.connect(state.gain); source.start();
      return true;
    } catch (error) {
      fallback(name);
      return false;
    }
  }
  async function preload(names) {
    ensureContext();
    await Promise.allSettled((names || []).map(load));
  }
  function setEnabled(value) {
    state.enabled = Boolean(value);
    localStorage.setItem(STORE_KEY,state.enabled ? "1" : "0");
    if (state.enabled) ensureContext();
    return state.enabled;
  }
  window.HMAudio = Object.freeze({
    init({baseUrl,volume=.75}={}) {
      state.baseUrl = String(baseUrl || "").replace(/\/?$/,"/");
      const context = ensureContext();
      if (context && state.gain) state.gain.gain.value = Math.max(0,Math.min(1,volume));
      return this;
    },
    unlock:ensureContext, play, preload, setEnabled,
    isEnabled:() => state.enabled
  });
})();