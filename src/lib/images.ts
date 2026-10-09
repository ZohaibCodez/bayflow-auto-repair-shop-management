/**
 * Every marketing / illustration image the site can show, in one place. All of them are
 * optional: drop a file at the path and it appears; if it's missing the existing design
 * shows instead (CSS backgrounds simply don't paint, <FallbackImage> swaps in its fallback).
 * Prompts for generating each one live in docs/IMAGE-PROMPTS.md.
 */
export const IMAGES = {
  hero: "/images/hero-bay.png",
  authPanel: "/images/auth-panel.png",
  ownerCta: "/images/owner-cta.png",
  notFound: "/images/not-found.png",
  bookedSuccess: "/images/booked-success.png",
  defaultShop: "/images/shops/default.png",
  empty: {
    noBookings: "/images/empty/no-bookings.png",
    queueClear: "/images/empty/queue-clear.png",
    noResults: "/images/empty/no-results.png",
  },
  lifecycle: [
    "/images/lifecycle/1-booked.png",
    "/images/lifecycle/2-confirmed.png",
    "/images/lifecycle/3-inspected.png",
    "/images/lifecycle/4-approved.png",
    "/images/lifecycle/5-parts-repair.png",
    "/images/lifecycle/6-quality-checked.png",
    "/images/lifecycle/7-ready.png",
  ],
} as const;

/** Service thumbnail chosen from the service name (catalogues are per shop, names vary). */
export function serviceImage(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("oil")) return "/images/services/oil-change.png";
  if (n.includes("brake")) return "/images/services/brakes.png";
  if (n.includes("engine") || n.includes("diagnos")) return "/images/services/check-engine.png";
  if (n.includes("tire") || n.includes("tyre") || n.includes("wheel")) return "/images/services/tires.png";
  if (/\bac\b|air ?con|a\/c/.test(n)) return "/images/services/ac.png";
  if (n.includes("inspect") || n.includes("check")) return "/images/services/inspection.png";
  return null;
}

/**
 * Inline style for a decorative background photo layered over a fallback. If the file is
 * missing the browser skips that layer and the fallback gradient shows — no JS needed.
 */
export function photoBackground(src: string | null | undefined, fallback: string) {
  return {
    backgroundImage: src ? `url("${src}"), ${fallback}` : fallback,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;
}
