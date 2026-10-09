import { cn } from "@/lib/utils";

/**
 * BayFlow mark: a service-bay gauge — an arc sweeping to a lit amber needle,
 * framed like a bay. The wordmark is set in expanded Archivo.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-md bg-surface-2 ring-1 ring-line">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
          {/* gauge arc */}
          <path
            d="M4 16a8 8 0 1 1 16 0"
            stroke="currentColor"
            className="text-steel/50"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* needle to the amber mark */}
          <path
            d="M12 16 16.5 9.5"
            stroke="var(--amber)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1.7" fill="var(--amber)" />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display-md text-[1.15rem] text-foreground">
          BayFlow
        </span>
      )}
    </span>
  );
}
