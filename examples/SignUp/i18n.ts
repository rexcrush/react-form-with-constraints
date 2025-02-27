import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fr = require('./locales/fr/translation.json');

export default i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,

    fallbackLng: 'en',

    detection: {
      caches: []
    },

    // Allow keys to be phrases having `:`, `.`
    nsSeparator: false,
    keySeparator: false,

    interpolation: {
      escapeValue: false // Not needed with React
    },

    resources: {
      fr: { translation: fr }
    }
  });
