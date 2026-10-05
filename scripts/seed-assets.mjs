import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./lib.mjs";

// Catalog artwork for the demo seed. Everything here is generated from plain
// shapes so the repository ships no third-party images. The palette follows
// docs/DESIGN.md so the catalog looks native to the app.

const INK = "#212121";
const WHITE = "#FFFFFF";
const PRIMARY = "#F9B129";
const BLUE = "#6E8EDA";
const BLUE_SOFT = "#E9EEFC";
const GREEN = "#048444";
const GREEN_SOFT = "#E5F5ED";
const AMBER = "#F7B742";
const AMBER_SOFT = "#FFF4D9";
const ROSE = "#F45959";
const ROSE_SOFT = "#FDE9E9";
const NEUTRAL = "#929292";
const NEUTRAL_SOFT = "#EEEEEE";

export const artTones = {
  cream: "#FAF6EE",
  yellow: "#FEF7E5",
  blue: "#EEF1F8",
  green: "#EDF6F1",
  rose: "#FBEFEF",
};

function svg(inner, bg = artTones.cream) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img">
<rect width="240" height="240" rx="28" fill="${bg}"/>
<g fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
${inner}
</g>
</svg>`;
}

const equipmentShapes = {
  oven: () => `
<rect x="50" y="54" width="140" height="132" rx="14" fill="${WHITE}"/>
<rect x="66" y="72" width="108" height="74" rx="8" fill="${BLUE_SOFT}"/>
<line x1="66" y1="160" x2="174" y2="160"/>
<circle cx="86" cy="174" r="7" fill="${PRIMARY}"/>
<rect x="150" y="168" width="24" height="12" rx="6" fill="${NEUTRAL_SOFT}"/>`,
  furnace: () => `
<rect x="56" y="58" width="128" height="124" rx="12" fill="${WHITE}"/>
<circle cx="120" cy="112" r="42" fill="${ROSE_SOFT}"/>
<circle cx="120" cy="112" r="24" fill="${WHITE}"/>
<line x1="120" y1="90" x2="120" y2="134"/>
<rect x="70" y="152" width="72" height="10" rx="5" fill="${NEUTRAL_SOFT}"/>
<rect x="152" y="148" width="22" height="9" rx="4" fill="${PRIMARY}"/>`,
  spectrophotometer: () => `
<rect x="46" y="92" width="148" height="86" rx="14" fill="${WHITE}"/>
<rect x="62" y="110" width="56" height="38" rx="8" fill="${BLUE_SOFT}"/>
<line x1="76" y1="148" x2="104" y2="148"/>
<rect x="130" y="102" width="48" height="28" rx="8" fill="${WHITE}"/>
<circle cx="154" cy="146" r="11" fill="${PRIMARY}"/>
<line x1="62" y1="162" x2="178" y2="162"/>`,
  "ph-meter": () => `
<rect x="48" y="62" width="80" height="116" rx="14" fill="${WHITE}"/>
<rect x="60" y="76" width="56" height="34" rx="8" fill="${GREEN_SOFT}"/>
<circle cx="74" cy="130" r="5" fill="${INK}"/>
<circle cx="90" cy="130" r="5" fill="${INK}"/>
<circle cx="106" cy="130" r="5" fill="${INK}"/>
<rect x="60" y="148" width="56" height="12" rx="6" fill="${NEUTRAL_SOFT}"/>
<path d="M146 78 v62"/>
<path d="M132 140 h44 v44 h-44 z" fill="${WHITE}"/>
<path d="M136 162 h36" stroke="${BLUE}" stroke-width="10"/>`,
  balance: () => `
<rect x="52" y="164" width="136" height="22" rx="10" fill="${WHITE}"/>
<ellipse cx="120" cy="158" rx="46" ry="12" fill="${WHITE}"/>
<path d="M84 158 v-32 h72 v32"/>
<circle cx="120" cy="108" r="10" fill="${PRIMARY}"/>
<line x1="156" y1="182" x2="182" y2="182"/>`,
  centrifuge: () => `
