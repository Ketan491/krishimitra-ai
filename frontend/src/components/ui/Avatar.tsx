import { useState } from 'react';
import { initials } from '../../lib/format';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-crop-100 font-semibold text-crop-800 ${SIZES[size]} ${className}`}
    >
      {showImage ? (
        <img src={src} alt={name || 'avatar'} className="h-full w-full object-cover" onError={() => setErrored(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
