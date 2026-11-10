import MiniSearch from "minisearch";
import type { Chunk } from "./types.ts";

const MAX_RESULTS = 8;
const MAX_TOTAL_CHARS = 24000;
/** Passages scoring below this share of the best match are treated as noise. */
const MIN_RELATIVE_SCORE = 0.25;

export interface Searcher {
  search(query: string): Chunk[];
}

/** Keyword search over the library. Title matches count for more than body matches. */
export function buildSearcher(chunks: Chunk[]): Searcher {
  const byId = new Map(chunks.map((c) => [c.id, c]));
  const index = new MiniSearch<Chunk>({
    fields: ["title", "text"],
    idField: "id",
    searchOptions: {
      boost: { title: 2 },
      prefix: (term) => term.length > 4,
      fuzzy: (term) => (term.length > 5 ? 0.15 : false),
    },
  });
  index.addAll(chunks);

  return {
    search(query: string): Chunk[] {
      const results: Chunk[] = [];
      let total = 0;
      const hits = index.search(query);
      const floor = hits.length ? hits[0].score * MIN_RELATIVE_SCORE : 0;
      for (const hit of hits) {
        if (hit.score < floor) break;
        const chunk = byId.get(hit.id as string);
        if (!chunk) continue;
        if (total + chunk.text.length > MAX_TOTAL_CHARS) break;
        results.push(chunk);
        total += chunk.text.length;
        if (results.length >= MAX_RESULTS) break;
      }
      return results;
    },
  };
}
