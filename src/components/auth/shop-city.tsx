"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The night city behind the sign-in screen: the BayFlow workshop on its corner,
 * the blocks around it, and amber cars working the streets.
 *
 * Everything is laid out on a flat ground plan (x runs along the shop front,
 * y runs toward the viewer) and projected to the screen with one dimetric
 * matrix, so roads, kerbs and buildings always agree. Cars are re-projected
 * every frame from their position on a route; nothing else moves.
 */

/* ---- Projection --------------------------------------------------------- */

const K = 3.9; // screen px per ground unit
const O = { x: 664, y: 486 }; // where ground (0, 0) lands in the viewBox
const EX = [0.86, -0.263] as const; // ground +x on screen: shallow, up-right
const EY = [0.51, 0.443] as const; // ground +y on screen: down-right
const EZ = 0.857; // height foreshortening

type Pt = [number, number];

const P = (x: number, y: number, z = 0): Pt => [
  O.x + K * (EX[0] * x + EY[0] * y),
  O.y + K * (EX[1] * x + EY[1] * y - EZ * z),
];

const fmt = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Ground plan → screen, for anything drawn flat on the street. */
const GROUND = `matrix(${K * EX[0]} ${K * EX[1]} ${K * EY[0]} ${K * EY[1]} ${O.x} ${O.y})`;
/** The same plane raised to height z (block tops, roofs). */
const lifted = (z: number) => `translate(0 ${(-K * EZ * z).toFixed(2)}) ${GROUND}`;

/** Drawing space on a building's front (+y) face: u along x, v down from z. */
const frontFace = (x0: number, y: number, z: number) => {
  const [px, py] = P(x0, y, z);
  return `matrix(${K * EX[0]} ${K * EX[1]} 0 ${K * EZ} ${px} ${py})`;
};
/** Drawing space on a building's left (−x) face: u along y, v down from z. */
const leftFace = (x: number, y0: number, z: number) => {
  const [px, py] = P(x, y0, z);
  return `matrix(${K * EY[0]} ${K * EY[1]} 0 ${K * EZ} ${px} ${py})`;
};

/* ---- Ground plan -------------------------------------------------------- */

const ROAD_X = [-340, -240, -140, -40, 60, 160, 260, 360];
const ROAD_Y = [0, 75, 150, 225, 300];
const HALF_ROAD = 6.5;

const BLOCKS: { x0: number; y0: number; x1: number; y1: number }[] = [
  // The long block the workshop sits on, behind the front street.
  { x0: -420, y0: -260, x1: 460, y1: -HALF_ROAD },
];
for (let i = 0; i < ROAD_X.length - 1; i++) {
  for (let j = 0; j < ROAD_Y.length - 1; j++) {
    BLOCKS.push({
      x0: ROAD_X[i] + HALF_ROAD,
      y0: ROAD_Y[j] + HALF_ROAD,
      x1: ROAD_X[i + 1] - HALF_ROAD,
      y1: ROAD_Y[j + 1] - HALF_ROAD,
    });
  }
}

/* ---- Buildings ---------------------------------------------------------- */

type Box = { x0: number; y0: number; x1: number; y1: number; z0?: number; z1: number };

function boxFaces({ x0, y0, x1, y1, z0 = 0, z1 }: Box) {
  return {
    top: fmt([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]),
    front: fmt([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)]),
    left: fmt([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)]),
  };
}

function Building({
  box,
  top = "#111920",
  front = "#0b1117",
  left = "#080d12",
  edge = "rgba(150,175,195,0.18)",
  children,
}: {
  box: Box;
  top?: string;
  front?: string;
  left?: string;
  edge?: string;
  children?: React.ReactNode;
}) {
  const f = boxFaces(box);
  return (
    <g strokeLinejoin="round">
      <polygon points={f.left} fill={left} stroke={edge} strokeWidth={0.8} />
      <polygon points={f.front} fill={front} stroke={edge} strokeWidth={0.8} />
      <polygon points={f.top} fill={top} stroke={edge} strokeWidth={0.8} />
      {children}
    </g>
  );
}

