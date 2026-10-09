"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The lit service bay behind the hero: a floor plane in true perspective
 * receding to a horizon, with work lamps pooling on it and one lamp panning
 * across the bay. Hand-written WebGL2 — no 3D library, one draw call, one
 * fullscreen triangle.
 *
 * It is purely decorative, so it fails quiet: without WebGL2 the `.bay-floor`
 * CSS layer underneath carries the same idea, and with reduced motion it draws
 * a single composed frame instead of running. Colours come from the live theme
 * tokens, so light mode is a daylight workshop rather than a dimmed dark one.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;   // -1..1, smoothed
uniform float uDark;     // 1 = dark theme, 0 = light
uniform vec3 uInk;       // page background
uniform vec3 uAmber;     // the work light
uniform vec3 uTeal;
uniform vec3 uLine;

/* Analytically anti-aliased grid (the "pristine grid" technique): stays crisp
   near the camera and dissolves to a flat tint at the horizon instead of
   aliasing into moire. */
float pristineGrid(vec2 uv, vec2 lineWidth) {
  vec2 ddx = dFdx(uv);
  vec2 ddy = dFdy(uv);
  vec2 uvDeriv = vec2(length(vec2(ddx.x, ddy.x)), length(vec2(ddx.y, ddy.y)));
  bvec2 invertLine = lessThan(vec2(0.5), lineWidth);
  vec2 targetWidth = vec2(
    invertLine.x ? 1.0 - lineWidth.x : lineWidth.x,
    invertLine.y ? 1.0 - lineWidth.y : lineWidth.y
  );
  vec2 drawWidth = clamp(targetWidth, uvDeriv, vec2(0.5));
  vec2 lineAA = uvDeriv * 1.5;
  vec2 gridUV = abs(fract(uv) * 2.0 - 1.0);
  gridUV.x = invertLine.x ? gridUV.x : 1.0 - gridUV.x;
  gridUV.y = invertLine.y ? gridUV.y : 1.0 - gridUV.y;
  vec2 g = smoothstep(drawWidth + lineAA, drawWidth - lineAA, gridUV);
  g *= clamp(targetWidth / drawWidth, 0.0, 1.0);
  g = mix(g, targetWidth, clamp(uvDeriv * 2.0 - 1.0, 0.0, 1.0));
  g.x = invertLine.x ? 1.0 - g.x : g.x;
  g.y = invertLine.y ? 1.0 - g.y : g.y;
  return mix(g.x, 1.0, g.y);
}

void main() {
  // aspect-corrected, y up, origin at centre
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  // Camera 1.15 units above the floor, pitched down, with a little parallax.
  float pitch = 0.30 + uPointer.y * 0.014;
  vec3 rd = normalize(vec3(uv.x, uv.y - pitch, -1.0));
  float yaw = uPointer.x * 0.045;
  float c = cos(yaw), s = sin(yaw);
  rd.xz = mat2(c, -s, s, c) * rd.xz;

  vec3 col = uInk;

  if (rd.y < -0.0005) {
    float t = 1.15 / -rd.y;                  // floor plane at y = 0
    vec2 p = vec2(rd.x, rd.z) * t;

    // The floor slides toward the viewer — a slow sense of travel.
    vec2 gp = vec2(p.x, p.y + uTime * 0.22);

    float bays = pristineGrid(gp * 0.5, vec2(0.013));          // 2-unit bay widths
    float tiles = pristineGrid(gp * 2.0, vec2(0.006)) * 0.38;  // floor tiles
    float lines = clamp(bays + tiles, 0.0, 1.0);

    // Two work lamps, breathing out of phase.
    float l1 = exp(-length(p - vec2(-2.6, -6.0)) * 0.42) * (0.82 + 0.18 * sin(uTime * 0.70));
    float l2 = exp(-length(p - vec2(3.4, -11.0)) * 0.30) * (0.72 + 0.28 * sin(uTime * 0.50 + 2.1));

    // One lamp panning across the bay — the single deliberate event.
    float sweepX = sin(uTime * 0.17) * 7.5;
    float sweep = exp(-abs(p.x - sweepX) * 0.55) * exp(-abs(p.y + 8.0) * 0.07) * 0.6;

    float lit = l1 + l2 + sweep;

    vec3 floorBase = mix(mix(uInk, vec3(1.0), 0.05), uInk * 0.70, uDark);
    vec3 lineCol = mix(mix(uInk, uLine, 0.72), uLine, uDark);

    col = mix(floorBase, lineCol, lines * (0.5 + 0.5 * lit));
    col += uAmber * lit * mix(0.09, 0.20, uDark);
    col += uAmber * pow(lit, 3.0) * 0.09 * uDark;    // wet-floor sheen

    col = mix(col, uInk, clamp(t * 0.055 - 0.06, 0.0, 1.0)); // distance fog
  }

  // Haze sitting on the horizon line.
  float band = exp(-abs(uv.y + pitch) * 9.0);
  col += uAmber * band * mix(0.05, 0.13, uDark);
  col += uTeal * band * 0.02;

  // Quiet the top of the frame so nav and headline always sit on calm ground.
  col = mix(col, uInk, smoothstep(0.02, 0.44, uv.y) * mix(0.60, 0.80, uDark));

  // Vignette.
  float v = length(uv * vec2(0.60, 0.92));
  col = mix(col, uInk, smoothstep(0.44, 1.3, v) * 0.85);

  outColor = vec4(col, 1.0);
}`;

/** `#0b1016` / `#abc` / `rgb(11 16 22)` from a CSS variable -> 0..1 RGB. */
function readColor(styles: CSSStyleDeclaration, name: string): [number, number, number] {
  const raw = styles.getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(raw)?.[1];
  if (hex) {
    const h = hex.length < 6 ? hex.slice(0, 3).replace(/./g, (d) => d + d) : hex.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  }
  const nums = raw.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return [0, 1, 2].map((i) => Number(nums[i]) / 255) as [number, number, number];
  }
  return [0, 0, 0];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`bay-stage shader: ${log}`);
  }
  return sh;
}

