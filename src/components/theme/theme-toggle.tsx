"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// true only after hydration — the stored/system theme isn't known during SSR.
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/**
 * One-click light/dark switch. Until the user clicks, BayFlow follows the OS theme;
 * a click flips whatever is currently showing and that choice is remembered.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";
  const label = mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle colour theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-steel transition-colors hover:border-amber/40 hover:text-amber",
        className,
      )}
    >
      {/* Both icons sit in the same centred 16px box and cross-fade. */}
      <span className="relative block size-4">
        <Sun
          className={cn(
            "absolute inset-0 size-4 transition-all duration-300",
            isDark ? "scale-50 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-4 transition-all duration-300",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-90 opacity-0",
          )}
        />
      </span>
    </button>
  );
}

/** Both choices on show, the active one lit — for screens with room to spare. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "inline-flex h-10 items-center gap-0.5 rounded-full border border-line bg-surface/60 p-1",
        className,
      )}
    >
      {(
        [
          ["light", Sun],
          ["dark", Moon],
        ] as const
      ).map(([theme, Icon]) => {
        const active = mounted && (theme === "dark") === isDark;
        return (
          <button
            key={theme}
            type="button"
            onClick={() => setTheme(theme)}
            aria-label={`${theme === "dark" ? "Dark" : "Light"} theme`}
            aria-pressed={active}
            className={cn(
              "grid size-8 place-items-center rounded-full transition-colors",
              active
                ? "bg-teal/15 text-teal-ink ring-1 ring-teal/40"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
