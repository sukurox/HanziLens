"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { WordPopup } from "@/components/WordPopup";
import type { ReaderToken, TranslationLanguage } from "@/types/reader";

type ReaderProps = {
  title: string;
  tokens: ReaderToken[];
  language: TranslationLanguage;
  savedWordKeys: Set<string>;
  isLoading: boolean;
  sectionIndex?: number;
  sectionTotal?: number;
  sectionMeta?: string;
  currentPage?: number | null;
  pageCount?: number | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onSaveWord: (token: ReaderToken) => void;
  onPreviousSection?: () => void;
  onNextSection?: () => void;
  onGoToSection?: (index: number) => void;
  onGoToPage?: (page: number) => void;
};

type ActiveWord = {
  token: ReaderToken;
  position: {
    top: number;
    left: number;
  };
};

const TOKENS_PER_BLOCK = 260;
const POPUP_WIDTH = 320;

export function Reader({
  title,
  tokens,
  language,
  savedWordKeys,
  isLoading,
  sectionIndex = 0,
  sectionTotal = 0,
  sectionMeta,
  currentPage,
  pageCount,
  canGoPrevious = false,
  canGoNext = false,
  onSaveWord,
  onPreviousSection,
  onNextSection,
  onGoToSection,
  onGoToPage,
}: ReaderProps) {
  const [activeWord, setActiveWord] = useState<ActiveWord | null>(null);
  const [sectionInput, setSectionInput] = useState("1");
  const [pageInput, setPageInput] = useState("1");

  const tokenBlocks = useMemo(() => chunkTokens(tokens), [tokens]);
  const progress = sectionTotal ? ((sectionIndex + 1) / sectionTotal) * 100 : 0;
  const hasPages = Boolean(pageCount && pageCount > 0);

  useEffect(() => {
    setActiveWord(null);
  }, [tokens]);

  useEffect(() => {
    setSectionInput(String(sectionIndex + 1));
  }, [sectionIndex]);

  useEffect(() => {
    if (currentPage) {
      setPageInput(String(currentPage));
    }
  }, [currentPage]);

  useEffect(() => {
    if (!activeWord) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveWord(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeWord]);

  function showToken(token: ReaderToken, element: HTMLElement) {
    if (!token.entry) {
      return;
    }

    setActiveWord({
      token,
      position: getPopupPosition(element.getBoundingClientRect()),
    });
  }

  function submitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSection = Number(sectionInput);
    if (Number.isFinite(nextSection)) {
      onGoToSection?.(nextSection - 1);
    }
  }

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPage = Number(pageInput);
    if (Number.isFinite(nextPage)) {
      onGoToPage?.(nextPage);
    }
  }

  if (tokens.length === 0) {
    return (
      <section className="relative min-h-[calc(100vh-10rem)] overflow-hidden rounded-lg border border-archive/10 bg-vellum px-5 py-12 text-center shadow-sm">
        <div className="absolute inset-y-0 left-0 w-2 bg-shelf" aria-hidden="true" />
        <div className="mx-auto flex min-h-[520px] max-w-md flex-col items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-9 w-9 animate-spin text-shelf" aria-hidden="true" />
          ) : (
            <p className="font-reader text-5xl text-gold/60">书</p>
          )}
          <h2 className="mt-5 text-base font-semibold text-ink">
            {isLoading ? "Abschnitt wird vorbereitet" : "Noch keine Lektüre geöffnet"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isLoading
              ? "Der Text wird segmentiert, damit du ihn gleich annotiert lesen kannst."
              : "Wähle links einen Text oder ein Dokument aus, dann erscheint hier die Leseseite."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-archive/10 bg-vellum shadow-soft">
      <div className="border-b border-archive/10 px-4 py-4 sm:px-7 lg:px-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">Reader</p>
            <h2 className="mt-1 max-w-3xl text-balance text-xl font-semibold text-ink sm:text-2xl">
              {title}
            </h2>
            {sectionMeta ? <p className="mt-2 text-sm leading-6 text-slate-500">{sectionMeta}</p> : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {hasPages ? (
              <form onSubmit={submitPage} className="min-w-32">
                <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="reader-page">
                  Seite
                </label>
                <div className="mt-1 flex items-center rounded-full border border-archive/10 bg-white px-3 py-1.5">
                  <input
                    id="reader-page"
                    type="number"
                    min={1}
                    max={pageCount ?? undefined}
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
                    className="w-14 bg-transparent text-sm font-semibold text-ink outline-none"
                  />
                  <span className="text-xs text-slate-500">/ {pageCount}</span>
                </div>
              </form>
            ) : null}

            <form onSubmit={submitSection} className="min-w-36">
              <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="reader-section">
                Abschnitt
              </label>
              <div className="mt-1 flex items-center rounded-full border border-archive/10 bg-white px-3 py-1.5">
                <input
                  id="reader-section"
                  type="number"
                  min={1}
                  max={sectionTotal || undefined}
                  value={sectionInput}
                  onChange={(event) => setSectionInput(event.target.value)}
                  className="w-14 bg-transparent text-sm font-semibold text-ink outline-none"
                />
                <span className="text-xs text-slate-500">/ {sectionTotal}</span>
              </div>
            </form>

            <div className="inline-flex rounded-full border border-archive/10 bg-white p-1">
              <button
                type="button"
                onClick={onPreviousSection}
                disabled={!canGoPrevious || isLoading}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Vorherigen Abschnitt öffnen"
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onNextSection}
                disabled={!canGoNext || isLoading}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Nächsten Abschnitt öffnen"
              >
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-archive/10" aria-hidden="true">
          <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="min-h-[calc(100vh-14rem)] whitespace-pre-line px-5 py-9 font-reader text-[1.58rem] leading-[3rem] text-ink sm:px-8 sm:py-12 sm:text-[1.8rem] sm:leading-[3.4rem] lg:px-12 xl:px-16 xl:text-[1.92rem] xl:leading-[3.65rem]">
        <div className="mx-auto max-w-[62rem]">
          {tokenBlocks.map((block, blockIndex) => (
            <p key={blockIndex} className="reader-block mb-6">
              {block.map((token) =>
                token.isChinese && token.entry ? (
                  <button
                    key={token.id}
                    type="button"
                    aria-label={`Wortkarte für ${token.text} öffnen`}
                    className={`reader-word align-baseline ${
                      activeWord?.token.id === token.id ? "reader-word-active" : ""
                    } ${token.entry.isGenerated ? "reader-word-unknown" : ""}`}
                    onClick={(event) => showToken(token, event.currentTarget)}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={token.id}>{token.text}</span>
                ),
              )}
            </p>
          ))}
        </div>
      </article>

      {activeWord ? (
        <WordPopup
          token={activeWord.token}
          position={activeWord.position}
          language={language}
          isSaved={savedWordKeys.has(activeWord.token.entry?.simplified ?? activeWord.token.text)}
          onSave={() => onSaveWord(activeWord.token)}
          onClose={() => setActiveWord(null)}
        />
      ) : null}
    </section>
  );
}

function chunkTokens(tokens: ReaderToken[]) {
  const blocks: ReaderToken[][] = [];
  for (let index = 0; index < tokens.length; index += TOKENS_PER_BLOCK) {
    blocks.push(tokens.slice(index, index + TOKENS_PER_BLOCK));
  }

  return blocks;
}

function getPopupPosition(rect: DOMRect) {
  const viewportPadding = 12;
  const left = clamp(
    rect.left + rect.width / 2 - POPUP_WIDTH / 2,
    viewportPadding,
    window.innerWidth - POPUP_WIDTH - viewportPadding,
  );

  const preferredTop = rect.bottom + 10;
  const top = preferredTop > window.innerHeight - 260 ? Math.max(12, rect.top - 248) : preferredTop;

  return { top, left };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
