import type { QuoteDraft } from '../../state/QuoteRequestProvider';
import type { TranslationKey } from '../../i18n/translations';

/** Field name → translation key for its error. Empty object means the step passes. */
export type StepErrors = Partial<Record<keyof QuoteDraft, string>>;
type Keys = Partial<Record<keyof QuoteDraft, TranslationKey>>;

/** Must match MAX_COMPANIES_PER_REQUEST in backend/quote_requests.py. */
const MAX_COMPANIES = 3;
export { MAX_COMPANIES };

/**
 * Iraqi local-format mobile numbers: exactly 11 digits starting with 07.
 */
export function isIraqiMobile(raw: string): boolean {
  return /^07\d{9}$/.test(raw);
}

/**
 * Validates one step and returns the failing fields.
 *
 * Validation runs on Continue, not on every keystroke — flagging a field the
 * person has not finished typing is how forms feel hostile.
 */
export function validateStep(step: number, draft: QuoteDraft): Keys {
  const e: Keys = {};

  if (step === 0) {
    if (!Number.isFinite(draft.systemKWp) || draft.systemKWp <= 0) {
      e.systemKWp = 'err.positive';
    } else if (draft.systemKWp > 5000) {
      e.systemKWp = 'err.range';
    }
    if (
      !Number.isFinite(draft.batteryKWh)
      || draft.batteryKWh < 0
      || draft.batteryKWh > 10000
    ) {
      e.batteryKWh = 'err.range';
    }
    if (!Number.isInteger(draft.panelCount)) {
      e.panelCount = 'err.integer';
    } else if (draft.panelCount <= 0) {
      e.panelCount = 'err.positive';
    } else if (draft.panelCount > 10000) {
      e.panelCount = 'err.range';
    }
  }

  if (step === 1) {
    if (!['baghdad', 'basra', 'erbil', 'nineveh', 'sulaymaniyah', 'duhok', 'kirkuk', 'najaf', 'karbala', 'babil', 'anbar', 'diyala', 'dhiqar', 'maysan', 'muthanna', 'qadisiyyah', 'salahaldin', 'wasit'].includes(draft.governorate)) {
      e.governorate = 'err.required';
    }
    if (!draft.district.trim()) e.district = 'err.required';
    if (!['house', 'apartment', 'shop', 'farm'].includes(draft.propertyType)) e.propertyType = 'err.required';
    if (!['flat', 'sloped', 'metal', 'ground'].includes(draft.roofType)) e.roofType = 'err.required';
    const roofArea = Number(draft.roofArea);
    if (!Number.isFinite(roofArea) || roofArea <= 0) e.roofArea = 'err.area';
    if (!['national', 'generator', 'both', 'none'].includes(draft.gridStatus)) e.gridStatus = 'err.required';
  }

  if (step === 2) {
    if (!['b1', 'b2', 'b3', 'b4', 'b5', 'unsure'].includes(draft.budget)) e.budget = 'err.required';
    if (!['asap', 'month', 'quarter', 'exploring'].includes(draft.timeline)) e.timeline = 'err.required';
    if (draft.greenInitiative) {
      const greenBudget = Number(draft.greenInitiativeBudgetIqd);
      if (
        !Number.isSafeInteger(greenBudget)
        || greenBudget <= 0
        || greenBudget > 10_000_000_000
      ) {
        e.greenInitiativeBudgetIqd = 'err.greenBudget';
      }
    }
  }

  if (step === 3) {
    if (
      draft.companyIds.length === 0
      || draft.companyIds.length > MAX_COMPANIES
      || new Set(draft.companyIds).size !== draft.companyIds.length
      || draft.companyIds.some((id) => !/^[1-9]\d*$/.test(id))
    ) {
      e.companyIds = 'err.companies';
    }
  }

  if (step === 4) {
    if (draft.name.trim().length < 2 || draft.name.trim().length > 120) e.name = 'err.required';
    if (!draft.phone.trim()) e.phone = 'err.required';
    else if (!isIraqiMobile(draft.phone)) e.phone = 'err.phone';
    if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      e.email = 'err.email';
    }
  }

  return e;
}
