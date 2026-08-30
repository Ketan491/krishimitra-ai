import { useI18n } from '../../contexts/I18nContext';
import { LANGUAGE_LABELS } from '../../lib/i18n';
import type { Language } from '../../lib/i18n';

const LANGS: Language[] = ['en', 'hi', 'mr'];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  if (compact) {
    return (
      <select
        aria-label="Language"
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className="cursor-pointer appearance-none rounded-lg border border-ink-300 bg-white px-2 py-1.5 text-xs font-medium text-ink-700 focus:outline-none"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANGUAGE_LABELS[l]}
          </option>
        ))}
      </select>
    );
  }
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-ink-300 text-xs font-medium">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`px-2.5 py-1.5 transition-colors ${
            lang === l ? 'bg-crop-700 text-white' : 'bg-white text-ink-600 hover:bg-ink-100'
          }`}
        >
          {LANGUAGE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
