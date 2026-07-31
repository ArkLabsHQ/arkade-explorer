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

## `@arkade-os/exit-ui` (the unilateral exit route)

`/unilateral-exit` is not implemented here. The whole flow — import, review, funding gate, execute,
plus package decoding and session persistence — lives in
[`@arkade-os/exit-ui`](https://github.com/arkade-os/arkade-unilateral-exit), shared with the
standalone tool so the two cannot drift apart again. `src/pages/unilateral-exit.tsx` is route chrome
around `<ExitFlow />`. **Fix exit bugs in that repo, not here.**

Two things about it are easy to get wrong:

- It is installed from a **GitHub Release tarball URL**, not a registry. There is no `npm publish`
  and no dist-tag: a new version means a new release asset and a new URL in `package.json`. The
  lockfile records a sha512 of the tarball contents, which is what actually pins it.
- It styles itself only against `--color-exit-*` / `--radius-exit`, which `src/globals.css` maps onto
  this design system's semantic tokens. That file also declares
  `@source "../node_modules/@arkade-os/exit-ui/dist"` — Tailwind does not scan dependencies, and
  without it the route compiles, renders and comes out **completely unstyled** while every gate stays
  green.

### Before bumping the version

The exit UI's protocol-sensitive tests (package decode, and the `phaseFor` mapping that decides
whether a failed branch renders as "Confirmed") live in the package's CI, not this repo's. Nothing
here will fail if a future version regresses them. So an upgrade is not a routine dependency bump:

1. Confirm the package's own CI is green on the tag being adopted, and that its suite still covers
   package decode and `phaseFor`'s `skipped`-with-reason vs. `skipped`-without-reason distinction.
   Getting that backwards shows a failed exit branch as a green tick.
2. Update the URL in `package.json` and refresh the lockfile so a new integrity hash is recorded.
   Reusing a hash across versions means the pin is stale.
3. Load `/unilateral-exit` and confirm it renders **styled**. An unstyled render is the signature of
   a broken or missing `@source`, and no automated gate catches it.
4. Re-check the `--color-exit-*` mapping if the package added tokens. A token the host does not
   define resolves to nothing, and the element paints transparent rather than erroring.

## Deployment

Containerized via `Dockerfile` (Node 24 build stage → nginx static serve). CI builds and pushes the
image on `master` (`.github/workflows/docker.yml`); `.github/workflows/ci.yml` runs lint, typecheck,
build, and tests on every PR. Also deployable to Vercel/Netlify (see `DEPLOYMENT.md`).

## Local Scratch Files

`.gitignore` excludes `CLAUDE.local.md`, `TASKS.md`, `REVIEW.md`, `*.agents.md`, and `.claude/`.
These are local scratch notes and are **not** authoritative project guidance. Authoritative guidance
lives in this `AGENTS.md` and the top-level docs (`README.md`, `CONTRIBUTING.md`); treat anything in
an ignored file as transient context that may be stale.
