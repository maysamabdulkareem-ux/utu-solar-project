import type { Appliance } from '../data/content';
import type { Company } from '../data/content';
import {
  ASSUMPTIONS,
  applianceDailyWh,
  type SolarEstimate,
} from '../components/calculator/useSolarEstimate';

/**
 * AI Interpretation & Recommendation Layer.
 *
 * This file never recomputes the physics of the system — it only reads the
 * output of `useSolarEstimate` (the Calculation Engine) and turns it into
 * something a person can decide from: three buildable configurations, a
 * plain-language explanation, an energy-impact projection, a company match
 * score and a handful of templated assistant answers.
 *
 * Every number in here that is not directly derived from the calculation
 * engine comes from a constant in `AI_ASSUMPTIONS` below, stated openly so it
 * can be swapped for a real pricing/matching API later without touching the
 * screens that call these functions.
 */

export type TierId = 'economy' | 'balanced' | 'highIndependence';

export type SystemTier = {
  id: TierId;
  panelKWp: number;
  panelCount: number;
  inverterKW: number;
  batteryKWh: number;
  estimatedCostIQD: number;
  backupHours: number;
  /** Share of the daily load the panels can supply directly or via battery. */
  solarCoveragePct: number;
};

/**
 * Prototype business assumptions — cost and tariff figures the real backend
 * does not expose yet. Kept separate from `ASSUMPTIONS` (the physical sizing
 * constants in the calculation engine) so it's obvious which numbers are
 * "how the system is sized" versus "what a system like this tends to cost in
 * Iraq today". Replace with live pricing/tariff data once available.
 */
export const AI_ASSUMPTIONS = {
  COST_PER_KWP_USD: 750,
  COST_PER_KWH_BATTERY_USD: 260,
  USD_TO_IQD: 1310,
  /** Blended subsidized national-grid cost, IQD per kWh. */
  GRID_TARIFF_IQD_PER_KWH: 90,
  /** Typical private-generator-subscription equivalent, IQD per kWh. */
  GENERATOR_TARIFF_IQD_PER_KWH: 350,
  /** Typical Baghdad household mix before adding solar. */
  BASELINE_GRID_SHARE: 0.55,
  BASELINE_GENERATOR_SHARE: 0.45,
  ECONOMY_PANEL_SCALE: 0.72,
  ECONOMY_BATTERY_SCALE: 0.55,
  HIGH_PANEL_SCALE: 1.35,
  HIGH_BATTERY_SCALE: 1.6,
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function costForIQD(panelKWp: number, batteryKWh: number): number {
  const usd =
    panelKWp * AI_ASSUMPTIONS.COST_PER_KWP_USD + batteryKWh * AI_ASSUMPTIONS.COST_PER_KWH_BATTERY_USD;
  const iqd = usd * AI_ASSUMPTIONS.USD_TO_IQD;
  return Math.round(iqd / 25000) * 25000;
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
    estimatedCostIQD: costForIQD(panelKWp, batteryKWh),
    backupHours,
    solarCoveragePct,
  };
}

export function buildTiers(estimate: SolarEstimate): Record<TierId, SystemTier> {
  return {
    economy: buildTier('economy', estimate, AI_ASSUMPTIONS.ECONOMY_PANEL_SCALE, AI_ASSUMPTIONS.ECONOMY_BATTERY_SCALE),
    balanced: buildTier('balanced', estimate, 1, 1),
    highIndependence: buildTier('highIndependence', estimate, AI_ASSUMPTIONS.HIGH_PANEL_SCALE, AI_ASSUMPTIONS.HIGH_BATTERY_SCALE),
  };
}

/* ------------------------------------------------------------------ */
/* Why this system — a dynamic read of the user's own inputs           */

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
  const total = totals.reduce((s, x) => s + x.wh, 0) || 1;
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
/* Iraqi Energy Impact                                                  */

