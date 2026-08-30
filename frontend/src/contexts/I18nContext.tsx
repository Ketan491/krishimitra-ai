import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DICTIONARIES, getLanguage, setLanguage as persistLanguage, t } from '../lib/i18n';
import type { Dictionary, Language } from '../lib/i18n';

export interface I18nContextValue {
  lang: Language;
  dict: Dictionary;
  setLang: (lang: Language) => void;
  translate: (keyPath: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => getLanguage());

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    persistLanguage(next);
    document.documentElement.lang = next;
  }, []);

  const dict = useMemo(() => DICTIONARIES[lang], [lang]);
  const translateFn = useCallback((keyPath: string) => t(keyPath, dict, lang), [dict, lang]);

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dict, setLang, translate: translateFn }),
    [lang, dict, setLang, translateFn],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
