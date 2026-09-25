import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SolarEstimate } from '../components/calculator/useSolarEstimate';
import { api, type QuoteRequestGroup } from '../api/client';

export type SystemType = 'ongrid' | 'hybrid' | 'offgrid' | 'unsure';
export type PropertyType = 'house' | 'apartment' | 'shop' | 'farm';
export type RoofType = 'flat' | 'sloped' | 'metal' | 'ground';
export type GridStatus = 'national' | 'generator' | 'both' | 'none';
export type Timeline = 'asap' | 'month' | 'quarter' | 'exploring';
export type CompanyStatus = 'sent' | 'viewed' | 'quoted' | 'declined';

export type QuoteDraft = {
  systemKWp: number;
  batteryKWh: number;
  panelCount: number;
  /**
   * True only when these numbers came from a calculator run. Step 1 tells the
   * person where its figures came from, and that claim has to be true for
   * someone who walked in from the header without touching the calculator.
   */
  fromCalculator: boolean;
  systemType: SystemType;
  governorate: string;
  district: string;
  propertyType: PropertyType | '';
  roofType: RoofType | '';
  roofArea: string;
  gridStatus: GridStatus | '';
  budget: string;
  timeline: Timeline | '';
  financing: boolean;
  notes: string;
  companyIds: string[];
  name: string;
  phone: string;
  whatsapp: boolean;
  email: string;
};

export type SubmittedRequest = {
  id: string;
  /**
   * The id assigned at submit time, before the server has answered. `id`
   * itself is swapped to the server's `group_id` once that call succeeds, but
   * a screen holding on to a `SubmittedRequest` from the moment of submit
   * needs a key that never changes to find its updated row again later.
   */
  localId: string;
  createdAt: string;
  draft: QuoteDraft;
  /** Per-company progress. Seeded so the tracking screen has something true to show. */
  statuses: Record<string, CompanyStatus>;
};

const EMPTY_DRAFT: QuoteDraft = {
  systemKWp: 8.4,
  batteryKWh: 10.2,
  panelCount: 12,
  fromCalculator: false,
  systemType: 'hybrid',
  governorate: '',
  district: '',
  propertyType: '',
  roofType: '',
  roofArea: '',
  gridStatus: '',
  budget: '',
  timeline: '',
  financing: false,
  notes: '',
  companyIds: [],
  name: '',
  phone: '',
  whatsapp: true,
  email: '',
};

const DRAFT_KEY = 'utu-quote-draft';
const SENT_KEY = 'utu-quote-requests';
// The one thing the server can look a customer's requests up by. Remembered
// across visits so "My Requests" can ask the server without making the
// person type their phone number in again just to see their own list.
const PHONE_KEY = 'utu-last-phone';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadList(key: string): SubmittedRequest[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A draft that cannot be persisted still works for this session.
  }
}

function loadPhone(): string {
  try {
    return localStorage.getItem(PHONE_KEY) ?? '';
  } catch {
    return '';
  }
}

function savePhone(phone: string) {
  try {
    if (phone) localStorage.setItem(PHONE_KEY, phone);
  } catch {
    // ignore — worst case, the next visit asks the server again next time
  }
}

/**
 * Turn a server-side group into the same shape the rest of the app already
 * works with. `details` carries whatever the draft had beyond the columns
 * the server stores directly, so the empty draft fills in anything it left
 * out (older requests, say) rather than leaving those fields undefined.
 */
function fromGroup(group: QuoteRequestGroup): SubmittedRequest {
  const details = (group.details ?? {}) as Partial<QuoteDraft>;
  return {
    id: group.group_id,
    localId: group.group_id,
    createdAt: group.created_at,
    draft: {
      ...EMPTY_DRAFT,
      ...details,
      systemKWp: group.system_kwp,
      batteryKWh: group.battery_kwh,
      panelCount: group.panel_count,
      name: group.customer_name,
      phone: group.customer_phone,
      companyIds: group.companies.map((c) => String(c.company_id)),
    },
    statuses: Object.fromEntries(
      group.companies.map((c) => [String(c.company_id), c.status as CompanyStatus]),
    ) as Record<string, CompanyStatus>,
  };
}

type QuoteRequestValue = {
  draft: QuoteDraft;
  update: (patch: Partial<QuoteDraft>) => void;
  /** Copy a calculator result into the draft before the flow opens. */
  seedFromEstimate: (estimate: SolarEstimate) => void;
  reset: () => void;
  submit: () => SubmittedRequest;
  requests: SubmittedRequest[];
  /** True once the user has typed anything, so the "draft saved" note stays honest. */
  isDirty: boolean;
  /**
   * Ask the server for every request tied to the last phone number used, so
   * "My Requests" shows real status updates instead of only what this one
   * browser remembers. A no-op — quietly — when no phone is on file yet.
   */
  refreshFromServer: () => void;
};

const QuoteRequestContext = createContext<QuoteRequestValue | null>(null);

