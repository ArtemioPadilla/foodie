import * as React from 'react';
import { t, type Locale } from '@/i18n';
import { cuisineOptions, mealTypeOptions } from '@/lib/domain/contribute';
import { DIFFICULTIES, MEAL_TYPES, type CategoriesFile } from '@/schemas';
import { SelectField, TextField } from './fields';

/** Step 1 — trilingual name and description, cuisine, difficulty, meal type, image URL. */
export function BasicInfoStep({ lang, categories }: { lang: Locale; categories: CategoriesFile }) {
  const cuisines = React.useMemo(() => cuisineOptions(categories, lang), [categories, lang]);
  const mealTypes = React.useMemo(() => mealTypeOptions(categories, lang, MEAL_TYPES), [categories, lang]);
  const difficulties = React.useMemo(
    () => DIFFICULTIES.map((value) => ({ value, label: t(lang, `recipe.difficulty_${value}`) })),
    [lang],
  );
  const required = (text: string) => `${text} *`;

  return (
    <div className="grid gap-6" data-testid="contribute-step-basic">
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.basicInfoTip')}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField lang={lang} name="nameEn" label={required(t(lang, 'contribute.recipeNameEn'))} testId="contribute-name-en" />
        <TextField lang={lang} name="nameEs" label={t(lang, 'contribute.recipeNameEs')} testId="contribute-name-es" />
        <TextField lang={lang} name="nameFr" label={t(lang, 'contribute.recipeNameFr')} testId="contribute-name-fr" />
      </div>
      <TextField
        lang={lang}
        name="descriptionEn"
        multiline
        label={required(t(lang, 'contribute.recipeDescriptionEn'))}
        testId="contribute-description-en"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          lang={lang}
          name="descriptionEs"
          multiline
          label={t(lang, 'contribute.recipeDescriptionEs')}
          testId="contribute-description-es"
        />
        <TextField
          lang={lang}
          name="descriptionFr"
          multiline
          label={t(lang, 'contribute.recipeDescriptionFr')}
          testId="contribute-description-fr"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          lang={lang}
          name="cuisine"
          label={required(t(lang, 'contribute.cuisine'))}
          placeholder={t(lang, 'contribute.selectCuisine')}
          options={cuisines}
          testId="contribute-cuisine"
        />
        <SelectField
          lang={lang}
          name="difficulty"
          label={required(t(lang, 'contribute.difficulty'))}
          placeholder={t(lang, 'contribute.selectDifficulty')}
          options={difficulties}
          testId="contribute-difficulty"
        />
        <SelectField
          lang={lang}
          name="mealType"
          label={required(t(lang, 'contribute.mealType'))}
          placeholder={t(lang, 'contribute.selectMealType')}
          options={mealTypes}
          testId="contribute-meal-type"
        />
      </div>
      <TextField
        lang={lang}
        name="imageUrl"
        type="url"
        label={t(lang, 'contribute.imageUrl')}
        description={t(lang, 'contribute.imageUrlHint')}
        placeholder="https://"
        testId="contribute-image-url"
      />
    </div>
  );
}
