import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../contexts/I18nContext';

export function NotFoundPage() {
  const { translate } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <span className="text-6xl">🌾</span>
      <h1 className="text-3xl font-bold text-ink-900">404</h1>
      <p className="max-w-sm text-sm text-ink-500">{translate('ui.notFoundMessage')}</p>
      <Link to="/">
        <Button variant="outline">{translate('ui.backToHome')}</Button>
      </Link>
    </div>
  );
}
