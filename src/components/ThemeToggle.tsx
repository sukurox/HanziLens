"use client";

import { Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark";

type ThemeToggleProps = {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
};

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const isDark = value === "dark";

  return (
    <button
      type="button"
      onClick={() => onChange(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-full border border-archive/10 bg-vellum px-2 py-1.5 text-sm font-semibold text-ink shadow-sm transition hover:border-gold"
      aria-label={isDark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren"}
      aria-pressed={isDark}
    >
      <span className={`grid h-7 w-7 place-items-center rounded-full ${isDark ? "bg-transparent" : "bg-white"}`}>
        <Sun size={15} aria-hidden="true" />
      </span>
      <span className={`grid h-7 w-7 place-items-center rounded-full ${isDark ? "bg-white/10" : "bg-transparent"}`}>
        <Moon size={15} aria-hidden="true" />
      </span>
    </button>
  );
}
