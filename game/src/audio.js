// Synthesised sound, no audio files: footsteps, the pebble clatter, the
// shard chime, the alert sting, the caught descent and the win arpeggio —
// all from one WebAudio graph built on the first gesture.

const WIN_NOTES = [523, 659, 784, 1046];
const WIN_STEP = 0.12;

export function createAudio() {
  let ctx = null;
  let bus = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      bus = ctx.createGain();
      bus.gain.value = 0.35;
      bus.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function blip(frequency, duration, type, volume, when = 0) {
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function hiss(duration, volume, frequency) {
    if (!ctx) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    source.start();
  }

  return {
    // Call on the first key or click so the browser unlocks audio.
    unlock() {
      if (ensure() && ctx.state === 'suspended') void ctx.resume();
    },
    // A soft step; wardens' steps are called with distance-based volume.
    step(volume) {
      if (!ctx || volume <= 0.01) return;
      hiss(0.06, volume, 900);
    },
    pebble() {
      if (!ctx) return;
      hiss(0.12, 0.5, 2400);
      blip(1800, 0.08, 'sine', 0.12, 0.05);
    },
    shard() {
      if (!ctx) return;
      blip(880, 0.18, 'sine', 0.25);
      blip(1318, 0.28, 'sine', 0.2, 0.07);
    },
    alert() {
      if (!ctx) return;
      blip(220, 0.22, 'sawtooth', 0.22);
      blip(311, 0.3, 'sawtooth', 0.22, 0.16);
    },
    caught() {
      if (!ctx) return;
      blip(196, 0.4, 'sawtooth', 0.25);
      blip(147, 0.6, 'sawtooth', 0.25, 0.25);
    },
    win() {
      if (!ctx) return;
      WIN_NOTES.forEach((freq, i) => blip(freq, 0.35, 'sine', 0.22, i * WIN_STEP));
    },
  };
}
