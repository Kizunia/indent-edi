# DEC-001: Docs first, and the docs stay live

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** user
- **SRS refs:** all (the SRS is the source of truth)
- **Work items:** all

## Context

The app will be built largely by AI agents working from written material. Chat history is not available to them. Decisions made only in conversation get lost or contradicted.

## Decision

1. Every decision is written in `docs/` **before** code is written. Agents start from [`AGENTS.md`](../../AGENTS.md) and follow its read order.
2. Precedence when documents disagree: **SRS confirmed requirement > accepted DEC > spec/ > data-model > review snapshot**. A DEC may deviate from an SRS clause only if it is listed in [`srs-errata.md`](../srs/srs-errata.md) with the reason.
3. The SRS text in [`docs/srs/SRS-v1.0.md`](../srs/SRS-v1.0.md) is never edited. Company answers are recorded in [`open-questions.md`](../open-questions.md) and a new or updated DEC.
4. A code change that alters behaviour must update the matching `spec/` file and, if a decision changes, add a new DEC that supersedes the old one (never rewrite history). It does this in the same change.
5. Work progress is tracked only in [`plan/roadmap.md`](../plan/roadmap.md) (status per work item). A work item is "done" only when its acceptance criteria and tests pass and the docs are updated.
6. Anything unclear or contradictory is added to `open-questions.md` or `srs-errata.md` and raised with the user. It is not guessed silently.
7. Provisional values (anything the SRS marks TBD) are labelled **PROVISIONAL** in code comments, config and docs, with the DEC id, so they are easy to find and replace.

## Alternatives considered

- Keep decisions in chat or PR descriptions: not readable by later agents.
- One large design document: hard to keep current and hard to see what changed. One file per decision gives history.

## Consequences

More writing up front; much less rework and fewer silent contradictions. Reviewers can check code against a short spec instead of the whole SRS.

## Revisit if

The docs become too heavy to maintain. Then merge `spec/` files, not the decision records.
