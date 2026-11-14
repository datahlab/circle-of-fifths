import {
  BASS_FRET_COUNT,
  CIRCLE,
  DEGREE_COLOR,
  FRET_COUNT,
  SCALE_GROUPS,
  SCALES,
  arpeggioFor,
  chordSteps,
  chordVoicings,
  colorForPc,
  gaugeFor,
  getKeyContext,
  inlaySpans,
  ink,
  isInlay,
  instrumentSpec,
  nameForPitchClass,
  orderedStrings,
  playbackRoot,
  soundingName,
  spelledOctave,
} from "./theory.js?v=23";
import { drawCircle, spoken } from "./circle.js?v=22";
import { createPlayer } from "./sound.js";
import { mountFretboard } from "./fretboard.js?v=22";
import { mountMetronome } from "./metronome.js?v=22";
import { getLang, onLang, setLang, t } from "./i18n.js?v=23";

const state = {
  view: "circle",
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
const fretboard = mountFretboard({
  root: document.querySelector("#view-fretboard"),
  getState: () => state,
  playNote: (midi) => player.play([midi], "note", state.instrument),
});
const metronome = mountMetronome(document.querySelector("#view-metronome"));

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, value, index, quality } = target.dataset;

  if (action === "tab") {
    setTab(value);
    return;
  }
  if (action === "lang") {
    setLang(value);
    return;
  }
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
  fretboard.sync();
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
      5: t("hint.5"),
      6: t("hint.6"),
    };
    stringHint.textContent = hints[state.bassStrings];
  }
  applyChrome();
}

function applyStaticCopy() {
  document.title = t("docTitle");
  document.querySelector(".app-tabs").setAttribute("aria-label", t("nav.sections"));
  document.querySelector("#tab-circle").textContent = t("tab.circle");
  document.querySelector("#tab-fretboard").textContent = t("tab.fretboard");
  document.querySelector("#tab-metronome").textContent = t("tab.metronome");
  document.querySelector("#lang-switch").setAttribute("aria-label", t("lang.group"));
  document.querySelectorAll("[data-action='lang']").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.value === getLang()));
  });
  document.querySelector("#instrument-label").textContent = t("ctrl.instrument");
  document.querySelector("[data-action='instrument'][data-value='guitar']").textContent = t("instrument.guitar");
  document.querySelector("[data-action='instrument'][data-value='bass']").textContent = t("instrument.bass");
  document.querySelector("#strings-label").textContent = t("ctrl.strings");
  document.querySelector("[data-action='strings'][data-value='4']").textContent = t("strings.4");
  document.querySelector("[data-action='strings'][data-value='5']").textContent = t("strings.5");
  document.querySelector("[data-action='strings'][data-value='6']").textContent = t("strings.6");
  document.querySelector("#order-label").textContent = t("ctrl.order");
  document.querySelector("[data-action='flip'][data-value='low']").textContent = t("order.low");
  document.querySelector("[data-action='flip'][data-value='high']").textContent = t("order.high");
  document.querySelector("#circle-hint").textContent = t("circle.hint");
  document.querySelector("#site-footer-copy").textContent = t("footer");
}

function keyTitle(ctx) {
  return `${ctx.rootName} ${t(ctx.quality === "major" ? "quality.major" : "quality.minor")}`;
}

function relativeTitle(ctx) {
  return `${ctx.relativeRoot} ${t(ctx.relativeQuality === "major" ? "quality.major" : "quality.minor")}`;
}

function signatureText(ctx) {
  if (ctx.count === 0) return t("sig.none");
  const word = ctx.accidental === "sharp"
    ? t(ctx.count === 1 ? "sig.sharp" : "sig.sharps")
    : t(ctx.count === 1 ? "sig.flat" : "sig.flats");
  return `${ctx.count} ${word}`;
}

function onInstrument(spec) {
  if (spec.id === "guitar") return t("instrument.onGuitar");
  return t("instrument.onBass", { n: spec.id.replace("bass", "") });
}

function neckFretCount() {
  return state.instrument === "bass" ? BASS_FRET_COUNT : FRET_COUNT;
}

