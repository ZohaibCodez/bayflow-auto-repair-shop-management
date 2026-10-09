"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The shop, drawn as a route map — and driven.
 *
 * Ten bays laid out on transit-map geometry (horizontal and 45° runs only, the
 * Beck rule), joined by roads with dashed centrelines. Cars enter at the kerb,
 * park in each bay in turn and leave at the top right.
 *
 * The two loops are the point. BayFlow's state machine has exactly two ways a
 * job can go backwards — `failQc` sends a car from quality control back to the
 * repair bay, and a declined estimate sends it back to the front desk — so
 * those are the two bypasses on the map, and cars really do take them. The
 * background is the lifecycle, running.
 *
 * Canvas 2D on purpose: one element, no library, no GPU context to lose, and it
 * reads the live theme tokens, so light mode is a printed site plan rather than
 * a dimmed version of the dark one.
 */

type Pt = readonly [number, number];

/** Design space. The plan is fitted into whatever box the canvas is given. */
const W = 1120;
const H = 500;

/** The y of the top row — the fit anchors on it. */
const ROW_A = 170;

/**
 * The ten stages as a two-row site plan: six bays along the top, a U-turn on
 * the right, four back along the bottom. A single line of ten would be cramped
 * and tiny at any screen size; the serpentine uses the full height, so every
 * bay, road and car is nearly twice the size.
 *
 * Every run is horizontal, vertical or exactly 45° — the Beck rule, which is
 * what makes a diagram like this read as drawn rather than plotted.
 */
const BAYS: Pt[] = [
  [100, 170], // booked
  [270, 170], // confirmed
  [440, 170], // assigned
  [610, 170], // inspecting
  [780, 170], // estimate sent
  [950, 170], // approved
  [950, 380], // parts          (the bottom row runs back to the left)
  [760, 380], // in repair
  [570, 380], // quality check
  [380, 380], // ready for pick-up
];

const ENTRY: Pt = [-140, 170];
const EXIT: Pt = [-140, 380];

/** The road out of each bay. Index i is the run from bay i to bay i + 1. */
const ROUTE: Pt[][] = [
  [BAYS[0], BAYS[1]],
  [BAYS[1], BAYS[2]],
  [BAYS[2], BAYS[3]],
  [BAYS[3], BAYS[4]],
  [BAYS[4], BAYS[5]],
  // the U-turn: 45° out, straight down, 45° back in
  [BAYS[5], [1030, 250], [1030, 300], BAYS[6]],
  [BAYS[6], BAYS[7]],
  [BAYS[7], BAYS[8]],
  [BAYS[8], BAYS[9]],
];

/**
 * A declined estimate goes back to the desk; a failed check goes back to the
 * bay. These are the only two backwards moves the state machine allows
 * (`rejectEstimate` → `reviseEstimate`, and `failQc`), so they are the only
 * two bypasses on the plan — and cars really do take them.
 */
const LOOPS = {
  // approved (5) → estimate sent (4), over the top row
  revise: {
    from: 5,
    to: 4,
    path: [
      [950, 170],
      [910, 130],
      [820, 130],
      [780, 170],
    ] as Pt[],
  },
  // quality check (8) → in repair (7), under the bottom row
  rework: {
    from: 8,
    to: 7,
    path: [
      [570, 380],
      [610, 420],
      [720, 420],
      [760, 380],
    ] as Pt[],
  },
};

const CHANCE = { revise: 0.18, rework: 0.22 };

/** The last bay a strip shows: the top row only. */
const STRIP_LAST = 5;
const STRIP_EXIT: Pt = [1260, 170];

// ---------------------------------------------------------------- geometry --

type Poly = { pts: Pt[]; segs: number[]; length: number };

function poly(pts: Pt[]): Poly {
  const segs: number[] = [];
  let length = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    length += d;
  }
  return { pts, segs, length };
}

/** Position and heading at `dist` along a polyline. */
function at(p: Poly, dist: number) {
  let d = Math.max(0, Math.min(dist, p.length));
  for (let i = 0; i < p.segs.length; i++) {
    if (d <= p.segs[i] || i === p.segs.length - 1) {
      const a = p.pts[i];
      const b = p.pts[i + 1];
      const t = p.segs[i] === 0 ? 0 : d / p.segs[i];
      return {
        x: a[0] + (b[0] - a[0]) * t,
        y: a[1] + (b[1] - a[1]) * t,
        angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      };
    }
    d -= p.segs[i];
  }
  const last = p.pts[p.pts.length - 1];
  return { x: last[0], y: last[1], angle: 0 };
}

