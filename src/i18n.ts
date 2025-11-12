import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr'],
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    resources: {
      en: {
        translation: {},
      },
      es: {
        translation: {},
      },
      fr: {
        translation: {},
      },
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Load translations dynamically
const loadTranslations = async (lang: string) => {
  try {
    const response = await fetch(`/locales/${lang}/translation.json`);
    const translations = await response.json();
    i18n.addResourceBundle(lang, 'translation', translations, true, true);
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
  }
};

// Load all supported languages
['en', 'es', 'fr'].forEach(lang => {
  loadTranslations(lang);
});

export default i18n;
