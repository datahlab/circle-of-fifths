/** Music theory for the circle of fifths, scales, and standard guitar/bass tunings. */

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
export const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

export const SHARP_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const FLAT_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

const SHARP_ORDER = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯", "B♯"];
const FLAT_ORDER = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭", "F♭"];

/** Clockwise from C at the top. Each slice pairs a major key with its relative minor. */
export const CIRCLE = [
  { major: "C", majorPc: 0, minor: "Am", minorPc: 9, accidental: "sharp", count: 0 },
  { major: "G", majorPc: 7, minor: "Em", minorPc: 4, accidental: "sharp", count: 1 },
  { major: "D", majorPc: 2, minor: "Bm", minorPc: 11, accidental: "sharp", count: 2 },
  { major: "A", majorPc: 9, minor: "F♯m", minorPc: 6, accidental: "sharp", count: 3 },
  { major: "E", majorPc: 4, minor: "C♯m", minorPc: 1, accidental: "sharp", count: 4 },
  { major: "B", majorPc: 11, minor: "G♯m", minorPc: 8, accidental: "sharp", count: 5 },
  {
    major: "F♯",
    majorPc: 6,
    minor: "D♯m",
    minorPc: 3,
    accidental: "sharp",
    count: 6,
    altMajor: "G♭",
    altMinor: "E♭m",
  },
  { major: "D♭", majorPc: 1, minor: "B♭m", minorPc: 10, accidental: "flat", count: 5 },
  { major: "A♭", majorPc: 8, minor: "Fm", minorPc: 5, accidental: "flat", count: 4 },
  { major: "E♭", majorPc: 3, minor: "Cm", minorPc: 0, accidental: "flat", count: 3 },
  { major: "B♭", majorPc: 10, minor: "Gm", minorPc: 7, accidental: "flat", count: 2 },
  { major: "F", majorPc: 5, minor: "Dm", minorPc: 2, accidental: "flat", count: 1 },
];

export const FRET_COUNT = 12;
export const INLAY_FRETS = [3, 5, 7, 9, 12];

