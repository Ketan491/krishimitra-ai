import type { CSSProperties, ReactElement } from 'react';

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

function Coins({ className = '', style }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.2v5.6M5.8 7h4.4" />
      <path d="M13 9.5a5.5 5.5 0 1 1-2 9" opacity=".6" />
    </svg>
  );
}

function Shield({ className = '', style }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function Soil({ className = '', style }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M3 17c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
      <path d="M3 13c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
      <path d="M3 9V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M15 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function Tractor({ className = '', style }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <circle cx="5" cy="17" r="3" />
      <circle cx="17" cy="18" r="2" />
      <path d="M7 18h8" />
      <path d="M8 8V6a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2M8 8h6M8 8v6M15 8v4" />
    </svg>
  );
}

function SolarPanel({ className = '', style }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <rect x="3" y="8" width="18" height="6" rx="1" />
      <path d="M4 11h16" />
      <path d="M6 11l-1.5 8M18 11l1.5 8M8 11v6M12 11v6M16 11v6" />
    </svg>
  );
}

function DefaultIcon({ className = '', style }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M3 21h18M4 21V10l7-4v15M11 21V6l9 4v11" />
      <path d="M6.5 13.5h2M6.5 17h2" />
    </svg>
  );
}

const ICONS: Record<string, (p: IconProps) => ReactElement> = {
  kisan: Coins,
  fasal: Shield,
  credit: Coins,
  soil: Soil,
  mechanization: Tractor,
  solar: SolarPanel,
  default: DefaultIcon,
};

export function SchemeIcon({ icon, className, style }: IconProps & { icon?: string }): ReactElement {
  const Cmp = ICONS[icon || 'default'] || ICONS.default;
  return <Cmp className={className} style={style} />;
}

export default SchemeIcon;
