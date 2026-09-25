import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal hash router.
 *
 * Three views, no nested routes, no loaders — a real router would be more
 * machinery than the app currently earns. Swapping in react-router later means
 * replacing this file and the switch in App.tsx; nothing else reads the hash.
 */
export type Route = 'home' | 'request' | 'requests';

const ROUTES: Record<string, Route> = {
  '': 'home',
  '#/': 'home',
  '#/request': 'request',
  '#/requests': 'requests',
};

export const paths: Record<Route, string> = {
  home: '#/',
  request: '#/request',
  requests: '#/requests',
};

function read(): Route {
  const raw = window.location.hash;
  // In-page anchors (#calculator, #companies) belong to the homepage.
  if (raw && !raw.startsWith('#/')) return 'home';
  return ROUTES[raw] ?? 'home';
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  /** Navigate and start the new view at the top, the way a page load would. */
  const go = useCallback((next: Route) => {
    window.location.hash = paths[next];
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return { route, go };
}
