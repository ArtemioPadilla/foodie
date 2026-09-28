/**
 * Per-component usage recipes for the /gallery/<slug> detail pages.
 *
 * Keyed by the same `slug` used in `gallery.ts`. Each recipe is a short,
 * realistic usage example importing from `@/components/ui/...`, rendered on the
 * detail page through `src/components/gallery/CodeSnippet.astro`.
 *
 * If a slug is absent here, the detail page falls back to a short prose line
 * and the GitHub source link — so this map can grow incrementally.
 */

export interface GalleryRecipe {
  /** Raw source to render + copy. */
  code: string;
  /** Shiki language id. */
  lang: string;
}

export const galleryRecipes: Record<string, GalleryRecipe> = {
  'recipe-card': {
    lang: 'tsx',
    code: `import { RecipeCard } from '@/components/domain/RecipeCard';
import { withBase } from '@/lib/href';
import { localizedRoute, type Locale } from '@/i18n';
import type { Recipe } from '@/schemas';

export function RecipeGrid({ recipes, lang }: { recipes: Recipe[]; lang: Locale }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="flex">
          <RecipeCard
            recipe={recipe}
            lang={lang}
            href={withBase(localizedRoute(\`/recipes/\${recipe.id}/\`, lang))}
            className="w-full"
          />
        </li>
      ))}
    </ul>
  );
}`,
  },
  'ingredient-card': {
    lang: 'tsx',
    code: `import { IngredientCard } from '@/components/domain/IngredientCard';
import { withBase } from '@/lib/href';
import { localizedRoute, type Locale } from '@/i18n';
import type { Ingredient } from '@/schemas';

// categoryName comes from categories.ingredientCategories (localised).
export function IngredientTile({ ingredient, categoryName, lang }: { ingredient: Ingredient; categoryName: string; lang: Locale }) {
  return (
    <IngredientCard
      ingredient={ingredient}
      categoryName={categoryName}
      lang={lang}
      href={withBase(localizedRoute(\`/ingredients/\${ingredient.id}/\`, lang))}
    />
  );
}`,
  },
  'nutrition-facts': {
    lang: 'tsx',
    code: `import { NutritionFacts } from '@/components/domain/NutritionFacts';

// Values are per serving; servings / baseServings scales them
// (kcal and mg rounded to integers, grams to one decimal).
<NutritionFacts nutrition={recipe.nutrition} baseServings={recipe.servings} servings={servings} lang={lang} />`,
  },
  'dietary-badges': {
    lang: 'tsx',
    code: `import { DietaryBadges } from '@/components/domain/DietaryBadges';

// Order is fixed by DIETARY_LABEL_KEYS; flags past \`max\` collapse into "+N".
<DietaryBadges labels={recipe.dietaryLabels} lang="es" max={3} />`,
  },
  'difficulty-badge': {
    lang: 'tsx',
    code: `import { DifficultyBadge } from '@/components/domain/DifficultyBadge';

<DifficultyBadge difficulty={recipe.difficulty} lang={lang} />`,
  },
  'time-badge': {
    lang: 'tsx',
    code: `import { TimeBadge } from '@/components/domain/TimeBadge';
import { t } from '@/i18n';

<p className="flex gap-4 text-sm text-muted-foreground">
  <TimeBadge minutes={recipe.totalTime} lang={lang} label={t(lang, 'recipe.totalTime')} />
  <TimeBadge minutes={recipe.prepTime} lang={lang} appearance="badge" iconClassName="size-3" />
</p>`,
  },
  'category-chip': {
    lang: 'tsx',
    code: `import { CategoryChip, categoryClasses } from '@/components/domain/CategoryChip';

// Dot + label in a meta row, or a bordered chip in a filter bar.
<CategoryChip category={ingredient.category} label={categoryName} />
<CategoryChip category="spices" label="Especias" appearance="chip" />

// The same token as a card stripe:
<div className={cn('border-l-4', categoryClasses(ingredient.category).stripe)} />`,
  },
  'servings-adjuster': {
    lang: 'tsx',
    code: `import { useState } from 'react';
import { ServingsAdjuster } from '@/components/domain/ServingsAdjuster';
import { NutritionFacts } from '@/components/domain/NutritionFacts';

export function Servings({ recipe, lang }: { recipe: Recipe; lang: Locale }) {
  const [servings, setServings] = useState(recipe.servings);
  return (
    <>
      <ServingsAdjuster servings={servings} originalServings={recipe.servings} onChange={setServings} lang={lang} />
      <NutritionFacts nutrition={recipe.nutrition} baseServings={recipe.servings} servings={servings} lang={lang} />
    </>
  );
}`,
  },
  'recipe-timer': {
    lang: 'tsx',
    code: `import { useState } from 'react';
import { RecipeTimer } from '@/components/domain/RecipeTimer';
import { Button } from '@/components/ui/button';

// Trigger and Dialog must live in the same island (one React root).
export function StepTimer({ step, lang }: { step: RecipeInstruction; lang: Locale }) {
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0); // new key = fresh countdown
  return (
    <>
      <Button onClick={() => { setRun((r) => r + 1); setOpen(true); }}>Timer</Button>
      <RecipeTimer key={run} open={open} onOpenChange={setOpen} minutes={step.time ?? 0} stepLabel={\`Step \${step.step}\`} lang={lang} />
    </>
  );
}`,
  },
  'favorite-button': {
    lang: 'tsx',
    code: `import { FavoriteButton } from '@/components/domain/FavoriteButton';
import { Toaster } from '@/components/ui/toast';

// One <Toaster /> per island that toasts (toastManager is a module singleton).
export function RecipeActions({ recipe, name, lang }: { recipe: Recipe; name: string; lang: Locale }) {
  return (
    <>
      <FavoriteButton recipeId={recipe.id} recipeName={name} lang={lang} />
      <Toaster />
    </>
  );
}`,
  },
  primitives: {
    lang: 'tsx',
    code: `import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignIn() {
  return (
    <form className="space-y-3">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
      <Button type="submit">Sign in</Button>
    </form>
  );
}`,
  },

  'form-controls': {
    lang: 'tsx',
    code: `import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

export function Preferences() {
  return (
    <div className="space-y-4">
      <Select items={[{ value: 'sm', label: 'Small' }, { value: 'lg', label: 'Large' }]} />
      <label className="flex items-center gap-2">
        <Checkbox defaultChecked /> Email me updates
      </label>
      <Switch aria-label="Dark mode" />
    </div>
  );
}`,
  },

  advanced: {
    lang: 'tsx',
    code: `import { NumberField } from '@/components/ui/number-field';
import { Rating } from '@/components/ui/rating';
import { TagInput } from '@/components/ui/tag-input';

export function ReviewForm() {
  return (
    <div className="space-y-4">
      <NumberField defaultValue={1} min={1} max={99} aria-label="Quantity" />
      <Rating defaultValue={4} aria-label="Stars" />
      <TagInput defaultValue={['astro', 'react']} placeholder="Add tag…" />
    </div>
  );
}`,
  },

  navigation: {
    lang: 'tsx',
    code: `import { Combobox } from '@/components/ui/combobox';
import { CommandPalette } from '@/components/ui/command-palette';

const frameworks = [
  { value: 'astro', label: 'Astro' },
  { value: 'next', label: 'Next.js' },
];

export function Nav() {
  return (
    <div className="space-y-4">
      <Combobox items={frameworks} placeholder="Pick a framework…" />
      {/* Opens on ⌘K */}
      <CommandPalette items={frameworks} />
    </div>
  );
}`,
  },

  overlays: {
    lang: 'tsx',
    code: `import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export function HelpTip() {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost">?</Button>} />
      <TooltipContent>Single source of truth lives in gallery.ts</TooltipContent>
    </Tooltip>
  );
}`,
  },

  disclosure: {
    lang: 'tsx',
    code: `import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

export function Faq() {
  return (
    <Accordion>
      <AccordionItem value="idd">
        <AccordionTrigger>What is Issue-Driven Development?</AccordionTrigger>
        <AccordionContent>Every feature starts as a GitHub issue.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}`,
  },

  feedback: {
    lang: 'tsx',
    code: `import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Meter } from '@/components/ui/meter';

export function Status() {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">Build failed — see logs.</Alert>
      <Spinner aria-label="Loading" />
      <Meter value={72} aria-label="Disk usage" />
    </div>
  );
}`,
  },

  dialog: {
    lang: 'tsx',
    code: `import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// One island per compound component — trigger + content share React state.
export default function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button>Delete</Button>} />
      <DialogContent>
        <DialogTitle>Are you sure?</DialogTitle>
        This action cannot be undone.
      </DialogContent>
    </Dialog>
  );
}`,
  },

  'dropdown-menu': {
    lang: 'tsx',
    code: `import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function ActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline">Actions</Button>} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}`,
  },

  tabs: {
    lang: 'tsx',
    code: `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SettingsTabs() {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings…</TabsContent>
      <TabsContent value="billing">Billing settings…</TabsContent>
    </Tabs>
  );
}`,
  },

  toast: {
    lang: 'tsx',
    code: `import { ToastProvider, useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

function Notify() {
  const toast = useToast();
  return (
    <Button onClick={() => toast.add({ title: 'Saved', description: 'Changes stored.' })}>
      Save
    </Button>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Notify />
    </ToastProvider>
  );
}`,
  },

  form: {
    lang: 'tsx',
    code: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({ email: z.string().email() });

export default function Subscribe() {
  const form = useForm({ resolver: zodResolver(schema) });
  return (
    <Form {...form} onSubmit={form.handleSubmit(console.log)}>
      <FormField name="email" render={({ field }) => <Input {...field} />} />
      <Button type="submit">Subscribe</Button>
    </Form>
  );
}`,
  },

  'data-table': {
    lang: 'tsx',
    code: `import { DataTable } from '@/components/ui/data-table';

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
];

const rows = [
  { name: 'Astro 5 upgrade', status: 'merged' },
  { name: 'Tailwind v4 migration', status: 'open' },
];

export default function Issues() {
  return <DataTable columns={columns} data={rows} />;
}`,
  },

  kpis: {
    lang: 'tsx',
    code: `import { KpiCard } from '@/components/ui/kpi-card';
import { ProgressBar } from '@/components/ui/progress-bar';

export function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <KpiCard title="Open issues" value="12" delta="-3" />
      <ProgressBar value={64} label="Sprint progress" />
    </div>
  );
}`,
  },

  charts: {
    lang: 'tsx',
    code: `import { LineChart } from '@/components/ui/charts';

