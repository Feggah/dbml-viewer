# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## Git / commit conventions

**IMPORTANT: Do not add Claude/AI attribution to commits or pull requests.**

- Do **not** append a `Co-Authored-By: Claude ...` trailer to commit messages.
- Do **not** add "Generated with Claude Code" (or any similar AI-attribution
  line) to commit messages or pull request descriptions.
- Write commit messages and PR descriptions as a normal human contributor would:
  a concise summary line, optional body explaining the "why".

## Project overview

A fully client-side **DBML diagram renderer** (a no-backend alternative to
dbdiagram.io). Paste DBML, get an interactive ER diagram; share by URL (the
diagram is compressed into the link hash). There is no server and no database.

Stack: React 18 + TypeScript + Vite. DBML parsing uses `@dbml/core`; the canvas
(pan/zoom/drag, edge routing, highlighting) is custom, with no heavy diagram
library. URL-hash sharing uses `lz-string`.

## Commands

Use the Makefile (run `make help` for the full list):

```bash
make run      # dev server at http://localhost:5173
make build    # production build to dist/
make checks   # lint + type-check + security (alias: make check)
```

Underlying npm scripts: `npm run dev`, `npm run build`, `npm run lint`,
`npm run typecheck`.

Always run `make check` before pushing; CI runs the same gate and blocks the
GitHub Pages deploy on failure.

## Code layout

```
src/
  model/    parsing (@dbml/core -> normalized model), layout algorithms,
            geometry, colors, position lifecycle
  canvas/   Canvas (pan/zoom/drag), TableCard, Edges, group boxes, edge math
  state/    URL encode/decode (lz-string)
  App.tsx   wires editor + controls + persistence together
```

## Conventions

- TypeScript throughout; keep `make check` clean (ESLint + `tsc --noEmit`).
- Layout math and rendering share constants in `src/model/geometry.ts`. If you
  change table sizing in CSS, update those constants so edges still line up.
- Keep the app dependency-light and fully static. Do not introduce a backend or
  any feature that requires server-side state; sharing must stay URL-encoded.

## CI / deploy

`.github/workflows/deploy.yml` runs `make check`, then `make build`, then
deploys `dist/` to GitHub Pages on pushes to `main`. Dependabot
(`.github/dependabot.yml`) keeps npm and GitHub Actions dependencies current.
