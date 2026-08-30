import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { useI18n } from '../../contexts/I18nContext';

function ErrorContent({ message }: { message: string }) {
  const { translate } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">⚠️</div>
      <h1 className="text-lg font-semibold text-ink-900">{translate('ui.errorTitle')}</h1>
      <p className="max-w-md text-sm text-ink-500">{message}</p>
      <Button onClick={() => window.location.reload()}>{translate('ui.reloadPage')}</Button>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Renderer error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorContent message={this.state.message} />;
    }
    return this.props.children;
  }
}
