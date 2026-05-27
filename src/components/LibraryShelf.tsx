"use client";

import { BookOpen, Clock3, Trash2 } from "lucide-react";
import { getSectionCount } from "@/lib/readingSections";
import type { LibraryBook } from "@/types/library";

type LibraryShelfProps = {
  books: LibraryBook[];
  activeBookId: string | null;
  storageWarning: string | null;
  onOpen: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};

export function LibraryShelf({
  books,
  activeBookId,
  storageWarning,
  onOpen,
  onRemove,
}: LibraryShelfProps) {
  return (
    <section className="rounded-lg border border-archive/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-shelf/10 text-shelf">
          <BookOpen size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">Bibliothek</h2>
          <p className="text-xs text-slate-500">{books.length.toLocaleString("de-DE")} Bücher im Regal</p>
        </div>
      </div>

      {storageWarning ? (
        <p className="mb-3 rounded-md border border-gold/30 bg-gold/10 p-3 text-xs leading-5 text-archive">
          {storageWarning}
        </p>
      ) : null}

      {books.length === 0 ? (
        <p className="rounded-md bg-vellum p-3 text-sm leading-6 text-slate-500">
          Importiere eine TXT- oder PDF-Datei, dann erscheint sie hier als Buch.
        </p>
      ) : (
        <ul className="space-y-2">
          {books.map((book) => {
            const isActive = book.id === activeBookId;

            return (
              <li
                key={book.id}
                className={`rounded-md border p-2 transition ${
                  isActive ? "border-gold/60 bg-gold/10" : "border-archive/10 bg-vellum"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(book.id)}
                    className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition hover:bg-white"
                  >
                    <span className="block truncate text-sm font-semibold text-ink">{book.title}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 size={12} aria-hidden="true" />
                      {book.pageCount ? `${book.pageCount.toLocaleString("de-DE")} Seiten · ` : ""}
                      {getSectionCount(book.text).toLocaleString("de-DE")} Abschnitte
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(book.id)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-cinnabar"
                    aria-label={`${book.title} entfernen`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
