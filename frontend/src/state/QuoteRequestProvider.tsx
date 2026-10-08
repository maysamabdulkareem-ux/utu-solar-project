import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  type CompanyQuote,
  type CompletedProject,
  type DepositPayment,
  type QuoteRequestGroup,
  type QuoteRequestUpdateBody,
} from '../api/client';

export type SystemType = 'ongrid' | 'hybrid' | 'offgrid' | 'unsure';
export type PropertyType = 'house' | 'apartment' | 'shop' | 'farm';
export type RoofType = 'flat' | 'sloped' | 'metal' | 'ground';
export type GridStatus = 'national' | 'generator' | 'both' | 'none';
export type Timeline = 'asap' | 'month' | 'quarter' | 'exploring';
export type CompanyStatus = 'sent' | 'viewed' | 'quoted' | 'selected' | 'declined';
export type RequestStatus = 'pending' | 'quotes_received' | 'accepted' | 'in_progress' | 'completed';

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
  systemType: SystemType | '';
  governorate: string;
  district: string;
  propertyType: PropertyType | '';
  roofType: RoofType | '';
  roofArea: string;
  gridStatus: GridStatus | '';
  budget: string;
  timeline: Timeline | '';
  financing: boolean;
  greenInitiative: boolean;
  greenInitiativeBudgetIqd: string;
  greenInitiativeRate: number;
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
  status: RequestStatus;
  draft: QuoteDraft;
  /** Per-company progress. Seeded so the tracking screen has something true to show. */
  statuses: Record<string, CompanyStatus>;
  quotes: Record<string, CompanyQuote>;
  completedProjects: CompletedProject[];
  payments?: Record<string, DepositPayment>;
  greenVerificationIds?: Record<string, string>;
};

const EMPTY_DRAFT: QuoteDraft = {
  systemKWp: 0,
  batteryKWh: 0,
  panelCount: 0,
  fromCalculator: false,
  systemType: '',
  governorate: '',
  district: '',
  propertyType: '',
  roofType: '',
  roofArea: '',
  gridStatus: '',
  budget: '',
  timeline: '',
  financing: false,
  greenInitiative: false,
  greenInitiativeBudgetIqd: '',
  greenInitiativeRate: 0,
  notes: '',
  companyIds: [],
  name: '',
  phone: '',
  whatsapp: false,
  email: '',
};

const DRAFT_KEY = 'utu-quote-draft';
const SENT_KEY = 'utu-quote-requests';
const ACCESS_KEY = 'utu-request-access';
export const QUOTE_STEP_KEY = 'utu-quote-step';

