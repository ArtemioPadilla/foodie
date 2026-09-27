#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const RECIPES_FILE = './public/data/recipes.json';

// Read existing data
const recipesData = JSON.parse(readFileSync(RECIPES_FILE, 'utf8'));

console.log(`📊 Starting: ${recipesData.recipes.length} recipes\n`);

// Add final 10 recipes (rec_041-050) to reach 50 total
const newRecipes = [
  // BREAKFAST (2 more to reach 10 breakfast total)
  {
    id: "rec_041",
    name: {en: "Yogurt Parfait", es: "Parfait de Yogur", fr: "Parfait au Yaourt"},
    description: {en: "Layered yogurt with granola and berries", es: "Yogur en capas con granola y bayas", fr: "Yaourt en couches avec granola et baies"},
    type: "breakfast", cuisine: ["american"], prepTime: 5, cookTime: 0, totalTime: 5, servings: 2, difficulty: "easy",
    tags: ["healthy", "quick", "vegetarian"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 parfait", calories: 280, protein: 14, carbs: 42, fat: 7, fiber: 5, sugar: 24, sodium: 120, cholesterol: 15},
    ingredients: [
      {ingredientId: "ing_081", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_082", quantity: 0.5, unit: "cup", optional: false},
      {ingredientId: "ing_100", quantity: 2, unit: "tbsp", optional: true}
    ],
    instructions: [
      {step: 1, text: {en: "Layer yogurt and berries in glass", es: "Coloca yogur y bayas en capas", fr: "Disposer yaourt et baies en couches"}, time: 5}
    ],
    tips: {en: "Add honey for sweetness", es: "Agrega miel para dulzura", fr: "Ajouter miel pour sucré"},
    equipment: ["glass", "spoon"],
    author: "foodie_team",
    dateAdded: "2025-02-08",
    rating: 4.5,
    reviewCount: 356
  },
  {
    id: "rec_042",
    name: {en: "Breakfast Smoothie", es: "Batido de Desayuno", fr: "Smoothie du Matin"},
    description: {en: "Energizing breakfast smoothie with fruits", es: "Batido energizante con frutas", fr: "Smoothie énergisant aux fruits"},
    type: "breakfast", cuisine: ["american"], prepTime: 5, cookTime: 0, totalTime: 5, servings: 2, difficulty: "easy",
    tags: ["healthy", "quick", "vegan"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 smoothie", calories: 240, protein: 4, carbs: 56, fat: 2, fiber: 7, sugar: 38, sodium: 35, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_025", quantity: 2, unit: "piece", optional: false},
      {ingredientId: "ing_081", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_085", quantity: 1, unit: "piece", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Blend all ingredients until smooth", es: "Licúa todos los ingredientes", fr: "Mixer tous ingrédients"}, time: 5}
    ],
    tips: {en: "Add ice for thickness", es: "Agrega hielo para espesor", fr: "Ajouter glace pour épaisseur"},
    equipment: ["blender"],
    author: "foodie_team",
    dateAdded: "2025-02-09",
    rating: 4.6,
    reviewCount: 428
  },

  // LUNCH (2 more to reach good balance)
  {
    id: "rec_043",
    name: {en: "Tuna Poke Bowl", es: "Bowl Poke de Atún", fr: "Bol Poke au Thon"},
    description: {en: "Fresh tuna poke bowl with rice and vegetables", es: "Bowl poke de atún fresco con arroz y verduras", fr: "Bol poke au thon frais avec riz et légumes"},
    type: "lunch", cuisine: ["hawaiian"], prepTime: 20, cookTime: 15, totalTime: 35, servings: 2, difficulty: "medium",
    tags: ["healthy", "seafood", "fresh"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 bowl", calories: 480, protein: 38, carbs: 52, fat: 14, fiber: 4, sugar: 6, sodium: 720, cholesterol: 65},
    ingredients: [
      {ingredientId: "ing_070", quantity: 12, unit: "oz", preparation: "cubed", optional: false},
      {ingredientId: "ing_087", quantity: 2, unit: "cup", preparation: "cooked", optional: false},
      {ingredientId: "ing_043", quantity: 1, unit: "cup", preparation: "diced", optional: false},
      {ingredientId: "ing_051", quantity: 2, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook rice according to package", es: "Cocina arroz según paquete", fr: "Cuire riz selon paquet"}, time: 15},
      {step: 2, text: {en: "Cube tuna and marinate in soy sauce", es: "Corta atún y marina en salsa de soja", fr: "Couper thon et mariner dans sauce soja"}, time: 10},
      {step: 3, text: {en: "Assemble bowl with rice, tuna, and vegetables", es: "Arma bowl con arroz, atún y verduras", fr: "Assembler bol avec riz, thon et légumes"}, time: 5}
    ],
    tips: {en: "Use sushi-grade tuna", es: "Usa atún grado sushi", fr: "Utiliser thon qualité sushi"},
    equipment: ["pot", "bowl", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-10",
    rating: 4.8,
    reviewCount: 567
  },
  {
    id: "rec_044",
    name: {en: "Falafel Wrap", es: "Wrap de Falafel", fr: "Wrap au Falafel"},
    description: {en: "Crispy falafel in pita with fresh vegetables", es: "Falafel crujiente en pita con verduras frescas", fr: "Falafel croustillant en pita avec légumes frais"},
    type: "lunch", cuisine: ["middle-eastern"], prepTime: 15, cookTime: 15, totalTime: 30, servings: 4, difficulty: "medium",
    tags: ["vegetarian", "vegan", "mediterranean"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 wrap", calories: 380, protein: 14, carbs: 58, fat: 12, fiber: 10, sugar: 5, sodium: 620, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_065", quantity: 2, unit: "cup", preparation: "cooked and mashed", optional: false},
      {ingredientId: "ing_064", quantity: 4, unit: "piece", optional: false},
      {ingredientId: "ing_035", quantity: 2, unit: "cup", preparation: "shredded", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Form chickpea mixture into patties", es: "Forma mezcla de garbanzos en tortitas", fr: "Former mélange pois chiches en galettes"}, time: 10},
      {step: 2, text: {en: "Fry until golden and crispy", es: "Fríe hasta dorar", fr: "Frire jusqu'à doré"}, time: 10},
      {step: 3, text: {en: "Assemble in pita with vegetables", es: "Arma en pita con verduras", fr: "Assembler dans pita avec légumes"}, time: 5}
    ],
    tips: {en: "Serve with tahini sauce", es: "Sirve con salsa tahini", fr: "Servir avec sauce tahini"},
    equipment: ["pan", "bowl"],
    author: "foodie_team",
    dateAdded: "2025-02-11",
    rating: 4.7,
    reviewCount: 492
  },

  // DINNER (4 more to balance)
  {
    id: "rec_045",
    name: {en: "Stuffed Bell Peppers", es: "Pimientos Rellenos", fr: "Poivrons Farcis"},
    description: {en: "Bell peppers stuffed with rice and ground beef", es: "Pimientos rellenos de arroz y carne", fr: "Poivrons farcis au riz et bœuf"},
    type: "dinner", cuisine: ["american"], prepTime: 20, cookTime: 40, totalTime: 60, servings: 4, difficulty: "medium",
    tags: ["comfort-food", "family-dinner"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "2 peppers", calories: 420, protein: 28, carbs: 48, fat: 14, fiber: 6, sugar: 10, sodium: 680, cholesterol: 75},
    ingredients: [
      {ingredientId: "ing_031", quantity: 1, unit: "lb", optional: false},
      {ingredientId: "ing_086", quantity: 2, unit: "cup", preparation: "cooked", optional: false},
      {ingredientId: "ing_033", quantity: 1, unit: "cup", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cut peppers and remove seeds", es: "Corta pimientos y quita semillas", fr: "Couper poivrons et retirer graines"}, time: 10},
      {step: 2, text: {en: "Mix filling ingredients", es: "Mezcla ingredientes del relleno", fr: "Mélanger ingrédients de farce"}, time: 10},
      {step: 3, text: {en: "Stuff peppers and bake at 375°F for 40 minutes", es: "Rellena pimientos y hornea a 190°C por 40 minutos", fr: "Farcir poivrons et cuire à 190°C pendant 40 minutes"}, time: 40}
    ],
    tips: {en: "Top with cheese before baking", es: "Cubre con queso antes de hornear", fr: "Garnir de fromage avant cuisson"},
    equipment: ["oven", "baking dish", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-12",
    rating: 4.7,
    reviewCount: 634
  },
  {
    id: "rec_046",
    name: {en: "Shrimp Scampi", es: "Camarones al Ajillo", fr: "Crevettes Scampi"},
    description: {en: "Garlic butter shrimp with pasta", es: "Camarones en mantequilla de ajo con pasta", fr: "Crevettes au beurre d'ail avec pâtes"},
    type: "dinner", cuisine: ["italian"], prepTime: 10, cookTime: 15, totalTime: 25, servings: 4, difficulty: "easy",
    tags: ["seafood", "quick", "elegant"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1.5 cups", calories: 480, protein: 32, carbs: 52, fat: 16, fiber: 3, sugar: 3, sodium: 820, cholesterol: 245},
    ingredients: [
      {ingredientId: "ing_037", quantity: 1.5, unit: "lb", optional: false},
      {ingredientId: "ing_089", quantity: 12, unit: "oz", optional: false},
      {ingredientId: "ing_046", quantity: 4, unit: "tbsp", optional: false},
      {ingredientId: "ing_011", quantity: 4, unit: "clove", preparation: "minced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook pasta according to package", es: "Cocina pasta según paquete", fr: "Cuire pâtes selon paquet"}, time: 10},
      {step: 2, text: {en: "Sauté shrimp in garlic butter", es: "Saltea camarones en mantequilla de ajo", fr: "Faire sauter crevettes au beurre d'ail"}, time: 5},
      {step: 3, text: {en: "Toss with pasta", es: "Mezcla con pasta", fr: "Mélanger avec pâtes"}, time: 3}
    ],
    tips: {en: "Don't overcook shrimp", es: "No cocines de más los camarones", fr: "Ne pas trop cuire crevettes"},
    equipment: ["pot", "pan"],
    author: "foodie_team",
    dateAdded: "2025-02-13",
    rating: 4.8,
    reviewCount: 789
  },
  {
    id: "rec_047",
    name: {en: "Chicken Fajitas", es: "Fajitas de Pollo", fr: "Fajitas au Poulet"},
    description: {en: "Sizzling chicken fajitas with peppers and onions", es: "Fajitas de pollo con pimientos y cebollas", fr: "Fajitas de poulet aux poivrons et oignons"},
    type: "dinner", cuisine: ["mexican"], prepTime: 15, cookTime: 15, totalTime: 30, servings: 4, difficulty: "easy",
    tags: ["mexican", "quick", "family-friendly"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "2 fajitas", calories: 420, protein: 36, carbs: 48, fat: 10, fiber: 5, sugar: 6, sodium: 720, cholesterol: 95},
    ingredients: [
      {ingredientId: "ing_004", quantity: 1.5, unit: "lb", preparation: "sliced", optional: false},
      {ingredientId: "ing_009", quantity: 1, unit: "piece", preparation: "sliced", optional: false},
      {ingredientId: "ing_062", quantity: 8, unit: "piece", optional: false},
      {ingredientId: "ing_030", quantity: 0.5, unit: "cup", optional: true}
    ],
    instructions: [
      {step: 1, text: {en: "Slice chicken and vegetables", es: "Corta pollo y verduras", fr: "Trancher poulet et légumes"}, time: 10},
      {step: 2, text: {en: "Sauté chicken until cooked", es: "Saltea pollo hasta cocinar", fr: "Faire sauter poulet jusqu'à cuisson"}, time: 8},
      {step: 3, text: {en: "Add vegetables and cook until tender", es: "Agrega verduras y cocina hasta tiernas", fr: "Ajouter légumes et cuire jusqu'à tendres"}, time: 5},
      {step: 4, text: {en: "Serve in warm tortillas", es: "Sirve en tortillas tibias", fr: "Servir dans tortillas chaudes"}, time: 2}
    ],
    tips: {en: "Serve with sour cream and guacamole", es: "Sirve con crema y guacamole", fr: "Servir avec crème et guacamole"},
    equipment: ["pan", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-14",
    rating: 4.7,
    reviewCount: 712
  },
  {
    id: "rec_048",
    name: {en: "Eggplant Parmesan", es: "Berenjenas a la Parmesana", fr: "Aubergines Parmigiana"},
    description: {en: "Breaded eggplant layered with marinara and cheese", es: "Berenjenas empanizadas con marinara y queso", fr: "Aubergines panées avec marinara et fromage"},
    type: "dinner", cuisine: ["italian"], prepTime: 20, cookTime: 40, totalTime: 60, servings: 6, difficulty: "medium",
    tags: ["vegetarian", "comfort-food", "italian"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 serving", calories: 380, protein: 18, carbs: 42, fat: 16, fiber: 8, sugar: 12, sodium: 820, cholesterol: 55},
    ingredients: [
      {ingredientId: "ing_071", quantity: 2, unit: "piece", preparation: "sliced", optional: false},
      {ingredientId: "ing_033", quantity: 3, unit: "cup", optional: false},
      {ingredientId: "ing_050", quantity: 2, unit: "cup", optional: false},
      {ingredientId: "ing_034", quantity: 1, unit: "cup", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Slice and bread eggplant", es: "Corta y empaniza berenjenas", fr: "Trancher et paner aubergines"}, time: 15},
      {step: 2, text: {en: "Fry until golden", es: "Fríe hasta dorar", fr: "Frire jusqu'à doré"}, time: 10},
      {step: 3, text: {en: "Layer with sauce and cheese", es: "Coloca en capas con salsa y queso", fr: "Disposer en couches avec sauce et fromage"}, time: 5},
      {step: 4, text: {en: "Bake at 375°F for 30 minutes", es: "Hornea a 190°C por 30 minutos", fr: "Cuire à 190°C pendant 30 minutes"}, time: 30}
    ],
    tips: {en: "Salt eggplant to remove moisture", es: "Sala berenjenas para quitar humedad", fr: "Saler aubergines pour retirer humidité"},
    equipment: ["oven", "baking dish", "pan"],
    author: "foodie_team",
    dateAdded: "2025-02-15",
    rating: 4.6,
    reviewCount: 578
  },

  // DESSERT (2 more to reach good variety)
  {
    id: "rec_049",
    name: {en: "Chocolate Mousse", es: "Mousse de Chocolate", fr: "Mousse au Chocolat"},
    description: {en: "Rich and creamy chocolate mousse", es: "Mousse de chocolate rico y cremoso", fr: "Mousse au chocolat riche et crémeux"},
    type: "dessert", cuisine: ["french"], prepTime: 15, cookTime: 0, totalTime: 135, servings: 6, difficulty: "medium",
    tags: ["dessert", "elegant", "make-ahead"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1/2 cup", calories: 320, protein: 6, carbs: 28, fat: 22, fiber: 2, sugar: 24, sodium: 65, cholesterol: 185},
    ingredients: [
      {ingredientId: "ing_001", quantity: 4, unit: "piece", preparation: "separated", optional: false},
      {ingredientId: "ing_027", quantity: 0.5, unit: "cup", optional: false},
      {ingredientId: "ing_048", quantity: 1, unit: "cup", preparation: "heavy cream", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Melt chocolate and let cool", es: "Derrite chocolate y deja enfriar", fr: "Faire fondre chocolat et laisser refroidir"}, time: 10},
      {step: 2, text: {en: "Whip cream and fold into chocolate", es: "Bate crema y mezcla con chocolate", fr: "Fouetter crème et incorporer au chocolat"}, time: 10},
      {step: 3, text: {en: "Refrigerate for 2 hours", es: "Refrigera por 2 horas", fr: "Réfrigérer pendant 2 heures"}, time: 120}
    ],
    tips: {en: "Garnish with whipped cream", es: "Decora con crema batida", fr: "Garnir de crème fouettée"},
    equipment: ["bowl", "whisk", "double boiler"],
    author: "foodie_team",
    dateAdded: "2025-02-16",
    rating: 4.8,
    reviewCount: 645
  },
  {
    id: "rec_050",
    name: {en: "Fruit Salad", es: "Ensalada de Frutas", fr: "Salade de Fruits"},
    description: {en: "Fresh seasonal fruit salad", es: "Ensalada fresca de frutas de temporada", fr: "Salade de fruits frais de saison"},
    type: "dessert", cuisine: ["american"], prepTime: 15, cookTime: 0, totalTime: 15, servings: 6, difficulty: "easy",
    tags: ["healthy", "fresh", "vegan"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: true},
    nutrition: {servingSize: "1.5 cups", calories: 120, protein: 2, carbs: 30, fat: 1, fiber: 4, sugar: 24, sodium: 5, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_081", quantity: 2, unit: "cup", optional: false},
      {ingredientId: "ing_082", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_084", quantity: 2, unit: "cup", preparation: "cubed", optional: false},
      {ingredientId: "ing_085", quantity: 2, unit: "piece", preparation: "cubed", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Chop all fruit into bite-size pieces", es: "Corta toda la fruta en trozos", fr: "Couper tous fruits en morceaux"}, time: 10},
      {step: 2, text: {en: "Mix gently and serve chilled", es: "Mezcla suavemente y sirve frío", fr: "Mélanger doucement et servir frais"}, time: 5}
    ],
    tips: {en: "Add honey for sweetness", es: "Agrega miel para dulzura", fr: "Ajouter miel pour sucré"},
    equipment: ["bowl", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-17",
    rating: 4.5,
    reviewCount: 412
  }
];

// Add recipes
recipesData.recipes.push(...newRecipes);

console.log(`✅ Added ${newRecipes.length} recipes`);

// Write updated data
writeFileSync(RECIPES_FILE, JSON.stringify(recipesData, null, 2));

console.log(`\n📊 Final: ${recipesData.recipes.length} recipes (${Math.round(recipesData.recipes.length/50*100)}%)`);
console.log(`\n🎉 Phase 2 COMPLETE! All 50 recipes added!`);
