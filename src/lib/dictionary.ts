import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pinyin } from "pinyin-pro";
import { convert } from "pinyin-pro";
import type { DictionaryEntryDto } from "@/types/reader";

type DictionarySource = "cc-cedict-seed" | "de-extension" | "handedict" | "generated";

export type MultilingualDictionaryEntry = {
  simplified: string;
  traditional: string;
  pinyin: string;
  english: string[];
  german?: string[];
  source: DictionarySource;
};

// MVP seed data in the shape used by CC-CEDICT plus a small German extension.
// Later, a full CC-CEDICT import can replace or extend this array.
const CEDICT_SEED: MultilingualDictionaryEntry[] = [
  {
    simplified: "喜欢",
    traditional: "喜歡",
    pinyin: "xǐ huān",
    english: ["to like", "to enjoy"],
    german: ["mögen", "gern haben"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "学习",
    traditional: "學習",
    pinyin: "xué xí",
    english: ["to learn", "to study"],
    german: ["lernen", "studieren"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "中文",
    traditional: "中文",
    pinyin: "Zhōng wén",
    english: ["Chinese language"],
    german: ["Chinesisch"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "中国",
    traditional: "中國",
    pinyin: "Zhōng guó",
    english: ["China"],
    german: ["China"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "北京",
    traditional: "北京",
    pinyin: "Běi jīng",
    english: ["Beijing"],
    german: ["Peking", "Beijing"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "上海",
    traditional: "上海",
    pinyin: "Shàng hǎi",
    english: ["Shanghai"],
    german: ["Shanghai"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "今天",
    traditional: "今天",
    pinyin: "jīn tiān",
    english: ["today"],
    german: ["heute"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "明天",
    traditional: "明天",
    pinyin: "míng tiān",
    english: ["tomorrow"],
    german: ["morgen"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "昨天",
    traditional: "昨天",
    pinyin: "zuó tiān",
    english: ["yesterday"],
    german: ["gestern"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "读",
    traditional: "讀",
    pinyin: "dú",
    english: ["to read", "to study"],
    german: ["lesen"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "看",
    traditional: "看",
    pinyin: "kàn",
    english: ["to see", "to read", "to look at"],
    german: ["sehen", "anschauen", "lesen"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "书",
    traditional: "書",
    pinyin: "shū",
    english: ["book"],
    german: ["Buch"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "故事",
    traditional: "故事",
    pinyin: "gù shi",
    english: ["story", "tale"],
    german: ["Geschichte", "Erzählung"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "内容",
    traditional: "內容",
    pinyin: "nèi róng",
    english: ["content", "substance"],
    german: ["Inhalt"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "语言",
    traditional: "語言",
    pinyin: "yǔ yán",
    english: ["language"],
    german: ["Sprache"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "帮助",
    traditional: "幫助",
    pinyin: "bāng zhù",
    english: ["help", "assistance", "to help"],
    german: ["Hilfe", "helfen"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "朋友",
    traditional: "朋友",
    pinyin: "péng you",
    english: ["friend"],
    german: ["Freund", "Freundin"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "老师",
    traditional: "老師",
    pinyin: "lǎo shī",
    english: ["teacher"],
    german: ["Lehrer", "Lehrerin"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "学生",
    traditional: "學生",
    pinyin: "xué sheng",
    english: ["student"],
    german: ["Schüler", "Student"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "可以",
    traditional: "可以",
    pinyin: "kě yǐ",
    english: ["can", "may", "possible"],
    german: ["können", "dürfen"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "觉得",
    traditional: "覺得",
    pinyin: "jué de",
    english: ["to think", "to feel"],
    german: ["finden", "meinen", "das Gefühl haben"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "时候",
    traditional: "時候",
    pinyin: "shí hou",
    english: ["time", "moment"],
    german: ["Zeitpunkt", "Moment"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "因为",
    traditional: "因為",
    pinyin: "yīn wèi",
    english: ["because"],
    german: ["weil", "wegen"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "所以",
    traditional: "所以",
    pinyin: "suǒ yǐ",
    english: ["therefore", "so"],
    german: ["deshalb", "also"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "但是",
    traditional: "但是",
    pinyin: "dàn shì",
    english: ["but", "however"],
    german: ["aber", "jedoch"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "如果",
    traditional: "如果",
    pinyin: "rú guǒ",
    english: ["if", "in case"],
    german: ["wenn", "falls"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "我们",
    traditional: "我們",
    pinyin: "wǒ men",
    english: ["we", "us"],
    german: ["wir", "uns"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "一个",
    traditional: "一個",
    pinyin: "yī gè",
    english: ["one", "a", "an"],
    german: ["ein", "eine"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "这个",
    traditional: "這個",
    pinyin: "zhè ge",
    english: ["this"],
    german: ["dieser", "diese", "dieses"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "那个",
    traditional: "那個",
    pinyin: "nà ge",
    english: ["that"],
    german: ["jener", "jene", "jenes", "das dort"],
    source: "cc-cedict-seed",
  },
  {
    simplified: "有意思",
    traditional: "有意思",
    pinyin: "yǒu yì si",
    english: ["interesting", "meaningful"],
    german: ["interessant", "bedeutungsvoll"],
    source: "de-extension",
  },
];

const HANDEDICT_PATH = path.join(process.cwd(), "data", "handedict.u8");

const DICTIONARY_ENTRIES = mergeDictionaryEntries(CEDICT_SEED, loadHandedictEntries());

const entriesBySimplified = new Map(DICTIONARY_ENTRIES.map((entry) => [entry.simplified, entry]));

const entriesByTraditional = new Map(
  DICTIONARY_ENTRIES.map((entry) => [entry.traditional, entry]),
);

export const dictionaryWordSet = new Set([
  ...entriesBySimplified.keys(),
  ...entriesByTraditional.keys(),
]);

export const dictionaryWords = [...dictionaryWordSet].sort(
  (left, right) => right.length - left.length,
);

export function lookupDictionaryEntry(word: string): DictionaryEntryDto | undefined {
  const entry = entriesBySimplified.get(word) ?? entriesByTraditional.get(word);

  if (entry) {
    return {
      simplified: entry.simplified,
      traditional: entry.traditional,
      pinyin: entry.pinyin,
      english: entry.english,
      german: entry.german ?? [],
      germanMissing: !entry.german?.length,
      isGenerated: false,
    };
  }

  if (!containsChinese(word)) {
    return undefined;
  }

  return {
    simplified: word,
    traditional: word,
    pinyin: pinyin(word, { toneType: "symbol" }),
    english: [],
    german: [],
    germanMissing: true,
    isGenerated: true,
  };
}

function containsChinese(value: string) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(value);
}

function loadHandedictEntries(): MultilingualDictionaryEntry[] {
  if (!existsSync(HANDEDICT_PATH)) {
    return [];
  }

  const text = readFileSync(HANDEDICT_PATH, "utf8");
  const entries: MultilingualDictionaryEntry[] = [];

  for (const line of text.split(/\r?\n/)) {
    const entry = parseHandedictLine(line);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

function parseHandedictLine(line: string): MultilingualDictionaryEntry | null {
  if (!line || line.startsWith("#")) {
    return null;
  }

  const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/u);
  if (!match) {
    return null;
  }

  const [, traditional, simplified, numberedPinyin, definitionText] = match;
  const german = definitionText
    .split("/")
    .map(cleanGermanDefinition)
    .filter(Boolean);

  if (!containsChinese(simplified) || german.length === 0) {
    return null;
  }

  return {
    simplified,
    traditional,
    pinyin: convert(numberedPinyin.replace(/u:/g, "ü"), { format: "numToSymbol" }),
    english: [],
    german,
    source: "handedict",
  };
}

function cleanGermanDefinition(definition: string) {
  return definition
    .replace(/&lt;?/g, "<")
    .replace(/&gt;?/g, ">")
    .replace(/&amp;?/g, "&")
    .replace(/\(u\.E\.\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeDictionaryEntries(
  baseEntries: MultilingualDictionaryEntry[],
  additionalEntries: MultilingualDictionaryEntry[],
) {
  const merged = new Map<string, MultilingualDictionaryEntry>();

  for (const entry of [...baseEntries, ...additionalEntries]) {
    const key = entry.simplified;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...entry,
        english: dedupe(entry.english),
        german: dedupe(entry.german ?? []),
      });
      continue;
    }

    merged.set(key, {
      ...existing,
      traditional: existing.traditional || entry.traditional,
      pinyin: existing.pinyin || entry.pinyin,
      english: dedupe([...existing.english, ...entry.english]),
      german: dedupe([...(existing.german ?? []), ...(entry.german ?? [])]),
    });
  }

  return [...merged.values()];
}

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
