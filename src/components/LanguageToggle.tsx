"use client";

import type { TranslationLanguage } from "@/types/reader";

type LanguageToggleProps = {
  value: TranslationLanguage;
  onChange: (value: TranslationLanguage) => void;
};

export function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-mist p-1 text-xs font-semibold text-slate-700">
      <button
        type="button"
        onClick={() => onChange("de")}
        className={`rounded-full px-3 py-1.5 transition ${
          value === "de" ? "bg-white text-ink shadow-sm" : "hover:text-ink"
        }`}
      >
        Deutsch
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`rounded-full px-3 py-1.5 transition ${
          value === "en" ? "bg-white text-ink shadow-sm" : "hover:text-ink"
        }`}
      >
        English
      </button>
    </div>
  );
}
