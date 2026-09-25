import { useMemo } from 'react';
import type { Appliance } from '../../data/content';

/**
 * Sizing assumptions for the demo estimate.
 *
 * These are openly stated rather than hidden in the maths, because the section
 * promises an estimate and not a quote. A real deployment would move these
 * behind an API and vary PEAK_SUN_HOURS by governorate.
 */
export const ASSUMPTIONS = {
  /** Annual average peak sun hours for Baghdad. */
  PEAK_SUN_HOURS: 5.2,
  /** Combined inverter, wiring, temperature and soiling losses. */
  SYSTEM_EFFICIENCY: 0.78,
  /** Share of the daily load the battery is expected to carry overnight. */
  EVENING_LOAD_SHARE: 0.38,
  /** Usable depth of discharge for a lithium pack. */
  DEPTH_OF_DISCHARGE: 0.8,
  /** Nameplate output of one panel, in watts. */
  PANEL_WATTS: 700,
} as const;

export type SolarEstimate = {
  dailyWh: number;
  dailyKWh: number;
  systemKWp: number;
  batteryKWh: number;
  panelCount: number;
  /** Rough hours of outage the battery covers at the evening load rate. */
  outageHours: number;
};

/** Daily energy for one appliance line, in watt-hours. */
export function applianceDailyWh(a: Appliance): number {
  return a.watts * a.units * a.hours;
}

/**
 * Turns a list of appliances into a system recommendation.
 * Pure and memoised — the panel re-renders on every stepper click.
 */
export function useSolarEstimate(appliances: Appliance[]): SolarEstimate {
  return useMemo(() => {
    const dailyWh = appliances.reduce((sum, a) => sum + applianceDailyWh(a), 0);
    const dailyKWh = dailyWh / 1000;

    const systemKWp =
      dailyKWh / (ASSUMPTIONS.PEAK_SUN_HOURS * ASSUMPTIONS.SYSTEM_EFFICIENCY);

    const batteryKWh =
      (dailyKWh * ASSUMPTIONS.EVENING_LOAD_SHARE) / ASSUMPTIONS.DEPTH_OF_DISCHARGE;

    const panelCount = Math.ceil((systemKWp * 1000) / ASSUMPTIONS.PANEL_WATTS);

    const eveningRateKW = (dailyKWh * ASSUMPTIONS.EVENING_LOAD_SHARE) / 6 || 1;
    const outageHours = (batteryKWh * ASSUMPTIONS.DEPTH_OF_DISCHARGE) / eveningRateKW;

    return {
      dailyWh,
      dailyKWh,
      systemKWp,
      batteryKWh,
      panelCount,
      outageHours,
    };
  }, [appliances]);
}

export const fmt = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
