import { useEffect, useRef } from 'react';

/**
 * Tells the backend that a company actually looked at a request.
 *
 * Reading the inbox (which also happens in the background for notifications)
 * no longer changes the customer-facing status. Instead, a request becomes
 * "viewed" the first time at least half of its card is on screen while the tab
 * is visible. Renders an invisible marker; does nothing when `enabled` is false
 * or when the browser has no IntersectionObserver.
 */
export function MarkViewedOnScreen({
  enabled,
  onViewed,
}: {
  enabled: boolean;
  onViewed: () => void;
}) {
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const sentRef = useRef(false);
  const onViewedRef = useRef(onViewed);
  onViewedRef.current = onViewed;

  useEffect(() => {
    const marker = markerRef.current;
    const card = marker?.parentElement;
    if (!enabled || !card || sentRef.current || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
        if (!seen || document.visibilityState !== 'visible' || sentRef.current) return;
        sentRef.current = true;
        observer.disconnect();
        onViewedRef.current();
      },
      { threshold: 0.5 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [enabled]);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