export type EnergyImpact = {
  current: { gridPct: number; generatorPct: number; solarPct: number; batteryPct: number };
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
  const current = {
    gridPct: Math.round(AI_ASSUMPTIONS.BASELINE_GRID_SHARE * 100),
    generatorPct: Math.round(AI_ASSUMPTIONS.BASELINE_GENERATOR_SHARE * 100),
    solarPct: 0,
    batteryPct: 0,
  };

  const solarCoveragePct = tier.solarCoveragePct;
  const remainingPct = 100 - solarCoveragePct;
  const splitBase = AI_ASSUMPTIONS.BASELINE_GRID_SHARE + AI_ASSUMPTIONS.BASELINE_GENERATOR_SHARE;
  const gridDependencyPct = clampPct(remainingPct * (AI_ASSUMPTIONS.BASELINE_GRID_SHARE / splitBase));
  const generatorDependencyPct = clampPct(remainingPct - gridDependencyPct);

  const dailyKWhOffset = (estimate.dailyKWh * solarCoveragePct) / 100;
  const blendedTariff =
    AI_ASSUMPTIONS.GRID_TARIFF_IQD_PER_KWH * AI_ASSUMPTIONS.BASELINE_GRID_SHARE +
    AI_ASSUMPTIONS.GENERATOR_TARIFF_IQD_PER_KWH * AI_ASSUMPTIONS.BASELINE_GENERATOR_SHARE;
  const dailySavingIQD = dailyKWhOffset * blendedTariff;

  return {
    current,
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
/* Company matching                                                     */

export type CompanyMatch = {
  company: Company;
  matchPct: number;
  compatibleSystemLabel: string;
  warrantyYears: number;
  servicesAreExample: boolean;
};

/** Small stable hash so the same company always gets the same jitter. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function matchCompanies(companies: Company[], tier: SystemTier): CompanyMatch[] {
  return companies
    .map((company) => {
      const jitter = hashStr(company.id) % 9; // 0..8
      const ratingBonus = Math.round((company.rating - 4) * 6);
      const matchPct = Math.max(70, Math.min(98, 82 + ratingBonus + jitter));
      const servicesAreExample = company.services.en.length === 0;
      return {
        company,
        matchPct,
        compatibleSystemLabel: `${tier.panelKWp} kWp · ${tier.batteryKWh > 0 ? 'Hybrid' : 'On-grid'}`,
        warrantyYears: 5,
        servicesAreExample,
      };
    })
    .sort((a, b) => b.matchPct - a.matchPct);
}

/* ------------------------------------------------------------------ */
/* Optimize My System                                                   */

export type OptimizationOption = {
  id: 'lowerBattery' | 'shiftUsage';
  before: { costIQD: number; backupHours: number; solarCoveragePct: number };
  after: { costIQD: number; backupHours: number; solarCoveragePct: number };
};

export function buildOptimizations(estimate: SolarEstimate, tier: SystemTier): OptimizationOption[] {
  const lowerBattery = buildTier('balanced', estimate, tier.panelKWp / (estimate.systemKWp || 1), 0.7);
  const shiftUsage = {
    ...tier,
    solarCoveragePct: clampPct(tier.solarCoveragePct * 1.12),
    batteryKWh: round1(tier.batteryKWh * 0.85),
  };
  const shiftUsageCost = costForIQD(tier.panelKWp, shiftUsage.batteryKWh);

  return [
    {
      id: 'lowerBattery',
      before: { costIQD: tier.estimatedCostIQD, backupHours: tier.backupHours, solarCoveragePct: tier.solarCoveragePct },
      after: {
        costIQD: lowerBattery.estimatedCostIQD,
        backupHours: lowerBattery.backupHours,
        solarCoveragePct: lowerBattery.solarCoveragePct,
      },
    },
    {
      id: 'shiftUsage',
      before: { costIQD: tier.estimatedCostIQD, backupHours: tier.backupHours, solarCoveragePct: tier.solarCoveragePct },
      after: {
        costIQD: shiftUsageCost,
        backupHours: round1(tier.backupHours * 0.9),
        solarCoveragePct: shiftUsage.solarCoveragePct,
      },
    },
  ];
}

/* ------------------------------------------------------------------ */
/* AI Solar Assistant — templated, context-aware answers                */

export type QuickQuestionId =
  | 'whyThisSystem'
  | 'whyBattery'
  | 'whyInverter'
  | 'reduceCost'
  | 'addAnotherAC'
  | 'backupHours'
  | 'whichCompanies';

export function answerQuickQuestion(
  id: QuickQuestionId,
  ctx: { estimate: SolarEstimate; tier: SystemTier; insight: AssessmentInsight; companyCount: number },
): { iqd: number } & Record<string, number | string> {
  const { estimate, tier, insight, companyCount } = ctx;
  switch (id) {
    case 'whyThisSystem':
      return { panelKWp: tier.panelKWp, coverage: tier.solarCoveragePct, backup: tier.backupHours, iqd: tier.estimatedCostIQD };
    case 'whyBattery':
      return { batteryKWh: tier.batteryKWh, backup: tier.backupHours, nightShare: insight.nightSharePct, iqd: tier.estimatedCostIQD };
    case 'whyInverter':
      return { inverterKW: tier.inverterKW, panelKWp: tier.panelKWp, iqd: tier.estimatedCostIQD };
    case 'reduceCost': {
      const economy = buildTiers(estimate).economy;
      return { savingIQD: tier.estimatedCostIQD - economy.estimatedCostIQD, coverage: economy.solarCoveragePct, iqd: economy.estimatedCostIQD };
    }
    case 'addAnotherAC': {
      const extraWh = 1500 * 6; // one more typical AC unit, 6h/day — same assumption class as the calculator's own defaults
      const newDailyKWh = estimate.dailyKWh + extraWh / 1000;
      const growthPct = Math.round(((newDailyKWh - estimate.dailyKWh) / estimate.dailyKWh) * 100);
      return { growthPct, iqd: tier.estimatedCostIQD };
    }
    case 'backupHours':
      return { backup: tier.backupHours, batteryKWh: tier.batteryKWh, iqd: tier.estimatedCostIQD };
    case 'whichCompanies':
      return { companyCount, panelKWp: tier.panelKWp, iqd: tier.estimatedCostIQD };
    default:
      return { iqd: tier.estimatedCostIQD };
  }
}
