# Policy Assistant (prototype)

Unofficial reference tool. Describe a situation and it returns the relevant passages from a library of published documents, each with its source, page, and revision date. With an AI key it also writes a step-by-step checklist that cites those passages.

Not affiliated with the Phoenix Police Department. Not legal advice. See `PLAN.md` for the full plan.

## Run it

```
npm install
npm run dev        # http://localhost:3000
```

Requires Node 22+ and `pdftotext` (the `poppler-utils` package) for PDF import.

## Load documents

1. Put PDF or text files in a folder under `data/sources/`:

   | Folder | Shown as |
   |---|---|
   | `operations-orders/` | Department policy |
   | `supreme-court/` | Constitutional |
   | `arizona-law/` | State law |
   | `city-code/` | City law |
   | `education/` | Guidance |

2. Optional: beside any file, add `<filename>.meta.json` with `{ "title": "...", "revisionDate": "...", "url": "..." }`.
3. Run `npm run ingest`. It lists what was loaded and what was skipped (drafts, scanned images with no text).

## Turn on the AI checklist

Copy `.env.example` to `.env.local` and add a Claude API key. Without a key the app shows matching passages only.

## Tests

`npm test` runs against invented, clearly labelled sample text in `test/fixtures/`. That text is never loaded by the app.
