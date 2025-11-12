import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '@/i18n';

describe('i18n Configuration', () => {
  beforeEach(async () => {
    // Wait for translations to load
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Translation Loading', () => {
    it('should load English translations', async () => {
      await i18n.changeLanguage('en');

      expect(i18n.t('app.name')).toBe('Foodie');
      expect(i18n.t('app.tagline')).toBe('Your Personal Meal Planning Assistant');
    });

    it('should load Spanish translations', async () => {
      await i18n.changeLanguage('es');

      expect(i18n.t('app.name')).toBe('Foodie');
      expect(i18n.t('app.tagline')).toBe('Tu Asistente Personal de Planificación de Comidas');
    });

    it('should load French translations', async () => {
      await i18n.changeLanguage('fr');

      expect(i18n.t('app.name')).toBe('Foodie');
      expect(i18n.t('app.tagline')).toBe('Votre Assistant Personnel de Planification de Repas');
    });
  });

  describe('Navigation Translations', () => {
    it('should translate navigation items in English', async () => {
      await i18n.changeLanguage('en');

      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.t('nav.recipes')).toBe('Recipes');
      expect(i18n.t('nav.planner')).toBe('Meal Planner');
      expect(i18n.t('nav.shopping')).toBe('Shopping List');
      expect(i18n.t('nav.pantry')).toBe('Pantry');
      expect(i18n.t('nav.contribute')).toBe('Contribute');
    });

    it('should translate navigation items in Spanish', async () => {
      await i18n.changeLanguage('es');

      expect(i18n.t('nav.home')).toBe('Inicio');
      expect(i18n.t('nav.recipes')).toBe('Recetas');
      expect(i18n.t('nav.planner')).toBe('Planificador de Comidas');
    });

    it('should translate navigation items in French', async () => {
      await i18n.changeLanguage('fr');

      expect(i18n.t('nav.home')).toBe('Accueil');
      expect(i18n.t('nav.recipes')).toBe('Recettes');
      expect(i18n.t('nav.planner')).toBe('Planificateur de Repas');
    });
  });

  describe('Translation Key Validation', () => {
    it('should not return translation keys as values', async () => {
      await i18n.changeLanguage('en');

      const translated = i18n.t('app.name');

      // Should not return the key itself
      expect(translated).not.toBe('app.name');

      // Should not match pattern of translation keys (word.word)
      expect(translated).not.toMatch(/^[a-z]+\.[a-z]+$/);
    });

    it('should not return nested keys as values', async () => {
      await i18n.changeLanguage('en');

      const keys = [
        'app.name',
        'app.tagline',
        'nav.home',
        'common.save',
        'recipe.ingredients',
      ];

      keys.forEach(key => {
        const translated = i18n.t(key);
        expect(translated).not.toBe(key);
        expect(translated.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Language Fallback', () => {
    it('should fallback to English for unsupported languages', async () => {
      await i18n.changeLanguage('de'); // German (not supported)

      // Should fallback to English
      expect(i18n.language).toBe('en');
      expect(i18n.t('app.name')).toBe('Foodie');
    });

    it('should handle missing translation keys gracefully', async () => {
      await i18n.changeLanguage('en');

      const nonExistentKey = 'this.key.does.not.exist';
      const result = i18n.t(nonExistentKey);

      // i18next returns the key itself for missing translations
      expect(result).toBe(nonExistentKey);
    });
  });

  describe('Supported Languages', () => {
    it('should support exactly three languages', () => {
      const supportedLanguages = i18n.options.supportedLngs?.filter(lang => lang !== 'cimode');
      expect(supportedLanguages).toHaveLength(3);
      expect(supportedLanguages).toContain('en');
      expect(supportedLanguages).toContain('es');
      expect(supportedLanguages).toContain('fr');
    });
  });

  describe('Common Translations', () => {
    it('should have common action translations', async () => {
      await i18n.changeLanguage('en');

      expect(i18n.t('common.save')).not.toBe('common.save');
      expect(i18n.t('common.cancel')).not.toBe('common.cancel');
      expect(i18n.t('common.delete')).not.toBe('common.delete');
      expect(i18n.t('common.edit')).not.toBe('common.edit');
    });
  });

  describe('Recipe Translations', () => {
    it('should have recipe-related translations', async () => {
      await i18n.changeLanguage('en');

      expect(i18n.t('recipe.ingredients')).not.toBe('recipe.ingredients');
      expect(i18n.t('recipe.instructions')).not.toBe('recipe.instructions');
      expect(i18n.t('recipe.prepTime')).not.toBe('recipe.prepTime');
      expect(i18n.t('recipe.cookTime')).not.toBe('recipe.cookTime');
    });
  });
});
