import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const SCANNED_PDF_MESSAGE =
  "Diese PDF scheint gescannt zu sein. OCR wird im ersten MVP noch nicht unterstützt.";

type PdfPageData = {
  getTextContent: (options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }) => Promise<{
    items: Array<{
      str: string;
      transform: number[];
    }>;
  }>;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const upload = formData.get("file");

    if (!isUploadedFile(upload)) {
      return NextResponse.json({ error: "Bitte lade eine PDF-Datei hoch." }, { status: 400 });
    }

    if (!upload.name.toLowerCase().endsWith(".pdf") && upload.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Dieses MVP akzeptiert nur .pdf-Dateien für die PDF-Extraktion." },
        { status: 400 },
      );
    }

    const arrayBuffer = await upload.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Die PDF ist für dieses MVP noch zu groß. Bitte teste eine kleinere Datei." },
        { status: 413 },
      );
    }

    const pdfParse = (await import("pdf-parse")).default;
    const pageTexts: string[] = [];
    const result = await pdfParse(Buffer.from(arrayBuffer), {
      pagerender: async (pageData: PdfPageData) => {
        const pageText = await renderPdfPage(pageData);
        pageTexts.push(normalizePdfPageText(pageText));
        return pageText;
      },
    });
    const normalizedPages = pageTexts.length ? pageTexts : [normalizePdfText(result.text)];
    const { text, pageStarts } = joinPages(normalizedPages);

    if (!text) {
      return NextResponse.json({ error: SCANNED_PDF_MESSAGE }, { status: 422 });
    }

    return NextResponse.json({
      text,
      pages: result.numpages ?? null,
      pageStarts,
    });
  } catch {
    return NextResponse.json(
      { error: "Die PDF konnte nicht gelesen werden. Bitte prüfe, ob sie textbasiert ist." },
      { status: 500 },
    );
  }
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof value !== "string" && Boolean(value) && typeof value?.arrayBuffer === "function";
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/([\p{Script=Han}])[\t ]+([\p{Script=Han}])/gu, "$1$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizePdfPageText(text: string) {
  return normalizePdfText(text);
}

async function renderPdfPage(pageData: PdfPageData) {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  let lastY: number | undefined;
  let text = "";

  for (const item of textContent.items) {
    const y = item.transform[5];
    text += lastY === y || lastY === undefined ? item.str : `\n${item.str}`;
    lastY = y;
  }

  return text;
}

function joinPages(pages: string[]) {
  const pageStarts: number[] = [];
  let text = "";

  for (const pageText of pages) {
    if (text) {
      text += "\n\n";
    }

    pageStarts.push(text.length);
    text += pageText;
  }

  return { text, pageStarts };
}
