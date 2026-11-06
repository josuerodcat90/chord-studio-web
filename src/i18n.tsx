import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './locales/en';
import es from './locales/es';
import appEn from './locales/app-en';
import appEs from './locales/app-es';
import valuesEs from './locales/values-es';
import tourEn from './locales/tour-en';
import tourEs from './locales/tour-es';

export type Language = 'en' | 'es';
const storageKey = 'chord-language';

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'en' || saved === 'es') return saved;
  } catch { /* Fall back to the browser language. */ }
  return /^es(?:-|$)/i.test(navigator.language) ? 'es' : 'en';
}

const selectedLanguage = initialLanguage();

i18n.use({
  type: 'postProcessor',
  name: 'uppercase',
  process: (value: string) => value.toLocaleUpperCase(),
}).use(initReactI18next).init({
  resources: { en: { translation: { ...en, app: appEn, tour: tourEn } }, es: { translation: { ...es, app: appEs, tour: tourEs, values: valuesEs } } },
  lng: selectedLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  postProcess: ['uppercase'],
  initAsync: false,
});
document.documentElement.lang = selectedLanguage;
i18n.on('languageChanged', language => { document.documentElement.lang = language; });

export function useLanguage() {
  const { i18n: instance } = useTranslation();
  const language = instance.language as Language;
  const changeLanguage = (value: Language) => {
    void instance.changeLanguage(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Keep the choice for this session. */ }
  };
  return { language, changeLanguage };
}
