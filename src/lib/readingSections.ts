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

export function getSectionCount(text: string) {
  return Math.max(1, Math.ceil(text.length / READER_SECTION_LENGTH));
}

export function getSectionIndexForOffset(text: string, offset: number) {
  return clamp(Math.floor(offset / READER_SECTION_LENGTH), 0, getSectionCount(text) - 1);
}

export function getPageForOffset(pageStarts: number[] | undefined, offset: number) {
  if (!pageStarts?.length) {
    return null;
  }

  let low = 0;
  let high = pageStarts.length - 1;
  let pageIndex = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (pageStarts[middle] <= offset) {
      pageIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return pageIndex + 1;
}

export function getSectionIndexForPage(book: LibraryBook, page: number) {
  if (!book.pageStarts?.length) {
    return 0;
  }

  const safePage = clamp(Math.round(page), 1, book.pageStarts.length);
  return getSectionIndexForOffset(book.text, book.pageStarts[safePage - 1]);
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
