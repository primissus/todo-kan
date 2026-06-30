# Workflow

## Before touching anything
1. Read [AGENTS.md](../AGENTS.md) and the relevant `.context/` doc for the axis you're changing.
2. Branch from `main` (don't commit feature work straight to the default branch).

## To make a change
1. Put domain behavior in a **`useAppStore` action**; read it via a `selectors.ts`
   hook. Keep ephemeral UI/nav state in `useUiStore`.
2. Use Tailwind semantic tokens + existing shadcn primitives; don't hand-edit `components/ui/`.
3. Adding a keyboard shortcut? Wire it in **both** `hooks/useGlobalKeymap.ts`
   (dispatch) **and** `lib/keymap.ts` (the Help cheat-sheet) — they must stay in sync.
4. Add/extend tests in `src/test/` (store actions and pure `lib/` helpers especially).

## Before calling something done
- [ ] `pnpm typecheck` clean (`tsc -b` also checks the test files).
- [ ] `pnpm lint` clean (3 pre-existing `react-refresh` warnings in `components/ui/` are expected).
- [ ] `pnpm test` green.
- [ ] `pnpm build` **and** `pnpm build:single` both succeed (the single-file build is a real target).
- [ ] Docs updated if behavior changed (README / REQUIREMENTS / PLAN / PROGRESS / AGENTS / CLAUDE).
- [ ] Conventional-commit message; no `dist*`/`node_modules` staged.

## Deploy
No CI/CD in the repo (no `.github/workflows`). Ship `dist/` to any static host, or
just open `dist-single/index.html` in a browser — data is saved in that browser's
localStorage. [PENDING: where the hosted build, if any, is published.]

## Verification note
Browser/visual checks (loading the `file://` single-file build, screenshots) are a
**manual** human step — not part of the automated gate. The jsdom render tests
cover component behavior without a browser.
