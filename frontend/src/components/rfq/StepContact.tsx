import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { RequestSummary } from './RequestSummary';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useQuoteRequest } from '../../state/QuoteRequestProvider';
import type { StepErrors } from './validation';

/**
 * Step 5 — contact details and read-back.
 *
 * Phone first, email optional: Iraqi companies reply on WhatsApp, and asking
 * for an email as though it were the primary channel would be importing a habit
 * from another market.
 */
export function StepContact({
  errors,
  onEdit,
}: {
  errors: StepErrors;
  onEdit: (step: number) => void;
}) {
  const { t } = useLanguage();
  const { draft, update } = useQuoteRequest();

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h2 className="text-h2 text-content-primary">{t('s5.title')}</h2>
        <p className="mt-2 max-w-prose text-body text-content-secondary">{t('s5.desc')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t('s5.name')}
          placeholder={t('s5.namePlaceholder')}
          autoComplete="name"
          value={draft.name}
          error={errors.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <Input
          label={t('s5.phone')}
          hint={t('s5.phoneHint')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          value={draft.phone}
          error={errors.phone}
          onChange={(e) => update({ phone: e.target.value })}
        />
      </div>

      <Checkbox
        label={t('s5.whatsapp')}
        checked={draft.whatsapp}
        onChange={(v) => update({ whatsapp: v })}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t('s5.email')}
          hint={t('s5.emailHint')}
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          optional
          optionalLabel={t('rfq.optional')}
          value={draft.email}
          onChange={(e) => update({ email: e.target.value })}
        />
      </div>

      <section>
        <h3 className="mb-3 text-h4 text-content-primary">{t('s5.review')}</h3>
        <RequestSummary onEdit={onEdit} />
      </section>
    </div>
  );
}
