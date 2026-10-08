import type { Appliance, Company } from '../data/content';
import {
  ASSUMPTIONS,
  applianceDailyWh,
  type SolarEstimate,
} from '../components/calculator/useSolarEstimate';

/**
 * UTU system assessment.
 *
 * Reads the output of `useSolarEstimate` (the calculator's sizing maths) and
 * turns it into something a person can decide from: three buildable system
 * options, a plain-language explanation, an energy-mix projection, the
 * verified companies that can quote, and templated answers for the UTU
 * assistant's quick questions.
 *
 * Nothing here is a trained model and nothing is presented as one. Every
 * number not derived from the calculator comes from `PRICING_ASSUMPTIONS`,
 * stated openly so it can be swapped for real pricing later.
 */

export type TierId = 'economy' | 'balanced' | 'highIndependence';

export const TIER_ORDER: readonly TierId[] = ['economy', 'balanced', 'highIndependence'];

export type SystemTier = {
  id: TierId;
  panelKWp: number;
  panelCount: number;
  inverterKW: number;
  batteryKWh: number;
  estimatedCostIQD: number;
  backupHours: number;
  /** Share of the daily load the panels can supply, directly or via battery. */
  solarCoveragePct: number;
};

/**
 * Rough market figures for an estimate, not a price list. Kept apart from the
 * physical sizing constants in `ASSUMPTIONS` so it is obvious which numbers
 * size the system and which only estimate what it might cost.
 */
