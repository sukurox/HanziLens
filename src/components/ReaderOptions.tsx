"use client";

import { Languages } from "lucide-react";
import type { TranslationLanguage } from "@/types/reader";

type ReaderOptionsProps = {
  language: TranslationLanguage;
  onLanguageChange: (language: TranslationLanguage) => void;
};

const TRANSLATION_OPTIONS: Array<{ value: TranslationLanguage; label: string }> = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

export function ReaderOptions({ language, onLanguageChange }: ReaderOptionsProps) {
  return (
    <section className="rounded-lg border border-archive/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-gold/18 text-shelf">
          <Languages size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">Optionen</h2>
          <p className="text-xs text-slate-500">Reader und Wörterbuch</p>
        </div>
      </div>

      <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="translation-language">
        Übersetzungssprache
      </label>
      <select
        id="translation-language"
        value={language}
        onChange={(event) => onLanguageChange(event.target.value as TranslationLanguage)}
        className="mt-2 w-full rounded-md border border-archive/10 bg-vellum px-3 py-2 text-sm font-medium text-ink shadow-sm"
      >
        {TRANSLATION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </section>
  );
}