/** A grid of office windows on a front face, a few of them still lit. */
function Windows({
  x0,
  y,
  z,
  cols,
  rows,
  lit,
}: {
  x0: number;
  y: number;
  z: number;
  cols: number;
  rows: number;
  lit: number[];
}) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = lit.includes(r * cols + c);
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={3 + c * 7}
          y={3 + r * 6.5}
          width={4.2}
          height={3.4}
          fill={on ? "#ffb224" : "#15212b"}
          opacity={on ? 0.85 : 1}
          filter={on ? "url(#city-amber-glow)" : undefined}
        />,
      );
    }
  }
  return <g transform={frontFace(x0, y, z)}>{cells}</g>;
}

/* ---- Routes ------------------------------------------------------------- */

type Track = { pts: Pt[]; cum: number[]; len: number };

/** A polyline through `way` with its corners rounded off, measured by length. */
function makeTrack(way: Pt[], closed: boolean, r = 7): Track {
  const n = way.length;
  const pts: Pt[] = [];
  const toward = (a: Pt, b: Pt, d: number): Pt => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [a[0] + (dx / l) * d, a[1] + (dy / l) * d];
  };
  const corner = (i: number) => {
    const p = way[i];
    const a = toward(p, way[(i - 1 + n) % n], r);
    const b = toward(p, way[(i + 1) % n], r);
    for (let s = 0; s <= 10; s++) {
      const t = s / 10;
      const u = 1 - t;
      pts.push([
        u * u * a[0] + 2 * u * t * p[0] + t * t * b[0],
        u * u * a[1] + 2 * u * t * p[1] + t * t * b[1],
      ]);
    }
  };
  if (closed) {
    for (let i = 0; i < n; i++) corner(i);
    pts.push(pts[0]);
  } else {
    pts.push(way[0]);
    for (let i = 1; i < n - 1; i++) corner(i);
    pts.push(way[n - 1]);
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, cum, len: cum[cum.length - 1] };
}

