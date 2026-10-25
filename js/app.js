import {
  CIRCLE,
  DEGREE_COLOR,
  FRET_COUNT,
  INLAY_FRETS,
  SCALE_GROUPS,
  SCALES,
  arpeggioFor,
  chordSteps,
  chordVoicing,
  colorForPc,
  gaugeFor,
  getKeyContext,
  inlaySpans,
  ink,
  instrumentSpec,
  nameForPitchClass,
  orderedStrings,
  playbackRoot,
  soundingName,
  spelledOctave,
} from "./theory.js";
import { createPlayer } from "./sound.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const state = {
  instrument: "guitar",
  bassStrings: 4,
  index: 0,
  quality: "major",
  scaleId: "major",
  arpIndex: 0,
  enharmonicFlat: false,
  lowOnTop: false,
  hideOutsideKey: false,
};

const player = createPlayer();
let pendingFocus = false;

const circleMount = document.querySelector("#circle");
const keyPanel = document.querySelector("#key-panel");
const chromaticSection = document.querySelector("#chromatic-section");
const scaleSection = document.querySelector("#scale-section");
const arpSection = document.querySelector("#arp-section");
const chordSection = document.querySelector("#chord-section");
const stringControl = document.querySelector("#string-control");
const stringHint = document.querySelector("#string-hint");

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, value, index, quality } = target.dataset;

  if (action === "instrument") {
    state.instrument = value;
    render();
    return;
  }
  if (action === "strings") {
    state.bassStrings = Number(value);
    render();
    return;
  }
  if (action === "flip") {
    state.lowOnTop = value === "low";
    render();
    return;
  }
  if (action === "hide-outside") {
    state.hideOutsideKey = !state.hideOutsideKey;
    render();
    return;
  }
  if (action === "key") {
    selectKey(Number(index), quality);
    return;
  }
  if (action === "relative") {
    selectKey(state.index, state.quality === "major" ? "minor" : "major");
    return;
  }
  if (action === "enharmonic") {
    state.enharmonicFlat = !state.enharmonicFlat;
    render();
    return;
  }
  if (action === "scale") {
    state.scaleId = value;
    render();
    return;
  }
  if (action === "arp") {
    state.arpIndex = Number(index);
    render();
    return;
  }
  if (action === "note") {
    playMidis([Number(target.dataset.midi)], "note");
    return;
  }
  if (action === "chord") {
    const root = playbackRoot(state.instrument, Number(target.dataset.pc));
    const midis = chordSteps(target.dataset.quality).map((step) => root + step);
    playMidis(midis, "chord");
    return;
  }
  if (action === "play-scale") {
    const ctx = getKeyContext(state);
    const root = playbackRoot(state.instrument, ctx.rootPc);
    const midis = [...ctx.scale.intervals.map((step) => root + step), root + 12];
    playMidis(midis, "line");
    return;
  }
  if (action === "play-arp") {
    const ctx = getKeyContext(state);
    const chord = ctx.chords[state.arpIndex] ?? ctx.chords[0];
    const arp = arpeggioFor(chord);
    const root = playbackRoot(state.instrument, chord.pc);
    const midis = [...arp.intervals.map((step) => root + step), root + 12];
    playMidis(midis, "line");
    return;
  }
  if (action === "play-voicing") {
    playMidis(target.dataset.midis.split(",").map(Number), "chord");
  }
});

document.addEventListener("keydown", (event) => {
  const segment = event.target.closest?.("[data-action='key']");
  if (!segment) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectKey(Number(segment.dataset.index), segment.dataset.quality);
    return;
  }

  const moves = {
    ArrowRight: [1, state.quality],
    ArrowLeft: [-1, state.quality],
    ArrowDown: [0, "minor"],
    ArrowUp: [0, "major"],
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  pendingFocus = true;
  const nextIndex = (state.index + move[0] + CIRCLE.length) % CIRCLE.length;
  selectKey(nextIndex, move[1]);
});

