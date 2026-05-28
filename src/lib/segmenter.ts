import { dictionaryWords, dictionaryWordSet, lookupDictionaryEntry } from "@/lib/dictionary";
import type { ReaderToken } from "@/types/reader";

type NodeJiebaApi = {
  cut: (sentence: string, hmm?: boolean) => string[];
};

let cachedJieba: NodeJiebaApi | null | false = null;

const CHINESE_RUN_REGEX = /[\u3400-\u9FFF\uF900-\uFAFF]+/gu;
const MAX_FALLBACK_WORD_LENGTH = dictionaryWords.reduce(
  (maxLength, word) => Math.max(maxLength, word.length),
  1,
);
const MAX_DICTIONARY_MATCH_LENGTH = Math.min(MAX_FALLBACK_WORD_LENGTH, 16);

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
      return dictionaryAwareSegment(run, words);
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
    const match = findLongestDictionaryMatch(run, cursor);
    const nextWord = match || run[cursor];
    words.push(nextWord);
    cursor += nextWord.length;
  }

  return words;
}

function dictionaryAwareSegment(run: string, baseWords: string[]) {
  const words: string[] = [];
  let cursor = 0;
  let baseIndex = 0;
  let baseOffset = 0;

  while (cursor < run.length) {
    while (baseIndex < baseWords.length && baseOffset < cursor) {
      baseOffset += baseWords[baseIndex].length;
      baseIndex += 1;
    }

    const dictionaryMatch = findLongestDictionaryMatch(run, cursor);
    if (dictionaryMatch && dictionaryMatch.length > 1) {
      words.push(dictionaryMatch);
      cursor += dictionaryMatch.length;
      continue;
    }

    const baseWord = baseOffset === cursor ? baseWords[baseIndex] : "";
    const nextWord = baseWord || run[cursor];
    words.push(nextWord);
    cursor += nextWord.length;
  }

  return words;
}

function findLongestDictionaryMatch(run: string, cursor: number) {
  const maxLength = Math.min(MAX_DICTIONARY_MATCH_LENGTH, run.length - cursor);

  for (let length = maxLength; length > 0; length -= 1) {
    const candidate = run.slice(cursor, cursor + length);
    if (dictionaryWordSet.has(candidate)) {
      return candidate;
    }
  }

  return "";
}
