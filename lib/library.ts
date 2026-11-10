import fs from "node:fs";
import path from "node:path";
import type { LibraryIndex } from "./types.ts";
import { buildSearcher, type Searcher } from "./search.ts";

export const DEFAULT_INDEX_PATH = path.join("data", "index", "chunks.json");

interface Loaded {
  index: LibraryIndex | null;
  searcher: Searcher | null;
  mtimeMs: number;
}

let cache: Loaded | null = null;

/** Load the built library, reloading if the index file has been rebuilt. */
export function loadLibrary(): Loaded {
  const file = path.resolve(process.env.POLICY_INDEX ?? DEFAULT_INDEX_PATH);
  let mtimeMs = 0;
  try {
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    cache = { index: null, searcher: null, mtimeMs: 0 };
    return cache;
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache;
  const index = JSON.parse(fs.readFileSync(file, "utf8")) as LibraryIndex;
  cache = { index, searcher: buildSearcher(index.chunks), mtimeMs };
  return cache;
}
