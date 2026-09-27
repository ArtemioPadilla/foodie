import { DietaryBadges } from '@/components/domain/DietaryBadges';
import { RecipeCard, RecipeCardSkeleton } from '@/components/domain/RecipeCard';
import type { Recipe } from '@/schemas';
import ErrorBoundary from './ErrorBoundary';

// Gallery demo of the Foodie domain card (roadmap Issue 017): grid + list
// views, image vs meal-type placeholder, favourite mark, skeletons.
const nutrition = { servingSize: '1 plate', calories: 420, protein: 24, carbs: 38, fat: 16, fiber: 6, sugar: 5, sodium: 480, cholesterol: 60 };

const SAMPLE: Recipe[] = [
  {
    id: 'demo-huevos',
    name: { en: 'Huevos Rancheros', es: 'Huevos Rancheros', fr: 'Huevos Rancheros' },
    description: {
      en: 'Fried eggs on warm corn tortillas with a smoky tomato-chile salsa.',
      es: 'Huevos estrellados sobre tortillas de maíz con salsa de jitomate y chile.',
      fr: 'Œufs au plat sur tortillas de maïs avec une salsa tomate-piment fumée.',
    },
    type: 'breakfast',
    cuisine: ['mexican'],
    prepTime: 10,
    cookTime: 15,
    totalTime: 25,
    servings: 2,
    difficulty: 'easy',
    tags: ['vegetarian', 'quick'],
    dietaryLabels: { glutenFree: true, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false },
    nutrition,
    ingredients: [{ ingredientId: 'egg', quantity: 4, unit: 'piece', optional: false }],
    instructions: [{ step: 1, text: { en: 'Warm the tortillas.', es: 'Calienta las tortillas.', fr: 'Réchauffez les tortillas.' } }],
    equipment: ['skillet'],
    dateAdded: '2025-01-15',
    rating: 4.7,
    reviewCount: 128,
  },
  {
    id: 'demo-lentils',
    name: { en: 'Lentil & Kale Stew', es: 'Guiso de lentejas y kale', fr: 'Ragoût de lentilles et chou kale' },
    description: {
      en: 'A slow, hearty one-pot stew for cold evenings.',
      es: 'Un guiso contundente de una sola olla para noches frías.',
      fr: 'Un ragoût copieux en une seule casserole pour les soirs froids.',
    },
    type: 'dinner',
    cuisine: ['mediterranean'],
    prepTime: 15,
    cookTime: 50,
    totalTime: 65,
    servings: 6,
    difficulty: 'medium',
    tags: ['vegan', 'healthy', 'make-ahead'],
    dietaryLabels: { glutenFree: true, vegetarian: true, vegan: true, dairyFree: true, lowCarb: false, keto: false, paleo: false, whole30: true },
    nutrition: { ...nutrition, calories: 310, protein: 18 },
    ingredients: [{ ingredientId: 'lentils', quantity: 300, unit: 'g', optional: false }],
    instructions: [{ step: 1, text: { en: 'Simmer.', es: 'Hierve a fuego lento.', fr: 'Laissez mijoter.' } }],
    equipment: ['pot'],
    dateAdded: '2025-02-02',
    rating: 4.3,
    reviewCount: 41,
  },
  {
    id: 'demo-tarte',
    name: { en: 'Pear Tarte Tatin', es: 'Tarta tatin de pera', fr: 'Tarte Tatin aux poires' },
    description: {
      en: 'Caramelised pears under a buttery puff-pastry lid.',
      es: 'Peras caramelizadas bajo una tapa de hojaldre.',
      fr: 'Poires caramélisées sous un couvercle de pâte feuilletée.',
    },
    type: 'dessert',
    cuisine: ['french'],
    prepTime: 20,
    cookTime: 35,
    totalTime: 55,
    servings: 8,
    difficulty: 'hard',
    tags: ['elegant'],
    dietaryLabels: { glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false },
    nutrition: { ...nutrition, calories: 390, protein: 4, sugar: 28 },
    ingredients: [{ ingredientId: 'pear', quantity: 4, unit: 'piece', optional: false }],
    instructions: [{ step: 1, text: { en: 'Caramelise.', es: 'Carameliza.', fr: 'Caramélisez.' } }],
    equipment: ['oven'],
    dateAdded: '2025-03-10',
    rating: 4.9,
    reviewCount: 9,
    imageUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f5d0a9"/><circle cx="200" cy="150" r="90" fill="%23c2410c"/><circle cx="200" cy="150" r="60" fill="%23fdba74"/></svg>',
      ),
  },
];

export default function ShowcaseRecipeCard() {
  return (
    <ErrorBoundary name="ShowcaseRecipeCard">
      <div className="space-y-8">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Grid view — placeholder art per meal type, image when present</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <RecipeCard recipe={SAMPLE[0]!} href="#" isFavorite />
            <RecipeCard recipe={SAMPLE[1]!} href="#" lang="es" />
            <RecipeCard recipe={SAMPLE[2]!} href="#" lang="fr" showNutrition />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">List view + loading skeleton</h3>
          <div className="flex flex-col gap-3">
            <RecipeCard recipe={SAMPLE[1]!} view="list" href="#" />
            <RecipeCardSkeleton view="list" />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">DietaryBadges</h3>
          <DietaryBadges labels={SAMPLE[1]!.dietaryLabels} max={4} />
        </section>
      </div>
    </ErrorBoundary>
  );
}