export const PRICING_ASSUMPTIONS = {
  COST_PER_KWP_USD: 750,
  COST_PER_KWH_BATTERY_USD: 260,
  USD_TO_IQD: 1310,
  /** Blended subsidised national-grid cost, IQD per kWh. */
  GRID_TARIFF_IQD_PER_KWH: 90,
  /** Typical private-generator subscription equivalent, IQD per kWh. */
  GENERATOR_TARIFF_IQD_PER_KWH: 350,
  /** Typical Baghdad household mix before adding solar. */
  BASELINE_GRID_SHARE: 0.55,
  BASELINE_GENERATOR_SHARE: 0.45,
  ECONOMY_PANEL_SCALE: 0.72,
  ECONOMY_BATTERY_SCALE: 0.55,
  HIGH_PANEL_SCALE: 1.35,
  HIGH_BATTERY_SCALE: 1.6,
  /** One extra typical air conditioner, used by the "add another AC" answer. */
  EXTRA_AC_WATTS: 1500,
  EXTRA_AC_HOURS: 6,
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function estimateCostIQD(panelKWp: number, batteryKWh: number): number {
  const usd =
    panelKWp * PRICING_ASSUMPTIONS.COST_PER_KWP_USD + batteryKWh * PRICING_ASSUMPTIONS.COST_PER_KWH_BATTERY_USD;
  return Math.round((usd * PRICING_ASSUMPTIONS.USD_TO_IQD) / 25000) * 25000;
}

function buildTier(id: TierId, estimate: SolarEstimate, panelScale: number, batteryScale: number): SystemTier {
  const panelKWp = round1(Math.max(estimate.systemKWp * panelScale, 0.5));
  const panelCount = Math.max(1, Math.ceil((panelKWp * 1000) / ASSUMPTIONS.PANEL_WATTS));
  const batteryKWh = round1(Math.max(estimate.batteryKWh * batteryScale, 0));
  const inverterKW = round1(Math.max(panelKWp * 0.9, estimate.dailyKWh / 6));

  const eveningRateKW = (estimate.dailyKWh * ASSUMPTIONS.EVENING_LOAD_SHARE) / 6 || 1;
  const backupHours = round1((batteryKWh * ASSUMPTIONS.DEPTH_OF_DISCHARGE) / eveningRateKW);

  const dailyYieldKWh = panelKWp * ASSUMPTIONS.PEAK_SUN_HOURS * ASSUMPTIONS.SYSTEM_EFFICIENCY;
  const solarCoveragePct = clampPct((dailyYieldKWh / (estimate.dailyKWh || 1)) * 100);

  return {
    id,
    panelKWp,
    panelCount,
    inverterKW,
    batteryKWh,
    estimatedCostIQD: estimateCostIQD(panelKWp, batteryKWh),
    backupHours,
    solarCoveragePct,
  };
}

export function buildTiers(estimate: SolarEstimate): Record<TierId, SystemTier> {
  return {
    economy: buildTier('economy', estimate, PRICING_ASSUMPTIONS.ECONOMY_PANEL_SCALE, PRICING_ASSUMPTIONS.ECONOMY_BATTERY_SCALE),
    balanced: buildTier('balanced', estimate, 1, 1),
    highIndependence: buildTier('highIndependence', estimate, PRICING_ASSUMPTIONS.HIGH_PANEL_SCALE, PRICING_ASSUMPTIONS.HIGH_BATTERY_SCALE),
  };
}

/* ------------------------------------------------------------------ */
/* Why this system — read from the person's own inputs                  */

export type AssessmentInsight = {
  /** Appliance id contributing the largest daily-energy share. */
  topApplianceId: string;
  topLoadSharePct: number;
  nightSharePct: number;
  activeApplianceCount: number;
  backupHours: number;
};

export function buildInsight(appliances: Appliance[], estimate: SolarEstimate): AssessmentInsight {
  const live = appliances.filter((a) => a.units > 0 && a.hours > 0);
  const totals = live.map((a) => ({ id: a.id, wh: applianceDailyWh(a) }));
  const total = totals.reduce((sum, x) => sum + x.wh, 0) || 1;
  const top = [...totals].sort((a, b) => b.wh - a.wh)[0];

  return {
    topApplianceId: top?.id ?? '',
    topLoadSharePct: clampPct(((top?.wh ?? 0) / total) * 100),
    nightSharePct: Math.round(ASSUMPTIONS.EVENING_LOAD_SHARE * 100),
    activeApplianceCount: live.length,
    backupHours: Math.round(estimate.outageHours),
  };
}

/* ------------------------------------------------------------------ */
/* Energy mix before and after                                          */

export type EnergyImpact = {
  current: { gridPct: number; generatorPct: number };
  projected: {
    solarCoveragePct: number;
    gridDependencyPct: number;
    generatorDependencyPct: number;
    batteryBackupHours: number;
  };
  estimatedMonthlySavingIQD: number;
  estimatedAnnualSavingIQD: number;
};

export function buildEnergyImpact(estimate: SolarEstimate, tier: SystemTier): EnergyImpact {
  const { BASELINE_GRID_SHARE, BASELINE_GENERATOR_SHARE } = PRICING_ASSUMPTIONS;
  const solarCoveragePct = tier.solarCoveragePct;
  const remainingPct = 100 - solarCoveragePct;
  const gridDependencyPct = clampPct(remainingPct * (BASELINE_GRID_SHARE / (BASELINE_GRID_SHARE + BASELINE_GENERATOR_SHARE)));
  const generatorDependencyPct = clampPct(remainingPct - gridDependencyPct);

  const dailyKWhOffset = (estimate.dailyKWh * solarCoveragePct) / 100;
  const blendedTariff =
    PRICING_ASSUMPTIONS.GRID_TARIFF_IQD_PER_KWH * BASELINE_GRID_SHARE +
    PRICING_ASSUMPTIONS.GENERATOR_TARIFF_IQD_PER_KWH * BASELINE_GENERATOR_SHARE;
  const dailySavingIQD = dailyKWhOffset * blendedTariff;

  return {
    current: {
      gridPct: Math.round(BASELINE_GRID_SHARE * 100),
      generatorPct: Math.round(BASELINE_GENERATOR_SHARE * 100),
    },
    projected: {
      solarCoveragePct,
      gridDependencyPct,
      generatorDependencyPct,
      batteryBackupHours: tier.backupHours,
    },
    estimatedMonthlySavingIQD: Math.round((dailySavingIQD * 30) / 1000) * 1000,
    estimatedAnnualSavingIQD: Math.round((dailySavingIQD * 365) / 1000) * 1000,
  };
}

/* ------------------------------------------------------------------ */
/* Companies that can quote                                             */

/**
 * Companies that can actually receive and answer a quote request, best
 * documented first: verified only, then by verified-review rating and number
 * of reviews. No invented "match %" — the platform has no data that would
 * make such a score mean anything yet.
 */
export function companiesThatCanQuote(companies: Company[]): Company[] {
  return companies
    .filter((company) => company.status === 'verified')
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
}

/* ------------------------------------------------------------------ */
/* Hand-off to the quote request                                        */

export type QuoteSystem = {
  systemKWp: number;
  batteryKWh: number;
  panelCount: number;
  systemType: 'ongrid' | 'hybrid';
};

export function tierToQuoteSystem(tier: SystemTier): QuoteSystem {
  return {
    systemKWp: tier.panelKWp,
    batteryKWh: tier.batteryKWh,
    panelCount: tier.panelCount,
    systemType: tier.batteryKWh > 0 ? 'hybrid' : 'ongrid',
  };
}

export function estimateToQuoteSystem(estimate: SolarEstimate): QuoteSystem {
  const batteryKWh = round1(estimate.batteryKWh);
  return {
    systemKWp: round1(estimate.systemKWp),
    batteryKWh,
    panelCount: estimate.panelCount,
    systemType: batteryKWh > 0 ? 'hybrid' : 'ongrid',
  };
}

/* ------------------------------------------------------------------ */
/* UTU assistant — templated answers built from this assessment         */

export type QuickQuestionId =
  | 'whyThisSystem'
  | 'whyBattery'
  | 'whyInverter'
  | 'reduceCost'
  | 'addAnotherAC'
  | 'backupHours'
  | 'whichCompanies';

export const QUICK_QUESTIONS: readonly QuickQuestionId[] = [
  'whyThisSystem',
  'whyBattery',
  'whyInverter',
  'reduceCost',
  'addAnotherAC',
  'backupHours',
  'whichCompanies',
];

export type AnswerValues = Record<string, number>;

export function answerQuickQuestion(
  id: QuickQuestionId,
  ctx: { estimate: SolarEstimate; tier: SystemTier; insight: AssessmentInsight; companyCount: number },
): AnswerValues {
  const { estimate, tier, insight, companyCount } = ctx;
  switch (id) {
    case 'whyThisSystem':
      return { panelKWp: tier.panelKWp, coverage: tier.solarCoveragePct, backup: tier.backupHours, iqd: tier.estimatedCostIQD };
    case 'whyBattery':
      return { batteryKWh: tier.batteryKWh, backup: tier.backupHours, nightShare: insight.nightSharePct };
    case 'whyInverter':
      return { inverterKW: tier.inverterKW, panelKWp: tier.panelKWp };
    case 'reduceCost': {
      const economy = buildTiers(estimate).economy;
      return {
        savingIQD: Math.max(tier.estimatedCostIQD - economy.estimatedCostIQD, 0),
        coverage: economy.solarCoveragePct,
        iqd: economy.estimatedCostIQD,
      };
    }
    case 'addAnotherAC': {
      const extraKWh = (PRICING_ASSUMPTIONS.EXTRA_AC_WATTS * PRICING_ASSUMPTIONS.EXTRA_AC_HOURS) / 1000;
      return { growthPct: Math.round((extraKWh / (estimate.dailyKWh || 1)) * 100), iqd: tier.estimatedCostIQD };
    }
    case 'backupHours':
      return { backup: tier.backupHours, batteryKWh: tier.batteryKWh };
    case 'whichCompanies':
      return { companyCount, panelKWp: tier.panelKWp };
    default:
      return {};
  }
}
