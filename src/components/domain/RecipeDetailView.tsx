import * as React from 'react';
import { ChefHatIcon, ClockIcon, FlameIcon, StarIcon, UsersIcon } from 'lucide-react';
import { DietaryBadges } from '@/components/domain/DietaryBadges';
import { DifficultyBadge } from '@/components/domain/DifficultyBadge';
import { RecipeArt } from '@/components/domain/RecipeCard';
import { getTranslated, t, type Locale } from '@/i18n';
import { humanizeId } from '@/lib/domain/recipe-detail';
import type { Recipe } from '@/schemas';

/**
 * The static parts of a recipe's detail page (roadmap Issue 018), shared by
 * `components/pages/RecipeDetail.astro` (rendered at build, no JS) and the
 * contribute wizard's preview (roadmap Issue 038), so the preview is the
 * public page's own markup rather than a look-alike.
 *
 *  - `RecipeDetailHeader` — eyebrow, title, description, difficulty and
 *    dietary badges, the times/servings/calories/cuisine/rating grid and the art.
 *  - `RecipeDetailExtras` — tips and equipment.
 *
 * The yield-dependent body (ingredients, steps, nutrition) is the
 * `RecipeDetailActions` island, which the preview renders with `preview`.
 */
export interface RecipeDetailHeaderProps {
  recipe: Recipe;
  lang: Locale;
  /** Localised cuisine labels (`cuisineLabels`). */
  cuisineNames: ReadonlyArray<string>;
  /** Localised meal type (`mealTypeLabel`). */
  mealTypeName: string;
  /** `h1` on the public page; the wizard preview nests it under its own heading. */
  titleAs?: 'h1' | 'h2';
  /** The public page names the title for view transitions from the recipe card; a preview must not. */
  viewTransition?: boolean;
}

export function RecipeDetailHeader({
  recipe,
  lang,
  cuisineNames,
  mealTypeName,
  titleAs: Title = 'h1',
  viewTransition = true,
}: RecipeDetailHeaderProps) {
  const name = getTranslated(recipe.name, lang);
  const description = getTranslated(recipe.description, lang);
  const minutes = t(lang, 'common.minutes');
  const times = [
    { key: 'prep', label: t(lang, 'recipe.prepTime'), value: recipe.prepTime },
    { key: 'cook', label: t(lang, 'recipe.cookTime'), value: recipe.cookTime },
    { key: 'total', label: t(lang, 'recipe.totalTime'), value: recipe.totalTime },
  ];
  const dt = 'flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground';

  return (
    <header className="grid gap-8 lg:grid-cols-5 lg:items-center">
      <div className="lg:col-span-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          {t(lang, 'recipe.detailEyebrow')} · {mealTypeName}
        </p>
        <Title
          className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          style={viewTransition ? { viewTransitionName: `recipe-${recipe.id}` } : undefined}
        >
          {name}
        </Title>
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={recipe.difficulty} lang={lang} />
          <DietaryBadges labels={recipe.dietaryLabels} lang={lang} max={8} />
        </div>

        <dl
          className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4"
          data-testid="recipe-meta"
        >
          {times.map((time) => (
            <div key={time.key} data-time={time.key}>
              <dt className={dt}>
                <ClockIcon className="size-3.5" aria-hidden="true" />
                {time.label}
              </dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">
                {time.value} {minutes}
              </dd>
            </div>
          ))}
          <div>
            <dt className={dt}>
              <UsersIcon className="size-3.5" aria-hidden="true" />
              {t(lang, 'recipe.servings')}
            </dt>
            <dd className="mt-1 font-semibold tabular-nums text-foreground">{recipe.servings}</dd>
          </div>
          <div>
            <dt className={dt}>
              <FlameIcon className="size-3.5" aria-hidden="true" />
              {t(lang, 'nutrition.calories')}
            </dt>
            <dd className="mt-1 font-semibold tabular-nums text-foreground">
              {recipe.nutrition.calories} {t(lang, 'nutrition.kcal')}
            </dd>
          </div>
          <div>
            <dt className={dt}>
              <ChefHatIcon className="size-3.5" aria-hidden="true" />
              {t(lang, 'recipe.cuisine')}
            </dt>
            <dd className="mt-1 font-semibold text-foreground">{cuisineNames.join(', ')}</dd>
          </div>
          <div>
            <dt className={dt}>
              <StarIcon className="size-3.5" aria-hidden="true" />
              {t(lang, 'recipe.rating')}
            </dt>
            <dd className="mt-1 font-semibold tabular-nums text-foreground">
              {recipe.rating.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground">
                {' '}
                · {t(lang, 'recipe.reviewCount', { count: recipe.reviewCount })}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border lg:col-span-2">
        <RecipeArt recipe={recipe} lang={lang} />
      </div>
    </header>
  );
}

export interface RecipeDetailExtrasProps {
  recipe: Recipe;
  lang: Locale;
  className?: string;
}

/** Tips and equipment; renders nothing when the recipe has neither. */
export function RecipeDetailExtras({ recipe, lang, className = 'mt-10' }: RecipeDetailExtrasProps) {
  const tips = recipe.tips ? getTranslated(recipe.tips, lang) : '';
  if (!tips && recipe.equipment.length === 0) return null;
  return (
    <div className={`${className} grid gap-6 md:grid-cols-2`}>
      {tips && (
        <section aria-labelledby="recipe-tips-heading" className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 id="recipe-tips-heading" className="font-display text-xl font-semibold text-foreground">
            {t(lang, 'recipe.tips')}
          </h2>
          <p className="mt-3 text-muted-foreground">{tips}</p>
        </section>
      )}
      {recipe.equipment.length > 0 && (
        <section
          aria-labelledby="recipe-equipment-heading"
          className="rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <h2 id="recipe-equipment-heading" className="font-display text-xl font-semibold text-foreground">
            {t(lang, 'recipe.equipment')}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2" data-testid="recipe-equipment">
            {recipe.equipment.map((item) => (
              <li key={item} className="rounded-full bg-muted px-3 py-1 text-sm capitalize text-foreground">
                {humanizeId(item)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