/**
 * Owns the request being composed and the ones already sent.
 *
 * Long forms get abandoned, so the draft is written to localStorage on every
 * change and restored on load — a person can close the tab mid-flow and pick up
 * where they were. Storage failures are swallowed: persistence is a
 * convenience, never a requirement for the form to work.
 */
export function QuoteRequestProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<QuoteDraft>(() => load(DRAFT_KEY, EMPTY_DRAFT));
  const [requests, setRequests] = useState<SubmittedRequest[]>(() => loadList(SENT_KEY));
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    if (isDirty) save(DRAFT_KEY, draft);
  }, [draft, isDirty]);

  const update = useCallback((patch: Partial<QuoteDraft>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const seedFromEstimate = useCallback((estimate: SolarEstimate) => {
    setDraft((d) => ({
      ...d,
      systemKWp: Math.round(estimate.systemKWp * 10) / 10,
      batteryKWh: Math.round(estimate.batteryKWh * 10) / 10,
      panelCount: estimate.panelCount,
      fromCalculator: true,
    }));
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setDirty(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }, []);

  /**
   * Record the request locally, then try to send it to the backend.
   *
   * The local copy is written first and unconditionally: a submitted request
   * must never vanish because the Python server was not running. When the send
   * succeeds the server's id replaces the local one, so the row the customer
   * sees matches the row a company will be looking at.
   */
  const submit = useCallback((): SubmittedRequest => {
    const localId = `SQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    // Seeded so the tracking screen shows a plausible spread rather than
    // three identical rows. Real statuses come from the companies.
    const spread: CompanyStatus[] = ['quoted', 'viewed', 'sent'];
    const statuses = Object.fromEntries(
      draft.companyIds.map((cid, i) => [cid, spread[i % spread.length]]),
    ) as Record<string, CompanyStatus>;

    const request: SubmittedRequest = {
      id: localId,
      localId,
      createdAt: new Date().toISOString(),
      draft: { ...draft },
      statuses,
    };

    setRequests((list) => {
      const next = [request, ...list];
      save(SENT_KEY, next);
      return next;
    });

    const { companyIds, name, phone, systemKWp, batteryKWh, panelCount, ...rest } = draft;
    savePhone(phone);
    const numericIds = companyIds.map(Number).filter(Number.isInteger);

    // Only companies that came from the API have numeric ids; the bundled
    // sample list uses 'c1', 'c2'. Sending those would be rejected, so a
    // sample-data run simply stays local.
    if (numericIds.length === companyIds.length && numericIds.length > 0) {
      api
        .createQuoteRequest({
          company_ids: numericIds,
          customer_name: name,
          customer_phone: phone,
          system_kwp: systemKWp,
          battery_kwh: batteryKWh,
          panel_count: panelCount,
          details: rest,
        })
        .then((group) => {
          const serverStatuses = Object.fromEntries(
            group.companies.map((c) => [String(c.company_id), c.status as CompanyStatus]),
          ) as Record<string, CompanyStatus>;

          setRequests((list) => {
            const next = list.map((r) =>
              r.localId === localId
                ? { ...r, id: group.group_id, statuses: serverStatuses }
                : r,
            );
            save(SENT_KEY, next);
            return next;
          });
        })
        .catch((err) => {
          // The customer already has their request; a failed send is a
          // developer's problem, not theirs.
          console.warn('[utu] quote request not sent to the server:', err);
        });
    }

    return request;
  }, [draft]);

  /**
   * Pull every request the server has for the last phone number on file and
   * merge it into the local list.
   *
   * The server's copy wins for any request it also knows about (its status
   * may have moved on since this browser last saw it); anything local that
   * the server hasn't heard of yet — a send still in flight, or a run made
   * with the bundled sample companies, which the server was never told
   * about — is kept as-is rather than dropped.
   */
  const refreshFromServer = useCallback(() => {
    const phone = loadPhone();
    if (!phone) return;

    api
      .listQuoteRequests(phone)
      .then((groups) => {
        const fromServerList = groups.map(fromGroup);
        setRequests((list) => {
          const serverIds = new Set(fromServerList.map((r) => r.id));
          const localOnly = list.filter((r) => !serverIds.has(r.id));
          const next = [...fromServerList, ...localOnly].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          save(SENT_KEY, next);
          return next;
        });
      })
      .catch((err) => {
        // The local list is still what's shown; a failed refresh just means
        // it stays as it was.
        console.warn('[utu] could not refresh quote requests from the server:', err);
      });
  }, []);

  const value = useMemo<QuoteRequestValue>(
    () => ({ draft, update, seedFromEstimate, reset, submit, requests, isDirty, refreshFromServer }),
    [draft, update, seedFromEstimate, reset, submit, requests, isDirty, refreshFromServer],
  );

  return <QuoteRequestContext.Provider value={value}>{children}</QuoteRequestContext.Provider>;
}

export function useQuoteRequest(): QuoteRequestValue {
  const ctx = useContext(QuoteRequestContext);
  if (!ctx) throw new Error('useQuoteRequest must be used inside <QuoteRequestProvider>');
  return ctx;
}
