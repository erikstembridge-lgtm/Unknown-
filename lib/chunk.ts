import type { Chunk, Layer } from "./types.ts";

export interface DocumentMeta {
  docId: string;
  title: string;
  layer: Layer;
  collection: string;
  revisionDate: string | null;
  url: string | null;
}

const TARGET_CHARS = 1800;
const MAX_CHARS = 2600;

/**
 * Split extracted document text into passages of a few paragraphs each,
 * remembering which pages each passage came from. Pages are separated by
 * form feeds, which is how pdftotext marks them.
 */
export function chunkDocument(rawText: string, meta: DocumentMeta): Chunk[] {
  const pages = rawText.split("\f");
  const paragraphs: { text: string; page: number }[] = [];

  pages.forEach((pageText, i) => {
    for (const block of pageText.split(/\n\s*\n/)) {
      const text = block
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n");
      if (!text) continue;
      // A single oversized block is cut on line boundaries so no passage is lost.
      if (text.length > MAX_CHARS) {
        let buffer = "";
        for (const line of text.split("\n")) {
          if (buffer && buffer.length + line.length > TARGET_CHARS) {
            paragraphs.push({ text: buffer, page: i + 1 });
            buffer = "";
          }
          buffer = buffer ? `${buffer}\n${line}` : line;
        }
        if (buffer) paragraphs.push({ text: buffer, page: i + 1 });
      } else {
        paragraphs.push({ text, page: i + 1 });
      }
    }
  });

  const chunks: Chunk[] = [];
  let current: { text: string; page: number }[] = [];
  let size = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push({
      id: `${meta.docId}#${chunks.length + 1}`,
      ...meta,
      pageStart: current[0].page,
      pageEnd: current[current.length - 1].page,
      text: current.map((p) => p.text).join("\n\n"),
    });
    current = [];
    size = 0;
  };

  for (const para of paragraphs) {
    if (size && size + para.text.length > TARGET_CHARS) flush();
    current.push(para);
    size += para.text.length;
  }
  flush();
  return chunks;
}

/** Best-effort read of a revision date printed near the top of a document. */
export function findRevisionDate(text: string): string | null {
  const head = text.slice(0, 3000);
  const month = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
  const date = `\\d{1,2}/\\d{1,2}/\\d{2,4}|\\d{1,2}/\\d{2,4}|${month} \\d{1,2}, \\d{4}|${month} \\d{4}`;
  const match = head.match(
    new RegExp(`\\b(?:rev(?:ised|ision)?|effective|updated)\\b[\\s:.-]*(?:date)?[\\s:.-]*(${date})`, "i"),
  );
  return match ? match[1] : null;
}
