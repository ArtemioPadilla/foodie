# Recipe Format Guide

This guide explains the JSON format for contributing recipes to Foodie PWA.

---

## Overview

Recipes are stored in JSON format with support for three languages (English, Spanish, French). All recipes must follow this structure to be accepted.

---

## Complete Recipe Example

```json
{
  "id": "scrambled-eggs-basic",
  "name": {
    "en": "Basic Scrambled Eggs",
    "es": "Huevos Revueltos Básicos",
    "fr": "Œufs Brouillés Classiques"
  },
  "description": {
    "en": "Fluffy, creamy scrambled eggs perfect for breakfast",
    "es": "Huevos revueltos esponjosos y cremosos perfectos para el desayuno",
    "fr": "Œufs brouillés moelleux et crémeux parfaits pour le petit-déjeuner"
  },
  "type": "breakfast",
  "cuisine": ["american", "international"],
  "prepTime": 5,
  "cookTime": 10,
  "totalTime": 15,
  "servings": 2,
  "difficulty": "easy",
  "tags": ["quick", "protein-rich", "vegetarian"],
  "dietaryLabels": {
    "glutenFree": true,
    "vegetarian": true,
    "vegan": false,
    "dairyFree": false,
    "lowCarb": true,
    "keto": true,
    "paleo": true,
    "whole30": false
  },
  "nutrition": {
    "servingSize": "2 eggs",
    "calories": 180,
    "protein": 13,
    "carbs": 2,
    "fat": 14,
    "fiber": 0,
    "sugar": 1,
    "sodium": 180,
    "cholesterol": 370
  },
  "ingredients": [
    {
      "ingredientId": "eggs",
      "quantity": 4,
      "unit": "piece",
      "preparation": "beaten",
      "notes": {
        "en": "Use fresh eggs for best results",
        "es": "Usa huevos frescos para mejores resultados",
        "fr": "Utilisez des œufs frais pour de meilleurs résultats"
      },
      "optional": false
    },
    {
      "ingredientId": "butter",
      "quantity": 1,
      "unit": "tbsp",
      "preparation": "",
      "notes": null,
      "optional": false
    },
    {
      "ingredientId": "milk",
      "quantity": 2,
      "unit": "tbsp",
      "preparation": "",
      "notes": null,
      "optional": true
    },
    {
      "ingredientId": "salt",
      "quantity": 0.25,
      "unit": "tsp",
      "preparation": "",
      "notes": null,
      "optional": false
    },
    {
      "ingredientId": "black-pepper",
      "quantity": 0.125,
      "unit": "tsp",
      "preparation": "freshly ground",
      "notes": null,
      "optional": true
    }
  ],
  "instructions": [
    {
      "step": 1,
      "text": {
        "en": "Crack eggs into a bowl and beat with milk, salt, and pepper",
        "es": "Rompe los huevos en un tazón y bate con leche, sal y pimienta",
        "fr": "Cassez les œufs dans un bol et battez avec le lait, le sel et le poivre"
      },
      "time": 2,
      "image": null
    },
    {
      "step": 2,
      "text": {
        "en": "Heat butter in a non-stick pan over medium-low heat",
        "es": "Calienta la mantequilla en una sartén antiadherente a fuego medio-bajo",
        "fr": "Faites chauffer le beurre dans une poêle antiadhésive à feu moyen-doux"
      },
      "time": 1,
      "image": null
    },
    {
      "step": 3,
      "text": {
        "en": "Pour in egg mixture and let it sit for 20 seconds",
        "es": "Vierte la mezcla de huevo y deja reposar durante 20 segundos",
        "fr": "Versez le mélange d'œufs et laissez reposer pendant 20 secondes"
      },
      "time": 1,
      "image": null
    },
    {
      "step": 4,
      "text": {
        "en": "Gently stir with a spatula, creating large, soft curds. Remove from heat when still slightly runny",
        "es": "Revuelve suavemente con una espátula, creando grumos grandes y suaves. Retira del fuego cuando aún estén ligeramente líquidos",
        "fr": "Remuez doucement avec une spatule, créant de gros caillés tendres. Retirer du feu lorsqu'encore légèrement coulant"
      },
      "time": 6,
      "image": null
    },
    {
      "step": 5,
      "text": {
        "en": "Let stand for 1 minute (they'll continue to cook), then serve immediately",
        "es": "Deja reposar durante 1 minuto (seguirán cocinándose), luego sirve inmediatamente",
        "fr": "Laissez reposer 1 minute (ils continueront à cuire), puis servez immédiatement"
      },
      "time": 1,
      "image": null
    }
  ],
  "tips": {
    "en": "Don't overcook! Remove from heat when eggs are still slightly wet - they'll finish cooking from residual heat.",
    "es": "¡No cocines demasiado! Retira del fuego cuando los huevos aún estén ligeramente húmedos, se terminarán de cocinar con el calor residual.",
    "fr": "Ne faites pas trop cuire! Retirez du feu lorsque les œufs sont encore légèrement humides - ils finiront de cuire avec la chaleur résiduelle."
  },
  "equipment": ["non-stick pan", "spatula", "mixing bowl", "whisk"],
  "imageUrl": "/images/recipes/scrambled-eggs.jpg",
  "videoUrl": null,
  "sourceUrl": null,
  "author": "Foodie Team",
  "dateAdded": "2025-01-10T00:00:00Z",
  "rating": 4.8,
  "reviewCount": 234,
  "variations": []
}
```

