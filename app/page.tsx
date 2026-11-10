"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { AskResponse, Source } from "@/lib/types";

type Role = "officer" | "supervisor";

function SourceCard({ source }: { source: Source }) {
  return (
    <details className="source" id={`source-${source.n}`}>
      <summary>
        <span className="num">{source.n}</span>
        <span className="source-head">
          <span className="source-title">{source.title}</span>
          <span className="source-meta">
            <span className={`layer layer-${source.layer.replace(/\s+/g, "-").toLowerCase()}`}>{source.layer}</span>
            {source.pages} · {source.revisionDate ? `Revised ${source.revisionDate}` : "Revision date not recorded"}
          </span>
        </span>
      </summary>
      {source.quotes.length > 0 && (
        <div className="quotes">
          <p className="label">Relied on</p>
          {source.quotes.map((q, i) => (
            <blockquote key={i}>{q.trim()}</blockquote>
          ))}
        </div>
      )}
      <p className="label">Full passage</p>
      <pre>{source.text}</pre>
      {source.url && (
        <a href={source.url} target="_blank" rel="noreferrer">
          Open the published document
        </a>
      )}
    </details>
  );
}

export default function Page() {
  const [scenario, setScenario] = useState("");
  const [role, setRole] = useState<Role>("officer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!scenario.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, role }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setResult(data as AskResponse);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="banner">
        Unofficial reference. Not affiliated with the Phoenix Police Department. Not legal advice. Verify against the
        cited source.
      </div>
      <main>
        <h1>Policy Assistant</h1>

        <form onSubmit={ask}>
          <div className="roles" role="radiogroup" aria-label="Your role">
            {(["officer", "supervisor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                className={role === r ? "on" : ""}
                onClick={() => setRole(r)}
              >
                {r === "officer" ? "Officer" : "Supervisor"}
              </button>
            ))}
          </div>
          <label htmlFor="scenario">Describe the situation</label>
          <textarea
            id="scenario"
            rows={5}
            maxLength={2000}
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Example: Driver fled a traffic stop and I am considering a pursuit."
          />
          <p className="hint">Do not enter names, addresses, plate numbers, or case numbers.</p>
          <button className="primary" type="submit" disabled={loading || !scenario.trim()}>
            {loading ? "Searching the library…" : "Find policy and steps"}
          </button>
        </form>

        {error && <p className="notice error">{error}</p>}

        {result?.mode === "empty-library" && (
          <p className="notice">The library has no documents loaded yet, so there is nothing to search.</p>
        )}
        {result?.mode === "no-match" && (
          <p className="notice">
            Nothing in the library matches this situation. That does not mean no policy applies; it means the loaded
            documents do not address it in these words.
          </p>
        )}
        {result?.notice && <p className="notice">{result.notice}</p>}

        {result?.answer && (
          <section className="answer">
            <ReactMarkdown>{result.answer}</ReactMarkdown>
          </section>
        )}

        {result && result.sources.length > 0 && (
          <section>
            <h2>{result.mode === "ai" ? "Sources cited" : "Matching passages"}</h2>
            {result.sources.map((s) => (
              <SourceCard key={s.n} source={s} />
            ))}
          </section>
        )}

        {result && (
          <p className="footer">
            {result.library.documentCount} documents in the library
            {result.library.builtAt && `, last built ${new Date(result.library.builtAt).toLocaleDateString()}`}.
          </p>
        )}
      </main>
    </>
  );
}
