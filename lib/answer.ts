import Anthropic from "@anthropic-ai/sdk";
import type { Chunk } from "./types.ts";

export type Role = "officer" | "supervisor";

const MODEL = "claude-opus-5-5";

const SYSTEM = `You are a reference tool for police officers and supervisors. A user describes a situation. You are given passages from published source documents: department policy, city code, state law, court decisions, and guidance. Each passage is labelled with its authority layer.

Rules:
- Use only the supplied passages. Never add a requirement, step, deadline, or legal rule from general knowledge, even one you are confident about.
- Every step you list must be supported by a passage. If the passages do not cover the situation, or cover only part of it, say plainly which parts are not covered. An honest "the library does not address this" is a correct answer.
- For use of force, vehicle pursuits, in-custody medical care, and juveniles, quote the governing sentence word for word rather than paraphrasing it.
- Lead with department policy. Show law and court decisions as the supporting layers behind it.
- If two passages appear to conflict, show both and say they appear to conflict. Do not decide which one controls.
- You provide reference material, not legal advice or a command decision.

Format, in Markdown, with only the sections that apply:
## Immediate actions
## Notifications
## Documentation
## Supervisor responsibilities
## Not covered by the library

Use short numbered steps in the order they should happen. No preamble and no closing summary.`;

export interface Answer {
  text: string;
  /** For each supplied passage (by position), the exact phrases relied on. */
  quotesByPassage: Map<number, string[]>;
}

export class AnswerDeclinedError extends Error {}

export async function writeAnswer(scenario: string, role: Role, passages: Chunk[]): Promise<Answer> {
  const client = new Anthropic();

  const audience =
    role === "supervisor"
      ? "The user is a supervisor. Include the supervisor's own duties as well as what their officers must do."
      : "The user is a patrol officer. Include supervisor duties only where the officer must request or expect them.";

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // If the model declines a request, the API retries it on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...passages.map((p) => ({
            type: "document" as const,
            source: { type: "text" as const, media_type: "text/plain" as const, data: p.text },
            title: p.title,
            context: `Authority layer: ${p.layer}. Revision date: ${p.revisionDate ?? "not recorded"}.`,
            citations: { enabled: true },
          })),
          { type: "text" as const, text: `${audience}\n\nSituation: ${scenario}` },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new AnswerDeclinedError("The AI model declined to answer this scenario.");
  }

  let text = "";
  const quotesByPassage = new Map<number, string[]>();
  for (const block of response.content) {
    if (block.type !== "text") continue;
    text += block.text;
    const cited = new Set<number>();
    for (const citation of block.citations ?? []) {
      if (!("document_index" in citation)) continue;
      const i = citation.document_index;
      cited.add(i);
      const quotes = quotesByPassage.get(i) ?? [];
      if (!quotes.includes(citation.cited_text)) quotes.push(citation.cited_text);
      quotesByPassage.set(i, quotes);
    }
    // Marker numbers are passage positions here; the caller renumbers them.
    for (const i of [...cited].sort((a, b) => a - b)) text += ` [[${i}]]`;
  }
  return { text, quotesByPassage };
}