function selectKey(index, quality) {
  state.index = index;
  state.quality = quality;
  if (!CIRCLE[index].altMajor) state.enharmonicFlat = false;
  state.scaleId = quality === "major" ? "major" : "naturalMinor";
  state.arpIndex = 0;
  render();
}

function render() {
  const ctx = getKeyContext(state);
  syncControls();
  renderCircle(ctx);
  renderKeyPanel(ctx);
  renderChromatic(ctx);
  renderScale(ctx);
  renderArpeggio(ctx);
  renderChords(ctx);
  if (pendingFocus) {
    pendingFocus = false;
    circleMount
      .querySelector(`[data-action="key"][data-index="${state.index}"][data-quality="${state.quality}"]`)
      ?.focus();
  }
}

function syncControls() {
  document.querySelectorAll("[data-action='instrument']").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.value === state.instrument));
  });
  document.querySelectorAll("[data-action='strings']").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.value) === state.bassStrings));
  });
  document.querySelectorAll("[data-action='flip']").forEach((button) => {
    const pressed = state.lowOnTop ? button.dataset.value === "low" : button.dataset.value === "high";
    button.setAttribute("aria-pressed", String(pressed));
  });
  stringControl.hidden = state.instrument !== "bass";
  if (state.instrument === "bass") {
    const hints = {
      4: "E1 · A1 · D2 · G2",
      5: "Adds a low B0 under the E string.",
      6: "Adds a low B0 and a high C3.",
    };
    stringHint.textContent = hints[state.bassStrings];
  }
}

function renderCircle(ctx) {
  const size = 640;
  const cx = 320;
  const cy = 320;
  const outerR = 300;
  const splitR = 196;
  const innerR = 108;
  const svg = svgEl("svg", {
    viewBox: `0 0 ${size} ${size}`,
    role: "group",
    "aria-label": `Circle of fifths. ${ctx.title} selected. Outer ring majors, inner ring relative minors.`,
  });

  CIRCLE.forEach((entry, index) => {
    const [a0, a1] = segmentAngles(index);
    const majorColor = colorForPc(entry.majorPc);
    const minorColor = colorForPc(entry.minorPc);
    const majorInKey = ctx.keyPcs.has(entry.majorPc);
    const minorInKey = ctx.keyPcs.has(entry.minorPc);

    svg.append(
      segmentPath(cx, cy, splitR, outerR, a0, a1, {
        index,
        quality: "major",
        color: majorColor,
        inKey: majorInKey,
        selected: state.index === index && state.quality === "major",
        label: spoken(`${entry.major} major`),
      }),
    );
    svg.append(
      segmentPath(cx, cy, innerR, splitR, a0, a1, {
        index,
        quality: "minor",
        color: minorColor,
        inKey: minorInKey,
        selected: state.index === index && state.quality === "minor",
        label: spoken(`${entry.minor.slice(0, -1)} minor`),
      }),
    );

    appendLabel(svg, cx, cy, (outerR + splitR) / 2, (a0 + a1) / 2, entry, "major", majorColor, majorInKey);
    appendLabel(svg, cx, cy, (splitR + innerR) / 2, (a0 + a1) / 2, entry, "minor", minorColor, minorInKey);
  });

  CIRCLE.forEach((entry, index) => {
    const [a0, a1] = segmentAngles(index);
    if (state.index === index && state.quality === "major") {
      svg.append(ringPath(cx, cy, splitR, outerR, a0, a1));
    }
    if (state.index === index && state.quality === "minor") {
      svg.append(ringPath(cx, cy, innerR, splitR, a0, a1));
    }
  });

  svg.append(svgEl("circle", { cx, cy, r: innerR - 6, class: "hub" }));
  svg.append(hubText(cx, cy - 16, ctx.rootName, "hub-root"));
  svg.append(hubText(cx, cy + 22, ctx.qualityName, "hub-quality"));
  svg.append(hubText(cx, cy + 48, ctx.signatureCompact, "hub-sig"));

  circleMount.replaceChildren(svg);
}

