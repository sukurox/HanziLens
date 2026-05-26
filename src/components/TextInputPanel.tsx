"use client";

import { BookOpen, ClipboardPaste } from "lucide-react";

type TextInputPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function TextInputPanel({ value, onChange, onSubmit, isLoading }: TextInputPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-jade/10 text-jade">
            <ClipboardPaste size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">Text einfügen</h2>
            <p className="text-xs text-slate-500">{value.length.toLocaleString("de-DE")} Zeichen</p>
          </div>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="粘贴你想读的中文内容..."
        className="min-h-44 w-full resize-y rounded-md border border-slate-200 bg-paper px-3 py-3 font-reader text-lg leading-8 text-ink placeholder:text-slate-400"
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
      >
        <BookOpen size={17} aria-hidden="true" />
        Im Reader öffnen
      </button>
    </section>
  );
}
