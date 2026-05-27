"use client";

import { Bookmark, Check, X } from "lucide-react";
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
  onSave: () => void;
  onClose: () => void;
};

export function WordPopup({
  token,
  position,
  language,
  isSaved,
  onSave,
  onClose,
}: WordPopupProps) {
  const entry = token.entry;
  if (!entry) {
    return null;
  }

  const activeDefinition = getDefinition(entry, language);

  return (
    <aside
      role="dialog"
      aria-label={`Wortkarte ${token.text}`}
      className="fixed z-50 w-[min(21rem,calc(100vw-1.5rem))] rounded-lg border border-archive/10 bg-white p-4 text-left shadow-soft"
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-reader text-3xl leading-none text-ink">{token.text}</p>
          <p className="mt-1 text-sm font-medium text-shelf">{entry.pinyin}</p>
          <p className="mt-2 text-[0.68rem] font-semibold uppercase text-slate-400">
            {entry.isGenerated ? "Pinyin erkannt" : "Wörterbuch"}
          </p>
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

      <div className="mt-3 rounded-md bg-vellum p-3">
        <p className="text-[0.7rem] font-bold uppercase text-slate-500">
          {language === "de" ? "Deutsch" : "English"}
        </p>
        <p className="mt-1 text-sm leading-6 text-ink">{activeDefinition}</p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaved}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-archive/10 px-3 py-2 text-sm font-semibold text-ink transition hover:border-gold hover:text-shelf disabled:border-shelf/20 disabled:bg-shelf/10 disabled:text-shelf"
      >
        {isSaved ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
        {isSaved ? "Gespeichert" : "Wort speichern"}
      </button>
    </aside>
  );
}

function getDefinition(entry: ReaderToken["entry"], language: TranslationLanguage) {
  if (!entry) {
    return "";
  }

  if (entry.isGenerated) {
    return language === "de"
      ? "Noch kein Wörterbucheintrag vorhanden"
      : "No dictionary entry available yet";
  }

  if (language === "de") {
    return entry.germanMissing ? "Noch keine deutsche Übersetzung vorhanden" : entry.german.join(", ");
  }

  return entry.english.length ? entry.english.join(", ") : "No English definition found yet";
}
