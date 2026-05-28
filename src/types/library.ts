export type BookSourceType = "text" | "txt" | "pdf" | "epub";

export type BookImportMetadata = {
  pageCount?: number | null;
  pageStarts?: number[];
  pdfAssetId?: string;
};

export type LibraryBook = {
  id: string;
  title: string;
  text: string;
  sourceType: BookSourceType;
  pageCount?: number | null;
  pageStarts?: number[];
  pdfAssetId?: string;
  addedAt: string;
  lastOpenedAt: string;
};

export type ReadingSection = {
  index: number;
  total: number;
  start: number;
  end: number;
  text: string;
};