export const SCALES = [
  {
    id: "major",
    name: "Major",
    aka: "Ionian",
    group: "Seven-note",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degrees: ["R", "2", "3", "4", "5", "6", "7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "naturalMinor",
    name: "Natural Minor",
    aka: "Aeolian",
    group: "Seven-note",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degrees: ["R", "2", "b3", "4", "5", "b6", "b7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "harmonicMinor",
    name: "Harmonic Minor",
    aka: "",
    group: "Seven-note",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degrees: ["R", "2", "b3", "4", "5", "b6", "7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "melodicMinor",
    name: "Melodic Minor",
    aka: "ascending",
    group: "Seven-note",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    degrees: ["R", "2", "b3", "4", "5", "6", "7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "majorPent",
    name: "Major Pentatonic",
    aka: "",
    group: "Pentatonic & blues",
    intervals: [0, 2, 4, 7, 9],
    degrees: ["R", "2", "3", "5", "6"],
    letters: [0, 1, 2, 4, 5],
  },
  {
    id: "minorPent",
    name: "Minor Pentatonic",
    aka: "",
    group: "Pentatonic & blues",
    intervals: [0, 3, 5, 7, 10],
    degrees: ["R", "b3", "4", "5", "b7"],
    letters: [0, 2, 3, 4, 6],
  },
  {
    id: "blues",
    name: "Blues",
    aka: "",
    group: "Pentatonic & blues",
    intervals: [0, 3, 5, 6, 7, 10],
    degrees: ["R", "b3", "4", "b5", "5", "b7"],
    letters: [0, 2, 3, 4, 4, 6],
  },
  {
    id: "dorian",
    name: "Dorian",
    aka: "",
    group: "Modes",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    degrees: ["R", "2", "b3", "4", "5", "6", "b7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "phrygian",
    name: "Phrygian",
    aka: "",
    group: "Modes",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    degrees: ["R", "b2", "b3", "4", "5", "b6", "b7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "lydian",
    name: "Lydian",
    aka: "",
    group: "Modes",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    degrees: ["R", "2", "3", "#4", "5", "6", "7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "mixolydian",
    name: "Mixolydian",
    aka: "",
    group: "Modes",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    degrees: ["R", "2", "3", "4", "5", "6", "b7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "locrian",
    name: "Locrian",
    aka: "",
    group: "Modes",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    degrees: ["R", "b2", "b3", "4", "b5", "b6", "b7"],
    letters: [0, 1, 2, 3, 4, 5, 6],
  },
];

export const SCALE_GROUPS = ["Seven-note", "Pentatonic & blues", "Modes"];

const MAJOR_HARMONY = ["maj", "min", "min", "maj", "maj", "min", "dim"];
const MINOR_HARMONY = ["min", "dim", "maj", "min", "min", "maj", "maj"];
const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const ROMAN_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];

export const DEGREE_COLOR = {
  R: "#e4b43a",
  b2: "#e07d88",
  2: "#6eb0de",
  b3: "#63b888",
  3: "#2faf72",
  4: "#e89a4e",
  "#4": "#d978c0",
  b5: "#c388dd",
  5: "#ae8df0",
  "#5": "#ee87b0",
  b6: "#ee87b0",
  6: "#49c4bc",
  b7: "#e88858",
  7: "#f26d8d",
};

const GUITAR_STRINGS = [
  { name: "E", midi: 40 },
  { name: "A", midi: 45 },
  { name: "D", midi: 50 },
  { name: "G", midi: 55 },
  { name: "B", midi: 59 },
  { name: "E", midi: 64 },
];

const BASS_STRINGS = {
  4: [
    { name: "E", midi: 28 },
    { name: "A", midi: 33 },
    { name: "D", midi: 38 },
    { name: "G", midi: 43 },
  ],
  5: [
    { name: "B", midi: 23 },
    { name: "E", midi: 28 },
    { name: "A", midi: 33 },
    { name: "D", midi: 38 },
    { name: "G", midi: 43 },
  ],
  6: [
    { name: "B", midi: 23 },
    { name: "E", midi: 28 },
    { name: "A", midi: 33 },
    { name: "D", midi: 38 },
    { name: "G", midi: 43 },
    { name: "C", midi: 48 },
  ],
};

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * f(x)).toString(16).padStart(2, "0");
  return `#${to(0)}${to(8)}${to(4)}`;
}

export function segmentColor(index) {
  const hue = (28 + index * 30) % 360;
  return hslToHex(hue, 64, 56);
}

export function colorForPc(pc) {
  const index = CIRCLE.findIndex((entry) => entry.majorPc === pc);
  return segmentColor(index);
}

export function ink(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 155 ? "#1c140c" : "#fffaf4";
}

export function parseSpelling(name) {
  const letter = name[0];
  const letterIndex = LETTERS.indexOf(letter);
  const accidentals = { "♯": 1, "#": 1, "♭": -1, b: -1, "𝄪": 2, "𝄫": -2 };
  let shift = 0;
  for (let i = 1; i < name.length; i += 1) {
    const amount = accidentals[name[i]];
    if (amount == null) break;
    shift += amount;
  }
  const pc = (NATURAL_PC[letterIndex] + ((shift % 12) + 12)) % 12;
  return { letter, letterIndex, pc, name };
}

export function spellLetter(letterIndex, pc) {
  const natural = NATURAL_PC[letterIndex];
  let diff = (pc - natural + 12) % 12;
  if (diff >= 10) diff -= 12;
  const letter = LETTERS[letterIndex];
  if (diff === 0) return letter;
  if (diff === 1) return `${letter}♯`;
  if (diff === 2) return `${letter}𝄪`;
  if (diff === -1) return `${letter}♭`;
  if (diff === -2) return `${letter}𝄫`;
  return `${letter}?${diff}`;
}

export function spellScale(rootName, scale) {
  const root = parseSpelling(rootName);
  return scale.intervals.map((interval, i) => {
    const letterIndex = (root.letterIndex + scale.letters[i]) % 7;
    const pc = (root.pc + interval) % 12;
    return {
      interval,
      pc,
      name: spellLetter(letterIndex, pc),
      degree: scale.degrees[i],
      letterIndex,
    };
  });
}

export function spelledOctave(midi, spelled) {
  const letterIndex = LETTERS.indexOf(spelled[0]);
  const natural = NATURAL_PC[letterIndex];
  const actual = ((midi % 12) + 12) % 12;
  let diff = (actual - natural + 12) % 12;
  if (diff >= 10) diff -= 12;
  const sounding = Math.floor(midi / 12) - 1;
  if (diff > 0 && actual < natural) return sounding - 1;
  if (diff < 0 && actual > natural) return sounding + 1;
  return sounding;
}

export function soundingName(pc, preferFlats) {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[pc];
}

export function nameForPitchClass(pc, keyNotes, preferFlats) {
  const match = keyNotes.find((note) => note.pc === pc);
  if (match) return match.name;
  return soundingName(pc, preferFlats);
}

export function stepPattern(intervals) {
  return intervals.map((interval, i) => {
    const next = i + 1 < intervals.length ? intervals[i + 1] : 12;
    const distance = next - interval;
    if (distance === 1) return "H";
    if (distance === 2) return "W";
    if (distance === 3) return "m3";
    if (distance === 4) return "M3";
    if (distance === 5) return "P4";
    if (distance === 6) return "A4";
    return String(distance);
  });
}

const ARPEGGIO_SHAPES = {
  maj: {
    name: "Major",
    intervals: [0, 4, 7],
    degrees: ["R", "3", "5"],
    letters: [0, 2, 4],
  },
  min: {
    name: "Minor",
    intervals: [0, 3, 7],
    degrees: ["R", "b3", "5"],
    letters: [0, 2, 4],
  },
  dim: {
    name: "Diminished",
    intervals: [0, 3, 6],
    degrees: ["R", "b3", "b5"],
    letters: [0, 2, 4],
  },
};

export function chordSteps(quality) {
  return ARPEGGIO_SHAPES[quality]?.intervals ?? ARPEGGIO_SHAPES.dim.intervals;
}

export function arpeggioFor(chord) {
  const shape = ARPEGGIO_SHAPES[chord.quality] ?? ARPEGGIO_SHAPES.dim;
  return {
    ...shape,
    notes: spellScale(chord.name, shape),
    pattern: stepPattern(shape.intervals),
  };
}

const GUITAR_VOICINGS = {
  maj: [
    { name: "E shape", intervals: [0, 7, 12, 16, 19, 24] },
    { name: "A shape", intervals: [null, 0, 7, 12, 16, 19] },
    { name: "D shape", intervals: [null, null, 0, 7, 12, 16] },
    { name: "C shape", intervals: [null, 0, 4, 7, 12, 16] },
    { name: "G shape", intervals: [0, 4, 7, 12, 16, 24] },
  ],
  min: [
    { name: "E shape", intervals: [0, 7, 12, 15, 19, 24] },
    { name: "A shape", intervals: [null, 0, 7, 12, 15, 19] },
    { name: "D shape", intervals: [null, null, 0, 7, 12, 15] },
    { name: "C shape", intervals: [null, 0, 3, 7, 12, 15] },
  ],
  dim: [
    { name: "E shape", intervals: [0, 6, 12, 15, null, 24] },
    { name: "A shape", intervals: [null, 0, 6, 12, 15, null] },
    { name: "D shape", intervals: [null, null, 0, 6, 12, 15] },
  ],
};

const BASS_VOICINGS = {
  maj: [
    { name: "E-string shape", anchor: 28, intervals: [0, 7, 12, 16] },
    { name: "A-string shape", anchor: 33, intervals: [0, 4, 7] },
  ],
  min: [
    { name: "E-string shape", anchor: 28, intervals: [0, 7, 12, 15] },
    { name: "A-string shape", anchor: 33, intervals: [0, 3, 7] },
  ],
  dim: [
    { name: "E-string shape", anchor: 28, intervals: [0, 6, 12, 15] },
    { name: "A-string shape", anchor: 33, intervals: [0, 6, 15] },
  ],
};

function alignToAnchor(strings, anchorMidi, shapeIntervals) {
  const anchor = strings.findIndex((string) => string.midi === anchorMidi);
  if (anchor < 0 || anchor + shapeIntervals.length > strings.length) return null;
  const intervals = strings.map(() => null);
  shapeIntervals.forEach((interval, offset) => {
    intervals[anchor + offset] = interval;
  });
  return intervals;
}

function realizeVoicing(strings, rootPc, name, intervals) {
  const rootIndex = intervals.findIndex((interval) => interval === 0);
  if (rootIndex < 0) return null;
  const rootOpen = strings[rootIndex].midi;
  const baseFret = (rootPc - (rootOpen % 12) + 12) % 12;
  const candidates = [];
  [baseFret, baseFret + 12].forEach((rootFret) => {
    if (rootFret > 12) return;
    const rootMidi = rootOpen + rootFret;
    const notes = [];
    for (let i = 0; i < intervals.length; i += 1) {
      const interval = intervals[i];
      if (interval == null) {
        notes.push({ mute: true, stringMidi: strings[i].midi });
        continue;
      }
      const midi = rootMidi + interval;
      const fret = midi - strings[i].midi;
      if (fret < 0 || fret > 12) return;
      notes.push({ mute: false, stringMidi: strings[i].midi, fret, midi, interval });
    }
    const sounded = notes.filter((note) => !note.mute);
    const min = Math.min(...sounded.map((note) => note.fret));
    const max = Math.max(...sounded.map((note) => note.fret));
    candidates.push({ name, notes, min, max, span: max - min });
  });
  return candidates;
}

function voicingRank(voicing) {
  const rootFret = voicing.notes.find((note) => !note.mute && note.interval === 0).fret;
  return [
    voicing.span <= 4 ? 0 : 1,
    voicing.min === 0 ? 0 : 1,
    rootFret,
    voicing.span,
    voicing.min,
  ];
}

function preferVoicing(current, next) {
  const left = voicingRank(current);
  const right = voicingRank(next);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return right[i] < left[i] ? next : current;
  }
  return current;
}

export function chordVoicing(strings, chord) {
  const guitar = strings.length === 6 && strings[0].midi === 40;
  const templates = guitar
    ? GUITAR_VOICINGS[chord.quality] ?? GUITAR_VOICINGS.dim
    : (BASS_VOICINGS[chord.quality] ?? BASS_VOICINGS.dim).map((shape) => ({
      name: shape.name,
      intervals: alignToAnchor(strings, shape.anchor, shape.intervals),
    })).filter((shape) => shape.intervals);
  const arp = arpeggioFor(chord);
  const best = templates.reduce((chosen, template) => {
    const found = realizeVoicing(strings, chord.pc, template.name, template.intervals);
    return (found ?? []).reduce((pick, candidate) => (pick ? preferVoicing(pick, candidate) : candidate), chosen);
  }, null);
  if (!best) return null;
  const notes = best.notes.filter((note) => !note.mute).map((note) => {
    const spelled = arp.notes.find((item) => item.pc === ((note.midi % 12) + 12) % 12);
    return { ...note, degree: spelled?.degree ?? "R", name: spelled?.name ?? chord.name };
  });
  const atNut = notes.filter((note) => note.fret === best.min);
  return {
    name: best.name,
    min: best.min,
    max: best.max,
    barre: best.min > 0 && atNut.length >= 2,
    notes,
    mutedMidis: best.notes.filter((note) => note.mute).map((note) => note.stringMidi),
  };
}

function chordSymbol(name, quality) {
  if (quality === "maj") return name;
  if (quality === "min") return `${name}m`;
  return `${name}°`;
}

function minorTonic(label) {
  return label.endsWith("m") ? label.slice(0, -1) : label;
}

export function rootNameFor(state) {
  const entry = CIRCLE[state.index];
  const flat = Boolean(entry.altMajor && state.enharmonicFlat);
  if (flat) return state.quality === "major" ? entry.altMajor : minorTonic(entry.altMinor);
  return state.quality === "major" ? entry.major : minorTonic(entry.minor);
}

export function getKeyContext(state) {
  const entry = CIRCLE[state.index];
  const flat = Boolean(entry.altMajor && state.enharmonicFlat);
  const accidental = flat ? "flat" : entry.accidental;
  const count = flat ? 6 : entry.count;
  const preferFlats = accidental === "flat";
  const rootName = rootNameFor(state);
  const rootPc = parseSpelling(rootName).pc;
  const qualityName = state.quality === "major" ? "Major" : "Minor";
  const keyScale = SCALES.find((scale) => scale.id === (state.quality === "major" ? "major" : "naturalMinor"));
  const keyNotes = spellScale(rootName, keyScale);
  const scale = SCALES.find((item) => item.id === state.scaleId) ?? keyScale;
  const scaleNotes = spellScale(rootName, scale);
  const romans = state.quality === "major" ? ROMAN_MAJOR : ROMAN_MINOR;
  const qualities = state.quality === "major" ? MAJOR_HARMONY : MINOR_HARMONY;
  const chords = keyNotes.map((note, i) => ({
    roman: romans[i],
    quality: qualities[i],
    symbol: chordSymbol(note.name, qualities[i]),
    pc: note.pc,
    name: note.name,
  }));
  const relativeQuality = state.quality === "major" ? "minor" : "major";
  const relativeRoot = relativeQuality === "major"
    ? (flat ? entry.altMajor : entry.major)
    : minorTonic(flat ? entry.altMinor : entry.minor);
  const accidentals = (accidental === "sharp" ? SHARP_ORDER : FLAT_ORDER).slice(0, count);

  return {
    entry,
    index: state.index,
    quality: state.quality,
    qualityName,
    rootName,
    rootPc,
    title: `${rootName} ${qualityName}`,
    preferFlats,
    accidental,
    count,
    accidentals,
    signatureLabel: count === 0 ? "No sharps or flats" : `${count} ${count === 1 ? (accidental === "sharp" ? "sharp" : "flat") : accidental === "sharp" ? "sharps" : "flats"}`,
    signatureCompact: count === 0 ? "Natural" : (accidental === "sharp" ? "♯" : "♭").repeat(count),
    keyNotes,
    keyPcs: new Set(keyNotes.map((note) => note.pc)),
    chords,
    scale,
    scaleNotes,
    scaleTitle: scale.aka ? `${rootName} ${scale.name} (${scale.aka})` : `${rootName} ${scale.name}`,
    pattern: stepPattern(scale.intervals),
    relativeQuality,
    relativeRoot,
    relativeTitle: `${relativeRoot} ${relativeQuality === "major" ? "Major" : "Minor"}`,
    hasEnharmonic: Boolean(entry.altMajor),
    enharmonicFlat: flat,
    color: colorForPc(rootPc),
  };
}

export function instrumentSpec(state) {
  if (state.instrument === "guitar") {
    return {
      id: "guitar",
      label: "Guitar",
      detail: "Standard tuning",
      strings: GUITAR_STRINGS,
    };
  }
  const count = state.bassStrings;
  const detail = count === 4
    ? "Standard tuning"
    : count === 5
      ? "Standard tuning · low B"
      : "Standard tuning · low B and high C";
  return {
    id: `bass${count}`,
    label: `${count}-string bass`,
    detail,
    strings: BASS_STRINGS[count],
  };
}

export function orderedStrings(state) {
  const spec = instrumentSpec(state);
  const strings = spec.strings.map((string) => ({
    ...string,
    label: `${SHARP_NAMES[string.midi % 12].replace("♯", "")}${Math.floor(string.midi / 12) - 1}`,
  }));
  return state.lowOnTop ? strings : [...strings].reverse();
}

export function gaugeFor(midi, strings) {
  const midis = strings.map((string) => string.midi);
  const min = Math.min(...midis);
  const max = Math.max(...midis);
  const t = max === min ? 0 : (midi - min) / (max - min);
  return `${(3.4 - t * 2.3).toFixed(2)}px`;
}

export function inlaySpans(stringCount, fret) {
  if (!INLAY_FRETS.includes(fret)) return [];
  if (fret === 12) {
    if (stringCount === 4) return [[1, 3], [3, 5]];
    if (stringCount === 5) return [[1, 3], [4, 6]];
    return [[2, 4], [4, 6]];
  }
  const start = stringCount % 2 === 0 ? stringCount / 2 : Math.ceil(stringCount / 2);
  return [[start, start + 2]];
}

export function playbackRoot(instrument, rootPc) {
  const base = instrument === "bass" ? 48 : 60;
  return base + rootPc;
}
