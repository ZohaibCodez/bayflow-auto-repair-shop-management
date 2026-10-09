# BayFlow — image prompts

Every image is **optional**. Save a generated file at the path shown and it appears on the site automatically; if a file is missing, the existing design is shown instead (see `src/lib/images.ts`).

Tips: paste each prompt into a **new chat** on its own. Photos → WebP (~80% quality, under ~300 KB). Illustrations → transparent PNG (or a plain white background; it can be removed later). If an image contains readable text or a number plate, regenerate it.

## A. Most important

| # | File | Size | Ratio |
|---|---|---|---|
| 1 | `public/images/hero-bay.webp` | 2400×1400 | 16:9 |
| 2–6 | `public/images/shops/{lahore,karachi,islamabad,rawalpindi,faisalabad}.webp` | 1200×750 | 16:10 |
| 7 | `public/images/shops/default.webp` | 1200×750 | 16:10 |
| 8 | `public/images/auth-panel.webp` | 1200×1600 | 3:4 |

**1 · hero-bay.webp**
> Generate a new image, 2400x1400 pixels, 16:9 wide landscape format. A cinematic, photorealistic photo inside a modern, clean car repair workshop in Pakistan at dusk. A silver sedan is lifted on a two-post car lift on the right side of the frame. Dark polished concrete floor with soft reflections, long LED strip lights on the ceiling, and one warm orange work light glowing from the left. A tool wall is softly blurred in the background. The left one-third of the image is dark and empty, leaving space for a website headline. Moody dark grey and steel colours with a warm orange accent, soft haze in the air, shallow depth of field, premium car magazine photography. No people, no text, no logos, no readable number plates.

**2 · shops/lahore.webp**
> Generate a new image, 1200x750 pixels, 16:10 landscape format. A photorealistic photo of the outside of a clean, family-run car repair workshop on a tree-lined commercial street in Gulberg, Lahore, Pakistan, in the early evening. Two large garage doors are open, with warm orange light shining out from inside onto the footpath. A white Japanese hatchback is parked in front. Brick and plaster front with a small Mughal-style arch above the entrance. Neat, professional and welcoming. Soft cinematic light, shallow depth of field, premium magazine photography. The shop signboard is completely blank. No text, no logos, no readable number plates, no recognisable faces.

**3 · shops/karachi.webp**
> Generate a new image, 1200x750 pixels, 16:10 landscape format. A photorealistic photo of a busy but well-organised car repair workshop in Karachi, Pakistan, on a bright sunny day with a light coastal haze. A palm tree is at the edge of the frame. A mechanic in a plain dark grey uniform, seen from behind, is checking under the bonnet of a silver SUV. An AC service machine stands on a trolley nearby. Concrete and steel building, blue sky, a warm orange light inside the bay. Premium magazine photography, shallow depth of field. The signboard is blank. No text, no logos, no readable number plates, no recognisable faces.

**4 · shops/islamabad.webp**
> Generate a new image, 1200x750 pixels, 16:10 landscape format. A photorealistic photo of a modern glass-fronted car service centre in Islamabad, Pakistan, with green Margalla hills softly visible behind it in crisp morning light. Through the glass you can see a shiny light grey floor and a dark sedan raised on a car lift inside. Minimal, premium, dealership-style feel with cool steel tones and one warm orange accent light. Premium magazine photography, shallow depth of field. No people, no text, no logos, no readable number plates.

**5 · shops/rawalpindi.webp**
> Generate a new image, 1200x750 pixels, 16:10 landscape format. A photorealistic photo inside a tyre and tuning shop in Rawalpindi, Pakistan. Tyres neatly stacked on steel racks forming a clean repeating pattern; in the foreground a wheel-balancing machine with a shiny alloy wheel mounted on it. Warm orange task lighting against a darker, moody grey background. Tidy and professional. Shallow depth of field, premium magazine photography. No people, no text, no logos, no writing on the tyres.

**6 · shops/faisalabad.webp**
> Generate a new image, 1200x750 pixels, 16:10 landscape format. A photorealistic close-up photo in an engine repair workshop in Faisalabad, Pakistan. A mechanic's gloved hands working inside the open engine bay of a white sedan; a tablet resting on the car shows simple coloured graphs only; a tidy red toolbox softly blurred in the background. Dark grey moody tones with one warm orange work light on the engine. Shallow depth of field, premium magazine photography. No faces, no text, no numbers on screens, no logos.

**7 · shops/default.webp**
> Generate a new image, 1200x750 pixels, 16:10 landscape format. A photorealistic photo of an empty, clean, modern car repair bay. A two-post car lift lowered to the floor, dark polished concrete floor, a tool cabinet against the wall lit by a warm orange accent light, LED strip lights on the ceiling. Calm and inviting, wide composition, dark grey and steel colours, soft haze, premium magazine photography. No people, no cars, no text, no logos.

**8 · auth-panel.webp**
> Generate a new image, 1200x1600 pixels, 3:4 tall portrait format. A cinematic, photorealistic photo looking straight down a long, perfectly symmetrical row of car repair bays at night. Each bay has a warm orange light hanging above it; cars raised on lifts fade into the distance. Polished dark floor with mirror-like reflections, strong leading lines to a vanishing point. Mostly dark grey tones; the top third of the image is calm, dark and empty. Soft haze, premium magazine photography. No people, no text, no logos, no number plates.

