import en from '../locales/en.json';
import ar from '../locales/ar.json';

type Locale = 'en' | 'ar';

const locales: Record<Locale, Record<string, any>> = { en, ar };

/** Resolve nested key like "auth.loginSuccess" from a locale object */
const resolvePath = (obj: Record<string, any>, path: string): string => {
  const value = path.split('.').reduce((acc, key) => acc?.[key], obj);
  return typeof value === 'string' ? value : path;
};

/**
 * Translate a dot-notation key for the given locale.
 * Interpolates {{placeholder}} tokens with the provided params.
 */
export const t = (
  lang: string,
  key: string,
  params?: Record<string, string>
): string => {
  const locale: Locale = lang === 'ar' ? 'ar' : 'en';
  let message = resolvePath(locales[locale], key);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      message = message.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });
  }

  return message;
};

export type { Locale };
