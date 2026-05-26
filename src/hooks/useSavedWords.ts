"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DictionaryEntryDto, SavedWord } from "@/types/reader";

const STORAGE_KEY = "biberl-reader.saved-words.v1";

export function useSavedWords() {
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);

  useEffect(() => {
    setSavedWords(loadSavedWords());
  }, []);

  const persist = useCallback((nextWords: SavedWord[]) => {
    setSavedWords(nextWords);
    saveToStorage(nextWords);
  }, []);

  const addWord = useCallback(
    (entry: DictionaryEntryDto, context?: string) => {
      setSavedWords((currentWords) => {
        const alreadySaved = currentWords.some((word) => word.simplified === entry.simplified);
        if (alreadySaved) {
          return currentWords;
        }

        const nextWords: SavedWord[] = [
          {
            ...entry,
            id: createId(),
            savedAt: new Date().toISOString(),
            context,
          },
          ...currentWords,
        ];

        saveToStorage(nextWords);
        return nextWords;
      });
    },
    [],
  );

  const removeWord = useCallback(
    (id: string) => {
      persist(savedWords.filter((word) => word.id !== id));
    },
    [persist, savedWords],
  );

  const savedWordKeys = useMemo(
    () => new Set(savedWords.map((word) => word.simplified)),
    [savedWords],
  );

  return {
    savedWords,
    savedWordKeys,
    addWord,
    removeWord,
  };
}

function loadSavedWords() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedWord[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(words: SavedWord[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
