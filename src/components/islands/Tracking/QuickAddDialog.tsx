import * as React from 'react';
import { useStore } from '@nanostores/react';
import { AlertTriangleIcon, ClockIcon, DropletIcon, HeartIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberField } from '@/components/ui/number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { getTranslated, t, type Locale } from '@/i18n';
import { searchBeverages, searchRecipes } from '@/lib/catalog/selectors';
import {
  calculateBeverageNutrition,
  calculateRecipeNutrition,
  createEmptyNutrition,
  estimateIngredientNutrition,
} from '@/lib/domain/nutrition';
import { unitLabel } from '@/lib/domain/recipe-detail';
import { nowTimeKey } from '@/lib/format-date';
import { getCategoryLabel } from '@/lib/domain/shopping';
import { entriesByDate, GLASS_ML, planDayIndex, waterMl, WATER_BEVERAGE_ID } from '@/lib/domain/tracking';
import { cn } from '@/lib/utils';
import {
  BEVERAGE_CATEGORIES,
  TRACKING_MEAL_TYPES,
  type Beverage,
  type Category,
  type Ingredient,
  type NutritionInfo,
  type Recipe,
  type TrackingEntry,
  type TrackingMealType,
} from '@/schemas';
import { $favorites } from '@/stores/favorites';
import { $goals } from '@/stores/goals';
import { $currentPlan } from '@/stores/planner';
import { $tracking, logBeverage, logEntry, logIngredient, logRecipe } from '@/stores/tracking';
import { formatAmount, formatDayKey, mealLabel } from './labels';

/**
 * QuickAdd — the tracking island's "log something" dialog (roadmap Issue 031;
 * port of legacy `QuickAddModal` + `quickAdd/{Recipe,Ingredient,Beverage}Tab`,
 * plus a water tab counted in glasses).
 *
 * The whole `Dialog` + `Tabs` composition lives in this one file and is
 * rendered inside the `TrackingToday` island root (compound components cannot
 * span islands). The body only mounts while the dialog is open, so every open
 * starts from a clean selection with the preselected meal.
 *
 * - Recipe: search (`searchRecipes`, localised names via `getTranslated`),
 *   favourites first, "from your meal plan" for the day, servings → scaled
 *   `calculateRecipeNutrition`.
 * - Ingredient: search + category, quantity/unit → `estimateIngredientNutrition`.
 * - Drink: the beverage catalog (39) by search/category, size presets or a
 *   quantity/unit → `calculateBeverageNutrition`; alcohol/caffeine notes.
 * - Water: glasses of `GLASS_ML`, logged as `bev_water` ml (counts towards the
 *   water goal).
 */

export type QuickAddTab = 'recipe' | 'ingredient' | 'beverage' | 'water';

export interface QuickAddDialogProps {
  lang: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `YYYY-MM-DD` the entry is logged on. */
  date: string;
  /** Meal preselected by the section's "Add" button. `beverage` opens the drink tab. */
  mealType?: TrackingMealType;
  recipes: ReadonlyArray<Recipe>;
  ingredients: ReadonlyArray<Ingredient>;
  beverages: ReadonlyArray<Beverage>;
  ingredientCategories?: ReadonlyArray<Category>;
  /** Catalog still loading → lists show a hint instead of "no matches". */
  loading?: boolean;
  onLogged?: (entry: TrackingEntry) => void;
}

const LIST_LIMIT = 30;
const INGREDIENT_UNITS = ['g', 'kg', 'lb', 'oz', 'cup', 'tbsp', 'tsp', 'piece'] as const;
const BEVERAGE_UNITS = ['ml', 'oz', 'cup', 'l'] as const;
const BEVERAGE_SIZES = [
  { key: 'sizeGlass', ml: 250 },
  { key: 'sizeCan', ml: 355 },
  { key: 'sizeBottle', ml: 500 },
] as const;
const ALL = 'all';