<path d="M62 150 a58 40 0 0 1 116 0 z" fill="${WHITE}"/>
<ellipse cx="120" cy="150" rx="58" ry="14" fill="${BLUE_SOFT}"/>
<circle cx="120" cy="150" r="20" fill="${WHITE}"/>
<circle cx="120" cy="150" r="6" fill="${PRIMARY}"/>
<rect x="54" y="164" width="132" height="16" rx="8" fill="${WHITE}"/>`,
  "hot-plate": () => `
<rect x="50" y="122" width="140" height="54" rx="12" fill="${WHITE}"/>
<ellipse cx="120" cy="120" rx="54" ry="14" fill="${AMBER_SOFT}"/>
<ellipse cx="120" cy="118" rx="34" ry="9" fill="${WHITE}"/>
<circle cx="78" cy="152" r="8" fill="${PRIMARY}"/>
<circle cx="120" cy="152" r="8" fill="${NEUTRAL_SOFT}"/>
<circle cx="162" cy="152" r="8" fill="${NEUTRAL_SOFT}"/>`,
  "vacuum-oven": () => `
<rect x="48" y="66" width="144" height="112" rx="14" fill="${WHITE}"/>
<circle cx="106" cy="122" r="34" fill="${BLUE_SOFT}"/>
<circle cx="106" cy="122" r="22" fill="${WHITE}"/>
<circle cx="168" cy="92" r="14" fill="${AMBER_SOFT}"/>
<line x1="168" y1="92" x2="178" y2="82"/>
<rect x="60" y="158" width="120" height="8" rx="4" fill="${NEUTRAL_SOFT}"/>`,
  "drying-cabinet": () => `
<rect x="68" y="46" width="104" height="152" rx="14" fill="${WHITE}"/>
<line x1="68" y1="94" x2="172" y2="94"/>
<line x1="68" y1="142" x2="172" y2="142"/>
<circle cx="152" cy="70" r="5" fill="${PRIMARY}"/>
<circle cx="152" cy="118" r="5" fill="${PRIMARY}"/>
<rect x="60" y="190" width="120" height="10" rx="5" fill="${NEUTRAL_SOFT}"/>`,
  desiccator: () => `
<path d="M66 152 a54 54 0 0 1 108 0" fill="${WHITE}"/>
<rect x="56" y="152" width="128" height="20" rx="10" fill="${WHITE}"/>
<line x1="84" y1="118" x2="156" y2="118"/>
<circle cx="120" cy="86" r="7" fill="${PRIMARY}"/>
<circle cx="102" cy="172" r="4" fill="${GREEN}"/>
<circle cx="120" cy="172" r="4" fill="${GREEN}"/>
<circle cx="138" cy="172" r="4" fill="${GREEN}"/>`,
  viscometer: () => `
<rect x="58" y="182" width="124" height="16" rx="8" fill="${WHITE}"/>
<rect x="70" y="58" width="18" height="126" rx="9" fill="${WHITE}"/>
<rect x="70" y="52" width="92" height="30" rx="12" fill="${WHITE}"/>
<circle cx="150" cy="67" r="8" fill="${PRIMARY}"/>
<line x1="132" y1="82" x2="132" y2="146"/>
<path d="M112 140 h44 v46 h-44 z" fill="${BLUE_SOFT}"/>
<path d="M116 158 h36" stroke="${BLUE}" stroke-width="10"/>`,
  "melting-point": () => `
<rect x="54" y="158" width="132" height="34" rx="12" fill="${WHITE}"/>
<rect x="86" y="112" width="68" height="40" rx="8" fill="${ROSE_SOFT}"/>
<line x1="120" y1="52" x2="120" y2="112"/>
<circle cx="120" cy="48" r="10" fill="${ROSE}"/>
<circle cx="160" cy="96" r="22" fill="${WHITE}"/>
<circle cx="160" cy="96" r="13" fill="${BLUE_SOFT}"/>
<line x1="176" y1="112" x2="188" y2="126"/>
<circle cx="72" cy="175" r="7" fill="${PRIMARY}"/>`,
  incubator: () => `
