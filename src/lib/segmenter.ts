import { dictionaryWords, dictionaryWordSet, lookupDictionaryEntry } from "@/lib/dictionary";
import type { ReaderToken } from "@/types/reader";

type NodeJiebaApi = {
  cut: (sentence: string, hmm?: boolean) => string[];
};

let cachedJieba: NodeJiebaApi | null | false = null;

const CHINESE_RUN_REGEX = /[\u3400-\u9FFF\uF900-\uFAFF]+/gu;
const MAX_FALLBACK_WORD_LENGTH = Math.max(1, ...dictionaryWords.map((word) => word.length));

export function segmentChineseText(text: string): ReaderToken[] {
  const tokens: ReaderToken[] = [];
  let cursor = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(CHINESE_RUN_REGEX)) {
    const matchStart = match.index ?? 0;
    const run = match[0];

    if (matchStart > cursor) {
      tokenIndex = pushPlainToken(tokens, text.slice(cursor, matchStart), cursor, tokenIndex);
    }

    let runOffset = matchStart;
    for (const word of segmentChineseRun(run)) {
      const cleanWord = word.trim();
      if (!cleanWord) {
        continue;
      }

      tokens.push({
        id: `token-${tokenIndex}`,
        text: cleanWord,
        isChinese: true,
        start: runOffset,
        end: runOffset + cleanWord.length,
        entry: lookupDictionaryEntry(cleanWord),
      });

      tokenIndex += 1;
      runOffset += cleanWord.length;
    }

    cursor = matchStart + run.length;
  }

  if (cursor < text.length) {
    pushPlainToken(tokens, text.slice(cursor), cursor, tokenIndex);
  }

  return tokens;
}

function pushPlainToken(
  tokens: ReaderToken[],
  text: string,
  start: number,
  tokenIndex: number,
) {
  if (!text) {
    return tokenIndex;
  }

  tokens.push({
    id: `token-${tokenIndex}`,
    text,
    isChinese: false,
    start,
    end: start + text.length,
  });

  return tokenIndex + 1;
}

function segmentChineseRun(run: string) {
  const jieba = loadJieba();

  if (jieba) {
    const words = jieba.cut(run).filter(Boolean);
    if (words.length > 0) {
      return words;
    }
  }

  return fallbackSegment(run);
}

function loadJieba() {
  if (cachedJieba !== null) {
    return cachedJieba || null;
  }

  try {
    // nodejieba is native and server-only, so it is loaded lazily inside the API route.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedJieba = require("nodejieba") as NodeJiebaApi;
  } catch {
    cachedJieba = false;
  }

  return cachedJieba || null;
}

function fallbackSegment(run: string) {
  const words: string[] = [];
  let cursor = 0;

  while (cursor < run.length) {
    let match = "";
    const maxLength = Math.min(MAX_FALLBACK_WORD_LENGTH, run.length - cursor);

    for (let length = maxLength; length > 0; length -= 1) {
      const candidate = run.slice(cursor, cursor + length);
      if (dictionaryWordSet.has(candidate)) {
        match = candidate;
        break;
      }
    }

    const nextWord = match || run[cursor];
    words.push(nextWord);
    cursor += nextWord.length;
  }

  return words;
}