function appendLabel(svg, cx, cy, radius, angle, entry, quality, color, inKey) {
  const pairs = quality === "major"
    ? entry.altMajor
      ? [entry.major, entry.altMajor]
      : [entry.major]
    : entry.altMinor
      ? [entry.minor, entry.altMinor]
      : [entry.minor];
  const primaryIsAlt = Boolean(state.enharmonicFlat && entry.altMajor);
  const labels = pairs.length === 2 && primaryIsAlt ? [pairs[1], pairs[0]] : pairs;
  const fill = inKey ? ink(color) : "#f6f1e7";

  if (labels.length === 1) {
    svg.append(wedgeLabel(cx, cy, radius, angle, labels[0], fill, inKey, false));
    return;
  }

  svg.append(wedgeLabel(cx, cy, radius + 12, angle, labels[0], fill, inKey, false));
  svg.append(wedgeLabel(cx, cy, radius - 14, angle, labels[1], fill, inKey, true));
}

function wedgeLabel(cx, cy, radius, angle, value, fill, inKey, alt) {
  const [x, y] = polar(cx, cy, radius, angle);
  const text = svgEl("text", {
    x: x.toFixed(2),
    y: y.toFixed(2),
    class: `seg-label${alt ? " alt" : ""}${inKey ? "" : " dim"}`,
    fill,
    "aria-hidden": "true",
  });
  text.textContent = value;
  return text;
}

function renderKeyPanel(ctx) {
  const relativeBlurb = ctx.quality === "major"
    ? `${ctx.relativeTitle} uses the same notes, with the root on ${ctx.relativeRoot}.`
    : `${ctx.relativeTitle} uses the same notes. This key moves the root to ${ctx.rootName}.`;

  const accidentalLine = ctx.accidentals.length
    ? ctx.accidentals.map((name) => `<span class="acc">${name}</span>`).join("")
    : `<span class="acc quiet">None</span>`;

  const noteChips = ctx.keyNotes.map((note) => chip(note.name, colorForPc(note.pc), note.pc === ctx.rootPc, note.degree === "R" ? "Root" : note.degree)).join("");
  const chordChips = ctx.chords.map((chord) => {
    const color = colorForPc(chord.pc);
    return `<button type="button" class="chord" data-action="chord" data-pc="${chord.pc}" data-quality="${chord.quality}" style="--c:${color};--ink:${ink(color)}" aria-label="Play ${spoken(chord.symbol)}, ${chord.roman}">
      <span class="rn">${chord.roman}</span>
      <span class="sym">${chord.symbol}</span>
    </button>`;
  }).join("");

  const enharmonic = ctx.hasEnharmonic
    ? `<button type="button" class="text-btn" data-action="enharmonic">${ctx.enharmonicFlat ? "Show as F♯ / D♯ minor" : "Show as G♭ / E♭ minor"}</button>`
    : "";

  keyPanel.innerHTML = `
    <article class="panel key-card">
      <header class="key-head">
        <p class="eyebrow">Selected key</p>
        <h2>${ctx.title}</h2>
        <p class="key-blurb">${relativeBlurb}</p>
        <button type="button" class="text-btn" data-action="relative">Switch to ${ctx.relativeTitle}</button>
        ${enharmonic}
      </header>
      <div class="facts">
        <div>
          <h3>Key signature</h3>
          <p>${ctx.signatureLabel}</p>
          <div class="acc-row">${accidentalLine}</div>
        </div>
        <div>
          <h3>Notes in the key</h3>
          <p>Root, plus every note that belongs to ${ctx.title}.</p>
          <div class="chip-row">${noteChips}</div>
        </div>
      </div>
      <div>
        <h3>Diatonic chords</h3>
        <p class="fine">Click a chord to hear it.</p>
        <div class="chord-row">${chordChips}</div>
      </div>
    </article>
  `;
}