---

## Field Descriptions

### Required Fields

#### id
- **Type**: `string`
- **Format**: `kebab-case`
- **Example**: `"scrambled-eggs-basic"`
- **Description**: Unique identifier for the recipe
- **Rules**:
  - Must be unique across all recipes
  - Use lowercase with hyphens
  - Descriptive and URL-friendly

#### name
- **Type**: `MultiLangText` (object with en/es/fr)
- **Example**:
  ```json
  {
    "en": "Basic Scrambled Eggs",
    "es": "Huevos Revueltos Básicos",
    "fr": "Œufs Brouillés Classiques"
  }
  ```
- **Description**: Recipe name in all three languages
- **Rules**:
  - All three languages required
  - Keep concise (2-8 words)
  - Use title case in English

#### description
- **Type**: `MultiLangText`
- **Description**: Short description of the recipe
- **Rules**:
  - All three languages required
  - 1-2 sentences
  - Highlight what makes this recipe special

#### type
- **Type**: `string`
- **Values**: `"breakfast"`, `"lunch"`, `"dinner"`, `"snack"`, `"dessert"`
- **Example**: `"breakfast"`
- **Description**: Meal type category

#### cuisine
- **Type**: `array of strings`
- **Example**: `["mexican", "tex-mex"]`
- **Common values**:
  - `"american"`, `"mexican"`, `"italian"`, `"french"`, `"chinese"`, `"japanese"`, `"indian"`, `"thai"`, `"mediterranean"`, `"middle-eastern"`, `"spanish"`, `"greek"`, `"korean"`, `"vietnamese"`, `"brazilian"`, `"moroccan"`, `"international"`
- **Rules**:
  - At least one cuisine
  - Use lowercase
  - Can have multiple cuisines

#### Times (prepTime, cookTime, totalTime)
- **Type**: `number`
- **Unit**: minutes
- **Example**:
  ```json
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45
  ```
- **Rules**:
  - Must be positive integers
  - `totalTime` should equal `prepTime + cookTime`

#### servings
- **Type**: `number`
- **Example**: `4`
- **Description**: Number of servings this recipe makes
- **Rules**:
  - Must be positive integer
  - Typically 1-12

#### difficulty
- **Type**: `string`
- **Values**: `"easy"`, `"medium"`, `"hard"`
- **Example**: `"easy"`
- **Guidelines**:
  - **Easy**: < 30 min, few ingredients, basic techniques
  - **Medium**: 30-60 min, moderate skills, some special techniques
  - **Hard**: > 60 min, advanced skills, complex techniques

#### tags
- **Type**: `array of strings`
- **Example**: `["quick", "healthy", "kid-friendly", "meal-prep"]`
- **Common tags**:
  - Time: `"quick"` (<30 min), `"slow-cooker"`, `"make-ahead"`
  - Occasion: `"weeknight"`, `"party"`, `"holiday"`, `"summer"`, `"winter"`
  - Characteristics: `"healthy"`, `"comfort-food"`, `"kid-friendly"`, `"budget-friendly"`, `"protein-rich"`, `"one-pot"`
- **Rules**:
  - At least 2 tags
  - Use lowercase with hyphens
  - Be descriptive but not redundant with dietaryLabels

