import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Appliance } from '../data/content';
import { ASSESSMENT_KEY } from './requestStorage';

function isAppliance(value: unknown): value is Appliance {
  if (!value || typeof value !== 'object') return false;
  const a = value as Partial<Appliance>;
  return typeof a.id === 'string'
    && typeof a.watts === 'number' && Number.isFinite(a.watts)
    && typeof a.units === 'number' && Number.isFinite(a.units)
    && typeof a.hours === 'number' && Number.isFinite(a.hours)
    && Boolean(a.name);
}

function load(): Appliance[] | null {
  try {
    const raw = localStorage.getItem(ASSESSMENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return null;
    const appliances = parsed.filter(isAppliance);
    return appliances.length > 0 ? appliances : null;
  } catch {
    return null;
  }
}

function save(appliances: Appliance[]) {
  try {
    localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(appliances));
  } catch {
    // Not fatal: the assessment still works for this visit.
  }
}

type AssessmentValue = {
  /** The appliance list the assessment is built from, or null before the calculator was run. */
  appliances: Appliance[] | null;
  /** Keep the calculator's current appliance list and open the assessment with it. */
  start: (appliances: Appliance[]) => void;
};

const AssessmentContext = createContext<AssessmentValue | null>(null);

/**
 * Carries the appliance list from the smart calculator to the UTU assessment
 * page. It holds only the input; every option, insight and estimate is
 * recomputed on the page from `assessment/utuAssessment.ts`.
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
  const value = useContext(AssessmentContext);
  if (!value) throw new Error('useAssessment must be used inside <AssessmentProvider>');
  return value;
}
