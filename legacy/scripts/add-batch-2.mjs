#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const recipesData = JSON.parse(readFileSync('./public/data/recipes.json', 'utf8'));
const ingredientsData = JSON.parse(readFileSync('./public/data/ingredients.json', 'utf8'));

console.log(`📊 Starting: ${recipesData.recipes.length} recipes, ${ingredientsData.ingredients.length} ingredients\n`);

// Add 30 more common ingredients (ing_036-065)
const newIngredients = [
  // Proteins
  { id: "ing_036", name: { en: "Salmon Fillet", es: "Filete de Salmón", fr: "Filet de Saumon" }, category: "protein", unit: "oz", avgPrice: 1.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: ["trout"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 2 days", es: "Refrigerar, usar dentro de 2 días", fr: "Réfrigérer, utiliser dans 2 jours" } },
  { id: "ing_037", name: { en: "Shrimp", es: "Camarones", fr: "Crevettes" }, category: "protein", unit: "lb", avgPrice: 8.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Keep frozen until ready to use", es: "Mantener congelado hasta usar", fr: "Garder congelé jusqu'à utilisation" } },
  { id: "ing_038", name: { en: "Bacon", es: "Tocino", fr: "Bacon" }, category: "protein", unit: "slice", avgPrice: 0.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: false }, alternatives: ["turkey bacon"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 7 days", es: "Refrigerar, usar dentro de 7 días", fr: "Réfrigérer, utiliser dans 7 jours" } },
  { id: "ing_039", name: { en: "Ground Turkey", es: "Pavo Molido", fr: "Dinde Hachée" }, category: "protein", unit: "lb", avgPrice: 4.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: ["ground chicken"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 2 days", es: "Refrigerar, usar dentro de 2 días", fr: "Réfrigérer, utiliser dans 2 jours" } },
  { id: "ing_040", name: { en: "Tofu", es: "Tofu", fr: "Tofu" }, category: "protein", unit: "oz", avgPrice: 0.30, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["tempeh"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate in water", es: "Refrigerar en agua", fr: "Réfrigérer dans l'eau" } },

  // Vegetables
  { id: "ing_041", name: { en: "Broccoli", es: "Brócoli", fr: "Brocoli" }, category: "vegetables", unit: "cup", avgPrice: 1.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["cauliflower"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate in crisper", es: "Refrigerar en cajón verduras", fr: "Réfrigérer dans bac légumes" } },
  { id: "ing_042", name: { en: "Carrot", es: "Zanahoria", fr: "Carotte" }, category: "vegetables", unit: "piece", avgPrice: 0.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_043", name: { en: "Cucumber", es: "Pepino", fr: "Concombre" }, category: "vegetables", unit: "piece", avgPrice: 0.75, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["summer"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_044", name: { en: "Zucchini", es: "Calabacín", fr: "Courgette" }, category: "vegetables", unit: "piece", avgPrice: 1.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["summer"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_045", name: { en: "Mushrooms", es: "Champiñones", fr: "Champignons" }, category: "vegetables", unit: "cup", avgPrice: 2.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate in paper bag", es: "Refrigerar en bolsa de papel", fr: "Réfrigérer dans sac papier" } },

  // Dairy & Cheese
  { id: "ing_046", name: { en: "Butter", es: "Mantequilla", fr: "Beurre" }, category: "dairy", unit: "tbsp", avgPrice: 0.20, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false }, alternatives: ["vegan butter"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_047", name: { en: "Milk", es: "Leche", fr: "Lait" }, category: "dairy", unit: "cup", avgPrice: 0.75, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false }, alternatives: ["oat milk"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_048", name: { en: "Cream Cheese", es: "Queso Crema", fr: "Fromage à la Crème" }, category: "dairy", unit: "oz", avgPrice: 0.40, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_049", name: { en: "Sour Cream", es: "Crema Agria", fr: "Crème Aigre" }, category: "dairy", unit: "cup", avgPrice: 1.20, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false }, alternatives: ["Greek yogurt"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },
  { id: "ing_050", name: { en: "Mozzarella", es: "Mozzarella", fr: "Mozzarella" }, category: "dairy", unit: "oz", avgPrice: 0.50, currency: "USD", region: "Italian", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: false, halal: false }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate", es: "Refrigerar", fr: "Réfrigérer" } },

  // Pantry & Spices
  { id: "ing_051", name: { en: "Soy Sauce", es: "Salsa de Soja", fr: "Sauce Soja" }, category: "pantry", unit: "tbsp", avgPrice: 0.15, currency: "USD", region: "Asian", tags: { glutenFree: false, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: ["tamari"], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_052", name: { en: "Brown Sugar", es: "Azúcar Morena", fr: "Cassonade" }, category: "pantry", unit: "cup", avgPrice: 0.70, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["coconut sugar"], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans récipient hermétique" } },
  { id: "ing_053", name: { en: "Baking Powder", es: "Polvo de Hornear", fr: "Levure Chimique" }, category: "pantry", unit: "tsp", avgPrice: 0.10, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dry place", es: "Guardar en lugar fresco y seco", fr: "Conserver au sec" } },
  { id: "ing_054", name: { en: "Vanilla Extract", es: "Extracto de Vainilla", fr: "Extrait de Vanille" }, category: "pantry", unit: "tsp", avgPrice: 0.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_055", name: { en: "Paprika", es: "Pimentón", fr: "Paprika" }, category: "spices", unit: "tsp", avgPrice: 0.15, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dark place", es: "Guardar en lugar fresco y oscuro", fr: "Conserver au frais et à l'ombre" } },
  { id: "ing_056", name: { en: "Oregano", es: "Orégano", fr: "Origan" }, category: "spices", unit: "tsp", avgPrice: 0.10, currency: "USD", region: "Mediterranean", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dark place", es: "Guardar en lugar fresco y oscuro", fr: "Conserver au frais et à l'ombre" } },
  { id: "ing_057", name: { en: "Basil", es: "Albahaca", fr: "Basilic" }, category: "spices", unit: "tbsp", avgPrice: 0.50, currency: "USD", region: "Mediterranean", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["summer"], storageInstructions: { en: "Refrigerate in damp towel", es: "Refrigerar en toalla húmeda", fr: "Réfrigérer dans serviette humide" } },
  { id: "ing_058", name: { en: "Ginger", es: "Jengibre", fr: "Gingembre" }, category: "spices", unit: "tbsp", avgPrice: 0.30, currency: "USD", region: "Asian", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["ginger powder"], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dry place", es: "Guardar en lugar fresco y seco", fr: "Conserver au sec" } },
  { id: "ing_059", name: { en: "Chili Powder", es: "Chile en Polvo", fr: "Poudre de Piment" }, category: "spices", unit: "tsp", avgPrice: 0.15, currency: "USD", region: "Mexican", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["cayenne"], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dark place", es: "Guardar en lugar fresco y oscuro", fr: "Conserver au frais et à l'ombre" } },
  { id: "ing_060", name: { en: "Cinnamon", es: "Canela", fr: "Cannelle" }, category: "spices", unit: "tsp", avgPrice: 0.10, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dark place", es: "Guardar en lugar fresco y oscuro", fr: "Conserver au frais et à l'ombre" } },

  // Grains & Bread
  { id: "ing_061", name: { en: "Quinoa", es: "Quinoa", fr: "Quinoa" }, category: "grains", unit: "cup", avgPrice: 1.50, currency: "USD", region: "South American", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["rice"], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans récipient hermétique" } },
  { id: "ing_062", name: { en: "Couscous", es: "Cuscús", fr: "Couscous" }, category: "grains", unit: "cup", avgPrice: 0.90, currency: "USD", region: "Mediterranean", tags: { glutenFree: false, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["quinoa"], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_063", name: { en: "Corn Tortilla", es: "Tortilla de Maíz", fr: "Tortilla de Maïs" }, category: "grains", unit: "piece", avgPrice: 0.25, currency: "USD", region: "Mexican", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store at room temperature", es: "Guardar a temperatura ambiente", fr: "Conserver à température ambiante" } },
  { id: "ing_064", name: { en: "Pita Bread", es: "Pan Pita", fr: "Pain Pita" }, category: "grains", unit: "piece", avgPrice: 0.60, currency: "USD", region: "Mediterranean", tags: { glutenFree: false, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store at room temperature", es: "Guardar a temperatura ambiente", fr: "Conserver à température ambiante" } },
  { id: "ing_065", name: { en: "Chickpeas", es: "Garbanzos", fr: "Pois Chiches" }, category: "protein", unit: "cup", avgPrice: 0.80, currency: "USD", region: "Mediterranean", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store dried in pantry", es: "Guardar secos en despensa", fr: "Conserver secs au garde-manger" } },
];

ingredientsData.ingredients.push(...newIngredients);
console.log(`✅ Added ${newIngredients.length} ingredients`);

// Add 15 more recipes (rec_010-024)
const newRecipes = [
  // BREAKFAST #7
  {
    id: "rec_010",
    name: {en: "Veggie Omelette", es: "Omelette de Verduras", fr: "Omelette aux Légumes"},
    description: {en: "Fluffy omelette with vegetables and cheese", es: "Omelette esponjoso con verduras y queso", fr: "Omelette moelleuse aux légumes et fromage"},
    type: "breakfast", cuisine: ["international"], prepTime: 5, cookTime: 8, totalTime: 13, servings: 1, difficulty: "easy",
    tags: ["vegetarian", "high-protein", "quick"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: true, keto: true, paleo: false},
    nutrition: {servingSize: "1 omelette", calories: 320, protein: 22, carbs: 8, fat: 23, fiber: 2, sugar: 4, sodium: 520, cholesterol: 395},
    ingredients: [
      {ingredientId: "ing_001", quantity: 3, unit: "piece", optional: false},
      {ingredientId: "ing_009", quantity: 0.25, unit: "piece", preparation: "diced", optional: false},
      {ingredientId: "ing_045", quantity: 0.25, unit: "cup", preparation: "sliced", optional: false},
      {ingredientId: "ing_029", quantity: 0.25, unit: "cup", preparation: "shredded", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Beat eggs with salt and pepper", es: "Bate huevos con sal y pimienta", fr: "Battre œufs avec sel et poivre"}, time: 2},
      {step: 2, text: {en: "Sauté vegetables in butter", es: "Saltea verduras en mantequilla", fr: "Faire revenir légumes au beurre"}, time: 3},
      {step: 3, text: {en: "Pour eggs over vegetables", es: "Vierte huevos sobre verduras", fr: "Verser œufs sur légumes"}, time: 1},
      {step: 4, text: {en: "Add cheese and fold", es: "Agrega queso y dobla", fr: "Ajouter fromage et plier"}, time: 4}
    ],
    tips: {en: "Don't overcook - keep it slightly runny", es: "No cocines demás - mantén ligeramente líquido", fr: "Ne pas trop cuire - garder légèrement coulant"},
    equipment: ["pan", "whisk"],
    author: "foodie_team",
    dateAdded: "2025-01-23",
    rating: 4.7,
    reviewCount: 398
  },

  // BREAKFAST #8
  {
    id: "rec_011",
    name: {en: "Breakfast Quesadilla", es: "Quesadilla de Desayuno", fr: "Quesadilla du Matin"},
    description: {en: "Crispy tortilla with eggs, cheese, and bacon", es: "Tortilla crujiente con huevos, queso y tocino", fr: "Tortilla croustillante avec œufs, fromage et bacon"},
    type: "breakfast", cuisine: ["mexican"], prepTime: 5, cookTime: 10, totalTime: 15, servings: 2, difficulty: "easy",
    tags: ["quick", "hearty"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 quesadilla", calories: 485, protein: 28, carbs: 32, fat: 27, fiber: 2, sugar: 2, sodium: 890, cholesterol: 425},
    ingredients: [
      {ingredientId: "ing_028", quantity: 4, unit: "piece", optional: false},
      {ingredientId: "ing_001", quantity: 4, unit: "piece", preparation: "scrambled", optional: false},
      {ingredientId: "ing_038", quantity: 4, unit: "slice", preparation: "cooked", optional: false},
      {ingredientId: "ing_029", quantity: 1, unit: "cup", preparation: "shredded", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook bacon until crispy", es: "Cocina tocino hasta crujiente", fr: "Cuire bacon jusqu'à croustillant"}, time: 5},
      {step: 2, text: {en: "Scramble eggs", es: "Revuelve huevos", fr: "Brouiller œufs"}, time: 3},
      {step: 3, text: {en: "Layer tortilla with eggs, bacon, cheese", es: "Coloca capas de huevo, tocino, queso en tortilla", fr: "Disposer œufs, bacon, fromage sur tortilla"}, time: 1},
      {step: 4, text: {en: "Fold and cook until crispy", es: "Dobla y cocina hasta crujiente", fr: "Plier et cuire jusqu'à croustillant"}, time: 4}
    ],
    tips: {en: "Serve with salsa and sour cream", es: "Sirve con salsa y crema agria", fr: "Servir avec salsa et crème aigre"},
    equipment: ["pan", "spatula"],
    author: "foodie_team",
    dateAdded: "2025-01-24",
    rating: 4.8,
    reviewCount: 456
  },

  // LUNCH #3
  {
    id: "rec_012",
    name: {en: "Grilled Chicken Wrap", es: "Wrap de Pollo a la Parrilla", fr: "Wrap au Poulet Grillé"},
    description: {en: "Healthy wrap with grilled chicken and vegetables", es: "Wrap saludable con pollo a la parrilla y verduras", fr: "Wrap sain avec poulet grillé et légumes"},
    type: "lunch", cuisine: ["american"], prepTime: 10, cookTime: 12, totalTime: 22, servings: 2, difficulty: "easy",
    tags: ["high-protein", "healthy"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 wrap", calories: 420, protein: 38, carbs: 42, fat: 12, fiber: 5, sugar: 4, sodium: 720, cholesterol: 85},
    ingredients: [
      {ingredientId: "ing_004", quantity: 8, unit: "oz", preparation: "grilled and sliced", optional: false},
      {ingredientId: "ing_028", quantity: 2, unit: "piece", optional: false},
      {ingredientId: "ing_035", quantity: 1, unit: "cup", preparation: "chopped", optional: false},
      {ingredientId: "ing_005", quantity: 1, unit: "piece", preparation: "sliced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Grill chicken breast until cooked", es: "Asa pechuga de pollo hasta cocinar", fr: "Griller poitrine de poulet jusqu'à cuisson"}, time: 12},
      {step: 2, text: {en: "Slice chicken", es: "Rebana pollo", fr: "Trancher poulet"}, time: 2},
      {step: 3, text: {en: "Layer tortilla with lettuce, tomato, chicken", es: "Coloca lechuga, tomate, pollo en tortilla", fr: "Disposer laitue, tomate, poulet sur tortilla"}, time: 3},
      {step: 4, text: {en: "Roll tightly and cut in half", es: "Enrolla firmemente y corta por mitad", fr: "Rouler fermement et couper en deux"}, time: 2}
    ],
    tips: {en: "Add ranch dressing for extra flavor", es: "Agrega aderezo ranch para más sabor", fr: "Ajouter vinaigrette ranch pour plus de saveur"},
    equipment: ["grill", "knife"],
    author: "foodie_team",
    dateAdded: "2025-01-25",
    rating: 4.6,
    reviewCount: 289
  },

  // LUNCH #4
  {
    id: "rec_013",
    name: {en: "BLT Sandwich", es: "Sándwich BLT", fr: "Sandwich BLT"},
    description: {en: "Classic bacon, lettuce, and tomato sandwich", es: "Clásico sándwich de tocino, lechuga y tomate", fr: "Sandwich classique bacon, laitue et tomate"},
    type: "lunch", cuisine: ["american"], prepTime: 8, cookTime: 7, totalTime: 15, servings: 2, difficulty: "easy",
    tags: ["classic", "quick"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 sandwich", calories: 445, protein: 18, carbs: 38, fat: 26, fiber: 4, sugar: 5, sodium: 920, cholesterol: 45},
    ingredients: [
      {ingredientId: "ing_038", quantity: 6, unit: "slice", preparation: "cooked crispy", optional: false},
      {ingredientId: "ing_020", quantity: 4, unit: "slice", preparation: "toasted", optional: false},
      {ingredientId: "ing_035", quantity: 2, unit: "leaf", optional: false},
      {ingredientId: "ing_005", quantity: 1, unit: "piece", preparation: "sliced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook bacon until crispy", es: "Cocina tocino hasta crujiente", fr: "Cuire bacon jusqu'à croustillant"}, time: 7},
      {step: 2, text: {en: "Toast bread", es: "Tuesta pan", fr: "Griller pain"}, time: 3},
      {step: 3, text: {en: "Layer bacon, lettuce, tomato", es: "Coloca tocino, lechuga, tomate en capas", fr: "Disposer bacon, laitue, tomate en couches"}, time: 3},
      {step: 4, text: {en: "Add mayo and top with bread", es: "Agrega mayonesa y cubre con pan", fr: "Ajouter mayo et couvrir de pain"}, time: 2}
    ],
    tips: {en: "Use thick-cut bacon for best flavor", es: "Usa tocino grueso para mejor sabor", fr: "Utiliser bacon épais pour meilleure saveur"},
    equipment: ["pan", "toaster"],
    author: "foodie_team",
    dateAdded: "2025-01-26",
    rating: 4.7,
    reviewCount: 567
  },

  // LUNCH #5
  {
    id: "rec_014",
    name: {en: "Tuna Melt", es: "Tostada de Atún Fundido", fr: "Croque Thon"},
    description: {en: "Hot tuna sandwich with melted cheese", es: "Sándwich caliente de atún con queso fundido", fr: "Sandwich chaud au thon avec fromage fondu"},
    type: "lunch", cuisine: ["american"], prepTime: 8, cookTime: 5, totalTime: 13, servings: 2, difficulty: "easy",
    tags: ["quick", "comfort-food"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 sandwich", calories: 465, protein: 32, carbs: 36, fat: 22, fiber: 3, sugar: 4, sodium: 890, cholesterol: 65},
    ingredients: [
      {ingredientId: "ing_020", quantity: 4, unit: "slice", optional: false},
      {ingredientId: "ing_029", quantity: 4, unit: "slice", optional: false},
      {ingredientId: "ing_005", quantity: 1, unit: "piece", preparation: "sliced", optional: true}
    ],
    instructions: [
      {step: 1, text: {en: "Mix tuna with mayo", es: "Mezcla atún con mayonesa", fr: "Mélanger thon avec mayo"}, time: 3},
      {step: 2, text: {en: "Spread on bread", es: "Unta en pan", fr: "Étaler sur pain"}, time: 2},
      {step: 3, text: {en: "Top with cheese and tomato", es: "Cubre con queso y tomate", fr: "Garnir de fromage et tomate"}, time: 1},
      {step: 4, text: {en: "Broil until cheese melts", es: "Gratina hasta que queso se derrita", fr: "Gratin jusqu'à fromage fondu"}, time: 5}
    ],
    tips: {en: "Add pickles for tang", es: "Agrega pepinillos para acidez", fr: "Ajouter cornichons pour acidité"},
    equipment: ["oven", "bowl"],
    author: "foodie_team",
    dateAdded: "2025-01-27",
    rating: 4.5,
    reviewCount: 334
  },

  // DINNER #2
  {
    id: "rec_015",
    name: {en: "Grilled Salmon", es: "Salmón a la Parrilla", fr: "Saumon Grillé"},
    description: {en: "Perfectly grilled salmon with lemon and herbs", es: "Salmón perfectamente asado con limón y hierbas", fr: "Saumon parfaitement grillé au citron et herbes"},
    type: "dinner", cuisine: ["mediterranean"], prepTime: 5, cookTime: 12, totalTime: 17, servings: 4, difficulty: "easy",
    tags: ["healthy", "high-protein", "omega-3"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: true, paleo: true},
    nutrition: {servingSize: "6 oz", calories: 385, protein: 42, carbs: 2, fat: 22, fiber: 0, sugar: 1, sodium: 320, cholesterol: 95},
    ingredients: [
      {ingredientId: "ing_036", quantity: 24, unit: "oz", optional: false},
      {ingredientId: "ing_003", quantity: 2, unit: "tbsp", optional: false},
      {ingredientId: "ing_010", quantity: 1, unit: "piece", preparation: "sliced", optional: false},
      {ingredientId: "ing_006", quantity: 2, unit: "clove", preparation: "minced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Pat salmon dry and season", es: "Seca salmón y sazona", fr: "Sécher saumon et assaisonner"}, time: 2},
      {step: 2, text: {en: "Brush with olive oil and garlic", es: "Pincela con aceite de oliva y ajo", fr: "Badigeonner d'huile d'olive et ail"}, time: 2},
      {step: 3, text: {en: "Grill skin-side down 6 minutes", es: "Asa con piel hacia abajo 6 minutos", fr: "Griller côté peau 6 minutes"}, time: 6},
      {step: 4, text: {en: "Flip and grill 4-6 minutes more", es: "Voltea y asa 4-6 minutos más", fr: "Retourner et griller 4-6 minutes"}, time: 5},
      {step: 5, text: {en: "Serve with lemon wedges", es: "Sirve con rodajas de limón", fr: "Servir avec quartiers de citron"}, time: 1}
    ],
    tips: {en: "Don't overcook - salmon should be slightly pink inside", es: "No cocines demás - salmón debe estar rosado adentro", fr: "Ne pas trop cuire - saumon doit être rosé à l'intérieur"},
    equipment: ["grill", "tongs"],
    author: "foodie_team",
    dateAdded: "2025-01-28",
    rating: 4.9,
    reviewCount: 678
  },

  // DINNER #3
  {
    id: "rec_016",
    name: {en: "Beef Stir Fry", es: "Salteado de Res", fr: "Sauté de Bœuf"},
    description: {en: "Quick Asian beef stir fry with vegetables", es: "Salteado rápido asiático de res con verduras", fr: "Sauté asiatique rapide de bœuf aux légumes"},
    type: "dinner", cuisine: ["asian", "chinese"], prepTime: 15, cookTime: 12, totalTime: 27, servings: 4, difficulty: "medium",
    tags: ["quick", "high-protein"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: false, paleo: true},
    nutrition: {servingSize: "1.5 cups", calories: 420, protein: 36, carbs: 18, fat: 24, fiber: 4, sugar: 8, sodium: 890, cholesterol: 95},
    ingredients: [
      {ingredientId: "ing_031", quantity: 1.5, unit: "lb", preparation: "sliced thin", optional: false},
      {ingredientId: "ing_041", quantity: 2, unit: "cup", preparation: "florets", optional: false},
      {ingredientId: "ing_009", quantity: 2, unit: "piece", preparation: "sliced", optional: false},
      {ingredientId: "ing_051", quantity: 3, unit: "tbsp", optional: false},
      {ingredientId: "ing_058", quantity: 1, unit: "tbsp", preparation: "grated", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Slice beef thin against grain", es: "Rebana res finamente contra fibra", fr: "Trancher bœuf finement contre grain"}, time: 8},
      {step: 2, text: {en: "Heat wok over high heat", es: "Calienta wok a fuego alto", fr: "Chauffer wok à feu vif"}, time: 2},
      {step: 3, text: {en: "Stir-fry beef until browned", es: "Saltea res hasta dorar", fr: "Faire sauter bœuf jusqu'à doré"}, time: 4},
      {step: 4, text: {en: "Add vegetables and stir-fry", es: "Agrega verduras y saltea", fr: "Ajouter légumes et faire sauter"}, time: 5},
      {step: 5, text: {en: "Add soy sauce and ginger, toss", es: "Agrega salsa soja y jengibre, mezcla", fr: "Ajouter sauce soja et gingembre, mélanger"}, time: 2}
    ],
    tips: {en: "Serve over rice or noodles", es: "Sirve sobre arroz o fideos", fr: "Servir sur riz ou nouilles"},
    equipment: ["wok", "knife"],
    author: "foodie_team",
    dateAdded: "2025-01-29",
    rating: 4.7,
    reviewCount: 445
  },

  // DINNER #4
  {
    id: "rec_017",
    name: {en: "Shrimp Tacos", es: "Tacos de Camarón", fr: "Tacos aux Crevettes"},
    description: {en: "Spicy grilled shrimp tacos with cabbage slaw", es: "Tacos picantes de camarón a la parrilla con ensalada de col", fr: "Tacos épicés aux crevettes grillées avec salade de chou"},
    type: "dinner", cuisine: ["mexican"], prepTime: 15, cookTime: 8, totalTime: 23, servings: 4, difficulty: "easy",
    tags: ["seafood", "quick", "fresh"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "3 tacos", calories: 385, protein: 28, carbs: 42, fat: 12, fiber: 6, sugar: 4, sodium: 820, cholesterol: 165},
    ingredients: [
      {ingredientId: "ing_037", quantity: 1, unit: "lb", preparation: "peeled", optional: false},
      {ingredientId: "ing_063", quantity: 12, unit: "piece", optional: false},
      {ingredientId: "ing_059", quantity: 2, unit: "tsp", optional: false},
      {ingredientId: "ing_010", quantity: 2, unit: "piece", preparation: "juiced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Season shrimp with chili powder and lime", es: "Sazona camarones con chile en polvo y limón", fr: "Assaisonner crevettes avec piment et citron vert"}, time: 5},
      {step: 2, text: {en: "Grill shrimp 2-3 minutes per side", es: "Asa camarones 2-3 minutos por lado", fr: "Griller crevettes 2-3 minutes par côté"}, time: 6},
      {step: 3, text: {en: "Warm tortillas", es: "Calienta tortillas", fr: "Réchauffer tortillas"}, time: 2},
      {step: 4, text: {en: "Assemble tacos with shrimp and slaw", es: "Arma tacos con camarones y ensalada", fr: "Assembler tacos avec crevettes et salade"}, time: 5}
    ],
    tips: {en: "Add avocado and cilantro for freshness", es: "Agrega aguacate y cilantro para frescura", fr: "Ajouter avocat et coriandre pour fraîcheur"},
    equipment: ["grill", "bowl"],
    author: "foodie_team",
    dateAdded: "2025-01-30",
    rating: 4.8,
    reviewCount: 512
  },

  // DINNER #5
  {
    id: "rec_018",
    name: {en: "Baked Chicken Breast", es: "Pechuga de Pollo al Horno", fr: "Poitrine de Poulet au Four"},
    description: {en: "Simple oven-baked chicken breast with herbs", es: "Pechuga de pollo simple al horno con hierbas", fr: "Simple poitrine de poulet au four aux herbes"},
    type: "dinner", cuisine: ["international"], prepTime: 5, cookTime: 25, totalTime: 30, servings: 4, difficulty: "easy",
    tags: ["healthy", "high-protein", "simple"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: true, paleo: true},
    nutrition: {servingSize: "1 breast", calories: 285, protein: 42, carbs: 2, fat: 11, fiber: 0, sugar: 0, sodium: 420, cholesterol: 125},
    ingredients: [
      {ingredientId: "ing_004", quantity: 2, unit: "lb", optional: false},
      {ingredientId: "ing_003", quantity: 2, unit: "tbsp", optional: false},
      {ingredientId: "ing_056", quantity: 1, unit: "tsp", optional: false},
      {ingredientId: "ing_055", quantity: 1, unit: "tsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Preheat oven to 400°F", es: "Precalienta horno a 200°C", fr: "Préchauffer four à 200°C"}, time: 10},
      {step: 2, text: {en: "Brush chicken with olive oil", es: "Pincela pollo con aceite de oliva", fr: "Badigeonner poulet d'huile d'olive"}, time: 2},
      {step: 3, text: {en: "Season with oregano, paprika, salt, pepper", es: "Sazona con orégano, pimentón, sal, pimienta", fr: "Assaisonner avec origan, paprika, sel, poivre"}, time: 2},
      {step: 4, text: {en: "Bake 20-25 minutes until cooked through", es: "Hornea 20-25 minutos hasta cocinar", fr: "Cuire au four 20-25 minutes jusqu'à cuisson"}, time: 23}
    ],
    tips: {en: "Use meat thermometer - internal temp should be 165°F", es: "Usa termómetro - temperatura interna debe ser 75°C", fr: "Utiliser thermomètre - température interne 75°C"},
    equipment: ["baking-sheet", "brush"],
    author: "foodie_team",
    dateAdded: "2025-01-31",
    rating: 4.6,
    reviewCount: 523
  },

  // SNACK #1
  {
    id: "rec_019",
    name: {en: "Guacamole", es: "Guacamole", fr: "Guacamole"},
    description: {en: "Fresh homemade guacamole with chips", es: "Guacamole casero fresco con totopos", fr: "Guacamole maison frais avec chips"},
    type: "snack", cuisine: ["mexican"], prepTime: 10, cookTime: 0, totalTime: 10, servings: 4, difficulty: "easy",
    tags: ["vegan", "vegetarian", "no-cook", "fresh"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: true, keto: true, paleo: true},
    nutrition: {servingSize: "0.5 cup", calories: 185, protein: 3, carbs: 12, fat: 15, fiber: 8, sugar: 2, sodium: 280, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_014", quantity: 3, unit: "piece", preparation: "ripe", optional: false},
      {ingredientId: "ing_010", quantity: 1, unit: "piece", preparation: "juiced", optional: false},
      {ingredientId: "ing_005", quantity: 1, unit: "piece", preparation: "diced", optional: true},
      {ingredientId: "ing_008", quantity: 0.25, unit: "piece", preparation: "diced", optional: true}
    ],
    instructions: [
      {step: 1, text: {en: "Mash avocados in bowl", es: "Machaca aguacates en tazón", fr: "Écraser avocats dans bol"}, time: 3},
      {step: 2, text: {en: "Add lime juice immediately", es: "Agrega jugo de limón inmediatamente", fr: "Ajouter jus de citron vert immédiatement"}, time: 1},
      {step: 3, text: {en: "Mix in tomato, onion, salt", es: "Mezcla tomate, cebolla, sal", fr: "Mélanger tomate, oignon, sel"}, time: 3},
      {step: 4, text: {en: "Serve with tortilla chips", es: "Sirve con totopos", fr: "Servir avec chips de tortilla"}, time: 2}
    ],
    tips: {en: "Add jalapeño for spice", es: "Agrega jalapeño para picante", fr: "Ajouter jalapeño pour épicé"},
    equipment: ["bowl", "fork"],
    author: "foodie_team",
    dateAdded: "2025-02-01",
    rating: 4.9,
    reviewCount: 789
  },

  // SNACK #2
  {
    id: "rec_020",
    name: {en: "Caprese Skewers", es: "Brochetas Caprese", fr: "Brochettes Caprese"},
    description: {en: "Fresh mozzarella, tomato, and basil skewers", es: "Brochetas de mozzarella fresca, tomate y albahaca", fr: "Brochettes de mozzarella fraîche, tomate et basilic"},
    type: "snack", cuisine: ["italian"], prepTime: 10, cookTime: 0, totalTime: 10, servings: 4, difficulty: "easy",
    tags: ["vegetarian", "no-cook", "elegant"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: true, keto: true, paleo: false},
    nutrition: {servingSize: "3 skewers", calories: 245, protein: 14, carbs: 8, fat: 18, fiber: 2, sugar: 4, sodium: 420, cholesterol: 45},
    ingredients: [
      {ingredientId: "ing_050", quantity: 8, unit: "oz", preparation: "cubed", optional: false},
      {ingredientId: "ing_005", quantity: 12, unit: "piece", preparation: "cherry tomatoes", optional: false},
      {ingredientId: "ing_057", quantity: 12, unit: "leaf", preparation: "fresh", optional: false},
      {ingredientId: "ing_003", quantity: 2, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Thread mozzarella, tomato, basil on skewers", es: "Ensarta mozzarella, tomate, albahaca en palillos", fr: "Enfiler mozzarella, tomate, basilic sur piques"}, time: 8},
      {step: 2, text: {en: "Drizzle with olive oil", es: "Rocía con aceite de oliva", fr: "Arroser d'huile d'olive"}, time: 1},
      {step: 3, text: {en: "Season with salt and pepper", es: "Sazona con sal y pimienta", fr: "Assaisonner de sel et poivre"}, time: 1}
    ],
    tips: {en: "Add balsamic glaze for sweetness", es: "Agrega glaseado balsámico para dulzura", fr: "Ajouter glaçage balsamique pour douceur"},
    equipment: ["skewers"],
    author: "foodie_team",
    dateAdded: "2025-02-02",
    rating: 4.8,
    reviewCount: 623
  },

  // LUNCH #6
  {
    id: "rec_021",
    name: {en: "Quinoa Buddha Bowl", es: "Bowl Buddha de Quinoa", fr: "Bol Buddha au Quinoa"},
    description: {en: "Healthy grain bowl with quinoa and roasted vegetables", es: "Bowl saludable de granos con quinoa y verduras asadas", fr: "Bol de grains sain avec quinoa et légumes rôtis"},
    type: "lunch", cuisine: ["international"], prepTime: 15, cookTime: 30, totalTime: 45, servings: 2, difficulty: "medium",
    tags: ["vegan", "vegetarian", "healthy", "protein-rich"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 bowl", calories: 485, protein: 18, carbs: 68, fat: 18, fiber: 12, sugar: 8, sodium: 420, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_061", quantity: 1, unit: "cup", preparation: "cooked", optional: false},
      {ingredientId: "ing_065", quantity: 1, unit: "cup", preparation: "cooked", optional: false},
      {ingredientId: "ing_041", quantity: 2, unit: "cup", preparation: "roasted", optional: false},
      {ingredientId: "ing_014", quantity: 1, unit: "piece", preparation: "sliced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook quinoa according to package", es: "Cocina quinoa según paquete", fr: "Cuire quinoa selon paquet"}, time: 15},
      {step: 2, text: {en: "Roast vegetables with olive oil", es: "Asa verduras con aceite de oliva", fr: "Rôtir légumes à l'huile d'olive"}, time: 25},
      {step: 3, text: {en: "Assemble bowl with quinoa, chickpeas, vegetables", es: "Arma bowl con quinoa, garbanzos, verduras", fr: "Assembler bol avec quinoa, pois chiches, légumes"}, time: 5},
      {step: 4, text: {en: "Top with avocado", es: "Cubre con aguacate", fr: "Garnir d'avocat"}, time: 2}
    ],
    tips: {en: "Add tahini dressing for extra flavor", es: "Agrega aderezo de tahini para más sabor", fr: "Ajouter vinaigrette tahini pour plus de saveur"},
    equipment: ["pot", "baking-sheet"],
    author: "foodie_team",
    dateAdded: "2025-02-03",
    rating: 4.8,
    reviewCount: 567
  },

  // LUNCH #7
  {
    id: "rec_022",
    name: {en: "Chicken Quesadilla", es: "Quesadilla de Pollo", fr: "Quesadilla au Poulet"},
    description: {en: "Cheesy quesadilla with seasoned chicken", es: "Quesadilla con queso y pollo sazonado", fr: "Quesadilla au fromage avec poulet assaisonné"},
    type: "lunch", cuisine: ["mexican"], prepTime: 10, cookTime: 10, totalTime: 20, servings: 2, difficulty: "easy",
    tags: ["quick", "kid-friendly"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 quesadilla", calories: 520, protein: 38, carbs: 42, fat: 22, fiber: 3, sugar: 2, sodium: 920, cholesterol: 95},
    ingredients: [
      {ingredientId: "ing_004", quantity: 8, unit: "oz", preparation: "cooked and shredded", optional: false},
      {ingredientId: "ing_028", quantity: 4, unit: "piece", optional: false},
      {ingredientId: "ing_029", quantity: 2, unit: "cup", preparation: "shredded", optional: false},
      {ingredientId: "ing_030", quantity: 4, unit: "tbsp", optional: true}
    ],
    instructions: [
      {step: 1, text: {en: "Heat tortilla in pan", es: "Calienta tortilla en sartén", fr: "Chauffer tortilla dans poêle"}, time: 1},
      {step: 2, text: {en: "Add cheese and chicken to half", es: "Agrega queso y pollo a la mitad", fr: "Ajouter fromage et poulet sur moitié"}, time: 2},
      {step: 3, text: {en: "Fold and cook until crispy", es: "Dobla y cocina hasta crujiente", fr: "Plier et cuire jusqu'à croustillant"}, time: 7},
      {step: 4, text: {en: "Cut into wedges and serve", es: "Corta en triángulos y sirve", fr: "Couper en triangles et servir"}, time: 2}
    ],
    tips: {en: "Serve with sour cream and guacamole", es: "Sirve con crema agria y guacamole", fr: "Servir avec crème aigre et guacamole"},
    equipment: ["pan", "spatula"],
    author: "foodie_team",
    dateAdded: "2025-02-04",
    rating: 4.7,
    reviewCount: 678
  },

  // LUNCH #8
  {
    id: "rec_023",
    name: {en: "Greek Pita Pocket", es: "Pita Griego", fr: "Pita Grec"},
    description: {en: "Pita stuffed with chicken, vegetables, and tzatziki", es: "Pita relleno de pollo, verduras y tzatziki", fr: "Pita farci de poulet, légumes et tzatziki"},
    type: "lunch", cuisine: ["mediterranean", "greek"], prepTime: 10, cookTime: 12, totalTime: 22, servings: 2, difficulty: "easy",
    tags: ["healthy", "fresh"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 pita", calories: 445, protein: 36, carbs: 48, fat: 14, fiber: 6, sugar: 5, sodium: 720, cholesterol: 85},
    ingredients: [
      {ingredientId: "ing_064", quantity: 2, unit: "piece", optional: false},
      {ingredientId: "ing_004", quantity: 8, unit: "oz", preparation: "grilled", optional: false},
      {ingredientId: "ing_043", quantity: 0.5, unit: "piece", preparation: "diced", optional: false},
      {ingredientId: "ing_005", quantity: 1, unit: "piece", preparation: "diced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Grill chicken breast", es: "Asa pechuga de pollo", fr: "Griller poitrine de poulet"}, time: 12},
      {step: 2, text: {en: "Slice chicken", es: "Rebana pollo", fr: "Trancher poulet"}, time: 2},
      {step: 3, text: {en: "Fill pita with chicken, cucumber, tomato", es: "Rellena pita con pollo, pepino, tomate", fr: "Remplir pita avec poulet, concombre, tomate"}, time: 3},
      {step: 4, text: {en: "Add tzatziki sauce", es: "Agrega salsa tzatziki", fr: "Ajouter sauce tzatziki"}, time: 2}
    ],
    tips: {en: "Add feta cheese for extra flavor", es: "Agrega queso feta para más sabor", fr: "Ajouter fromage feta pour plus de saveur"},
    equipment: ["grill", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-05",
    rating: 4.8,
    reviewCount: 489
  },

  // LUNCH #9
  {
    id: "rec_024",
    name: {en: "Veggie Burger", es: "Hamburguesa Vegetariana", fr: "Burger Végétarien"},
    description: {en: "Hearty black bean and quinoa veggie burger", es: "Hamburguesa sustanciosa de frijoles negros y quinoa", fr: "Burger végétarien copieux aux haricots noirs et quinoa"},
    type: "lunch", cuisine: ["american"], prepTime: 15, cookTime: 12, totalTime: 27, servings: 4, difficulty: "medium",
    tags: ["vegetarian", "vegan", "protein-rich"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 burger", calories: 385, protein: 16, carbs: 58, fat: 11, fiber: 12, sugar: 6, sodium: 680, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_013", quantity: 2, unit: "cup", preparation: "cooked", optional: false},
      {ingredientId: "ing_061", quantity: 1, unit: "cup", preparation: "cooked", optional: false},
      {ingredientId: "ing_008", quantity: 0.5, unit: "piece", preparation: "diced", optional: false},
      {ingredientId: "ing_015", quantity: 2, unit: "tsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Mash beans and quinoa in bowl", es: "Machaca frijoles y quinoa en tazón", fr: "Écraser haricots et quinoa dans bol"}, time: 5},
      {step: 2, text: {en: "Mix in onion and spices", es: "Mezcla cebolla y especias", fr: "Mélanger oignon et épices"}, time: 3},
      {step: 3, text: {en: "Form into 4 patties", es: "Forma 4 hamburguesas", fr: "Former 4 galettes"}, time: 5},
      {step: 4, text: {en: "Cook in pan 5-6 minutes per side", es: "Cocina en sartén 5-6 minutos por lado", fr: "Cuire à la poêle 5-6 minutes par côté"}, time: 12}
    ],
    tips: {en: "Chill patties before cooking for easier handling", es: "Refrigera hamburguesas antes de cocinar para manejar mejor", fr: "Réfrigérer galettes avant cuisson pour manipulation facile"},
    equipment: ["bowl", "pan"],
    author: "foodie_team",
    dateAdded: "2025-02-06",
    rating: 4.6,
    reviewCount: 434
  }
];

recipesData.recipes.push(...newRecipes);
console.log(`✅ Added ${newRecipes.length} recipes`);

// Save
writeFileSync('./public/data/recipes.json', JSON.stringify(recipesData, null, 2));
writeFileSync('./public/data/ingredients.json', JSON.stringify(ingredientsData, null, 2));

console.log(`\n📊 Final: ${recipesData.recipes.length} recipes (${Math.round(recipesData.recipes.length/50*100)}%), ${ingredientsData.ingredients.length} ingredients (${Math.round(ingredientsData.ingredients.length/100*100)}%)`);
console.log(`✨ Phase 2 Progress: ~50% complete!`);
