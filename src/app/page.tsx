"use client";

import { AlertCircle, Languages } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Reader } from "@/components/Reader";
import { SavedWordsPanel } from "@/components/SavedWordsPanel";
import { TextInputPanel } from "@/components/TextInputPanel";
import { useSavedWords } from "@/hooks/useSavedWords";
import { extractContextSentence } from "@/lib/context";
import type { ReaderToken, TranslationLanguage } from "@/types/reader";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [readerTitle, setReaderTitle] = useState("Eigener Text");
  const [readerText, setReaderText] = useState("");
  const [tokens, setTokens] = useState<ReaderToken[]>([]);
  const deferredTokens = useDeferredValue(tokens);
  const [language, setLanguage] = useState<TranslationLanguage>("de");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { savedWords, savedWordKeys, addWord, removeWord } = useSavedWords();

  async function analyzeText(text: string, sourceName = "Eigener Text") {
    if (!text.trim()) {
      setError("Bitte füge zuerst chinesischen Text ein.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const payload = (await response.json()) as { tokens?: ReaderToken[]; error?: string };
      if (!response.ok || !payload.tokens) {
        throw new Error(payload.error ?? "Der Text konnte nicht analysiert werden.");
      }

      setReaderText(text);
      setReaderTitle(sourceName);
      setTokens(payload.tokens);
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

  function saveWord(token: ReaderToken) {
    if (!token.entry) {
      return;
    }

    addWord(token.entry, extractContextSentence(readerText, token.start, token.end));
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-ink font-reader text-2xl text-white">
              读
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink">Biberl Reader</h1>
              <p className="text-sm text-slate-500">Eigene chinesische Texte lesen und Wörter direkt verstehen.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-slate-500" aria-hidden="true" />
            <LanguageToggle value={language} onChange={setLanguage} />
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <TextInputPanel
                value={inputText}
                onChange={setInputText}
                onSubmit={() => analyzeText(inputText)}
                isLoading={isLoading}
              />
              <FileUpload
                isLoading={isLoading}
                onLoadingChange={setIsLoading}
                onError={setError}
                onTextExtracted={(text, sourceName) => {
                  setInputText(text);
                  void analyzeText(text, sourceName);
                }}
              />
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-cinnabar/30 bg-cinnabar/10 px-4 py-3 text-sm leading-6 text-cinnabar">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            ) : null}

            <Reader
              title={readerTitle}
              tokens={deferredTokens}
              language={language}
              savedWordKeys={savedWordKeys}
              onLanguageChange={setLanguage}
              onSaveWord={saveWord}
            />
          </div>

          <SavedWordsPanel words={savedWords} language={language} onRemove={removeWord} />
        </div>
      </div>
    </main>
  );
}