function pointAt(track: Track, s: number) {
  const { pts, cum, len } = track;
  const d = ((s % len) + len) % len;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return {
    x: a[0] + (b[0] - a[0]) * t,
    y: a[1] + (b[1] - a[1]) * t,
    hd: Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
}

const LANE = 3.2;
const TRACKS = {
  // Round the block in front of the shop.
  loop: makeTrack(
    [
      [-40 + LANE, LANE],
      [60 - LANE, LANE],
      [60 - LANE, 75 - LANE],
      [-40 + LANE, 75 - LANE],
    ],
    true,
  ),
  // Past the shop front, then down the side street toward the viewer.
  front: makeTrack(
    [
      [380, -LANE],
      [-40 - LANE, -LANE],
      [-40 - LANE, 360],
    ],
    false,
  ),
  // Up the near avenue, then right along the shop front.
  avenue: makeTrack(
    [
      [60 + LANE, 360],
      [60 + LANE, LANE],
      [380, LANE],
    ],
    false,
  ),
  // Straight across the middle of the grid.
  cross: makeTrack(
    [
      [-420, 75 + LANE],
      [420, 75 + LANE],
    ],
    false,
  ),
};

const CARS: { track: keyof typeof TRACKS; offset: number; speed: number }[] = [
  { track: "loop", offset: 0.05, speed: 12 },
  { track: "loop", offset: 0.55, speed: 12 },
  { track: "front", offset: 0.42, speed: 14 },
  { track: "front", offset: 0.9, speed: 14 },
  { track: "avenue", offset: 0.3, speed: 13 },
  { track: "cross", offset: 0.48, speed: 15 },
  { track: "cross", offset: 0.12, speed: 15 },
];

/* ---- Cars --------------------------------------------------------------- */

type Rgb = [number, number, number];
type Palette = { body: Rgb; top: Rgb; glass: Rgb; roof: Rgb };

const AMBER: Palette = {
  body: [255, 170, 30],
  top: [255, 208, 96],
  glass: [96, 60, 10],
  roof: [255, 192, 64],
};
const TEAL: Palette = {
  body: [52, 214, 190],
  top: [150, 250, 232],
  glass: [8, 64, 60],
  roof: [110, 236, 214],
};

const VIEW: Pt = [-0.51, 0.86]; // ground direction that faces the viewer
const LIGHT: Pt = [-0.86, 0.5]; // street light falls from the left

const shade = ([r, g, b]: Rgb, k: number) =>
  `rgb(${Math.round(r * k)} ${Math.round(g * k)} ${Math.round(b * k)})`;

const CAR_L = 10.5;
const CAR_W = 5.2;

/** Screen geometry of one car: two visible sides + top, for body then cabin. */
function carGeometry(x: number, y: number, hd: number, pal: Palette) {
  const f: Pt = [Math.cos(hd), Math.sin(hd)];
  const r: Pt = [-f[1], f[0]];
  const at = (a: number, b: number, z: number) =>
    P(x + a * f[0] + b * r[0], y + a * f[1] + b * r[1], z);

  const faces: { points: string; fill: string }[] = [];
  const solid = (a0: number, a1: number, hw: number, z0: number, z1: number, side: Rgb, top: Rgb) => {
    // corners in order: front-left, front-right, back-right, back-left
    const c: [number, number][] = [
      [a1, -hw],
      [a1, hw],
      [a0, hw],
      [a0, -hw],
    ];
    const normals: Pt[] = [f, r, [-f[0], -f[1]], [-r[0], -r[1]]];
    const sides: { points: string; fill: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const n = normals[i];
      if (n[0] * VIEW[0] + n[1] * VIEW[1] <= 0) continue;
      const [a, b] = c[i];
      const [a2, b2] = c[(i + 1) % 4];
      const lit = 0.55 + 0.45 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1]);
      sides.push({
        points: fmt([at(a, b, z0), at(a2, b2, z0), at(a2, b2, z1), at(a, b, z1)]),
        fill: shade(side, lit),
      });
    }
    while (sides.length < 2) sides.push({ points: "", fill: "none" });
    faces.push(...sides, {
      points: fmt([at(a1, -hw, z1), at(a1, hw, z1), at(a0, hw, z1), at(a0, -hw, z1)]),
      fill: shade(top, 1),
    });
  };

  solid(-CAR_L / 2, CAR_L / 2, CAR_W / 2, 0.5, 2.5, pal.body, pal.top);
  solid(-3, 2, CAR_W / 2 - 0.55, 2.5, 4.1, pal.glass, pal.roof);

  const headingToViewer = f[0] * VIEW[0] + f[1] * VIEW[1] > 0;
  const lightA = headingToViewer ? CAR_L / 2 + 0.05 : -CAR_L / 2 - 0.05;
  const lights = [-1.65, 1.65].map((b) => at(lightA, b, 1.6));

  return {
    faces,
    lights,
    lightFill: headingToViewer ? "#fff4cf" : "#ff5b45",
    ground: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${((hd * 180) / Math.PI).toFixed(1)})`,
  };
}

function initialCar(i: number) {
  const car = CARS[i];
  const track = TRACKS[car.track];
  const p = pointAt(track, car.offset * track.len);
  return carGeometry(p.x, p.y, p.hd, AMBER);
}

/** Ground-plane light under a car: a warm pool and the headlight throw. */
function CarGlow({ transform, color, refFn }: { transform: string; color: "amber" | "teal"; refFn?: (el: SVGGElement | null) => void }) {
  return (
    <g ref={refFn} transform={transform}>
      <ellipse rx={13} ry={7.5} fill={`url(#city-${color}-pool)`} />
      <rect x={-CAR_L / 2} y={-CAR_W / 2} width={CAR_L} height={CAR_W} rx={1.6} fill="#000" opacity={0.55} />
      <polygon
        points={`${CAR_L / 2},-1.9 ${CAR_L / 2},1.9 ${CAR_L / 2 + 17},6 ${CAR_L / 2 + 17},-6`}
        fill={`url(#city-${color}-beam)`}
      />
    </g>
  );
}

