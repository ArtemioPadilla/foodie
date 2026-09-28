# Foodie → Inceptor — Diseño de migración y roadmap

**Fecha:** 2026-09-27
**Estado:** Propuesta (pendiente de revisión de Artemio)
**Decisión:** Reconstruir Foodie sobre el template Inceptor (Astro 5 + React 19 + Tailwind v4 + Base UI), template-first, con paridad funcional por fases y cutover a `main` al cerrar la Fase 3.
**Referencias:** `ArtemioPadilla/inceptor` (HEAD `bde55a0`) · precedente `TradePilot/docs/superpowers/specs/2026-06-11-web-rebuild-inceptor-design.md`.

> **Para los agentes (`prometeo`, `forja`, `centinela`):** este archivo es el plan canónico de la migración. Los bloques `### Issue NNN — …` siguen el esquema de `INTEGRATION-PLAN.md` de Inceptor. Las historias (`US-x`) dan contexto de producto; los issues son la unidad de trabajo. Los números `NNN` son IDs del plan; el número real de GitHub se asigna al crear el issue (Issue 007 automatiza esto).

---

## 0. Contexto (hechos verificados, no re-derivar)

**Foodie hoy** (`main` @ `ac89bf1`, 2025-11-26):

- SPA React 18 + Vite 7 + react-router 7 + Tailwind 3 + i18next (EN/ES/FR) + Firebase (**solo Auth**, sin Firestore ni Storage) + react-dnd + `@octokit/rest` + vite-plugin-pwa. ~31k líneas en `src/`, `tests/`, `scripts/`.
- 14 rutas, 11 contextos React, 12 claves de `localStorage`, 73 componentes (17 primitivos en `common/`), 716 claves de traducción por idioma, 50 recetas / 105 ingredientes / 39 bebidas en `public/data/*.json`.
- Calidad: `tsc` y `lint` limpios, 363 tests Vitest verdes, build OK. **13 de 25 E2E fallan** (baseURL sin `/foodie/`; traducciones bundleadas que el spec espera por red). `npm audit`: 37 vulnerabilidades (mayoría devDeps). Security Scan deshabilitado por inactividad.
- Deuda relevante: contribución de recetas **rota** (`initializeGitHubService` nunca se llama; escribe un archivo por receta cuando el dato es `recipes.json` consolidado); config de Firebase hardcodeada mientras las `VITE_FIREBASE_*` no se leen; `VITE_GITHUB_CLIENT_SECRET` en `.env.example`; token de GitHub en `localStorage`; `ProtectedRoute`, `Toast`, `ErrorBoundary`, `OfflineIndicator`, `SkipLink`, `useSEO`, `useAnalytics`, `useFocusTrap` sin uso; `react-hook-form`, `zod`, `date-fns`, `workbox-window` instalados sin uso; TanStack Query montado sin ningún `useQuery`; `categories.json` y `config.json` nunca se leen; `/sw.js` registrado a mano en ruta incorrecta.
- PR #28 (`feat/tracking`, +4560/-865) abierto desde 2025-11: compartir planes (Firestore), precios de ingredientes, ítems custom en compras, `SharedPlanPage`, `costCalculations`. Incluye por error `my-venv/`. Se **porta por historias** (Issues 026, 040, 041), no se mergea.
- Deploy: GitHub Pages en `https://artemiopadilla.github.io/foodie/` + MkDocs (Python) bajo `/foodie/docs`.

**Inceptor hoy** (lo que aporta):

- Astro 5 + React 19 + Tailwind v4 + Base UI (~70 componentes `src/components/ui/`, incl. Dialog, Sheet, Tabs, Select, Combobox, Form(rhf+zod), DataTable, Stepper, Toast, charts Recharts), TanStack Query con persistencia IDB (`QueryProvider`), nanostores (`$theme`, `$online`, `$installPrompt`), `@vite-pwa/astro`, i18n **EN/ES** por ruta (`/`, `/es/`) con diccionarios tipados (`es: typeof en`), `FeedbackFAB`, `ErrorBoundary`, `RouteGuard`, `use-listing`, flags, Sentry/analytics opcionales, docs site propio (colección `docs` + Pagefind, reemplaza MkDocs), gallery/demos/blog.
- Calidad: `npm run check` (astro check + tsc + vitest + eslint + pragmas → build), Playwright visual/a11y/keyboard/smoke, Lighthouse budgets, `forbidden-imports`, ethics checklist por tiers, agentes `prometeo`/`forja`/`centinela`, `doctor`/`monday`/`ship`.
- Advertencias no negociables: no `@astrojs/tailwind`; **no React Context entre islas** (nanostores); **no envolver toda la app en una isla `client:load`**; no Radix mezclado con Base UI; no `@tremor/react`; no `framer-motion` (usar `motion/react`); tipos cross-boundary (red, storage, formularios) como **Zod en `src/schemas/`**, no `interface`.
- Defectos conocidos de `scripts/init.mjs` (generador "lean"): `data-table.tsx` importa módulos que no copia (rompe `tsc`), y `ci.yml` trae jobs `server-node`/`server-flask` contra carpetas inexistentes. **Por eso se hace copia completa, no `init.mjs`.**

---

## 1. Decisiones

| # | Decisión | Elección | Justificación |
|---|---|---|---|
| D1 | Estrategia | **Template-first**: copiar Inceptor limpio a la raíz del repo y portar features hacia él | Sin usuarios activos ni datos en nube: strangler/híbrido solo añade deuda. Mismo camino que TradePilot |
| D2 | Origen del template | **Copia completa** (rsync) excluyendo `server-*`, `mcp-server/`, `registry.json`, `templates/tauri-*`, `INTEGRATION-PLAN.md`, `ROADMAP.md` | `init.mjs` genera proyectos que no compilan (ver §0). Gallery/docs/demos se conservan como referencia para los agentes; se decide su recorte en Issue 046 |
| D3 | Dónde vive el trabajo | Rama de integración **`inceptor`**; cada issue en `phase-N/issue-NNN-slug` con PR → `inceptor`. **Cutover** a `main` en Issue 030 (fin Fase 3). Después, PRs → `main` | `main` sigue desplegando la app legacy hasta que la nueva tenga paridad del núcleo (catálogo + planner + compras + despensa). Evita semanas de sitio degradado |
| D4 | Enrutado | **Una página Astro por ruta, una isla por página.** `:id` → `getStaticPaths` desde los JSON (50 recetas, 105 ingredientes) ×3 idiomas | Cumple la regla "no app-shell"; da SEO/JSON-LD real (hoy `useSEO` está sin usar); elimina el truco `404.html` de SPA |
| D5 | Estado | Contextos → **nanostores persistentes** (`src/stores/*`) con helper propio `persistentAtom` (localStorage + validación Zod + sync entre pestañas). Context solo intra-isla | Regla Inceptor. Sin dependencia nueva: el helper son ~40 LOC siguiendo `stores/theme.ts` |
| D6 | Datos de catálogo | `public/data/*.json` sigue siendo la fuente única. **Content collections** (`file()` loader) validadas con los Zod schemas para páginas estáticas; **TanStack Query + IDB** (`useCatalog`) para islas que necesitan el catálogo en runtime | Un origen, validado en build (Spec-DD), disponible offline |
| D7 | i18n | Extender `src/i18n` del template a **EN/ES/FR** por ruta (`/`, `/es/`, `/fr/`). Diccionarios desde los `translation.json` actuales, tipados `typeof en`. Islas reciben `lang` por prop. **Se elimina i18next** | Regla del template (sin runtime switch en estáticos). Añade `t()` con interpolación `{{x}}` y plural `_plural` (27 claves lo usan) |
| D8 | Drag & drop | `react-dnd` → **`@dnd-kit/core`** (dependencia justificada, ~10 KB, React 19, teclado accesible) | react-dnd 16 tiene problemas de peers con React 19; el ROADMAP de Inceptor apunta a dnd-kit |
| D9 | Auth | **Firebase Auth se conserva** (email, Google, GitHub) detrás de un contrato `AuthProvider` + `$user`/`$authReady` + `GuardUser`. Config por `PUBLIC_FIREBASE_*`. SDK con import dinámico solo en islas de auth | Proyecto Firebase ya existe; Foodie no usa Firestore. Supabase (camino TradePilot) queda como alternativa documentada en el ADR; el contrato hace el cambio barato |
| D10 | Contribución de recetas | Reconstruir el wizard con `Form` (rhf+zod) + `Stepper`; **envío sin secretos**: descarga del JSON + issue prefilled (`recipe-submission.yml`). Se elimina `@octokit/rest`, el token en localStorage y `VITE_GITHUB_CLIENT_SECRET` | El flujo actual está roto y requiere secretos en cliente. Un backend (archetype `server-node`, `/api/feedback`) puede reactivar PRs automáticos después |
| D11 | Compartir plan | **Por URL** (plan comprimido en query → `/plan/shared`), sin Firestore | Cubre la historia de PR #28 sin backend. Firestore/sync en nube queda diferido |
| D12 | Docs | MkDocs → colección `docs` de Inceptor + Pagefind. Se quita Python del deploy | Un solo toolchain; búsqueda incluida |
| D13 | Marca | Primario **emerald `#10b981`** (idéntico al hue por defecto de Inceptor), acento amber, colores por categoría de alimento como tokens | Rebrand mínimo: tokens en `global.css` + `site-meta.ts` |
| D14 | Diferido | Sync en nube (Firestore), PRs automáticos de recetas, apps Tauri, Kanban/board | Sin usuarios que lo justifiquen |

**Fuera de alcance:** cambiar el hosting (sigue GitHub Pages en `/foodie/`; mover a `artemiop.com/foodie` es solo `SITE_ORIGIN`), rediseño visual de producto (se adopta el kit tal cual), nuevas features no listadas.

---

## 2. Arquitectura destino

```
foodie/                          ← Inceptor en la raíz (repo standalone)
├── .claude/agents/              ← prometeo, forja, centinela (adaptados a Foodie)
├── .claude/checklists/          ← ethics, governance, forbidden-imports
├── docs/                        ← ADRs, superpowers (este plan), recipes
├── public/
│   ├── data/                    ← recipes.json, ingredients.json, beverages.json,
│   │                               categories.json, ingredient-prices.json (fuente única)
│   └── icons/                   ← PWA (regenerados)
├── src/
│   ├── components/
│   │   ├── ui/                  ← kit Inceptor (owned)
│   │   ├── domain/              ← RecipeCard, NutritionFacts, DietaryBadges, IngredientCard…
│   │   ├── islands/             ← RecipeBrowser, RecipeDetailActions, IngredientBrowser,
│   │   │                           MealPlanner, ShoppingList, Pantry, Tracking*, ContributeWizard,
│   │   │                           AuthDialog, AccountMenu, Profile, SharedPlan
│   │   ├── common/              ← Astro compartidos (SiteHeader, FeedbackFAB, LangSwitcher)
│   │   └── pages/               ← cuerpos de página Astro reutilizados por /, /es/, /fr/
│   ├── content.config.ts        ← colecciones recipes/ingredients/beverages/categories/docs
│   ├── i18n/                    ← en.json, es.json, fr.json, index.ts (t, getTranslated, plural)
│   ├── lib/
│   │   ├── auth/                ← contracts.ts, firebase.ts (adapter), guard-user.ts
│   │   ├── catalog/             ← useCatalog (TanStack Query + IDB), selectors
│   │   ├── domain/              ← calculations, unitConversions, nutrition, shopping, plan-share
│   │   ├── persist.ts           ← persistentAtom (localStorage + zod + cross-tab)
│   │   └── …                    ← utils, queryClient, href, flags, report-issue (template)
│   ├── schemas/                 ← Zod: recipe, ingredient, beverage, meal-plan, shopping,
│   │                               pantry, tracking, goals, preferences, recipe-submission
│   ├── stores/                  ← $theme (template), $favorites, $preferences, $planner,
│   │                               $shopping, $pantry, $tracking, $goals, $user
│   ├── layouts/, pages/, styles/, tests/
└── tests/{visual,e2e}/          ← Playwright (visual/a11y del template + journeys Foodie)
```

