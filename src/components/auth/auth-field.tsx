"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A form field for the auth screens.
 *
 * Deliberately a native `<input>` rather than the shared `Input` primitive: this
 * field owns an icon, a focus accent, a reveal toggle and a Caps Lock warning,
 * all of which need to sit inside the control's own box. It uses the same theme
 * tokens, so it still looks like everything else.
 */
export function AuthField({
  label,
  icon,
  hint,
  invalid,
  className,
  type = "text",
  ...props
}: Omit<ComponentProps<"input">, "id"> & {
  label: string;
  icon?: ReactNode;
  hint?: ReactNode;
  invalid?: boolean;
}) {
  const id = useId();
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <div className="group/field">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {/* Caps Lock beats "incorrect password" as an explanation, so say it
            while they are still typing. */}
        {capsLock ? <span className="text-xs text-amber-ink">Caps Lock is on</span> : hint}
      </div>

      <div
        className={cn(
          "relative mt-1.5 overflow-hidden rounded-xl border bg-surface transition-colors",
          invalid
            ? "border-destructive/60"
            : "border-line focus-within:border-amber/60 hover:border-steel/40",
        )}
      >
        {/* The accent grows from the left edge as the field takes focus. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 transition-transform duration-300 group-focus-within/field:scale-y-100",
            invalid ? "bg-destructive" : "bg-amber",
          )}
        />
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/field:text-amber-ink">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={invalid || undefined}
          onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
          onKeyDown={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
          onBlur={() => setCapsLock(false)}
          className={cn(
            "h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70",
            icon ? "pl-11" : "pl-4",
            isPassword ? "pr-12" : "pr-4",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide characters" : "Show characters"}
            aria-pressed={revealed}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