const data = [
  { month: 'Jan', prs: 8 },
  { month: 'Feb', prs: 14 },
  { month: 'Mar', prs: 11 },
];

// Colors come from --chart-1..5 CSS vars (dark-mode aware).
export function Throughput() {
  return <LineChart data={data} index="month" categories={['prs']} />;
}`,
  },

  motion: {
    lang: 'tsx',
    code: `import { LazyMotion, domAnimation, m } from 'motion/react';

// LazyMotion + domAnimation keeps the motion runtime in a lazy chunk.
export default function FadeIn() {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        Hello, motion
      </m.div>
    </LazyMotion>
  );
}`,
  },

  pwa: {
    lang: 'astro',
    code: `---
import InstallButton from '@/components/islands/InstallButton';
import UpdateToast from '@/components/islands/UpdateToast';
---
{/* Driven by virtual:pwa-register events through Nano Stores. */}
<InstallButton client:idle />
<UpdateToast client:idle />`,
  },

  extras: {
    lang: 'tsx',
    code: `import { Timeline } from '@/components/ui/timeline';
import { BarList } from '@/components/ui/bar-list';

export function Activity() {
  return (
    <div className="space-y-6">
      <Timeline items={[{ title: 'Opened', at: '09:00' }, { title: 'Merged', at: '11:30' }]} />
      <BarList data={[{ name: '/gallery', value: 421 }, { name: '/docs', value: 188 }]} />
    </div>
  );
}`,
  },

  'error-boundary': {
    lang: 'tsx',
    code: `import ErrorBoundary from '@/components/islands/ErrorBoundary';
import RiskyIsland from '@/components/islands/RiskyIsland';

// On throw, builds a pre-filled GitHub issue: stack, component path, URL, UA.
export default function Wrapped() {
  return (
    <ErrorBoundary componentPath="src/components/islands/RiskyIsland.tsx">
      <RiskyIsland />
    </ErrorBoundary>
  );
}`,
  },
};
