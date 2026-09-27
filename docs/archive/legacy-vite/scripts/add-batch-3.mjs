#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const RECIPES_FILE = './public/data/recipes.json';
const INGREDIENTS_FILE = './public/data/ingredients.json';

// Read existing data
const recipesData = JSON.parse(readFileSync(RECIPES_FILE, 'utf8'));
const ingredientsData = JSON.parse(readFileSync(INGREDIENTS_FILE, 'utf8'));

console.log(`📊 Starting: ${recipesData.recipes.length} recipes, ${ingredientsData.ingredients.length} ingredients\n`);

// Add 35 more ingredients (ing_066-100) to reach 100
const newIngredients = [
  // Proteins (ing_066-070)
  { id: "ing_066", name: { en: "Pork Chop", es: "Chuleta de Cerdo", fr: "Côtelette de Porc" }, category: "protein", unit: "piece", avgPrice: 3.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: false }, alternatives: ["chicken breast"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 3 days", es: "Refrigerar, usar en 3 días", fr: "Réfrigérer, utiliser sous 3 jours" } },
  { id: "ing_067", name: { en: "Lamb Chop", es: "Chuleta de Cordero", fr: "Côtelette d'Agneau" }, category: "protein", unit: "piece", avgPrice: 6.00, currency: "USD", region: "Mediterranean", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["beef steak"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 3 days", es: "Refrigerar, usar en 3 días", fr: "Réfrigérer, utiliser sous 3 jours" } },
  { id: "ing_068", name: { en: "Duck Breast", es: "Pechuga de Pato", fr: "Magret de Canard" }, category: "protein", unit: "piece", avgPrice: 8.00, currency: "USD", region: "French", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: ["chicken breast"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate, use within 2 days", es: "Refrigerar, usar en 2 días", fr: "Réfrigérer, utiliser sous 2 jours" } },
  { id: "ing_069", name: { en: "Scallops", es: "Vieiras", fr: "Coquilles Saint-Jacques" }, category: "protein", unit: "lb", avgPrice: 18.00, currency: "USD", region: "Coastal", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: false }, alternatives: ["shrimp"], seasonality: ["year-round"], storageInstructions: { en: "Keep refrigerated, use within 1 day", es: "Mantener refrigerado, usar en 1 día", fr: "Garder réfrigéré, utiliser sous 1 jour" } },
  { id: "ing_070", name: { en: "Tuna Steak", es: "Filete de Atún", fr: "Steak de Thon" }, category: "protein", unit: "piece", avgPrice: 12.00, currency: "USD", region: "Coastal", tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: false, halal: true }, alternatives: ["salmon"], seasonality: ["year-round"], storageInstructions: { en: "Keep refrigerated, use within 2 days", es: "Mantener refrigerado, usar en 2 días", fr: "Garder réfrigéré, utiliser sous 2 jours" } },

  // Vegetables (ing_071-080)
  { id: "ing_071", name: { en: "Eggplant", es: "Berenjena", fr: "Aubergine" }, category: "vegetables", unit: "piece", avgPrice: 2.00, currency: "USD", region: "Mediterranean", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["zucchini"], seasonality: ["summer", "fall"], storageInstructions: { en: "Store at room temperature", es: "Guardar a temperatura ambiente", fr: "Conserver à température ambiante" } },
  { id: "ing_072", name: { en: "Cauliflower", es: "Coliflor", fr: "Chou-fleur" }, category: "vegetables", unit: "head", avgPrice: 3.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["broccoli"], seasonality: ["fall", "winter"], storageInstructions: { en: "Refrigerate in crisper", es: "Refrigerar en cajón", fr: "Réfrigérer dans bac" } },
  { id: "ing_073", name: { en: "Kale", es: "Col Rizada", fr: "Chou Frisé" }, category: "vegetables", unit: "cup", avgPrice: 2.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["spinach"], seasonality: ["fall", "winter"], storageInstructions: { en: "Refrigerate in crisper", es: "Refrigerar en cajón", fr: "Réfrigérer dans bac" } },
  { id: "ing_074", name: { en: "Asparagus", es: "Espárragos", fr: "Asperges" }, category: "vegetables", unit: "bunch", avgPrice: 4.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["green beans"], seasonality: ["spring"], storageInstructions: { en: "Refrigerate upright in water", es: "Refrigerar vertical en agua", fr: "Réfrigérer debout dans l'eau" } },
  { id: "ing_075", name: { en: "Brussels Sprouts", es: "Coles de Bruselas", fr: "Choux de Bruxelles" }, category: "vegetables", unit: "cup", avgPrice: 3.50, currency: "USD", region: "European", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["cabbage"], seasonality: ["fall", "winter"], storageInstructions: { en: "Refrigerate in crisper", es: "Refrigerar en cajón", fr: "Réfrigérer dans bac" } },
  { id: "ing_076", name: { en: "Sweet Potato", es: "Batata", fr: "Patate Douce" }, category: "vegetables", unit: "piece", avgPrice: 1.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["regular potato"], seasonality: ["fall", "winter"], storageInstructions: { en: "Store in cool, dark place", es: "Guardar en lugar fresco y oscuro", fr: "Conserver au frais et à l'abri" } },
  { id: "ing_077", name: { en: "Corn", es: "Maíz", fr: "Maïs" }, category: "vegetables", unit: "cup", avgPrice: 2.00, currency: "USD", region: "American", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["summer"], storageInstructions: { en: "Refrigerate in husk", es: "Refrigerar con hoja", fr: "Réfrigérer dans feuille" } },
  { id: "ing_078", name: { en: "Green Beans", es: "Judías Verdes", fr: "Haricots Verts" }, category: "vegetables", unit: "cup", avgPrice: 2.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["asparagus"], seasonality: ["summer"], storageInstructions: { en: "Refrigerate in crisper", es: "Refrigerar en cajón", fr: "Réfrigérer dans bac" } },
  { id: "ing_079", name: { en: "Cabbage", es: "Repollo", fr: "Chou" }, category: "vegetables", unit: "cup", avgPrice: 1.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["lettuce"], seasonality: ["fall", "winter"], storageInstructions: { en: "Refrigerate whole", es: "Refrigerar entero", fr: "Réfrigérer entier" } },
  { id: "ing_080", name: { en: "Celery", es: "Apio", fr: "Céleri" }, category: "vegetables", unit: "stalk", avgPrice: 0.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate in crisper", es: "Refrigerar en cajón", fr: "Réfrigérer dans bac" } },

  // Fruits (ing_081-085)
  { id: "ing_081", name: { en: "Strawberry", es: "Fresa", fr: "Fraise" }, category: "fruits", unit: "cup", avgPrice: 4.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["blueberries"], seasonality: ["spring", "summer"], storageInstructions: { en: "Refrigerate, wash before eating", es: "Refrigerar, lavar antes de comer", fr: "Réfrigérer, laver avant de manger" } },
  { id: "ing_082", name: { en: "Blueberry", es: "Arándano", fr: "Myrtille" }, category: "fruits", unit: "cup", avgPrice: 5.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["strawberries"], seasonality: ["summer"], storageInstructions: { en: "Refrigerate, don't wash until ready", es: "Refrigerar, no lavar hasta usar", fr: "Réfrigérer, ne pas laver avant usage" } },
  { id: "ing_083", name: { en: "Apple", es: "Manzana", fr: "Pomme" }, category: "fruits", unit: "piece", avgPrice: 1.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["pear"], seasonality: ["fall", "winter"], storageInstructions: { en: "Refrigerate for longer storage", es: "Refrigerar para más tiempo", fr: "Réfrigérer pour conservation" } },
  { id: "ing_084", name: { en: "Pineapple", es: "Piña", fr: "Ananas" }, category: "fruits", unit: "cup", avgPrice: 3.50, currency: "USD", region: "Tropical", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["mango"], seasonality: ["year-round"], storageInstructions: { en: "Store at room temp until ripe", es: "Guardar a temp ambiente hasta madurar", fr: "Conserver à temp ambiante" } },
  { id: "ing_085", name: { en: "Mango", es: "Mango", fr: "Mangue" }, category: "fruits", unit: "piece", avgPrice: 2.50, currency: "USD", region: "Tropical", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["peach"], seasonality: ["spring", "summer"], storageInstructions: { en: "Store at room temp until ripe", es: "Guardar a temp ambiente hasta madurar", fr: "Conserver à temp ambiante" } },

  // Grains & Pasta (ing_086-090)
  { id: "ing_086", name: { en: "Brown Rice", es: "Arroz Integral", fr: "Riz Complet" }, category: "grains", unit: "cup", avgPrice: 1.50, currency: "USD", region: "Asian", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["white rice"], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans récipient hermétique" } },
  { id: "ing_087", name: { en: "Jasmine Rice", es: "Arroz Jazmín", fr: "Riz Jasmin" }, category: "grains", unit: "cup", avgPrice: 2.00, currency: "USD", region: "Asian", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["basmati rice"], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_088", name: { en: "Penne Pasta", es: "Pasta Penne", fr: "Pâtes Penne" }, category: "grains", unit: "oz", avgPrice: 1.50, currency: "USD", region: "Italian", tags: { glutenFree: false, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["rigatoni"], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_089", name: { en: "Fettuccine", es: "Fettuccine", fr: "Fettuccine" }, category: "grains", unit: "oz", avgPrice: 1.80, currency: "USD", region: "Italian", tags: { glutenFree: false, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["linguine"], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_090", name: { en: "Oats", es: "Avena", fr: "Flocons d'Avoine" }, category: "grains", unit: "cup", avgPrice: 0.80, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans récipient hermétique" } },

  // Nuts & Seeds (ing_091-095)
  { id: "ing_091", name: { en: "Almond", es: "Almendra", fr: "Amande" }, category: "pantry", unit: "cup", avgPrice: 6.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: false, kosher: true, halal: true }, alternatives: ["cashews"], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dry place", es: "Guardar en lugar fresco y seco", fr: "Conserver au sec et au frais" } },
  { id: "ing_092", name: { en: "Walnut", es: "Nuez", fr: "Noix" }, category: "pantry", unit: "cup", avgPrice: 7.00, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: false, kosher: true, halal: true }, alternatives: ["pecans"], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dry place", es: "Guardar en lugar fresco y seco", fr: "Conserver au sec et au frais" } },
  { id: "ing_093", name: { en: "Cashew", es: "Anacardo", fr: "Noix de Cajou" }, category: "pantry", unit: "cup", avgPrice: 8.00, currency: "USD", region: "Asian", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: false, kosher: true, halal: true }, alternatives: ["almonds"], seasonality: ["year-round"], storageInstructions: { en: "Store in airtight container", es: "Guardar en recipiente hermético", fr: "Conserver dans récipient hermétique" } },
  { id: "ing_094", name: { en: "Sesame Seeds", es: "Semillas de Sésamo", fr: "Graines de Sésame" }, category: "spices", unit: "tbsp", avgPrice: 0.50, currency: "USD", region: "Asian", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_095", name: { en: "Chia Seeds", es: "Semillas de Chía", fr: "Graines de Chia" }, category: "pantry", unit: "tbsp", avgPrice: 0.75, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["flax seeds"], seasonality: ["year-round"], storageInstructions: { en: "Store in cool, dry place", es: "Guardar en lugar fresco y seco", fr: "Conserver au sec et au frais" } },

  // Condiments & Sauces (ing_096-100)
  { id: "ing_096", name: { en: "Mayonnaise", es: "Mayonesa", fr: "Mayonnaise" }, category: "pantry", unit: "tbsp", avgPrice: 0.30, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: true, nutFree: true, kosher: false, halal: false }, alternatives: ["vegan mayo"], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate after opening", es: "Refrigerar después de abrir", fr: "Réfrigérer après ouverture" } },
  { id: "ing_097", name: { en: "Mustard", es: "Mostaza", fr: "Moutarde" }, category: "pantry", unit: "tbsp", avgPrice: 0.20, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate after opening", es: "Refrigerar después de abrir", fr: "Réfrigérer après ouverture" } },
  { id: "ing_098", name: { en: "Ketchup", es: "Kétchup", fr: "Ketchup" }, category: "pantry", unit: "tbsp", avgPrice: 0.15, currency: "USD", region: "American", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: [], seasonality: ["year-round"], storageInstructions: { en: "Refrigerate after opening", es: "Refrigerar después de abrir", fr: "Réfrigérer après ouverture" } },
  { id: "ing_099", name: { en: "Balsamic Vinegar", es: "Vinagre Balsámico", fr: "Vinaigre Balsamique" }, category: "pantry", unit: "tbsp", avgPrice: 1.00, currency: "USD", region: "Italian", tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["red wine vinegar"], seasonality: ["year-round"], storageInstructions: { en: "Store in pantry", es: "Guardar en despensa", fr: "Conserver au garde-manger" } },
  { id: "ing_100", name: { en: "Honey", es: "Miel", fr: "Miel" }, category: "pantry", unit: "tbsp", avgPrice: 0.50, currency: "USD", region: "Global", tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true }, alternatives: ["maple syrup"], seasonality: ["year-round"], storageInstructions: { en: "Store at room temperature", es: "Guardar a temperatura ambiente", fr: "Conserver à température ambiante" } }
];

// Add 16 more recipes (rec_025-040)
const newRecipes = [
  // BREAKFAST (4 more to reach 10 total)
  {
    id: "rec_025",
    name: {en: "Oatmeal with Berries", es: "Avena con Bayas", fr: "Flocons d'Avoine aux Baies"},
    description: {en: "Healthy oatmeal topped with fresh berries", es: "Avena saludable con bayas frescas", fr: "Flocons d'avoine sains avec baies fraîches"},
    type: "breakfast", cuisine: ["american"], prepTime: 5, cookTime: 10, totalTime: 15, servings: 2, difficulty: "easy",
    tags: ["healthy", "vegetarian", "quick"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 bowl", calories: 280, protein: 8, carbs: 52, fat: 5, fiber: 8, sugar: 12, sodium: 5, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_090", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_082", quantity: 0.5, unit: "cup", optional: false},
      {ingredientId: "ing_081", quantity: 0.5, unit: "cup", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook oats according to package", es: "Cocina avena según paquete", fr: "Cuire flocons selon paquet"}, time: 8},
      {step: 2, text: {en: "Top with fresh berries", es: "Cubre con bayas frescas", fr: "Garnir de baies fraîches"}, time: 2}
    ],
    tips: {en: "Add honey for sweetness", es: "Agrega miel para dulzura", fr: "Ajouter miel pour sucré"},
    equipment: ["pot", "bowl"],
    author: "foodie_team",
    dateAdded: "2025-01-23",
    rating: 4.6,
    reviewCount: 512
  },
  {
    id: "rec_026",
    name: {en: "French Toast", es: "Tostadas Francesas", fr: "Pain Perdu"},
    description: {en: "Classic French toast with cinnamon", es: "Tostadas francesas clásicas con canela", fr: "Pain perdu classique à la cannelle"},
    type: "breakfast", cuisine: ["french"], prepTime: 10, cookTime: 10, totalTime: 20, servings: 4, difficulty: "easy",
    tags: ["classic", "kid-friendly"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "2 slices", calories: 320, protein: 12, carbs: 48, fat: 9, fiber: 2, sugar: 18, sodium: 380, cholesterol: 185},
    ingredients: [
      {ingredientId: "ing_001", quantity: 4, unit: "piece", optional: false},
      {ingredientId: "ing_047", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_064", quantity: 1, unit: "tsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Whisk eggs and milk", es: "Bate huevos y leche", fr: "Battre œufs et lait"}, time: 3},
      {step: 2, text: {en: "Dip bread and cook until golden", es: "Moja pan y cocina hasta dorar", fr: "Tremper pain et cuire jusqu'à doré"}, time: 7}
    ],
    tips: {en: "Serve with maple syrup", es: "Sirve con jarabe de arce", fr: "Servir avec sirop d'érable"},
    equipment: ["pan", "bowl", "whisk"],
    author: "foodie_team",
    dateAdded: "2025-01-24",
    rating: 4.7,
    reviewCount: 678
  },

  // LUNCH (6 more)
  {
    id: "rec_027",
    name: {en: "Caprese Sandwich", es: "Sándwich Caprese", fr: "Sandwich Caprese"},
    description: {en: "Fresh mozzarella, tomato and basil sandwich", es: "Sándwich de mozzarella, tomate y albahaca", fr: "Sandwich mozzarella, tomate et basilic"},
    type: "lunch", cuisine: ["italian"], prepTime: 10, cookTime: 0, totalTime: 10, servings: 2, difficulty: "easy",
    tags: ["vegetarian", "quick", "fresh"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 sandwich", calories: 380, protein: 18, carbs: 42, fat: 16, fiber: 3, sugar: 4, sodium: 620, cholesterol: 45},
    ingredients: [
      {ingredientId: "ing_050", quantity: 0.5, unit: "cup", optional: false},
      {ingredientId: "ing_058", quantity: 2, unit: "tbsp", preparation: "fresh", optional: false},
      {ingredientId: "ing_099", quantity: 1, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Layer ingredients on bread", es: "Coloca ingredientes en pan", fr: "Disposer ingrédients sur pain"}, time: 5},
      {step: 2, text: {en: "Drizzle with balsamic", es: "Rocía con balsámico", fr: "Arroser de balsamique"}, time: 2}
    ],
    tips: {en: "Use fresh basil for best flavor", es: "Usa albahaca fresca", fr: "Utiliser basilic frais"},
    equipment: ["knife"],
    author: "foodie_team",
    dateAdded: "2025-01-25",
    rating: 4.5,
    reviewCount: 389
  },
  {
    id: "rec_028",
    name: {en: "Asian Noodle Bowl", es: "Bowl de Fideos Asiáticos", fr: "Bol de Nouilles Asiatiques"},
    description: {en: "Flavorful noodles with vegetables", es: "Fideos sabrosos con verduras", fr: "Nouilles savoureuses aux légumes"},
    type: "lunch", cuisine: ["asian"], prepTime: 15, cookTime: 10, totalTime: 25, servings: 4, difficulty: "medium",
    tags: ["asian", "noodles"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 bowl", calories: 420, protein: 14, carbs: 68, fat: 10, fiber: 5, sugar: 8, sodium: 890, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_032", quantity: 8, unit: "oz", optional: false},
      {ingredientId: "ing_051", quantity: 3, unit: "tbsp", optional: false},
      {ingredientId: "ing_059", quantity: 1, unit: "tbsp", preparation: "minced", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook noodles", es: "Cocina fideos", fr: "Cuire nouilles"}, time: 8},
      {step: 2, text: {en: "Toss with sauce and vegetables", es: "Mezcla con salsa y verduras", fr: "Mélanger avec sauce et légumes"}, time: 5}
    ],
    tips: {en: "Add sesame seeds for garnish", es: "Agrega semillas de sésamo", fr: "Ajouter graines de sésame"},
    equipment: ["pot", "wok"],
    author: "foodie_team",
    dateAdded: "2025-01-26",
    rating: 4.6,
    reviewCount: 445
  },

  // DINNER (8 more)
  {
    id: "rec_029",
    name: {en: "Herb Roasted Chicken", es: "Pollo Asado con Hierbas", fr: "Poulet Rôti aux Herbes"},
    description: {en: "Juicy roasted chicken with herbs", es: "Pollo jugoso asado con hierbas", fr: "Poulet juteux rôti aux herbes"},
    type: "dinner", cuisine: ["american"], prepTime: 15, cookTime: 60, totalTime: 75, servings: 6, difficulty: "medium",
    tags: ["comfort-food", "family-dinner"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: true, paleo: true},
    nutrition: {servingSize: "4 oz", calories: 280, protein: 38, carbs: 2, fat: 13, fiber: 0, sugar: 0, sodium: 420, cholesterol: 115},
    ingredients: [
      {ingredientId: "ing_004", quantity: 1, unit: "whole", preparation: "whole chicken", optional: false},
      {ingredientId: "ing_057", quantity: 2, unit: "tbsp", optional: false},
      {ingredientId: "ing_058", quantity: 2, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Season chicken with herbs", es: "Sazona pollo con hierbas", fr: "Assaisonner poulet aux herbes"}, time: 10},
      {step: 2, text: {en: "Roast at 375°F for 60 minutes", es: "Asa a 190°C por 60 minutos", fr: "Rôtir à 190°C pendant 60 minutes"}, time: 60}
    ],
    tips: {en: "Let rest before carving", es: "Deja reposar antes de trinchar", fr: "Laisser reposer avant découpe"},
    equipment: ["oven", "roasting pan"],
    author: "foodie_team",
    dateAdded: "2025-01-27",
    rating: 4.8,
    reviewCount: 892
  },
  {
    id: "rec_030",
    name: {en: "Pork Chops with Apples", es: "Chuletas de Cerdo con Manzanas", fr: "Côtelettes de Porc aux Pommes"},
    description: {en: "Pan-seared pork chops with caramelized apples", es: "Chuletas de cerdo selladas con manzanas caramelizadas", fr: "Côtelettes de porc poêlées aux pommes caramélisées"},
    type: "dinner", cuisine: ["american"], prepTime: 10, cookTime: 20, totalTime: 30, servings: 4, difficulty: "medium",
    tags: ["comfort-food"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 chop", calories: 380, protein: 32, carbs: 18, fat: 20, fiber: 2, sugar: 14, sodium: 520, cholesterol: 95},
    ingredients: [
      {ingredientId: "ing_066", quantity: 4, unit: "piece", optional: false},
      {ingredientId: "ing_083", quantity: 2, unit: "piece", preparation: "sliced", optional: false},
      {ingredientId: "ing_046", quantity: 2, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Sear pork chops in butter", es: "Sella chuletas en mantequilla", fr: "Saisir côtelettes au beurre"}, time: 10},
      {step: 2, text: {en: "Add apples and cook until caramelized", es: "Agrega manzanas y cocina hasta caramelizar", fr: "Ajouter pommes et cuire jusqu'à caramélisation"}, time: 10}
    ],
    tips: {en: "Don't overcook the pork", es: "No cocines de más el cerdo", fr: "Ne pas trop cuire le porc"},
    equipment: ["pan"],
    author: "foodie_team",
    dateAdded: "2025-01-28",
    rating: 4.7,
    reviewCount: 567
  },
  {
    id: "rec_031",
    name: {en: "Vegetable Stir Fry", es: "Salteado de Verduras", fr: "Sauté de Légumes"},
    description: {en: "Colorful vegetable stir fry with soy sauce", es: "Salteado colorido de verduras con salsa de soja", fr: "Sauté de légumes colorés à la sauce soja"},
    type: "dinner", cuisine: ["asian"], prepTime: 15, cookTime: 10, totalTime: 25, servings: 4, difficulty: "easy",
    tags: ["vegetarian", "quick", "healthy"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: true, dairyFree: true, lowCarb: true, keto: false, paleo: false},
    nutrition: {servingSize: "2 cups", calories: 180, protein: 6, carbs: 28, fat: 6, fiber: 6, sugar: 10, sodium: 680, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_041", quantity: 2, unit: "cup", optional: false},
      {ingredientId: "ing_042", quantity: 1, unit: "cup", preparation: "sliced", optional: false},
      {ingredientId: "ing_044", quantity: 1, unit: "cup", preparation: "sliced", optional: false},
      {ingredientId: "ing_051", quantity: 3, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Heat wok over high heat", es: "Calienta wok a fuego alto", fr: "Chauffer wok à feu vif"}, time: 2},
      {step: 2, text: {en: "Stir fry vegetables until tender", es: "Saltea verduras hasta tiernas", fr: "Faire sauter légumes jusqu'à tendres"}, time: 8}
    ],
    tips: {en: "Keep vegetables crisp", es: "Mantén verduras crujientes", fr: "Garder légumes croquants"},
    equipment: ["wok"],
    author: "foodie_team",
    dateAdded: "2025-01-29",
    rating: 4.5,
    reviewCount: 478
  },
  {
    id: "rec_032",
    name: {en: "Baked Salmon with Asparagus", es: "Salmón al Horno con Espárragos", fr: "Saumon au Four avec Asperges"},
    description: {en: "Healthy baked salmon with roasted asparagus", es: "Salmón saludable al horno con espárragos asados", fr: "Saumon sain au four avec asperges rôties"},
    type: "dinner", cuisine: ["mediterranean"], prepTime: 10, cookTime: 20, totalTime: 30, servings: 4, difficulty: "easy",
    tags: ["healthy", "low-carb", "keto"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: true, paleo: true},
    nutrition: {servingSize: "1 fillet", calories: 320, protein: 36, carbs: 6, fat: 17, fiber: 3, sugar: 2, sodium: 380, cholesterol: 85},
    ingredients: [
      {ingredientId: "ing_036", quantity: 4, unit: "piece", optional: false},
      {ingredientId: "ing_074", quantity: 1, unit: "bunch", optional: false},
      {ingredientId: "ing_008", quantity: 2, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Place salmon and asparagus on baking sheet", es: "Coloca salmón y espárragos en bandeja", fr: "Placer saumon et asperges sur plaque"}, time: 5},
      {step: 2, text: {en: "Bake at 400°F for 15-20 minutes", es: "Hornea a 200°C por 15-20 minutos", fr: "Cuire à 200°C pendant 15-20 minutes"}, time: 20}
    ],
    tips: {en: "Don't overcook salmon", es: "No cocines de más el salmón", fr: "Ne pas trop cuire le saumon"},
    equipment: ["oven", "baking sheet"],
    author: "foodie_team",
    dateAdded: "2025-01-30",
    rating: 4.8,
    reviewCount: 745
  },
  {
    id: "rec_033",
    name: {en: "Pasta Primavera", es: "Pasta Primavera", fr: "Pâtes Primavera"},
    description: {en: "Light pasta with fresh spring vegetables", es: "Pasta ligera con verduras frescas de primavera", fr: "Pâtes légères aux légumes printaniers"},
    type: "dinner", cuisine: ["italian"], prepTime: 15, cookTime: 15, totalTime: 30, servings: 4, difficulty: "easy",
    tags: ["vegetarian", "light"],
    dietaryLabels: {glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "2 cups", calories: 420, protein: 16, carbs: 58, fat: 14, fiber: 6, sugar: 6, sodium: 480, cholesterol: 25},
    ingredients: [
      {ingredientId: "ing_088", quantity: 12, unit: "oz", optional: false},
      {ingredientId: "ing_041", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_044", quantity: 1, unit: "cup", preparation: "sliced", optional: false},
      {ingredientId: "ing_034", quantity: 0.5, unit: "cup", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Cook pasta according to package", es: "Cocina pasta según paquete", fr: "Cuire pâtes selon paquet"}, time: 10},
      {step: 2, text: {en: "Sauté vegetables and toss with pasta", es: "Saltea verduras y mezcla con pasta", fr: "Faire sauter légumes et mélanger avec pâtes"}, time: 8}
    ],
    tips: {en: "Reserve pasta water for sauce", es: "Guarda agua de pasta para salsa", fr: "Réserver eau de cuisson pour sauce"},
    equipment: ["pot", "pan"],
    author: "foodie_team",
    dateAdded: "2025-01-31",
    rating: 4.6,
    reviewCount: 589
  },
  {
    id: "rec_034",
    name: {en: "Grilled Lamb Chops", es: "Chuletas de Cordero a la Parrilla", fr: "Côtelettes d'Agneau Grillées"},
    description: {en: "Tender grilled lamb chops with herbs", es: "Tiernas chuletas de cordero a la parrilla con hierbas", fr: "Tendres côtelettes d'agneau grillées aux herbes"},
    type: "dinner", cuisine: ["mediterranean"], prepTime: 10, cookTime: 10, totalTime: 20, servings: 4, difficulty: "medium",
    tags: ["grilled", "gourmet"],
    dietaryLabels: {glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: true, keto: true, paleo: true},
    nutrition: {servingSize: "2 chops", calories: 420, protein: 38, carbs: 2, fat: 28, fiber: 0, sugar: 0, sodium: 380, cholesterol: 125},
    ingredients: [
      {ingredientId: "ing_067", quantity: 8, unit: "piece", optional: false},
      {ingredientId: "ing_057", quantity: 2, unit: "tbsp", optional: false},
      {ingredientId: "ing_008", quantity: 2, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Season lamb with herbs and oil", es: "Sazona cordero con hierbas y aceite", fr: "Assaisonner agneau aux herbes et huile"}, time: 5},
      {step: 2, text: {en: "Grill for 4-5 minutes per side", es: "Asa 4-5 minutos por lado", fr: "Griller 4-5 minutes par côté"}, time: 10}
    ],
    tips: {en: "Let rest before serving", es: "Deja reposar antes de servir", fr: "Laisser reposer avant de servir"},
    equipment: ["grill"],
    author: "foodie_team",
    dateAdded: "2025-02-01",
    rating: 4.9,
    reviewCount: 423
  },

  // SNACKS (2 more)
  {
    id: "rec_035",
    name: {en: "Trail Mix", es: "Mezcla de Frutos Secos", fr: "Mélange Montagnard"},
    description: {en: "Healthy mix of nuts and dried fruits", es: "Mezcla saludable de nueces y frutas secas", fr: "Mélange sain de noix et fruits secs"},
    type: "snack", cuisine: ["american"], prepTime: 5, cookTime: 0, totalTime: 5, servings: 8, difficulty: "easy",
    tags: ["healthy", "quick", "portable"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: true},
    nutrition: {servingSize: "1/4 cup", calories: 180, protein: 5, carbs: 14, fat: 13, fiber: 3, sugar: 8, sodium: 5, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_091", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_092", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_093", quantity: 1, unit: "cup", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Mix all ingredients in bowl", es: "Mezcla todos los ingredientes en bol", fr: "Mélanger tous ingrédients dans bol"}, time: 5}
    ],
    tips: {en: "Store in airtight container", es: "Guarda en recipiente hermético", fr: "Conserver dans récipient hermétique"},
    equipment: ["bowl"],
    author: "foodie_team",
    dateAdded: "2025-02-02",
    rating: 4.4,
    reviewCount: 267
  },
  {
    id: "rec_036",
    name: {en: "Chia Pudding", es: "Pudín de Chía", fr: "Pudding de Chia"},
    description: {en: "Healthy overnight chia seed pudding", es: "Pudín saludable de semillas de chía", fr: "Pudding sain aux graines de chia"},
    type: "snack", cuisine: ["american"], prepTime: 5, cookTime: 0, totalTime: 245, servings: 4, difficulty: "easy",
    tags: ["healthy", "make-ahead", "vegan"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: true, keto: false, paleo: false},
    nutrition: {servingSize: "1/2 cup", calories: 150, protein: 5, carbs: 18, fat: 7, fiber: 10, sugar: 6, sodium: 55, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_095", quantity: 4, unit: "tbsp", optional: false},
      {ingredientId: "ing_047", quantity: 2, unit: "cup", optional: false},
      {ingredientId: "ing_100", quantity: 2, unit: "tbsp", optional: true}
    ],
    instructions: [
      {step: 1, text: {en: "Mix chia seeds and milk", es: "Mezcla semillas de chía y leche", fr: "Mélanger graines de chia et lait"}, time: 3},
      {step: 2, text: {en: "Refrigerate overnight", es: "Refrigera toda la noche", fr: "Réfrigérer toute la nuit"}, time: 240}
    ],
    tips: {en: "Top with fresh fruit", es: "Cubre con fruta fresca", fr: "Garnir de fruits frais"},
    equipment: ["jar", "spoon"],
    author: "foodie_team",
    dateAdded: "2025-02-03",
    rating: 4.5,
    reviewCount: 389
  },

  // DESSERT (2 new)
  {
    id: "rec_037",
    name: {en: "Apple Crisp", es: "Crujiente de Manzana", fr: "Croustade aux Pommes"},
    description: {en: "Warm apple crisp with oat topping", es: "Crujiente tibio de manzana con avena", fr: "Croustade tiède aux pommes avec flocons d'avoine"},
    type: "dessert", cuisine: ["american"], prepTime: 15, cookTime: 40, totalTime: 55, servings: 6, difficulty: "easy",
    tags: ["dessert", "comfort-food"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 serving", calories: 280, protein: 3, carbs: 48, fat: 10, fiber: 4, sugar: 28, sodium: 75, cholesterol: 25},
    ingredients: [
      {ingredientId: "ing_083", quantity: 6, unit: "piece", preparation: "sliced", optional: false},
      {ingredientId: "ing_090", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_046", quantity: 0.5, unit: "cup", optional: false},
      {ingredientId: "ing_064", quantity: 1, unit: "tsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Layer apples in baking dish", es: "Coloca manzanas en molde", fr: "Disposer pommes dans plat"}, time: 10},
      {step: 2, text: {en: "Mix topping and sprinkle over apples", es: "Mezcla cobertura y espolvorea", fr: "Mélanger garniture et saupoudrer"}, time: 5},
      {step: 3, text: {en: "Bake at 350°F for 40 minutes", es: "Hornea a 175°C por 40 minutos", fr: "Cuire à 175°C pendant 40 minutes"}, time: 40}
    ],
    tips: {en: "Serve warm with ice cream", es: "Sirve tibio con helado", fr: "Servir tiède avec glace"},
    equipment: ["oven", "baking dish", "bowl"],
    author: "foodie_team",
    dateAdded: "2025-02-04",
    rating: 4.7,
    reviewCount: 534
  },
  {
    id: "rec_038",
    name: {en: "Berry Smoothie Bowl", es: "Bowl de Batido de Bayas", fr: "Bol de Smoothie aux Baies"},
    description: {en: "Thick berry smoothie topped with fresh fruit", es: "Batido espeso de bayas con fruta fresca", fr: "Smoothie épais aux baies avec fruits frais"},
    type: "dessert", cuisine: ["american"], prepTime: 10, cookTime: 0, totalTime: 10, servings: 2, difficulty: "easy",
    tags: ["healthy", "quick", "refreshing"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 bowl", calories: 220, protein: 5, carbs: 48, fat: 3, fiber: 8, sugar: 32, sodium: 45, cholesterol: 0},
    ingredients: [
      {ingredientId: "ing_081", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_082", quantity: 1, unit: "cup", optional: false},
      {ingredientId: "ing_025", quantity: 1, unit: "piece", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Blend berries and banana until thick", es: "Licúa bayas y plátano hasta espeso", fr: "Mixer baies et banane jusqu'à épais"}, time: 5},
      {step: 2, text: {en: "Pour into bowl and add toppings", es: "Vierte en bol y agrega ingredientes", fr: "Verser dans bol et ajouter garnitures"}, time: 5}
    ],
    tips: {en: "Use frozen fruit for thickness", es: "Usa fruta congelada para espesor", fr: "Utiliser fruits congelés pour épaisseur"},
    equipment: ["blender", "bowl"],
    author: "foodie_team",
    dateAdded: "2025-02-05",
    rating: 4.6,
    reviewCount: 412
  },

  // LUNCH (2 more to balance)
  {
    id: "rec_039",
    name: {en: "Greek Salad", es: "Ensalada Griega", fr: "Salade Grecque"},
    description: {en: "Fresh Greek salad with feta and olives", es: "Ensalada griega fresca con feta y aceitunas", fr: "Salade grecque fraîche au feta et olives"},
    type: "lunch", cuisine: ["greek"], prepTime: 15, cookTime: 0, totalTime: 15, servings: 4, difficulty: "easy",
    tags: ["healthy", "vegetarian", "mediterranean"],
    dietaryLabels: {glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: true, keto: true, paleo: false},
    nutrition: {servingSize: "2 cups", calories: 280, protein: 9, carbs: 14, fat: 22, fiber: 4, sugar: 7, sodium: 720, cholesterol: 35},
    ingredients: [
      {ingredientId: "ing_043", quantity: 3, unit: "cup", preparation: "diced", optional: false},
      {ingredientId: "ing_035", quantity: 2, unit: "cup", preparation: "chopped", optional: false},
      {ingredientId: "ing_008", quantity: 3, unit: "tbsp", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Chop all vegetables", es: "Pica todas las verduras", fr: "Hacher tous légumes"}, time: 10},
      {step: 2, text: {en: "Toss with olive oil and herbs", es: "Mezcla con aceite de oliva y hierbas", fr: "Mélanger avec huile d'olive et herbes"}, time: 5}
    ],
    tips: {en: "Best served fresh", es: "Mejor servir fresco", fr: "Meilleur servi frais"},
    equipment: ["bowl", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-06",
    rating: 4.7,
    reviewCount: 623
  },
  {
    id: "rec_040",
    name: {en: "Chicken Caesar Wrap", es: "Wrap César de Pollo", fr: "Wrap César au Poulet"},
    description: {en: "Grilled chicken Caesar salad in a wrap", es: "Ensalada César de pollo asado en wrap", fr: "Salade César au poulet grillé en wrap"},
    type: "lunch", cuisine: ["american"], prepTime: 10, cookTime: 10, totalTime: 20, servings: 2, difficulty: "easy",
    tags: ["quick", "portable"],
    dietaryLabels: {glutenFree: false, vegetarian: false, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false},
    nutrition: {servingSize: "1 wrap", calories: 480, protein: 36, carbs: 42, fat: 18, fiber: 3, sugar: 3, sodium: 890, cholesterol: 95},
    ingredients: [
      {ingredientId: "ing_004", quantity: 2, unit: "piece", preparation: "grilled and sliced", optional: false},
      {ingredientId: "ing_035", quantity: 2, unit: "cup", optional: false},
      {ingredientId: "ing_034", quantity: 0.25, unit: "cup", optional: false},
      {ingredientId: "ing_028", quantity: 2, unit: "piece", optional: false}
    ],
    instructions: [
      {step: 1, text: {en: "Grill and slice chicken", es: "Asa y corta pollo", fr: "Griller et trancher poulet"}, time: 10},
      {step: 2, text: {en: "Fill tortillas with chicken and salad", es: "Rellena tortillas con pollo y ensalada", fr: "Garnir tortillas de poulet et salade"}, time: 5},
      {step: 3, text: {en: "Roll and serve", es: "Enrolla y sirve", fr: "Rouler et servir"}, time: 2}
    ],
    tips: {en: "Add Caesar dressing", es: "Agrega aderezo César", fr: "Ajouter vinaigrette César"},
    equipment: ["grill", "knife"],
    author: "foodie_team",
    dateAdded: "2025-02-07",
    rating: 4.6,
    reviewCount: 489
  }
];

// Add ingredients and recipes
ingredientsData.ingredients.push(...newIngredients);
recipesData.recipes.push(...newRecipes);

console.log(`✅ Added ${newIngredients.length} ingredients`);
console.log(`✅ Added ${newRecipes.length} recipes`);

// Write updated data
writeFileSync(RECIPES_FILE, JSON.stringify(recipesData, null, 2));
writeFileSync(INGREDIENTS_FILE, JSON.stringify(ingredientsData, null, 2));

console.log(`\n📊 Final: ${recipesData.recipes.length} recipes (${Math.round(recipesData.recipes.length/50*100)}%), ${ingredientsData.ingredients.length} ingredients (${Math.round(ingredientsData.ingredients.length/100*100)}%)`);
console.log(`\n✨ Phase 2 Progress: ${Math.round((recipesData.recipes.length/50 + ingredientsData.ingredients.length/100)/2*100)}% complete!`);
