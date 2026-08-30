import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { Badge, StatusBadge, ApprovalBadge } from '../Badge';
import { Spinner } from '../Spinner';
import { EmptyState } from '../StateComponents';
import { I18nProvider } from '../../../contexts/I18nContext';

const withI18n = (ui: React.ReactElement) => <I18nProvider>{ui}</I18nProvider>;

describe('Button', () => {
  it('renders label and supports variants/sizes', () => {
    render(
      <Button variant="primary" size="lg">
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).not.toBeDisabled();
  });

  it('shows spinner and disables while loading', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button', { name: /Submit/i });
    expect(btn).toBeDisabled();
  });

  it('fires click handlers', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge variant="green">Listed</Badge>);
    expect(screen.getByText('Listed')).toBeInTheDocument();
  });

  it('maps known order statuses', () => {
    render(withI18n(<StatusBadge status="Delivered" />));
    expect(screen.getByText('Delivered ✓')).toBeInTheDocument();
    render(withI18n(<StatusBadge status="Cancelled" />));
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    render(withI18n(<StatusBadge status="Unknown" />));
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders approval badges for each state', () => {
    render(withI18n(<ApprovalBadge approved={true} />));
    expect(screen.getByText('Listed')).toBeInTheDocument();
    render(withI18n(<ApprovalBadge approved={false} />));
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    render(withI18n(<ApprovalBadge approved={null} />));
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
  });
});

describe('Spinner', () => {
  it('renders with a loading label', () => {
    render(<Spinner />);
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders title and message', () => {
    render(<EmptyState title="Nothing here" message="Add something." />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add something.')).toBeInTheDocument();
  });
});
