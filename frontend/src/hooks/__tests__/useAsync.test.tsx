import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useAsync } from '../useAsync';

function Harness({ fetcher, deps }: { fetcher: () => Promise<string>; deps: unknown[] }) {
  const { data, loading, refetch } = useAsync(fetcher, deps);
  return (
    <div>
      <span data-testid="data">{data ?? 'null'}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button onClick={() => refetch()}>refetch</button>
    </div>
  );
}

describe('useAsync', () => {
  it('fetches exactly once on mount (no render/fetch loop)', async () => {
    const fetcher = vi.fn().mockResolvedValue('hello');
    render(<Harness fetcher={fetcher} deps={[]} />);
    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('hello'));
    await new Promise((r) => setTimeout(r, 100));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-runs only when a dependency value changes', async () => {
    const fetcher = vi.fn().mockResolvedValue('v');
    const { rerender } = render(<Harness fetcher={fetcher} deps={[1]} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender(<Harness fetcher={fetcher} deps={[1]} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender(<Harness fetcher={fetcher} deps={[2]} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('exposes refetch for manual reloads', async () => {
    const fetcher = vi.fn().mockResolvedValue('x');
    render(<Harness fetcher={fetcher} deps={[]} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await act(async () => {
      screen.getByText('refetch').click();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