function renderChromatic(ctx) {
  const spec = instrumentSpec(state);
  const strings = orderedStrings(state);
  chromaticSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">Full neck</p>
        <h2>All notes in ${ctx.title}</h2>
        <p>${spec.label}, ${spec.detail}. ${tuningLine(strings)}. ${state.lowOnTop ? "Low string on top, as you look at the neck while playing." : "High string on top."}</p>
      </div>
      <button type="button" class="pill neck-toggle" data-action="hide-outside" aria-pressed="${state.hideOutsideKey}">
        ${state.hideOutsideKey ? "Show notes outside the key" : "Hide notes outside the key"}
      </button>
    </header>
    <div class="legend">
      <span><i class="swatch root" style="--c:${ctx.color}"></i> Root ${ctx.rootName}</span>
      <span><i class="swatch" style="--c:${colorForPc(ctx.keyNotes[1].pc)}"></i> Other notes in the key</span>
      ${state.hideOutsideKey ? "" : `<span><i class="swatch out" style="--c:${colorForPc((ctx.rootPc + 1) % 12)}"></i> Outside the key</span>`}
    </div>
    <p class="fine">${state.hideOutsideKey
      ? `Only the root and the other notes of ${ctx.title} are shown.`
      : `Every pitch keeps the color it has on the circle. Bright notes are the root and the rest of ${ctx.title}.`}</p>
    ${neckMarkup({
      neck: "chromatic",
      strings,
      fretCount: FRET_COUNT,
      cell(pc, string, fret) {
        const name = nameForPitchClass(pc, ctx.keyNotes, ctx.preferFlats);
        const inKey = ctx.keyPcs.has(pc);
        const isRoot = pc === ctx.rootPc;
        const color = colorForPc(pc);
        const midi = string.midi + fret;
        const octave = spelledOctave(midi, name);
        const simple = soundingName(pc, ctx.preferFlats);
        const sounds = simple !== name ? ` Sounds as ${simple}.` : "";
        const place = fret === 0 ? "open" : `fret ${fret}`;
        return {
          show: inKey || !state.hideOutsideKey,
          className: `bubble ${inKey ? "in" : "out"}${isRoot ? " root" : ""}`,
          color,
          label: isRoot ? `<span class="deg">R</span><span class="nm">${name}</span>` : `<span class="nm">${name}</span>`,
          attrs: `data-action="note" data-midi="${midi}" data-pc="${pc}" data-fret="${fret}" data-in-key="${inKey}" data-root="${isRoot}" data-name="${name}" aria-label="${spoken(name)}${octave}, ${string.label} string, ${place}.${inKey ? " In the key." : ""}${isRoot ? " Root." : ""}${sounds}"`,
        };
      },
    })}
  `;
}

function renderScale(ctx) {
  const spec = instrumentSpec(state);
  const strings = orderedStrings(state);
  const groups = SCALE_GROUPS.map((group) => {
    const pills = SCALES.filter((scale) => scale.group === group).map((scale) => {
      const pressed = scale.id === ctx.scale.id;
      const aka = scale.aka && scale.aka !== "ascending" ? ` title="${scale.aka}"` : "";
      return `<button type="button" class="pill" data-action="scale" data-value="${scale.id}" aria-pressed="${pressed}"${aka}>${scale.name}</button>`;
    }).join("");
    return `<div class="pill-group"><span>${group}</span><div class="pills">${pills}</div></div>`;
  }).join("");

  const degreeChips = ctx.scaleNotes.map((note) => {
    const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
    return `<span class="degree-chip" style="--c:${color};--ink:${ink(color)}"><b>${note.degree}</b> ${note.name}</span>`;
  }).join("");

  const doubles = ctx.scaleNotes.some((note) => /[𝄪𝄫]/.test(note.name));

  scaleSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">Scale neck</p>
        <h2>${ctx.scaleTitle}</h2>
        <p>Every position of this scale on the ${spec.label.toLowerCase()}. Degrees stay the same color on every string.</p>
      </div>
      <button type="button" class="play" data-action="play-scale">Play scale</button>
    </header>
    <div class="scale-picker">${groups}</div>
    <div class="degree-row">${degreeChips}</div>
    <p class="pattern">${ctx.pattern.join(" · ")}</p>
    ${doubles ? `<p class="fine">Accidentals follow the key. A double sharp or double flat is the theoretical spelling of that degree.</p>` : ""}
    ${neckMarkup({
      neck: "scale",
      strings,
      fretCount: FRET_COUNT,
      cell(pc, string, fret) {
        const note = ctx.scaleNotes.find((item) => item.pc === pc);
        if (!note) return { show: false };
        const midi = string.midi + fret;
        const octave = spelledOctave(midi, note.name);
        const place = fret === 0 ? "open" : `fret ${fret}`;
        const isRoot = note.degree === "R";
        const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
        return {
          show: true,
          className: `bubble scale${isRoot ? " root" : ""}`,
          color,
          label: `<span class="deg">${note.degree}</span><span class="nm">${note.name}</span>`,
          attrs: `data-action="note" data-midi="${midi}" data-pc="${pc}" data-fret="${fret}" data-degree="${note.degree}" data-name="${note.name}" data-root="${isRoot}" aria-label="${note.degree}, ${spoken(note.name)}${octave}, ${string.label} string, ${place}"`,
        };
      },
    })}
  `;
}

