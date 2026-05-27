"use client";

import { BookmarkCheck, Trash2 } from "lucide-react";
import type { SavedWord, TranslationLanguage } from "@/types/reader";

type SavedWordsPanelProps = {
  words: SavedWord[];
  language: TranslationLanguage;
  onRemove: (id: string) => void;
};

export function SavedWordsPanel({ words, language, onRemove }: SavedWordsPanelProps) {
  return (
    <aside className="sticky top-4 rounded-lg border border-archive/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-shelf/10 text-shelf">
          <BookmarkCheck size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">Wortschatz</h2>
          <p className="text-xs text-slate-500">{words.length.toLocaleString("de-DE")} Karten im Regal</p>
        </div>
      </div>

      {words.length === 0 ? (
        <p className="rounded-md bg-vellum p-3 text-sm leading-6 text-slate-500">
          Klicke ein Wort im Reader an und speichere es aus der Karte.
        </p>
      ) : (
        <ul className="space-y-3">
          {words.map((word) => {
            const definition = getSavedDefinition(word, language);

            return (
              <li key={word.id} className="rounded-md border border-archive/10 bg-vellum p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-reader text-2xl text-ink">{word.simplified}</p>
                    <p className="text-sm font-medium text-shelf">{word.pinyin}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(word.id)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-cinnabar"
                    aria-label={`${word.simplified} entfernen`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{definition}</p>
                {word.context ? (
                  <p className="mt-2 border-l-2 border-gold/50 pl-2 font-reader text-sm leading-6 text-slate-500">
                    {word.context}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function getSavedDefinition(word: SavedWord, language: TranslationLanguage) {
  if (word.isGenerated === true) {
    return language === "de"
      ? "Noch kein Wörterbucheintrag vorhanden"
      : "No dictionary entry available yet";
  }

  if (language === "de") {
    return word.germanMissing ? "Noch keine deutsche Übersetzung vorhanden" : word.german.join(", ");
  }

  return word.english.length ? word.english.join(", ") : "No English definition found yet";
}
