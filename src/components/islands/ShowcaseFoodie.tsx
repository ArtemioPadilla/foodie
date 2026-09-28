import * as React from 'react';
import { TimerIcon } from 'lucide-react';
import { CategoryChip, FOOD_CATEGORY_IDS } from '@/components/domain/CategoryChip';
import { DietaryBadges } from '@/components/domain/DietaryBadges';
import { DifficultyBadge } from '@/components/domain/DifficultyBadge';
import { FavoriteButton } from '@/components/domain/FavoriteButton';
import { IngredientCard, IngredientCardSkeleton } from '@/components/domain/IngredientCard';
import { NutritionFacts } from '@/components/domain/NutritionFacts';
import { RecipeCard, RecipeCardSkeleton } from '@/components/domain/RecipeCard';
import { RecipeDetailExtras, RecipeDetailHeader } from '@/components/domain/RecipeDetailView';
import { RecipeTimer } from '@/components/domain/RecipeTimer';
import { ServingsAdjuster } from '@/components/domain/ServingsAdjuster';
import { TimeBadge } from '@/components/domain/TimeBadge';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toast';
import type { Ingredient, Recipe } from '@/schemas';
import ErrorBoundary from './ErrorBoundary';

/**
 * Gallery demos of the Foodie domain components (roadmap Issues 017 + 021):
 * one island, one `demo` per `gallery.ts` slug of category `domain`. The
 * gallery renders it twice (light + dark columns), so every demo is
 * self-contained — the timer's `Dialog` and the favourite's `Toaster` live in
 * the same React root as their triggers (compound components never span
 * islands).
 */
export type FoodieDemo =
  | 'recipe-card'
  | 'ingredient-card'
  | 'nutrition-facts'
  | 'dietary-badges'
  | 'difficulty-badge'
  | 'time-badge'
  | 'category-chip'
  | 'servings-adjuster'
  | 'recipe-timer'
  | 'favorite-button'
  | 'recipe-detail-view';

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

const storage = { en: 'Refrigerate at 4°C or below', es: 'Refrigerar a 4°C o menos', fr: 'Réfrigérer à 4°C ou moins' };
const INGREDIENTS: Ingredient[] = [
  {
    id: 'demo-salmon',
    name: { en: 'Salmon Fillet', es: 'Filete de salmón', fr: 'Filet de saumon' },
    category: 'protein',
    unit: 'lb',
    avgPrice: 12.5,
    currency: 'USD',
    region: 'global',
    tags: { glutenFree: true, vegan: false, vegetarian: false, dairyFree: true, nutFree: true, kosher: true, halal: true },
    alternatives: [],
    seasonality: [],
    storageInstructions: storage,
  },
  {
    id: 'demo-kale',
    name: { en: 'Kale', es: 'Kale', fr: 'Chou kale' },
    category: 'vegetables',
    unit: 'bunch',
    avgPrice: 2.99,
    currency: 'USD',
    region: 'global',
    tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true },
    alternatives: [],
    seasonality: [],
    storageInstructions: storage,
  },
  {
    id: 'demo-cumin',
    name: { en: 'Ground Cumin', es: 'Comino molido', fr: 'Cumin moulu' },
    category: 'spices',
    unit: 'tsp',
    avgPrice: 0.15,
    currency: 'USD',
    region: 'global',
    tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true },
    alternatives: [],
    seasonality: [],
    storageInstructions: { en: 'Store in a cool, dry place', es: 'Guardar en un lugar fresco y seco', fr: 'Conserver dans un endroit frais et sec' },
  },
];

const CATEGORY_LABELS: Record<(typeof FOOD_CATEGORY_IDS)[number], string> = {
  protein: 'Protein',
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  grains: 'Grains',
  dairy: 'Dairy',
  pantry: 'Pantry',
  spices: 'Spices',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function RecipeCardDemo() {
  return (
    <div className="space-y-8">
      <Section title="Grid view — placeholder art per meal type, image when present">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <RecipeCard recipe={SAMPLE[0]!} href="#" isFavorite />
          <RecipeCard recipe={SAMPLE[1]!} href="#" lang="es" />
          <RecipeCard recipe={SAMPLE[2]!} href="#" lang="fr" showNutrition />
        </div>
      </Section>
      <Section title="List view + loading skeleton">
        <div className="flex flex-col gap-3">
          <RecipeCard recipe={SAMPLE[1]!} view="list" href="#" />
          <RecipeCardSkeleton view="list" />
        </div>
      </Section>
    </div>
  );
}

function IngredientCardDemo() {
  const [picked, setPicked] = React.useState(false);
  return (
    <div className="space-y-8">
      <Section title="Category stripe + dot, dietary tags, unit price">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <IngredientCard ingredient={INGREDIENTS[0]!} categoryName="Protein" href="#" />
          <IngredientCard ingredient={INGREDIENTS[1]!} categoryName="Verduras" lang="es" href="#" showDetails />
          <IngredientCard
            ingredient={INGREDIENTS[2]!}
            categoryName="Épices"
            lang="fr"
            href="#"
            selected={picked}
            action={
              <Button type="button" size="sm" variant={picked ? 'default' : 'outline'} aria-pressed={picked} onClick={() => setPicked((p) => !p)}>
                {picked ? 'Picked' : 'Pick'}
              </Button>
            }
          />
        </div>
      </Section>
      <Section title="Loading skeleton">
        <IngredientCardSkeleton className="max-w-xs" />
      </Section>
    </div>
  );
}

function NutritionFactsDemo() {
  const recipe = SAMPLE[1]!;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <NutritionFacts nutrition={recipe.nutrition} baseServings={recipe.servings} />
      <NutritionFacts nutrition={recipe.nutrition} baseServings={recipe.servings} servings={recipe.servings * 2} lang="es" />
    </div>
  );
}

