import type { QuoteDraft } from '../../state/QuoteRequestProvider';
import type { TranslationKey } from '../../i18n/translations';

/** Field name → translation key for its error. Empty object means the step passes. */
export type StepErrors = Partial<Record<keyof QuoteDraft, string>>;
type Keys = Partial<Record<keyof QuoteDraft, TranslationKey>>;

const MAX_COMPANIES = 4;
export { MAX_COMPANIES };

/**
 * Iraqi mobile numbers: 11 digits starting 07, optionally written with the
 * +964 country code and any mix of spaces or dashes.
 */
export function isIraqiMobile(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('964')) return /^9647\d{9}$/.test(digits);
  return /^07\d{9}$/.test(digits);
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
    if (!draft.systemKWp || draft.systemKWp <= 0) e.systemKWp = 'err.positive';
    if (!draft.panelCount || draft.panelCount <= 0) e.panelCount = 'err.positive';
  }

  if (step === 1) {
    if (!draft.governorate) e.governorate = 'err.required';
    if (!draft.district.trim()) e.district = 'err.required';
    if (!draft.propertyType) e.propertyType = 'err.required';
    if (!draft.roofType) e.roofType = 'err.required';
    if (!draft.roofArea || Number(draft.roofArea) <= 0) e.roofArea = 'err.area';
    if (!draft.gridStatus) e.gridStatus = 'err.required';
  }

  if (step === 2) {
    if (!draft.budget) e.budget = 'err.required';
    if (!draft.timeline) e.timeline = 'err.required';
  }

  if (step === 3) {
    if (draft.companyIds.length === 0) e.companyIds = 'err.companies';
  }

  if (step === 4) {
    if (!draft.name.trim()) e.name = 'err.required';
    if (!draft.phone.trim()) e.phone = 'err.required';
    else if (!isIraqiMobile(draft.phone)) e.phone = 'err.phone';
  }

  return e;
}
