# DEC-023: npm only, Docker Compose MySQL for dev and test

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decided by:** user (npm + Docker Compose)
- **Review refs:** #16
- **Work items:** WI-01

## Context

`client/` has `package-lock.json` tracked, and untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml`; `node_modules` was installed by pnpm. The machine has Docker and a local MySQL 8.0.

## Decision

1. **npm** is the only package manager. Delete `client/pnpm-lock.yaml` and `client/pnpm-workspace.yaml`, remove `node_modules`, and reinstall with `npm ci`. `package-lock.json` is the single lockfile. `engines` in `package.json` pins Node LTS and npm.
2. `docker-compose.yml` at the repo root runs **MySQL 8.0** (>= 8.0.16 needed for CHECK constraints, D-07) with `utf8mb4` and `utf8mb4_0900_ai_ci`, UTC, and two databases: `indent_dev` and `indent_test`. The local Windows MySQL on port 3306 is not used; Compose maps to port 3307 to avoid clashes.
3. `.env.example` documents `DATABASE_URL`, `DATABASE_URL_TEST`, `AUTH_PROVIDER`, `APP_TIMEZONE`, `ALLOW_DUPLICATE_ITEMS`, number-format settings. `.env` stays git-ignored.
4. npm scripts (documented in [dev-setup.md](../architecture/dev-setup.md)): `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:int`, `test:e2e`, `db:up`, `db:down`, `db:migrate`, `db:seed`, `db:reset:test`.
5. Integration and E2E tests run only against `indent_test`, which may be reset freely. Tests refuse to run if `DATABASE_URL_TEST` does not contain `_test`.

## Alternatives considered

- pnpm: the user chose npm.
- The local MySQL only: not reproducible for agents or CI.