export function QuickAddDialog({ open, onOpenChange, lang, ...rest }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="quick-add-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'tracking.quickAdd')}</DialogTitle>
          <DialogDescription>{t(lang, 'tracking.quickAddDescription', { date: formatDayKey(rest.date, lang, 'long') })}</DialogDescription>
        </DialogHeader>
        <QuickAddBody lang={lang} onDone={() => onOpenChange(false)} {...rest} />
        <DialogClose
          render={<Button type="button" variant="ghost" size="sm" className="absolute right-3 top-3" />}
          aria-label={t(lang, 'common.close')}
          data-testid="quick-add-close"
        >
          <span aria-hidden="true">×</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

type BodyProps = Omit<QuickAddDialogProps, 'open' | 'onOpenChange'> & { onDone: () => void };

function QuickAddBody({ lang, date, mealType: preselected = 'breakfast', onDone, onLogged, ...catalog }: BodyProps) {
  const [tab, setTab] = React.useState<QuickAddTab>(preselected === 'beverage' ? 'beverage' : 'recipe');
  const [mealType, setMealType] = React.useState<TrackingMealType>(preselected);
  const mealSelectId = React.useId();

  const done = (entry: TrackingEntry) => {
    toast({ title: t(lang, 'tracking.entryLogged') });
    onLogged?.(entry);
    onDone();
  };
  // Food logged from the drink/water tabs is always a beverage; recipe and
  // ingredient entries keep the chosen meal (a smoothie recipe may be "beverage").
  const foodMeal = mealType;
  const mealItems = Object.fromEntries(TRACKING_MEAL_TYPES.map((m) => [m, mealLabel(lang, m)]));

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as QuickAddTab)} data-testid="quick-add-tabs">
      <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4" aria-label={t(lang, 'tracking.quickAdd')}>
        <TabsTrigger value="recipe" data-testid="quick-add-tab-recipe">{t(lang, 'tracking.tabRecipe')}</TabsTrigger>
        <TabsTrigger value="ingredient" data-testid="quick-add-tab-ingredient">{t(lang, 'tracking.tabIngredient')}</TabsTrigger>
        <TabsTrigger value="beverage" data-testid="quick-add-tab-beverage">{t(lang, 'tracking.tabBeverage')}</TabsTrigger>
        <TabsTrigger value="water" data-testid="quick-add-tab-water">{t(lang, 'tracking.tabWater')}</TabsTrigger>
      </TabsList>

      {tab === 'recipe' || tab === 'ingredient' ? (
        <div className="mt-4 grid gap-1.5" data-testid="quick-add-meal">
          <Label htmlFor={mealSelectId}>{t(lang, 'tracking.selectMealType')}</Label>
          <Select value={mealType} onValueChange={(value) => value && setMealType(value as TrackingMealType)} items={mealItems}>
            <SelectTrigger id={mealSelectId} className="w-full" data-testid="quick-add-meal-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKING_MEAL_TYPES.map((m) => (
                <SelectItem key={m} value={m}>
                  {mealItems[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <TabsContent value="recipe" className="mt-4">
        <RecipePanel lang={lang} date={date} mealType={foodMeal} recipes={catalog.recipes} loading={catalog.loading} onLogged={done} />
      </TabsContent>
      <TabsContent value="ingredient" className="mt-4">
        <IngredientPanel
          lang={lang}
          date={date}
          mealType={foodMeal}
          ingredients={catalog.ingredients}
          categories={catalog.ingredientCategories ?? []}
          loading={catalog.loading}
          onLogged={done}
        />
      </TabsContent>
      <TabsContent value="beverage" className="mt-4">
        <BeveragePanel lang={lang} date={date} beverages={catalog.beverages} loading={catalog.loading} onLogged={done} />
      </TabsContent>
      <TabsContent value="water" className="mt-4">
        <WaterPanel lang={lang} date={date} beverages={catalog.beverages} onLogged={done} />
      </TabsContent>
    </Tabs>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function SearchBox({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className="pl-9"
        autoComplete="off"
        data-testid={testId}
      />
    </div>
  );
}

function CategorySelect({
  lang,
  value,
  onChange,
  options,
  testId,
}: {
  lang: Locale;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ id: string; label: string }>;
  testId: string;
}) {
  const id = React.useId();
  const items: Record<string, string> = Object.fromEntries([[ALL, t(lang, 'tracking.allCategories')], ...options.map((o) => [o.id, o.label])]);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t(lang, 'tracking.categoryFilter')}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)} items={items}>
        <SelectTrigger id={id} className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PickList({ label, loading, lang, children, count }: { label: string; loading?: boolean; lang: Locale; children: React.ReactNode; count: number }) {
  if (count === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground" data-testid="quick-add-no-matches">
        {loading ? t(lang, 'tracking.loading') : t(lang, 'tracking.noMatches')}
      </p>
    );
  }
  return (
    <ul className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2" aria-label={label}>
      {children}
    </ul>
  );
}

