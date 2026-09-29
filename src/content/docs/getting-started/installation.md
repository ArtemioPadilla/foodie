---
title: Installation
description: Prerequisites, dependencies, browsers for Playwright, and how to check that everything works.
---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 22 (see `.nvmrc`; `package.json` requires `>=22`) | Astro 7, Vitest and the build scripts |
| npm | the one bundled with Node 22 | `package-lock.json` is the lockfile; use `npm ci` |
| Git | any recent version | Branches, hooks and the roadmap scripts |
| Docker (optional) | any | Refreshing screenshot baselines in CI's Linux image |
| GitHub CLI `gh` (optional) | any | `npm run ship`, `scripts/create-issues.sh` |

Python is no longer needed: the docs are part of the Astro site (v1 built them
with MkDocs).

## Install

```bash
git clone <repository-url> foodie   # the Foodie source repository
cd foodie
nvm use            # or install Node 22 another way
npm ci
```

`npm ci` installs exactly what `package-lock.json` pins. The dependency list is
deliberately short: the Inceptor stack plus `@dnd-kit/*` (planner drag and
drop), `firebase` (optional sign-in, loaded on demand) and `fflate` (plan
sharing). Adding anything else needs a roadmap decision or an ADR.

## Browsers for Playwright

The screenshot, accessibility and journey tests run in Chromium:

```bash
npx playwright install --with-deps chromium
```

## Check the installation

```bash
npm run dev        # http://localhost:4321/ — the landing page in English
npm run check      # the full quality gate; must be green before any commit
```

`npm run check` runs `astro check`, `tsc --noEmit`, Vitest, ESLint and the
`@ts-ignore` pragma check in parallel, then builds the site and runs the
built-site tests (SEO, auth chunking, CSP). It takes a few minutes the first
time.

To see the production build, including search:

```bash
npm run build
npm run preview    # http://localhost:4321/
```

## Optional: git hooks

```bash
npm run hooks:install
```

This points `core.hooksPath` at `scripts/hooks/`. Never bypass hooks with
`--no-verify`.

## Troubleshooting

- **`astro preview` returns immediately when run by an AI agent.** Astro 7
  moves the preview server to the background when it detects an agent
  environment (`CLAUDECODE`, `AI_AGENT`, …). The Playwright configs pass
  `--ignore-lock` to keep it in the foreground; by hand, add `--ignore-lock` or
  stop the background server with `npx astro preview stop`.
- **Lighthouse says "Chrome installation not found".** Point `CHROME_PATH` at
  Playwright's Chromium, for example
  `/opt/pw-browsers/chromium-*/chrome-linux/chrome`.
- **The search box finds nothing in `npm run dev`.** The Pagefind index is
  created by `npm run build`; search only works on a built site.
