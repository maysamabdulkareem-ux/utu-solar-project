import { useEffect, useState } from 'react';
import { api, toCompany } from './client';
import type { Company } from '../data/content';

export type CompaniesSource = 'loading' | 'api' | 'unavailable';

/**
 * Shared across every caller, so the three components that need the company
 * list on one screen make one request between them rather than three.
 * Module-level on purpose: it lives as long as the page does and resets on
 * reload, which is the right lifetime for a list that rarely changes.
 */
let inFlight: Promise<Company[] | null> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15_000;

export function invalidateCompanies() {
  inFlight = null;
  cachedAt = 0;
}

function fetchOnce(): Promise<Company[] | null> {
  if (inFlight && Date.now() - cachedAt < CACHE_TTL_MS) return inFlight;

  cachedAt = Date.now();
  inFlight = Promise.all([
    api.listCompanies(),
    api.publicReviews().catch(() => null),
  ])
    .then(([rows, reviews]) => {
      const verifiedRatings = new Map<number, number[]>();
      for (const review of reviews ?? []) {
        if (!review.is_verified || !Number.isFinite(review.rating) || review.rating < 1 || review.rating > 5) continue;
        const scores = verifiedRatings.get(review.company_id) ?? [];
        scores.push(review.rating);
        verifiedRatings.set(review.company_id, scores);
      }
      return rows.map((row) => {
        const scores = verifiedRatings.get(row.id);
        const company = toCompany(row);
        return scores?.length
          ? {
              ...company,
              rating: scores.reduce((sum, rating) => sum + rating, 0) / scores.length,
              reviews: scores.length,
            }
          : company;
      });
    })
    .catch(() => {
      // Clear it so a later mount can retry rather than inheriting a failure.
      invalidateCompanies();
      return null;
    });
  return inFlight;
}

/**
 * Eligible pending and verified companies returned by the backend are displayed.
 *
 * `source` is returned rather than kept private so a screen can say where its
 * data came from. A prototype that quietly shows sample data as if it were
 * live is the kind of thing that gets believed in a demo and discovered later.
 */
export function useCompanies(): { companies: Company[]; source: CompaniesSource } {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [source, setSource] = useState<CompaniesSource>('loading');

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchOnce().then((rows) => {
        if (cancelled) return;
        if (rows === null) {
          setSource('unavailable');
          setCompanies([]);
          return;
        }
        setCompanies(rows);
        setSource('api');
      });
    };

    load();
    const refreshTimer = window.setInterval(load, CACHE_TTL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  return { companies, source };
}
