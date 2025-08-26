"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"     // applies "dark" class on <html>
      defaultTheme="system" // follow OS by default
      enableSystem
      storageKey="issuehub-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
