import { describe, expect, it } from 'vitest';
import { isValidIraqiMobile, isValidSupportPhone } from './supportPhone';

describe('support phone validation', () => {
  it.each([
    ['07712345678', true],
    ['6060', true],
    ['6633', true],
    ['0123456789', true],
    ['12345678901', true],
    ['12', false],
    ['support', false],
  ])('validates %s', (phone, valid) => {
    expect(isValidSupportPhone(phone)).toBe(valid);
  });

  it.each([
    ['07512345678', true],
    ['07712345678', true],
    ['07812345678', true],
    ['07612345678', false],
    ['0771234567', false],
    ['077123456789', false],
  ])('validates Iraqi mobile %s', (phone, valid) => {
    expect(isValidIraqiMobile(phone)).toBe(valid);
  });
});
