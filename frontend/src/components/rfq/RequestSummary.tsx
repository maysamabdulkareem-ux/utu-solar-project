import { Icon } from '../icons/Icon';
import { useCompanies } from '../../api/useCompanies';
import { governorates } from '../../data/rfq';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useQuoteRequest, type QuoteDraft } from '../../state/QuoteRequestProvider';
import type { TranslationKey } from '../../i18n/translations';

/**
 * Read-back of everything captured, with a jump link per step.
 *
 * Shown before submit and again on the confirmation screen. People check a
 * summary far more carefully than they check the form they just filled, so
 * every line has to be editable from here.
 */
export function RequestSummary({
  onEdit,
  draft: draftProp,
}: {
  onEdit?: (step: number) => void;
  /** Pass a submitted request's draft — the live one is cleared after sending. */
  draft?: QuoteDraft;
}) {
  const { t, pick } = useLanguage();
  const { draft: liveDraft } = useQuoteRequest();
  const { companies } = useCompanies();
  const draft = draftProp ?? liveDraft;

  const gov = governorates.find((g) => g.id === draft.governorate);
  const picked = companies.filter((c) => draft.companyIds.includes(c.id));

  const label = (key: TranslationKey) => t(key);

  const typeLabel = label(
    ({ ongrid: 's1.ongrid', hybrid: 's1.hybrid', offgrid: 's1.offgrid', unsure: 's1.unsure' } as const)[
      draft.systemType
    ],
  );

  const propertyLabel = draft.propertyType
    ? label(
        ({ house: 's2.house', apartment: 's2.apartment', shop: 's2.shop', farm: 's2.farm' } as const)[
          draft.propertyType
        ],
      )
    : '—';

  const roofLabel = draft.roofType
    ? label(
        ({
          flat: 's2.roofFlat',
          sloped: 's2.roofSloped',
          metal: 's2.roofMetal',
          ground: 's2.roofGround',
        } as const)[draft.roofType],
      )
    : '—';

  const gridLabel = draft.gridStatus
    ? label(
        ({
          national: 's2.gridNational',
          generator: 's2.gridGenerator',
          both: 's2.gridBoth',
          none: 's2.gridNone',
        } as const)[draft.gridStatus],
      )
    : '—';

  const budgetLabel = draft.budget
    ? label(
        ({
          b1: 's3.budget1',
          b2: 's3.budget2',
          b3: 's3.budget3',
          b4: 's3.budget4',
          b5: 's3.budget5',
          unsure: 's3.budgetUnsure',
        } as const)[draft.budget as 'b1'],
      )
    : '—';

  const timelineLabel = draft.timeline
    ? label(
        ({
          asap: 's3.timeAsap',
          month: 's3.timeMonth',
          quarter: 's3.timeQuarter',
          exploring: 's3.timeExploring',
        } as const)[draft.timeline],
      )
    : '—';

  const groups: { step: number; title: string; rows: [string, string][] }[] = [
    {
      step: 0,
      title: t('rfq.step1'),
      rows: [
        [t('s1.size'), `${draft.systemKWp} kWp`],
        [t('s1.battery'), `${draft.batteryKWh} kWh`],
        [t('s1.panels'), String(draft.panelCount)],
        [t('s1.type'), typeLabel],
      ],
    },
    {
      step: 1,
      title: t('rfq.step2'),
      rows: [
        [t('s2.governorate'), gov ? pick(gov.name) : '—'],
        [t('s2.district'), draft.district || '—'],
        [t('s2.property'), propertyLabel],
        [t('s2.roof'), roofLabel],
        [t('s2.area'), draft.roofArea ? `${draft.roofArea} ${t('s2.areaUnit')}` : '—'],
        [t('s2.grid'), gridLabel],
      ],
    },
    {
      step: 2,
      title: t('rfq.step3'),
      rows: [
        [t('s3.budget'), budgetLabel],
        [t('s3.timeline'), timelineLabel],
        [t('s3.financingTitle'), draft.financing ? t('cmp.financingYes') : t('cmp.financingNo')],
        ...(draft.notes.trim() ? ([[t('s3.notes'), draft.notes]] as [string, string][]) : []),
      ],
    },
    {
      step: 3,
      title: t('rfq.step4'),
      rows: [[t('my.companies'), picked.map((c) => pick(c.name)).join(' · ') || '—']],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.step} className="rounded-xl border border-line-subtle bg-bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-label text-content-primary">{g.title}</h3>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(g.step)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-label-sm text-content-brand transition-colors hover:bg-[var(--brand-subtle)]"
              >
                <Icon name="wrench" size={14} />
                {t('s5.editStep')}
                <span className="sr-only"> — {g.title}</span>
              </button>
            )}
          </div>
          <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {g.rows.map(([k, v]) => (
              <div key={k} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line-subtle pb-2 last:border-0">
                <dt className="text-body-sm text-content-tertiary">{k}</dt>
                <dd className="text-body-sm font-medium text-content-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
