import { useEffect, useState } from 'react';

/**
 * Tracks the OS "reduce motion" setting.
 * Ported from the Motion Framework Kit hook, with the listener kept in sync
 * so a mid-session change is picked up without a reload.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);

    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    // Safari < 14
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return prefersReduced;
}

export default useReducedMotion;
