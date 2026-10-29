# Presentation guide: Organize Indent System

Use this folder when you present the project. It explains **how the system works** in plain language, with diagrams and a demo script. The technical detail behind every point lives in the rest of `docs/`; each page links to it.

## Suggested running order (about 20 minutes)

| Min | Page | What you say |
|---|---|---|
| 0-3 | [01 - The problem and the solution](01-overview.md) | What an indent is, who uses the system, what it does and does not do |
| 3-9 | [02 - How it works](02-how-it-works.md) | The journey of an indent from request to submission; the screens |
| 9-14 | [03 - Rules and safeguards](03-rules-and-safeguards.md) | Why the data can be trusted: roles, statuses, validation, errors, concurrency |
| 14-17 | [04 - Under the hood](04-architecture.md) | How it is built, and why it can move to the company ERP later |
| 17-20 | [05 - Status and next steps](05-status-and-next-steps.md) | What works today, what is next, what we need from the company |

Demo script and likely questions: [06 - Demo and Q&A](06-demo-and-qa.md).

## Rules for keeping this folder honest

- Say **built** only for things that exist in the code and have been run. Everything else is **planned**. [05](05-status-and-next-steps.md) is the one page that must be updated whenever a work item in [the roadmap](../plan/roadmap.md) changes status.
- Anything the SRS leaves undecided is shown as **provisional** (our safe default) and listed in [open-questions.md](../open-questions.md). Do not present a provisional default as a company decision.
- If you change behaviour in the code, change the matching page here in the same change ([DEC-001](../decisions/DEC-001-docs-first-living-docs.md)).

## Source documents

[SRS](../srs/SRS-v1.0.md) · [Decisions](../decisions/README.md) · [Business rules](../spec/domain-rules.md) · [Roadmap](../plan/roadmap.md)