**Flujo de datos:**

```
Página Astro (build) → getCollection('recipes')  → HTML estático + JSON-LD (×3 idiomas)
Isla React          → useCatalog() (TanStack Query, persist IDB) → withBase('/data/x.json')
Isla React          → useStore($planner) ← persistentAtom ← localStorage (zod-validado)
Isla Auth           → AuthProvider contract → FirebaseAuthAdapter → $user / $authReady → GuardUser
```

### Mapas de migración

**Rutas → páginas** (cada una existe en `/`, `/es/`, `/fr/` vía wrappers finos sobre `components/pages/*`):

| Legacy (react-router) | Astro | Isla | Hidratación |
|---|---|---|---|
| `/` | `pages/index.astro` | — (estático) + `FeaturedRecipes` | `client:visible` |
| `/recipes` | `pages/recipes/index.astro` | `RecipeBrowser` | `client:load` |
| `/recipes/:id` | `pages/recipes/[id].astro` (getStaticPaths) | `RecipeDetailActions` (servings, timer, favorito, añadir a plan) | `client:visible` |
| `/ingredients` | `pages/ingredients/index.astro` | `IngredientBrowser` | `client:load` |
| `/ingredients/:id` | `pages/ingredients/[id].astro` | `IngredientActions` (añadir a despensa/compras) | `client:visible` |
| `/planner` | `pages/planner.astro` | `MealPlanner` | `client:load` |
| `/shopping` | `pages/shopping.astro` | `ShoppingList` | `client:load` |
| `/pantry` | `pages/pantry.astro` | `Pantry` | `client:load` |
| `/tracking` | `pages/tracking/index.astro` | `TrackingToday` | `client:load` |
| `/tracking/goals` | `pages/tracking/goals.astro` | `GoalsForm` | `client:load` |
| `/tracking/progress` | `pages/tracking/progress.astro` | `ProgressDashboard` | `client:load` |
| `/contribute` | `pages/contribute.astro` | `ContributeWizard` | `client:load` |
| `/profile` | `pages/profile.astro` | `Profile` (RouteGuard) | `client:load` |
| (nuevo) | `pages/plan/shared.astro` | `SharedPlan` | `client:load` |
| `*` | `pages/404.astro` (template) | — | — |

**Contextos → stores:**

| Contexto | Store / mecanismo | Clave localStorage (se conserva para migrar datos) |
|---|---|---|
| ThemeContext | `$theme` del template (añadir respeto a `prefers-color-scheme`) | `theme` |
| LanguageContext | ruta + prop `lang`; `getTranslated(text, lang)` en `lib/i18n` | `i18nextLng` → redirección inicial |
| AuthContext | `$user`, `$authReady` + `lib/auth` | `user-preferences-${uid}`, `user-favorites-${uid}` |
| AppContext | `flags.ts` + `$online` + `$installPrompt` del template | — |
| RecipeContext | `useCatalog` + `$favorites` + estado local de filtros (URL state) | `favoriteRecipes` |
| IngredientContext / BeverageContext | `useCatalog` | — |
| TrackingContext | `$tracking` (entries) + `$goals` + selectores puros en `lib/domain/tracking` | `trackingEntries`, `nutritionGoals` |
| PlannerContext | `$planner` (currentPlan, savedPlans) | `currentMealPlan`, `savedMealPlans` |
| ShoppingContext | `$shopping` | `shoppingList` |
| PantryContext | `$pantry` | `pantryItems` |

**Primitivos `common/` → kit:** Button, Input, Card, Badge, Select, Checkbox, RadioGroup, Tabs, Accordion, Skeleton, Spinner → equivalentes 1:1 del kit. `Modal` → `Dialog`/`Sheet`. `Toast` → `toast()` del kit (por fin se usa). `EmptyState` → `empty-state` + `use-listing`. Se descartan `ErrorBoundary` (usa el del template), `OfflineIndicator` (→ `OfflineBanner`), `SkipLink` (BaseLayout ya lo trae), `LoadingState`, `useFocusTrap` (Dialog lo trae).

**Dependencias:**

| Salen | Entran (justificadas) |
|---|---|
| react-router-dom, i18next, react-i18next, i18next-browser-languagedetector, react-dnd, react-dnd-html5-backend, @octokit/rest, vite-plugin-pwa, workbox-window, tailwindcss@3, postcss/autoprefixer, sharp (scripts se archivan), ajv/ajv-cli (Zod), date-fns (sin uso) | `@dnd-kit/core` (+ `@dnd-kit/utilities`), `firebase` (ya presente; solo `firebase/app` + `firebase/auth`, import dinámico), `lz-string` o `fflate` para D11 (elegir en Issue 040; ~2 KB) |

Todo lo demás ya está en el stack de Inceptor (rhf, zod, TanStack, lucide, recharts, motion, nanostores).

---

## 3. Fases

