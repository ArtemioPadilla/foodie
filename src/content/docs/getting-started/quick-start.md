---
title: Quick start
description: Run Foodie locally in three commands, then take a five-minute tour of the app.
---

## Run it

You need Node.js 22 (the version in `.nvmrc`) and npm.

```bash
git clone https://github.com/ArtemioPadilla/foodie.git
cd foodie
npm ci
npm run dev
```

Open `http://localhost:4321/`. The dev server reloads on every change. Spanish
and French are at `/es/` and `/fr/`.

Without Firebase configuration, development builds use an in-memory mock for
sign-in: use `demo@foodie.test` with the password `foodie-demo`, or create any
account (it lives in your browser only). See
[Configuration](../configuration/) to connect a real Firebase project.

## A five-minute tour

1. **Browse recipes** at `/recipes/`. Filter by meal type, cuisine, dietary
   label, difficulty and total time; sort by rating, time, name or cost. The
   filters live in the URL, so a filtered list can be bookmarked or shared.
2. **Open a recipe.** Change the servings and every quantity and nutrition
   value scales. Switch between metric and imperial units, start a timer on a
   step, mark the recipe as a favourite, or add it to your plan or shopping list.
3. **Plan the week** at `/planner/`. Drop recipes into breakfast, lunch, dinner
   and snack slots, drag them between days (or move them with the keyboard),
   duplicate a day, and save the plan as a template. The planner shows the
   week's cost and nutrition.
4. **Generate the shopping list** from the plan at `/shopping/`. Quantities of
   the same ingredient are merged and converted, items are grouped by category
   and priced, and you can add your own items. Check items off as you shop.
5. **Keep a pantry** at `/pantry/` with quantities, locations and expiry dates;
   items that expire soon are highlighted.
6. **Track what you eat** at `/tracking/`: log recipes, ingredients or drinks,
   set goals at `/tracking/goals/` and see charts at `/tracking/progress/`.
7. **Share a plan** from the planner: the whole plan is compressed into a link.
   Whoever opens it at `/plan/shared/` can import it; no server is involved.

All of this works offline after the first visit, and all of it is stored in
your browser's `localStorage` (see [State and storage](../../reference/state/)).

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/`, then the Pagefind search index |
| `npm run preview` | Serve `dist/` locally |
| `npm run test` | Unit tests (Vitest) |
| `npm run check` | The full gate: astro check, tsc, Vitest, ESLint, pragma check, build and the built-site tests |
| `npm run test:e2e` | Playwright journeys against a dedicated build |

## Next steps

- [Installation](../installation/) covers prerequisites and Playwright.
- [Development](../../guides/development/) explains how the code is organised.
