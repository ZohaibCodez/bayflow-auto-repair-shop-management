"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/**
 * Light / dark / system theme. Defaults to the OS setting; an explicit choice is stored
 * in localStorage (`bayflow-theme`) and survives reloads. next-themes sets the `.dark`
 * class before paint, so there's no flash of the wrong theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="bayflow-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
