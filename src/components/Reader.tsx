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
  navigationUnit?: "page" | "section";
  currentPage?: number | null;
  pageCount?: number | null;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onSaveWord: (token: ReaderToken) => void;
  onPreviousSection?: () => void;
  onNextSection?: () => void;
  onGoToSection?: (index: number) => void;
  onGoToPage?: (page: number, referenceContext?: string) => void;
};

type ActiveWord = {
  token: ReaderToken;
  position: {
    top: number;
    left: number;
  };
};

type PlainTextPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "page";
      text: string;
      page: number;
      context: string;
    };

const TOKENS_PER_BLOCK = 260;
const POPUP_WIDTH = 320;
const PAGE_LINK_CONTEXT_TOKEN_COUNT = 10;
const PAGE_LINK_CONTEXT_LENGTH = 220;
const PAGE_NUMBER_PATTERN = /\d{1,5}/g;
const DOT_LEADER_PATTERN = /[.．·•…⋯]{3,}/u;
const TRAILING_DOT_LEADER_PATTERN = /[.．·•…⋯]{3,}[\s\u00a0]*$/u;

export function Reader({
  title,
  tokens,
  language,
  savedWordKeys,
  isLoading,
  sectionIndex = 0,
  sectionTotal = 0,
  sectionMeta,
  navigationUnit = "section",
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
  const hasPages = navigationUnit === "page" && Boolean(pageCount && pageCount > 0);
  const linkedPageCount = hasPages ? pageCount : null;

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

            {navigationUnit === "section" ? (
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
            ) : null}

            <div className="inline-flex rounded-full border border-archive/10 bg-white p-1">
              <button
                type="button"
                onClick={onPreviousSection}
                disabled={!canGoPrevious || isLoading}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={navigationUnit === "page" ? "Vorherige Seite öffnen" : "Vorherigen Abschnitt öffnen"}
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onNextSection}
                disabled={!canGoNext || isLoading}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={navigationUnit === "page" ? "Nächste Seite öffnen" : "Nächsten Abschnitt öffnen"}
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

      <article className="min-h-[calc(100vh-14rem)] whitespace-pre-wrap px-5 py-9 font-reader text-[1.58rem] leading-[3rem] text-ink sm:px-8 sm:py-12 sm:text-[1.8rem] sm:leading-[3.4rem] lg:px-12 xl:px-16 xl:text-[1.92rem] xl:leading-[3.65rem]">
        <div className="mx-auto max-w-[62rem]">
          {tokenBlocks.map((block, blockIndex) => (
            <p key={blockIndex} className="reader-block mb-6">
              {block.map((token, tokenIndex) =>
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
                  renderPlainTextToken(token, block, tokenIndex, linkedPageCount, onGoToPage)
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

function renderPlainTextToken(
  token: ReaderToken,
  block: ReaderToken[],
  tokenIndex: number,
  pageCount: number | null | undefined,
  onGoToPage?: (page: number, referenceContext?: string) => void,
) {
  if (!pageCount || !onGoToPage) {
    return <span key={token.id}>{token.text}</span>;
  }

  const leadingContext = getLeadingContext(block, tokenIndex);
  const parts = splitPageReferences(token.text, leadingContext, pageCount);

  if (parts.length === 1 && parts[0].type === "text") {
    return <span key={token.id}>{token.text}</span>;
  }

  return (
    <span key={token.id}>
      {parts.map((part, partIndex) =>
        part.type === "page" ? (
          <button
            key={`${partIndex}-${part.text}`}
            type="button"
            className="reader-page-link align-baseline"
            aria-label={`Zu Seite ${part.page} springen`}
            title={`Zu Seite ${part.page} springen`}
            onClick={() => onGoToPage(part.page, part.context)}
          >
            {part.text}
          </button>
        ) : (
          <span key={`${partIndex}-${part.text}`}>{part.text}</span>
        ),
      )}
    </span>
  );
}

function splitPageReferences(text: string, leadingContext: string, pageCount: number): PlainTextPart[] {
  const parts: PlainTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(PAGE_NUMBER_PATTERN)) {
    const value = match[0];
    const index = match.index ?? 0;
    const page = Number(value);

    if (!looksLikeTocPageReference(text, leadingContext, index, value.length, page, pageCount)) {
      continue;
    }

    if (index > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, index) });
    }

    parts.push({
      type: "page",
      text: value,
      page,
      context: getReferenceContext(text, leadingContext, index, value.length),
    });
    cursor = index + value.length;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) });
  }

  return parts.length ? parts : [{ type: "text", text }];
}

function looksLikeTocPageReference(
  text: string,
  leadingContext: string,
  index: number,
  length: number,
  page: number,
  pageCount: number,
) {
  if (!Number.isInteger(page) || page < 1 || page > pageCount) {
    return false;
  }

  const beforeChar = index > 0 ? text[index - 1] : leadingContext.at(-1) ?? "";
  const afterChar = text[index + length] ?? "";
  if (/\d/.test(beforeChar) || /\d/.test(afterChar)) {
    return false;
  }

  // Avoid chapter counts such as "40章". TOC target numbers usually stand alone.
  if (/^[章节卷年月日号]/u.test(afterChar)) {
    return false;
  }

  const combinedBefore = `${leadingContext}${text.slice(0, index)}`;
  const lineBefore = getCurrentLinePrefix(combinedBefore);
  const shortPrefix = lineBefore.slice(-80);

  return TRAILING_DOT_LEADER_PATTERN.test(shortPrefix) || DOT_LEADER_PATTERN.test(lineBefore);
}

function getLeadingContext(block: ReaderToken[], tokenIndex: number) {
  return block
    .slice(Math.max(0, tokenIndex - PAGE_LINK_CONTEXT_TOKEN_COUNT), tokenIndex)
    .map((token) => token.text)
    .join("")
    .slice(-PAGE_LINK_CONTEXT_LENGTH);
}

function getReferenceContext(text: string, leadingContext: string, index: number, length: number) {
  const combined = `${leadingContext}${text}`;
  const matchIndex = leadingContext.length + index;
  const lineStart = Math.max(combined.lastIndexOf("\n", matchIndex), combined.lastIndexOf("\r", matchIndex)) + 1;
  const lineEnd = combined.indexOf("\n", matchIndex);
  const end = lineEnd === -1 ? Math.min(combined.length, matchIndex + length + 40) : lineEnd;

  return combined.slice(Math.max(lineStart, matchIndex - PAGE_LINK_CONTEXT_LENGTH), end);
}

function getCurrentLinePrefix(text: string) {
  const lineStart = Math.max(text.lastIndexOf("\n"), text.lastIndexOf("\r")) + 1;
  return text.slice(lineStart);
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