type LoopKind = "revise" | "rework";

/** The road a car drives next, leaving bay `i` (−1 = it hasn't arrived yet). */
function legFrom(i: number, strip = false): { road: Poly; to: number; loop: LoopKind | null } {
  if (i < 0) return { road: poly([ENTRY, BAYS[0]]), to: 0, loop: null };
  if (i === LOOPS.revise.from && Math.random() < CHANCE.revise) {
    return { road: poly(LOOPS.revise.path), to: LOOPS.revise.to, loop: "revise" };
  }
  if (i === LOOPS.rework.from && Math.random() < CHANCE.rework) {
    return { road: poly(LOOPS.rework.path), to: LOOPS.rework.to, loop: "rework" };
  }
  if (strip && i >= STRIP_LAST) return { road: poly([BAYS[STRIP_LAST], STRIP_EXIT]), to: -2, loop: null };
  if (i >= BAYS.length - 1) return { road: poly([BAYS[BAYS.length - 1], EXIT]), to: -2, loop: null };
  return { road: poly(ROUTE[i]), to: i + 1, loop: null };
}

// ------------------------------------------------------------------- paint --

type RGB = [number, number, number];

function readColor(styles: CSSStyleDeclaration, name: string): RGB {
  const raw = styles.getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(raw)?.[1];
  if (hex) {
    const h = hex.length < 6 ? hex.slice(0, 3).replace(/./g, (d) => d + d) : hex.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
  }
  const nums = raw.match(/[\d.]+/g);
  return nums && nums.length >= 3 ? ([0, 1, 2].map((i) => Number(nums[i])) as RGB) : [0, 0, 0];
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: RGB, b: RGB, t: number): RGB =>
  [0, 1, 2].map((i) => Math.round(Math.max(0, Math.min(255, a[i] + (b[i] - a[i]) * t)))) as RGB;

/** A car from above: tapered nose, soft shoulders, a hint of a cabin. */
function drawCar(ctx: CanvasRenderingContext2D, color: RGB, alpha: number) {
  ctx.beginPath();
  ctx.moveTo(-15, -6.4);
  ctx.lineTo(6, -7.2);
  ctx.quadraticCurveTo(16, -6.6, 16, 0);
  ctx.quadraticCurveTo(16, 6.6, 6, 7.2);
  ctx.lineTo(-15, 6.4);
  ctx.quadraticCurveTo(-18, 5.6, -18, 0);
  ctx.quadraticCurveTo(-18, -5.6, -15, -6.4);
  ctx.closePath();
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();

  // windscreen and roof, so it reads as a car and not a capsule
  ctx.beginPath();
  ctx.moveTo(-6, -4.4);
  ctx.lineTo(2.5, -4.4);
  ctx.lineTo(4.4, 0);
  ctx.lineTo(2.5, 4.4);
  ctx.lineTo(-6, 4.4);
  ctx.closePath();
  ctx.fillStyle = rgba([0, 0, 0], alpha * 0.38);
  ctx.fill();
}

type Car = {
  road: Poly;
  dist: number;
  speed: number;
  to: number;
  loop: LoopKind | null;
  /** −1 before the first bay, −2 once it has left the map. */
  bay: number;
  dwell: number;
  passed: boolean;
};

