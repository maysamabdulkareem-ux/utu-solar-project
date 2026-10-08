import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Appliance } from '../data/content';

const KEY = 'utu-assessment-appliances';

function load(): Appliance[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function save(appliances: Appliance[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(appliances));
  } catch {
    // Non-fatal — the assessment page still works within the same session.
  }
}

type AssessmentValue = {
  /** The appliance snapshot the AI Assessment flow is built from, or null before the calculator has been run. */
  appliances: Appliance[] | null;
  /** Save the calculator's current appliance list and enter the assessment flow with it. */
  start: (appliances: Appliance[]) => void;
};

const AssessmentContext = createContext<AssessmentValue | null>(null);

/**
 * Carries the appliance snapshot from the existing Solar Load Calculator into
 * the new AI Assessment route.
 *
 * Deliberately thin: this holds only what the AI layer needs as input
 * (the appliance list). Everything derived from it — tiers, insights, energy
 * impact, company matches — is recomputed on the assessment page itself via
 * `src/ai/solarAssessment.ts`, so nothing here duplicates the calculation or
 * AI logic.
 */
export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [appliances, setAppliances] = useState<Appliance[] | null>(() => load());

  const start = useCallback((next: Appliance[]) => {
    setAppliances(next);
    save(next);
  }, []);

  const value = useMemo<AssessmentValue>(() => ({ appliances, start }), [appliances, start]);

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
}

export function useAssessment(): AssessmentValue {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error('useAssessment must be used inside <AssessmentProvider>');
  return ctx;
}
