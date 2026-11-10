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

All five source groups below are in scope for version 1. They are added one at a time in the milestone order.

### Layers of authority

Each source is tagged with its layer, and every step in an answer shows which layer it comes from. Department policy is often stricter than the law, so the layers are shown side by side and never merged.

| Layer | Source | Binding on officers? |
|---|---|---|
| 1. Constitutional | US Supreme Court decisions | Yes |
| 2. State law | Arizona Constitution, Arizona Revised Statutes, Arizona Administrative Code | Yes |
| 3. City law | Phoenix City Charter and City Code | Yes |
| 4. Department policy | Phoenix PD Operations Orders | Yes, as conditions of employment |
| 5. Guidance | Arizona Department of Education program manuals | Only where a school or agency agreement adopts it |

If two layers appear to conflict, the app shows both passages and flags the conflict. It does not decide which one wins.

### 1. Phoenix PD Operations Orders

- **Where:** PowerDMS public library (`public.powerdms.com/PhoenixPD`). One document per order, each with an ID and revision date. Revisions seen as recent as June 2026.
- **Open items:** whether the library can be enumerated and downloaded reliably, and what its terms of use allow.
- **Drafts:** some published orders are marked draft. These are excluded, or shown clearly labeled as not in effect.
- **Not public:** bureau manuals and RMS user manuals are referenced by the orders but may not be published. The app covers only what is published.

### 2. US Supreme Court cases

- **Where:** CourtListener (Free Law Project), which offers Supreme Court opinions through an API and bulk downloads, free of known copyright restrictions. The Court's own site is the cross-check.
- **Scope:** a curated set of policing decisions, not all Supreme Court opinions. Starting topics and example cases:

| Topic | Example cases |
|---|---|
| Stops and frisks | Terry v. Ohio, Rodriguez v. United States |
| Arrest and probable cause | Illinois v. Gates, Atwater v. Lago Vista |
| Use of force | Graham v. Connor, Tennessee v. Garner |
| Searches of homes, vehicles, phones | Payton v. New York, Arizona v. Gant, Riley v. California, Carpenter v. United States |
| Interrogation | Miranda v. Arizona, Berghuis v. Thompkins |
| Juveniles and schools | J.D.B. v. North Carolina, New Jersey v. T.L.O. |
| Evidence disclosure | Brady v. Maryland |

- **What is indexed:** the syllabus and the holding of each case, with a plain summary of the rule, linked to the full opinion. Whole opinions are too long and too full of dissent and background to retrieve from safely.
- **Limit: "still good law" is tracked by hand.** Free sources do not flag when a later case narrows or overrules an earlier one. Each case entry carries a reviewed-on date and a note of later cases that changed it. This list needs review by someone legally trained.
- **Gap:** Ninth Circuit and Arizona appellate decisions also bind Phoenix officers and are not in the requested scope. They are the natural next addition.

### 3. Arizona state law

- **Where:** Arizona Revised Statutes at `azleg.gov`; Arizona Administrative Code published by the Secretary of State and updated quarterly.
- **Scope, in order:**
  - Title 13: criminal code, including arrest, search, and justification (use of force) provisions
  - Title 28: transportation and DUI
  - Title 8: juveniles and child safety
  - Title 36: mental health evaluation and emergency admission
  - Title 4: liquor
  - Title 38: peace officer rights and duties
  - Title 41 and Administrative Code Title 13: peace officer standards and training (AZPOST)
  - Arizona Constitution, declaration of rights
- **Currency:** statutes change every legislative session, usually effective in the fall. The sync records the session each section reflects.

### 4. Phoenix City Code

- **Where:** `phoenix.municipal.codes`, which carries the City Charter, City Code, and Zoning Ordinance with an amendment history per section.
- **Scope:** the chapters officers enforce, such as conduct offenses, traffic and parking, noise, animals, parks, and licensing. Building and zoning codes are left out.

### 5. Education-related rules

The Arizona Department of Education does not regulate police. What applies to officers on school matters comes from three places:

- **Statute:** ARS Title 15, including § 15-154 (school safety program and the definition of school resource officer), plus the duty to report child abuse in § 13-3620.
- **State Board of Education rules:** Arizona Administrative Code Title 7, Chapter 2 (district schools) and Chapter 5 (charter schools).
- **Department of Education guidance:** the School Safety Program manual for school resource officers, school safety officers, and juvenile probation officers (FY26 edition, revised July 2025) and its requirements overview, published at `azed.gov`.

Scope covers school resource officer duties, interviews and arrests on campus, threats, student records, and mandatory reporting. Federal student privacy law (FERPA) is noted where the state material refers to it. School district policies are not included; each district sets its own.

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

1. **Policy library.** Confirm source access and terms. Ingest the Operations Orders into a searchable index. Done when a search for "vehicle pursuit" returns the right sections with correct revision dates.
2. **Cited answers.** Typed scenario in, cited checklist out, with the authority layer shown on each step. Done when a test set of about 30 realistic scenarios returns the correct orders, with no step lacking a citation.
3. **State law and city code.** Add the Arizona statutes and rules, then the Phoenix City Code. Done when scenarios return the governing statute alongside the policy.
4. **Supreme Court cases.** Build the curated case set with summaries and review dates. Done when stop, search, force, and interrogation scenarios cite the controlling cases.
5. **Education rules.** Add Title 15, the State Board rules, and the School Safety Program manual. Done when school scenarios return the right material.
6. **Field use.** Voice input, phone layout, officer and supervisor views.
7. **Staying current.** Scheduled re-sync per source, plus a "what changed" list.

## Testing

A fixed set of scenarios with the expected orders for each is checked on every change: domestic violence call, vehicle pursuit, use of force reporting, juvenile detention, DUI stop, missing person, civil dispute, and so on. Someone with Phoenix PD policy knowledge should review the expected answers; this is the single most valuable outside input the project needs.

## Risks

| Risk | Mitigation |
|---|---|
| Outdated policy shown as current | Revision dates on every answer; scheduled re-sync; stale-library warning |
| AI states something not in policy | Sources-only answering, mandatory citations, verbatim quoting on high-stakes topics, test set |
| A case is cited after a later decision narrowed or overruled it | Hand-maintained status and review date on every case; legally trained reviewer |
| Answer reads as legal advice | Shows source text and where it comes from; states that it is a reference and not legal advice; conflicts are flagged, not resolved |
| Larger library returns too much, burying the policy steps | Answers lead with department policy, with law and cases as supporting layers; test set checks ordering |
| Sensitive details typed into an unsanctioned tool | No logging by default; input warning; no accounts needed for the first version |
| Mistaken for an official tool | Persistent "unofficial reference" banner; no department branding or insignia |
| Department restricts unapproved tools on duty | Outside the build; worth raising with the department early if adoption is the goal |
| Source site changes or blocks downloads | Keep downloaded copies with their dates; ingestion reports failures instead of silently skipping |

## Running cost

Hosting for a prototype is free or a few dollars a month. AI usage is pay-per-question, estimated at roughly 5 to 10 cents each at current Claude Opus 5.5 prices. A cheaper model can be tested against the scenario set later.

## Needed from you

- A Claude API key (console.anthropic.com) before milestone 2.
- Ideally, a reviewer who knows Phoenix PD policy for the test scenarios.
- A legally trained reviewer for the Supreme Court case list and summaries.
