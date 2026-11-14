/** Digital metronome: tempo, subdivisions, accent, tap, and A440. */

import { createClock } from "./clock.js";
import { t } from "./i18n.js?v=22";

const MIN_BPM = 40;
const MAX_BPM = 208;
const MARKINGS = [
  { name: "Largo", bpm: 40 },
  { name: "Lento", bpm: 52 },
  { name: "Adagio", bpm: 72 },
  { name: "Andante", bpm: 92 },
  { name: "Moderato", bpm: 114 },
  { name: "Allegro", bpm: 138 },
  { name: "Presto", bpm: 184 },
  { name: "Prestissimo", bpm: 208 },
];

export function mountMetronome(root) {
  const clock = createClock();
  let bpm = 80;
  let beatsPerBar = 4;
  let subdivision = 1;
  let accent = true;
  let sound = true;
  let toneOn = false;
  let taps = [];
  let holdDelay = 0;
  let holdRepeat = 0;
  let shown = null;

  root.innerHTML = `
    <section class="metro">
      <div class="metro-face panel">
        <p class="eyebrow" id="metro-marking">Andante</p>
        <div class="tempo">
          <button type="button" id="metro-slower" data-action="metro-bpm" data-value="-1" aria-label="Slower">↓</button>
          <label class="bpm-field">
            <input id="metro-bpm" type="number" min="${MIN_BPM}" max="${MAX_BPM}" value="80" inputmode="numeric" aria-label="Tempo in beats per minute">
            <span>BPM</span>
          </label>
          <button type="button" id="metro-faster" data-action="metro-bpm" data-value="1" aria-label="Faster">↑</button>
        </div>
        <input id="metro-range" class="metro-range" type="range" min="${MIN_BPM}" max="${MAX_BPM}" value="80" aria-label="Tempo slider">
        <label class="marking-pick">
          <span class="control-label" id="metro-marking-label">Tempo marking</span>
          <select id="metro-marking-select" aria-label="Italian tempo marking">
            <option value="">Choose a marking</option>
            ${MARKINGS.map((item) => `<option value="${item.bpm}">${item.name} · ${item.bpm}</option>`).join("")}
          </select>
        </label>
        <div class="metro-transport">
          <button type="button" class="pill" id="metro-toggle" data-action="metro-toggle">Start</button>
          <button type="button" class="pill" id="metro-tap" data-action="metro-tap">Tap</button>
          <button type="button" id="metro-sound" data-action="metro-sound" aria-pressed="true">Click</button>
          <button type="button" id="metro-accent" data-action="metro-accent" aria-pressed="true">Accent downbeat</button>
          <button type="button" id="metro-a440" data-action="metro-a440" aria-pressed="false">A440</button>
        </div>
      </div>
      <div class="metro-visual panel">
        <div class="pendulum-box" aria-hidden="true"><div id="pendulum" class="pendulum"></div></div>
        <p id="metro-beat" class="now-note">Ready</p>
        <div id="metro-lamps" class="lamps" role="img" aria-label="Beat lights"></div>
        <div class="control-block">
          <span class="control-label" id="metro-time-label">Time</span>
          <div class="seg-control" role="group" aria-labelledby="metro-time-label">
            <button type="button" data-action="metro-time" data-value="2">2/4</button>
            <button type="button" data-action="metro-time" data-value="3">3/4</button>
            <button type="button" data-action="metro-time" data-value="4" aria-pressed="true">4/4</button>
            <button type="button" data-action="metro-time" data-value="6">6/8</button>
          </div>
        </div>
        <div class="control-block">
          <span class="control-label" id="metro-sub-label">Subdivision</span>
          <div class="seg-control" role="group" aria-labelledby="metro-sub-label">
            <button type="button" data-action="metro-sub" data-value="1" aria-pressed="true">Quarter</button>
            <button type="button" data-action="metro-sub" data-value="2">Eighth</button>
            <button type="button" data-action="metro-sub" data-value="3">Triplet</button>
            <button type="button" data-action="metro-sub" data-value="4">Sixteenth</button>
          </div>
        </div>
        <p class="fine" id="metro-fine">40 to 208 BPM. The lamp on beat 1 is the downbeat. Turn the click off and the lights still keep time. A440 is the tuning pitch.</p>
      </div>
    </section>
  `;

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onChange);
  root.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", stopHold);
  window.addEventListener("pointercancel", stopHold);
  renderFace();
  renderLamps();

  function markingName(value) {
    const bands = [
      [45, "Largo"],
      [60, "Lento"],
      [76, "Adagio"],
      [108, "Andante"],
      [120, "Moderato"],
      [168, "Allegro"],
      [200, "Presto"],
      [MAX_BPM, "Prestissimo"],
    ];
    return bands.find(([max]) => value <= max)?.[1] ?? "Prestissimo";
  }

  function setBpm(next, { fromTap = false } = {}) {
    bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(next)));
    clock.update({ bpm });
    if (!fromTap) taps = [];
    renderFace();
  }

  function applyCopy() {
    root.querySelector("#metro-slower").setAttribute("aria-label", t("tempo.slower"));
    root.querySelector("#metro-faster").setAttribute("aria-label", t("tempo.faster"));
    root.querySelector("#metro-bpm").setAttribute("aria-label", t("tempo.bpm"));
    root.querySelector("#metro-range").setAttribute("aria-label", t("tempo.slider"));
    root.querySelector("#metro-marking-label").textContent = t("tempo.marking");
    root.querySelector("#metro-marking-select").setAttribute("aria-label", t("tempo.italian"));
    root.querySelector("#metro-marking-select option[value='']").textContent = t("tempo.choose");
    root.querySelector("#metro-tap").textContent = t("metro.tap");
    root.querySelector("#metro-sound").textContent = t("metro.click");
    root.querySelector("#metro-accent").textContent = t("metro.accent");
    root.querySelector("#metro-time-label").textContent = t("metro.time");
    root.querySelector("#metro-sub-label").textContent = t("metro.subdivision");
    const subdivisions = { 1: "metro.quarter", 2: "metro.eighth", 3: "metro.triplet", 4: "metro.sixteenth" };
    root.querySelectorAll("[data-action='metro-sub']").forEach((button) => {
      button.textContent = t(subdivisions[button.dataset.value]);
    });
    root.querySelector("#metro-fine").textContent = t("metro.fine");
    root.querySelector("#metro-beat").textContent = beatText();
  }

  function beatText() {
    if (!shown) return t("metro.ready");
    const timeName = beatsPerBar === 6 ? "6/8" : `${beatsPerBar}/4`;
    if (shown.sub === 0) return t("metro.beat", { n: shown.beat + 1, time: timeName });
    return t("metro.division", { n: shown.beat + 1, sub: shown.sub + 1 });
  }

  function renderFace() {
    applyCopy();
    root.querySelector("#metro-marking").textContent = markingName(bpm);
    const number = root.querySelector("#metro-bpm");
    const range = root.querySelector("#metro-range");
    if (document.activeElement !== number) number.value = String(bpm);
    if (document.activeElement !== range) range.value = String(bpm);
    root.querySelector("#metro-toggle").textContent = clock.running ? t("metro.stop") : t("metro.start");
    root.querySelector("#metro-sound").setAttribute("aria-pressed", String(sound));
    root.querySelector("#metro-accent").setAttribute("aria-pressed", String(accent));
    root.querySelector("#metro-a440").setAttribute("aria-pressed", String(toneOn));
    root.querySelectorAll("[data-action='metro-time']").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.value) === beatsPerBar));
    });
    root.querySelectorAll("[data-action='metro-sub']").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.value) === subdivision));
    });
  }

  function renderLamps() {
    const timeName = beatsPerBar === 6 ? "6/8" : `${beatsPerBar}/4`;
    root.querySelector("#metro-lamps").innerHTML = Array.from({ length: beatsPerBar }, (_, beat) => (
      `<span class="beat-lamp${beat === 0 ? " down" : ""}" data-beat="${beat}"><b>${beat + 1}</b></span>`
    )).join("");
    root.querySelector("#metro-lamps").setAttribute("aria-label", t("metro.lamps", { time: timeName, n: beatsPerBar }));
  }

  function pulse(info) {
    const lamps = [...root.querySelectorAll(".beat-lamp")];
    lamps.forEach((lamp, beat) => {
      lamp.classList.toggle("lit", beat === info.beat);
      lamp.classList.toggle("tick", beat === info.beat && info.sub > 0);
    });
    shown = info;
    root.querySelector("#metro-beat").textContent = beatText();
    if (info.sub !== 0) return;
    const pendulum = root.querySelector("#pendulum");
    pendulum.style.setProperty("--beat", `${60 / bpm}s`);
    pendulum.classList.remove("left", "right");
    void pendulum.offsetWidth;
    pendulum.classList.add(info.beat % 2 ? "right" : "left");
  }

  function restartIfRunning() {
    const wasRunning = clock.running;
    if (wasRunning) clock.stop();
    renderLamps();
    renderFace();
    if (!wasRunning) return;
    clock.start({
      bpm,
      beatsPerBar,
      subdivision,
      accent,
      sound,
      onPulse: pulse,
    });
  }

  function toggle() {
    if (clock.running) {
      clock.stop();
      shown = null;
      root.querySelector("#metro-beat").textContent = beatText();
      root.querySelectorAll(".beat-lamp").forEach((lamp) => lamp.classList.remove("lit", "tick"));
      renderFace();
      return;
    }
    clock.start({
      bpm,
      beatsPerBar,
      subdivision,
      accent,
      sound,
      onPulse: pulse,
    });
    renderFace();
  }

  function tap() {
    const now = performance.now();
    taps = taps.filter((stamp) => now - stamp < 2200);
    taps.push(now);
    if (taps.length < 2) return;
    const gaps = taps.slice(1).map((stamp, tapIndex) => stamp - taps[tapIndex]);
    const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    setBpm(60000 / average, { fromTap: true });
  }

  function stopHold() {
    clearTimeout(holdDelay);
    clearInterval(holdRepeat);
  }

  function onPointerDown(event) {
    const target = event.target.closest("[data-action='metro-bpm']");
    if (!target || event.button !== 0) return;
    const delta = Number(target.dataset.value);
    setBpm(bpm + delta);
    stopHold();
    holdDelay = setTimeout(() => {
      holdRepeat = setInterval(() => setBpm(bpm + delta), 70);
    }, 320);
  }

  function onInput(event) {
    if (event.target.id === "metro-bpm" || event.target.id === "metro-range") {
      const next = Number(event.target.value);
      if (Number.isFinite(next)) setBpm(next);
    }
  }

  function onChange(event) {
    if (event.target.id !== "metro-marking-select") return;
    if (event.target.value) setBpm(Number(event.target.value));
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || !root.contains(target)) return;
    const { action, value } = target.dataset;
    if (action === "metro-bpm") return;
    if (action === "metro-toggle") {
      toggle();
      return;
    }
    if (action === "metro-tap") {
      tap();
      return;
    }
    if (action === "metro-sound") {
      sound = !sound;
      clock.update({ sound });
      renderFace();
      return;
    }
    if (action === "metro-accent") {
      accent = !accent;
      clock.update({ accent });
      renderFace();
      return;
    }
    if (action === "metro-a440") {
      toneOn = clock.toggleTone(!toneOn);
      renderFace();
      return;
    }
    if (action === "metro-time") {
      beatsPerBar = Number(value);
      restartIfRunning();
      return;
    }
    if (action === "metro-sub") {
      subdivision = Number(value);
      restartIfRunning();
    }
  }

  function stop() {
    clock.stop();
    if (toneOn) {
      clock.toggleTone(false);
      toneOn = false;
    }
    const beat = root.querySelector("#metro-beat");
    shown = null;
    if (beat) beat.textContent = beatText();
    root.querySelectorAll(".beat-lamp").forEach((lamp) => lamp.classList.remove("lit", "tick"));
    renderFace();
  }

  function refresh() {
    const lit = shown;
    renderLamps();
    renderFace();
    if (!lit) return;
    root.querySelectorAll(".beat-lamp").forEach((lamp, beat) => {
      lamp.classList.toggle("lit", beat === lit.beat);
      lamp.classList.toggle("tick", beat === lit.beat && lit.sub > 0);
    });
  }

  return { stop, refresh };
}
