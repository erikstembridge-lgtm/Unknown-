/** Which level of authority a source carries. Shown on every cited passage. */
export type Layer =
  | "Constitutional"
  | "State law"
  | "City law"
  | "Department policy"
  | "Guidance";

/** One retrievable passage of a source document. */
export interface Chunk {
  id: string;
  docId: string;
  title: string;
  layer: Layer;
  collection: string;
  /** Revision or effective date as printed on the document, if known. */
  revisionDate: string | null;
  /** Link to the published original, if known. */
  url: string | null;
  pageStart: number;
  pageEnd: number;
  text: string;
}

export interface LibraryIndex {
  builtAt: string;
  documentCount: number;
  chunks: Chunk[];
}

/** A passage as returned to the browser, numbered for citation. */
export interface Source {
  n: number;
  title: string;
  layer: Layer;
  pages: string;
  revisionDate: string | null;
  url: string | null;
  text: string;
  /** Exact phrases the answer relied on, when the AI wrote one. */
  quotes: string[];
}

export interface AskResponse {
  /** "ai": checklist written from the sources. "sources": passages only. */
  mode: "ai" | "sources" | "empty-library" | "no-match";
  answer: string | null;
  sources: Source[];
  library: { builtAt: string | null; documentCount: number };
  notice?: string;
}
