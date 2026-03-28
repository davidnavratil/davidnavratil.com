import { translations, type Locale, type TranslationKey } from './translations';

export function useTranslations(locale: string | undefined) {
  const lang = (locale ?? 'cs') as Locale;
  return (key: TranslationKey) => translations[lang]?.[key] ?? translations['cs'][key];
}

export function getAlternatePath(locale: string | undefined, path: string = '/') {
  if (!locale || locale === 'cs') {
    return `/en${path}`;
  }
  return path;
}
