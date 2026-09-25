import { useEffect, useState } from 'react';
import { api, toCompany } from './client';
import { companies as sampleCompanies, type Company } from '../data/content';

export type CompaniesSource = 'loading' | 'api' | 'sample';

/**
 * Shared across every caller, so the three components that need the company
 * list on one screen make one request between them rather than three.
 * Module-level on purpose: it lives as long as the page does and resets on
 * reload, which is the right lifetime for a list that rarely changes.
 */
let inFlight: Promise<Company[] | null> | null = null;

function fetchOnce(): Promise<Company[] | null> {
  inFlight ??= api
    .listCompanies()
    .then((rows) => (rows.length > 0 ? rows.map(toCompany) : null))
    .catch(() => {
      // Clear it so a later mount can retry rather than inheriting a failure.
      inFlight = null;
      return null;
    });
  return inFlight;
}

/**
 * Companies from the backend, with the bundled sample list as a fallback.
 *
 * `source` is returned rather than kept private so a screen can say where its
 * data came from. A prototype that quietly shows sample data as if it were
 * live is the kind of thing that gets believed in a demo and discovered later.
 */
export function useCompanies(): { companies: Company[]; source: CompaniesSource } {
  const [companies, setCompanies] = useState<Company[]>(sampleCompanies);
  const [source, setSource] = useState<CompaniesSource>('loading');

  useEffect(() => {
    let cancelled = false;

    fetchOnce().then((rows) => {
      if (cancelled) return;
      // An unreachable server or an empty database both leave the sample list
      // in place — a blank page is the worst possible answer here.
      if (rows === null) {
        setSource('sample');
        return;
      }
      setCompanies(rows);
      setSource('api');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { companies, source };
}
