# Legacy Vite scripts (archived — not executable)

Snapshot of `scripts/` from the React 18 + Vite Foodie app (`main` before the
Inceptor cutover), kept **read-only for reference** by roadmap Issue 011. They
are stored without the executable bit, are excluded from ESLint/Prettier, and
depend on packages the new stack removed (`ajv`, `sharp`, i18next-style
`public/locales/*`), so running them from here is neither supported nor safe.
Retrieve the original with `git show main:scripts/<name>` if needed.

| Script | What it did | Replacement in the Inceptor app |
|---|---|---|
| `checkDuplicates.js` | Duplicate recipe ids / English names | `scripts/check-duplicates.mjs`, run inside `src/tests/catalog-schema.test.ts` |
| `validateJSON.js` | ajv JSON-schema validation of recipes/ingredients | Zod schemas in `src/schemas/` + content collections (`src/content.config.ts`), enforced by `catalog-schema.test.ts` and `astro build` |
| `validateTranslations.js` | EN/ES/FR present in every recipe text | `MultiLangTextSchema` (all three locales required, non-blank) + the translation walk in `catalog-schema.test.ts` |
| `validateTranslationSync.js` | Key parity across `public/locales/*/translation.json` | `src/i18n/{en,es,fr}.ts` typed as `typeof en` + `src/tests/i18n.test.ts` (roadmap Issue 015) |
| `populate-data.mjs`, `bulk-populate.mjs`, `add-batch-{2,3,4}.mjs`, `generate-recipes.mjs` | One-off seeds that produced the current `public/data/*.json` | None — the catalog is hand-edited via PR (see `docs/recipes/catalog-data.md`) |
| `generate-icons.mjs` | PWA icons with `sharp` | `scripts/generate-brand-assets.mjs` |
| `optimizeImages.js` | Batch image compression with `sharp` | Astro `<Image />` / build-time optimisation |
