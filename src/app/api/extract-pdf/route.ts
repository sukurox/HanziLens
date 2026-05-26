import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const SCANNED_PDF_MESSAGE =
  "Diese PDF scheint gescannt zu sein. OCR wird im ersten MVP noch nicht unterstützt.";

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
    const result = await pdfParse(Buffer.from(arrayBuffer));
    const text = normalizePdfText(result.text);

    if (!text) {
      return NextResponse.json({ error: SCANNED_PDF_MESSAGE }, { status: 422 });
    }

    return NextResponse.json({
      text,
      pages: result.numpages ?? null,
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
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
