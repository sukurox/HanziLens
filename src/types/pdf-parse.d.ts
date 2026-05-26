declare module "pdf-parse" {
  import type { Buffer } from "node:buffer";

  export type PdfParseResult = {
    numpages?: number;
    text: string;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  };

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: unknown,
  ): Promise<PdfParseResult>;
}
