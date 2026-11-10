/**
 * Build the searchable library from source documents.
 *
 *   npm run ingest                         (data/sources -> data/index/chunks.json)
 *   npm run ingest -- --src DIR --out FILE
 *
 * Layout: one folder per collection under the source directory, holding .pdf
 * or .txt files. An optional "<file>.meta.json" beside a document can set
 * { "title", "revisionDate", "url" }. Files whose name contains "draft" are
 * skipped, since drafts are not policy in effect.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chunkDocument, findRevisionDate } from "../lib/chunk.ts";
import { DEFAULT_INDEX_PATH } from "../lib/library.ts";
import type { Chunk, Layer, LibraryIndex } from "../lib/types.ts";

const LAYERS: Record<string, Layer> = {
  "supreme-court": "Constitutional",
  "arizona-law": "State law",
  "city-code": "City law",
  "operations-orders": "Department policy",
  education: "Guidance",
};

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function extractText(file: string): string {
  if (file.toLowerCase().endsWith(".txt")) return fs.readFileSync(file, "utf8");
  return execFileSync("pdftotext", ["-layout", file, "-"], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

const srcDir = arg("src", path.join("data", "sources"));
const outFile = arg("out", DEFAULT_INDEX_PATH);

const chunks: Chunk[] = [];
const problems: string[] = [];
let documentCount = 0;

for (const collection of fs.readdirSync(srcDir).sort()) {
  const dir = path.join(srcDir, collection);
  if (!fs.statSync(dir).isDirectory()) continue;
  const layer = LAYERS[collection];
  if (!layer) {
    problems.push(`${collection}/: unknown collection folder, skipped`);
    continue;
  }
  for (const name of fs.readdirSync(dir).sort()) {
    if (!/\.(pdf|txt)$/i.test(name)) continue;
    if (/draft/i.test(name)) {
      problems.push(`${collection}/${name}: draft, skipped`);
      continue;
    }
    const file = path.join(dir, name);
    let text: string;
    try {
      text = extractText(file);
    } catch (err) {
      problems.push(`${collection}/${name}: could not read (${(err as Error).message.split("\n")[0]})`);
      continue;
    }
    if (text.replace(/\s/g, "").length < 200) {
      problems.push(`${collection}/${name}: almost no text, likely a scanned image; skipped`);
      continue;
    }
    const metaFile = `${file}.meta.json`;
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
    const base = name.replace(/\.(pdf|txt)$/i, "");
    const docChunks = chunkDocument(text, {
      docId: `${collection}/${base}`,
      title: meta.title ?? base.replace(/[_-]+/g, " ").trim(),
      layer,
      collection,
      revisionDate: meta.revisionDate ?? findRevisionDate(text),
      url: meta.url ?? null,
    });
    chunks.push(...docChunks);
    documentCount += 1;
    console.log(`${collection}/${name}: ${docChunks.length} passages`);
  }
}

const index: LibraryIndex = { builtAt: new Date().toISOString(), documentCount, chunks };
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(index));

console.log(`\n${documentCount} documents, ${chunks.length} passages -> ${outFile}`);
if (problems.length) {
  console.log(`\n${problems.length} not included:`);
  for (const p of problems) console.log(`  ${p}`);
}
