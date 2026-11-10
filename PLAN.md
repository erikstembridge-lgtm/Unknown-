# Phoenix PD Policy Assistant — Plan

An unofficial reference tool. An officer or supervisor describes a situation by voice or text, and the app returns the relevant policies, steps, and procedures, each linked to the exact published source.

Not affiliated with or endorsed by the Phoenix Police Department. Built only from publicly available documents.

## Decisions made

| Decision | Choice |
|---|---|
| Form | Mobile-friendly web app (phones, tablets, in-car laptops, desktops) |
| AI provider | Claude API (key still to be created) |
| Sources | Public documents only |

## Principles

1. **Answers come only from retrieved source text.** The AI is given the relevant policy sections and may not answer from general knowledge.
2. **Every step carries a citation** to the order number, section, and revision date, with a link to the original document.
3. **"Not found" is a valid answer.** If the sources don't cover the scenario, the app says so.
4. **High-stakes topics are quoted, not paraphrased.** Use of force, pursuits, in-custody medical, and juvenile procedures show the policy text verbatim.
5. **No scenario storage by default.** Questions are not logged, and the input box warns against entering names, addresses, or case numbers.
6. **Currency is always visible.** Every answer shows the revision date of each order it used and when the library was last synced.

## Data sources

| Source | Where | Notes |
|---|---|---|
| Phoenix PD Operations Orders | PowerDMS public library (`public.powerdms.com/PhoenixPD`) | One document per order, each with an ID and revision date. Revisions seen as recent as June 2026. |
| Arizona Revised Statutes | `azleg.gov` | Title 13 (criminal code) and Title 28 (transportation) first. |
| Phoenix City Code | City's published code | Phase 2. |

Open items to settle in milestone 1:

- Whether the PowerDMS library can be enumerated and downloaded reliably, and what its terms of use allow.
- Some published orders are marked **draft**. These are excluded, or shown clearly labeled as not in effect.
- Bureau manuals and RMS user manuals are referenced by the orders but may not be public. The app will only cover what is published.

## How it works

```
Scenario (voice or text)
        │
        ▼
Search the policy library  ──►  top matching sections (with order #, section, revision date)
        │
        ▼
Claude reads only those sections and writes the answer with citations
        │
        ▼
Checklist view:  Immediate actions → Notifications → Documentation → Supervisor duties
                 each step linked to its source
```

### Components

- **Ingestion script.** Downloads each order, extracts the text, splits it by section heading, and records order number, title, section, revision date, and source link. Re-runnable to pick up revisions.
- **Search index.** Starts as keyword search (SQLite full-text). Policy questions lean heavily on specific terms and section names, so this is a strong baseline with no extra service. Meaning-based search gets added only if testing shows missed sections.
- **Answer service.** A server endpoint sends the scenario plus retrieved sections to Claude with the citations feature turned on, so each claim is tied to the passage it came from. The API key stays on the server.
- **Web app.** One screen: input box with a microphone button, officer/supervisor toggle, and the cited checklist. Tapping a citation opens the source passage.

### Technology

- TypeScript and Next.js: one codebase for the screen and the server endpoint.
- Claude Opus 5.5 through the official Anthropic SDK.
- Voice through the browser's built-in speech recognition (Chrome and Safari), falling back to the device keyboard's dictation button elsewhere.

## Milestones

1. **Library.** Confirm source access and terms. Ingest the Operations Orders into a searchable index. Done when a search for "vehicle pursuit" returns the right sections with correct revision dates.
2. **Cited answers.** Typed scenario in, cited checklist out. Done when a test set of about 30 realistic scenarios returns the correct orders, with no step lacking a citation.
3. **Field use.** Voice input, phone layout, officer and supervisor views.
4. **Staying current.** Scheduled re-sync that detects revised orders, plus a "what changed" list.
5. **Wider sources.** Arizona statutes, then city code.

## Testing

A fixed set of scenarios with the expected orders for each is checked on every change: domestic violence call, vehicle pursuit, use of force reporting, juvenile detention, DUI stop, missing person, civil dispute, and so on. Someone with Phoenix PD policy knowledge should review the expected answers; this is the single most valuable outside input the project needs.

## Risks

| Risk | Mitigation |
|---|---|
| Outdated policy shown as current | Revision dates on every answer; scheduled re-sync; stale-library warning |
| AI states something not in policy | Sources-only answering, mandatory citations, verbatim quoting on high-stakes topics, test set |
| Sensitive details typed into an unsanctioned tool | No logging by default; input warning; no accounts needed for the first version |
| Mistaken for an official tool | Persistent "unofficial reference" banner; no department branding or insignia |
| Department restricts unapproved tools on duty | Outside the build; worth raising with the department early if adoption is the goal |
| Source site changes or blocks downloads | Keep downloaded copies with their dates; ingestion reports failures instead of silently skipping |

## Running cost

Hosting for a prototype is free or a few dollars a month. AI usage is pay-per-question, estimated at roughly 5 to 10 cents each at current Claude Opus 5.5 prices. A cheaper model can be tested against the scenario set later.

## Needed from you

- A Claude API key (console.anthropic.com) before milestone 2.
- Ideally, a reviewer who knows Phoenix PD policy for the test scenarios.
