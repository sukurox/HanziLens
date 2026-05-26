export type TranslationLanguage = "de" | "en";

export type DictionaryEntryDto = {
  simplified: string;
  traditional: string;
  pinyin: string;
  english: string[];
  german: string[];
  germanMissing: boolean;
};

export type ReaderToken = {
  id: string;
  text: string;
  isChinese: boolean;
  start: number;
  end: number;
  entry?: DictionaryEntryDto;
};

export type SavedWord = DictionaryEntryDto & {
  id: string;
  savedAt: string;
  context?: string;
};