| Fase | Milestone | Entrega | Issues |
|---|---|---|---|
| **0. Fundación** | `v0.1 - Foundation` | Inceptor en la raíz con marca Foodie, base `/foodie`, EN/ES/FR, CI/agentes adaptados, landing. `npm run check` verde en rama `inceptor` | 001–009 |
| **1. Dominio y estado** | `v0.2 - Domain & State` | Zod schemas, colecciones, `persistentAtom`, stores, utils/servicios portados con sus tests, diccionarios trilingües | 010–016 |
| **2. Catálogo** | `v0.3 - Catalog` | Recetas e ingredientes (listado + detalle estático ×3 idiomas), favoritos, SEO, E2E | 017–023 |
| **3. Planificación y compras** | `v0.4 - Planning` | Planner con dnd-kit, compras, despensa, PWA offline. **Cutover a `main`** | 024–030 |
| **4. Tracking** | `v0.5 - Tracking` | Tracking diario, metas, progreso con gráficas | 031–034 |
| **5. Cuentas y contribución** | `v0.6 - Accounts & Contribute` | Firebase Auth via adapter, perfil, wizard de recetas sin secretos, compartir plan por URL, precios (cierra PR #28) | 035–042 |
| **6. Docs, calidad y cierre** | `v1.0 - Foodie on Inceptor` | Docs migradas, CLAUDE.md, presupuestos Lighthouse, recorte de gallery, deps limpias, release | 043–048 |

Dependencias entre fases: nada de UI antes de la Fase 1 (schemas/stores); el cutover exige Fase 3 completa; Fase 5 depende de Fase 3 (planner/compras) para 040/041; Fase 6 al final.

**Esfuerzo:** S = ≤ ½ día de agente, M = 1–2 días, L = 3–5 días. Total: 14 S, 26 M, 8 L ≈ 7–10 semanas de trabajo agente con revisión humana por PR.

**Gates por PR (heredados):** `npm run check` verde · sin imports prohibidos · sin `createContext` cross-isla · tests nuevos por cada isla/store · E2E (`tests/e2e/journeys.spec.ts`) por cada página nueva · ethics checklist por tier · Lighthouse a11y ≥ 0.9, best-practices = 1.0 en páginas tocadas · ADR para `risk:high` (`/auth`, nuevas escrituras de `localStorage`, nuevos fetch cross-origin).

---

## Phase 0 — Fundación

**Goal:** Inceptor viviendo en la raíz del repo con identidad Foodie, base path `/foodie`, i18n trilingüe, CI/CD y agentes adaptados; la app legacy preservada en tag y `main`.

**Milestone:** `v0.1 - Foundation`

**Historias**

| ID | Historia |
|---|---|
| US-0.1 | Como maintainer, quiero que la app legacy quede preservada y desplegada mientras construyo la nueva, para no degradar el sitio público. |
| US-0.2 | Como maintainer, quiero que cada PR pase los gates de Inceptor (check, visual, a11y) desde el primer día. |
| US-0.3 | Como usuario, quiero llegar a `/foodie/`, `/foodie/es/` o `/foodie/fr/` y ver la landing en mi idioma. |
| US-0.4 | Como maintainer, quiero que `prometeo`/`forja`/`centinela` conozcan este plan y el dominio Foodie. |

### Issue 001 — chore: preservar legacy y abrir rama de integración

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:chore
**Branch**: phase-0/issue-001-legacy-tag-integration-branch
**Depends on**: none
**Effort**: S

**Description**
Congela la app legacy y crea la rama `inceptor` donde se integran las Fases 0–3 (D3). Documenta la política de PRs (base `inceptor` hasta Issue 030).

**Acceptance criteria**
- [ ] Tag `legacy-vite-1.0.0` en `main` (`ac89bf1`) y rama `legacy` apuntando al mismo commit, ambos pusheados
- [ ] Rama `inceptor` creada desde `main` y protegida en GitHub (PR requerido, checks `build`, `test`, `type-check`)
- [ ] `CONTRIBUTING.md` (sección temporal) explica: PRs de `phase-N/*` → `inceptor`; `main` sigue desplegando legacy hasta el cutover
- [ ] Labels `phase-0`…`phase-6`, `type:chore|feat|docs|test`, `risk:high` y milestones `v0.1`…`v1.0` creados

**Validation**
```bash
git tag -l 'legacy-*' && git ls-remote --heads origin inceptor legacy
gh label list | grep -c 'phase-' # 7
```

### Issue 002 — chore: copiar Inceptor a la raíz y dejar `npm run check` verde

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:chore
**Branch**: phase-0/issue-002-copy-inceptor
**Depends on**: #001
**Effort**: M

**Description**
Copia completa del template (D2) en la rama `inceptor`, coexistiendo temporalmente con `src/` legacy hasta Issue 008. Como el template también usa `src/`, `public/`, `tests/`, la copia se hace **tras mover** la app legacy a `legacy/` dentro de la rama (solo como referencia de lectura para los agentes; se borra en 008).

**Acceptance criteria**
- [ ] `git mv` de `src tests scripts index.html vite.config.ts vitest.config.ts tailwind.config.js postcss.config.js playwright.config.ts tsconfig*.json eslint.config.js package.json package-lock.json` a `legacy/`; `public/data` y `public/locales` se quedan en `public/`
- [ ] `rsync -a $INCEPTOR/ ./ --exclude .git --exclude node_modules --exclude dist --exclude test-results --exclude server-node --exclude server-flask --exclude docker-compose.yml --exclude mcp-server --exclude registry.json --exclude templates --exclude INTEGRATION-PLAN.md --exclude ROADMAP.md --exclude 'docs/superpowers/*tauri*' --exclude .env`
- [ ] Workflows `tauri-*.yml`, `cd.yml` eliminados; `scripts/add-tauri*.mjs`, `gen:registry`, `vibe-test` eliminados de `package.json`
- [ ] `npm ci && npm run check` verde (astro check 0 errores, vitest verde, build OK)
- [ ] `legacy/` excluido de `tsconfig.json`, `vitest.config.ts`, eslint y de `astro`/Vite (`vite.server.fs` no lo sirve)

**Validation**
```bash
npm run check
npx astro build 2>&1 | grep -c "pages built"
```

### Issue 003 — chore: rebrand Foodie (identidad, base path, tokens, iconos)

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:chore
**Branch**: phase-0/issue-003-rebrand-foodie
**Depends on**: #002
**Effort**: M

**Description**
Aplica la checklist de re-brand del template con la identidad Foodie (D13). Base path `/foodie`, origen `https://artemiopadilla.github.io`.

**Acceptance criteria**
- [ ] `src/lib/site-meta.ts`: nombre "Foodie", tagline "Your Personal Meal Planning Assistant", `SITE_ORIGIN = 'https://artemiopadilla.github.io'`; `site.config.mjs` sincronizado (test existente pasa)
- [ ] `astro.config.mjs`: `site`, `base: process.env.ASTRO_BASE || '/'`; `.env.example` con `PUBLIC_REPO_SLUG=ArtemioPadilla/foodie`; `deploy.yml` con `ASTRO_BASE: ${{ secrets.ASTRO_BASE || '/foodie' }}`
- [ ] `global.css`: primario emerald (`#10b981` / oklch hue 163, ya por defecto), acento amber (`#f59e0b`), tokens `--color-food-{protein,vegetables,fruits,grains,dairy,pantry,spices}` con los hex de `legacy/tailwind.config.js`, modo oscuro verificado con `ux:check`
- [ ] Iconos PWA regenerados desde `legacy/public/icons/icon.svg` a `public/icons/pwa-{192,512,maskable-512}.png`, `favicon.svg/ico`, `apple-touch-icon.png`; OG image real en `public/og-image.png` (1200×630)
- [ ] `public/robots.txt` con Sitemap apuntando a `/foodie/sitemap-index.xml`; `llms.txt.ts` describe Foodie
- [ ] `npm run doctor` sin placeholders de template

**Validation**
```bash
npm run check && npm run doctor
grep -rn "Inceptor\|inceptor" src site.config.mjs astro.config.mjs --include=*.ts --include=*.astro --include=*.mjs | grep -v node_modules | wc -l # 0 (excepto docs/ADRs)
```

### Issue 004 — feat(i18n): base trilingüe EN/ES/FR en el template

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:feat
**Branch**: phase-0/issue-004-i18n-en-es-fr
**Depends on**: #003
**Effort**: M

**Description**
Amplía la infraestructura i18n del template (hoy `'en' | 'es'`) a tres locales (D7). Solo infraestructura; los diccionarios de Foodie llegan en Issue 015.

**Acceptance criteria**
- [ ] `astro.config.mjs` `i18n.locales: ['en','es','fr']`, `prefixDefaultLocale: false`
- [ ] `src/i18n/index.ts`: `Locale = 'en'|'es'|'fr'`, `LOCALES`, `detectLocale` y `localizedPath` con regex `^/(en|es|fr)`; `fr.ts` tipado `typeof en` (placeholder con las claves del template)
- [ ] `BaseLayout.astro` `lang: Locale`, `alternates` hreflang para los tres; `SiteHeader.astro` con `LangSwitcher` (EN/ES/FR) que preserva la ruta actual vía `localizedPath`
- [ ] `FeedbackFAB.astro` tabla `tr` con `fr`
- [ ] Script inline en `BaseLayout` (solo en `/`): si `localStorage.i18nextLng` o `navigator.language` es `es`/`fr` y no hay preferencia explícita, redirige una vez a `/es/` o `/fr/` (persistiendo `foodie:locale`)
- [ ] `src/tests/i18n.test.ts` (paridad de claves ×3) y `route-parity.test.ts` (toda página `/es/` y `/fr/` tiene su raíz) verdes
- [ ] `t()` acepta parámetros: `t(locale, key, { count: 3, time: 30 })` reemplaza `{{count}}`/`{{time}}` y resuelve `key_plural` cuando `count !== 1` (compatibilidad con los 27 usos actuales)

**Validation**
```bash
npm run test -- src/tests/i18n.test.ts src/tests/route-parity.test.ts src/i18n
npm run build && ls dist/es dist/fr
```

### Issue 005 — feat(pages): landing Foodie, navegación y 404 trilingües

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:feat
**Branch**: phase-0/issue-005-landing-nav
**Depends on**: #004
**Effort**: M

**Description**
Sustituye la landing del template por la de Foodie (hero, 6 feature cards del `HomePage.tsx` legacy, CTA a recetas y planner) y define la navegación definitiva. Las secciones aún no migradas enlazan a páginas "coming soon" trilingües para no romper `route-parity`.

**Acceptance criteria**
- [ ] `src/components/pages/Home.astro` + wrappers `pages/index.astro`, `pages/es/index.astro`, `pages/fr/index.astro`
- [ ] `SiteHeader` nav: Home · Recipes · Ingredients · Planner · Shopping · Pantry · Tracking · Contribute (+ ThemeToggle, LangSwitcher, slot para AccountMenu en Fase 5); menú móvil con `Sheet`
- [ ] `SiteFooter` con enlaces a repo/issues/CONTRIBUTING (del `Footer.tsx` legacy), sin `mailto:foodie@example.com`
- [ ] `404.astro` con estilo Foodie y enlaces a home por idioma; se eliminan `public/404.html`, `404-redirect.js`, `spa-redirect.js`, `netlify.toml`, `vercel.json`
- [ ] `tests/visual/smoke.spec.ts` cubre `/`, `/es/`, `/fr/`; `a11y.spec.ts` incluye `/`
- [ ] `tests/e2e/journeys.spec.ts` (nuevo, config `playwright.e2e.config.ts` como TradePilot): landing CTA → `/recipes/` placeholder; switch de idioma mantiene la ruta

**Validation**
```bash
npm run check && npm run build && npx playwright test tests/visual/smoke.spec.ts tests/visual/a11y.spec.ts && npm run test:e2e
```

### Issue 006 — chore(ci): CI/CD de Inceptor adaptado a Foodie

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:chore
**Branch**: phase-0/issue-006-ci-cd
**Depends on**: #002
**Effort**: M

**Description**
Reemplaza los 6 workflows legacy por los del template, sin backends ni Python (D12), manteniendo la validación de recetas.

**Acceptance criteria**
- [ ] `ci.yml`: jobs `build` (`npm run check`) y `actionlint`; **sin** `server-node`/`server-flask`; triggers incluyen `push` a `inceptor` y `phase-*/**` y `pull_request` a `inceptor` y `main`
- [ ] `visual.yml` (Playwright chromium light/dark) en PRs a `inceptor`/`main`; `deploy-failure-issue.yml` activo
- [ ] `deploy.yml`: solo Node 22 + `ASTRO_BASE`; **sin** MkDocs ni `requirements.txt`; se dispara en `push` a `main` (hasta el cutover `main` es legacy, por eso este workflow vive solo en `inceptor` y se activa al mergear en Issue 030)
- [ ] `lighthouse.yml`: `lhci autorun` con `.lighthouserc.json` (a11y ≥ 0.9 error, best-practices error) sobre `dist/`
- [ ] `validate-recipe-pr.yml` reescrito: en PRs que toquen `public/data/*.json`, corre `npm run test -- src/tests/catalog-schema.test.ts` (Issue 011) y comenta el resultado; sin `ajv-cli`
- [ ] `security-scan.yml` legacy eliminado; CodeQL + `dependency-review` conservados en `security.yml`; `dependabot.yml` del template con grupos astro/tanstack/tooling y `firebase`
- [ ] Eliminados: `lighthouse-ci.yml`, `lighthouse-localhost.yml`, `test.yml`, `.lighthouserc.*.json`, `Makefile`, `MAKEFILE.md`, `.actrc`, `mkdocs.yml`, `requirements.txt`, `DOCS_DEPLOYMENT_SETUP.md`

**Validation**
```bash
actionlint .github/workflows/*.yml
npm run test -- src/tests/workflow-hardening.test.ts
```

### Issue 007 — chore(agents): agentes IDD, FeedbackFAB y plantillas apuntando a Foodie

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:chore
**Branch**: phase-0/issue-007-agents-foodie
**Depends on**: #002
**Effort**: S

**Description**
Adapta `.claude/agents/*` para que lean **este** archivo como plan canónico y conozcan el dominio (recetas, planes, `MultiLangText`, stores). Conecta el `FeedbackFAB` al repo.

**Acceptance criteria**
- [ ] `prometeo.md` referencia `docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md` en lugar de `INTEGRATION-PLAN.md`; `forja.md` y `centinela.md` con sección "Contexto Foodie" (schemas en `src/schemas`, stores, `withBase` obligatorio, `lang` por prop, tiers de ethics para `/auth` y escrituras de localStorage)
- [ ] `PUBLIC_REPO_SLUG=ArtemioPadilla/foodie` en `.env.example` y `deploy.yml`; `FeedbackFAB` abre issues en el repo correcto
- [ ] `.github/ISSUE_TEMPLATE/`: los del template + `recipe-submission.yml` (usado en Issue 039) ; `PULL_REQUEST_TEMPLATE.md` del template (Summary / Closes / TDD / ethics)
- [ ] `scripts/create-issues.sh` adaptado para parsear este archivo (mismo esquema `### Issue NNN`) y crear los 48 issues con labels/milestones (dry-run por defecto)
- [ ] `CLAUDE.md` provisional: 1 párrafo de contexto + enlace a este plan (reescritura completa en Issue 044)

**Validation**
```bash
bash scripts/create-issues.sh | grep -c '^### Issue' # 48
npm run test -- src/tests/claude-md.test.ts src/tests/agent-readable.test.ts
```

### Issue 008 — chore: eliminar `legacy/` de la rama `inceptor`

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:chore
**Branch**: phase-0/issue-008-remove-legacy
**Depends on**: #003, #005, #006, #007
**Effort**: S

**Description**
Con la fundación verde, el código legacy deja de ser necesario en la rama (sigue en `main`, tag `legacy-vite-1.0.0` y rama `legacy`). Los agentes consultan legacy por `git show legacy:src/...`.

**Acceptance criteria**
- [ ] `git rm -r legacy/`; también `PHASE*_COMPLETE.md`, `plan.md`, `improvements-plans.md`, `CHANGELOG.md` legacy → movidos a `docs/archive/legacy-vite/` (solo los `.md`)
- [ ] `package.json` sin dependencias legacy (ver §2 "Salen"); `npm ls` sin extraneous
- [ ] `public/data/*.json` y `public/locales/*` permanecen (consumidos en Fase 1)
- [ ] `npm run check` verde; `npm audit --omit=dev` sin high/critical

**Validation**
```bash
test ! -d legacy && npm run check && npm audit --omit=dev
```

### Issue 009 — docs(adr): ADR 0001 estrategia de migración y ADR 0002 stakeholders de datos locales

**Phase**: 0  | **Milestone**: v0.1 - Foundation  | **Labels**: phase-0, type:docs
**Branch**: phase-0/issue-009-adrs
**Depends on**: #002
**Effort**: S

**Description**
Registra D1–D14 como ADR y cubre por adelantado el `risk:high` que disparan las escrituras de `localStorage` de datos de usuario (planes, despensa, tracking) para que `centinela` no bloquee las Fases 1–4.

**Acceptance criteria**
- [ ] `docs/decisions/0001-foodie-inceptor-migration.md` (template `TEMPLATE.md`): decisiones, alternativas (init.mjs, app-shell `client:only`, Supabase), consecuencias
- [ ] `docs/decisions/0002-local-first-user-data.md`: Stakeholder Analysis (usuario, maintainer, terceros), qué se guarda, dónde, retención, exportación/borrado (`Profile` → "Export my data"/"Clear my data", Issue 036), sin PII en claves
- [ ] Ethics checklist tier 2 completada en el PR

**Validation**
```bash
ls docs/decisions/000{1,2}-*.md
```

---

## Phase 1 — Dominio, datos y estado

**Goal:** Todo lo que no es UI queda portado y probado: schemas Zod, colecciones de contenido validadas, helper de persistencia, stores, utilidades de dominio y diccionarios trilingües.

**Milestone:** `v0.2 - Domain & State`

**Historias**

| ID | Historia |
|---|---|
| US-1.1 | Como maintainer, quiero que un JSON de receta inválido rompa el build, no la app en producción. |
| US-1.2 | Como usuario que ya usaba Foodie, quiero conservar mi plan, lista de compras, despensa, favoritos y tracking tras la migración (mismas claves de `localStorage`). |
| US-1.3 | Como usuario, quiero que mis datos sigan igual si tengo dos pestañas abiertas. |
| US-1.4 | Como maintainer, quiero que las 716 claves de traducción existan en los tres idiomas y que falte una sea error de compilación. |

### Issue 010 — feat(schemas): Zod schemas del dominio Foodie

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-010-zod-schemas
**Depends on**: #008
**Effort**: M

**Description**
Convierte `legacy/src/types/index.ts` (379 líneas) en schemas Zod en `src/schemas/` (regla Spec-DD). Los tipos TS se derivan con `z.infer`.

**Acceptance criteria**
- [ ] `src/schemas/{multi-lang-text,recipe,ingredient,beverage,meal-plan,shopping,pantry,tracking,goals,preferences,category}.ts` + `index.ts`; `MultiLangText` = `{ en, es, fr }` requeridos
- [ ] `Recipe` cubre `ingredients[]`, `instructions[]`, `nutrition`, `dietaryLabels`, `variations?`, `tips?`, `equipment`, `rating`, `reviewCount`; `Ingredient` cubre `components?`, `yield?`, `tags`, `alternatives`, `seasonality`, `storageInstructions`
- [ ] Cada schema valida sin errores el JSON real de `public/data/` (test `src/tests/catalog-schema.test.ts` que parsea los 4 archivos completos)
- [ ] `SortOption`, `RecipeFilters` como `z.enum`/`z.object`; `DEFAULT_GOALS` (2000 kcal, 50 g proteína, …) exportado desde `goals.ts`
- [ ] Sin `interface` en `src/schemas`; `src/types/` solo re-exporta `z.infer`

**Validation**
```bash
npm run test -- src/tests/catalog-schema.test.ts src/schemas && npm run type-check
```

### Issue 011 — feat(data): content collections sobre `public/data/*.json`

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-011-content-collections
**Depends on**: #010
**Effort**: M

**Description**
Colecciones `recipes`, `ingredients`, `beverages`, `categories` con loader `file()` apuntando a `public/data/` (D6). `beverages.json` es un array plano; los otros son `{ recipes: [...] }` etc.: usar `parser` del loader.

**Acceptance criteria**
- [ ] `src/content.config.ts` define las 4 colecciones con `schema` = Zod de Issue 010 (`categories` con `mealTypes`, `cuisines`, `dietaryTags`, `ingredientCategories`)
- [ ] `getCollection('recipes')` devuelve 50; `ingredients` 105; `beverages` 39 (test)
- [ ] `public/data/config.json` eliminado (AppContext hardcodeaba lo mismo); `legacy scripts` de seed archivados en `docs/archive/legacy-vite/scripts/` (no ejecutables)
- [ ] `scripts/check-duplicates.mjs` (port de `checkDuplicates.js`) integrado en `catalog-schema.test.ts`
- [ ] Documentado en `docs/recipes/catalog-data.md`: cómo añadir una receta (JSON → PR → `validate-recipe-pr.yml`)

**Validation**
```bash
npm run test -- src/tests/catalog-schema.test.ts && npm run build
```

### Issue 012 — feat(lib): `persistentAtom` con validación Zod y sync entre pestañas

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-012-persistent-atom
**Depends on**: #010
**Effort**: M

**Description**
Helper `persistentAtom<T>(key, schema, fallback)` en `src/lib/persist.ts`, siguiendo `stores/theme.ts` (`onMount` guardado por `typeof window`, `storage` event). Es la base de todos los stores de la Fase 1 (D5). TDD tier `strict`.

**Acceptance criteria**
- [ ] Lee `localStorage[key]`, `schema.safeParse`; si falla, usa `fallback` y registra vía `report-issue` (sin lanzar); escribe con `JSON.stringify` en cada `set`
- [ ] Sync cross-tab con `storage` event; cuota excedida capturada (`QuotaExceededError`) → `toast` de aviso vía callback opcional
- [ ] `migrate?: (raw: unknown) => T` opcional para claves legacy con forma distinta
- [ ] Sin `React.createContext`; sin dependencia nueva
- [ ] Tests: hidratación, parse inválido, cross-tab, quota, SSR (sin `window`)

**Validation**
```bash
npm run test -- src/lib/persist.test.ts
git log --format=%s | grep -c '^test(lib): red' # ≥1 (TDD strict)
```

### Issue 013 — feat(stores): stores persistentes del dominio

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-013-domain-stores
**Depends on**: #012
**Effort**: L

**Description**
Porta la lógica de los contextos `Recipe(favoritos)`, `Planner`, `Shopping`, `Pantry`, `Tracking` a nanostores + funciones puras (mapa en §2). Conserva las **mismas claves** de `localStorage` (US-1.2).

**Acceptance criteria**
- [ ] `src/stores/favorites.ts` (`favoriteRecipes`), `preferences.ts` (unitSystem, dietary, tema respetando `prefers-color-scheme` la primera vez), `planner.ts` (`currentMealPlan`, `savedMealPlans` — `PlanTemplates` deja de escribir localStorage directo), `shopping.ts` (`shoppingList`), `pantry.ts` (`pantryItems`), `tracking.ts` (`trackingEntries`), `goals.ts` (`nutritionGoals`)
- [ ] Acciones como funciones exportadas (`addRecipeToPlan`, `generateFromPlan`, `logEntry`, `duplicateDay`, `adjustGlobalServings`, …) sin React; selectores derivados con `computed` (`$todayEntries`, `$todayTotals`, `$todayProgress`)
- [ ] Deduplicación: `aggregateNutrition`/`getToday` de `TrackingContext` se sustituyen por `lib/domain/nutrition` y `lib/format-date`
- [ ] Tests portados de `BeverageContext.test.tsx` (25) y `TrackingContext.test.tsx` (23) a tests de store; cobertura de cada acción de planner/shopping/pantry
- [ ] `docs/recipes/state.md`: cómo consumir un store desde una isla (`useStore`) y por qué no Context

**Validation**
```bash
npm run test -- src/stores && npm run type-check
grep -rn "createContext" src/stores | wc -l # 0
```

### Issue 014 — feat(lib): port de utilidades y servicios puros con sus tests

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-014-domain-lib
**Depends on**: #010
**Effort**: M

**Description**
Mueve a `src/lib/domain/` el código sin UI: `calculations`, `unitConversions`, `nutritionCalculator`, `shoppingService`, `recipeTransform`, `validation` (reescrito sobre Zod), `dateUtils` (lo que no cubra `lib/format-date`). Trae sus ~230 tests.

**Acceptance criteria**
- [ ] Módulos en `src/lib/domain/{calculations,units,nutrition,shopping,recipe-transform,date}.ts`; `recipe-transform` y `validation` ya no importan de componentes (`RecipeFormData` vive en `src/schemas/recipe-submission.ts`)
- [ ] `validationService` → `recipeSubmissionSchema.safeParse` + `getValidationSummary`; tests de `validationService.test.ts` (7) adaptados
- [ ] Tests portados: calculations 26, cn 12 (usa `lib/utils`), dateUtils 56, nutritionCalculator 35, unitConversions 32, shoppingService 37 → todos verdes
- [ ] `useUnitConversion` → `src/lib/domain/use-unit-conversion.ts` leyendo `$preferences` (no `useAuth`)
- [ ] Mapa hardcodeado ingrediente→categoría de `shoppingService` reemplazado por `categories` collection + `ingredient.category`

**Validation**
```bash
npm run test -- src/lib/domain
```

### Issue 015 — feat(i18n): diccionarios Foodie EN/ES/FR y `getTranslated`

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-015-dictionaries
**Depends on**: #004
**Effort**: M

**Description**
Convierte `public/locales/{en,es,fr}/translation.json` (716 claves, 29 grupos) en `src/i18n/{en,es,fr}.json` fusionados con las claves del template; `es`/`fr` tipados contra `en`. Elimina i18next definitivamente (D7).

**Acceptance criteria**
- [ ] `src/i18n/en.json` fuente de verdad; `index.ts` exporta `es`/`fr` con `satisfies Dictionary`; una clave faltante es error de `tsc`
- [ ] `getTranslated(text: MultiLangText, lang: Locale)` en `src/i18n/index.ts` con fallback a `en`
- [ ] `scripts/validateTranslationSync.js` → `src/tests/i18n.test.ts` (paridad, sin duplicados, sin valores vacíos, mismos placeholders `{{x}}` en los 3 idiomas)
- [ ] `public/locales/` eliminado; `tests/unit/i18n.test.ts` (13) y `translationSchema.test.ts` (19) portados
- [ ] Guía `docs/recipes/i18n-islands.md`: `lang` por prop, `t(lang, key, params)`, `getTranslated`, nunca leer `navigator.language` en render

**Validation**
```bash
npm run test -- src/tests/i18n.test.ts src/i18n && npm run type-check
test ! -d public/locales
```

### Issue 016 — feat(catalog): `useCatalog` (TanStack Query + IDB) para islas

**Phase**: 1  | **Milestone**: v0.2 - Domain & State  | **Labels**: phase-1, type:feat
**Branch**: phase-1/issue-016-use-catalog
**Depends on**: #011
**Effort**: S

**Description**
Hook `useCatalog()` → `{ recipes, ingredients, beverages, categories, status }` sobre `QueryProvider` del template con `meta.persist: true`, fetch a `withBase('/data/x.json')` y parse Zod. Sustituye a `RecipeContext`/`IngredientContext`/`BeverageContext` en runtime (D6). Corrige el fetch hardcodeado `/foodie/data/beverages.json`.

**Acceptance criteria**
- [ ] `src/lib/catalog/use-catalog.ts` + selectores `getRecipeById`, `getIngredientName(id, lang)`, `searchRecipes(q, lang)`, `filterRecipes(filters)`, `sortRecipes(sortBy)` puros en `selectors.ts`
- [ ] Persistencia IDB (24 h) verificada en test con persister en memoria; estado `offline` devuelve caché
- [ ] Tests jsdom: carga, error de red con caché, parse inválido → `error`

**Validation**
```bash
npm run test -- src/lib/catalog
```

---

## Phase 2 — Catálogo

**Goal:** Recetas e ingredientes navegables en los tres idiomas con páginas estáticas indexables, favoritos y E2E.

**Milestone:** `v0.3 - Catalog`

**Historias**

| ID | Historia |
|---|---|
| US-2.1 | Como usuario, quiero buscar y filtrar recetas por tipo de comida, cocina, dieta, tiempo y dificultad, y ordenarlas. |
| US-2.2 | Como usuario, quiero ver el detalle de una receta (ingredientes, pasos, nutrición, tips), escalar porciones y usar un temporizador. |
| US-2.3 | Como usuario, quiero explorar ingredientes, ver sus alternativas y estacionalidad, y qué recetas los usan. |
| US-2.4 | Como usuario, quiero marcar favoritos y encontrarlos rápido. |
| US-2.5 | Como usuario que llega desde Google, quiero que la receta esté indexada en mi idioma con datos estructurados. |

### Issue 017 — feat(recipes): página `/recipes` con isla `RecipeBrowser`

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:feat
**Branch**: phase-2/issue-017-recipe-browser
**Depends on**: #013, #014, #015, #016
**Effort**: L

**Description**
Port de `RecipesPage` (235 líneas) + `RecipeFilters`, `RecipeSorter`, `RecipeGrid`/`RecipeList`, `RecipeCard`, `Skeleton`, `EmptyState` sobre el kit (`Input`, `Accordion`, `Checkbox`, `Select`, `Badge`, `empty-state`, `use-listing`). Filtros en URL (`use-data-table-url-state` o `URLSearchParams`).

**Acceptance criteria**
- [ ] `pages/recipes/index.astro` (+ `es/`, `fr/`) monta `<RecipeBrowser lang client:load />`
- [ ] Búsqueda en `name`/`description` del idioma actual con fallback EN; filtros: mealType, cuisines[], dietaryTags[], maxTime, difficulty, solo favoritos; orden: rating, tiempo, coste, nombre; contador de filtros activos y "limpiar"
- [ ] Estados `loading` (Skeleton), `empty-zero`, `empty-filtered`, `error` vía `use-listing`
- [ ] Vista grid/lista, `RecipeCard` en `components/domain/` con imagen `loading="lazy"`, badges dietéticos, tiempo, dificultad, rating
- [ ] Componentes de dominio registrados en `src/content/gallery.ts`
- [ ] Tests jsdom de `RecipeBrowser` (filtros, orden, búsqueda, URL state) y port de `RecipeCard.test.tsx` (6)

**Validation**
```bash
npm run check && npm run test -- src/components/islands/RecipeBrowser src/components/domain
```

### Issue 018 — feat(recipes): detalle estático `/recipes/[id]` ×3 idiomas con JSON-LD

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:feat
**Branch**: phase-2/issue-018-recipe-detail
**Depends on**: #017
**Effort**: L

**Description**
Port de `RecipeDetailPage` (264) + `RecipeIngredients`, `RecipeInstructions`, `RecipeNutrition`, `RecipeTimer`, `ServingsAdjuster`. Página estática por receta e idioma (`getStaticPaths` → 150 páginas) con `Recipe` JSON-LD (rescata `generateRecipeStructuredData` de `legacy/src/utils/seo.tsx`).

**Acceptance criteria**
- [ ] `pages/recipes/[id].astro` (+ `es/`, `fr/`) con `getStaticPaths` desde `getCollection('recipes')`; `title`/`description`/OG/hreflang por idioma; `jsonLd` Recipe (name, image, totalTime, recipeYield, nutrition, recipeIngredient, recipeInstructions)
- [ ] Isla `RecipeDetailActions` (`client:visible`): escalado de porciones (re-renderiza cantidades con `formatQuantity`/unidades del usuario), temporizador por paso (`Dialog` + notificación), favorito (`$favorites`), "Añadir al plan" (abre `Dialog` con día/comida → `$planner`) y "Añadir ingredientes a compras" (`$shopping`)
- [ ] Nutrición con `NutritionFacts` (tabla accesible) y valores por porción escalada
- [ ] Recetas relacionadas (misma cocina/tipo) estáticas
- [ ] `tests/visual/a11y.spec.ts` incluye un detalle; test de `getStaticPaths` (150 rutas)

**Validation**
```bash
npm run build && ls dist/recipes | wc -l && ls dist/fr/recipes | wc -l
npx playwright test tests/visual/a11y.spec.ts
```

### Issue 019 — feat(ingredients): `/ingredients` e `/ingredients/[id]`

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:feat
**Branch**: phase-2/issue-019-ingredients
**Depends on**: #017
**Effort**: M

**Description**
Port de `IngredientsPage` (377), `IngredientDetailPage` (167), `IngredientCard`, `IngredientDetail`. Listado por categoría con búsqueda; detalle estático ×3 con composición (`components`), alternativas, estacionalidad, almacenamiento y recetas que lo usan.

**Acceptance criteria**
- [ ] `pages/ingredients/index.astro` (+es/fr) con isla `IngredientBrowser` (`client:load`): búsqueda, filtro por categoría (`categories.ingredientCategories`) y por tags dietéticos, agrupación por categoría con color de token
- [ ] `pages/ingredients/[id].astro` (+es/fr) estático: 315 páginas; sección "Recetas con este ingrediente" calculada en build
- [ ] Isla `IngredientActions`: añadir a despensa (`$pantry`) y a compras (`$shopping`)
- [ ] Tests jsdom del browser; visual snapshot del detalle

**Validation**
```bash
npm run check && npm run build && ls dist/ingredients | wc -l
```

### Issue 020 — feat(favorites): favoritos transversales

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:feat
**Branch**: phase-2/issue-020-favorites
**Depends on**: #017
**Effort**: S

**Description**
`FavoriteButton` reutilizable (`$favorites`), filtro "solo favoritos" en `RecipeBrowser`, sección "Tus favoritos" en la landing (`client:visible`), contador en header opcional.

**Acceptance criteria**
- [ ] `components/domain/FavoriteButton.tsx` con `aria-pressed`, `toast` al añadir/quitar
- [ ] Persistencia bajo `favoriteRecipes` (misma clave legacy) verificada con datos legacy de ejemplo
- [ ] E2E: marcar favorito en detalle → aparece filtrado en `/recipes/?favorites=1`

**Validation**
```bash
npm run test -- src/components/domain/FavoriteButton && npm run test:e2e
```

### Issue 021 — feat(ui): componentes de dominio en la gallery y `ux:check`

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:feat
**Branch**: phase-2/issue-021-domain-gallery
**Depends on**: #018, #019
**Effort**: M

**Description**
Consolida `RecipeCard`, `IngredientCard`, `NutritionFacts`, `DietaryBadges`, `DifficultyBadge`, `TimeBadge`, `CategoryChip` como componentes documentados (props, ejemplos light/dark) en `src/content/gallery.ts` y `docs/component-guidelines/foodie.md`.

**Acceptance criteria**
- [ ] Cada componente en la gallery con ejemplo y snippet; `npm run ux:check` (contraste/motion) verde en los colores por categoría
- [ ] Sin `React.FC`/`forwardRef` innecesarios (React 19); sin estilos `.btn-*`/`.card` globales del legacy (todo por kit)
- [ ] Tests unitarios de `NutritionFacts` (redondeo, escala) y `DietaryBadges` (orden, i18n)

**Validation**
```bash
npm run check && npm run ux:check
```

### Issue 022 — feat(seo): sitemap, hreflang, OG, robots

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:feat
**Branch**: phase-2/issue-022-seo
**Depends on**: #018, #019
**Effort**: S

**Description**
Activa lo que el template ya trae (`@astrojs/sitemap`, canonical, OG) para las nuevas rutas trilingües y corrige lo roto del legacy (OG image inexistente, favicon sin base).

**Acceptance criteria**
- [ ] `sitemap-index.xml` con las ~500 URLs y `xhtml:link` alternates por idioma
- [ ] `og-image` por defecto + por receta si tiene `imageUrl`; `twitter:card`
- [ ] Lighthouse SEO ≥ 0.95 en `/`, `/recipes/`, un detalle
- [ ] `src/tests/seo.test.ts`: cada página tiene `title` único, `description`, canonical con base

**Validation**
```bash
npm run build && npm run lighthouse
```

### Issue 023 — test(e2e): journeys de catálogo y a11y

**Phase**: 2  | **Milestone**: v0.3 - Catalog  | **Labels**: phase-2, type:test
**Branch**: phase-2/issue-023-e2e-catalog
**Depends on**: #018, #019, #020
**Effort**: M

**Description**
Reescribe `recipe-browsing.spec.ts` (8) y la parte de catálogo de `translations.spec.ts` como journeys en `tests/e2e/journeys.spec.ts` con `baseURL` correcto (raíz del defecto legacy) y selectores accesibles.

**Acceptance criteria**
- [ ] Journeys: home → recetas → buscar "salad" → filtrar tipo → abrir detalle → escalar porciones (cantidades cambian) → cambiar idioma (URL `/es/recipes/<id>/`, texto en español) → ingredientes → detalle
- [ ] "No hay claves de traducción crudas" en `/`, `/recipes/`, `/ingredients/` en los 3 idiomas (port de `translations.spec.ts` sin la aserción de red)
- [ ] `a11y.spec.ts` cubre `/recipes/`, `/ingredients/` y un detalle en light/dark; `keyboard-nav.spec.ts` recorre filtros
- [ ] Todo verde en CI (`visual.yml` + `npm run test:e2e`)

**Validation**
```bash
npm run build && npm run test:e2e && npx playwright test tests/visual
```

---

## Phase 3 — Planificación y compras → cutover

**Goal:** Planner, lista de compras y despensa con paridad funcional, PWA offline verificado, y **la nueva app desplegada en `/foodie/` desde `main`**.

**Milestone:** `v0.4 - Planning`

**Historias**

| ID | Historia |
|---|---|
| US-3.1 | Como usuario, quiero arrastrar recetas a los huecos de la semana (o elegirlas con un selector si uso teclado/móvil), ver el mes y ajustar porciones. |
| US-3.2 | Como usuario, quiero guardar plantillas de plan, duplicar un día y ver el resumen nutricional y de coste del plan. |
| US-3.3 | Como usuario, quiero generar la lista de compras desde el plan, con ingredientes consolidados por categoría, marcar, anotar, añadir ítems propios y exportar (texto, CSV, WhatsApp, imprimir). |
| US-3.4 | Como usuario, quiero llevar mi despensa, ver qué caduca y qué recetas puedo hacer con lo que tengo. |
| US-3.5 | Como usuario, quiero que la app funcione sin conexión y sea instalable. |
| US-3.6 | Como maintainer, quiero publicar la nueva app en `/foodie/` sin perder los datos locales de los usuarios existentes. |

### Issue 024 — feat(planner): isla `MealPlanner` con `@dnd-kit`

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:feat, risk:high
**Branch**: phase-3/issue-024-meal-planner-dnd
**Depends on**: #013, #016
**Effort**: L

**Description**
Port de `MealPlannerCalendar`, `WeekView`, `MonthView`, `DayMealSlot`, `DraggableRecipe`, `DroppableSlot`, `ServingsAdjuster`, `PlannerControls` (1.771 líneas) sobre `@dnd-kit/core` (D8) y `$planner`. `risk:high` por escritura de datos de usuario (cubierto por ADR 0002).

**Acceptance criteria**
- [ ] `npm i @dnd-kit/core @dnd-kit/utilities`; ADR `docs/decisions/0010-dnd-kit.md` justificando la dependencia (cierra la lista del stack)
- [ ] `DndContext` con sensores `Pointer` + `Keyboard` (anuncios `aria-live`); arrastrar receta desde panel lateral a slot (desayuno/comida/cena/snack) por día; mover entre slots; quitar
- [ ] `Tabs` semana/mes (`data-testid="week-view"`/`"month-view"` conservados); navegación de semanas; porciones globales y por comida; duplicar día; crear/limpiar plan
- [ ] Fallback sin drag: botón "+" en slot abre `RecipePicker` (Issue 025)
- [ ] Tests jsdom de acciones y de la integración con `$planner`; test de teclado (mover con flechas + Enter)

**Validation**
```bash
npm run check && npm run test -- src/components/islands/MealPlanner
grep -rn "react-dnd" src package.json | wc -l # 0
```

### Issue 025 — feat(planner): `RecipePicker`, plantillas y resumen del plan

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:feat
**Branch**: phase-3/issue-025-picker-templates-summary
**Depends on**: #024
**Effort**: M

**Description**
Port de `RecipePickerModal`, `PlanTemplates`, `PlanSummary` sobre `Dialog` + `Combobox`/búsqueda, `Card`, `kpi-card`.

**Acceptance criteria**
- [ ] `RecipePicker` (`Dialog`): búsqueda/filtro rápido, vista previa, "Añadir" al slot activo; accesible por teclado
- [ ] Plantillas: guardar plan actual con nombre, cargar, borrar (`savedMealPlans`), confirmación con `alert-dialog`
- [ ] `PlanSummary`: recetas totales, coste estimado (`calculateMealPlanCost`), nutrición diaria media vs `$goals`, con `metric`/`meter`
- [ ] Tests jsdom

**Validation**
```bash
npm run test -- src/components/islands/MealPlanner src/components/islands/RecipePicker
```

### Issue 026 — feat(shopping): isla `ShoppingList` con ítems propios y exportación

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:feat, risk:high
**Branch**: phase-3/issue-026-shopping-list
**Depends on**: #014, #025
**Effort**: L

**Description**
Port de `ShoppingList`, `ShoppingListItem`, `CategoryGroup`, `ListControls` (959 líneas) + `AddItemModal` de PR #28 (ítems custom con categoría). Lógica en `lib/domain/shopping` (ya portada).

**Acceptance criteria**
- [ ] Generar desde plan actual (consolida cantidades con `convertToBaseUnit`), agrupar por categoría (color de token), marcar/desmarcar, cantidad, notas, borrar marcados, vaciar
- [ ] `AddItemModal` (`Dialog` + `Form` rhf+zod `customShoppingItemSchema`): nombre, cantidad, unidad, categoría; IDs `custom-*` (`ingredientUtils` de PR #28)
- [ ] Exportar: texto plano, CSV (`download-trigger`), WhatsApp (`wa.me`), imprimir (`@media print`); copiar al portapapeles (`clipboard`)
- [ ] Unidades según `$preferences.unitSystem`
- [ ] Tests jsdom; port de las aserciones de `shopping-list.spec.ts` (3) a journeys

**Validation**
```bash
npm run check && npm run test -- src/components/islands/ShoppingList && npm run test:e2e
```

### Issue 027 — feat(pantry): isla `Pantry`

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:feat, risk:high
**Branch**: phase-3/issue-027-pantry
**Depends on**: #016, #013
**Effort**: M

**Description**
Port de `pantry/*` (5 componentes, 1.023 líneas): inventario con cantidades/unidades/caducidad, "caduca en N días", bajo stock, sugerencias de recetas según despensa.

**Acceptance criteria**
- [ ] CRUD de ítems (`Form` rhf+zod `pantryItemSchema`, `date-picker` para caducidad), búsqueda, filtro por categoría, orden por caducidad
- [ ] Bloques "Caduca pronto" (`callout` warning) y "Bajo stock"; acción "añadir a compras"
- [ ] "Qué puedo cocinar": recetas ordenadas por % de ingredientes disponibles (selector puro con test)
- [ ] Tests jsdom + journey

**Validation**
```bash
npm run test -- src/components/islands/Pantry src/lib/domain/pantry
```

### Issue 028 — feat(pwa): manifest Foodie, caché de datos y UI offline

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:feat
**Branch**: phase-3/issue-028-pwa
**Depends on**: #003, #016
**Effort**: S

**Description**
Configura el bloque `AstroPWA` existente para Foodie (D6/US-3.5) y elimina cualquier registro manual de SW.

**Acceptance criteria**
- [ ] Manifest: `name "Foodie - Meal Planner"`, `short_name "Foodie"`, `theme_color #10b981`, `background_color` acorde al fondo, `display standalone`, `start_url`/`scope` = base, iconos 192/512/maskable
- [ ] Workbox: `runtimeCaching` para `/data/*.json` **NetworkFirst** (7 días, timeout 10 s) y Google Fonts CacheFirst; `navigateFallback` base; `navigateFallbackDenylist` mantiene `/api/`
- [ ] `InstallButton`, `UpdateToast`, `OfflineBanner` activos (`flags.pwaPrompts`)
- [ ] `src/tests/pwa-config.test.ts` actualizado; prueba manual documentada en `docs/runbooks/pwa-offline.md` (Lighthouse "installable", modo avión: `/recipes/` y `/planner/` funcionan)

**Validation**
```bash
npm run test -- src/tests/pwa-config.test.ts && npm run build && ls dist/sw.js dist/manifest.webmanifest
```

### Issue 029 — test(e2e): journeys de planner, compras y despensa + visual

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:test
**Branch**: phase-3/issue-029-e2e-planning
**Depends on**: #025, #026, #027
**Effort**: M

**Description**
Cubre US-3.1–3.4 de extremo a extremo y fija baselines visuales de las tres páginas en light/dark.

**Acceptance criteria**
- [ ] Journeys: crear plan → añadir receta con picker → arrastrar (pointer) → cambiar porciones → generar compras → marcar ítem → añadir ítem propio → exportar CSV (descarga) → añadir a despensa → "qué puedo cocinar" muestra la receta
- [ ] Persistencia: recargar mantiene plan/lista/despensa (localStorage)
- [ ] Snapshots `tests/__screenshots__` para `/planner/`, `/shopping/`, `/pantry/`
- [ ] `visual.yml` deja de ser `continue-on-error` para este repo

**Validation**
```bash
npm run build && npm run test:e2e && npx playwright test tests/visual
```

### Issue 030 — chore(release): CUTOVER `inceptor` → `main` y despliegue en `/foodie/`

**Phase**: 3  | **Milestone**: v0.4 - Planning  | **Labels**: phase-3, type:chore, risk:high
**Branch**: (PR directo `inceptor` → `main`)
**Depends on**: #023, #028, #029
**Effort**: M

**Description**
Publica la nueva app (US-3.6). A partir de aquí las ramas `phase-N/*` abren PR contra `main`. Requiere revisión humana explícita.

**Acceptance criteria**
- [ ] Checklist previa en el PR: `npm run check`, `test:e2e`, `visual`, `lighthouse` verdes; `npm audit --omit=dev` sin high; ADR 0001/0002 mergeados; README con aviso "v2 en Inceptor"
- [ ] Merge (merge commit, no squash) de `inceptor` en `main`; `deploy.yml` corre y publica en `https://artemiopadilla.github.io/foodie/`
- [ ] Smoke en producción: `/foodie/`, `/foodie/es/recipes/`, `/foodie/fr/planner/`, detalle de receta, manifest instalable, SW registrado; `deploy-failure-issue.yml` sin issue abierto
- [ ] Datos legacy: abrir la app con `localStorage` de la v1 (fixture exportada del legacy) conserva plan, compras, despensa, favoritos y tracking (validación manual documentada)
- [ ] Redirecciones para URLs v1 con query `?/recipes/…` (formato del truco 404) → `404.astro` interpreta `?/path` y redirige una vez a la ruta nueva
- [ ] Tag `v2.0.0-beta.1`; `CHANGELOG.md` nuevo; rama `inceptor` eliminada; `CONTRIBUTING.md` actualizado (PRs → `main`)

**Validation**
```bash
curl -sI https://artemiopadilla.github.io/foodie/ | head -1
curl -s https://artemiopadilla.github.io/foodie/manifest.webmanifest | jq .name
```

---

## Phase 4 — Tracking nutricional

**Goal:** Paridad del módulo de tracking (hoy el más grande: `TrackingContext` 528 líneas, `TrackingPage` 427) con mejoras de visualización.

**Milestone:** `v0.5 - Tracking`

**Historias**

| ID | Historia |
|---|---|
| US-4.1 | Como usuario, quiero registrar lo que comí hoy (receta, ingrediente, bebida o agua) en segundos y ver mi progreso contra mis metas. |
| US-4.2 | Como usuario, quiero definir mis metas de calorías y macros y restablecer los valores por defecto. |
| US-4.3 | Como usuario, quiero ver mi racha, mi media semanal/mensual y mis comidas más registradas, con gráficas. |

### Issue 031 — feat(tracking): isla `TrackingToday` con `QuickAdd`

**Phase**: 4  | **Milestone**: v0.5 - Tracking  | **Labels**: phase-4, type:feat, risk:high
**Branch**: phase-4/issue-031-tracking-today
**Depends on**: #030, #013, #016
**Effort**: L

**Description**
Port de `TrackingPage`, `QuickAddModal` y tabs `RecipeTab`/`IngredientTab`/`BeverageTab` (+ agua) sobre `$tracking`, `$goals`, `useCatalog`, `Dialog`, `Tabs`, `number-field`, `progress-bar`.

**Acceptance criteria**
- [ ] Vista del día: entradas por comida, totales (kcal, proteína, carbohidratos, grasa, fibra, azúcar, sodio) y progreso vs metas con `meter`; navegación por fecha
- [ ] `QuickAdd` (`Dialog` + `Tabs`): receta (porciones), ingrediente (cantidad/unidad → `estimateIngredientNutrition`), bebida (catálogo 39 + tamaño), agua (vasos); búsqueda con `getTranslated`
- [ ] Editar cantidad, duplicar a otro día, borrar (con `alert-dialog`)
- [ ] Tests: port de `TrackingPage.test.tsx` (19) y `QuickAddModal.test.tsx` (14)

**Validation**
```bash
npm run check && npm run test -- src/components/islands/Tracking
```

### Issue 032 — feat(tracking): `/tracking/goals` con `Form`

**Phase**: 4  | **Milestone**: v0.5 - Tracking  | **Labels**: phase-4, type:feat
**Branch**: phase-4/issue-032-goals
**Depends on**: #031
**Effort**: M

**Description**
Port de `GoalsPage` (135) con `Form` (rhf + `nutritionGoalsSchema`), validación de rangos, presets (mantenimiento/déficit/superávit) y "restablecer por defecto".

**Acceptance criteria**
- [ ] Formulario accesible con `number-field` por macro, errores inline, `toast` al guardar; `$goals` persistido en `nutritionGoals`
- [ ] Vista previa del reparto de macros (`donut` chart del kit)
- [ ] Tests: port de `GoalsPage.test.tsx` (19)

**Validation**
```bash
npm run test -- src/components/islands/GoalsForm
```

### Issue 033 — feat(tracking): `/tracking/progress` con gráficas

**Phase**: 4  | **Milestone**: v0.5 - Tracking  | **Labels**: phase-4, type:feat
**Branch**: phase-4/issue-033-progress-charts
**Depends on**: #031
**Effort**: M

**Description**
Port de `ProgressPage` (159, hoy solo texto) añadiendo los wrappers Recharts del kit: barras de calorías por día (semana/mes), línea de tendencia, `sparkline` por macro, `kpi-card` de racha/media/comida más registrada.

**Acceptance criteria**
- [ ] Selector semana/mes; `getDailySummaries`/`getWeeklySummary`/`getMonthlySummary` como selectores puros con tests
- [ ] Gráficas con paleta del kit (`chart-colors`), accesibles (tabla alternativa `sr-only`), `client:visible`
- [ ] Tests: port de `ProgressPage.test.tsx` (20) + tests de selectores

**Validation**
```bash
npm run test -- src/components/islands/ProgressDashboard src/lib/domain/tracking && npm run ux:check
```

### Issue 034 — test(e2e): journeys de tracking y cierre de paridad de tests

**Phase**: 4  | **Milestone**: v0.5 - Tracking  | **Labels**: phase-4, type:test
**Branch**: phase-4/issue-034-e2e-tracking
**Depends on**: #032, #033
**Effort**: M

**Description**
Journeys de US-4.x y verificación de que el conteo de tests portados ≥ 363 (legacy) más los nuevos.

**Acceptance criteria**
- [ ] Journeys: registrar receta → progreso actualizado → definir metas → progreso recalculado → ver gráficas en `/tracking/progress/`; persistencia tras recarga
- [ ] Tabla en el PR: test legacy → test nuevo (todas las suites de `legacy/tests` mapeadas o justificadas)
- [ ] Vitest total ≥ 400; `a11y.spec.ts` incluye las 3 páginas de tracking

**Validation**
```bash
npm run test -- --reporter=dot 2>&1 | tail -3 && npm run test:e2e
```

---

## Phase 5 — Cuentas y contribución

**Goal:** Identidad (Firebase Auth vía adapter), perfil y preferencias, wizard de contribución sin secretos, y las historias pendientes de PR #28 (compartir plan, precios).

**Milestone:** `v0.6 - Accounts & Contribute`

**Historias**

| ID | Historia |
|---|---|
| US-5.1 | Como usuario, quiero iniciar sesión (email, Google, GitHub) para tener perfil y preferencias propias. |
| US-5.2 | Como usuario, quiero elegir sistema de unidades, restricciones dietéticas y nombre/avatar, y poder exportar o borrar mis datos. |
| US-5.3 | Como contribuidor, quiero enviar una receta con un asistente paso a paso y que llegue al maintainer sin configurar tokens. |
| US-5.4 | Como usuario, quiero compartir mi plan semanal con un enlace. |
| US-5.5 | Como usuario, quiero ajustar precios de ingredientes para que el coste del plan refleje mi realidad. |

### Issue 035 — feat(auth): contrato `AuthProvider`, adapter Firebase y `$user`

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat, risk:high
**Branch**: phase-5/issue-035-auth-adapter
**Depends on**: #030
**Effort**: L

**Description**
Sigue `docs/recipes/auth-supabase.md` del template con Firebase (D9). Contrato en `src/lib/auth/contracts.ts`; implementación `firebase.ts` con `import()` dinámico de `firebase/app` + `firebase/auth`; config desde `PUBLIC_FIREBASE_*` (adiós hardcode). Ruta `/auth` dispara `risk:high` → ADR 0004 (stakeholders, proveedor, datos que salen del dispositivo).

**Acceptance criteria**
- [ ] `contracts.ts`: `AuthProvider { signInEmail, signUpEmail, signInGoogle, signInGitHub, signOut, resetPassword, onSession(cb) }`, `AuthUser` (Zod); `firebase.ts` implementa; `mock.ts` para tests/dev sin credenciales (`authEnabled` false si faltan env)
- [ ] `src/stores/user.ts`: `$user`, `$authReady`; `toGuardUser()` para `RouteGuard`
- [ ] `.env.example` con `PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,APP_ID}`; `deploy.yml` los inyecta desde secrets; sin `VITE_GITHUB_CLIENT_SECRET`
- [ ] CSP (meta en `BaseLayout`) permite `*.googleapis.com`, `accounts.google.com`, `foodie-cc553.firebaseapp.com` y los scripts inline de Astro (nonce/hash); documentado
- [ ] Chunk `firebase` solo se descarga al abrir el diálogo de auth (verificar en build `dist/_astro/`)
- [ ] Tests con `mock.ts`: transición `$authReady`, sign in/out, guard

**Validation**
```bash
npm run check && npm run test -- src/lib/auth src/stores/user
grep -rn "AIzaSy" src | wc -l # 0
```

### Issue 036 — feat(auth): `AuthDialog`, `AccountMenu` y `/profile`

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat
**Branch**: phase-5/issue-036-auth-ui-profile
**Depends on**: #035
**Effort**: M

**Description**
Port de `AuthModal`, `SignInForm`, `SignUpForm`, `SocialLogin`, `ProfilePage` (398) sobre `Dialog`, `Tabs`, `Form`, `password-input`, `avatar`, `dropdown-menu`. Incluye exportar/borrar datos (ADR 0002).

**Acceptance criteria**
- [ ] `AccountMenu` en `SiteHeader` (slot reservado en Issue 005): "Sign in" / avatar + menú (Perfil, Cerrar sesión)
- [ ] `AuthDialog`: pestañas entrar/registrar, reset de contraseña, botones Google/GitHub; errores traducidos (`auth.*`)
- [ ] `/profile` (+es/fr) con `RouteGuard` (`allow` explícito, deny por defecto): nombre, avatar URL, unidades, dieta, idioma preferido; "Exportar mis datos" (JSON de todos los stores) y "Borrar mis datos" (`alert-dialog`)
- [ ] Journey E2E con `mock.ts` (env de test): entrar → perfil → cambiar unidades → compras muestra unidades nuevas → salir → `/profile/` redirige

**Validation**
```bash
npm run test -- src/components/islands/Auth src/components/islands/Profile && npm run test:e2e
```

### Issue 037 — feat(prefs): preferencias y favoritos por usuario

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat
**Branch**: phase-5/issue-037-per-user-prefs
**Depends on**: #036
**Effort**: S

**Description**
Con sesión, `$preferences` y `$favorites` usan claves con namespace `user-preferences-${uid}` / `user-favorites-${uid}` (compatibles con legacy) y se fusionan con las anónimas al iniciar sesión (una vez, con confirmación). Sync en nube queda diferido (D14).

**Acceptance criteria**
- [ ] `persistentAtom` acepta `key: () => string` reactiva a `$user`
- [ ] Fusión anónimo→usuario con `toast` y opción deshacer
- [ ] Tests de store

**Validation**
```bash
npm run test -- src/stores/preferences src/stores/favorites
```

### Issue 038 — feat(contribute): wizard de recetas con `Stepper` + `Form`

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat
**Branch**: phase-5/issue-038-contribute-wizard
**Depends on**: #014, #030
**Effort**: L

**Description**
Reescribe los 9 componentes del wizard (2.978 líneas de `useState` manual) sobre `Stepper` + `Form` (rhf + `recipeSubmissionSchema` por paso): básico (nombre/desc trilingüe, tipo, cocina, dificultad), ingredientes (`Combobox` del catálogo + cantidad/unidad), instrucciones (lista ordenable), nutrición (estimador automático + edición), tiempos/porciones/equipo, vista previa (`RecipeCard` + detalle) y envío (Issue 039).

**Acceptance criteria**
- [ ] Progreso persistido en `localStorage` (`foodie:contribute-draft`) para no perder el borrador
- [ ] Validación por paso con mensajes traducidos; no se avanza con errores; resumen de validación (`getValidationSummary`)
- [ ] Vista previa idéntica al detalle público
- [ ] Tests jsdom por paso + journey completo hasta la vista previa

**Validation**
```bash
npm run check && npm run test -- src/components/islands/ContributeWizard
```

### Issue 039 — feat(contribute): envío sin secretos (JSON + issue prefilled)

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat
**Branch**: phase-5/issue-039-submission-flow
**Depends on**: #038, #007
**Effort**: M

**Description**
Implementa D10: el paso final descarga `recipe-<id>.json` (`download-trigger`) y abre un issue de GitHub prefilled con `recipe-submission.yml` (título, resumen, JSON en bloque de código, checklist). Elimina `githubService.ts` y `@octokit/rest`. El maintainer añade la receta a `recipes.json` por PR (validado por `validate-recipe-pr.yml`).

**Acceptance criteria**
- [ ] `lib/report-issue.ts` reutilizado para construir la URL (límite de 8 KB en query: si el JSON excede, se indica adjuntar el archivo descargado)
- [ ] `docs/recipes/contributing-recipes.md` documenta el flujo (usuario → issue → maintainer → PR → deploy) y el camino futuro con backend (`server-node` `/api/feedback`)
- [ ] `.env.example` sin variables de GitHub; sin `github-access-token` en `localStorage`
- [ ] E2E: completar wizard → botón "Enviar" abre URL `github.com/ArtemioPadilla/foodie/issues/new?template=recipe-submission.yml&…` (interceptar `window.open`)

**Validation**
```bash
grep -rn "octokit\|github-access-token" src package.json | wc -l # 0
npm run test:e2e
```

### Issue 040 — feat(planner): compartir plan por URL (`/plan/shared`)

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat
**Branch**: phase-5/issue-040-share-plan-url
**Depends on**: #025
**Effort**: M

**Description**
Historia de `SharePlanModal`/`SharedPlanPage` de PR #28 sin Firestore (D11): el plan (IDs de receta + porciones + nombre) se serializa, comprime (`lz-string` o `fflate`, ADR 0005 elige) y codifica en `#p=<payload>` (fragment, no llega al servidor). `/plan/shared` lo decodifica, valida con Zod y ofrece "Importar como mi plan".

**Acceptance criteria**
- [ ] `SharePlanModal` (`Dialog`): enlace copiable (`clipboard`), WhatsApp, QR opcional (canvas, sin dependencia)
- [ ] `pages/plan/shared.astro` (+es/fr) con isla `SharedPlan`: vista de solo lectura del plan; recetas resueltas vía `useCatalog`; IDs desconocidos se muestran como "receta no disponible"
- [ ] Un plan de 7 días × 4 comidas cabe en < 2 KB de URL (test)
- [ ] Tests de codificación/decodificación round-trip y de payload corrupto

**Validation**
```bash
npm run test -- src/lib/domain/plan-share src/components/islands/SharedPlan
```

### Issue 041 — feat(shopping): precios de ingredientes y coste del plan

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:feat
**Branch**: phase-5/issue-041-ingredient-prices
**Depends on**: #026
**Effort**: M

**Description**
Port de `PriceManagementModal`, `public/data/ingredient-prices.json` (150+), `costCalculations.ts` y soporte de moneda en `IngredientContext` desde PR #28.

**Acceptance criteria**
- [ ] `ingredient-prices.json` validado por `ingredientPriceSchema` en la colección `prices`; `$preferences.currency`
- [ ] `PriceManagementModal` (`Dialog` + `DataTable` editable con `editable`): precio custom por ingrediente persistido en `foodie:custom-prices`; restablecer
- [ ] `PlanSummary` y `ShoppingList` muestran coste con precios custom > catálogo; protección NaN/división por cero (tests de PR #28 portados)

**Validation**
```bash
npm run test -- src/lib/domain/cost src/components/islands/PriceManagement
```

### Issue 042 — chore: cerrar PR #28 y limpiar ramas

**Phase**: 5  | **Milestone**: v0.6 - Accounts & Contribute  | **Labels**: phase-5, type:chore
**Branch**: phase-5/issue-042-close-pr28
**Depends on**: #026, #040, #041
**Effort**: S

**Description**
Con sus historias portadas, PR #28 se cierra con comentario que enlaza 026/040/041 y esta spec. Se borran las ~20 ramas remotas muertas (`copilot/sub-pr-3*`, `fix-*`, `icons`, `remove-mocks`, `auth-fix`, `feat/tracking`, `dependabot/*` cerrados).

**Acceptance criteria**
- [ ] PR #28 cerrado con referencia; rama `feat/tracking` borrada tras confirmar que `FIREBASE_SETUP.md` y `TEST_PLAN.md` quedan archivados en `docs/archive/legacy-vite/`
- [ ] Solo quedan `main`, `legacy` y ramas activas `phase-*`
- [ ] PRs de Dependabot legacy (#29–#35) cerrados (ya no aplican al nuevo lockfile)

**Validation**
```bash
gh pr list --state open | wc -l
git ls-remote --heads origin | wc -l
```

---

## Phase 6 — Docs, calidad y cierre

**Goal:** Documentación migrada, repo limpio, presupuestos de rendimiento activos y release `v2.0.0` como "Foodie on Inceptor".

**Milestone:** `v1.0 - Foodie on Inceptor`

**Historias**

| ID | Historia |
|---|---|
| US-6.1 | Como contribuidor, quiero encontrar la documentación en el propio sitio, con búsqueda, y sin instalar Python. |
| US-6.2 | Como maintainer, quiero que `CLAUDE.md`, README y CONTRIBUTING describan el stack real. |
| US-6.3 | Como usuario en móvil con datos limitados, quiero que la app cargue rápido y pese poco. |

### Issue 043 — docs: migrar MkDocs a la colección `docs`

**Phase**: 6  | **Milestone**: v1.0 - Foodie on Inceptor  | **Labels**: phase-6, type:docs
**Branch**: phase-6/issue-043-docs-site
**Depends on**: #030
**Effort**: M

**Description**
Los 10 `.md` existentes (`getting-started/*`, `guides/*`, `reference/api.md`, `contributing/recipe-format.md`) pasan a `src/content/docs/` con frontmatter; se eliminan del nav las páginas que MkDocs referenciaba y no existían. `DocsLayout` + Pagefind ya funcionan.

**Acceptance criteria**
- [ ] `/docs/` en EN (ES/FR en `EN_ONLY_ALLOWLIST` de `route-parity`) con sidebar (`docs-sidebar.ts`): Getting started, Guides (development, testing, deployment), Reference (data model = schemas, state, i18n), Contributing (recipes, code)
- [ ] `reference/api.md` regenerado desde `src/schemas` (tabla por schema)
- [ ] Búsqueda Pagefind indexa docs y recetas públicas (`data-pagefind-body` en detalle de receta)
- [ ] Sin restos: `docs/index.md` legacy, `mkdocs.yml`, `requirements.txt`

**Validation**
```bash
npm run build && ls dist/_pagefind && npm run test -- src/tests/route-parity.test.ts
```

### Issue 044 — docs: `CLAUDE.md`, README, CONTRIBUTING para el nuevo stack

**Phase**: 6  | **Milestone**: v1.0 - Foodie on Inceptor  | **Labels**: phase-6, type:docs
**Branch**: phase-6/issue-044-claude-md
**Depends on**: #043
**Effort**: S

**Description**
Reescribe `CLAUDE.md` (hoy 28 KB describiendo React 18/Vite): stack Inceptor + dominio Foodie (schemas, stores, colecciones, i18n trilingüe, rutas, gates, convenciones IDD), enlazando a este plan y a los ADRs. README y CONTRIBUTING acordes.

**Acceptance criteria**
- [ ] `CLAUDE.md` ≤ 400 líneas, pasa `src/tests/claude-md.test.ts`; secciones: Overview, Comandos, Arquitectura (árbol §2), Convenciones (branch/commit/labels), Reglas (6 warnings + Zod + `withBase` + `lang`), Datos y estado, i18n, Testing, Deploy, Estado del roadmap
- [ ] README con badges reales (ci, deploy), capturas nuevas, enlace a docs y a `legacy` tag
- [ ] `CONTRIBUTING.md` con flujo IDD (issue → prometeo → forja → centinela → PR) y flujo de recetas

**Validation**
```bash
npm run test -- src/tests/claude-md.test.ts && wc -l CLAUDE.md
```

### Issue 045 — chore(perf): presupuestos Lighthouse y peso de bundle

**Phase**: 6  | **Milestone**: v1.0 - Foodie on Inceptor  | **Labels**: phase-6, type:chore
**Branch**: phase-6/issue-045-perf-budgets
**Depends on**: #033, #036, #041
**Effort**: M

**Description**
Activa `lighthouse-budgets.json` para Foodie (script ≤ 200 KB en landing, ≤ 350 KB en planner/tracking), verifica que `firebase` y `recharts` solo cargan donde se usan, imágenes de recetas a WebP con `srcset`.

**Acceptance criteria**
- [ ] `npm run perf` verde en `/`, `/recipes/`, un detalle, `/planner/`, `/tracking/progress/`
- [ ] Reporte de chunks en el PR; ningún chunk > 250 KB gz salvo justificación
- [ ] Imágenes en `public/images/recipes/` optimizadas (script `scripts/optimize-images.mjs` con `sharp` **como devDep opcional** o pipeline externo; decidir y documentar)
- [ ] Lighthouse producción: performance ≥ 0.9, a11y ≥ 0.95, best-practices = 1.0, SEO ≥ 0.95

**Validation**
```bash
npm run perf
```

### Issue 046 — chore: recorte de gallery/demos/blog y auditoría de reglas

**Phase**: 6  | **Milestone**: v1.0 - Foodie on Inceptor  | **Labels**: phase-6, type:chore
**Branch**: phase-6/issue-046-trim-template
**Depends on**: #044
**Effort**: S

**Description**
Decide (con Artemio) qué partes del template se quedan: recomendación = **mantener gallery** (referencia de los agentes, tras `flags.experimentalGallery` fuera de producción), **quitar blog y demos** (`/demos/*`, `/showcase/*`, `/blocks/*`, `ai/` kit). Audita reglas.

**Acceptance criteria**
- [ ] Páginas y componentes no usados eliminados o tras flag; `route-parity` y `smoke` actualizados
- [ ] `grep createContext src/components/islands` = 0 fuera de `ui/`; `forbidden-imports.test.ts` verde; `check:pragmas` verde
- [ ] `npm run build` reporta el número final de páginas (esperado ≈ 520: 3 idiomas × (13 estáticas + 50 recetas + 105 ingredientes) + docs)

**Validation**
```bash
npm run check && npm run build | grep "pages built"
```

### Issue 047 — chore(deps): higiene de dependencias y seguridad

**Phase**: 6  | **Milestone**: v1.0 - Foodie on Inceptor  | **Labels**: phase-6, type:chore
**Branch**: phase-6/issue-047-deps
**Depends on**: #046
**Effort**: S

**Description**
`npm audit` a cero high/critical, Dependabot activo con grupos, CodeQL verde, `SECURITY.md` del template adaptado (reporte, alcance, política de secretos: solo `PUBLIC_*`).

**Acceptance criteria**
- [ ] `npm audit` 0 high/critical (devDeps incluidas); `npm outdated` sin majors pendientes salvo los ignorados en `dependabot.yml`
- [ ] `security.yml` (CodeQL + dependency-review) verde en `main`; workflow no deshabilitado por inactividad (cron semanal + push)
- [ ] `SECURITY.md` actualizado

**Validation**
```bash
npm audit && actionlint .github/workflows/security.yml
```

### Issue 048 — chore(release): `v2.0.0` Foodie on Inceptor

**Phase**: 6  | **Milestone**: v1.0 - Foodie on Inceptor  | **Labels**: phase-6, type:chore
**Branch**: phase-6/issue-048-release-v2
**Depends on**: #045, #047
**Effort**: S

**Description**
Cierra la migración: changelog, tag, release notes, Lighthouse de producción archivado, milestone cerrado, este documento marcado como `Status: Done` con enlaces a los PRs.

**Acceptance criteria**
- [ ] `CHANGELOG.md` `[2.0.0]` con Added/Changed/Removed (incluye lista de deps eliminadas y features diferidas)
- [ ] Tag `v2.0.0` + GitHub Release; `PUBLIC_VERSION` en deploy
- [ ] Issues de todas las fases cerrados; milestone `v1.0` cerrado; `ROADMAP.md` nuevo con el backlog post-migración (sync en nube, PRs automáticos de recetas, Tauri, iOS…)
- [ ] Este archivo actualizado: tabla de fases con PR por issue

**Validation**
```bash
git tag -l 'v2.*' && gh release view v2.0.0
```

---

## 4. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Regresión de datos locales de usuarios v1 | Pérdida de planes/despensa | Mismas claves `localStorage` (Issue 013), `migrate` en `persistentAtom`, validación manual con fixture legacy antes del cutover (Issue 030) |
| Las 3 versiones de cada página triplican mantenimiento | Drift entre idiomas | Cuerpos en `components/pages/*`, wrappers de 3 líneas, `route-parity.test.ts` extendido a FR |
| `@dnd-kit` en móvil (scroll vs drag) | UX planner | Sensor `Pointer` con `activationConstraint: { distance: 8 }` + fallback picker (Issue 024/025) |
| CSP vs scripts inline de Astro y popups de Firebase | Auth rota en prod | Definir CSP con nonces/hashes en Issue 035 y probar en Pages antes de mergear |
| Tamaño del build (≈ 520 páginas) | CI lenta | `experimental.directoryAndTrailingSlashHandler` ya activo; recorte de demos (Issue 046); build ≈ 1–2 min es aceptable |
| `firebase` en bundle inicial | Perf | Import dinámico solo en `AuthDialog`; budget en Issue 045 |
| `centinela` bloquea por `risk:high` en cada store | Fricción | ADR 0002 anticipado (Issue 009) cubre escrituras locales; ADR 0004 cubre `/auth` |
| Deriva respecto al template Inceptor | Pérdida de mejoras upstream | Registrar en `docs/decisions/0001` que se sincroniza manualmente el kit `ui/` por trimestre; no modificar archivos de `ui/` salvo fork explícito |

## 5. Glosario

- **Isla**: componente React hidratado en el cliente dentro de una página Astro estática (`client:load|visible|idle`).
- **`withBase()`**: helper obligatorio para cualquier href/asset por el base path `/foodie`.
- **`persistentAtom`**: nanostore respaldado por `localStorage` con validación Zod (Issue 012).
- **Cutover**: merge de la rama `inceptor` en `main` que sustituye la app legacy en producción (Issue 030).
- **IDD**: Issue-Driven Development — issue → `prometeo` (plan) → `forja` (código) → `centinela` (validación) → PR → merge → deploy.
- **Tier de ethics**: nivel de la checklist `.claude/checklists/ethics.json` exigido por PR (0 docs/tests, 1 UI, 2 datos de usuario/auth).