<rect x="54" y="52" width="132" height="140" rx="14" fill="${WHITE}"/>
<rect x="70" y="70" width="100" height="86" rx="10" fill="${GREEN_SOFT}"/>
<line x1="70" y1="99" x2="170" y2="99"/>
<line x1="70" y1="128" x2="170" y2="128"/>
<circle cx="88" cy="172" r="7" fill="${PRIMARY}"/>
<circle cx="112" cy="172" r="7" fill="${NEUTRAL_SOFT}"/>`,
  autoclave: () => `
<rect x="72" y="48" width="96" height="148" rx="46" fill="${WHITE}"/>
<circle cx="120" cy="122" r="26" fill="${BLUE_SOFT}"/>
<line x1="120" y1="96" x2="120" y2="148"/>
<line x1="94" y1="122" x2="146" y2="122"/>
<circle cx="120" cy="122" r="7" fill="${PRIMARY}"/>
<rect x="64" y="188" width="112" height="12" rx="6" fill="${NEUTRAL_SOFT}"/>`,
  "water-bath": () => `
<rect x="50" y="104" width="140" height="76" rx="14" fill="${WHITE}"/>
<path d="M54 132 h132" stroke="${BLUE}" stroke-width="12"/>
<path d="M78 116 q10 -10 20 0 t20 0 t20 0" stroke="${BLUE}"/>
<circle cx="76" cy="160" r="7" fill="${PRIMARY}"/>
<rect x="150" y="152" width="24" height="14" rx="6" fill="${NEUTRAL_SOFT}"/>`,
  "vortex-mixer": () => `
<ellipse cx="120" cy="178" rx="58" ry="18" fill="${WHITE}"/>
<rect x="78" y="128" width="84" height="50" rx="14" fill="${WHITE}"/>
<ellipse cx="120" cy="128" rx="42" ry="14" fill="${BLUE_SOFT}"/>
<rect x="110" y="58" width="20" height="54" rx="10" fill="${BLUE_SOFT}"/>
<rect x="104" y="50" width="32" height="14" rx="7" fill="${PRIMARY}"/>`,
  "furnace-nabertherm": () => `
<rect x="52" y="52" width="136" height="136" rx="14" fill="${WHITE}"/>
<rect x="68" y="68" width="104" height="66" rx="8" fill="${ROSE_SOFT}"/>
<circle cx="120" cy="101" r="22" fill="${WHITE}"/>
<circle cx="120" cy="101" r="10" fill="${ROSE}"/>
<line x1="120" y1="42" x2="120" y2="52"/>
<rect x="112" y="34" width="16" height="8" rx="3" fill="${NEUTRAL_SOFT}"/>
<rect x="68" y="146" width="60" height="24" rx="6" fill="${NEUTRAL_SOFT}"/>
<circle cx="152" cy="158" r="9" fill="${PRIMARY}"/>`,
  "furnace-thermoline": () => `
<rect x="48" y="56" width="144" height="130" rx="12" fill="${WHITE}"/>
<rect x="66" y="72" width="80" height="74" rx="8" fill="${ROSE_SOFT}"/>
<rect x="76" y="82" width="60" height="54" rx="6" fill="${WHITE}"/>
<line x1="106" y1="82" x2="106" y2="136"/>
<rect x="156" y="74" width="22" height="70" rx="6" fill="${NEUTRAL_SOFT}"/>
<circle cx="167" cy="94" r="5" fill="${ROSE}"/>
<circle cx="167" cy="116" r="6" fill="${PRIMARY}"/>
<line x1="66" y1="162" x2="174" y2="162"/>`,
  "oven-memmert": () => `