export function BayStage({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  // Theme is deliberately NOT a dependency: a canvas only ever gets one WebGL
  // context, so re-running this effect would hand the second run a dead one.
  // The MutationObserver below re-reads the palette instead.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // the CSS floor underneath is the fallback

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
      }
    } catch {
      return;
    }
    gl.useProgram(program);

    // One fullscreen triangle — cheaper than a quad, no index buffer.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      dark: gl.getUniformLocation(program, "uDark"),
      ink: gl.getUniformLocation(program, "uInk"),
      amber: gl.getUniformLocation(program, "uAmber"),
      teal: gl.getUniformLocation(program, "uTeal"),
      line: gl.getUniformLocation(program, "uLine"),
    };

    /** Pull the palette straight off the live theme tokens. */
    const syncPalette = () => {
      const styles = getComputedStyle(document.documentElement);
      gl.uniform1f(u.dark, document.documentElement.classList.contains("dark") ? 1 : 0);
      gl.uniform3fv(u.ink, readColor(styles, "--ink"));
      gl.uniform3fv(u.amber, readColor(styles, "--amber"));
      gl.uniform3fv(u.teal, readColor(styles, "--teal"));
      gl.uniform3fv(u.line, readColor(styles, "--line"));
    };

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const nw = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const nh = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (nw === w && nh === h) return false;
      w = nw;
      h = nh;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
      return true;
    };

    // Pointer parallax, eased toward the target so it never snaps.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    let raf = 0;
    let visible = true;
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      resize();
      current.x += (target.x - current.x) * 0.045;
      current.y += (target.y - current.y) * 0.045;
      gl.uniform2f(u.pointer, current.x, current.y);
      gl.uniform1f(u.time, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const drawStill = () => {
      resize();
      gl.uniform2f(u.pointer, 0, 0);
      gl.uniform1f(u.time, 6.5); // a composed frame, lamps mid-breath
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const play = () => {
      if (reduce || raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    syncPalette();

    // Stop entirely once scrolled past, and while the tab is in the background.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else pause();
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? pause() : play());
    const onResize = () => {
      if (resize() && !raf) drawStill();
    };
    // next-themes flips a class on <html>; re-read the palette when it does.
    const themeObserver = new MutationObserver(() => {
      syncPalette();
      if (!raf) drawStill();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const onLost = (e: Event) => {
      e.preventDefault();
      pause();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });

    drawStill();
    play();

    return () => {
      pause();
      io.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      // Note: no `loseContext()` here. In development React mounts effects
      // twice, and a lost context cannot be re-acquired on the same canvas —
      // the stage would stay blank for the rest of the session.
    };
  }, [reduce]);

  return <canvas ref={ref} className={className} aria-hidden tabIndex={-1} />;
}
