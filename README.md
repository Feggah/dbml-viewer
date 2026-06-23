# DBML Viewer

A self-contained, client-side **DBML diagram renderer** — a no-login alternative to dbdiagram.io. Paste DBML on the left, get an interactive ER diagram on the right. Share a diagram by just sending the URL: the DBML and your layout are compressed into the link itself. No backend, no database, no accounts.

![DBML Viewer](https://img.shields.io/badge/stack-React%20%2B%20Vite-6366f1)

## Features

- **Live rendering** — paste/edit DBML and the canvas updates as you type (parsed with the official `@dbml/core`, so the full DBML spec is supported: tables, refs, enums, table groups, notes, composite keys, multiple schemas).
- **Pan & zoom** — drag the background to pan, scroll/pinch to zoom toward the cursor, `Fit` button to frame everything, `+ / −` and a live zoom %.
- **Drag tables** — grab any table header to reposition it.
- **Hover highlighting** — hover a table to highlight its relationship lines, connected tables, and the exact FK columns involved; everything else dims (just like dbdiagram).
- **Re-order layouts**:
  - **Grid** — compact masonry packing.
  - **By Group** — clusters tables by their `TableGroup`.
  - **Hierarchical** — a Sugiyama-style layered layout that follows foreign-key direction (referenced tables flow downstream), with a barycenter pass to reduce edge crossings.
- **Table groups** drawn as labeled, colored regions that update live as you drag.
- **Shareable links** — `Share link` copies a URL with the whole diagram (DBML + table positions) encoded in the `#hash`. Open it anywhere and you see the exact same diagram. No server involved.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build / deploy

It's a pure static site — build and drop the `dist/` folder on any static host (Vercel, Netlify, GitHub Pages, S3, or just open it):

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build locally
```

Because everything (including sharing) is client-side, you can host `dist/` anywhere with zero configuration.

## Make targets

```bash
make run      # dev server
make build    # production build to dist/
make checks   # lint + type-check + security (alias: make check)
make help     # list all targets
```

`make checks` runs ESLint, the TypeScript type-checker, an `npm audit` of the
shipped (production) dependencies, and a [Trivy](https://trivy.dev) filesystem
scan (vulnerabilities, secrets, misconfigurations). Trivy is skipped with a
notice if it isn't installed locally; CI always runs it. Accepted, documented
advisories live in `.trivyignore`.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the site on every push to
`main`. It runs `make check` (lint + type-check + security gate) **before**
`make build`, then uploads `dist/` to Pages.

One-time setup: in the repo's **Settings → Pages**, set **Source** to
**GitHub Actions**. The site is served from a subpath (`/<repo>/`), which works
because Vite is configured with `base: './'` (relative asset URLs).

## How sharing works

The app holds no state on any server. When you click **Share link**, the current DBML and the `{x, y}` position of every table are JSON-serialized, compressed with `lz-string`, and placed in the URL hash. Anyone who opens that URL decompresses it locally and renders the identical diagram. Edit the diagram and the address bar updates automatically, so you can also just copy the URL.

## Tech

- React 18 + TypeScript + Vite
- `@dbml/core` — official DBML parser
- `lz-string` — URL-hash compression
- Custom SVG/HTML canvas (pan/zoom/drag, edge routing, highlighting) — no heavy diagram library.

## Project layout

```
src/
  model/        parsing (@dbml/core → normalized model), layout algorithms, geometry, colors
  canvas/       Canvas (pan/zoom/drag), TableCard, Edges, group boxes, edge-path math
  state/        URL encode/decode (lz-string)
  App.tsx       wires it all together (editor, controls, persistence)
```
