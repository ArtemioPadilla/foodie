# i18n in islands: `lang` by prop, `t()`, `getTranslated()`

**Source of truth:** `src/i18n/en.ts` (UI strings, `typeof en` is the
`Dictionary` type) — `es.ts` and `fr.ts` are typed against it, so a key that
is missing in one locale is a `tsc` error, not a runtime blank. Catalog text
(recipe names, ingredient descriptions, category labels) is *not* in the
dictionary: it ships trilingual inside `public/data/*.json` as `MultiLangText`
and only needs selecting. Roadmap D7 / Issues 004, 015.

| Helper (`src/i18n`)                  | For                                                     | Example                                                         |
| ------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------- |
| `t(lang, key, params?)`              | UI strings by dot-path, `{{x}}` interpolation, `_plural` | `t(lang, 'common.reviewCount', { count: 3 })` → `3 reviews`     |
| `getTranslated(text, lang)`          | A catalog `MultiLangText`, English fallback              | `getTranslated(recipe.name, lang)`                              |
| `detectLocale(pathname)`             | Astro pages: locale from the route                       | `detectLocale(Astro.url.pathname)`                              |
| `localizedRoute(pathname, lang)`     | Locale-aware hrefs (always trailing slash)               | `withBase(localizedRoute('/recipes/', lang))`                   |
| `LOCALES`, `DEFAULT_LOCALE`, `Locale` | Iteration and typing                                    | `LOCALES.map(...)`                                              |

There is **no runtime language switch** inside a page: each locale is a static
route (`/`, `/es/`, `/fr/`) and the switcher is a link (`localizedRoute`).
i18next is gone — its `translation.json` files were merged into the typed
dictionaries (Issue 015) and `public/locales/` no longer exists.

## The rule: `lang` is a prop

Islands hydrate outside the Astro request, so they cannot read
`Astro.currentLocale`. The page knows the locale; it passes it down.

```astro
---
// src/pages/es/recipes.astro (or any page)
import RecipeBrowser from '@/components/islands/RecipeBrowser';
import { detectLocale } from '@/i18n';
const lang = detectLocale(Astro.url.pathname); // 'es'
---
<RecipeBrowser client:visible lang={lang} />
```

```tsx
// src/components/islands/RecipeBrowser.tsx
import { t, getTranslated, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';

export default function RecipeBrowser({ lang }: { lang: Locale }) {
  const { recipes, status } = useCatalog();
  if (status === 'loading') return <p>{t(lang, 'common.loading')}</p>;
  return (
    <ul aria-label={t(lang, 'nav.recipes')}>
      {recipes.map((r) => (
        <li key={r.id}>
          {getTranslated(r.name, lang)} · {t(lang, 'common.reviewCount', { count: r.reviewCount })}
        </li>
      ))}
    </ul>
  );
}
```

Never read `navigator.language` (or `document.documentElement.lang`) during
render: the server-rendered HTML was built for one locale and a different value
on the client would hydrate a mismatched tree. If a value genuinely depends on
the browser (unit system, date format), read it in an effect or through
`useClientPreference`, and render the locale-neutral fallback first.

## Adding a string

1. Add the key to `src/i18n/en.ts` in its group (`recipe.*`, `planner.*`, …).
2. `npm run type-check` now fails until `es.ts` and `fr.ts` carry the key.
3. Keep the same `{{placeholders}}` in the three values and, for counts, add a
   `<key>_plural` sibling — `src/tests/i18n.test.ts` checks parity,
   duplicates, empty values, placeholder sets and plural pairs.

Keys are dot-paths: `t(lang, 'tags.gluten-free')` works because groups are one
level deep and hyphenated leaves are quoted in the dictionary.

## Passing `lang` further down

- **Child components** in the same island: pass `lang` as a prop, or put it in
  React Context *inside* that island (fine — the rule forbids Context *across*
  islands).
- **Stores and pure functions** (`src/lib/domain/*`, `src/lib/catalog/*`) take
  `lang` as an argument; they never import a "current language".
- **Several islands on one page** each receive the same `lang` prop from the
  page; do not try to share it through a global.

## Tests

- `src/i18n/index.test.ts` — `t()` interpolation/plurals, route helpers.
- `src/tests/i18n.test.ts` — dictionary integrity (ported from the legacy
  `translationSchema.test.ts` and `validateTranslationSync.js`).
- Island tests render with an explicit `lang` prop; never rely on jsdom's
  `navigator.language`.
