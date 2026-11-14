/** Shared circle-of-fifths diagram for the reference and the fretboard exercises. */

import { CIRCLE, ink } from "./theory.js";
import { t } from "./i18n.js?v=22";

const SVG_NS = "http://www.w3.org/2000/svg";

export function spoken(name) {
  return name
    .replaceAll("𝄪", t("spoken.dblSharp"))
    .replaceAll("𝄫", t("spoken.dblFlat"))
    .replaceAll("♯", t("spoken.sharp"))
    .replaceAll("♭", t("spoken.flat"));
}

export function drawCircle(mount, model) {
  const size = 640;
  const cx = 320;
  const cy = 320;
  const outerR = 300;
  const splitR = 196;
  const innerR = 108;
  const action = model.action ?? "key";
  const svg = svgEl("svg", {
    viewBox: `0 0 ${size} ${size}`,
    role: "group",
    "aria-label": model.label,
  });

  CIRCLE.forEach((entry, index) => {
    const [a0, a1] = segmentAngles(index, model.index);
    const majorColor = model.colorForPc(entry.majorPc);
    const minorColor = model.colorForPc(entry.minorPc);
    const majorIn = model.activePcs.has(entry.majorPc);
    const minorIn = model.includeMinor !== false && model.activePcs.has(entry.minorPc);

    svg.append(segmentPath(cx, cy, splitR, outerR, a0, a1, {
      index,
      quality: "major",
      pc: entry.majorPc,
      color: majorColor,
      inKey: majorIn,
      selected: model.index === index && model.quality === "major",
      live: model.currentPc === entry.majorPc,
      label: `${spoken(entry.major)} ${t("quality.majorLower")}`,
      action,
    }));
    svg.append(segmentPath(cx, cy, innerR, splitR, a0, a1, {
      index,
      quality: "minor",
      pc: entry.minorPc,
      color: minorColor,
      inKey: minorIn,
      selected: model.index === index && model.quality === "minor",
      label: `${spoken(entry.minor.slice(0, -1))} ${t("quality.minorLower")}`,
      action,
    }));

    appendLabel(svg, cx, cy, (outerR + splitR) / 2, (a0 + a1) / 2, entry, "major", majorColor, majorIn, model.enharmonicFlat);
    appendLabel(svg, cx, cy, (splitR + innerR) / 2, (a0 + a1) / 2, entry, "minor", minorColor, minorIn, model.enharmonicFlat);
  });

  CIRCLE.forEach((entry, index) => {
    const [a0, a1] = segmentAngles(index, model.index);
    if (model.index === index && model.quality === "major") {
      svg.append(ringPath(cx, cy, splitR, outerR, a0, a1));
    }
    if (model.index === index && model.quality === "minor") {
      svg.append(ringPath(cx, cy, innerR, splitR, a0, a1));
    }
    if (model.currentPc === entry.majorPc) {
      svg.append(ringPath(cx, cy, splitR, outerR, a0, a1, "seg-ring live"));
    }
  });

  svg.append(svgEl("circle", { cx, cy, r: innerR - 6, class: "hub" }));
  svg.append(hubText(cx, cy - 16, model.hub.root, "hub-root"));
  svg.append(hubText(cx, cy + 22, model.hub.quality, "hub-quality"));
  svg.append(hubText(cx, cy + 48, model.hub.signature, "hub-sig"));
  mount.replaceChildren(svg);
}

function appendLabel(svg, cx, cy, radius, angle, entry, quality, color, inKey, enharmonicFlat) {
  const pairs = quality === "major"
    ? entry.altMajor
      ? [entry.major, entry.altMajor]
      : [entry.major]
    : entry.altMinor
      ? [entry.minor, entry.altMinor]
      : [entry.minor];
  const primaryIsAlt = Boolean(enharmonicFlat && entry.altMajor);
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

function segmentAngles(index, focusIndex) {
  const center = -90 + (index - focusIndex) * 30;
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
  return svgEl("path", {
    d: sectorPath(cx, cy, rInner, rOuter, a0, a1),
    class: `seg${meta.inKey ? "" : " dim"}${meta.selected ? " selected" : ""}${meta.live ? " live" : ""}`,
    fill: meta.color,
    "data-action": meta.action,
    "data-index": meta.index,
    "data-quality": meta.quality,
    "data-pc": meta.pc,
    "data-selected": meta.selected ? "true" : "false",
    role: "button",
    tabindex: meta.selected ? "0" : "-1",
    "aria-pressed": meta.selected ? "true" : "false",
    "aria-current": meta.live ? "true" : null,
    "aria-label": meta.label,
  });
}

function ringPath(cx, cy, rInner, rOuter, a0, a1, className = "seg-ring") {
  return svgEl("path", {
    d: sectorPath(cx, cy, rInner + 3, rOuter - 3, a0 + 0.01, a1 - 0.01),
    class: className,
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
