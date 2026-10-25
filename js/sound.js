/** Plucked guitar and electric-bass tones for note, scale, and chord playback. */

const cache = new Map();

export function createPlayer() {
  let ctx = null;
  let output = null;
  let voices = [];

  function ensure() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) {
      ctx = new Ctx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 3.2;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.22;
      const makeup = ctx.createGain();
      makeup.gain.value = 0.9;
      compressor.connect(makeup).connect(ctx.destination);
      output = compressor;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function silence() {
    if (!ctx || voices.length === 0) return;
    const now = ctx.currentTime;
    voices.forEach((voice) => {
      const gain = voice.gain.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
      gain.linearRampToValueAtTime(0.0001, now + 0.045);
      voice.source.stop(now + 0.06);
    });
    voices = [];
  }

  function play(midis, mode, instrument) {
    const audio = ensure();
    if (!audio || midis.length === 0) return;
    silence();
    const bass = instrument === "bass";
    const notes = mode === "chord" ? [...midis].sort((a, b) => a - b) : midis;
    const now = audio.currentTime + 0.02;
    const gap = mode === "chord" ? (bass ? 0.034 : 0.016) : mode === "line" ? (bass ? 0.36 : 0.3) : 0;
    const level = mode === "chord" ? 0.55 : mode === "line" ? 0.8 : 1;

    notes.forEach((midi, index) => {
      const source = audio.createBufferSource();
      source.buffer = cachedPluck(audio, midi, instrument);
      const gain = audio.createGain();
      gain.gain.value = level;
      source.connect(gain).connect(output);
      const start = now + index * gap;
      source.start(start);
      voices.push({ source, gain });
    });
  }

  return { play };
}

