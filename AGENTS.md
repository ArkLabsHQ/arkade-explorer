# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Project Overview

**arkade-explorer** — A blockchain explorer for the Arkade protocol, built as a Vite + React 19
single-page app in TypeScript. It reads the Arkade indexer API (via `@arkade-os/sdk`) and decodes
transactions (via `@scure/btc-signer`) to browse virtual/commitment transactions, addresses, VTXOs,
assets, and batch/connector trees, with a live activity feed.

This is a **frontend app**, not a library: there is no published package, no dual ESM/CJS build, and
no monorepo. It consumes `@arkade-os/sdk`; it does not extend or vendor it.

## Toolchain & Standards

These conventions are shared with the `@arkade-os/sdk` monorepo (`../ts-sdk`) so tooling stays
consistent across the Arkade ecosystem.

- **Node**: `24.15.0` (see `.nvmrc`); `engines.node` is `>=24.15.0 <25`.
- **Package manager**: **pnpm only**, pinned via `packageManager: pnpm@10.29.2` and `engines.pnpm`.
  Never use `npm` or `yarn`; `package-lock.json` is git-ignored and must not be committed. `.npmrc`
  sets `save-exact=true`, so add dependencies at exact versions.
- **Formatting & lint**: **Prettier is the linter** (no ESLint). Config in `.prettierrc`: double
  quotes, semicolons, trailing commas (all), 100-char width, **4-space indent**. `pnpm run lint`
  runs `prettier --check .`; `pnpm run format` runs `prettier --write .`. Run `format` before
  committing.
- **TypeScript**: strict mode, bundler module resolution, path alias `@/*` → `src/*`.

## Commands

```bash
pnpm install            # Install dependencies (pnpm only)
pnpm dev                # Start the Vite dev server
pnpm build              # Type-check (tsc) + production build (vite build)
pnpm run typecheck      # Type-check only (tsc --noEmit)
pnpm run lint           # Check formatting (prettier --check .)
pnpm run format         # Auto-format (prettier --write .)
pnpm test               # Run unit tests (vitest run)
pnpm test:watch         # Watch mode
pnpm preview            # Preview the production build

# Single test file / by name
pnpm exec vitest run src/lib/vtxo-aggregation.test.ts
pnpm exec vitest run -t "test name pattern"
```

## Architecture

Vite + React 19 SPA. Client-side routing via React Router; server state via TanStack Query;
styling via Tailwind CSS v4 (PostCSS) with Radix UI primitives.

```
src/
  pages/          # Route-level views (transactions, address, asset, batch, ...)
  components/
    nav/          # Navigation / layout chrome
    shared/       # Reusable presentational components (vtxo-list, asset-amount-display, ...)
  hooks/          # Data hooks (e.g. use-asset-details) — usually TanStack Query wrappers
  providers/      # React context providers (app-wide state, query client, theme)
  lib/
    api/          # Arkade indexer client (indexer.ts) built on @arkade-os/sdk
    *.ts          # Pure domain helpers (e.g. vtxo-aggregation) — prefer unit tests here
  themes/         # Light (Dawn) / Dark (Midnight) theme definitions
```

Key conventions:
- **Data fetching** goes through TanStack Query hooks in `src/hooks/`, backed by the indexer client
  in `src/lib/api/`. Keep network/serialization concerns at that boundary — e.g. the SDK models some
  amounts as `bigint`; normalize at the fetch boundary when values are cached to `sessionStorage`
  (which cannot serialize `bigint`).
- **Pure logic** (aggregation, formatting, decoding helpers) lives in `src/lib/` and is unit-tested
  with Vitest. Add tests here rather than in components.
- **Config** is environment-driven (`VITE_*` vars, see `README.md`); there are sensible defaults so
  the app runs with no `.env`.

## Deployment

Containerized via `Dockerfile` (Node 24 build stage → nginx static serve). CI builds and pushes the
image on `master` (`.github/workflows/docker.yml`); `.github/workflows/ci.yml` runs lint, typecheck,
build, and tests on every PR. Also deployable to Vercel/Netlify (see `DEPLOYMENT.md`).

## Local Scratch Files

`.gitignore` excludes `CLAUDE.local.md`, `TASKS.md`, `REVIEW.md`, `*.agents.md`, and `.claude/`.
These are local scratch notes and are **not** authoritative project guidance. Authoritative guidance
lives in this `AGENTS.md` and the top-level docs (`README.md`, `CONTRIBUTING.md`); treat anything in
an ignored file as transient context that may be stale.
