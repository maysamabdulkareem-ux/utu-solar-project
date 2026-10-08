import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { RadioCards } from '../ui/RadioCards';
import { governorates } from '../../data/rfq';
import { useLanguage } from '../../i18n/LanguageProvider';
import {
  useQuoteRequest,
  type GridStatus,
  type PropertyType,
  type RoofType,
} from '../../state/QuoteRequestProvider';
import type { StepErrors } from './validation';

/**
 * Step 2 — the site.
 *
 * These answers do real work: the governorate filters which companies can
 * reach the customer, and the roof type decides what mounting hardware gets
 * quoted. Nothing here is asked out of habit.
 */
export function StepSite({ errors }: { errors: StepErrors }) {
  const { t, pick } = useLanguage();
  const { draft, update } = useQuoteRequest();

  const properties: { value: PropertyType; label: string; icon: 'home' | 'building' }[] = [
    { value: 'house', label: t('s2.house'), icon: 'home' },
    { value: 'apartment', label: t('s2.apartment'), icon: 'building' },
    { value: 'shop', label: t('s2.shop'), icon: 'building' },
    { value: 'farm', label: t('s2.farm'), icon: 'home' },
  ];

  const roofs: { value: RoofType; label: string }[] = [
    { value: 'flat', label: t('s2.roofFlat') },
    { value: 'sloped', label: t('s2.roofSloped') },
    { value: 'metal', label: t('s2.roofMetal') },
    { value: 'ground', label: t('s2.roofGround') },
  ];

  const grids: { value: GridStatus; label: string }[] = [
    { value: 'national', label: t('s2.gridNational') },
    { value: 'generator', label: t('s2.gridGenerator') },
    { value: 'both', label: t('s2.gridBoth') },
    { value: 'none', label: t('s2.gridNone') },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h2 className="text-h2 text-content-primary">{t('s2.title')}</h2>
        <p className="mt-2 max-w-prose text-body text-content-secondary">{t('s2.desc')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label={t('s2.governorate')}
          placeholder={t('s2.governoratePlaceholder')}
          value={draft.governorate}
          error={errors.governorate}
          options={governorates.map((g) => ({ value: g.id, label: pick(g.name) }))}
          onChange={(e) => update({ governorate: e.target.value })}
        />
        <Input
          label={t('s2.district')}
          placeholder={t('s2.districtPlaceholder')}
          value={draft.district}
          error={errors.district}
          onChange={(e) => update({ district: e.target.value })}
        />
      </div>

      <RadioCards
        legend={t('s2.property')}
        name="propertyType"
        value={draft.propertyType}
        options={properties}
        columns={4}
        error={errors.propertyType}
        onChange={(v) => update({ propertyType: v })}
      />

      <RadioCards
        legend={t('s2.roof')}
        name="roofType"
        value={draft.roofType}
        options={roofs}
        columns={4}
        error={errors.roofType}
        onChange={(v) => update({ roofType: v })}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t('s2.area')}
          hint={t('s2.areaHint')}
          type="number"
          inputMode="numeric"
          min={1}
          placeholder={t('s2.areaPlaceholder')}
          suffix={t('s2.areaUnit')}
          value={draft.roofArea}
          error={errors.roofArea}
          onChange={(e) => update({ roofArea: e.target.value })}
        />
      </div>

      <RadioCards
        legend={t('s2.grid')}
        name="gridStatus"
        value={draft.gridStatus}
        options={grids}
        columns={4}
        error={errors.gridStatus}
        onChange={(v) => update({ gridStatus: v })}
      />
    </div>
  );
}