#### dietaryLabels
- **Type**: `object`
- **Required fields** (all boolean):
  ```json
  {
    "glutenFree": false,
    "vegetarian": false,
    "vegan": false,
    "dairyFree": false,
    "lowCarb": false,
    "keto": false,
    "paleo": false,
    "whole30": false
  }
  ```
- **Guidelines**:
  - **glutenFree**: No wheat, barley, rye, or gluten-containing ingredients
  - **vegetarian**: No meat, fish, or poultry (eggs and dairy OK)
  - **vegan**: No animal products (no eggs, dairy, honey, meat, fish)
  - **dairyFree**: No milk, cheese, butter, cream, yogurt
  - **lowCarb**: < 20g net carbs per serving
  - **keto**: < 10g net carbs per serving, high fat
  - **paleo**: No grains, legumes, dairy, processed foods
  - **whole30**: Paleo + no added sugar or alcohol

#### nutrition
- **Type**: `object`
- **Required fields**:
  ```json
  {
    "servingSize": "1 cup (240g)",
    "calories": 250,
    "protein": 12,      // grams
    "carbs": 30,        // grams
    "fat": 10,          // grams
    "fiber": 5,         // grams
    "sugar": 8,         // grams
    "sodium": 450,      // milligrams
    "cholesterol": 30   // milligrams
  }
  ```
- **Rules**:
  - All values are **per serving**
  - Use reasonable estimates if exact values unknown
  - `calories` typically 100-1000 per serving
  - Macros (protein + carbs + fat) should roughly match calories (protein/carbs: 4 cal/g, fat: 9 cal/g)

#### ingredients
- **Type**: `array of objects`
- **Format**:
  ```json
  {
    "ingredientId": "eggs",
    "quantity": 2,
    "unit": "piece",
    "preparation": "beaten",
    "notes": {
      "en": "Room temperature works best",
      "es": "Temperatura ambiente funciona mejor",
      "fr": "La température ambiante fonctionne mieux"
    },
    "optional": false
  }
  ```
- **Fields**:
  - **ingredientId**: Must match an ingredient in the ingredients database
  - **quantity**: Numeric amount
  - **unit**: Standard unit (cup, tbsp, tsp, piece, lb, oz, g, ml, etc.)
  - **preparation**: How to prepare (diced, minced, chopped, etc.) - can be empty string
  - **notes**: Optional additional info in all languages - can be `null`
  - **optional**: Boolean indicating if ingredient is optional
- **Common units**:
  - Volume: `cup`, `tbsp`, `tsp`, `ml`, `l`
  - Weight: `lb`, `oz`, `g`, `kg`
  - Count: `piece`, `slice`, `clove`, `can`, `package`

#### instructions
- **Type**: `array of objects`
- **Format**:
  ```json
  {
    "step": 1,
    "text": {
      "en": "Preheat oven to 350°F (175°C)",
      "es": "Precalienta el horno a 175°C (350°F)",
      "fr": "Préchauffez le four à 175°C (350°F)"
    },
    "time": 5,
    "image": null
  }
  ```
- **Fields**:
  - **step**: Sequential number (1, 2, 3, ...)
  - **text**: Instruction in all three languages
  - **time**: Estimated time for this step in minutes (can be `null`)
  - **image**: URL to step image (can be `null`)
- **Rules**:
  - Steps must be sequential starting at 1
  - Each step should be one clear action
  - Use imperative mood ("Add flour", not "You should add flour")
  - Include temperatures in both Fahrenheit and Celsius

#### equipment
- **Type**: `array of strings`
- **Example**: `["oven", "mixing bowl", "whisk", "9x13 baking pan"]`
- **Common equipment**:
  - Cookware: `"oven"`, `"stove"`, `"microwave"`, `"grill"`, `"slow-cooker"`, `"instant-pot"`
  - Pans: `"skillet"`, `"saucepan"`, `"stockpot"`, `"baking sheet"`, `"baking dish"`
  - Tools: `"whisk"`, `"spatula"`, `"mixing bowl"`, `"measuring cups"`, `"knife"`, `"cutting board"`
  - Appliances: `"blender"`, `"food processor"`, `"mixer"`, `"immersion blender"`

#### dateAdded
- **Type**: `string`
- **Format**: ISO 8601 datetime
- **Example**: `"2025-01-10T12:30:00Z"`
- **Description**: When the recipe was added to the database

#### rating
- **Type**: `number`
- **Range**: 0.0 to 5.0
- **Example**: `4.5`
- **Description**: Average user rating
- **Default**: `0` for new recipes

