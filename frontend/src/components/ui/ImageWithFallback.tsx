import { useState } from 'react';

const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e8f0e2"/><text x="50%" y="50%" fill="#5a7d4a" font-family="Georgia" font-size="20" text-anchor="middle" dominant-baseline="middle">KrishiMitra</text></svg>',
  );

export interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ImageWithFallback({ src, alt, className = '' }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);
  return (
    <img
      src={src && !errored ? src : FALLBACK_SVG}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
