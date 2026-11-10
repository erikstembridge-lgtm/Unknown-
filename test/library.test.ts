import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { chunkDocument, findRevisionDate } from "../lib/chunk.ts";
import { buildSearcher } from "../lib/search.ts";
import type { LibraryIndex } from "../lib/types.ts";

// The fixtures are invented text, labelled as such. They are never loaded by the app.
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "policy-")), "chunks.json");
execFileSync("npx", ["tsx", "scripts/ingest.ts", "--src", "test/fixtures", "--out", out], { stdio: "pipe" });
const index = JSON.parse(fs.readFileSync(out, "utf8")) as LibraryIndex;

test("ingest loads documents and skips drafts", () => {
  assert.equal(index.documentCount, 2);
  assert.ok(index.chunks.every((c) => c.layer === "Department policy"));
  assert.ok(!index.chunks.some((c) => /draft/i.test(c.docId)));
});

test("ingest records revision date and page numbers", () => {
  const pursuit = index.chunks.filter((c) => c.docId.includes("99-1"));
  assert.equal(pursuit[0].revisionDate, "01/2020");
  assert.equal(pursuit[0].pageStart, 1);
  assert.equal(pursuit.at(-1)!.pageEnd, 2);
  const lost = index.chunks.find((c) => c.docId.includes("99-2"))!;
  assert.equal(lost.revisionDate, null);
});

test("no source text is lost when splitting", () => {
  const text = fs.readFileSync("test/fixtures/operations-orders/sample-order-99-1-vehicle-pursuits.txt", "utf8");
  const joined = index.chunks.filter((c) => c.docId.includes("99-1")).map((c) => c.text).join(" ");
  for (const word of text.split(/\s+/).filter(Boolean)) assert.ok(joined.includes(word), `missing "${word}"`);
});

test("long documents are split into several passages", () => {
  const para = "Officers shall follow this invented sentence number X in the test. ".repeat(12);
  const text = Array.from({ length: 12 }, (_, i) => para.replace(/X/g, String(i))).join("\n\n");
  const chunks = chunkDocument(text, {
    docId: "d", title: "t", layer: "Department policy", collection: "operations-orders", revisionDate: null, url: null,
  });
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every((c) => c.text.length <= 2600));
});

test("search finds the relevant document first", () => {
  const searcher = buildSearcher(index.chunks);
  assert.match(searcher.search("driver fled a traffic stop, considering a pursuit")[0].docId, /99-1/);
  assert.match(searcher.search("someone handed me a wallet they found")[0].docId, /99-2/);
  assert.equal(searcher.search("zebra quantum helicopter").length, 0);
});

test("revision date detection", () => {
  assert.equal(findRevisionDate("Operations Order 1.5\nRev. 06/25\n"), "06/25");
  assert.equal(findRevisionDate("Effective Date: June 10, 2026"), "June 10, 2026");
  assert.equal(findRevisionDate("No date anywhere here"), null);
});