function DietaryBadgesDemo() {
  return (
    <div className="space-y-4">
      <Section title="English, collapsed after 3">
        <DietaryBadges labels={SAMPLE[1]!.dietaryLabels} max={3} />
      </Section>
      <Section title="Español — every flag">
        <DietaryBadges labels={SAMPLE[1]!.dietaryLabels} lang="es" max={8} />
      </Section>
      <Section title="Français">
        <DietaryBadges labels={SAMPLE[0]!.dietaryLabels} lang="fr" />
      </Section>
    </div>
  );
}

function DifficultyBadgeDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DifficultyBadge difficulty="easy" />
      <DifficultyBadge difficulty="medium" lang="es" />
      <DifficultyBadge difficulty="hard" lang="fr" />
    </div>
  );
}

function TimeBadgeDemo() {
  return (
    <div className="space-y-4">
      <Section title="Inline (inherits the meta row colour)">
        <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <TimeBadge minutes={25} label="Total Time" />
          <TimeBadge minutes={10} lang="es" label="Tiempo de preparación" iconClassName="size-3.5" />
        </p>
      </Section>
      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <TimeBadge minutes={65} appearance="badge" iconClassName="size-3" label="Total Time" />
          <TimeBadge minutes={15} lang="fr" appearance="badge" iconClassName="size-3" label="Temps de cuisson" />
        </div>
      </Section>
    </div>
  );
}

function CategoryChipDemo() {
  return (
    <div className="space-y-4">
      <Section title="Dot (meta rows)">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {FOOD_CATEGORY_IDS.map((id) => (
            <li key={id}>
              <CategoryChip category={id} label={CATEGORY_LABELS[id]} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Chip (filters, headers)">
        <ul className="flex flex-wrap gap-2">
          {FOOD_CATEGORY_IDS.map((id) => (
            <li key={id}>
              <CategoryChip category={id} label={CATEGORY_LABELS[id]} appearance="chip" />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function ServingsAdjusterDemo() {
  const recipe = SAMPLE[0]!;
  const [servings, setServings] = React.useState(recipe.servings);
  return (
    <div className="space-y-4">
      <ServingsAdjuster servings={servings} originalServings={recipe.servings} onChange={setServings} />
      <p className="text-sm text-muted-foreground">
        Eggs: <span className="font-semibold tabular-nums text-foreground">{(4 * servings) / recipe.servings}</span>
      </p>
    </div>
  );
}

function RecipeTimerDemo() {
  const [open, setOpen] = React.useState(false);
  const [run, setRun] = React.useState(0);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setRun((r) => r + 1);
          setOpen(true);
        }}
      >
        <TimerIcon className="size-4" aria-hidden="true" />
        Start 5 min timer
      </Button>
      <RecipeTimer key={run} open={open} onOpenChange={setOpen} minutes={5} stepLabel="Step 2" />
    </>
  );
}

function FavoriteButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toaster />
      <FavoriteButton recipeId="demo-huevos" recipeName="Huevos Rancheros" lang="en" />
      <FavoriteButton recipeId="demo-lentils" recipeName="Guiso de lentejas y kale" lang="es" appearance="icon" />
    </div>
  );
}

function RecipeDetailViewDemo() {
  const recipe = { ...SAMPLE[1]!, tips: { en: 'Rest the dough overnight.', es: 'Deja reposar la masa toda la noche.', fr: 'Laissez reposer la pâte une nuit.' }, equipment: ['skillet', 'mixing-bowl'] };
  return (
    <div className="space-y-6">
      <RecipeDetailHeader recipe={recipe} cuisineNames={['Mediterranean']} mealTypeName="Dinner" lang="en" titleAs="h2" viewTransition={false} />
      <RecipeDetailExtras recipe={recipe} lang="en" className="mt-0" />
    </div>
  );
}

const DEMOS: Record<FoodieDemo, () => React.ReactElement> = {
  'recipe-card': RecipeCardDemo,
  'ingredient-card': IngredientCardDemo,
  'nutrition-facts': NutritionFactsDemo,
  'dietary-badges': DietaryBadgesDemo,
  'difficulty-badge': DifficultyBadgeDemo,
  'time-badge': TimeBadgeDemo,
  'category-chip': CategoryChipDemo,
  'servings-adjuster': ServingsAdjusterDemo,
  'recipe-timer': RecipeTimerDemo,
  'favorite-button': FavoriteButtonDemo,
  'recipe-detail-view': RecipeDetailViewDemo,
};

export const FOODIE_DEMOS = Object.keys(DEMOS) as FoodieDemo[];

export default function ShowcaseFoodie({ demo }: { demo: string }) {
  const Demo = DEMOS[demo as FoodieDemo];
  return <ErrorBoundary name="ShowcaseFoodie">{Demo ? <Demo /> : null}</ErrorBoundary>;
}
