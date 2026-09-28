---
title: Contributing recipes
description: The recipe JSON format, the rules the build enforces, and the two ways to submit a recipe — the in-app wizard or a pull request.
---

Every recipe in Foodie is one record in `public/data/recipes.json`. The same
file feeds the static recipe pages (one per recipe, in three languages) and the
islands that need the catalog at runtime. It is validated with
`RecipeSchema` when the site is built, so a record that breaks a rule never
reaches production.

## Two ways to contribute

### Without git: the Contribute wizard

1. Open **Contribute** (`/contribute/`, also in Spanish and French). Seven
   steps collect the basics, times and servings, ingredients from the catalog,
   instructions, nutrition and dietary labels, with a live preview that uses
   the same components as the recipe page. Your draft is saved in this browser.
2. On the last step, **Submit** opens a prefilled GitHub issue (the
   *Recipe submission* form) in a new tab and downloads `recipe-<id>.json`.
3. Sign in to GitHub, tick the checklist (your own recipe or one you may share,
   all three languages, ingredient ids, nutrition) and create the issue.

Foodie never holds a GitHub token: you create the issue yourself, with your own
account. If the recipe is too long to fit in the issue URL (8 KB), the wizard
tells you to attach the downloaded file instead. A maintainer turns the issue
into a pull request, fills any missing Spanish or French text, and assigns the
next catalog id.

### With git: a pull request

1. Fork the repository and branch from `main`.
2. Add your record at the end of `public/data/recipes.json` with the next free
   id (`rec_051`, `rec_052`, …). If an ingredient is missing, add it to
   `public/data/ingredients.json` in the same PR.
3. Check it locally:

   ```bash
   npm run test -- src/tests/catalog-schema.test.ts   # schemas, ids, languages, references
   npm run build                                      # the content collections must load
   ```

4. Open the PR. `validate-recipe-pr.yml` runs the catalog test and comments the
   result; maintainers review the translations and the nutrition numbers.

Once merged, the recipe is live on the next deploy.

## The format

A complete record (instructions and ingredients shortened):

```json
{
  "id": "rec_050",
  "name": { "en": "Fruit Salad", "es": "Ensalada de Frutas", "fr": "Salade de Fruits" },
  "description": {
    "en": "Fresh seasonal fruit salad",
    "es": "Ensalada fresca de frutas de temporada",
    "fr": "Salade de fruits frais de saison"
  },
  "type": "dessert",
  "cuisine": ["american"],
  "prepTime": 15,
  "cookTime": 0,
  "totalTime": 15,
  "servings": 6,
  "difficulty": "easy",
  "tags": ["healthy", "fresh", "vegan"],
  "dietaryLabels": {
    "glutenFree": true, "vegetarian": true, "vegan": true, "dairyFree": true,
    "lowCarb": false, "keto": false, "paleo": true
  },
  "nutrition": {
    "servingSize": "1.5 cups",
    "calories": 120, "protein": 2, "carbs": 30, "fat": 1, "fiber": 4,
    "sugar": 24, "sodium": 5, "cholesterol": 0
  },
  "ingredients": [
    { "ingredientId": "ing_081", "quantity": 2, "unit": "cup", "optional": false },
    { "ingredientId": "ing_082", "quantity": 1, "unit": "cup", "optional": false }
  ],
  "instructions": [
    {
      "step": 1,
      "text": {
        "en": "Chop all fruit into bite-size pieces",
        "es": "Corta toda la fruta en trozos",
        "fr": "Couper tous les fruits en morceaux"
      },
      "time": 10
    }
  ],
  "tips": { "en": "Add honey for sweetness", "es": "Agrega miel para endulzar", "fr": "Ajouter du miel pour sucrer" },
  "equipment": ["bowl", "knife"],
  "author": "foodie_team",
  "dateAdded": "2025-02-17",
  "rating": 4.5,
  "reviewCount": 412
}
```

### Fields

| Field | Required | Rules |
|---|---|---|
| `id` | yes | `rec_` + three digits, unique, next free number |
| `name`, `description` | yes | `{ en, es, fr }`, none blank |
| `type` | yes | `breakfast`, `lunch`, `dinner`, `snack` or `dessert` |
| `cuisine` | yes | At least one cuisine; use the ids in `categories.json` → `cuisines` |
| `prepTime`, `cookTime`, `totalTime` | yes | Minutes, ≥ 0; `totalTime` should equal the sum |
| `servings` | yes | Integer ≥ 1; the quantities below are for this many servings |
| `difficulty` | yes | `easy`, `medium` or `hard` |
| `tags` | yes | Free-form lowercase strings (may be empty) |
| `dietaryLabels` | yes | Booleans `glutenFree`, `vegetarian`, `vegan`, `dairyFree`, `lowCarb`, `keto`, `paleo`; `whole30` optional |
| `nutrition` | yes | Per serving: `servingSize` text and `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar` (g), `sodium`, `cholesterol` (mg) |
| `ingredients` | yes, ≥ 1 | `ingredientId` from `ingredients.json`, `quantity` ≥ 0, `unit`, `optional`; optional `preparation` and trilingual `notes` |
| `instructions` | yes, ≥ 1 | `step` (1, 2, …) and trilingual `text`; optional `time` (minutes, enables the step timer) and `image` |
| `tips` | no | Trilingual text |
| `equipment` | yes | Strings (may be empty) |
| `imageUrl`, `videoUrl`, `sourceUrl`, `author` | no | Strings; omit rather than `null` |
| `dateAdded` | yes | Calendar date `YYYY-MM-DD` |
| `rating`, `reviewCount` | yes | 0–5, and an integer ≥ 0 |
| `variations` | no | `{ name, changedIngredients[] }` |

Optional fields are **omitted**, never set to `null`: the schemas reject
`null`. The authoritative, always-current definition of every field is the
generated [data model](../../reference/api/#recipeschema).

### Rules checked by the build and the catalog test

- Every text object has non-blank `en`, `es` and `fr`.
- Ids are unique, and so are English recipe names.
- Every `ingredientId` (including inside `variations`) exists in
  `ingredients.json`; `type` exists in `categories.json` → `mealTypes`.
- Enums and ranges as in the table above.

### Units

Use the units the catalog already uses: `cup`, `tbsp`, `tsp`, `oz`, `lb`,
`piece`, `whole`, `slice`, `clove`, `leaf`, `bunch` (the shopping list also
knows `g`, `kg`, `ml` and `l`). The shopping list converts and merges
quantities, and the recipe page switches between metric and imperial.

## Style

- Write each language naturally; do not machine-translate word for word.
- Keep steps short, one action each, in the imperative ("Chop…", "Corta…",
  "Coupez…").
- Nutrition values are estimates per serving; round to whole numbers.
- Only submit recipes you wrote or are allowed to share. The catalog is
  published under the repository's license.
