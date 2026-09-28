# 0014 — Ingredient prices: PR #28's sheet on catalog ids, custom > catalog, no exchange rates

## Status

`Accepted`

Date: 2026-09-28

## Context

Roadmap Issue 041 (US-5.5, "adjust ingredient prices so the plan cost reflects
my reality") ports the pricing story of PR #28 (`origin/feat/tracking`), which
is closed rather than merged (Issue 042):

- `public/data/ingredient-prices.json` — 90 store quotes keyed by English slugs
  (`"tomato": { "price": 2.49, "unit": "lb", "currency": "USD" }`), priced per
  **pack** (`lb`, `25oz`, `dozen`, `gallon`, `head`…). The roadmap says "150+";
  the file on the branch has 90.
- `IngredientContext` pricing: custom prices in `localStorage
  ['customIngredientPrices']` (`{ [id]: number }`) over the sheet;
  `getIngredientCurrency`, coverage helpers.
- `utils/costCalculations.ts`: `calculateRecipeCost`, `calculatePlanCost`,
  `calculateCostPerServing`, with guards against non-positive servings, NaN and
  division by zero. The branch has no tests for it.
- `PriceManagementModal`: search, "custom only", edit / reset one / reset all.

Three facts make a literal copy useless:

1. **No key matches.** The catalog's ingredient ids are `ing_001…ing_105`, and
   recipe lines reference those; the sheet's keys are slugs (`bell_pepper`).
2. **Pack units ≠ recipe units.** PR #28 computed `pricePerUnit × quantity`
   whatever the units, so 2 tbsp of olive oil at "$9.99 / 25oz" cost $19.98.
3. **Currency.** Every catalog price is USD, and there are no exchange rates.

## Decision

1. **Data.** `public/data/ingredient-prices.json` keeps PR #28's quotes
   verbatim (`price`, `unit`, `currency`) but is keyed by catalog id, with the
   original slug in `legacyKey` for provenance:
   `{ "ing_005": { "price": 2.49, "unit": "lb", "currency": "USD", "legacyKey": "tomato" } }`.
   Matching is by the ingredient's English name slug (45 quotes, `honey` twice
   because the catalog has two honey records) plus six explicit aliases
   (`eggs`→`ing_001`, `salmon`→`ing_036`, `mozzarella_cheese`→`ing_050`,
   `penne`→`ing_088`, `almonds`→`ing_091`, `flour`→`ing_026`): **51 entries**.
   The 40 quotes with no catalog ingredient (`potato`, `lime`, `cilantro`,
   `chicken`, `pork`, `cod`, `salt`, `coffee`, `ice_cream`…) are dropped; add
   them back with the ingredient when the catalog grows. The file is the
   `prices` content collection (`IngredientPriceSchema`, build-time validation,
   `catalog-schema.test.ts` checks every key is an ingredient id) and is
   fetched at runtime by `usePriceCatalog()`, a query of its own outside
   `useCatalog()`'s combined status — prices are optional.
2. **Units.** `lib/domain/cost.ts` converts a pack quote to the ingredient's
   recipe unit only when that is **exact**: mass ↔ mass (oz, lb, g, kg),
   volume ↔ volume (tsp … gallon, ml, l), count ↔ count (piece, dozen). A pack
   in weight ounces never becomes cups (that needs a density). 14 quotes
   convert today (eggs, chicken breast, pasta, spaghetti, penne, salmon,
   mozzarella, milk, bell pepper, lemon, avocado, cucumber, ground beef,
   shrimp); the others are shown in the price manager as a store reference.
   Recipe lines and shopping items are converted the same way before
   multiplying, so `1 lb` of an ingredient priced per `oz` counts 16×.
3. **Resolution: custom > catalog.** For each ingredient: the user's price in
   the current currency → the store quote (when exact) → the ingredient's
   `avgPrice`. A line with no usable price is skipped and counted in the
   coverage shown next to the cost.
4. **Currency without exchange rates.** `$preferences.currency` (ISO 4217,
   default `USD`, per user like the other preferences) is the currency costs are
   shown in and custom prices are entered in. A price in another currency is
   not used — a total is never a silent mix. Custom prices are stored with
   their currency (`foodie:custom-prices` =
   `{ [ingredientId]: { price, currency } }`), so switching currency never
   re-labels a number.
5. **UI.** `PriceManagementModal` (`Dialog` + `DataTable` with `Editable`
   cells) is mounted inside the MealPlanner island (in `PlanSummary`'s cost
   card) and inside the ShoppingList island — one composition per island, never
   across islands. `PlanSummary` shows total, per planned day, coverage and
   "cost data unavailable"; `ShoppingList` shows the total, what is left to buy
   and how many items were priced. The kit gained backwards-compatible
   `labels` props on `DataTable` and `Editable` so these read in EN/ES/FR.

## Consequences

- Costs are lower than PR #28's (which multiplied across units) and honest
  about what they cover. The recipe browser's "sort by cost" and the recipe
  picker still use `avgPrice` only (`calculations.ts`); moving them to the
  price book is a follow-up if wanted.
- PR #28's `customIngredientPrices` key was never deployed, so there is
  nothing to migrate.
- **Stakeholders** (tier-2: new persistent storage of user input). The only
  person affected is the visitor on their own device: prices are typed
  voluntarily, are not health data and never leave the browser (no network
  call; no account sync). `foodie:custom-prices` is included in the profile's
  "export my data" file and removed by "clear my data" (`lib/user-data.ts`),
  and each price can be reset in the dialog. Catalog prices are rough US
  averages and are labelled as estimates ("catalogue prices").

## References

- Roadmap Issue 041; decision table §1 (D6 single source, D11/D14).
- [ADR 0002](./0002-local-first-user-data.md) — `foodie:custom-prices` row.
- PR #28 files: `public/data/ingredient-prices.json`,
  `src/components/common/PriceManagementModal.tsx`,
  `src/utils/costCalculations.ts`, `src/contexts/IngredientContext.tsx`.