<rect x="48" y="50" width="144" height="140" rx="14" fill="${WHITE}"/>
<rect x="64" y="66" width="112" height="80" rx="8" fill="${BLUE_SOFT}"/>
<rect x="78" y="80" width="84" height="52" rx="6" fill="${WHITE}"/>
<line x1="64" y1="158" x2="176" y2="158"/>
<circle cx="86" cy="172" r="8" fill="${PRIMARY}"/>
<rect x="114" y="166" width="44" height="12" rx="4" fill="${BLUE_SOFT}"/>
<circle cx="168" cy="172" r="4" fill="${GREEN}"/>`,
  "oven-carbolite": () => `
<rect x="46" y="52" width="148" height="136" rx="12" fill="${WHITE}"/>
<rect x="62" y="68" width="84" height="82" rx="8" fill="${AMBER_SOFT}"/>
<line x1="74" y1="92" x2="134" y2="92"/>
<line x1="74" y1="116" x2="134" y2="116"/>
<rect x="154" y="70" width="26" height="80" rx="6" fill="${WHITE}"/>
<circle cx="167" cy="90" r="7" fill="${PRIMARY}"/>
<circle cx="167" cy="112" r="7" fill="${NEUTRAL_SOFT}"/>
<rect x="62" y="162" width="118" height="12" rx="4" fill="${NEUTRAL_SOFT}"/>`,
  shaker: () => `
<rect x="44" y="132" width="152" height="54" rx="12" fill="${WHITE}"/>
<rect x="52" y="96" width="136" height="24" rx="6" fill="${BLUE_SOFT}"/>
<line x1="60" y1="108" x2="180" y2="108"/>
<line x1="80" y1="120" x2="80" y2="132"/>
<line x1="160" y1="120" x2="160" y2="132"/>
<circle cx="78" cy="158" r="8" fill="${PRIMARY}"/>
<rect x="110" y="152" width="48" height="14" rx="4" fill="${WHITE}"/>
<circle cx="174" cy="158" r="6" fill="${GREEN}"/>`,
  shakerbath: () => `
<rect x="42" y="90" width="156" height="96" rx="14" fill="${WHITE}"/>
<rect x="58" y="104" width="88" height="48" rx="8" fill="${BLUE_SOFT}"/>
<path d="M66 128 q10 -8 20 0 t20 0 t20 0" stroke="${BLUE}"/>
<rect x="156" y="104" width="28" height="48" rx="6" fill="${WHITE}"/>
<circle cx="170" cy="120" r="6" fill="${PRIMARY}"/>
<circle cx="170" cy="138" r="4" fill="${ROSE}"/>
<line x1="58" y1="164" x2="182" y2="164"/>`,
  "spectrophotometer-genesys": () => `
<path d="M44 140 l20 -48 h112 l20 48 v34 a12 12 0 0 1 -12 12 h-128 a12 12 0 0 1 -12 -12 z" fill="${WHITE}"/>
<rect x="74" y="102" width="60" height="32" rx="6" fill="${BLUE_SOFT}"/>
<line x1="84" y1="124" x2="124" y2="124" stroke="${BLUE}" stroke-width="4"/>
<rect x="144" y="102" width="34" height="32" rx="6" fill="${WHITE}"/>
<circle cx="161" cy="118" r="7" fill="${PRIMARY}"/>
<rect x="68" y="148" width="104" height="16" rx="6" fill="${NEUTRAL_SOFT}"/>`,
  "pompa-vacum": () => `
<rect x="52" y="100" width="104" height="76" rx="14" fill="${WHITE}"/>
<rect x="156" y="112" width="32" height="52" rx="8" fill="${GREEN_SOFT}"/>
<circle cx="104" cy="138" r="22" fill="${WHITE}"/>
<circle cx="104" cy="138" r="14" fill="${BLUE_SOFT}"/>
<line x1="104" y1="138" x2="114" y2="130"/>
<path d="M80 100 v-24 h18 v24" fill="${NEUTRAL_SOFT}"/>
<path d="M128 100 v-16 h14 v16" fill="${NEUTRAL_SOFT}"/>
<circle cx="172" cy="138" r="6" fill="${PRIMARY}"/>`,
  microwave: () => `
