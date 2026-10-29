# Organize Indent System: documentation

These docs are the contract the code is written against. They are meant to be read by people **and AI agents**. Start with [`../AGENTS.md`](../AGENTS.md).

## Map

| Folder / file | What it holds | Changes when |
|---|---|---|
| [srs/SRS-v1.0.md](srs/SRS-v1.0.md) | The SRS, converted unedited. Source of truth for requirements | never (new SRS version = new file) |
| [srs/srs-errata.md](srs/srs-errata.md) | SRS contradictions and deliberate deviations, with resolution | a conflict is found |
| [open-questions.md](open-questions.md) | SRS TBD items still awaiting the company, and what the app does meanwhile | the company answers |
| [decisions/](decisions/README.md) | One record per decision (DEC-001..), with status and alternatives | a decision is made or replaced |
| [spec/](spec/) | The build contract: domain rules, permissions, API, validation, UI, export/print, traceability | behaviour changes |
| [architecture/](architecture/overview.md) | Layers, folder layout, dev setup | structure or tooling changes |
| [data-model/](data-model/final-data-model.md) | The DB teammate's model (owned by them) and the app-to-DB [handoff](data-model/db-handoff.md) | DB owner changes the model / app needs something |
| [plan/roadmap.md](plan/roadmap.md) | Work items, acceptance criteria and status | every work item |
| [presentation/](presentation/README.md) | Plain-language explanation of how the system works, with diagrams, a demo script and Q&A, for presenting | behaviour or work-item status changes (page 05 especially) |
| [reviews/](reviews/app-vs-srs-review.md) | Frozen review of the MVP against the SRS (the starting point) | never |

## Precedence when documents disagree

1. SRS confirmed requirements (a requirement the SRS marks Confirmed).
2. Accepted decisions (DEC-xxx). Where a DEC deviates from the SRS it is listed in the errata.
3. `spec/` files.
4. The data model (for storage details).
5. The review snapshot (history only).

If two documents at the same level conflict, stop, fix the docs, and ask the user.

## Status words

- **Accepted**: decided, does not wait for the company.
- **Provisional / PROVISIONAL**: a safe default chosen because the SRS says TBD. Listed in [open-questions.md](open-questions.md). Must be labelled in code and config.
- **Superseded**: replaced by a newer DEC; kept for history.
- **done / todo / in-progress / blocked**: work-item status in the roadmap.

## Keeping the docs live

1. A change that alters behaviour updates the matching `spec/` file in the same commit.
2. A new or changed decision gets a DEC file (supersede, do not rewrite) and an index row in [decisions/README.md](decisions/README.md).
3. When a work item finishes, update its status in [plan/roadmap.md](plan/roadmap.md) and the Test column in [spec/traceability.md](spec/traceability.md).
4. New SRS contradictions go to [srs/srs-errata.md](srs/srs-errata.md); new unknowns go to [open-questions.md](open-questions.md).
5. Needs from the DB owner go to [data-model/db-handoff.md](data-model/db-handoff.md). Do not edit `final-data-model.md` or `client/prisma/`.
6. Use relative links. Prefer an ID (FR-12, DEC-011, D-17) over prose when referring to another document.

## Reading order for a new contributor

1. [AGENTS.md](../AGENTS.md) -> this page.
2. [decisions/README.md](decisions/README.md) (skim the table) and [srs/srs-errata.md](srs/srs-errata.md).
3. [spec/domain-rules.md](spec/domain-rules.md), [spec/api.md](spec/api.md).
4. The roadmap entry for the work item you are doing, and the DEC / spec files it names.
