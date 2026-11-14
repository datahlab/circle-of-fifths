/** Shared beat clock for the fretboard exercises and the metronome. */

export function createClock() {
  let ctx = null;
  let timer = 0;
  let next = 0;
  let running = false;
  let beat = 0;
  let sub = 0;
  let tone = null;
  const timeouts = [];
  const config = {
    bpm: 40,
    beatsPerBar: 4,
    subdivision: 1,
    accent: true,
    sound: true,
    onPulse: () => {},
  };

  function ensure() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function interval() {
    return 60 / config.bpm / config.subdivision;
  }

  function clickAt(time, strong) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(strong ? 1760 : 1046, time);
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.03);
    gain.gain.setValueAtTime(strong ? 0.3 : 0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  function lookahead() {
    if (!running || !ctx) return;
    const now = ctx.currentTime;
    if (next < now - 0.05) next = now + 0.02;
    const horizon = now + 0.12;
    while (next < horizon) {
      const strong = config.accent && sub === 0 && beat === 0;
      if (config.sound) clickAt(next, strong);
      const info = { beat, sub, accent: strong };
      const delay = Math.max(0, (next - now) * 1000);
      const id = setTimeout(() => {
        const at = timeouts.indexOf(id);
        if (at >= 0) timeouts.splice(at, 1);
        if (running) config.onPulse(info);
      }, delay);
      timeouts.push(id);
      next += interval();
      sub += 1;
      if (sub >= config.subdivision) {
        sub = 0;
        beat = (beat + 1) % config.beatsPerBar;
      }
    }
  }

  function start(partial = {}) {
    Object.assign(config, partial);
    const audio = ensure();
    if (!audio) return;
    if (running) return;
    running = true;
    next = audio.currentTime + 0.05;
    beat = 0;
    sub = 0;
    timer = setInterval(lookahead, 25);
    lookahead();
  }

  function update(partial) {
    Object.assign(config, partial);
  }

  function stop() {
    running = false;
    clearInterval(timer);
    timeouts.splice(0).forEach((id) => clearTimeout(id));
  }

  function toggleTone(on) {
    const audio = ensure();
    if (!audio) return false;
    if (tone) {
      tone.stop();
      tone.disconnect();
      tone = null;
    }
    if (!on) return false;
    tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = 440;
    tone.type = "sine";
    gain.gain.value = 0.12;
    tone.connect(gain).connect(audio.destination);
    tone.start();
    return true;
  }

  return {
    start,
    update,
    stop,
    toggleTone,
    get running() {
      return running;
    },
  };
}
