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
export function CompanyCard({ company, interactive = true }: { company: Company; interactive?: boolean }) {
  const prefersReduced = useReducedMotion();
  const { t, pick } = useLanguage();
  const name = pick(company.name);
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase() ?? '')
    .join('');
  const logoPalettes = [
    'border-blue-300/20 bg-blue-400/10 text-blue-200',
    'border-teal-300/20 bg-teal-400/10 text-teal-200',
    'border-rose-300/20 bg-rose-400/10 text-rose-200',
    'border-amber-300/20 bg-amber-400/10 text-amber-200',
  ];
  const logoPaletteIndex = Array.from(company.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % logoPalettes.length;
  return (
    <motion.article
      whileHover={prefersReduced ? undefined : { ...cardHover, boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}
      className={cn(
        'relative isolate h-full overflow-hidden rounded-2xl border border-slate-700/40 bg-[#131F37] p-6 text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        company.featured && 'border-amber-400/70 shadow-[0_8px_28px_rgba(245,158,11,0.16)]',
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-amber-500/15 via-blue-500/10 to-transparent blur-2xl" />
      <div className="relative z-10 flex h-full flex-col gap-5">
      {company.featured && (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 py-1 ps-2.5 pe-3 text-label-sm text-amber-200">
          <Icon name="award" size={14} />
          {t('co.topRated')}
        </p>
      )}

      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className={`relative grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-2xl border text-lg font-bold tracking-wide shadow-inner ${logoPalettes[logoPaletteIndex]}`}
        >
          {initials}
          {company.logoUrl && (
            <img
              src={company.logoUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-h4 font-bold text-slate-100">{name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-label-sm text-slate-300">
            <Icon name="map-pin" size={14} className="shrink-0" />
            {pick(company.location)}
          </p>
        </div>
      </div>

      <VerificationBadge status={company.status} className="w-fit" />

      <Rating score={company.rating} reviewCount={company.reviews} tone="onDark" />

      <hr className="border-white/15" />

      <dl className="flex flex-wrap gap-7">
        <div>
          <dd className="flex items-center gap-1.5 text-label text-amber-300">
            <Icon name="check" size={15} className="shrink-0 text-amber-400" />
            {pick(company.projects)}
          </dd>
          <dt className="mt-0.5 text-label-sm text-slate-300">{t('co.completed')}</dt>
        </div>
        <div>
          <dd className="flex items-center gap-1.5 text-label text-amber-300">
            <Icon name="trending-up" size={15} className="shrink-0 text-amber-400" />
            {pick(company.experience)}
          </dd>
          <dt className="mt-0.5 text-label-sm text-slate-300">{t('co.experience')}</dt>
        </div>
      </dl>

      <ul className="flex flex-wrap gap-2">
        {pick(company.services).map((s) => (
          <li key={s}>
            <Chip className="border border-amber-500/20 !bg-slate-900/70 !text-amber-100/80">{s}</Chip>
          </li>
        ))}
      </ul>

      {interactive ? (
        <Button
          variant="secondary"
          size="md"
          fullWidth
          trailingArrow={company.featured}
          className="mt-auto rounded-xl border border-amber-500/20 !bg-[#F8F6F0] !text-amber-600 shadow-sm transition-all hover:border-amber-500/50 hover:!bg-[#F8F6F0] hover:!text-amber-700 hover:shadow-[0_0_12px_rgba(245,158,11,0.12)]"
          onClick={() => { window.location.hash = `#/companies/${company.id}`; }}
        >
          {t('co.view')}
          <span className="sr-only"> — {name}</span>
        </Button>
      ) : (
        <span aria-hidden="true" className="mt-auto block rounded-xl border border-amber-500/20 bg-[#F8F6F0] px-5 py-2.5 text-center text-label font-bold text-amber-600 shadow-sm">
          {t('co.view')}
        </span>
      )}
      </div>
    </motion.article>
  );
}