function instrumentLine(spec) {
  if (spec.id === "guitar") return { label: t("instrument.guitar"), detail: t("tuning.standard") };
  const n = spec.id.replace("bass", "");
  const detail = n === "4" ? t("tuning.bass") : n === "5" ? t("tuning.bass5") : t("tuning.bass6");
  return { label: t("instrument.bassN", { n }), detail };
}

function scaleLabel(scale) {
  return t(`scale.${scale.id}`);
}

function scaleHeading(ctx) {
  const name = scaleLabel(ctx.scale);
  if (!ctx.scale.aka) return `${ctx.rootName} ${name}`;
  return `${ctx.rootName} ${name} (${t(`aka.${ctx.scale.aka}`)})`;
}

function formatSteps(pattern) {
  return pattern.map((step) => {
    const key = `step.${step}`;
    const value = t(key);
    return value === key ? step : value;
  }).join(" · ");
}

function placeName(fret) {
  return fret === 0 ? t("place.open") : t("place.fret", { fret });
}

function describeShape(voicing) {
  const stringShape = voicing.name.match(/^([A-G])-string shape$/);
  const letterShape = voicing.name.match(/^([A-G]) shape$/);
  const letter = (stringShape || letterShape)?.[1] ?? "";
  const shape = stringShape ? t("shape.string", { letter }) : t("shape.letter", { letter });
  if (voicing.min === 0) return t("shape.open", { shape });
  if (voicing.barre) return t("shape.barre", { shape, fret: voicing.min });
  return t("shape.start", { shape, fret: voicing.min });
}

function applyChrome() {
  const view = state.view;
  document.querySelectorAll("[data-action='tab']").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.value === view));
  });
  document.querySelector("#view-circle").hidden = view !== "circle";
  document.querySelector("#view-fretboard").hidden = view !== "fretboard";
  document.querySelector("#view-metronome").hidden = view !== "metronome";
  document.querySelector("#flip-control").hidden = view !== "circle";
  document.querySelector("#instrument-block").hidden = view === "metronome";
  if (view === "metronome") stringControl.hidden = true;
  applyStaticCopy();
  document.querySelector("#page-eyebrow").textContent = t(`page.${view}.eyebrow`);
  document.querySelector("#page-title").textContent = t(`page.${view}.title`);
  document.querySelector("#page-lede").textContent = t(`page.${view}.lede`);
}

function setTab(view) {
  if (!["circle", "fretboard", "metronome"].includes(view) || view === state.view) return;
  if (view !== "fretboard") fretboard.pause();
  if (view !== "metronome") metronome.stop();
  state.view = view;
  applyChrome();
  if (view === "fretboard") fretboard.sync();
}

function renderCircle(ctx) {
  drawCircle(circleMount, {
    index: state.index,
    quality: state.quality,
    enharmonicFlat: state.enharmonicFlat,
    activePcs: ctx.keyPcs,
    colorForPc,
    hub: {
      root: ctx.rootName,
      quality: t(ctx.quality === "major" ? "quality.major" : "quality.minor"),
      signature: ctx.count === 0 ? t("sig.natural") : ctx.signatureCompact,
    },
    label: t("circle.label", { title: keyTitle(ctx) }),
  });
}