export function BayStage({
  className,
  variant = "plan",
}: {
  className?: string;
  /** "plan" fills the box with the whole site plan; "strip" runs the top row
      along a short, wide band — a floor line under a hero. */
  variant?: "plan" | "strip";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let ink: RGB = [11, 16, 22];
    let amber: RGB = [255, 178, 36];
    let teal: RGB = [47, 212, 167];
    let red: RGB = [242, 109, 109];
    let steel: RGB = [174, 185, 198];
    let dark = true;

    const syncPalette = () => {
      const s = getComputedStyle(document.documentElement);
      dark = document.documentElement.classList.contains("dark");
      ink = readColor(s, "--ink");
      amber = readColor(s, "--amber");
      teal = readColor(s, "--teal");
      red = readColor(s, "--signal-red");
      steel = readColor(s, "--steel");
    };

    const cars: Car[] = [];
    const pulse = BAYS.map(() => 0);
    let spawnIn = 0;

    const strip = variant === "strip";

    function spawn(atBay = -1) {
      const leg = legFrom(atBay, strip);
      cars.push({
        road: leg.road,
        dist: 0,
        speed: 54 + Math.random() * 20,
        to: leg.to,
        loop: leg.loop,
        bay: atBay,
        dwell: 0,
        passed: false,
      });
    }

    function step(dt: number) {
      spawnIn -= dt;
      if (spawnIn <= 0 && cars.length < 9) {
        spawn();
        spawnIn = 1.5 + Math.random() * 1.4;
      }

      for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i];
        if (car.dwell > 0) {
          car.dwell -= dt;
          continue;
        }
        car.dist += car.speed * dt;
        if (car.dist < car.road.length) continue;

        if (car.to === -2) {
          cars.splice(i, 1);
          continue;
        }
        car.bay = car.to;
        if (car.bay === BAYS.length - 1) car.passed = true;
        pulse[car.bay] = 1;
        car.dwell = 0.5 + Math.random() * 0.9;
        const next = legFrom(car.bay, strip);
        car.road = next.road;
        car.to = next.to;
        car.loop = next.loop;
        car.dist = 0;
      }

      for (let i = 0; i < pulse.length; i++) pulse[i] = Math.max(0, pulse[i] - dt * 1.6);
    }

    /** Lay the map into the canvas box, turning it upright in a tall panel. */
    function fit(w: number, h: number) {
      const portrait = h > w * 1.2;
      if (portrait) {
        const s = h / W;
        ctx!.translate((w + H * s) / 2, 0);
        ctx!.rotate(Math.PI / 2);
        ctx!.scale(s, s);
      } else if (variant === "strip") {
        // A band across the foot of a hero: span the width and centre the top
        // row, so the run and its bypass read as one clean line.
        const s = w / W;
        ctx!.translate(0, h * 0.52 - ROW_A * s);
        ctx!.scale(s, s);
      } else {
        const s = Math.max(w / W, (h * 0.62) / H);
        // Right-anchored and anchored on the top row: the U-turn — the best
        // shape on the plan — lands inside the frame instead of being sliced
        // by the edge, and the run trails off to the left under the mask.
        ctx!.translate(Math.min(0, w - W * s), h * 0.58 - ROW_A * s);
        ctx!.scale(s, s);
      }
    }

    const ROADS = strip
      ? [poly([ENTRY, ...BAYS.slice(0, STRIP_LAST + 1), STRIP_EXIT]), poly(LOOPS.revise.path)]
      : [
          poly([ENTRY, ...ROUTE.flatMap((leg) => leg.slice(1)), EXIT]),
          poly(LOOPS.revise.path),
          poly(LOOPS.rework.path),
        ];
    const SHOWN = strip ? BAYS.slice(0, STRIP_LAST + 1) : BAYS;

    function draw(w: number, h: number) {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.fillStyle = rgba(ink, 1);
      ctx!.fillRect(0, 0, w, h);
      ctx!.save();
      fit(w, h);

      // Tarmac has to actually read against the page, so it is mixed toward
      // steel rather than toward the hairline colour.
      const tarmac = mix(ink, steel, dark ? 0.3 : 0.15);
      const kerb = mix(ink, steel, dark ? 0.58 : 0.34);
      const marking = mix(ink, steel, dark ? 1.0 : 0.68);

      // Ambient warmth over the plan, so it reads as a workshop under lights
      // rather than a grey diagram.
      const wash = ctx!.createRadialGradient(W * 0.62, H * 0.5, 0, W * 0.62, H * 0.5, W * 0.72);
      wash.addColorStop(0, rgba(amber, dark ? 0.07 : 0.05));
      wash.addColorStop(1, rgba(amber, 0));
      ctx!.fillStyle = wash;
      ctx!.fillRect(-200, -200, W + 400, H + 400);

      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";

      const trace = (r: Poly) => {
        ctx!.beginPath();
        ctx!.moveTo(r.pts[0][0], r.pts[0][1]);
        for (let i = 1; i < r.pts.length; i++) ctx!.lineTo(r.pts[i][0], r.pts[i][1]);
      };

      // kerb, then surface, then the dashed centreline
      for (const r of ROADS) {
        trace(r);
        ctx!.strokeStyle = rgba(kerb, 1);
        ctx!.lineWidth = 36;
        ctx!.stroke();
      }
      for (const r of ROADS) {
        trace(r);
        ctx!.strokeStyle = rgba(tarmac, 1);
        ctx!.lineWidth = 32;
        ctx!.stroke();
      }
      for (const r of ROADS) {
        trace(r);
        ctx!.setLineDash([18, 22]);
        ctx!.strokeStyle = rgba(marking, 0.85);
        ctx!.lineWidth = 2;
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      SHOWN.forEach(([x, y], i) => {
        const p = pulse[i];
        const occupied = cars.some((c) => c.bay === i && c.dwell > 0);
        const tone = !strip && i === BAYS.length - 1 ? teal : amber;

        // a lamp over the bay that is working
        if (occupied || p > 0) {
          const glow = ctx!.createRadialGradient(x, y, 0, x, y, 86);
          glow.addColorStop(0, rgba(tone, 0.2));
          glow.addColorStop(1, rgba(tone, 0));
          ctx!.fillStyle = glow;
          ctx!.fillRect(x - 86, y - 86, 172, 172);
        }
        if (p > 0) {
          ctx!.beginPath();
          ctx!.arc(x, y, 24 + (1 - p) * 30, 0, Math.PI * 2);
          ctx!.strokeStyle = rgba(tone, p * 0.55);
          ctx!.lineWidth = 2;
          ctx!.stroke();
        }

        // a parking slot, not a dot
        ctx!.beginPath();
        ctx!.roundRect(x - 23, y - 17, 46, 34, 7);
        ctx!.fillStyle = occupied ? rgba(tone, 0.14) : rgba(ink, 0.55);
        ctx!.fill();
        ctx!.strokeStyle = occupied ? rgba(tone, 1) : rgba(steel, dark ? 0.6 : 0.65);
        ctx!.lineWidth = occupied ? 2.4 : 1.6;
        ctx!.stroke();
      });

      for (const car of cars) {
        const tone = car.loop === "rework" ? red : car.passed ? teal : amber;
        const pos = at(car.road, car.dist);

        if (car.dwell <= 0) {
          const tail = at(car.road, Math.max(0, car.dist - 84));
          const grad = ctx!.createLinearGradient(tail.x, tail.y, pos.x, pos.y);
          grad.addColorStop(0, rgba(tone, 0));
          grad.addColorStop(1, rgba(tone, 0.5));
          ctx!.beginPath();
          ctx!.moveTo(tail.x, tail.y);
          ctx!.lineTo(pos.x, pos.y);
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = 9;
          ctx!.stroke();
        }

        ctx!.save();
        ctx!.translate(pos.x, pos.y);
        ctx!.rotate(pos.angle);
        ctx!.shadowColor = rgba(tone, 0.9);
        ctx!.shadowBlur = 20;
        drawCar(ctx!, tone, 1);
        ctx!.restore();
      }

      ctx!.restore();

      if (variant === "strip") return;

      // Only enough falloff to settle the corners — the plan should stay legible.
      const vig = ctx!.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.46,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.78,
      );
      vig.addColorStop(0, rgba(ink, 0));
      vig.addColorStop(1, rgba(ink, dark ? 0.3 : 0.25));
      ctx!.fillStyle = vig;
      ctx!.fillRect(0, 0, w, h);
    }

    let cw = 0;
    let ch = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === cw && h === ch) return false;
      cw = w;
      ch = h;
      canvas.width = w;
      canvas.height = h;
      return true;
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      resize();
      step(dt);
      draw(cw, ch);
    };

    /** A composed still: traffic parked across the map, nothing moving. */
    const drawStill = () => {
      cars.length = 0;
      for (const bay of strip ? [1, 3, 5] : [1, 3, 5, 7, 9]) {
        const leg = legFrom(bay, strip);
        cars.push({
          road: leg.road,
          dist: 0,
          speed: 0,
          to: leg.to,
          loop: null,
          bay,
          dwell: 99,
          passed: !strip && bay === BAYS.length - 1,
        });
      }
      resize();
      draw(cw, ch);
    };

    const repaint = () => (reduce ? drawStill() : draw(cw, ch));

    const play = () => {
      if (reduce || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    syncPalette();

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) play();
        else pause();
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? pause() : play());
    const onResize = () => {
      if (resize() && !raf) repaint();
    };
    const themeObserver = new MutationObserver(() => {
      syncPalette();
      if (!raf) repaint();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    if (reduce) {
      drawStill();
    } else {
      // Open with traffic already on the map rather than an empty shop.
      for (const bay of strip ? [0, 2, 4] : [0, 2, 4, 6, 8]) spawn(bay);
      resize();
      draw(cw, ch);
      play();
    }

    return () => {
      pause();
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [reduce, variant]);

  return <canvas ref={ref} className={className} aria-hidden tabIndex={-1} />;
}
