import { LIFECYCLE } from "@/lib/booking/statuses";
import { IMAGES } from "@/lib/images";
import { FallbackImage } from "@/components/fallback-image";

export function Lifecycle() {
  return (
    <section id="how" className="relative border-t border-line/60 bg-ink">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">
            How a repair flows
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every job moves through the same fixed set of steps. Each step has one
            responsible person, and nothing skips ahead — so the car&rsquo;s status is
            never a guess.
          </p>
        </div>

        <ol className="mt-14">
          {LIFECYCLE.map((step, i) => {
            const last = i === LIFECYCLE.length - 1;
            return (
              <li key={step.label} className="relative flex gap-5 pb-10 last:pb-0">
                {/* rail */}
                {!last && (
                  <span
                    className="absolute left-[17px] top-9 bottom-0 w-px bg-line"
                    aria-hidden
                  />
                )}
                {/* node */}
                <span
                  className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border font-mono text-xs ${
                    last
                      ? "border-teal/50 bg-teal/10 text-teal"
                      : "border-amber/50 bg-amber/10 text-amber"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="pt-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="font-display-md text-lg text-foreground">
                      {step.label}
                    </h3>
                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-steel">
                      {step.owner}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {step.blurb}
                  </p>
                  {IMAGES.lifecycle[i] && (
                    <FallbackImage
                      src={IMAGES.lifecycle[i]}
                      alt=""
                      className="mt-4 aspect-[3/2] w-full max-w-md rounded-lg border border-line object-cover"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