<rect x="46" y="70" width="148" height="106" rx="14" fill="${WHITE}"/>
<rect x="62" y="86" width="78" height="74" rx="8" fill="${AMBER_SOFT}"/>
<rect x="72" y="96" width="58" height="54" rx="6" fill="${WHITE}"/>
<rect x="148" y="86" width="32" height="24" rx="5" fill="${NEUTRAL_SOFT}"/>
<circle cx="164" cy="124" r="7" fill="${PRIMARY}"/>
<circle cx="164" cy="144" r="7" fill="${NEUTRAL_SOFT}"/>`,
  bts: () => `
<rect x="46" y="76" width="148" height="114" rx="14" fill="${WHITE}"/>
<rect x="62" y="92" width="70" height="64" rx="8" fill="${BLUE_SOFT}"/>
<path d="M72 120 h50" stroke="${BLUE}" stroke-width="4"/>
<path d="M72 134 h50" stroke="${BLUE}" stroke-width="4"/>
<rect x="142" y="92" width="38" height="64" rx="8" fill="${WHITE}"/>
<rect x="148" y="100" width="26" height="14" rx="3" fill="${GREEN_SOFT}"/>
<circle cx="161" cy="126" r="6" fill="${PRIMARY}"/>
<circle cx="161" cy="144" r="4" fill="${ROSE}"/>
<line x1="62" y1="168" x2="178" y2="168"/>`,
  turbidimeter: () => `
<rect x="48" y="84" width="144" height="102" rx="14" fill="${WHITE}"/>
<rect x="64" y="100" width="56" height="42" rx="8" fill="${BLUE_SOFT}"/>
<line x1="74" y1="126" x2="110" y2="126" stroke="${BLUE}" stroke-width="4"/>
<circle cx="148" cy="116" r="16" fill="${WHITE}"/>
<circle cx="148" cy="116" r="8" fill="${AMBER}"/>
<rect x="64" y="152" width="112" height="14" rx="5" fill="${NEUTRAL_SOFT}"/>`,
  "stirer-joanlab": () => `
<rect x="50" y="126" width="140" height="52" rx="12" fill="${WHITE}"/>
<ellipse cx="120" cy="124" rx="52" ry="14" fill="${WHITE}"/>
<ellipse cx="120" cy="122" rx="32" ry="8" fill="${BLUE_SOFT}"/>
<rect x="74" y="146" width="46" height="14" rx="4" fill="${BLUE_SOFT}"/>
<circle cx="144" cy="153" r="7" fill="${PRIMARY}"/>
<circle cx="168" cy="153" r="5" fill="${GREEN}"/>`,
  "heatingmantle-electromantle": () => `
<path d="M60 110 c0 -32 26 -44 60 -44 s60 12 60 44 v48 a16 16 0 0 1 -16 16 h-88 a16 16 0 0 1 -16 -16 z" fill="${WHITE}"/>
<ellipse cx="120" cy="106" rx="42" ry="20" fill="${ROSE_SOFT}"/>
<ellipse cx="120" cy="106" rx="28" ry="12" fill="${WHITE}"/>
<circle cx="92" cy="150" r="7" fill="${PRIMARY}"/>
<circle cx="148" cy="150" r="7" fill="${AMBER}"/>`,
  "heatingmantle-bolab": () => `
<path d="M64 116 c0 -28 24 -40 56 -40 s56 12 56 40 v42 a14 14 0 0 1 -14 14 h-84 a14 14 0 0 1 -14 -14 z" fill="${WHITE}"/>
<ellipse cx="120" cy="112" rx="38" ry="18" fill="${AMBER_SOFT}"/>
<ellipse cx="120" cy="112" rx="24" ry="10" fill="${WHITE}"/>
<circle cx="120" cy="148" r="8" fill="${PRIMARY}"/>`,
  sonicator: () => `
