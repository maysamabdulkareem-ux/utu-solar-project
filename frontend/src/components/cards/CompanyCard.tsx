import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Rating } from '../ui/Rating';
import { VerificationBadge } from '../ui/VerificationBadge';
import { cardHover } from '../../motion/animation';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Company } from '../../data/content';

/**
 * Solar company listing.
 *
 * Hover only changes border, shadow and CTA emphasis — nothing reflows, so a
 * grid of these never shifts under the pointer.
 */
export function CompanyCard({ company }: { company: Company }) {
  const prefersReduced = useReducedMotion();
  const { t, pick } = useLanguage();
  const name = pick(company.name);

  return (
    <motion.article
      whileHover={prefersReduced ? undefined : cardHover}
      className={cn(
        'flex h-full flex-col gap-5 rounded-xl bg-bg-surface p-6 transition-colors',
        company.featured
          ? 'border-[1.5px] border-line-brand shadow-[0_8px_28px_rgba(229,146,15,0.16)]'
          : 'border border-line-subtle hover:border-line-brand',
      )}
    >
      {company.featured && (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line-brand bg-[var(--brand-subtle)] py-1 ps-2.5 pe-3 text-label-sm text-content-brand">
          <Icon name="award" size={14} />
          {t('co.topRated')}
        </p>
      )}

      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[13px] text-solar-400"
          style={{ backgroundImage: 'linear-gradient(145deg, #16242d 0%, #0a0f13 100%)' }}
        >
          <Icon name="solar-panel" size={24} />
        </span>
        <div className="min-w-0">
          <h3 className="text-h4 text-content-primary">{name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-label-sm text-content-tertiary">
            <Icon name="map-pin" size={14} className="shrink-0" />
            {pick(company.location)}
          </p>
        </div>
      </div>

      <VerificationBadge status={company.status} className="w-fit" />

      <Rating score={company.rating} reviewCount={company.reviews} />

      <hr className="border-line-subtle" />

      <dl className="flex flex-wrap gap-7">
        <div>
          <dd className="flex items-center gap-1.5 text-label text-content-primary">
            <Icon name="check" size={15} className="shrink-0 text-content-tertiary" />
            {pick(company.projects)}
          </dd>
          <dt className="mt-0.5 text-label-sm text-content-tertiary">{t('co.completed')}</dt>
        </div>
        <div>
          <dd className="flex items-center gap-1.5 text-label text-content-primary">
            <Icon name="trending-up" size={15} className="shrink-0 text-content-tertiary" />
            {pick(company.experience)}
          </dd>
          <dt className="mt-0.5 text-label-sm text-content-tertiary">{t('co.experience')}</dt>
        </div>
      </dl>

      <ul className="flex flex-wrap gap-2">
        {pick(company.services).map((s) => (
          <li key={s}>
            <Chip>{s}</Chip>
          </li>
        ))}
      </ul>

      <Button
        variant={company.featured ? 'primary' : 'secondary'}
        size="md"
        fullWidth
        trailingArrow={company.featured}
        className="mt-auto"
      >
        {t('co.view')}
        <span className="sr-only"> — {name}</span>
      </Button>
    </motion.article>
  );
}
