import { animate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

export function AnimatedCounter({
  value,
  duration = 0.6,
  format,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        el.textContent = format ? format(v) : Math.round(v).toLocaleString('en-IN');
      },
    });
    return () => controls.stop();
  }, [value, duration, inView, format]);

  return <span ref={ref}>{format ? format(value) : value.toLocaleString('en-IN')}</span>;
}