function CarBody({
  geo,
  refFn,
}: {
  geo: ReturnType<typeof carGeometry>;
  refFn?: (el: SVGGElement | null) => void;
}) {
  return (
    <g ref={refFn} strokeLinejoin="round">
      {geo.faces.map((face, i) => (
        <polygon key={i} points={face.points} fill={face.fill} />
      ))}
      {geo.lights.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.25} fill={geo.lightFill} />
      ))}
    </g>
  );
}

/* ---- Scene -------------------------------------------------------------- */

const SHOP: Box = { x0: 0, y0: -52, x1: 86, y1: -9, z1: 18 };
const ANNEX: Box = { x0: -22, y0: -44, x1: 0, y1: -12, z1: 9 };
const ROOF_UNIT: Box = { x0: 30, y0: -46, x1: 70, y1: -26, z0: 18, z1: 22.5 };
const TOWER: Box = { x0: 106, y0: -70, x1: 152, y1: -18, z1: 30 };
const LOW_RIGHT: Box = { x0: 172, y0: -52, x1: 224, y1: -16, z1: 14 };
const LOW_LEFT: Box = { x0: -130, y0: -62, x1: -64, y1: -20, z1: 10 };
const CORNER: Box = { x0: 96, y0: 92, x1: 148, y1: 138, z1: 32 };

const PARKED = carGeometry(61, -18, Math.PI / 2, TEAL);
const PARKED_SIDE = carGeometry(97, -11.5, Math.PI, AMBER);

