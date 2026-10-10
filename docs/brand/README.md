# Brand source files

High-resolution originals. **Not served to the browser** — they live here so the
shipped assets can be regenerated, and so `public/` and `src/app/` stay small.

| Source | Generates | Where it ships |
|---|---|---|
| `logo-light-source.png` (1319×1193, no alpha) | `public/brand/logo-light.png` (128², alpha) | `components/brand/logo.tsx`, light mode |
| `logo-dark-source.png` (1319×1193, alpha) | `public/brand/logo-dark.png` (128², alpha) | `components/brand/logo.tsx`, dark mode |
| `favicon-bright-source.png` (1254²) | `src/app/favicon.ico` (16/32/48) + `src/app/apple-icon.png` (180²) | browser tab, iOS home screen |
| `favicon-dark-source.png` (1254²) | — currently unused | — |

## Processing applied

- **White keyed to alpha.** Both `*-light`/`*-bright` sources were RGB with a solid
  white background baked in (61% and 71% of their pixels). Dropped in as-is they
  render a white box on any non-white surface. Near-white, low-saturation pixels
  were made transparent with a soft ramp so anti-aliased edges stay smooth.
- **Trimmed and letterboxed** to an identical 128×128 canvas, so the two marks swap
  on theme change with zero layout jitter (both land at ink bbox `y 8..119`).
- **Resized**: 1.1 MB → ~23 KB each.

`favicon.ico` is a 3-frame PNG-in-ICO container (16/32/48 px), which every current
browser reads.

## Regenerating

The build script is not checked in (one-shot). To redo it, resize the source to a
128² transparent canvas and rebuild the ICO from the 1254² plate.

## Known issue

The two marks are different colours — amber/graphite in light, cyan/teal in dark.
`globals.css` reserves teal for ready/complete states and names amber the identity
colour, so the dark mark currently reads as a status colour. See the note in the
build discussion before treating this as final.
