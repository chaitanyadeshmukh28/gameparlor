// Tiny synthesized sound kit — no audio files, works offline. Every sound is
// generated live with the Web Audio API, so there are no assets to load and
// nothing to block on a strict CSP. Muting is remembered in localStorage.
//
// Browsers won't let audio start until the user interacts, so the context is
// created lazily and resumed on the first gesture (see armOnGesture()).

let ctx = null;
let muted = false;
try { muted = localStorage.getItem('bj-muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// A short tone with an exponential decay envelope.
function tone(freq, dur, { type = 'sine', gain = 0.18, glide = 0, delay = 0 } = {}) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + glide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Filtered noise burst — the papery "flick" of a dealt card.
function noise(dur, { gain = 0.14, freq = 1800, q = 0.8, delay = 0, hp = false } = {}) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = hp ? 'highpass' : 'bandpass';
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  get muted() { return muted; },
  setMuted(v) {
    muted = !!v;
    try { localStorage.setItem('bj-muted', muted ? '1' : '0'); } catch { /* ignore */ }
    if (!muted) tone(660, 0.06, { type: 'triangle', gain: 0.12 });
  },
  toggle() { this.setMuted(!muted); return muted; },
  // Resume the audio context on the first user gesture (autoplay policy).
  armOnGesture() {
    const kick = () => { ac(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
  },

  deal()  { noise(0.13, { freq: 1600, gain: 0.13 }); },
  flip()  { noise(0.16, { freq: 900, gain: 0.16, q: 1.2 }); tone(320, 0.12, { type: 'triangle', gain: 0.08, delay: 0.02 }); },
  chip()  { tone(1400, 0.05, { type: 'square', gain: 0.06 }); noise(0.05, { freq: 5200, gain: 0.05, hp: true }); },
  turn()  { tone(720, 0.1, { type: 'sine', gain: 0.14 }); tone(960, 0.12, { type: 'sine', gain: 0.1, delay: 0.09 }); },
  win()   { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.13, delay: i * 0.08 })); },
  blackjack() { [659, 880, 1047, 1319].forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.14, delay: i * 0.07 })); },
  lose()  { tone(300, 0.28, { type: 'sine', gain: 0.12, glide: -140 }); },
  bust()  { tone(220, 0.34, { type: 'sawtooth', gain: 0.12, glide: -120 }); noise(0.2, { freq: 500, gain: 0.08 }); },
  tick()  { tone(1200, 0.03, { type: 'square', gain: 0.05 }); },
};
