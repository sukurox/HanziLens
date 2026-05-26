"use client";

import { useMemo, useRef, useState } from "react";
import { WordPopup } from "@/components/WordPopup";
import type { ReaderToken, TranslationLanguage } from "@/types/reader";

type ReaderProps = {
  title: string;
  tokens: ReaderToken[];
  language: TranslationLanguage;
  savedWordKeys: Set<string>;
  onLanguageChange: (language: TranslationLanguage) => void;
  onSaveWord: (token: ReaderToken) => void;
};

type ActiveWord = {
  token: ReaderToken;
  position: {
    top: number;
    left: number;
  };
  locked: boolean;
};

const TOKENS_PER_BLOCK = 260;
const POPUP_WIDTH = 320;

export function Reader({
  title,
  tokens,
  language,
  savedWordKeys,
  onLanguageChange,
  onSaveWord,
}: ReaderProps) {
  const [activeWord, setActiveWord] = useState<ActiveWord | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokenBlocks = useMemo(() => chunkTokens(tokens), [tokens]);

  function showToken(token: ReaderToken, element: HTMLElement, locked: boolean) {
    if (!token.entry) {
      return;
    }

    clearHideTimer(hideTimer);
    setActiveWord({
      token,
      position: getPopupPosition(element.getBoundingClientRect()),
      locked,
    });
  }

  function hideHoverPopup() {
    clearHideTimer(hideTimer);
    hideTimer.current = setTimeout(() => {
      setActiveWord((current) => (current?.locked ? current : null));
    }, 120);
  }

  if (tokens.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
        <p className="font-reader text-3xl text-slate-300">中文</p>
        <h2 className="mt-3 text-base font-semibold text-ink">Noch kein Text geöffnet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Füge chinesischen Text ein oder lade eine TXT/PDF-Datei hoch, um im Reader zu starten.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reader</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
        </div>
        <p className="text-sm text-slate-500">{tokens.length.toLocaleString("de-DE")} Segmente</p>
      </div>

      <article className="whitespace-pre-wrap px-5 py-6 font-reader text-[1.45rem] leading-[2.55rem] text-ink sm:px-8 sm:py-8 sm:text-[1.62rem] sm:leading-[3rem]">
        {tokenBlocks.map((block, blockIndex) => (
          <p key={blockIndex} className="reader-block">
            {block.map((token) =>
              token.isChinese && token.entry ? (
                <button
                  key={token.id}
                  type="button"
                  className={`reader-word align-baseline ${
                    activeWord?.token.id === token.id ? "reader-word-active" : ""
                  }`}
                  onMouseEnter={(event) => showToken(token, event.currentTarget, false)}
                  onMouseLeave={hideHoverPopup}
                  onFocus={(event) => showToken(token, event.currentTarget, false)}
                  onClick={(event) => showToken(token, event.currentTarget, true)}
                >
                  {token.text}
                </button>
              ) : (
                <span key={token.id}>{token.text}</span>
              ),
            )}
          </p>
        ))}
      </article>

      {activeWord ? (
        <WordPopup
          token={activeWord.token}
          position={activeWord.position}
          language={language}
          isSaved={savedWordKeys.has(activeWord.token.entry?.simplified ?? activeWord.token.text)}
          onLanguageChange={onLanguageChange}
          onSave={() => onSaveWord(activeWord.token)}
          onClose={() => setActiveWord(null)}
          onMouseEnter={() => clearHideTimer(hideTimer)}
          onMouseLeave={hideHoverPopup}
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

function clearHideTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}