<rect x="50" y="80" width="140" height="110" rx="14" fill="${WHITE}"/>
<rect x="66" y="96" width="108" height="50" rx="8" fill="${BLUE_SOFT}"/>
<path d="M84 116 q8 -8 16 0 t16 0 t16 0 t16 0" stroke="${BLUE}"/>
<rect x="74" y="156" width="40" height="14" rx="4" fill="${WHITE}"/>
<circle cx="140" cy="163" r="6" fill="${PRIMARY}"/>
<circle cx="158" cy="163" r="5" fill="${GREEN}"/>`,
  beaker: () => `
<path d="M72 64 h96 v100 a16 16 0 0 1 -16 16 h-64 a16 16 0 0 1 -16 -16 z" fill="${WHITE}"/>
<path d="M68 64 h10" stroke-width="4"/>
<line x1="84" y1="96" x2="114" y2="96"/>
<line x1="84" y1="124" x2="124" y2="124"/>
<line x1="84" y1="152" x2="108" y2="152"/>
<path d="M74 120 h92 v44 a16 16 0 0 1 -16 16 h-60 a16 16 0 0 1 -16 -16 z" fill="${BLUE_SOFT}"/>`,
  erlenmeyer: () => `
<path d="M106 54 h28 v32 l46 76 a14 14 0 0 1 -12 20 h-96 a14 14 0 0 1 -12 -20 l46 -76 v-32 z" fill="${WHITE}"/>
<rect x="100" y="48" width="40" height="10" rx="4" fill="${WHITE}"/>
<path d="M86 136 l24 46 h-40 a14 14 0 0 0 16 -46 z" fill="${AMBER_SOFT}"/>
<line x1="100" y1="110" x2="140" y2="110"/>
<line x1="90" y1="136" x2="150" y2="136"/>`,
  buret: () => `
<rect x="110" y="36" width="20" height="140" rx="4" fill="${WHITE}"/>
<line x1="110" y1="60" x2="124" y2="60"/>
<line x1="110" y1="80" x2="124" y2="80"/>
<line x1="110" y1="100" x2="124" y2="100"/>
<line x1="110" y1="120" x2="124" y2="120"/>
<circle cx="120" cy="184" r="8" fill="${PRIMARY}"/>
<path d="M117 192 l3 16 l3 -16 z" fill="${WHITE}"/>`,
  "measuring-cylinder": () => `
<rect x="108" y="46" width="24" height="140" rx="6" fill="${WHITE}"/>
<line x1="108" y1="70" x2="122" y2="70"/>
<line x1="108" y1="95" x2="122" y2="95"/>
<line x1="108" y1="120" x2="122" y2="120"/>
<line x1="108" y1="145" x2="122" y2="145"/>
<rect x="96" y="184" width="48" height="12" rx="4" fill="${WHITE}"/>`,
  "volumetric-flask": () => `
<path d="M112 50 h16 v54 l36 58 a14 14 0 0 1 -12 20 h-64 a14 14 0 0 1 -12 -20 l36 -58 v-54 z" fill="${WHITE}"/>
<circle cx="120" cy="46" r="8" fill="${GREEN}"/>
<line x1="112" y1="84" x2="128" y2="84" stroke="${ROSE}" stroke-width="3"/>`,
  "glass-tool": () => `
<line x1="68" y1="172" x2="172" y2="68" stroke-width="8"/>
<ellipse cx="176" cy="64" rx="14" ry="8" fill="${NEUTRAL_SOFT}"/>
<ellipse cx="64" cy="176" rx="8" ry="14" fill="${NEUTRAL_SOFT}"/>`,
};

export function equipmentArt(shape, tone = "cream") {
  const draw = equipmentShapes[shape];
  if (!draw) throw new Error(`Unknown equipment art shape: ${shape}`);
  return svg(draw(), artTones[tone] ?? artTones.cream);
}

const materialShapes = {
  bottle: (liquid) => `
