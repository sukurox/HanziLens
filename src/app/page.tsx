"use client";

import { AlertCircle, BookOpen } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { LibraryShelf } from "@/components/LibraryShelf";
import { PdfBookReader } from "@/components/PdfBookReader";
import { Reader } from "@/components/Reader";
import { ReaderOptions } from "@/components/ReaderOptions";
import { SavedWordsPanel } from "@/components/SavedWordsPanel";
import { TextInputPanel } from "@/components/TextInputPanel";
import { ThemeToggle, type ThemeMode } from "@/components/ThemeToggle";
import { useLibraryBooks } from "@/hooks/useLibraryBooks";
import { useSavedWords } from "@/hooks/useSavedWords";
import { extractContextSentence } from "@/lib/context";
import { deletePdfAsset, savePdfAsset } from "@/lib/pdfStorage";
import { getReadingPage, getReadingSection, resolvePdfPageReference } from "@/lib/readingSections";
import type { BookImportMetadata, BookSourceType, LibraryBook, ReadingSection } from "@/types/library";
import type { ReaderToken, TranslationLanguage } from "@/types/reader";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [readerTitle, setReaderTitle] = useState("Eigener Text");
  const [readerText, setReaderText] = useState("");
  const [readerSection, setReaderSection] = useState<ReadingSection | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<ReaderToken[]>([]);
  const deferredTokens = useDeferredValue(tokens);
  const [language, setLanguage] = useState<TranslationLanguage>("de");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { books, addBook, removeBook, touchBook, storageWarning } = useLibraryBooks();
  const { savedWords, savedWordKeys, addWord, removeWord } = useSavedWords();

  const activeBook = useMemo(
    () => books.find((book) => book.id === activeBookId) ?? null,
    [activeBookId, books],
  );

  useEffect(() => {
    const storedTheme = localStorage.getItem("hanzilens.theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("hanzilens.theme", theme);
  }, [theme]);

  async function analyzeSection(book: LibraryBook, sectionIndex: number) {
    const hasPageNavigation = Boolean(book.pageStarts?.length);
    const section = hasPageNavigation
      ? getReadingPage(book, sectionIndex + 1)
      : getReadingSection(book.text, sectionIndex);

    if (!section.text.trim()) {
      setError(hasPageNavigation ? "Diese Seite enthält keinen lesbaren Text." : "Dieser Abschnitt enthält keinen lesbaren Text.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveBookId(book.id);
    setReaderTitle(book.title);
    setReaderSection(section);
    setReaderText(section.text);
    setTokens([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: section.text }),
      });

      const payload = (await response.json()) as { tokens?: ReaderToken[]; error?: string };
      if (!response.ok || !payload.tokens) {
        throw new Error(payload.error ?? "Der Abschnitt konnte nicht analysiert werden.");
      }

      setTokens(payload.tokens);
      touchBook(book.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Beim Analysieren ist ein Fehler aufgetreten.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function importBook(
    text: string,
    sourceName: string,
    sourceType: BookSourceType,
    metadata?: BookImportMetadata,
    originalFileData?: ArrayBuffer,
  ) {
    if (!text.trim()) {
      setError("Bitte füge zuerst chinesischen Text ein.");
      return;
    }

    const book = addBook(sourceName, text, sourceType, metadata);
    if (sourceType === "pdf" && originalFileData && book.pdfAssetId) {
      try {
        await savePdfAsset(book.pdfAssetId, originalFileData);
      } catch {
        setError("Die PDF wurde als Text importiert, aber die Original-PDF konnte nicht lokal gespeichert werden.");
      }
    }

    await analyzeSection(book, 0);
  }

  function openBook(bookId: string) {
    const book = books.find((item) => item.id === bookId);
    if (book) {
      void analyzeSection(book, 0);
    }
  }

  function removeLibraryBook(bookId: string) {
    const book = books.find((item) => item.id === bookId);
    if (book?.pdfAssetId) {
      void deletePdfAsset(book.pdfAssetId).catch(() => undefined);
    }

    removeBook(bookId);

    if (bookId === activeBookId) {
      setActiveBookId(null);
      setReaderTitle("Eigener Text");
      setReaderText("");
      setReaderSection(null);
      setTokens([]);
    }
  }

  function goToSection(nextIndex: number) {
    if (!activeBook) {
      return;
    }

    void analyzeSection(activeBook, nextIndex);
  }

  function goToPage(page: number, referenceContext?: string) {
    if (!activeBook?.pageStarts?.length) {
      return;
    }

    const resolvedPage = referenceContext ? resolvePdfPageReference(activeBook, page, referenceContext) : page;
    void analyzeSection(activeBook, resolvedPage - 1);
  }

  function saveWord(token: ReaderToken) {
    if (!token.entry) {
      return;
    }

    addWord(token.entry, extractContextSentence(readerText, token.start, token.end));
  }

  const canGoPrevious = Boolean(readerSection && readerSection.index > 0);
  const canGoNext = Boolean(readerSection && readerSection.index < readerSection.total - 1);
  const hasPageNavigation = Boolean(activeBook?.pageStarts?.length);
  const currentPage = hasPageNavigation && readerSection ? readerSection.index + 1 : null;
  const pageCount = activeBook?.pageCount ?? activeBook?.pageStarts?.length ?? null;
  const needsPdfReimport = activeBook?.sourceType === "pdf" && !activeBook.pageStarts?.length;
  const needsOriginalPdfReimport = activeBook?.sourceType === "pdf" && !activeBook.pdfAssetId;
  const sectionMeta =
    activeBook && readerSection
      ? hasPageNavigation && currentPage && pageCount
        ? `Seite ${currentPage} von ${pageCount}${
          needsOriginalPdfReimport ? " - Original-PDF fuer PDF.js bitte neu importieren" : ""
        }`
        : `${(readerSection.start + 1).toLocaleString("de-DE")}-${readerSection.end.toLocaleString(
          "de-DE",
        )} von ${activeBook.text.length.toLocaleString("de-DE")} Zeichen${
          needsPdfReimport ? " · PDF für Seiten-Navigation bitte neu importieren" : ""
        }`
      : undefined;
  const canUseOriginalPdfReader = Boolean(
    activeBook?.sourceType === "pdf" && activeBook.pdfAssetId && currentPage && pageCount,
  );

  function renderAnnotatedReader(showHeader = true) {
    return (
      <Reader
        title={readerTitle}
        tokens={deferredTokens}
        language={language}
        savedWordKeys={savedWordKeys}
        isLoading={isLoading}
        sectionIndex={readerSection?.index}
        sectionTotal={readerSection?.total}
        sectionMeta={sectionMeta}
        navigationUnit={hasPageNavigation ? "page" : "section"}
        currentPage={currentPage}
        pageCount={pageCount}
        showHeader={showHeader}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPreviousSection={() => readerSection && goToSection(readerSection.index - 1)}
        onNextSection={() => readerSection && goToSection(readerSection.index + 1)}
        onGoToSection={goToSection}
        onGoToPage={goToPage}
        onSaveWord={saveWord}
      />
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1800px] gap-4 px-3 py-4 sm:px-5 2xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="order-2 space-y-4 2xl:order-1">
          <section className="rounded-lg bg-shelf p-5 text-white shadow-soft">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-white/10 font-reader text-2xl">
                读
              </div>
              <div>
                <h1 className="text-xl font-semibold">HanziLens</h1>
                <p className="text-sm text-white/68">Deine chinesische Lesebibliothek</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-white/10 bg-white/8 p-3">
                <p className="text-white/58">Bücher</p>
                <p className="mt-1 text-lg font-semibold">{books.length}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/8 p-3">
                <p className="text-white/58">Wörter</p>
                <p className="mt-1 text-lg font-semibold">{savedWords.length}</p>
              </div>
            </div>
          </section>

          <LibraryShelf
            books={books}
            activeBookId={activeBookId}
            storageWarning={storageWarning}
            onOpen={openBook}
            onRemove={removeLibraryBook}
          />

          <ReaderOptions language={language} onLanguageChange={setLanguage} />

          <TextInputPanel
            value={inputText}
            onChange={setInputText}
            onSubmit={() => void importBook(inputText, "Eigener Text", "text")}
            isLoading={isLoading}
          />
          <FileUpload
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
            onError={setError}
            onTextExtracted={(text, sourceName, sourceType, metadata, originalFileData) =>
              importBook(text, sourceName, sourceType, metadata, originalFileData)
            }
          />
        </aside>

        <section className="order-1 min-w-0 space-y-4 2xl:order-2">
          <header className="flex flex-col gap-3 rounded-lg border border-archive/10 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-gold/18 text-shelf">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Aktuelle Lektüre</p>
                <h2 className="text-lg font-semibold text-ink">{readerTitle}</h2>
              </div>
            </div>
            <ThemeToggle value={theme} onChange={setTheme} />
          </header>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-cinnabar/30 bg-cinnabar/10 px-4 py-3 text-sm leading-6 text-cinnabar">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          {canUseOriginalPdfReader && activeBook?.pdfAssetId ? (
            <PdfBookReader
              title={readerTitle}
              pdfAssetId={activeBook.pdfAssetId}
              currentPage={currentPage}
              pageCount={pageCount}
              sectionMeta={sectionMeta}
              isLoading={isLoading}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              annotatedReader={renderAnnotatedReader(false)}
              onGoToPage={goToPage}
            />
          ) : (
            renderAnnotatedReader(true)
          )}
        </section>

        <div className="order-3">
          <SavedWordsPanel words={savedWords} language={language} onRemove={removeWord} />
        </div>
      </div>
    </main>
  );
}