function renderKeyPanel(ctx) {
  const title = keyTitle(ctx);
  const relative = relativeTitle(ctx);
  const relativeBlurb = ctx.quality === "major"
    ? t("key.relativeMajor", { relative, root: ctx.relativeRoot })
    : t("key.relativeMinor", { relative, root: ctx.rootName });

  const accidentalLine = ctx.accidentals.length
    ? ctx.accidentals.map((name) => `<span class="acc">${name}</span>`).join("")
    : `<span class="acc quiet">${t("sig.noneMark")}</span>`;

  const noteChips = ctx.keyNotes.map((note) => chip(note.name, colorForPc(note.pc), note.pc === ctx.rootPc, note.degree === "R" ? t("degree.root") : note.degree)).join("");
  const chordChips = ctx.chords.map((chord) => {
    const color = colorForPc(chord.pc);
    return `<button type="button" class="chord" data-action="chord" data-pc="${chord.pc}" data-quality="${chord.quality}" style="--c:${color};--ink:${ink(color)}" aria-label="${t("key.playChord", { symbol: spoken(chord.symbol), roman: chord.roman })}">
      <span class="rn">${chord.roman}</span>
      <span class="sym">${chord.symbol}</span>
    </button>`;
  }).join("");

  const enharmonic = ctx.hasEnharmonic
    ? `<button type="button" class="text-btn" data-action="enharmonic">${ctx.enharmonicFlat ? t("key.showSharp") : t("key.showFlat")}</button>`
    : "";

  keyPanel.innerHTML = `
    <article class="panel key-card">
      <header class="key-head">
        <p class="eyebrow">${t("key.selected")}</p>
        <h2>${title}</h2>
        <p class="key-blurb">${relativeBlurb}</p>
        <button type="button" class="text-btn" data-action="relative">${t("key.switch", { title: relative })}</button>
        ${enharmonic}
      </header>
      <div class="facts">
        <div>
          <h3>${t("key.signature")}</h3>
          <p>${signatureText(ctx)}</p>
          <div class="acc-row">${accidentalLine}</div>
        </div>
        <div>
          <h3>${t("key.notes")}</h3>
          <p>${t("key.notesBlurb", { title })}</p>
          <div class="chip-row">${noteChips}</div>
        </div>
      </div>
      <div>
        <h3>${t("key.chords")}</h3>
        <p class="fine">${t("key.chordsBlurb")}</p>
        <div class="chord-row">${chordChips}</div>
      </div>
    </article>
  `;
}

