---
title: Contributing code
description: Issue-driven development in Foodie — from a GitHub issue through planning, implementation and review to a merged PR — plus branch, commit and label conventions.
---

Foodie is developed **issue first**: every change starts as a GitHub issue,
ships as one pull request against `main`, and is deployed when it merges.
Humans and Claude Code follow the same flow.

## The flow

```
GitHub issue ──► prometeo (plan) ──► forja (implement) ──► centinela (validate) ──► PR ──► review + CI ──► merge ──► deploy
```

1. **Issue.** Open or pick an issue. Roadmap work comes from
   `docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`
   (`scripts/create-issues.sh` turns its issue blocks into GitHub issues);
   bugs and ideas come from the issue forms or the in-app feedback button.
   Each issue has acceptance criteria and a validation command.
2. **Plan — prometeo.** The planning sub-agent (`.claude/agents/prometeo.md`)
   reads the roadmap and the issue, checks dependencies, and returns an
   ordered plan. It writes no code.
3. **Implement — forja.** The implementation sub-agent
   (`.claude/agents/forja.md`) works on one issue, on its own branch, in small
   commits, test first where behaviour changes.
4. **Validate — centinela.** The review sub-agent
   (`.claude/agents/centinela.md`) runs `npm run check` and the issue's
   validation block, looks for forbidden imports and checks the ethics tier.
   It answers `APPROVED` or `REJECTED` with reasons; a rejection goes back to
   forja.
5. **Pull request** against `main`, with `Closes #N` in the body. CI runs the
   same gates plus Playwright; a maintainer reviews and merges; `deploy.yml`
   publishes.

The main Claude Code session orchestrates the three sub-agents. Working by
hand, you play all three roles: plan from the issue, implement, then run the
checks yourself before opening the PR.

## Branches, commits, labels

- **Branch** from `main`: `phase-N/issue-NNN-short-slug` for roadmap work
  (e.g. `phase-4/issue-031-tracking-today`), `fix/…` or `feat/…` otherwise.
- **Commits** follow Conventional Commits with the issue id:
  `type(scope): summary (roadmap #NNN)` or `(#N)`. Types: `feat`, `fix`,
  `docs`, `test`, `chore`, `refactor`, `perf`. A commit that only adds a
  failing test may carry a `Tdd-Red:` trailer.
- **Labels:** `phase-0` … `phase-6`, `type:feat|fix|docs|test|chore`,
  `risk:high`, plus `recipe-submission` for recipes. Milestones `v0.1` …
  `v1.0`.
- Record user-visible changes under `## [Unreleased]` in `CHANGELOG.md`.

## The gate

```bash
npm run check      # astro check + tsc + Vitest + ESLint + pragmas + build + built-site tests
npm run test:e2e   # Playwright journeys and the CSP gate
```

Both must be green before a PR is opened. Never use `--no-verify`, never add
`@ts-ignore`, and never delete a test to make it pass: if a test encodes an
outdated assumption, change it deliberately and say why in the PR.

## Ethics tiers

Every PR declares a tier (`.claude/checklists/ethics.json`, `docs/ETHICS.md`):

- **Tier 0**: docs and tests only.
- **Tier 1**: the default for features and fixes; checklist items 1, 7 and 8.
- **Tier 2** (`risk:high`): a new request to another origin, new persistent
  storage of user input, sign-in or profile surfaces, or diagnostics. Needs a
  Stakeholder Analysis in an ADR before merging.

## Decisions

Architecture decisions are ADRs in `docs/decisions/`. Foodie's own are:

| ADR | Decision |
|---|---|
| 0001 | Rebuild Foodie template-first on Inceptor (decisions D1–D14) |
| 0002 | Local-first user data: `localStorage` keys, stakeholders, export and clear |
| 0010 | `@dnd-kit/core` for the planner's drag and drop |
| 0011 | Astro 7 instead of Astro 5 |
| 0012 | Firebase Auth behind an `AuthProvider` contract, loaded lazily; the Content Security Policy |
| 0013 | Plan sharing in the URL fragment, compressed with `fflate` |
| 0014 | Ingredient prices on catalog ids |

The other numbered ADRs come from the Inceptor template. A change that
contradicts an ADR needs a new ADR that supersedes it.

## Rules

The non-negotiable rules (no Radix, no Context across islands, Zod at every
boundary, `withBase()` for every link, `lang` as a prop, …) are listed in
[Development](../../guides/development/#rules-every-change-follows).
