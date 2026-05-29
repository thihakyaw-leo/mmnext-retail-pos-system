import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationMM from './locales/mm/translation.json';
import translationTH from './locales/th/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  mm: {
    translation: translationMM
  },
  th: {
    translation: translationTH
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;
