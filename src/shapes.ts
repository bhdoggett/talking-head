export const SHAPE_CLIPS: Record<string, string | undefined> = {
  circle: "circle(50% at 50% 50%)",
  "rounded-square": "inset(0 round 20%)",
  pill: "inset(18% 0 18% 0 round 999px)",
  star: "polygon(82.0% 99.5%, 51.8% 81.9%, 21.9% 100.0%, 28.1% 63.6%, 2.9% 38.5%, 36.9% 33.6%, 51.2% 0.0%, 66.0% 33.4%, 100.0% 37.6%, 75.2% 63.2%)",
  heart: "url(#heart-clip)",
  squiggle: "url(#squiggle-clip)",
  outline: undefined,
};

export const SVG_CLIP_DEFS = `
<svg width="0" height="0" style="position:absolute">
  <defs>
    <clipPath id="heart-clip" clipPathUnits="objectBoundingBox">
      <path d="M 0.5 0.2 C 0.5 0.08 0.37 0.0 0.25 0.0 C 0.1 0.0 0.0 0.1 0.0 0.28 C 0.0 0.52 0.25 0.7 0.5 0.95 C 0.75 0.7 1.0 0.52 1.0 0.28 C 1.0 0.1 0.9 0.0 0.75 0.0 C 0.63 0.0 0.5 0.08 0.5 0.2 Z"/>
    </clipPath>
    <clipPath id="squiggle-clip" clipPathUnits="objectBoundingBox">
      <path d="M 0.05 0 L 0.95 0 C 0.95 0.08 1.0 0.1 1.0 0.17 C 1.0 0.24 0.93 0.26 0.93 0.33 C 0.93 0.4 1.0 0.42 1.0 0.5 C 1.0 0.58 0.93 0.6 0.93 0.67 C 0.93 0.74 1.0 0.76 1.0 0.83 C 1.0 0.9 0.95 0.92 0.95 1.0 L 0.05 1.0 C 0.05 0.92 0.12 0.9 0.12 0.83 C 0.12 0.76 0.05 0.74 0.05 0.67 C 0.05 0.6 0.12 0.58 0.12 0.5 C 0.12 0.42 0.05 0.4 0.05 0.33 C 0.05 0.26 0.12 0.24 0.12 0.17 C 0.12 0.1 0.05 0.08 0.05 0 Z"/>
    </clipPath>
  </defs>
</svg>`;

export const SHAPE_LABELS: Record<string, string> = {
  circle: "Circle",
  "rounded-square": "Rounded Square",
  pill: "Pill",
  star: "Star",
  heart: "Heart",
  squiggle: "Squiggle",
  outline: "Outline",
};

export const SHAPE_LIST = Object.keys(SHAPE_LABELS);

export const SIMPLE_SHAPES = new Set(["circle", "rounded-square"]);