export function ShopCity({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const bodies = useRef<(SVGGElement | null)[]>([]);
  const glows = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      CARS.forEach((car, i) => {
        const body = bodies.current[i];
        const glow = glows.current[i];
        if (!body || !glow) return;
        const track = TRACKS[car.track];
        const p = pointAt(track, car.offset * track.len + t * car.speed);
        const geo = carGeometry(p.x, p.y, p.hd, AMBER);
        const polys = body.children;
        geo.faces.forEach((face, k) => {
          const el = polys[k];
          el.setAttribute("points", face.points);
          el.setAttribute("fill", face.fill);
        });
        geo.lights.forEach(([cx, cy], k) => {
          const el = polys[geo.faces.length + k];
          el.setAttribute("cx", cx.toFixed(1));
          el.setAttribute("cy", cy.toFixed(1));
          el.setAttribute("fill", geo.lightFill);
        });
        glow.setAttribute("transform", geo.ground);
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const initial = CARS.map((_, i) => initialCar(i));
  const curb = 1.4; // block kerb height

  return (
    <svg
      viewBox="0 0 1000 1060"
      preserveAspectRatio="xMaxYMid slice"
      className={className}
      aria-hidden
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 12%, #000 36%, #000 88%, transparent), linear-gradient(to right, rgb(0 0 0 / 0.45), #000 58%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 12%, #000 36%, #000 88%, transparent), linear-gradient(to right, rgb(0 0 0 / 0.45), #000 58%)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <defs>
        <radialGradient id="city-amber-pool">
          <stop offset="0" stopColor="#ffb224" stopOpacity={0.5} />
          <stop offset="1" stopColor="#ffb224" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="city-teal-pool">
          <stop offset="0" stopColor="#2fd4c0" stopOpacity={0.55} />
          <stop offset="1" stopColor="#2fd4c0" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="city-amber-beam" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffd27a" stopOpacity={0.32} />
          <stop offset="1" stopColor="#ffd27a" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="city-teal-beam" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7af5e0" stopOpacity={0.25} />
          <stop offset="1" stopColor="#7af5e0" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="city-bay-light" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5ff2dc" stopOpacity={0.55} />
          <stop offset="1" stopColor="#1aa892" stopOpacity={0.25} />
        </linearGradient>
        <radialGradient id="city-bay-spill" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#2fd4c0" stopOpacity={0.4} />
          <stop offset="1" stopColor="#2fd4c0" stopOpacity={0} />
        </radialGradient>
        <filter id="city-neon" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="city-amber-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="city-car-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 0.7 0 0 0  0 0 0.1 0 0  0 0 0 0.7 0" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Asphalt */}
      <rect width="1000" height="1060" fill="#10161b" />

      {/* Blocks: a dark kerb sliver, the raised top, and a sidewalk line inset */}
      <g transform={GROUND}>
        {BLOCKS.map((b, i) => (
          <rect key={i} x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} rx={9} fill="#05080b" />
        ))}
      </g>
      <g transform={lifted(curb)}>
        {BLOCKS.map((b, i) => (
          <g key={i}>
            <rect
              x={b.x0}
              y={b.y0}
              width={b.x1 - b.x0}
              height={b.y1 - b.y0}
              rx={9}
              fill="#0a0e12"
              stroke="rgba(200,214,226,0.34)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={b.x0 + 3}
              y={b.y0 + 3}
              width={b.x1 - b.x0 - 6}
              height={b.y1 - b.y0 - 6}
              rx={7}
              fill="none"
              stroke="rgba(200,214,226,0.1)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </g>

      {/* Lane markings and turn arrows */}
      <g transform={GROUND} stroke="rgba(214,224,232,0.4)" strokeWidth={1.1} vectorEffect="non-scaling-stroke">
        {ROAD_Y.map((y) => (
          <line key={`y${y}`} x1={-420} x2={460} y1={y} y2={y} strokeDasharray="9 11" vectorEffect="non-scaling-stroke" />
        ))}
        {ROAD_X.map((x) => (
          <line key={`x${x}`} x1={x} x2={x} y1={0} y2={380} strokeDasharray="9 11" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g transform={GROUND} fill="none" stroke="#2fd4c0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} filter="url(#city-neon)">
        <path d="M 22 72 l -3 -2.4 l 3 -2.4 M 19 69.6 h 6" vectorEffect="non-scaling-stroke" />
        <path d="M -42.5 118 l 2.4 3 l 2.4 -3 M -40.1 121 v -6" vectorEffect="non-scaling-stroke" />
        <path d="M 112 -1 l 3 2.2 l -3 2.2 M 115 1.2 h -6" vectorEffect="non-scaling-stroke" />
        <path d="M 68 34 l -2.4 -3 l -2.4 3" vectorEffect="non-scaling-stroke" />
      </g>

      {/* Light thrown out of the open bay onto the forecourt */}
      <g transform={GROUND}>
        <rect x={44} y={-9} width={34} height={22} fill="url(#city-bay-spill)" />
      </g>

      {/* Buildings behind the front street */}
      <Building box={LOW_LEFT} />
      <Building box={TOWER}>
        <Windows x0={TOWER.x0} y={TOWER.y1} z={TOWER.z1} cols={6} rows={4} lit={[2, 7, 8, 15, 21]} />
      </Building>
      <Building box={LOW_RIGHT}>
        <Windows x0={LOW_RIGHT.x0} y={LOW_RIGHT.y1} z={LOW_RIGHT.z1} cols={7} rows={2} lit={[1, 10]} />
      </Building>

      {/* The workshop */}
      <Building box={ANNEX} top="#121b22">
        <g transform={leftFace(ANNEX.x0, ANNEX.y0, ANNEX.z1)}>
          <rect x={8} y={2.5} width={7} height={3.2} fill="#ffb224" opacity={0.85} filter="url(#city-amber-glow)" />
          <rect x={18} y={2.5} width={7} height={3.2} fill="#ffb224" opacity={0.65} filter="url(#city-amber-glow)" />
        </g>
        <g transform={frontFace(ANNEX.x0, ANNEX.y1, ANNEX.z1)}>
          <rect x={4} y={3} width={14} height={6} fill="#0f1a21" stroke="rgba(150,175,195,0.25)" strokeWidth={0.2} />
        </g>
      </Building>
      <Building box={SHOP} top="#141e26" front="#0d151c" left="#091016" edge="rgba(150,190,200,0.22)">
        {/* parapet: the roof sits a step inside the walls */}
        <g transform={lifted(SHOP.z1)}>
          <rect
            x={SHOP.x0 + 2}
            y={SHOP.y0 + 2}
            width={SHOP.x1 - SHOP.x0 - 4}
            height={SHOP.y1 - SHOP.y0 - 4}
            fill="#0d151b"
            stroke="rgba(150,190,200,0.22)"
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <g transform={frontFace(SHOP.x0, SHOP.y1, SHOP.z1)}>
          {/* office windows, lit late */}
          <rect x={6} y={7} width={6} height={4.6} fill="#ffb224" filter="url(#city-amber-glow)" />
          <rect x={13} y={7} width={6} height={4.6} fill="#ffb224" opacity={0.9} filter="url(#city-amber-glow)" />
          <line x1={6} x2={19} y1={9.3} y2={9.3} stroke="#7a4a00" strokeWidth={0.35} />
          {/* door */}
          <rect x={24} y={8} width={7} height={10} fill="#05090c" stroke="rgba(255,178,36,0.45)" strokeWidth={0.3} />
          <rect x={25.5} y={10} width={4} height={3} fill="#ffb224" opacity={0.35} />
          {/* the open service bay */}
          <rect x={45} y={6} width={32} height={12} fill="url(#city-bay-light)" />
          <rect x={45} y={6} width={32} height={12} fill="none" stroke="#5ff2dc" strokeWidth={0.45} filter="url(#city-neon)" />
          <line x1={45} x2={77} y1={6.9} y2={6.9} stroke="#bffcf0" strokeWidth={0.5} opacity={0.8} />
          {/* sign */}
          <text
            x={61}
            y={4.2}
            textAnchor="middle"
            fontSize={3.1}
            fontWeight={700}
            letterSpacing={0.55}
            fill="#5ff2dc"
            filter="url(#city-neon)"
            style={{ fontFamily: "var(--font-display), ui-sans-serif, system-ui" }}
          >
            BAYFLOW
          </text>
        </g>
        {/* neon trim along the roofline and the front corner */}
        <polyline
          points={fmt([
            P(SHOP.x0, SHOP.y1, SHOP.z1),
            P(SHOP.x1, SHOP.y1, SHOP.z1),
            P(SHOP.x1, SHOP.y0, SHOP.z1),
          ])}
          fill="none"
          stroke="#2fd4c0"
          strokeWidth={1.3}
          opacity={0.85}
          filter="url(#city-neon)"
        />
        <polyline
          points={fmt([P(SHOP.x0, SHOP.y0, SHOP.z1), P(SHOP.x0, SHOP.y1, SHOP.z1), P(SHOP.x0, SHOP.y1, 0)])}
          fill="none"
          stroke="#2fd4c0"
          strokeWidth={1.1}
          opacity={0.55}
          filter="url(#city-neon)"
        />
      </Building>
      <Building box={ROOF_UNIT} top="#16212a" front="#0e161d" left="#0a1117" />

      {/* Cars: ground light first, then bodies, so a pool never covers a car */}
      <g transform={GROUND}>
        <CarGlow transform={PARKED.ground} color="teal" />
        <CarGlow transform={PARKED_SIDE.ground} color="amber" />
        {initial.map((geo, i) => (
          <CarGlow
            key={i}
            transform={geo.ground}
            color="amber"
            refFn={(el) => {
              glows.current[i] = el;
            }}
          />
        ))}
      </g>
      <g filter="url(#city-car-glow)">
        <CarBody geo={PARKED} />
        <CarBody geo={PARKED_SIDE} />
        {initial.map((geo, i) => (
          <CarBody
            key={i}
            geo={geo}
            refFn={(el) => {
              bodies.current[i] = el;
            }}
          />
        ))}
      </g>

      {/* In front of the traffic */}
      <Building box={CORNER} top="#111920">
        <Windows x0={CORNER.x0} y={CORNER.y1} z={CORNER.z1} cols={7} rows={4} lit={[3, 9, 16, 24]} />
      </Building>
    </svg>
  );
}