#### reviewCount
- **Type**: `number`
- **Example**: `42`
- **Description**: Number of user reviews
- **Default**: `0` for new recipes

---

### Optional Fields

#### tips
- **Type**: `MultiLangText` or `null`
- **Example**:
  ```json
  {
    "en": "For extra flavor, add a pinch of nutmeg",
    "es": "Para más sabor, añade una pizca de nuez moscada",
    "fr": "Pour plus de saveur, ajoutez une pincée de noix de muscade"
  }
  ```
- **Description**: Helpful tips for making the recipe

#### imageUrl
- **Type**: `string` or `null`
- **Example**: `"/images/recipes/chocolate-cake.jpg"`
- **Description**: Path to recipe image
- **Rules**:
  - Image should be high quality (min 800x600px)
  - Use WebP format if possible, JPEG as fallback
  - Store in `/public/images/recipes/`

#### videoUrl
- **Type**: `string` or `null`
- **Example**: `"https://youtube.com/watch?v=xxxxx"`
- **Description**: URL to recipe video tutorial

#### sourceUrl
- **Type**: `string` or `null`
- **Example**: `"https://example.com/original-recipe"`
- **Description**: URL to original recipe source (if adapted)

#### author
- **Type**: `string` or `null`
- **Example**: `"Chef Julia Child"`
- **Description**: Recipe author/contributor name

#### variations
- **Type**: `array of objects` or empty array
- **Format**:
  ```json
  [
    {
      "name": {
        "en": "Chocolate Chip Variation",
        "es": "Variación con Chispas de Chocolate",
        "fr": "Variation aux Pépites de Chocolat"
      },
      "changedIngredients": [
        {
          "ingredientId": "chocolate-chips",
          "quantity": 1,
          "unit": "cup",
          "preparation": "",
          "notes": null,
          "optional": false
        }
      ]
    }
  ]
  ```
- **Description**: Alternative versions of the recipe

---

## Validation Rules

### All Recipes Must:

1. ✅ Have unique `id`
2. ✅ Include all three languages (EN/ES/FR) for multilingual fields
3. ✅ Have at least 2 ingredients
4. ✅ Have at least 3 instruction steps
5. ✅ Have realistic nutrition values
6. ✅ Use existing `ingredientId` values from the ingredients database
7. ✅ Have `totalTime` = `prepTime` + `cookTime`
8. ✅ Have all required fields filled
9. ✅ Have valid enum values (type, difficulty, cuisine)
10. ✅ Have properly formatted dates (ISO 8601)

### Common Mistakes to Avoid:

❌ **Missing translations**
```json
// Wrong
"name": { "en": "Pasta" }

// Correct
"name": {
  "en": "Pasta",
  "es": "Pasta",
  "fr": "Pâtes"
}
```

❌ **Invalid ingredient ID**
```json
// Wrong - ID doesn't exist
"ingredientId": "some-random-ingredient"

// Correct - Use existing IDs
"ingredientId": "eggs"
```

❌ **Wrong time calculation**
```json
// Wrong
"prepTime": 10,
"cookTime": 20,
"totalTime": 40  // Should be 30

// Correct
"prepTime": 10,
"cookTime": 20,
"totalTime": 30
```

❌ **Missing required dietary labels**
```json
// Wrong - incomplete
"dietaryLabels": {
  "vegan": true
}

// Correct - all fields
"dietaryLabels": {
  "glutenFree": true,
  "vegetarian": true,
  "vegan": true,
  "dairyFree": true,
  "lowCarb": false,
  "keto": false,
  "paleo": true,
  "whole30": false
}
```

---

## Submission Process

### Using the Contribution Wizard (Recommended)

1. Navigate to **Contribute** page in the app
2. Click **"Submit New Recipe"**
3. Follow the 7-step wizard
4. Preview your recipe
5. Submit (creates automatic PR to GitHub)

### Manual Submission

1. Fork the repository
2. Create a new JSON file in `/public/data/recipes/`
3. Name it with the recipe ID: `your-recipe-id.json`
4. Validate using `npm run validate:json`
5. Create a Pull Request

---

## Need Help?

- 📖 [Contribution Guide](guide.md) - General contribution guidelines
- 🐛 [Report Issues](https://github.com/artemiopadilla/foodie/issues)
- 💬 [Discussions](https://github.com/artemiopadilla/foodie/discussions)

---

**Happy Contributing! 🍳**