function cachedPluck(ctx, midi, instrument) {
  const key = `${ctx.sampleRate}:${instrument}:${midi}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const samples = synthesizePluck(ctx.sampleRate, midi, instrument);
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  cache.set(key, buffer);
  return buffer;
}

export function synthesizePluck(sampleRate, midi, instrument) {
  const bass = instrument === "bass";
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const seconds = bass ? 3.1 : 2.45;
  const length = Math.floor(sampleRate * seconds);
  const tone = pluckString(sampleRate, length, freq, bass);
  if (bass) {
    addBassBody(tone, sampleRate, freq);
  } else {
    const shimmer = pluckString(sampleRate, length, freq * 2 ** (4 / 1200), false);
    for (let i = 0; i < length; i += 1) tone[i] = tone[i] * 0.74 + shimmer[i] * 0.26;
    addPick(tone, sampleRate);
  }
  shapeBody(tone, sampleRate, bass);
  reflect(tone, sampleRate, bass);
  fadeEdges(tone, sampleRate);
  normalize(tone, 0.82);
  return tone;
}

function pluckString(sampleRate, length, freq, bass) {
  const period = sampleRate / freq;
  const size = Math.ceil(period) + 3;
  const line = new Float32Array(size);
  const burst = new Float32Array(size);
  const pickAt = Math.max(1, Math.round(period * (bass ? 0.3 : 0.11)));
  for (let i = 0; i < size; i += 1) {
    const window = Math.sin((Math.PI * (i + 0.5)) / size);
    burst[i] = (Math.random() * 2 - 1) * window;
  }
  for (let i = 0; i < size; i += 1) {
    const earlier = i - pickAt;
    line[i] = burst[i] - (earlier >= 0 ? burst[earlier] * 0.85 : 0);
  }

  const t60 = bass
    ? clamp(2.7 - (freq - 50) / 220, 1.5, 3.2)
    : clamp(2.05 - (freq - 100) / 700, 0.75, 2.3);
  const sampleGain = Math.exp(Math.log(0.001) / (sampleRate * t60));
  const damp = bass ? 0.48 : 0.16;
  const out = new Float32Array(length);
  let write = 0;
  let prev = 0;
  for (let i = 0; i < length; i += 1) {
    let read = write - period;
    while (read < 0) read += size;
    const base = Math.floor(read);
    const frac = read - base;
    const i0 = base % size;
    const i1 = (i0 + 1) % size;
    const sample = line[i0] * (1 - frac) + line[i1] * frac;
    const filtered = sample * (1 - damp) + prev * damp;
    prev = filtered;
    line[write] = filtered * sampleGain;
    write = (write + 1) % size;
    out[i] = sample;
  }
  return out;
}

function addBassBody(samples, sampleRate, freq) {
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / sampleRate;
    const thump = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2.6);
    const growl = Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 5.5);
    samples[i] = samples[i] * 0.72 + thump * 0.4 + growl * 0.08;
  }
}

function addPick(samples, sampleRate) {
  const click = Math.floor(sampleRate * 0.008);
  for (let i = 0; i < click && i < samples.length; i += 1) {
    const env = 1 - i / click;
    samples[i] += (Math.random() * 2 - 1) * env * env * 0.35;
  }
}

function shapeBody(samples, sampleRate, bass) {
  if (bass) {
    biquad(samples, sampleRate, "peaking", 80, 1.1, 5);
    biquad(samples, sampleRate, "peaking", 180, 0.9, 3);
    biquad(samples, sampleRate, "lowpass", 2200, 0.7, 0);
    biquad(samples, sampleRate, "highpass", 35, 0.7, 0);
    return;
  }
  biquad(samples, sampleRate, "peaking", 110, 1.05, 3.5);
  biquad(samples, sampleRate, "peaking", 230, 1.1, 2.5);
  biquad(samples, sampleRate, "highshelf", 3200, 0.7, 2.2);
  biquad(samples, sampleRate, "lowpass", 6500, 0.7, 0);
  biquad(samples, sampleRate, "highpass", 70, 0.7, 0);
}

function reflect(samples, sampleRate, bass) {
  const taps = bass
    ? [[0.011, 0.12], [0.019, 0.06]]
    : [[0.012, 0.16], [0.02, 0.09], [0.034, 0.045]];
  const dry = samples.slice();
  taps.forEach(([delay, amount]) => {
    const offset = Math.floor(delay * sampleRate);
    for (let i = offset; i < samples.length; i += 1) samples[i] += dry[i - offset] * amount;
  });
}

function fadeEdges(samples, sampleRate) {
  const attack = Math.floor(sampleRate * 0.0015);
  for (let i = 0; i < attack; i += 1) samples[i] *= i / attack;
  const release = Math.floor(sampleRate * 0.04);
  for (let i = 0; i < release; i += 1) samples[samples.length - 1 - i] *= i / release;
}

function normalize(samples, peakTarget) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak === 0) return;
  const gain = peakTarget / peak;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= gain;
}

function biquad(samples, sampleRate, type, freq, q, gainDb) {
  const w0 = 2 * Math.PI * Math.min(freq, sampleRate * 0.45) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cos = Math.cos(w0);
  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;
  if (type === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else if (type === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else if (type === "highshelf") {
    const A = 10 ** (gainDb / 40);
    const twoSqrtAAlpha = 2 * Math.sqrt(A) * alpha;
    b0 = A * (A + 1 + (A - 1) * cos + twoSqrtAAlpha);
    b1 = -2 * A * (A - 1 + (A + 1) * cos);
    b2 = A * (A + 1 + (A - 1) * cos - twoSqrtAAlpha);
    a0 = A + 1 - (A - 1) * cos + twoSqrtAAlpha;
    a1 = 2 * (A - 1 - (A + 1) * cos);
    a2 = A + 1 - (A - 1) * cos - twoSqrtAAlpha;
  } else {
    const A = 10 ** (gainDb / 40);
    b0 = 1 + alpha * A;
    b1 = -2 * cos;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cos;
    a2 = 1 - alpha / A;
  }
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i];
    const y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    samples[i] = y;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
