"use client";

import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  MousePointerClick,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { loadPdfAsset } from "@/lib/pdfStorage";

type PdfBookReaderProps = {
  title: string;
  pdfAssetId: string;
  currentPage: number | null;
  pageCount: number | null;
  sectionMeta?: string;
  isLoading: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  annotatedReader: ReactNode;
  onGoToPage: (page: number) => void;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  getDestination: (destination: string) => Promise<unknown[] | null>;
  getPageIndex: (pageRef: unknown) => Promise<number>;
  getOutline: () => Promise<PdfOutlineItem[] | null>;
  destroy?: () => Promise<void> | void;
};

type PdfPageProxy = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => PdfRenderTask;
  getAnnotations: (options: { intent: "display" }) => Promise<PdfAnnotation[]>;
};

type PdfViewport = {
  width: number;
  height: number;
  convertToViewportRectangle: (rect: number[]) => number[];
};

type PdfRenderTask = {
  promise: Promise<void>;
  cancel: () => void;
};

type PdfAnnotation = {
  subtype?: string;
  rect?: number[];
  url?: string;
  dest?: string | unknown[] | null;
  action?: string;
  contents?: string;
};

type PdfOutlineItem = {
  title: string;
  dest?: string | unknown[] | null;
  items?: PdfOutlineItem[];
};

type PdfPageLink = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  page?: number;
  url?: string;
};

type OutlineLink = {
  id: string;
  title: string;
  page: number;
  level: number;
};

