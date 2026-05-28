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
  const id = createId();

  return {
    id,
    title: title.trim() || "Unbenannte Lektüre",
    text,
    sourceType,
    pageCount: metadata.pageCount ?? null,
    pageStarts: metadata.pageStarts,
    pdfAssetId: metadata.pdfAssetId ?? (sourceType === "pdf" ? id : undefined),
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

export function resolvePdfPageReference(
  book: LibraryBook,
  printedPage: number,
  referenceContext = "",
) {
  if (!book.pageStarts?.length) {
    return printedPage;
  }

  const safePrintedPage = Math.round(printedPage);
  if (!Number.isFinite(safePrintedPage)) {
    return 1;
  }

  const contextualPage = findPageByContext(book, safePrintedPage, referenceContext);
  if (contextualPage) {
    return contextualPage;
  }

  const labeledPage = findPageByPrintedLabel(book, safePrintedPage);
  return labeledPage ?? clamp(safePrintedPage, 1, book.pageStarts.length);
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

function findPageByContext(book: LibraryBook, printedPage: number, referenceContext: string) {
  const candidates = getReferenceTitleCandidates(referenceContext);
  if (!candidates.length) {
    return null;
  }

  for (let index = 0; index < book.pageStarts!.length; index += 1) {
    const lines = getPageLines(book, index);
    if (!pageHasPrintedLabel(lines, printedPage)) {
      continue;
    }

    const heading = lines.slice(0, 6).join("");
    if (candidates.some((candidate) => heading.includes(candidate))) {
      return index + 1;
    }
  }

  return null;
}

function findPageByPrintedLabel(book: LibraryBook, printedPage: number) {
  for (let index = 0; index < book.pageStarts!.length; index += 1) {
    const lines = getPageLines(book, index);
    const firstLines = lines.slice(0, 12).join("");

    // TOC pages also contain many standalone numbers. Ignore them when building
    // a printed-page fallback so links do not jump back into the contents.
    if (/目录|目錄|contents|inhaltsverzeichnis/i.test(firstLines) || /[.．·•…⋯]{8,}/u.test(firstLines)) {
      continue;
    }

    if (pageHasPrintedLabel(lines, printedPage)) {
      return index + 1;
    }
  }

  return null;
}

function getPageLines(book: LibraryBook, pageIndex: number) {
  const pageStarts = book.pageStarts!;
  const start = pageStarts[pageIndex];
  const end = pageStarts[pageIndex + 1] ?? book.text.length;

  return book.text
    .slice(start, end)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pageHasPrintedLabel(lines: string[], printedPage: number) {
  const label = String(printedPage);
  const edgeLines = [...lines.slice(0, 4), ...lines.slice(-4)];
  return edgeLines.some((line) => isPageLabel(line, label));
}

function isPageLabel(line: string, label: string) {
  return line === label || line === `-${label}-` || line === `— ${label} —`;
}

function getReferenceTitleCandidates(referenceContext: string) {
  const lineWithLeader =
    referenceContext
      .split(/\r?\n/)
      .reverse()
      .find((line) => /[.．·•…⋯]{3,}/u.test(line)) ?? referenceContext;

  const beforeLeader = lineWithLeader.split(/[.．·•…⋯]{3,}/u)[0] ?? lineWithLeader;
  const rawCandidates = beforeLeader.match(/[\p{Script=Han}]{2,18}/gu) ?? [];
  const ignored = new Set([
    "目录",
    "目錄",
    "旧约",
    "舊約",
    "新约",
    "新約",
    "律法书",
    "律法書",
    "历史书",
    "歷史書",
    "诗歌智慧书",
    "詩歌智慧書",
    "大先知书",
    "大先知書",
    "小先知书",
    "小先知書",
    "四福音",
    "教会历史",
    "教會歷史",
    "书信",
    "書信",
  ]);

  return rawCandidates
    .map((candidate) => candidate.trim())
    .filter((candidate, index, allCandidates) => {
      if (ignored.has(candidate)) {
        return false;
      }

      return allCandidates.indexOf(candidate) === index;
    });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
