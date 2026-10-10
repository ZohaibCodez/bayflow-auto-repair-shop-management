import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BayFlow mark + wordmark.
 *
 * The mark ships as two PNGs — amber-on-light, teal-on-dark — and we render BOTH,
 * letting CSS hide one (`dark:` resolves to `.dark *`, set on <html> by next-themes
 * before paint). Choosing the file from `useTheme()` instead would mean the server
 * can't know which to send, so the wrong mark paints for a frame on every load.
 *
 * Both <Image>s are decorative; the accessible name comes from the wordmark, which
 * falls back to an sr-only label so the lockup is never announced as unnamed.
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
      <Image
        src="/brand/logo-light.png"
        alt=""
        aria-hidden
        width={128}
        height={128}
        loading="eager"
        className="size-8 shrink-0 dark:hidden"
      />
      <Image
        src="/brand/logo-dark.png"
        alt=""
        aria-hidden
        width={128}
        height={128}
        loading="eager"
        className="hidden size-8 shrink-0 dark:block"
      />
      <span
        className={
          showWordmark ? "font-display-md text-[1.15rem] text-foreground" : "sr-only"
        }
      >
        BayFlow
      </span>
    </span>
  );
}