type ReaderMode = "original" | "annotated";
type PageStatus = "idle" | "loading" | "ready" | "error";

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function PdfBookReader({
  title,
  pdfAssetId,
  currentPage,
  pageCount,
  sectionMeta,
  isLoading,
  canGoPrevious,
  canGoNext,
  annotatedReader,
  onGoToPage,
}: PdfBookReaderProps) {
  const [mode, setMode] = useState<ReaderMode>("annotated");
  const [document, setDocument] = useState<PdfDocumentProxy | null>(null);
  const [documentPageCount, setDocumentPageCount] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [pageStatus, setPageStatus] = useState<PageStatus>("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageLinks, setPageLinks] = useState<PdfPageLink[]>([]);
  const [outlineLinks, setOutlineLinks] = useState<OutlineLink[]>([]);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageFrameRef = useRef<HTMLDivElement | null>(null);

  const safeCurrentPage = currentPage ?? 1;
  const effectivePageCount = documentPageCount ?? pageCount ?? 0;
  const progress = effectivePageCount ? (safeCurrentPage / effectivePageCount) * 100 : 0;

  const visibleOutlineLinks = useMemo(() => outlineLinks.slice(0, 80), [outlineLinks]);

  useEffect(() => {
    setPageInput(String(safeCurrentPage));
  }, [safeCurrentPage]);

  useEffect(() => {
    pageFrameRef.current?.scrollTo({ top: 0, left: 0 });
  }, [safeCurrentPage]);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PdfDocumentProxy | null = null;

    async function loadDocument() {
      setPdfError(null);
      setPageStatus("loading");
      setDocument(null);
      setDocumentPageCount(null);
      setOutlineLinks([]);

      try {
        const pdfData = await loadPdfAsset(pdfAssetId);
        if (!pdfData) {
          throw new Error("Original-PDF nicht gefunden. Bitte importiere die PDF erneut.");
        }

        const pdfjs = await loadPdfJs();
        const task = pdfjs.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
        loadedDocument = (await task.promise) as unknown as PdfDocumentProxy;

        if (cancelled) {
          void loadedDocument.destroy?.();
          return;
        }

        setDocument(loadedDocument);
        setDocumentPageCount(loadedDocument.numPages);
        setOutlineLinks(await buildOutlineLinks(loadedDocument));
        setPageStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setPdfError(error instanceof Error ? error.message : "Die Original-PDF konnte nicht geladen werden.");
          setPageStatus("error");
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      void loadedDocument?.destroy?.();
    };
  }, [pdfAssetId]);

  useEffect(() => {
    let frame = 0;
    function handleResize() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setLayoutVersion((version) => version + 1));
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const activeDocument = document;
    if (!activeDocument || mode !== "original") {
      return;
    }

    const pdfDocument: PdfDocumentProxy = activeDocument;
    let cancelled = false;
    let renderTask: PdfRenderTask | null = null;

    async function renderPage() {
      setPageStatus("loading");
      setPdfError(null);
      setPageLinks([]);

      try {
        const pageNumber = clamp(safeCurrentPage, 1, pdfDocument.numPages);
        const page = await pdfDocument.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const frameWidth = pageFrameRef.current?.clientWidth ?? baseViewport.width;
        const fitScale = clamp((frameWidth - 32) / baseViewport.width, 0.55, 1.7);
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        const annotations = await page.getAnnotations({ intent: "display" });
        const links = await buildPageLinks(pdfDocument, annotations, viewport, pageNumber, pdfDocument.numPages);

        if (!cancelled) {
          setPageLinks(links);
          setPageStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setPdfError(error instanceof Error ? error.message : "Diese PDF-Seite konnte nicht gerendert werden.");
          setPageStatus("error");
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, layoutVersion, mode, safeCurrentPage, zoom]);

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPage = Number(pageInput);
    if (Number.isFinite(nextPage)) {
      goToPage(nextPage);
    }
  }

  function goToPage(page: number) {
    onGoToPage(clamp(Math.round(page), 1, effectivePageCount || pageCount || page));
  }

  function openPageLink(link: PdfPageLink) {
    if (link.page) {
      goToPage(link.page);
      return;
    }

    if (link.url) {
      window.open(link.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-archive/10 bg-vellum pb-24 shadow-soft">
      <div className="border-b border-archive/10 px-4 py-4 sm:px-7 lg:px-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">PDF Reader</p>
            <h2 className="mt-1 max-w-3xl text-balance text-xl font-semibold text-ink sm:text-2xl">
              {title}
            </h2>
            {sectionMeta ? <p className="mt-2 text-sm leading-6 text-slate-500">{sectionMeta}</p> : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="inline-flex rounded-full border border-archive/10 bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("annotated")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  mode === "annotated" ? "bg-vellum text-ink shadow-sm" : "text-slate-500 hover:text-ink"
                }`}
              >
                Annotiert
              </button>
              <button
                type="button"
                onClick={() => setMode("original")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  mode === "original" ? "bg-vellum text-ink shadow-sm" : "text-slate-500 hover:text-ink"
                }`}
              >
                Original
              </button>
            </div>

            <form onSubmit={submitPage} className="min-w-32">
              <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="pdf-reader-page">
                Seite
              </label>
              <div className="mt-1 flex items-center rounded-full border border-archive/10 bg-white px-3 py-1.5">
                <input
                  id="pdf-reader-page"
                  type="number"
                  min={1}
                  max={effectivePageCount || undefined}
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  className="w-14 bg-transparent text-sm font-semibold text-ink outline-none"
                />
                <span className="text-xs text-slate-500">/ {effectivePageCount || pageCount}</span>
              </div>
            </form>

            <div className="inline-flex rounded-full border border-archive/10 bg-white p-1">
              <button
                type="button"
                onClick={() => setZoom((value) => clamp(Number((value - 0.12).toFixed(2)), 0.7, 2))}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink"
                aria-label="PDF verkleinern"
              >
                <ZoomOut size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => clamp(Number((value + 0.12).toFixed(2)), 0.7, 2))}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink"
                aria-label="PDF vergroessern"
              >
                <ZoomIn size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="inline-flex rounded-full border border-archive/10 bg-white p-1">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={!canGoPrevious || isLoading}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Vorherige PDF-Seite"
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={!canGoNext || isLoading}
                className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Naechste PDF-Seite"
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

      {mode === "annotated" ? (
        annotatedReader
      ) : (
        <div className="grid gap-4 px-4 py-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 xl:px-10">
          <aside className="rounded-md border border-archive/10 bg-white p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-auto">
            <button
              type="button"
              onClick={() => setIsOutlineOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold text-ink transition hover:bg-vellum"
            >
              <span className="flex items-center gap-2">
                <BookOpen size={16} aria-hidden="true" />
                Dokument
              </span>
              <span className="text-xs text-slate-500">{outlineLinks.length || "PDF"}</span>
            </button>

            {isOutlineOpen && visibleOutlineLinks.length ? (
              <ul className="mt-2 space-y-1">
                {visibleOutlineLinks.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => goToPage(item.page)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs leading-5 text-slate-500 transition hover:bg-vellum hover:text-ink"
                      style={{ paddingLeft: `${0.5 + item.level * 0.75}rem` }}
                    >
                      <span className="block truncate">{item.title}</span>
                      <span className="text-[0.68rem] text-slate-400">Seite {item.page}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {!visibleOutlineLinks.length ? (
              <p className="mt-2 rounded-md bg-vellum p-2 text-xs leading-5 text-slate-500">
                Keine PDF-Lesezeichen gefunden. Echte Links auf der Seite bleiben trotzdem klickbar.
              </p>
            ) : null}
          </aside>

          <div
            ref={pageFrameRef}
            className="pdf-original-stage relative max-h-[calc(100vh-10rem)] min-h-[calc(100vh-13rem)] overflow-auto rounded-md border border-archive/10 bg-archive/5 p-4"
          >
            {pageStatus === "loading" ? (
              <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-archive/10 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                PDF-Seite wird geladen
              </div>
            ) : null}

            {pdfError ? (
              <div className="mx-auto mt-16 max-w-md rounded-md border border-cinnabar/30 bg-cinnabar/10 p-4 text-sm leading-6 text-cinnabar">
                {pdfError}
              </div>
            ) : null}

            <div className="mx-auto w-fit">
              <div className="pdf-page-surface relative bg-white shadow-soft">
                <canvas ref={canvasRef} className="block max-w-none" />
                {pageLinks.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => openPageLink(link)}
                    className="pdf-link-hotspot"
                    style={{
                      left: `${link.left}px`,
                      top: `${link.top}px`,
                      width: `${link.width}px`,
                      height: `${link.height}px`,
                    }}
                    aria-label={link.label}
                    title={link.label}
                  >
                    <span className="sr-only">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-4 flex w-fit flex-wrap items-center justify-center gap-3 rounded-full border border-archive/10 bg-white px-4 py-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <FileText size={14} aria-hidden="true" />
                Originalseite
              </span>
              <span className="inline-flex items-center gap-1">
                <MousePointerClick size={14} aria-hidden="true" />
                {pageLinks.length} PDF-Link{pageLinks.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <ExternalLink size={14} aria-hidden="true" />
                Zoom {(zoom * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex justify-center">
        <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-2 rounded-full border border-archive/10 bg-white/95 p-1.5 shadow-soft backdrop-blur dark:bg-vellum/95 sm:w-auto">
          <button
            type="button"
            onClick={() => setMode("annotated")}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              mode === "annotated" ? "bg-vellum text-ink shadow-sm" : "text-slate-500 hover:text-ink"
            }`}
          >
            Annotiert
          </button>
          <button
            type="button"
            onClick={() => setMode("original")}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              mode === "original" ? "bg-vellum text-ink shadow-sm" : "text-slate-500 hover:text-ink"
            }`}
          >
            Original
          </button>
          <div className="mx-1 h-6 w-px bg-archive/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={!canGoPrevious || isLoading}
            className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Vorherige PDF-Seite"
          >
            <ChevronLeft size={19} aria-hidden="true" />
          </button>
          <form onSubmit={submitPage} className="flex items-center rounded-full border border-archive/10 bg-vellum px-3 py-1.5">
            <input
              type="number"
              min={1}
              max={effectivePageCount || undefined}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              className="w-12 bg-transparent text-center text-sm font-semibold text-ink outline-none"
              aria-label="PDF-Seite"
            />
            <span className="text-xs text-slate-500">/ {effectivePageCount || pageCount}</span>
          </form>
          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={!canGoNext || isLoading}
            className="rounded-full p-2 text-slate-500 transition hover:bg-vellum hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Naechste PDF-Seite"
          >
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

async function loadPdfJs() {
  pdfJsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    return pdfjs;
  });

  return pdfJsPromise;
}

async function buildPageLinks(
  document: PdfDocumentProxy,
  annotations: PdfAnnotation[],
  viewport: PdfViewport,
  currentPage: number,
  pageCount: number,
) {
  const links: PdfPageLink[] = [];

  for (const [index, annotation] of annotations.entries()) {
    if (annotation.subtype !== "Link" || !annotation.rect?.length) {
      continue;
    }

    const targetPage = await resolveAnnotationPage(document, annotation, currentPage, pageCount);
    if (!targetPage && !annotation.url) {
      continue;
    }

    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(annotation.rect);
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    links.push({
      id: `${currentPage}-${index}`,
      left,
      top,
      width,
      height,
      page: targetPage ?? undefined,
      url: annotation.url,
      label: targetPage ? `Zu PDF-Seite ${targetPage}` : annotation.url ?? "PDF-Link oeffnen",
    });
  }

  return links;
}

async function buildOutlineLinks(document: PdfDocumentProxy) {
  const outline = await document.getOutline();
  if (!outline?.length) {
    return [];
  }

  const links: OutlineLink[] = [];
  await collectOutlineLinks(document, outline, links, 0);
  return links;
}

async function collectOutlineLinks(
  document: PdfDocumentProxy,
  items: PdfOutlineItem[],
  links: OutlineLink[],
  level: number,
) {
  for (const [index, item] of items.entries()) {
    const page = await resolveDestinationPage(document, item.dest);
    if (page) {
      links.push({
        id: `${level}-${index}-${page}-${item.title}`,
        title: item.title,
        page,
        level,
      });
    }

    if (item.items?.length) {
      await collectOutlineLinks(document, item.items, links, level + 1);
    }
  }
}

async function resolveAnnotationPage(
  document: PdfDocumentProxy,
  annotation: PdfAnnotation,
  currentPage: number,
  pageCount: number,
) {
  const destinationPage = await resolveDestinationPage(document, annotation.dest);
  if (destinationPage) {
    return destinationPage;
  }

  switch (annotation.action) {
    case "FirstPage":
      return 1;
    case "LastPage":
      return pageCount;
    case "NextPage":
      return clamp(currentPage + 1, 1, pageCount);
    case "PrevPage":
      return clamp(currentPage - 1, 1, pageCount);
    default:
      return null;
  }
}

async function resolveDestinationPage(document: PdfDocumentProxy, destination: string | unknown[] | null | undefined) {
  if (!destination) {
    return null;
  }

  try {
    const explicitDestination = typeof destination === "string" ? await document.getDestination(destination) : destination;
    const pageRef = explicitDestination?.[0];
    if (!pageRef) {
      return null;
    }

    return (await document.getPageIndex(pageRef)) + 1;
  } catch {
    return null;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