function renderArpeggio(ctx) {
  const spec = instrumentSpec(state);
  const strings = orderedStrings(state);
  const chord = ctx.chords[state.arpIndex] ?? ctx.chords[0];
  const arp = arpeggioFor(chord);
  const picks = ctx.chords.map((item, i) => {
    const color = colorForPc(item.pc);
    const pressed = i === ctx.chords.indexOf(chord);
    return `<button type="button" class="chord" data-action="arp" data-index="${i}" aria-pressed="${pressed}" style="--c:${color};--ink:${ink(color)}" aria-label="${item.roman}, ${spoken(item.symbol)} arpeggio">
      <span class="rn">${item.roman}</span>
      <span class="sym">${item.symbol}</span>
    </button>`;
  }).join("");
  const degreeChips = arp.notes.map((note) => {
    const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
    return `<span class="degree-chip" style="--c:${color};--ink:${ink(color)}"><b>${note.degree}</b> ${note.name}</span>`;
  }).join("");

  arpSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">Arpeggio neck</p>
        <h2>${chord.symbol} · ${chord.roman}</h2>
        <p>Every position of this triad from ${ctx.title} on the ${spec.label.toLowerCase()}. R is the chord root.</p>
      </div>
      <button type="button" class="play" data-action="play-arp">Play arpeggio</button>
    </header>
    <div class="chord-row">${picks}</div>
    <div class="degree-row">${degreeChips}</div>
    <p class="pattern">${arp.pattern.join(" · ")}</p>
    ${neckMarkup({
      neck: "arpeggio",
      strings,
      fretCount: FRET_COUNT,
      cell(pc, string, fret) {
        const note = arp.notes.find((item) => item.pc === pc);
        if (!note) return { show: false };
        const midi = string.midi + fret;
        const octave = spelledOctave(midi, note.name);
        const place = fret === 0 ? "open" : `fret ${fret}`;
        const isRoot = note.degree === "R";
        const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
        return {
          show: true,
          className: `bubble scale${isRoot ? " root" : ""}`,
          color,
          label: `<span class="deg">${note.degree}</span><span class="nm">${note.name}</span>`,
          attrs: `data-action="note" data-midi="${midi}" data-pc="${pc}" data-fret="${fret}" data-degree="${note.degree}" data-name="${note.name}" data-root="${isRoot}" aria-label="${note.degree}, ${spoken(note.name)}${octave}, ${string.label} string, ${place}"`,
        };
      },
    })}
  `;
}

function renderChords(ctx) {
  const spec = instrumentSpec(state);
  const strings = orderedStrings(state);
  const cards = ctx.chords.map((chord) => {
    const voicing = chordVoicing(spec.strings, chord);
    if (!voicing) return "";
    const placed = new Map(voicing.notes.map((note) => [`${note.stringMidi}:${note.fret}`, note]));
    const muted = new Set(voicing.mutedMidis);
    const frets = [];
    for (let fret = voicing.min; fret <= voicing.max; fret += 1) frets.push(fret);
    const where = voicing.min === 0
      ? `Open ${voicing.name}`
      : voicing.barre
        ? `${voicing.name}, barre at fret ${voicing.min}`
        : `${voicing.name}, starts at fret ${voicing.min}`;
    const columns = fretColumns(frets);
    return `
      <article class="chord-diagram">
        <header class="chord-diagram-head">
          <div>
            <p class="chord-title">${chord.symbol} · ${chord.roman}</p>
            <p class="chord-shape">${where}</p>
          </div>
          <button type="button" class="play" data-action="play-voicing" data-midis="${voicing.notes.map((note) => note.midi).join(",")}" aria-label="Play ${spoken(chord.symbol)} chord">Play chord</button>
        </header>
        ${neckMarkup({
          neck: "chord",
          className: "chord-neck",
          strings,
          frets,
          columns,
          cell(pc, string, fret) {
            const note = placed.get(`${string.midi}:${fret}`);
            if (!note) return { show: false, mute: muted.has(string.midi) };
            const octave = spelledOctave(note.midi, note.name);
            const place = fret === 0 ? "open" : `fret ${fret}`;
            const isRoot = note.degree === "R";
            const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
            return {
              show: true,
              className: `bubble scale${isRoot ? " root" : ""}`,
              color,
              label: `<span class="deg">${note.degree}</span><span class="nm">${note.name}</span>`,
              attrs: `data-action="note" data-midi="${note.midi}" data-pc="${pc}" data-fret="${fret}" data-degree="${note.degree}" data-name="${note.name}" data-root="${isRoot}" aria-label="${note.degree}, ${spoken(note.name)}${octave}, ${string.label} string, ${place}"`,
            };
          },
        })}
      </article>
    `;
  }).join("");

  chordSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">Chord necks</p>
        <h2>Chords in ${ctx.title}</h2>
        <p>A playable shape for each triad in the key, on the ${spec.label.toLowerCase()}. × marks a string that stays quiet.</p>
      </div>
    </header>
    <div class="chord-list">${cards}</div>
  `;
}