<rect x="96" y="66" width="48" height="18" rx="8" fill="${INK}"/>
<rect x="106" y="84" width="28" height="34" rx="6" fill="${WHITE}"/>
<path d="M106 118 l-12 22 v56 a10 10 0 0 0 10 10 h32 a10 10 0 0 0 10 -10 v-56 l-12 -22 z" fill="${WHITE}"/>
<path d="M96 152 v44 a10 10 0 0 0 10 10 h28 a10 10 0 0 0 10 -10 v-44 z" fill="${liquid}"/>
<rect x="102" y="160" width="36" height="30" rx="5" fill="${WHITE}"/>`,
  jar: (liquid) => `
<rect x="84" y="104" width="72" height="98" rx="12" fill="${WHITE}"/>
<rect x="76" y="80" width="88" height="26" rx="10" fill="${INK}"/>
<rect x="90" y="118" width="60" height="70" rx="8" fill="${liquid}"/>
<circle cx="112" cy="146" r="7" fill="${WHITE}"/>
<circle cx="132" cy="160" r="6" fill="${WHITE}"/>
<circle cx="108" cy="172" r="5" fill="${WHITE}"/>`,
  flask: (liquid) => `
<path d="M108 60 v34 l-34 78 a12 12 0 0 0 11 18 h70 a12 12 0 0 0 11 -18 l-34 -78 v-34 z" fill="${WHITE}"/>
<rect x="102" y="50" width="36" height="14" rx="6" fill="${INK}"/>
<path d="M90 152 l-16 20 a12 12 0 0 0 11 18 h70 a12 12 0 0 0 11 -18 l-16 -20 z" fill="${liquid}"/>
<line x1="96" y1="152" x2="144" y2="152"/>`,
  carboy: (liquid) => `
<path d="M160 106 h12 a12 12 0 0 1 12 12 v36 a12 12 0 0 1 -12 12 h-12" fill="${WHITE}"/>
<rect x="78" y="86" width="84" height="112" rx="16" fill="${WHITE}"/>
<rect x="102" y="62" width="36" height="28" rx="8" fill="${INK}"/>
<rect x="86" y="140" width="68" height="50" rx="12" fill="${liquid}"/>`,
  sachet: (liquid) => `
<path d="M78 74 h84 v112 a12 12 0 0 1 -12 12 h-60 a12 12 0 0 1 -12 -12 z" fill="${WHITE}"/>
<line x1="78" y1="92" x2="162" y2="92"/>
<circle cx="120" cy="134" r="20" fill="${liquid}"/>`,
};

export function materialArt(kind, color) {
  const draw = materialShapes[kind];
  if (!draw) throw new Error(`Unknown material art kind: ${kind}`);
  const tone =
    color === BLUE ? "blue" : color === GREEN ? "green" : color === AMBER ? "yellow" : color === NEUTRAL ? "cream" : "cream";
  return svg(draw(color), artTones[tone]);
}

export const materialPalette = {
  solvent: BLUE,
  reagent: AMBER,
  biomolecule: GREEN,
  standard: PRIMARY,
  general: NEUTRAL,
};

function localRoot() {
  return path.resolve(
    process.env.STORAGE_LOCAL_DIR?.trim() || path.join(root, ".data", "uploads"),
  );
}

export function seededImageKey(slug) {
  return `seed/catalog/${slug}.svg`;
}

export function usesLocalStorage() {
  return process.env.STORAGE_PROVIDER?.trim().toLowerCase() !== "s3";
}

export async function writeSeededImageFile(key, svgSource) {
  const target = path.resolve(localRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, svgSource, "utf8");
  return Buffer.byteLength(svgSource, "utf8");
}

export async function clearSeededImageFiles() {
  await rm(path.resolve(localRoot(), "seed", "catalog"), {
    recursive: true,
    force: true,
  });
}