## B. Service thumbnails — `public/images/services/*.webp`, 800×800, 1:1

**oil-change.webp** — Generate a new image, 800x800 pixels, square 1:1 format. A photorealistic close-up product photo of fresh golden engine oil pouring in a smooth, glossy stream into a car engine's oil filler opening, a brand-new oil filter beside it on a dark grey surface. Warm orange rim light from behind, dark moody background, premium commercial product photography. No text, no labels, no logos.

**brakes.webp** — Generate a new image, 800x800 pixels, square 1:1 format. A photorealistic close-up product photo of a steel brake disc and a red brake caliper seen through the spokes of a dark alloy wheel, new brake pads beside it on a dark grey surface. Warm orange rim light, dark moody background, premium commercial product photography. No text, no logos.

**check-engine.webp** — Generate a new image, 800x800 pixels, square 1:1 format. A photorealistic close-up photo of a dark modern car dashboard at night with one orange engine warning symbol glowing (icon only). Everything else dark and softly blurred. Cinematic. No text, no numbers, no logos.

**tires.webp** — Generate a new image, 800x800 pixels, square 1:1 format. A photorealistic product photo of a single performance car tyre on a dark alloy wheel standing upright on a dark grey floor, sharp tread, soft warm orange side light, dark background. No writing on the tyre, no text, no logos.

**ac.webp** — Generate a new image, 800x800 pixels, square 1:1 format. A photorealistic close-up photo of a car dashboard AC vent with a faint cold mist flowing out, soft cool teal-green light, AC gauges blurred behind, dark grey surroundings. No text, no numbers, no logos.

**inspection.webp** — Generate a new image, 800x800 pixels, square 1:1 format. A photorealistic photo of a mechanic's gloved hand holding an LED inspection torch under a raised car; the warm orange beam lights up the suspension underneath. Dark, moody surroundings. No face, no text, no logos.

## C. Other photos

| File | Size | Prompt |
|---|---|---|
| `public/images/owner-cta.webp` | 1600×900, 16:9 | Generate a new image, 1600x900 pixels, 16:9. A cinematic photorealistic photo of a workshop owner seen from behind on an upper walkway, looking down at a busy but tidy car repair floor with four bays and cars on lifts, mechanics in plain dark grey uniforms below; the owner holds a tablet with simple coloured bar charts. Warm orange lights over the bays. No faces, no readable text, no logos. |
| `src/app/opengraph-image.png` | 1200×630 | Generate a new image, 1200x630 pixels. A cinematic photorealistic photo of a silver car on a lift in a clean repair bay at night, car in the left half lit by one warm orange light; the right half smooth, dark and empty. No people, no text, no logos, no number plates. |
| `public/images/not-found.webp` | 1200×800, 3:2 | Generate a new image, 1200x800 pixels, 3:2. An empty car repair bay at night, the car lift raised high with no car on it, one warm orange light above, polished dark floor, lots of dark empty space, quiet and slightly surreal, photorealistic. No people, no text, no logos. |

## D. "How it works" — `public/images/lifecycle/*.webp`, 1200×800, 3:2

1. `1-booked.webp` — a hand holding a smartphone showing a simple calendar made of shapes with one orange slot, blurred car key and tea cup on a wooden table, warm morning light.
2. `2-confirmed.webp` — a service advisor seen from behind at a clean front desk handing a blank folder to a mechanic in a dark grey uniform, blurred workshop, warm orange lights.
3. `3-inspected.webp` — a mechanic (out of focus) holding a tablet with simple coloured graphs while inspecting a silver car's open engine, warm orange work light.
4. `4-approved.webp` — a thumb tapping a glowing orange button on a phone, simple bar shapes above like a price list, dark background.
5. `5-parts-repair.webp` — tidy parts counter, plain brown boxes on steel shelves, a new ignition coil and oil filter on a metal tray, mechanic's hands blurred behind.
6. `6-quality-checked.webp` — an inspector from behind with a blank clipboard as a clean silver car drives out of a bay, motion blur on the wheels, teal and warm light.
7. `7-ready.webp` — a freshly washed shiny car at the open bay exit in golden sunset light, car key with a blank tag on the bonnet.

Start each with "Generate a new image, 1200x800 pixels, 3:2 landscape format. A photorealistic photo of …" and end with "No faces, no text, no logos, no number plates."

## E. Illustrations (transparent PNG)

Start each with: "Generate a new image, transparent background. A minimal flat line illustration with thin rounded light grey lines and one orange accent, lots of empty space, clean modern app-illustration style. No text, no shadows, no background colour."

- `public/images/empty/no-bookings.png` (600×450) — a small car outline inside an empty garage outline, a tiny orange calendar above it.
- `public/images/empty/queue-clear.png` (600×450) — a clipboard with three ticked boxes, the last tick orange, a small sparkle.
- `public/images/empty/no-results.png` (600×450) — a magnifying glass over a map pin, tiny orange question mark.
- `public/images/booked-success.png` (600×600) — a car key with a round tag, an orange checkmark badge on the tag, small confetti lines.
