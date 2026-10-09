/**
 * Writes the pointer's position within an element to `--mx` / `--my`, which the
 * `.spotlight` and `.edge-glow` utilities read. Deliberately not React state:
 * a hover highlight should never cost a render, and these only ever change a
 * paint-only custom property.
 */
export function trackPointer(event: React.PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
  el.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
}
