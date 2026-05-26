"use client";

import { FileText, Loader2, Upload } from "lucide-react";

type FileUploadProps = {
  onTextExtracted: (text: string, sourceName: string) => void;
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
        onTextExtracted(text, file.name);
        return;
      }

      if (isPdfFile(file)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/extract-pdf", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as { text?: string; error?: string };
        if (!response.ok || !payload.text) {
          throw new Error(payload.error ?? "Die PDF konnte nicht extrahiert werden.");
        }

        onTextExtracted(payload.text, file.name);
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-cinnabar/10 text-cinnabar">
          <Upload size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">Datei hochladen</h2>
          <p className="text-xs text-slate-500">TXT und textbasierte PDF</p>
        </div>
      </div>

      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-paper px-4 py-6 text-center transition hover:border-jade hover:bg-white">
        {isLoading ? (
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-jade" aria-hidden="true" />
        ) : (
          <FileText className="mb-3 h-7 w-7 text-slate-500" aria-hidden="true" />
        )}
        <span className="text-sm font-semibold text-ink">Datei auswählen</span>
        <span className="mt-1 text-xs text-slate-500">Gescannte PDFs werden verständlich abgelehnt</span>
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
