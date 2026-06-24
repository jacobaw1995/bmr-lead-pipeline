"use client";

import { useEffect } from "react";
import type { ThemePreference } from "@/types/database";

interface ThemeProviderProps {
  theme: ThemePreference;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <>{children}</>;
}