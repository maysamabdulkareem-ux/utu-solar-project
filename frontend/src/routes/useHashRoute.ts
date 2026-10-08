import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal hash router.
 *
 * Small hash-based views, no nested routes, no loaders — a real router would be more
 * machinery than the app currently earns. Swapping in react-router later means
 * replacing this file and the switch in App.tsx; nothing else reads the hash.
 */
export type Route = 'home' | 'request' | 'requests' | 'company' | 'admin' | 'companyDirectory' | 'companyDetails' | 'greenVerification';

const ROUTES: Record<string, Route> = {
  '': 'home',
  '#/': 'home',
  '#/request': 'request',
  '#/rfq': 'request',
  '#/requests': 'requests',
  '#/company': 'company',
  '#/companies': 'companyDirectory',
  '#/admin': 'admin',
  '#/verify': 'greenVerification',
};

export const paths: Record<Route, string> = {
  home: '#/',
  request: '#/request',
  requests: '#/requests',
  company: '#/company',
  companyDirectory: '#/companies',
  admin: '#/admin',
  companyDetails: '#/companies',
  greenVerification: '#/verify',
};

function read(raw = window.location.hash): Route {
  // In-page anchors (#calculator, #companies) belong to the homepage.
  if (raw && !raw.startsWith('#/')) return 'home';
  const path = raw.split('?')[0];
  if (/^#\/companies\/\d+$/.test(path)) return 'companyDetails';
  if (/^#\/verify\/[A-Za-z0-9_-]+$/.test(path)) return 'greenVerification';
  return ROUTES[path] ?? 'home';
}

function readCompanyId(raw = window.location.hash): number | null {
  const match = raw.match(/^#\/companies\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function readGreenVerificationId(raw = window.location.hash): string | null {
  const match = raw.match(/^#\/verify\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  const previousHash = useRef(window.location.hash);
  const route = read(hash);

  useEffect(() => {
    const onChange = () => {
      const nextHash = window.location.hash;
      const previousPath = previousHash.current.split('?')[0];
      const nextPath = nextHash.split('?')[0];
      if (nextPath.startsWith('#/') && nextPath !== previousPath) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      previousHash.current = nextHash;
      setHash(nextHash);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  /** Navigate and start the new view at the top, the way a page load would. */
  const go = useCallback((next: Route) => {
    window.location.hash = paths[next];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    route,
    go,
    companyId: readCompanyId(hash),
    verificationId: readGreenVerificationId(hash),
  };
}