function renderChromatic(ctx) {
  const spec = instrumentSpec(state);
  const named = instrumentLine(spec);
  const strings = orderedStrings(state);
  const title = keyTitle(ctx);
  chromaticSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">${t("neck.full")}</p>
        <h2>${t("neck.all", { title })}</h2>
        <p>${t("neck.summary", {
          label: named.label,
          detail: named.detail,
          tuning: tuningLine(strings),
          order: state.lowOnTop ? t("order.lowLong") : t("order.highLong"),
        })}</p>
      </div>
      <button type="button" class="pill neck-toggle" data-action="hide-outside" aria-pressed="${state.hideOutsideKey}">
        ${state.hideOutsideKey ? t("neck.show") : t("neck.hide")}
      </button>
    </header>
    <div class="legend">
      <span><i class="swatch root" style="--c:${ctx.color}"></i> ${t("neck.root", { name: ctx.rootName })}</span>
      <span><i class="swatch" style="--c:${colorForPc(ctx.keyNotes[1].pc)}"></i> ${t("neck.other")}</span>
      ${state.hideOutsideKey ? "" : `<span><i class="swatch out" style="--c:${colorForPc((ctx.rootPc + 1) % 12)}"></i> ${t("neck.outside")}</span>`}
    </div>
    <p class="fine">${state.hideOutsideKey
      ? t("neck.only", { title })
      : t("neck.colors", { title })}</p>
    ${neckMarkup({
      neck: "chromatic",
      strings,
      fretCount: neckFretCount(),
      cell(pc, string, fret) {
        const name = nameForPitchClass(pc, ctx.keyNotes, ctx.preferFlats);
        const inKey = ctx.keyPcs.has(pc);
        const isRoot = pc === ctx.rootPc;
        const color = colorForPc(pc);
        const midi = string.midi + fret;
        const octave = spelledOctave(midi, name);
        const simple = soundingName(pc, ctx.preferFlats);
        const sounds = simple !== name ? t("note.sounds", { name: spoken(simple) }) : "";
        const place = placeName(fret);
        const extra = `${inKey ? t("note.inKey") : ""}${isRoot ? t("note.root") : ""}${sounds}`;
        return {
          show: inKey || !state.hideOutsideKey,
          className: `bubble ${inKey ? "in" : "out"}${isRoot ? " root" : ""}`,
          color,
          label: isRoot ? `<span class="deg">R</span><span class="nm">${name}</span>` : `<span class="nm">${name}</span>`,
          attrs: `data-action="note" data-midi="${midi}" data-pc="${pc}" data-fret="${fret}" data-in-key="${inKey}" data-root="${isRoot}" data-name="${name}" aria-label="${t("note.aria", { name: spoken(name), octave, string: string.label, place, extra })}"`,
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
      const aka = scale.aka && scale.aka !== "ascending" ? ` title="${t(`aka.${scale.aka}`)}"` : "";
      return `<button type="button" class="pill" data-action="scale" data-value="${scale.id}" aria-pressed="${pressed}"${aka}>${scaleLabel(scale)}</button>`;
    }).join("");
    return `<div class="pill-group"><span>${t(`group.${group}`)}</span><div class="pills">${pills}</div></div>`;
  }).join("");

  const degreeChips = ctx.scaleNotes.map((note) => {
    const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
    return `<span class="degree-chip" style="--c:${color};--ink:${ink(color)}"><b>${note.degree}</b> ${note.name}</span>`;
  }).join("");

  const doubles = ctx.scaleNotes.some((note) => /[𝄪𝄫]/.test(note.name));

  scaleSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">${t("scale.neck")}</p>
        <h2>${scaleHeading(ctx)}</h2>
        <p>${t("scale.blurb", { place: onInstrument(spec) })}</p>
      </div>
      <button type="button" class="play" data-action="play-scale">${t("scale.play")}</button>
    </header>
    <div class="scale-picker">${groups}</div>
    <div class="degree-row">${degreeChips}</div>
    <p class="pattern">${formatSteps(ctx.pattern)}</p>
    ${doubles ? `<p class="fine">${t("scale.theory")}</p>` : ""}
    ${neckMarkup({
      neck: "scale",
      strings,
      fretCount: neckFretCount(),
      cell(pc, string, fret) {
        const note = ctx.scaleNotes.find((item) => item.pc === pc);
        if (!note) return { show: false };
        const midi = string.midi + fret;
        const octave = spelledOctave(midi, note.name);
        const place = placeName(fret);
        const isRoot = note.degree === "R";
        const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
        return {
          show: true,
          className: `bubble scale${isRoot ? " root" : ""}`,
          color,
          label: `<span class="deg">${note.degree}</span><span class="nm">${note.name}</span>`,
          attrs: `data-action="note" data-midi="${midi}" data-pc="${pc}" data-fret="${fret}" data-degree="${note.degree}" data-name="${note.name}" data-root="${isRoot}" aria-label="${t("note.aria", { name: `${note.degree}, ${spoken(note.name)}`, octave, string: string.label, place, extra: "" })}"`,
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
    return `<button type="button" class="chord" data-action="arp" data-index="${i}" aria-pressed="${pressed}" style="--c:${color};--ink:${ink(color)}" aria-label="${t("arp.aria", { roman: item.roman, symbol: spoken(item.symbol) })}">
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
        <p class="eyebrow">${t("arp.neck")}</p>
        <h2>${chord.symbol} · ${chord.roman}</h2>
        <p>${t("arp.blurb", { title: keyTitle(ctx), place: onInstrument(spec) })}</p>
      </div>
      <button type="button" class="play" data-action="play-arp">${t("arp.play")}</button>
    </header>
    <div class="chord-row">${picks}</div>
    <div class="degree-row">${degreeChips}</div>
    <p class="pattern">${formatSteps(arp.pattern)}</p>
    ${neckMarkup({
      neck: "arpeggio",
      strings,
      fretCount: neckFretCount(),
      cell(pc, string, fret) {
        const note = arp.notes.find((item) => item.pc === pc);
        if (!note) return { show: false };
        const midi = string.midi + fret;
        const octave = spelledOctave(midi, note.name);
        const place = placeName(fret);
        const isRoot = note.degree === "R";
        const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
        return {
          show: true,
          className: `bubble scale${isRoot ? " root" : ""}`,
          color,
          label: `<span class="deg">${note.degree}</span><span class="nm">${note.name}</span>`,
          attrs: `data-action="note" data-midi="${midi}" data-pc="${pc}" data-fret="${fret}" data-degree="${note.degree}" data-name="${note.name}" data-root="${isRoot}" aria-label="${t("note.aria", { name: `${note.degree}, ${spoken(note.name)}`, octave, string: string.label, place, extra: "" })}"`,
        };
      },
    })}
  `;
}

function renderChords(ctx) {
  const spec = instrumentSpec(state);
  const strings = orderedStrings(state);
  const cards = ctx.chords.flatMap((chord) => {
    const voicings = chordVoicings(spec.strings, chord, neckFretCount());
    return voicings.map((voicing) => {
    const placed = new Map(voicing.notes.map((note) => [`${note.stringMidi}:${note.fret}`, note]));
    const muted = new Set(voicing.mutedMidis);
    const frets = [];
    for (let fret = voicing.min; fret <= voicing.max; fret += 1) frets.push(fret);
    const where = describeShape(voicing);
    const columns = fretColumns(frets);
    return `
      <article class="chord-diagram">
        <header class="chord-diagram-head">
          <div>
            <p class="chord-title">${chord.symbol} · ${chord.roman}</p>
            <p class="chord-shape">${where}</p>
          </div>
          <button type="button" class="play" data-action="play-voicing" data-midis="${voicing.notes.map((note) => note.midi).join(",")}" aria-label="${t("chord.playAria", { symbol: spoken(chord.symbol) })}">${t("chord.play")}</button>
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
            const place = placeName(fret);
            const isRoot = note.degree === "R";
            const color = DEGREE_COLOR[note.degree] ?? "#d7d0c4";
            return {
              show: true,
              className: `bubble scale${isRoot ? " root" : ""}`,
              color,
              label: `<span class="deg">${note.degree}</span><span class="nm">${note.name}</span>`,
              attrs: `data-action="note" data-midi="${note.midi}" data-pc="${pc}" data-fret="${fret}" data-degree="${note.degree}" data-name="${note.name}" data-root="${isRoot}" aria-label="${t("note.aria", { name: `${note.degree}, ${spoken(note.name)}`, octave, string: string.label, place, extra: "" })}"`,
            };
          },
        })}
      </article>
    `;
    });
  }).join("");

  chordSection.innerHTML = `
    <header class="section-head">
      <div>
        <p class="eyebrow">${t("chord.neck")}</p>
        <h2>${t("chord.title", { title: keyTitle(ctx) })}</h2>
        <p>${state.instrument === "bass" ? t("chord.blurbBass", { place: onInstrument(spec) }) : t("chord.blurb", { place: onInstrument(spec) })}</p>
      </div>
    </header>
    <div class="chord-list">${cards}</div>
  `;
}

function fretColumns(frets) {
  const tracks = frets.map((fret, index) => (index === 0 && fret === 0 ? "minmax(76px, 1.15fr)" : "minmax(62px, 1fr)"));
  return `64px ${tracks.join(" ")}`;
}

function defaultColumns(fretNums) {
  const stretch = fretNums.length <= 13;
  const tracks = fretNums.map((fret, index) => {
    if (index === 0 && fret === 0) return stretch ? "minmax(76px, 1.15fr)" : "72px";
    return stretch ? "minmax(58px, 1fr)" : "58px";
  });
  return `64px ${tracks.join(" ")}`;
}

function neckMarkup({ neck, className = "", strings, fretCount = FRET_COUNT, frets, columns, cell }) {
  const fretNums = frets ?? Array.from({ length: fretCount + 1 }, (_, index) => index);
  const nums = [`<span class="num corner">${fretNums[0] === 0 ? t("fret.corner") : t("fret.number", { fret: fretNums[0] })}</span>`];
  fretNums.forEach((fret) => {
    if (fret === 0) {
      nums.push(`<span class="num open-num">${t("fret.open")}</span>`);
      return;
    }
    const inlay = isInlay(fret) ? " inlay-num" : "";
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
          ? `<span class="mute" role="img" aria-label="${t("chord.mute")}">×</span>`
          : "";
      const dot = dotHosts.has(`${stringIndex}:${fret}`) ? `<span class="inlay"></span>` : "";
      cells.push(`<div class="cell${open}" style="--gauge:${gauge}" data-string="${string.label}" data-fret="${fret}">${dot}${marker}</div>`);
    });
    return cells.join("");
  }).join("");

  const tracks = columns ?? defaultColumns(fretNums);
  const trackStyle = ` style="grid-template-columns:${tracks}"`;
  const extra = className ? ` ${className}` : "";
  return `
    <div class="neck-scroll${extra}" data-neck="${neck}">
      <div class="nums"${trackStyle}>${nums.join("")}</div>
      <div class="board" style="--strings:${strings.length};grid-template-columns:${tracks}">
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

onLang(() => {
  render();
  metronome.refresh();
});

render();
