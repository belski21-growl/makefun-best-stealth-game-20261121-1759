// Synthesised sound, no audio files: footsteps, the alert sting, the shard chime
// and the win arpeggio, all from one WebAudio graph built on the first gesture.

export function createAudio() {
  let ctx = null;
  let master = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, duration, type, volume, when = 0) {
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
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function noiseBurst(duration, volume, frequency) {
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
    gain.connect(master);
    source.start();
  }

  return {
    /** Call on the first key or click so the browser unlocks audio. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') void ctx.resume();
    },
    /** A soft step; wardens' steps are called with distance-based volume. */
    step(volume) {
      if (!ctx || volume <= 0.01) return;
      noiseBurst(0.06, volume, 900);
    },
    pebble() {
      if (!ctx) return;
      noiseBurst(0.12, 0.5, 2400);
      tone(1800, 0.08, 'sine', 0.12, 0.05);
    },
    shard() {
      if (!ctx) return;
      tone(880, 0.18, 'sine', 0.25);
      tone(1318, 0.28, 'sine', 0.2, 0.07);
    },
    alert() {
      if (!ctx) return;
      tone(220, 0.22, 'sawtooth', 0.22);
      tone(311, 0.3, 'sawtooth', 0.22, 0.16);
    },
    caught() {
      if (!ctx) return;
      tone(196, 0.4, 'sawtooth', 0.25);
      tone(147, 0.6, 'sawtooth', 0.25, 0.25);
    },
    win() {
      if (!ctx) return;
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.35, 'sine', 0.22, i * 0.12));
    },
  };
}
