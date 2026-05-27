"use client";

import { useCallback, useEffect, useState } from "react";
import { createLibraryBook } from "@/lib/readingSections";
import type { BookImportMetadata, BookSourceType, LibraryBook } from "@/types/library";

const STORAGE_KEY = "hanzilens.library-books.v1";

export function useLibraryBooks() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [hasLoadedBooks, setHasLoadedBooks] = useState(false);

  useEffect(() => {
    setBooks(loadBooks());
    setHasLoadedBooks(true);
  }, []);

  useEffect(() => {
    if (hasLoadedBooks) {
      setStorageWarning(persistBooks(books));
    }
  }, [books, hasLoadedBooks]);

  const addBook = useCallback(
    (title: string, text: string, sourceType: BookSourceType, metadata?: BookImportMetadata) => {
      const book = createLibraryBook(title, text, sourceType, metadata);

      setBooks((currentBooks) => {
        return [book, ...currentBooks];
      });

      return book;
    },
    [],
  );

  const removeBook = useCallback((bookId: string) => {
    setBooks((currentBooks) => {
      return currentBooks.filter((book) => book.id !== bookId);
    });
  }, []);

  const touchBook = useCallback((bookId: string) => {
    setBooks((currentBooks) => {
      return currentBooks.map((book) =>
        book.id === bookId ? { ...book, lastOpenedAt: new Date().toISOString() } : book,
      );
    });
  }, []);

  return {
    books,
    addBook,
    removeBook,
    touchBook,
    storageWarning,
  };
}

function loadBooks() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LibraryBook[]) : [];
  } catch {
    return [];
  }
}

function persistBooks(books: LibraryBook[]) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    return null;
  } catch {
    return "Das Buch ist für localStorage eventuell zu groß. Es bleibt in dieser Sitzung geöffnet, wird aber möglicherweise nicht dauerhaft gespeichert.";
  }
}
