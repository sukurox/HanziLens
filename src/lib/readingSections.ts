import type { BookImportMetadata, BookSourceType, LibraryBook, ReadingSection } from "@/types/library";

// Long books should not be segmented all at once. The reader opens one section,
// sends only that section to the API, and keeps the full book in the local shelf.
export const READER_SECTION_LENGTH = 12_000;

export function createLibraryBook(
  title: string,
  text: string,
  sourceType: BookSourceType,
  metadata: BookImportMetadata = {},
): LibraryBook {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: title.trim() || "Unbenannte Lektüre",
    text,
    sourceType,
    pageCount: metadata.pageCount ?? null,
    pageStarts: metadata.pageStarts,
    addedAt: now,
    lastOpenedAt: now,
  };
}

export function getReadingSection(text: string, index: number): ReadingSection {
  const total = getSectionCount(text);
  const safeIndex = clamp(index, 0, total - 1);
  const start = safeIndex * READER_SECTION_LENGTH;
  const end = Math.min(text.length, start + READER_SECTION_LENGTH);

  return {
    index: safeIndex,
    total,
    start,
    end,
    text: text.slice(start, end),
  };
}

export function getReadingPage(book: LibraryBook, page: number): ReadingSection {
  if (!book.pageStarts?.length) {
    return getReadingSection(book.text, 0);
  }

  const safePageIndex = clamp(Math.round(page) - 1, 0, book.pageStarts.length - 1);
  const start = book.pageStarts[safePageIndex];
  const end = book.pageStarts[safePageIndex + 1] ?? book.text.length;

  return {
    index: safePageIndex,
    total: book.pageStarts.length,
    start,
    end,
    text: book.text.slice(start, end).trim(),
  };
}

export function getSectionCount(text: string) {
  return Math.max(1, Math.ceil(text.length / READER_SECTION_LENGTH));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