function PickButton({
  selected,
  onSelect,
  title,
  meta,
  testId,
  dataId,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  meta: React.ReactNode;
  testId: string;
  dataId: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        data-testid={testId}
        data-id={dataId}
        className={cn(
          'w-full rounded-md border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/40',
        )}
      >
        <span className="block truncate font-medium text-foreground">{title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{meta}</span>
      </button>
    </li>
  );
}

function AmountField({
  lang,
  label,
  value,
  onChange,
  min,
  step,
  max,
  testId,
}: {
  lang: Locale;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  step: number;
  max: number;
  testId: string;
}) {
  const labelId = React.useId();
  return (
    <div className="grid gap-1.5" data-testid={testId}>
      <Label id={labelId}>{label}</Label>
      <NumberField
        aria-labelledby={labelId}
        value={value}
        onValueChange={(v) => onChange(v ?? min)}
        min={min}
        max={max}
        step={step}
        locale={lang === 'es' ? 'es-419' : lang}
      />
    </div>
  );
}

function UnitSelect({ lang, units, value, onChange, testId }: { lang: Locale; units: ReadonlyArray<string>; value: string; onChange: (u: string) => void; testId: string }) {
  const id = React.useId();
  const items = Object.fromEntries(units.map((u) => [u, unitLabel(lang, u)]));
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t(lang, 'tracking.unit')}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)} items={items}>
        <SelectTrigger id={id} className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {units.map((u) => (
            <SelectItem key={u} value={u}>
              {items[u]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NutritionPreview({ lang, nutrition, title, note }: { lang: Locale; nutrition: NutritionInfo; title: string; note?: string }) {
  const cells = [
    { key: 'calories', value: `${formatAmount(nutrition.calories, lang)} ${t(lang, 'nutrition.kcal')}` },
    { key: 'protein', value: `${formatAmount(nutrition.protein, lang)} g` },
    { key: 'carbs', value: `${formatAmount(nutrition.carbs, lang)} g` },
    { key: 'fat', value: `${formatAmount(nutrition.fat, lang)} g` },
  ];
  return (
    <section className="rounded-md bg-muted/50 p-3" aria-label={title} data-testid="quick-add-preview">
      <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.key}>
            <dt className="text-muted-foreground">{t(lang, `nutrition.${cell.key}`)}</dt>
            <dd className="font-medium tabular-nums text-foreground" data-testid={`preview-${cell.key}`}>
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
    </section>
  );
}

function LogButton({ lang, onClick, testId, children }: { lang: Locale; onClick: () => void; testId: string; children?: React.ReactNode }) {
  return (
    <Button type="button" className="w-full" onClick={onClick} data-testid={testId}>
      <PlusIcon className="size-4" aria-hidden="true" />
      {children ?? t(lang, 'tracking.logMeal')}
    </Button>
  );
}

// ── Recipe ───────────────────────────────────────────────────────────────────

function RecipePanel({
  lang,
  date,
  mealType,
  recipes,
  loading,
  onLogged,
}: {
  lang: Locale;
  date: string;
  mealType: TrackingMealType;
  recipes: ReadonlyArray<Recipe>;
  loading?: boolean;
  onLogged: (entry: TrackingEntry) => void;
}) {
  const favorites = useStore($favorites);
  const plan = useStore($currentPlan);
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [servings, setServings] = React.useState(1);

  const list = React.useMemo(() => {
    if (!query.trim()) {
      const favs = recipes.filter((r) => favorites.includes(r.id));
      const others = recipes.filter((r) => !favorites.includes(r.id));
      return [...favs, ...others].slice(0, LIST_LIMIT);
    }
    return searchRecipes(recipes, query, lang).slice(0, LIST_LIMIT);
  }, [recipes, favorites, query, lang]);

  const planned = React.useMemo(() => {
    const day = plan?.days[planDayIndex(date)];
    if (!day) return [];
    const meals: Array<{ recipeId: string; servings: number; meal: TrackingMealType }> = [];
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const m = day.meals[slot];
      if (m) meals.push({ ...m, meal: slot });
    }
    for (const snack of day.meals.snacks ?? []) meals.push({ ...snack, meal: 'snack' });
    return meals.filter((m) => recipes.some((r) => r.id === m.recipeId));
  }, [plan, date, recipes]);

  const selected = selectedId ? recipes.find((r) => r.id === selectedId) : undefined;
  const preview = selected ? calculateRecipeNutrition(selected, servings) : null;

  const log = (recipe: Recipe, count: number, meal: TrackingMealType, fromPlan = false) => {
    const nutrition = calculateRecipeNutrition(recipe, count);
    const entry = fromPlan
      ? // Same shape as `logRecipe`, plus the legacy `fromMealPlan` marker.
        logEntry({ date, time: nowTimeKey(), mealType: meal, recipeId: recipe.id, quantity: count, unit: 'servings', servings: count, nutrition, fromMealPlan: true })
      : logRecipe(recipe.id, meal, count, date, nutrition);
    onLogged(entry);
  };

  return (
    <div className="grid gap-4" data-testid="quick-add-recipe">
      <SearchBox label={t(lang, 'tracking.searchRecipes')} value={query} onChange={setQuery} testId="quick-add-recipe-search" />

      {planned.length > 0 && !query ? (
        <section aria-labelledby="quick-add-plan-title" className="grid gap-2" data-testid="quick-add-from-plan">
          <h3 id="quick-add-plan-title" className="text-sm font-medium text-foreground">
            {t(lang, 'tracking.fromYourPlan')}
          </h3>
          <ul className="grid gap-2">
            {planned.map((m, i) => {
              const recipe = recipes.find((r) => r.id === m.recipeId)!;
              const name = getTranslated(recipe.name, lang);
              return (
                <li key={`${m.recipeId}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mealLabel(lang, m.meal)} · {t(lang, 'tracking.servingsCount_plural').replace('{{count}}', formatAmount(m.servings, lang))}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => log(recipe, m.servings, m.meal, true)}
                    aria-label={`${t(lang, 'common.add')}: ${name}`}
                    data-testid="quick-add-plan-log"
                  >
                    <PlusIcon className="size-4" aria-hidden="true" />
                    {t(lang, 'common.add')}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <PickList label={t(lang, 'tracking.tabRecipe')} loading={loading} lang={lang} count={list.length}>
        {list.map((recipe) => (
          <PickButton
            key={recipe.id}
            selected={recipe.id === selectedId}
            onSelect={() => setSelectedId(recipe.id)}
            title={getTranslated(recipe.name, lang)}
            testId="quick-add-recipe-option"
            dataId={recipe.id}
            meta={
              <>
                <ClockIcon className="size-3" aria-hidden="true" />
                {recipe.totalTime} {t(lang, 'common.minutesAbbr')} · {recipe.nutrition.calories} {t(lang, 'nutrition.kcal')}
                {favorites.includes(recipe.id) ? (
                  <HeartIcon className="ml-auto size-3.5 fill-current text-destructive" aria-label={t(lang, 'tracking.favorite')} />
                ) : null}
              </>
            }
          />
        ))}
      </PickList>

      {selected && preview ? (
        <div className="grid gap-4 border-t border-border pt-4" data-testid="quick-add-recipe-details">
          <AmountField lang={lang} label={t(lang, 'tracking.servings')} value={servings} onChange={setServings} min={0.5} step={0.5} max={50} testId="quick-add-servings" />
          <NutritionPreview lang={lang} nutrition={preview} title={t(lang, 'tracking.nutritionPreview')} />
          <LogButton lang={lang} onClick={() => log(selected, servings, mealType)} testId="quick-add-log-recipe" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t(lang, 'tracking.selectItemHint')}</p>
      )}
    </div>
  );
}

// ── Ingredient ───────────────────────────────────────────────────────────────

function IngredientPanel({
  lang,
  date,
  mealType,
  ingredients,
  categories,
  loading,
  onLogged,
}: {
  lang: Locale;
  date: string;
  mealType: TrackingMealType;
  ingredients: ReadonlyArray<Ingredient>;
  categories: ReadonlyArray<Category>;
  loading?: boolean;
  onLogged: (entry: TrackingEntry) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string>(ALL);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(100);
  const [unit, setUnit] = React.useState<string>('g');

  const categoryOptions = React.useMemo(
    () => [...new Set(ingredients.map((i) => i.category))].map((id) => ({ id, label: getCategoryLabel(id, categories, lang) })),
    [ingredients, categories, lang],
  );
  const list = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return ingredients
      .filter((i) => category === ALL || i.category === category)
      .filter((i) => !term || getTranslated(i.name, lang).toLowerCase().includes(term))
      .slice(0, LIST_LIMIT);
  }, [ingredients, category, query, lang]);

  const selected = selectedId ? ingredients.find((i) => i.id === selectedId) : undefined;
  const preview = selected ? estimateIngredientNutrition(selected, quantity, unit) : null;

  return (
    <div className="grid gap-4" data-testid="quick-add-ingredient">
      <SearchBox label={t(lang, 'tracking.searchIngredients')} value={query} onChange={setQuery} testId="quick-add-ingredient-search" />
      <CategorySelect lang={lang} value={category} onChange={setCategory} options={categoryOptions} testId="quick-add-ingredient-category" />
      <PickList label={t(lang, 'tracking.tabIngredient')} loading={loading} lang={lang} count={list.length}>
        {list.map((ingredient) => (
          <PickButton
            key={ingredient.id}
            selected={ingredient.id === selectedId}
            onSelect={() => setSelectedId(ingredient.id)}
            title={getTranslated(ingredient.name, lang)}
            testId="quick-add-ingredient-option"
            dataId={ingredient.id}
            meta={getCategoryLabel(ingredient.category, categories, lang)}
          />
        ))}
      </PickList>
      {selected && preview ? (
        <div className="grid gap-4 border-t border-border pt-4" data-testid="quick-add-ingredient-details">
          <div className="grid gap-4 sm:grid-cols-2">
            <AmountField lang={lang} label={t(lang, 'tracking.quantity')} value={quantity} onChange={setQuantity} min={0.1} step={1} max={10000} testId="quick-add-quantity" />
            <UnitSelect lang={lang} units={INGREDIENT_UNITS} value={unit} onChange={setUnit} testId="quick-add-unit" />
          </div>
          <NutritionPreview lang={lang} nutrition={preview} title={t(lang, 'tracking.nutritionEstimate')} note={t(lang, 'tracking.estimateDisclaimer')} />
          <LogButton
            lang={lang}
            onClick={() => onLogged(logIngredient(selected.id, quantity, unit, mealType, date, preview))}
            testId="quick-add-log-ingredient"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t(lang, 'tracking.selectItemHint')}</p>
      )}
    </div>
  );
}

// ── Drink ────────────────────────────────────────────────────────────────────

function BeveragePanel({
  lang,
  date,
  beverages,
  loading,
  onLogged,
}: {
  lang: Locale;
  date: string;
  beverages: ReadonlyArray<Beverage>;
  loading?: boolean;
  onLogged: (entry: TrackingEntry) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string>(ALL);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(250);
  const [unit, setUnit] = React.useState<string>('ml');

  const categoryOptions = BEVERAGE_CATEGORIES.map((id) => ({ id, label: t(lang, `tracking.beverageCategories.${id}`) }));
  const list = React.useMemo(
    () => searchBeverages(beverages, query, lang).filter((b) => category === ALL || b.category === category).slice(0, LIST_LIMIT),
    [beverages, query, lang, category],
  );
  const selected = selectedId ? beverages.find((b) => b.id === selectedId) : undefined;
  const preview = selected ? calculateBeverageNutrition(selected, quantity, unit) : null;

  const select = (beverage: Beverage) => {
    setSelectedId(beverage.id);
    setQuantity(beverage.defaultQuantity);
    setUnit(BEVERAGE_UNITS.includes(beverage.defaultUnit as (typeof BEVERAGE_UNITS)[number]) ? beverage.defaultUnit : 'ml');
  };

  return (
    <div className="grid gap-4" data-testid="quick-add-beverage">
      <SearchBox label={t(lang, 'tracking.searchBeverages')} value={query} onChange={setQuery} testId="quick-add-beverage-search" />
      <CategorySelect lang={lang} value={category} onChange={setCategory} options={categoryOptions} testId="quick-add-beverage-category" />
      <PickList label={t(lang, 'tracking.tabBeverage')} loading={loading} lang={lang} count={list.length}>
        {list.map((beverage) => (
          <PickButton
            key={beverage.id}
            selected={beverage.id === selectedId}
            onSelect={() => select(beverage)}
            title={getTranslated(beverage.name, lang)}
            testId="quick-add-beverage-option"
            dataId={beverage.id}
            meta={`${t(lang, `tracking.beverageCategories.${beverage.category}`)} · ${beverage.nutrition.calories} ${t(lang, 'nutrition.kcal')}`}
          />
        ))}
      </PickList>
      {selected && preview ? (
        <div className="grid gap-4 border-t border-border pt-4" data-testid="quick-add-beverage-details">
          {selected.isAlcoholic || (selected.caffeine ?? 0) > 0 ? (
            <div role="note" className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground" data-testid="quick-add-beverage-warning">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div>
                {selected.isAlcoholic ? <p>{t(lang, 'tracking.containsAlcohol')}</p> : null}
                {(selected.caffeine ?? 0) > 0 ? (
                  <p>
                    {t(lang, 'tracking.containsCaffeine', {
                      mg: selected.caffeine ?? 0,
                      size: `${selected.defaultQuantity} ${unitLabel(lang, selected.defaultUnit)}`,
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium leading-none">{t(lang, 'tracking.size')}</legend>
            <div className="flex flex-wrap gap-2">
              {BEVERAGE_SIZES.map((size) => (
                <Button
                  key={size.key}
                  type="button"
                  size="sm"
                  variant={unit === 'ml' && quantity === size.ml ? 'default' : 'outline'}
                  aria-pressed={unit === 'ml' && quantity === size.ml}
                  onClick={() => {
                    setUnit('ml');
                    setQuantity(size.ml);
                  }}
                  data-testid={`quick-add-size-${size.ml}`}
                >
                  {t(lang, `tracking.${size.key}`)}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <AmountField lang={lang} label={t(lang, 'tracking.quantity')} value={quantity} onChange={setQuantity} min={1} step={10} max={5000} testId="quick-add-beverage-quantity" />
            <UnitSelect lang={lang} units={BEVERAGE_UNITS} value={unit} onChange={setUnit} testId="quick-add-beverage-unit" />
          </div>
          <NutritionPreview lang={lang} nutrition={preview} title={t(lang, 'tracking.nutritionPreview')} />
          <LogButton
            lang={lang}
            onClick={() => onLogged(logBeverage(selected.id, quantity, unit, date, preview))}
            testId="quick-add-log-beverage"
          >
            {t(lang, 'tracking.logBeverage')}
          </LogButton>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t(lang, 'tracking.selectItemHint')}</p>
      )}
    </div>
  );
}

// ── Water ────────────────────────────────────────────────────────────────────

function WaterPanel({
  lang,
  date,
  beverages,
  onLogged,
}: {
  lang: Locale;
  date: string;
  beverages: ReadonlyArray<Beverage>;
  onLogged: (entry: TrackingEntry) => void;
}) {
  const entries = useStore($tracking);
  const goals = useStore($goals);
  const [glasses, setGlasses] = React.useState(1);
  const logged = waterMl(entriesByDate(entries, date));
  const water = beverages.find((b) => b.id === WATER_BEVERAGE_ID);

  const log = () => {
    const ml = glasses * GLASS_ML;
    const nutrition = water ? calculateBeverageNutrition(water, ml, 'ml') : createEmptyNutrition();
    const entry = logBeverage(WATER_BEVERAGE_ID, ml, 'ml', date, nutrition);
    toast({ title: t(lang, 'tracking.waterLogged', { ml: formatAmount(ml, lang) }) });
    onLogged(entry);
  };

  return (
    <div className="grid gap-4" data-testid="quick-add-water">
      <div className="flex items-center gap-3 rounded-md border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
        <DropletIcon className="size-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        <p data-testid="quick-add-water-status">
          {t(lang, 'tracking.waterSoFar', { consumed: formatAmount(logged, lang), goal: formatAmount(goals.water ?? 0, lang) })}
        </p>
      </div>
      <AmountField lang={lang} label={t(lang, 'tracking.glasses')} value={glasses} onChange={(v) => setGlasses(Math.max(1, Math.round(v)))} min={1} step={1} max={20} testId="quick-add-glasses" />
      <p className="text-xs text-muted-foreground">{t(lang, 'tracking.glassHint', { ml: GLASS_ML })}</p>
      <LogButton lang={lang} onClick={log} testId="quick-add-log-water">
        {t(lang, 'tracking.logGlasses', { count: glasses })}
      </LogButton>
    </div>
  );
}