function loadDraft(): QuoteDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_DRAFT;
    const saved = value as Partial<QuoteDraft>;
    const isFiniteNumber = (item: unknown): item is number =>
      typeof item === 'number' && Number.isFinite(item);
    const text = (item: unknown, fallback: string) =>
      typeof item === 'string' ? item : fallback;

    return {
      ...EMPTY_DRAFT,
      ...saved,
      systemKWp: isFiniteNumber(saved.systemKWp) ? saved.systemKWp : EMPTY_DRAFT.systemKWp,
      batteryKWh: isFiniteNumber(saved.batteryKWh) ? saved.batteryKWh : EMPTY_DRAFT.batteryKWh,
      panelCount: isFiniteNumber(saved.panelCount) ? saved.panelCount : EMPTY_DRAFT.panelCount,
      fromCalculator: typeof saved.fromCalculator === 'boolean' ? saved.fromCalculator : false,
      governorate: text(saved.governorate, ''),
      district: text(saved.district, ''),
      roofArea: text(saved.roofArea, ''),
      budget: text(saved.budget, ''),
      notes: text(saved.notes, ''),
      name: text(saved.name, ''),
      phone: text(saved.phone, ''),
      email: text(saved.email, ''),
      companyIds: Array.isArray(saved.companyIds)
        ? saved.companyIds.filter((id): id is string => typeof id === 'string')
        : [],
      financing: typeof saved.financing === 'boolean' ? saved.financing : false,
      greenInitiative: typeof saved.greenInitiative === 'boolean' ? saved.greenInitiative : false,
      greenInitiativeBudgetIqd: text(saved.greenInitiativeBudgetIqd, ''),
      greenInitiativeRate: [0, 2, 5].includes(saved.greenInitiativeRate ?? 0)
        ? saved.greenInitiativeRate ?? 0
        : 0,
      whatsapp: typeof saved.whatsapp === 'boolean' ? saved.whatsapp : true,
      systemType: ['ongrid', 'hybrid', 'offgrid', 'unsure'].includes(saved.systemType ?? '')
        ? saved.systemType!
        : EMPTY_DRAFT.systemType,
      propertyType: ['house', 'apartment', 'shop', 'farm'].includes(saved.propertyType ?? '')
        ? saved.propertyType!
        : '',
      roofType: ['flat', 'sloped', 'metal', 'ground'].includes(saved.roofType ?? '')
        ? saved.roofType!
        : '',
      gridStatus: ['national', 'generator', 'both', 'none'].includes(saved.gridStatus ?? '')
        ? saved.gridStatus!
        : '',
      timeline: ['asap', 'month', 'quarter', 'exploring'].includes(saved.timeline ?? '')
        ? saved.timeline!
        : '',
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function loadList(key: string): SubmittedRequest[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((request) => request && typeof request.id === 'string' && request.id.startsWith('UTU-'))
          .map((request) => ({
            ...request,
            status: request.status ?? (
              request.completedProjects?.length
                ? 'completed'
                : Object.values(request.statuses ?? {}).includes('selected')
                  ? 'accepted'
                : Object.values(request.statuses ?? {}).includes('quoted')
                  ? 'quotes_received'
                  : 'pending'
            ),
            quotes: request.quotes ?? {},
            completedProjects: request.completedProjects ?? [],
            payments: request.payments ?? {},
          }))
      : [];
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

function loadAccessTokens(): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(ACCESS_KEY) ?? '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export function getRequestAccessToken(groupId: string): string {
  return loadAccessTokens()[groupId] ?? '';
}

function saveAccessToken(groupId: string, token: string) {
  try {
    const tokens = loadAccessTokens();
    tokens[groupId] = token;
    localStorage.setItem(ACCESS_KEY, JSON.stringify(tokens));
  } catch {
    // Request access still works for this session when storage is unavailable.
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
    status: group.status,
    draft: {
      ...EMPTY_DRAFT,
      ...details,
      greenInitiative: group.is_green_initiative ?? false,
      greenInitiativeBudgetIqd: group.green_initiative_budget_iqd == null
        ? ''
        : String(group.green_initiative_budget_iqd),
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
    quotes: Object.fromEntries(
      group.companies
        .filter((company): company is typeof company & { quote: CompanyQuote } => company.quote !== null)
        .map((company) => [String(company.company_id), company.quote]),
    ),
    completedProjects: group.companies.flatMap((company) => company.completed_projects ?? []),
    payments: Object.fromEntries(
      group.companies.flatMap((company) =>
        company.payment ? [[String(company.company_id), company.payment]] : [],
      ),
    ),
    greenVerificationIds: Object.fromEntries(
      group.companies.flatMap((company) =>
        company.green_verification_id
          ? [[String(company.company_id), company.green_verification_id]]
          : [],
      ),
    ),
  };
}

type QuoteRequestValue = {
  draft: QuoteDraft;
  update: (patch: Partial<QuoteDraft>) => void;
  reset: () => void;
  submit: () => Promise<SubmittedRequest>;
  chooseCompanyQuote: (groupId: string, companyId: string) => Promise<void>;
  confirmDepositPayment: (
    groupId: string,
    companyId: string,
    paymentMethod: DepositPayment['payment_method'],
    phoneNumber: string,
  ) => Promise<DepositPayment>;
  updateRequest: (groupId: string, body: QuoteRequestUpdateBody) => Promise<void>;
  requests: SubmittedRequest[];
  /** True once the user has typed anything, so the "draft saved" note stays honest. */
  isDirty: boolean;
  /**
   * Ask the server for every request tied to the last phone number used, so
   * "My Requests" shows real status updates instead of only what this one
   * browser remembers. A no-op — quietly — when no phone is on file yet.
   */
  refreshFromServer: (authenticatedClient?: boolean) => Promise<void>;
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
  const [draft, setDraft] = useState<QuoteDraft>(loadDraft);
  const [requests, setRequests] = useState<SubmittedRequest[]>(() => loadList(SENT_KEY));
  const [isDirty, setDirty] = useState(false);
  const refreshSequence = useRef(0);

  useEffect(() => {
    if (isDirty) save(DRAFT_KEY, draft);
  }, [draft, isDirty]);

  const update = useCallback((patch: Partial<QuoteDraft>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setDirty(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(QUOTE_STEP_KEY);
    } catch {
      // ignore
    }
  }, []);

  /**
   * Persist the request on the server before confirming it to the customer.
   */
  const submit = useCallback(async (): Promise<SubmittedRequest> => {
    const {
      companyIds,
      name,
      phone,
      systemKWp,
      batteryKWh,
      panelCount,
      greenInitiative,
      greenInitiativeBudgetIqd,
      ...rest
    } = draft;
    const group = await api.createQuoteRequest({
      company_ids: companyIds.map(Number),
      customer_name: name,
      customer_phone: phone.replace(/\D/g, ''),
      system_kwp: systemKWp,
      battery_kwh: batteryKWh,
      panel_count: panelCount,
      is_green_initiative: greenInitiative,
      ...(greenInitiative
        ? { green_initiative_budget_iqd: Number(greenInitiativeBudgetIqd) }
        : {}),
      details: rest,
    });
    if (group.access_token) saveAccessToken(group.group_id, group.access_token);
    const request = fromGroup(group);
    setRequests((list) => {
      const next = [request, ...list.filter((item) => item.id !== request.id)];
      save(SENT_KEY, next);
      return next;
    });
    return request;
  }, [draft]);

  const chooseCompanyQuote = useCallback(async (groupId: string, companyId: string) => {
    const accessToken = getRequestAccessToken(groupId);
    const updatedGroup = await api.chooseCompanyQuote(
      groupId,
      Number(companyId),
      accessToken || undefined,
    );
    const updatedRequest = fromGroup(updatedGroup);
    setRequests((list) => {
      const next = list.map((request) => request.id === groupId ? updatedRequest : request);
      save(SENT_KEY, next);
      return next;
    });
  }, []);

  const confirmDepositPayment = useCallback(async (
    groupId: string,
    companyId: string,
    paymentMethod: DepositPayment['payment_method'],
    phoneNumber: string,
  ) => {
    const updatedGroup = await api.confirmDepositPayment(
      groupId,
      Number(companyId),
      paymentMethod,
      phoneNumber,
      getRequestAccessToken(groupId) || undefined,
    );
    const updatedRequest = fromGroup(updatedGroup);
    setRequests((list) => {
      const next = list.map((request) => request.id === groupId ? updatedRequest : request);
      save(SENT_KEY, next);
      return next;
    });
    const payment = updatedRequest.payments?.[companyId];
    if (!payment) throw new Error('The payment was confirmed but no receipt was returned');
    return payment;
  }, []);

  const updateRequest = useCallback(async (groupId: string, body: QuoteRequestUpdateBody) => {
    const updatedGroup = await api.updateQuoteRequest(
      groupId,
      body,
      getRequestAccessToken(groupId) || undefined,
    );
    const updatedRequest = fromGroup(updatedGroup);
    setRequests((list) => {
      const next = list.map((request) => request.id === groupId ? updatedRequest : request);
      save(SENT_KEY, next);
      return next;
    });
  }, []);

  /**
   * Authenticated clients receive only server-owned requests. Guests refresh
   * requests through private access tokens while retaining local drafts.
   */
  const refreshFromServer = useCallback(async (authenticatedClient = false) => {
    const sequence = ++refreshSequence.current;
    if (authenticatedClient) {
      const guestTokens = Object.values(loadAccessTokens());
      if (guestTokens.length > 0) {
        await api.claimGuestQuoteRequests(guestTokens).catch((err) => {
          console.warn('[utu] could not link guest quote requests to the signed-in client:', err);
        });
      }
      const groups = await api.myQuoteRequests();
      if (sequence !== refreshSequence.current) return;
      const next = groups.map(fromGroup).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      save(SENT_KEY, next);
      setRequests(next);
      return;
    }
    const accessTokens = loadAccessTokens();
    const entries = Object.entries(accessTokens);
    if (entries.length === 0) {
      if (sequence === refreshSequence.current) setRequests([]);
      return;
    }

    const groupLists = await Promise.all(entries.map(([, token]) =>
      api.listQuoteRequests(token).catch((err) => {
        console.warn('[utu] could not refresh a guest quote request:', err);
        return [];
      }),
    ));
    if (sequence !== refreshSequence.current) return;
    const fromServerList = groupLists.flat().map(fromGroup);
    setRequests((list) => {
      const serverIds = new Set(fromServerList.map((r) => r.id));
      const localOnly = list.filter((r) => !serverIds.has(r.id));
      const next = [...fromServerList, ...localOnly].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      save(SENT_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<QuoteRequestValue>(
    () => ({ draft, update, reset, submit, chooseCompanyQuote, confirmDepositPayment, updateRequest, requests, isDirty, refreshFromServer }),
    [draft, update, reset, submit, chooseCompanyQuote, confirmDepositPayment, updateRequest, requests, isDirty, refreshFromServer],
  );

  return <QuoteRequestContext.Provider value={value}>{children}</QuoteRequestContext.Provider>;
}

export function useQuoteRequest(): QuoteRequestValue {
  const ctx = useContext(QuoteRequestContext);
  if (!ctx) throw new Error('useQuoteRequest must be used inside <QuoteRequestProvider>');
  return ctx;
}