function fretColumns(frets) {
  const tracks = frets.map((fret, index) => (index === 0 && fret === 0 ? "minmax(76px, 1.15fr)" : "minmax(62px, 1fr)"));
  return `64px ${tracks.join(" ")}`;
}

function neckMarkup({ neck, className = "", strings, fretCount = FRET_COUNT, frets, columns, cell }) {
  const fretNums = frets ?? Array.from({ length: fretCount + 1 }, (_, index) => index);
  const nums = [`<span class="num corner">${fretNums[0] === 0 ? "Fret" : `Fret ${fretNums[0]}`}</span>`];
  fretNums.forEach((fret) => {
    if (fret === 0) {
      nums.push(`<span class="num open-num">Open</span>`);
      return;
    }
    const inlay = INLAY_FRETS.includes(fret) ? " inlay-num" : "";
    nums.push(`<span class="num${inlay}">${fret}</span>`);
  });

  const dotHosts = new Set();
  fretNums.forEach((fret) => {
    if (fret < 1) return;
    inlaySpans(strings.length, fret).forEach(([start]) => {
      if (start >= 0 && start < strings.length) dotHosts.add(`${start}:${fret}`);
    });
  });

  const rows = strings.map((string, stringIndex) => {
    const gauge = gaugeFor(string.midi, strings);
    const cells = [`<span class="str-label">${string.label}</span>`];
    fretNums.forEach((fret) => {
      const pc = (string.midi + fret) % 12;
      const view = cell(pc, string, fret);
      const open = fret === 0 ? " open" : "";
      const marker = view.show
        ? `<button type="button" class="${view.className}" style="--c:${view.color};--ink:${ink(view.color)}" ${view.attrs}>${view.label}</button>`
        : view.mute && fret === fretNums[0]
          ? `<span class="mute" role="img" aria-label="Muted string">×</span>`
          : "";
      const dot = dotHosts.has(`${stringIndex}:${fret}`) ? `<span class="inlay"></span>` : "";
      cells.push(`<div class="cell${open}" style="--gauge:${gauge}" data-string="${string.label}" data-fret="${fret}">${dot}${marker}</div>`);
    });
    return cells.join("");
  }).join("");

  const trackStyle = columns ? ` style="grid-template-columns:${columns}"` : "";
  const extra = className ? ` ${className}` : "";
  return `
    <div class="neck-scroll${extra}" data-neck="${neck}">
      <div class="nums"${trackStyle}>${nums.join("")}</div>
      <div class="board" style="--strings:${strings.length}${columns ? `;grid-template-columns:${columns}` : ""}">
        ${rows}
      </div>
    </div>
  `;
}

