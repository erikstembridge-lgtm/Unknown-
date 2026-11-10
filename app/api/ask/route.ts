import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AnswerDeclinedError, writeAnswer, type Role } from "@/lib/answer";
import { loadLibrary } from "@/lib/library";
import type { AskResponse, Chunk, Source } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_SCENARIO_CHARS = 2000;

function toSource(chunk: Chunk, n: number, quotes: string[] = []): Source {
  return {
    n,
    title: chunk.title,
    layer: chunk.layer,
    pages: chunk.pageStart === chunk.pageEnd ? `p. ${chunk.pageStart}` : `pp. ${chunk.pageStart}-${chunk.pageEnd}`,
    revisionDate: chunk.revisionDate,
    url: chunk.url,
    text: chunk.text,
    quotes,
  };
}

// Scenarios are never written to logs or storage.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { scenario?: unknown; role?: unknown } | null;
  const scenario = typeof body?.scenario === "string" ? body.scenario.trim() : "";
  const role: Role = body?.role === "supervisor" ? "supervisor" : "officer";

  if (!scenario) return NextResponse.json({ error: "Describe the situation first." }, { status: 400 });
  if (scenario.length > MAX_SCENARIO_CHARS) {
    return NextResponse.json({ error: `Keep the description under ${MAX_SCENARIO_CHARS} characters.` }, { status: 400 });
  }

  const { index, searcher } = loadLibrary();
  const library = { builtAt: index?.builtAt ?? null, documentCount: index?.documentCount ?? 0 };
  const reply = (r: Omit<AskResponse, "library">) => NextResponse.json({ ...r, library } satisfies AskResponse);

  if (!searcher || !index?.chunks.length) {
    return reply({ mode: "empty-library", answer: null, sources: [] });
  }

  const passages = searcher.search(scenario);
  if (!passages.length) return reply({ mode: "no-match", answer: null, sources: [] });

  const allSources = passages.map((p, i) => toSource(p, i + 1));

  if (!process.env.ANTHROPIC_API_KEY) {
    return reply({
      mode: "sources",
      answer: null,
      sources: allSources,
      notice: "No AI key is configured, so these are the matching passages without a written checklist.",
    });
  }

  try {
    const answer = await writeAnswer(scenario, role, passages);
    const text = answer.text.replace(/\[\[(\d+)\]\]/g, (_, i) => `[${Number(i) + 1}]`);
    const cited = allSources
      .filter((s) => answer.quotesByPassage.has(s.n - 1))
      .map((s) => ({ ...s, quotes: answer.quotesByPassage.get(s.n - 1) ?? [] }));
    return reply({ mode: "ai", answer: text, sources: cited.length ? cited : allSources });
  } catch (error) {
    let notice = "The AI step failed, so these are the matching passages without a written checklist.";
    if (error instanceof AnswerDeclinedError) notice = `${error.message} These are the matching passages.`;
    else if (error instanceof Anthropic.AuthenticationError) notice = "The AI key was rejected. These are the matching passages.";
    else if (error instanceof Anthropic.RateLimitError) notice = "The AI service is rate limited right now. These are the matching passages.";
    else if (error instanceof Anthropic.APIError) console.error(`AI request failed with status ${error.status}`);
    else console.error("AI request failed");
    return reply({ mode: "sources", answer: null, sources: allSources, notice });
  }
}
