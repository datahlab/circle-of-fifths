/** Fretboard practice. The circle stays on the selected key and repeats a small group of notes. */

import { FLAT_NAMES, INLAY_FRETS, colorForPc, getKeyContext, instrumentSpec } from "./theory.js";
import { drawCircle } from "./circle.js?v=22";
import { createClock } from "./clock.js";
import { t } from "./i18n.js?v=22";

const MIN_BPM = 40;
const MAX_BPM = 208;
const CYCLE_PCS = [5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7, 0];

export function mountFretboard({ root, getState, playNote }) {
  const clock = createClock();
  let span = 1;
  let orderMode = "sequence";
  let focus = 0;
  let index = 0;
  let spotCursor = 0;
  let direction = 1;
  let bpm = MIN_BPM;
  let sound = false;
  let armed = false;
  let holdDelay = 0;
  let holdRepeat = 0;

  root.innerHTML = `
    <div class="practice">
      <div class="circle-card">
        <div id="practice-circle"></div>
        <p class="circle-hint" id="practice-circle-hint"></p>
      </div>
      <div class="practice-side">
        <h2 id="practice-step-title"></h2>
        <p id="practice-copy" class="key-blurb"></p>
        <div id="practice-span" class="pill-row"></div>
        <div id="practice-order" class="pill-row"></div>
        <div id="practice-groups" class="pill-row"></div>
        <p id="practice-caption"></p>
        <div id="practice-sequence" class="seq-row"></div>
        <div class="practice-actions">
          <button type="button" class="text-btn" id="practice-next" data-action="practice-next">Next note</button>
        </div>
      </div>
      <div class="neck-column">
        <div class="tempo" id="practice-tempo">
          <button type="button" id="practice-slower" data-action="practice-bpm" data-value="-1" aria-label="Slower">↓</button>
          <label class="bpm-field">
            <input id="practice-bpm" type="number" min="${MIN_BPM}" max="${MAX_BPM}" value="${MIN_BPM}" inputmode="numeric" aria-label="Tempo in beats per minute">
            <span>BPM</span>
          </label>
          <button type="button" id="practice-faster" data-action="practice-bpm" data-value="1" aria-label="Faster">↑</button>
          <span id="practice-lamp" class="lamp" aria-hidden="true"></span>
          <button type="button" id="practice-click" data-action="practice-click" aria-pressed="false">Metronome</button>
          <button type="button" id="practice-play" class="pill" data-action="practice-play">Play</button>
        </div>
        <p id="practice-sound-note" class="fine"></p>
        <div class="note-head">
          <p class="eyebrow" id="practice-count"></p>
          <p class="now-note" id="practice-note"></p>
        </div>
        <div class="neck-wrap">
          <div id="practice-neck"></div>
        </div>
        <p class="fine" id="practice-legend"></p>
      </div>
    </div>
  `;

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKey);
  root.addEventListener("input", onInput);
  root.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", stopHold);
  window.addEventListener("pointercancel", stopHold);
  paint();

  function noteAt(slot) {
    const pc = CYCLE_PCS[((slot % 12) + 12) % 12];
    return { pc, name: FLAT_NAMES[pc] };
  }

  function drill() {
    if (span === 12) return CYCLE_PCS.map((_, slot) => noteAt(slot));
    if (span === 1) return [noteAt(focus)];
    if (orderMode === "sequence") {
      return Array.from({ length: span }, (_, step) => noteAt(focus + step));
    }
    if (span === 2) return [noteAt(focus - 1), noteAt(focus)];
    return [noteAt(focus), noteAt(focus - 1), noteAt(focus + 1)];
  }

  function current() {
    const list = drill();
    return list[index] ?? list[0];
  }

  function strings() {
    return instrumentSpec(getState()).strings;
  }

  function spotsFor(pc) {
    const found = [];
    strings().forEach((string, stringIndex) => {
      for (let fret = 0; fret <= 12; fret += 1) {
        if ((string.midi + fret) % 12 === pc) {
          found.push({ stringIndex, fret, midi: string.midi + fret, name: string.name });
        }
      }
    });
    return found;
  }

  function resetPlace() {
    index = 0;
    spotCursor = 0;
    direction = 1;
    armed = false;
  }

  function onKey(event) {
    const target = event.target.closest?.("[data-action]");
    if (!target || !target.matches("path, circle")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || !root.contains(target)) return;
    const { action } = target.dataset;

    if (action === "practice-span") {
      span = Number(target.dataset.value);
      resetPlace();
      paint();
      return;
    }
    if (action === "practice-order") {
      orderMode = target.dataset.value;
      resetPlace();
      paint();
      return;
    }
    if (action === "practice-group") {
      focus = Number(target.dataset.focus);
      resetPlace();
      paint();
      return;
    }
    if (action === "practice-next") {
      focus = (focus + 1) % 12;
      resetPlace();
      paint();
      return;
    }
    if (action === "practice-bpm") return;
    if (action === "practice-click") {
      sound = !sound;
      clock.update({ sound, bpm });
      renderControls();
      return;
    }
    if (action === "practice-play") {
      togglePlay();
      return;
    }
    if (action === "practice-jump") {
      index = Number(target.dataset.index);
      spotCursor = 0;
      direction = 1;
      armed = false;
      renderDiagrams();
      return;
    }
    if (action === "practice-note") {
      chooseCircleNote(Number(target.dataset.pc));
      return;
    }
    if (action === "practice-hear") {
      playNote(Number(target.dataset.midi));
    }
  }

  function chooseCircleNote(pc) {
    if (span === 12) {
      const at = drill().findIndex((note) => note.pc === pc);
      if (at >= 0) index = at;
      spotCursor = 0;
      direction = 1;
      armed = false;
      renderDiagrams();
      return;
    }
    const slot = CYCLE_PCS.indexOf(pc);
    if (slot < 0) return;
    focus = slot;
    resetPlace();
    paint();
  }

  function togglePlay() {
    if (clock.running) {
      pause();
      return;
    }
    armed = false;
    root.querySelector("#practice-play").textContent = t("practice.pause");
    clock.start({
      bpm,
      sound,
      beatsPerBar: 1,
      subdivision: 1,
      accent: false,
      onPulse: () => {
        if (armed) advance();
        armed = true;
        renderDiagrams();
        flash();
      },
    });
  }

  function advance() {
    const count = spotsFor(current().pc).length;
    if (count <= 1) {
      nextNote();
      return;
    }
    const next = spotCursor + direction;
    if (next >= 0 && next < count) {
      spotCursor = next;
      return;
    }
    if (direction === 1) {
      direction = -1;
      spotCursor = count - 2;
      return;
    }
    const leaving = current().pc;
    nextNote();
    if (current().pc === leaving) {
      spotCursor = 1;
      direction = 1;
    }
  }

  function nextNote() {
    spotCursor = 0;
    direction = 1;
    index += 1;
    if (index >= drill().length) index = 0;
  }

  function pause() {
    clock.stop();
    armed = false;
    const play = root.querySelector("#practice-play");
    if (play) play.textContent = t("practice.play");
  }

  function bump(delta) {
    bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm + delta));
    clock.update({ bpm, sound });
    const input = root.querySelector("#practice-bpm");
    input.value = String(bpm);
  }

  function stopHold() {
    clearTimeout(holdDelay);
    clearInterval(holdRepeat);
  }

  function onPointerDown(event) {
    const target = event.target.closest?.("[data-action='practice-bpm']");
    if (!target || !root.contains(target) || event.button !== 0) return;
    const delta = Number(target.dataset.value);
    bump(delta);
    stopHold();
    holdDelay = setTimeout(() => {
      holdRepeat = setInterval(() => bump(delta), 70);
    }, 320);
  }

  function onInput(event) {
    if (event.target.id !== "practice-bpm") return;
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(next)));
    clock.update({ bpm, sound });
  }

  function flash() {
    const lamp = root.querySelector("#practice-lamp");
    lamp.classList.remove("lit");
    void lamp.offsetWidth;
    lamp.classList.add("lit");
  }

  function paint() {
    renderControls();
    renderDiagrams();
  }

  function keyTitle(ctx) {
    return `${ctx.rootName} ${t(ctx.quality === "major" ? "quality.major" : "quality.minor")}`;
  }

  function onInstrument() {
    const spec = instrumentSpec(getState());
    if (spec.id === "guitar") return t("instrument.onGuitar");
    return t("instrument.onBass", { n: spec.id.replace("bass", "") });
  }

  function renderControls() {
    const ctx = getKeyContext(getState());
    const list = drill();
    const names = list.map((note) => note.name).join(", ");
    root.querySelector("#practice-circle-hint").textContent = t("practice.hint");
    root.querySelector("#practice-legend").textContent = t("practice.legend");
    root.querySelector("#practice-slower").setAttribute("aria-label", t("tempo.slower"));
    root.querySelector("#practice-faster").setAttribute("aria-label", t("tempo.faster"));
    root.querySelector("#practice-bpm").setAttribute("aria-label", t("tempo.bpm"));
    root.querySelector("#practice-click").textContent = t("practice.metronome");
    root.querySelector("#practice-step-title").textContent = span === 1
      ? t("practice.one")
      : span === 12
        ? t("practice.twelve")
        : t("practice.n", { n: span });
    root.querySelector("#practice-copy").textContent = instructions(keyTitle(ctx), names);
    root.querySelector("#practice-span").innerHTML = [
      [1, t("practice.span1")],
      [2, t("practice.span2")],
      [3, t("practice.span3")],
      [12, t("practice.span12")],
    ].map(([value, label]) => (
      `<button type="button" class="pill" data-action="practice-span" data-value="${value}" aria-pressed="${span === value}">${label}</button>`
    )).join("");

    const orderRow = root.querySelector("#practice-order");
    orderRow.hidden = span === 1 || span === 12;
    orderRow.innerHTML = orderRow.hidden ? "" : [
      ["sequence", t("practice.sequence")],
      ["around", t("practice.around")],
    ].map(([value, label]) => (
      `<button type="button" class="pill" data-action="practice-order" data-value="${value}" aria-pressed="${orderMode === value}">${label}</button>`
    )).join("");

    const groupRow = root.querySelector("#practice-groups");
    groupRow.hidden = span === 12;
    groupRow.innerHTML = span === 12 ? "" : CYCLE_PCS.map((_, slot) => {
      const saved = focus;
      focus = slot;
      const label = drill().map((note) => note.name).join(" · ");
      focus = saved;
      return `<button type="button" class="pill" data-action="practice-group" data-focus="${slot}" aria-pressed="${slot === focus}">${label}</button>`;
    }).join("");

    root.querySelector("#practice-sequence").innerHTML = list.map((note, noteIndex) => (
      `<button type="button" class="seq-note" data-action="practice-jump" data-index="${noteIndex}" aria-pressed="${noteIndex === index}">${note.name}</button>`
    )).join("");

    const next = root.querySelector("#practice-next");
    next.hidden = span === 12;
    next.textContent = span === 1 ? t("practice.next") : t("practice.nextGroup");

    const click = root.querySelector("#practice-click");
    click.setAttribute("aria-pressed", String(sound));
    root.querySelector("#practice-sound-note").textContent = sound
      ? t("practice.clickOn")
      : t("practice.clickOff");
    const input = root.querySelector("#practice-bpm");
    if (document.activeElement !== input) input.value = String(bpm);
    root.querySelector("#practice-play").textContent = clock.running ? t("practice.pause") : t("practice.play");
  }

  function instructions(title, names) {
    const parked = t("practice.parked", { title });
    if (span === 1) return t("practice.copy1", { names, parked });
    if (span === 12) return t("practice.copy12", { parked });
    if (orderMode === "sequence") return t("practice.copySeq", { names, parked });
    if (span === 2) return t("practice.copy2", { names, parked });
    return t("practice.copy3", { names, parked });
  }

  function renderDiagrams() {
    const ctx = getKeyContext(getState());
    const note = current();
    const list = drill();
    const spots = spotsFor(note.pc);
    const active = spots.length ? Math.min(spotCursor, spots.length - 1) : 0;
    const spot = spots[active];
    drawCircle(root.querySelector("#practice-circle"), {
      index: ctx.index,
      quality: ctx.quality,
      enharmonicFlat: true,
      activePcs: new Set(list.map((item) => item.pc)),
      includeMinor: false,
      currentPc: note.pc,
      colorForPc,
      hub: {
        root: ctx.rootName,
        quality: t(ctx.quality === "major" ? "quality.major" : "quality.minor"),
        signature: span === 12 ? `${index + 1}/12` : list.map((item) => item.name).join(" "),
      },
      action: "practice-note",
      label: t("practice.circle", { title: keyTitle(ctx), notes: list.map((item) => item.name).join(", ") }),
    });

    drawNeck(spots, note, active);

    const where = spot
      ? t("practice.where", { string: spot.name, place: spot.fret === 0 ? t("place.open") : t("place.fret", { fret: spot.fret }) })
      : t("practice.neck");
    const travel = spots.length > 1 && direction < 0 ? t("practice.back") : t("practice.forward");
    root.querySelector("#practice-count").textContent = t("practice.count", {
      title: keyTitle(ctx),
      names: list.map((item) => item.name).join(" "),
      n: active + 1,
      total: spots.length,
      travel,
    });
    root.querySelector("#practice-note").textContent = note.name;
    root.querySelector("#practice-caption").textContent = t("practice.caption", { note: note.name, where });
    root.querySelectorAll(".seq-note").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.index) === index));
    });
  }

  function drawNeck(spots, note, activeIndex) {
    const specStrings = strings();
    const count = specStrings.length;
    const gutter = 56;
    const gap = 64;
    const nutY = 78;
    const fretGap = 46;
    const width = gutter + Math.max(0, count - 1) * gap + 36;
    const height = nutY + 12 * fretGap + 20;
    const xOf = (stringIndex) => gutter + stringIndex * gap;
    const svg = svgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      class: "vneck-svg",
      role: "group",
      "aria-label": t("practice.neckAria", { note: note.name, place: onInstrument() }),
    });

    const board = svgEl("rect", {
      class: "vboard",
      x: gutter - 30,
      y: nutY,
      width: width - (gutter - 30) - 8,
      height: height - nutY - 8,
      rx: 16,
    });
    svg.append(board);
    svg.append(svgEl("rect", {
      class: "vnut",
      x: gutter - 30,
      y: nutY - 5,
      width: width - (gutter - 30) - 8,
      height: 8,
      rx: 2,
    }));

    for (let fret = 1; fret <= 12; fret += 1) {
      const y = nutY + fret * fretGap;
      svg.append(svgEl("line", {
        class: "vfret",
        x1: gutter - 30,
        x2: width - 8,
        y1: y,
        y2: y,
      }));
    }

    specStrings.forEach((string, stringIndex) => {
      const x = xOf(stringIndex);
      svg.append(svgEl("line", {
        class: "vstring",
        x1: x,
        x2: x,
        y1: nutY,
        y2: height - 10,
        "stroke-width": stringIndex === 0 ? 3.2 : 2.1,
      }));
      const name = svgEl("text", { class: "vstring-name", x, y: 24, "text-anchor": "middle" });
      name.textContent = string.name;
      svg.append(name);
      const oct = svgEl("text", { class: "vstring-oct", x, y: 42, "text-anchor": "middle" });
      oct.textContent = String(Math.floor(string.midi / 12) - 1);
      svg.append(oct);
    });

    INLAY_FRETS.forEach((fret) => {
      const y = nutY + (fret - 0.5) * fretGap;
      inlayXs(count, fret, xOf).forEach((x) => {
        svg.append(svgEl("circle", { class: "vinlay", cx: x, cy: y, r: 5 }));
      });
      const label = svgEl("text", {
        class: "vfretnum",
        x: 18,
        y,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
      label.textContent = String(fret);
      svg.append(label);
    });

    spots.forEach((spot, spotIndex) => {
      const y = spot.fret === 0 ? nutY : nutY + (spot.fret - 0.5) * fretGap;
      const currentBeat = spotIndex === activeIndex;
      const dot = svgEl("circle", {
        class: currentBeat ? "vdot now" : "vdot",
        cx: xOf(spot.stringIndex),
        cy: y,
        r: currentBeat ? 16 : 9,
        "data-action": "practice-hear",
        "data-midi": spot.midi,
        role: "button",
        tabindex: "0",
        "aria-current": currentBeat ? "true" : "false",
        "aria-label": t("practice.dot", {
          prefix: currentBeat ? t("practice.thisBeat") : "",
          note: note.name,
          string: spot.name,
          place: spot.fret === 0 ? t("place.open") : t("place.fret", { fret: spot.fret }),
        }),
      });
      svg.append(dot);
    });

    root.querySelector("#practice-neck").replaceChildren(svg);
  }

  function sync() {
    const list = drill();
    if (index >= list.length) index = 0;
    const count = spotsFor(current().pc).length;
    if (count === 0 || spotCursor >= count || spotCursor < 0) {
      spotCursor = 0;
      direction = 1;
    }
    renderControls();
    renderDiagrams();
  }

  return { sync, pause, paint };
}

function inlayXs(count, fret, xOf) {
  if (fret !== 12 || count < 4) {
    return [(xOf(0) + xOf(count - 1)) / 2];
  }
  return [(xOf(0) + xOf(1)) / 2, (xOf(count - 2) + xOf(count - 1)) / 2];
}

function svgEl(name, attrs) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}