function chip(name, color, isRoot, degree) {
  return `<span class="chip${isRoot ? " root" : ""}" style="--c:${color};--ink:${ink(color)}" title="${degree}"><b>${name}</b></span>`;
}

function tuningLine(strings) {
  const lowToHigh = state.lowOnTop ? strings : [...strings].reverse();
  return lowToHigh.map((string) => string.label).join(" · ");
}

function playMidis(midis, mode) {
  player.play(midis, mode, state.instrument);
}

function segmentAngles(index) {
  const center = -90 + (index - state.index) * 30;
  const half = 14.35;
  const deg = Math.PI / 180;
  return [(center - half) * deg, (center + half) * deg];
}

function polar(cx, cy, radius, angle) {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function sectorPath(cx, cy, rInner, rOuter, a0, a1) {
  const [x0, y0] = polar(cx, cy, rOuter, a0);
  const [x1, y1] = polar(cx, cy, rOuter, a1);
  const [x2, y2] = polar(cx, cy, rInner, a1);
  const [x3, y3] = polar(cx, cy, rInner, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
}

function segmentPath(cx, cy, rInner, rOuter, a0, a1, meta) {
  const path = svgEl("path", {
    d: sectorPath(cx, cy, rInner, rOuter, a0, a1),
    class: `seg${meta.inKey ? "" : " dim"}${meta.selected ? " selected" : ""}`,
    fill: meta.color,
    "data-action": "key",
    "data-index": meta.index,
    "data-quality": meta.quality,
    "data-selected": meta.selected ? "true" : "false",
    role: "button",
    tabindex: meta.selected ? "0" : "-1",
    "aria-pressed": meta.selected ? "true" : "false",
    "aria-label": meta.label,
  });
  return path;
}

function ringPath(cx, cy, rInner, rOuter, a0, a1) {
  return svgEl("path", {
    d: sectorPath(cx, cy, rInner + 3, rOuter - 3, a0 + 0.01, a1 - 0.01),
    class: "seg-ring",
  });
}

function hubText(x, y, value, className) {
  const text = svgEl("text", { x, y, class: className, "text-anchor": "middle" });
  text.textContent = value;
  return text;
}

function svgEl(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) node.setAttribute(key, String(value));
  });
  return node;
}

function spoken(name) {
  return name
    .replaceAll("𝄪", " double sharp")
    .replaceAll("𝄫", " double flat")
    .replaceAll("♯", " sharp")
    .replaceAll("♭", " flat");
}

render();
