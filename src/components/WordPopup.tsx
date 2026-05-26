"use client";

import { Bookmark, Check, X } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import type { ReaderToken, TranslationLanguage } from "@/types/reader";

type PopupPosition = {
  top: number;
  left: number;
};

type WordPopupProps = {
  token: ReaderToken;
  position: PopupPosition;
  language: TranslationLanguage;
  isSaved: boolean;
  onLanguageChange: (language: TranslationLanguage) => void;
  onSave: () => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function WordPopup({
  token,
  position,
  language,
  isSaved,
  onLanguageChange,
  onSave,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: WordPopupProps) {
  const entry = token.entry;
  if (!entry) {
    return null;
  }

  const activeDefinition =
    language === "de"
      ? entry.germanMissing
        ? "Noch keine deutsche Übersetzung vorhanden"
        : entry.german.join(", ")
      : entry.english.length
        ? entry.english.join(", ")
        : "No English definition found yet";

  return (
    <aside
      className="fixed z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-soft"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-reader text-3xl leading-none text-ink">{token.text}</p>
          <p className="mt-1 text-sm font-medium text-jade">{entry.pinyin}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
          aria-label="Popup schließen"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <LanguageToggle value={language} onChange={onLanguageChange} />

      <div className="mt-3 rounded-md bg-paper p-3">
        <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-500">
          {language === "de" ? "Deutsch" : "English"}
        </p>
        <p className="mt-1 text-sm leading-6 text-ink">{activeDefinition}</p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaved}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-ink transition hover:border-jade hover:text-jade disabled:border-jade/20 disabled:bg-jade/10 disabled:text-jade"
      >
        {isSaved ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
        {isSaved ? "Gespeichert" : "Wort speichern"}
      </button>
    </aside>
  );
}
