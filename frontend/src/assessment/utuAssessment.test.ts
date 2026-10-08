import { describe, expect, it } from 'vitest';
import type { Company } from '../data/content';
import type { SolarEstimate } from '../components/calculator/useSolarEstimate';
import {
  answerQuickQuestion,
  buildEnergyImpact,
  buildInsight,
  buildTiers,
  companiesThatCanQuote,
  estimateToQuoteSystem,
  tierToQuoteSystem,
} from './utuAssessment';

const estimate: SolarEstimate = {
  dailyWh: 24_000,
  dailyKWh: 24,
  systemKWp: 5.9,
  batteryKWh: 11.4,
  panelCount: 9,
  outageHours: 6,
};

function company(id: string, status: Company['status'], rating: number, reviews: number): Company {
  return {
    id,
    status,
    rating,
    reviews,
    name: { en: id, ar: id },
    location: { en: 'Baghdad', ar: 'بغداد' },
    projects: { en: '3 projects', ar: '3 مشروع' },
    experience: { en: '1 year', ar: 'سنة' },
    services: { en: [], ar: [] },
  };
}

describe('UTU assessment', () => {
  it('builds three options that grow from economy to high independence', () => {
    const tiers = buildTiers(estimate);
    expect(tiers.economy.panelKWp).toBeLessThan(tiers.balanced.panelKWp);
    expect(tiers.balanced.panelKWp).toBeLessThan(tiers.highIndependence.panelKWp);
    expect(tiers.economy.estimatedCostIQD).toBeLessThan(tiers.highIndependence.estimatedCostIQD);
    expect(tiers.balanced.solarCoveragePct).toBeGreaterThan(0);
    expect(tiers.highIndependence.solarCoveragePct).toBeLessThanOrEqual(100);
  });

  it('lists only verified companies, best reviewed first', () => {
    const list = companiesThatCanQuote([
      company('pending', 'pending', 5, 40),
      company('low', 'verified', 4.1, 10),
      company('top', 'verified', 4.9, 3),
      company('silver', 'identity_verified', 5, 9),
    ]);
    expect(list.map((c) => c.id)).toEqual(['top', 'low']);
  });

  it('hands a system to the quote request with a matching system type', () => {
    const tiers = buildTiers(estimate);
    expect(tierToQuoteSystem(tiers.balanced)).toEqual({
      systemKWp: tiers.balanced.panelKWp,
      batteryKWh: tiers.balanced.batteryKWh,
      panelCount: tiers.balanced.panelCount,
      systemType: 'hybrid',
    });
    expect(estimateToQuoteSystem({ ...estimate, batteryKWh: 0 }).systemType).toBe('ongrid');
  });

  it('keeps the projected energy mix at 100% and never promises negative savings', () => {
    const tiers = buildTiers(estimate);
    const impact = buildEnergyImpact(estimate, tiers.balanced);
    const { solarCoveragePct, gridDependencyPct, generatorDependencyPct } = impact.projected;
    expect(solarCoveragePct + gridDependencyPct + generatorDependencyPct).toBe(100);
    expect(impact.estimatedMonthlySavingIQD).toBeGreaterThanOrEqual(0);
  });

  it('answers quick questions from the assessment numbers', () => {
    const tiers = buildTiers(estimate);
    const insight = buildInsight([], estimate);
    const ctx = { estimate, tier: tiers.balanced, insight, companyCount: 2 };
    expect(answerQuickQuestion('whichCompanies', ctx)).toEqual({ companyCount: 2, panelKWp: tiers.balanced.panelKWp });
    expect(answerQuickQuestion('reduceCost', { ...ctx, tier: tiers.economy }).savingIQD).toBe(0);
  });
});
