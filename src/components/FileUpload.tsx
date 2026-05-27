"use client";

import { Archive, FileUp, Loader2 } from "lucide-react";
import type { BookImportMetadata, BookSourceType } from "@/types/library";

type FileUploadProps = {
  onTextExtracted: (
    text: string,
    sourceName: string,
    sourceType: BookSourceType,
    metadata?: BookImportMetadata,
  ) => void | Promise<void>;
  onError: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
  isLoading: boolean;
};

export function FileUpload({
  onTextExtracted,
  onError,
  onLoadingChange,
  isLoading,
}: FileUploadProps) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onLoadingChange(true);

    try {
      if (isTxtFile(file)) {
        const text = await file.text();
        await onTextExtracted(text, file.name, "txt");
        return;
      }

      if (isPdfFile(file)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/extract-pdf", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as {
          text?: string;
          pages?: number | null;
          pageStarts?: number[];
          error?: string;
        };
        if (!response.ok || !payload.text) {
          throw new Error(payload.error ?? "Die PDF konnte nicht extrahiert werden.");
        }

        await onTextExtracted(payload.text, file.name, "pdf", {
          pageCount: payload.pages ?? null,
          pageStarts: payload.pageStarts,
        });
        return;
      }

      throw new Error("Bitte lade eine .txt- oder textbasierte .pdf-Datei hoch.");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Die Datei konnte nicht gelesen werden.");
    } finally {
      onLoadingChange(false);
      event.target.value = "";
    }
  }

  return (
    <section className="rounded-lg border border-archive/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-plum/10 text-plum">
          <Archive size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">Dokument importieren</h2>
          <p className="text-xs text-slate-500">TXT oder textbasierte PDF</p>
        </div>
      </div>

      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-archive/20 bg-vellum px-4 py-6 text-center transition hover:border-gold hover:bg-white">
        {isLoading ? (
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-shelf" aria-hidden="true" />
        ) : (
          <FileUp className="mb-3 h-7 w-7 text-archive" aria-hidden="true" />
        )}
        <span className="text-sm font-semibold text-ink">Datei auswählen</span>
        <span className="mt-1 text-xs text-slate-500">OCR bleibt im MVP außen vor</span>
        <input
          type="file"
          accept=".txt,text/plain,.pdf,application/pdf"
          onChange={handleFileChange}
          disabled={isLoading}
          className="sr-only"
        />
      </label>
    </section>
  );
}

function isTxtFile(file: File) {
  return file.name.toLowerCase().endsWith(".txt") || file.type.startsWith("text/");
}

function isPdfFile(file: File) {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}
