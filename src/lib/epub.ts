export type ExtractedDocument = {
  text: string;
  title?: string;
  sourceType: "txt" | "pdf" | "epub";
};

// Prepared extension point for the next iteration. EPUB needs a parser such as epubjs
// or a server-side unzip/XML pipeline, but it is intentionally outside this MVP.
export async function extractEpubText(): Promise<ExtractedDocument> {
  throw new Error("EPUB-Unterstützung ist architektonisch vorbereitet, aber im MVP noch nicht aktiv.");
}
