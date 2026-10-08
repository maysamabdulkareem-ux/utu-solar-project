import { describe, expect, it } from 'vitest';
import type { QuoteDraft } from '../../state/QuoteRequestProvider';
import { validateStep } from './validation';

const draft: QuoteDraft = {
  systemKWp: 8,
  batteryKWh: 0,
  panelCount: 12,
  fromCalculator: false,
  systemType: 'hybrid',
  governorate: 'baghdad',
  district: 'Al-Mansour',
  propertyType: 'house',
  roofType: 'flat',
  roofArea: '100',
  gridStatus: 'both',
  budget: 'unsure',
  timeline: 'month',
  financing: false,
  greenInitiative: false,
  greenInitiativeBudgetIqd: '',
  greenInitiativeRate: 0,
  notes: '',
  companyIds: ['1'],
  name: 'Test Customer',
  phone: '07712345678',
  whatsapp: true,
  email: '',
};

describe('RFQ step validation', () => {
  it('rejects non-finite, out-of-range and fractional system values', () => {
    expect(validateStep(0, { ...draft, systemKWp: Number.POSITIVE_INFINITY })).toHaveProperty('systemKWp');
    expect(validateStep(0, { ...draft, batteryKWh: 10001 })).toHaveProperty('batteryKWh');
    expect(validateStep(0, { ...draft, panelCount: 1.5 })).toHaveProperty('panelCount');
    expect(validateStep(0, { ...draft, panelCount: 10001 })).toHaveProperty('panelCount');
  });

  it('rejects corrupted required choices and non-finite roof area', () => {
    const errors = validateStep(1, {
      ...draft,
      governorate: 'not-a-governorate',
      roofArea: 'NaN',
      gridStatus: '',
    });

    expect(errors).toHaveProperty('governorate');
    expect(errors).toHaveProperty('roofArea');
    expect(errors).toHaveProperty('gridStatus');
  });

  it('rejects malformed optional email addresses', () => {
    expect(validateStep(4, { ...draft, email: 'not-an-email' })).toHaveProperty('email');
    expect(validateStep(4, { ...draft, email: '' })).not.toHaveProperty('email');
  });

  it('requires a positive whole project budget when applying for the Green Initiative', () => {
    expect(validateStep(2, {
      ...draft,
      greenInitiative: true,
      greenInitiativeBudgetIqd: '',
    })).toHaveProperty('greenInitiativeBudgetIqd');
    expect(validateStep(2, {
      ...draft,
      greenInitiative: true,
      greenInitiativeBudgetIqd: '12000000',
    })).not.toHaveProperty('greenInitiativeBudgetIqd');
  });
});
