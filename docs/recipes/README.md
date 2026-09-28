# Recipes

Patrones copy-paste para construir productos reales sobre Inceptor, destilados
de **FinSight AI** (el primer producto construido con este scaffold). No son
código vivo del demo — son recetas: copia lo que necesites a tu proyecto.

| Recipe | Para qué |
|---|---|
| [auth-supabase.md](./auth-supabase.md) | Auth (email/password) + base de datos con RLS, sin escribir auth propia |
| [ai-byok.md](./ai-byok.md) | Feature de IA con **BYOK** (el usuario trae su API key) + backend stateless + tests mockeados |
| [ai-backend-hosting.md](./ai-backend-hosting.md) | Dónde corre el backend de IA (local / Render / Cloud Run) y por qué Edge Functions ≠ Python |
| [supabase-migrations-ci.md](./supabase-migrations-ci.md) | Aplicar migraciones de DB e inyectar env públicas por GitHub Actions |
| [catalog-data.md](./catalog-data.md) | **Foodie**: catálogo `public/data/*.json` como content collections validadas con Zod; cómo añadir una receta (JSON → PR → `validate-recipe-pr.yml`) |
| [contributing-recipes.md](./contributing-recipes.md) | **Foodie**: envío de recetas sin secretos — el wizard descarga `recipe-<id>.json` y abre un issue prefilled (`recipe-submission.yml`, límite 8 KB); maintainer → PR → deploy; camino futuro con `server-node` `/api/feedback` |
| [state.md](./state.md) | **Foodie**: estado entre islas con nanostores (`useStore`, acciones puras, `persistentAtom`) y por qué no React Context |
| [i18n-islands.md](./i18n-islands.md) | **Foodie**: i18n en islas — `lang` por prop, `t(lang, key, params)`, `getTranslated(text, lang)`, nunca `navigator.language` en render |

Principio transversal: **el extractor/servicio es stateless; el frontend escribe
en la DB con la sesión del usuario + RLS** → no se usa la service key en ningún
servidor. Ver [ADR 0006](../decisions/0006-self-hosted-backend-archetypes.md).
