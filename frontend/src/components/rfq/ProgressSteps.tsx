import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';

const STEP_LABELS: TranslationKey[] = [
  'rfq.step1',
  'rfq.step2',
  'rfq.step3',
  'rfq.step4',
  'rfq.step5',
];

/**
 * Progress through the five steps.
 *
 * On a phone the labels would wrap into a mess, so below `sm` it reduces to a
 * bar plus "Step 2 of 5" — the same information, sized for the space. The list
 * exposes `aria-current` so a screen reader announces position without relying
 * on the visual treatment.
 */
export function ProgressSteps({ current }: { current: number }) {
  const { t } = useLanguage();
  const total = STEP_LABELS.length;

  return (
    <nav aria-label={t('rfq.title')} className="w-full">
      {/* Phone: compact bar */}
      <div className="sm:hidden">
        <p className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-label text-content-primary">{t(STEP_LABELS[current])}</span>
          <span className="numeric text-label-sm text-content-tertiary">
            {t('rfq.stepOf', { n: current + 1, total })}
          </span>
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-subtle">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-300"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Tablet and up: full trail */}
      <ol className="hidden sm:flex sm:items-center sm:gap-1.5">
        {STEP_LABELS.map((key, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={key} className="flex flex-1 items-center gap-1.5">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-full px-1 py-1',
                  active && 'text-content-primary',
                  !active && (done ? 'text-content-secondary' : 'text-content-tertiary'),
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] text-label-sm transition-colors',
                    done && 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-content-on-brand',
                    active && 'border-[var(--brand-primary)] text-content-brand',
                    !done && !active && 'border-line text-content-tertiary',
                  )}
                >
                  {done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span className="truncate text-label">{t(key)}</span>
              </span>
              {i < total - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('h-px flex-1', done ? 'bg-[var(--brand-primary)]' : 'bg-line-subtle')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
