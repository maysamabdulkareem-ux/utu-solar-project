import { describe, expect, it } from 'vitest';
import { toCompany, type ApiCompany } from './client';

const companyPayload: ApiCompany = {
  id: 4,
  name: 'Verified Solar',
  logo_url: null,
  founded_year: 2015,
  projects_count: 12,
  phone: null,
  contact_phone: null,
  phone_number: null,
  address: 'Baghdad',
  verification_status: 'verified',
  rating: 4.8,
  reviews_count: 12,
};

describe('company support phone mapping', () => {
  it.each([
    [{ support_phone: '07999999999', phone: '07711111111' }, '07999999999'],
    [{ phone: '07711111111' }, '07711111111'],
    [{ phone: '  ', contact_phone: '07722222222' }, '07722222222'],
    [{ phone: null, contact_phone: null, phone_number: '07733333333' }, '07733333333'],
    [{ support_phone: '  ', phone: '07744444444' }, '07744444444'],
  ] as const)('prefers the support hotline and falls back to a public contact phone', (phoneFields, expectedPhone) => {
    expect(toCompany({ ...companyPayload, ...phoneFields }).supportPhone).toBe(expectedPhone);
  });
});
