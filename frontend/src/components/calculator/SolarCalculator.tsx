import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { ApplianceRow } from './ApplianceRow';
import { ResultStat } from './ResultStat';
import { ASSUMPTIONS, useSolarEstimate } from './useSolarEstimate';
import { defaultAppliances, extraAppliances, type Appliance } from '../../data/content';
import { fmt, useLanguage } from '../../i18n/LanguageProvider';
import { useQuoteRequest } from '../../state/QuoteRequestProvider';
import { useAssessment } from '../../state/AssessmentProvider';
import { paths } from '../../routes/useHashRoute';

/**
 * The AI Solar Load Calculator panel.
 *
 * The maths is real (see useSolarEstimate) but the inputs are a demo
 * configuration, so every surface that shows a number also says it is an
 * estimate. Empty state is handled: zero out every appliance and the panel
 * explains what to do rather than showing zeroes.
 */
export function SolarCalculator() {
  const { t } = useLanguage();
  const { seedFromEstimate } = useQuoteRequest();
  const { start: startAssessment } = useAssessment();
  const [appliances, setAppliances] = useState<Appliance[]>(defaultAppliances);
  const [activeId, setActiveId] = useState<string>(defaultAppliances[0].id);
  const [calculating, setCalculating] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const estimate = useSolarEstimate(appliances);
  const isEmpty = estimate.dailyWh === 0;

  const update = (next: Appliance) =>
    setAppliances((list) => list.map((a) => (a.id === next.id ? next : a)));

  const remaining = extraAppliances.filter((e) => !appliances.some((a) => a.id === e.id));

  const addAppliance = () => {
    const next = remaining[0];
    if (next) {
      setAppliances((list) => [...list, next]);
      setActiveId(next.id);
    }
  };

  const runCalculation = () => {
    setCalculating(true);
    // Stands in for the request that would size the system server-side.
    window.setTimeout(() => {
      setCalculating(false);
      setCalculated(true);
      // Hand this exact appliance snapshot to the AI Assessment flow — the
      // Calculation Engine's output, not a re-guess — and move into the
      // AI Analysis screen rather than only revealing numbers in place.
      startAssessment(appliances);
      window.location.hash = paths.assessment;
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, 1200);
  };

  /** Hand the sized system to the request flow so nothing is retyped. */
  const requestQuotes = () => {
    seedFromEstimate(estimate);
    window.location.hash = paths.request;
  };

  const liveGroups = appliances.filter((a) => a.units > 0 && a.hours > 0).length;

  return (
    <div className="on-dark rounded-xl border border-line-on-dark bg-bg-inverse p-5 shadow-panel sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[11rem]">
          <h3 className="text-h4 text-content-on-dark">{t('panel.title')}</h3>
          <p className="mt-0.5 text-label-sm text-content-on-dark-muted">{t('panel.sub')}</p>
        </div>
        <p className="rounded-full border border-line-on-dark bg-bg-panel-raised px-2.5 py-1 text-label-sm text-solar-300">
          {t('panel.tag')}
        </p>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {appliances.map((a) => (
          <ApplianceRow
            key={a.id}
            appliance={a}
            active={a.id === activeId}
            onChange={update}
            onFocus={() => setActiveId(a.id)}
          />
        ))}
      </ul>

      {remaining.length > 0 && (
        <button
          type="button"
          onClick={addAppliance}
          className="mt-2.5 flex w-full items-center justify-center gap-2.5 rounded-[12px] border-[1.5px] border-dashed border-line-on-dark py-3.5 text-label text-solar-300 transition-colors hover:border-solar-400 hover:bg-bg-panel-deep"
        >
          <Icon name="plus" size={17} />
          {t('panel.add')}
        </button>
      )}

      <hr className="my-5 border-line-on-dark" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="eyebrow text-content-on-dark-muted">{t('panel.resultHead')}</h4>
        <p className="text-label-sm text-content-on-dark-muted">
          {t('panel.basis', { h: ASSUMPTIONS.PEAK_SUN_HOURS })}
        </p>
      </div>

      {isEmpty ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-dashed border-line-on-dark bg-bg-panel-deep px-6 py-10 text-center"
        >
          <Icon
            name="calculator"
            size={28}
            className="mx-auto text-content-on-dark-muted"
            aria-hidden="true"
          />
          <p className="mt-3 text-label text-content-on-dark">{t('empty.title')}</p>
          <p className="mx-auto mt-1 max-w-md text-body-sm text-content-on-dark-muted">
            {t('empty.body')}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <ResultStat
            icon="zap"
            label={t('res.usage')}
            value={fmt.dec(estimate.dailyKWh)}
            unit={t('res.unitKwhDay')}
            note={t('res.usageNote', { n: liveGroups })}
          />
          <ResultStat
            icon="solar-panel"
            label={t('res.size')}
            value={fmt.dec(estimate.systemKWp)}
            unit={t('res.unitKwp')}
            note={t('res.sizeNote', { n: estimate.panelCount, w: ASSUMPTIONS.PANEL_WATTS })}
            emphasis
          />
          <ResultStat
            icon="battery"
            label={t('res.battery')}
            value={fmt.dec(estimate.batteryKWh)}
            unit={t('res.unitKwh')}
            note={t('res.batteryNote', { n: Math.round(estimate.outageHours) })}
          />
          <ResultStat
            icon="sun"
            label={t('res.panels')}
            value={fmt.int(estimate.panelCount)}
            unit={t('res.unitPanels')}
            note={t('res.panelsNote', { w: ASSUMPTIONS.PANEL_WATTS })}
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button
          variant={calculated ? 'onDark' : 'primary'}
          onClick={runCalculation}
          loading={calculating}
          disabled={isEmpty}
        >
          {calculating ? t('panel.calculating') : t('panel.btn')}
        </Button>
        <p className="min-w-[12rem] flex-1 text-label-sm text-content-on-dark-muted">
          {t('panel.disclaimer')}
        </p>
      </div>

      {/* The estimate is only worth something if it can leave the page. */}
      {calculated && !isEmpty && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border-[1.5px] border-line-brand bg-bg-panel-raised p-5">
          <div className="min-w-[12rem] flex-1">
            <p className="text-label text-content-on-dark">{t('panel.rfqLead')}</p>
            <p className="mt-0.5 text-label-sm text-content-on-dark-muted">{t('panel.rfqNote')}</p>
          </div>
          <Button onClick={requestQuotes} trailingArrow>
            {t('panel.rfqCta')}
          </Button>
        </div>
      )}
    </div>
  );
}
