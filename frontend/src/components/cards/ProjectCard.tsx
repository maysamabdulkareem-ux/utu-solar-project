import { motion } from 'framer-motion';
import { Icon } from '../icons/Icon';
import { SolarArray } from '../ui/SolarArray';
import { cardHover } from '../../motion/animation';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Project } from '../../data/content';

/**
 * Completed installation.
 *
 * A project shows its photograph when it has one and the drawn solar-array
 * treatment when it does not, so the section never has a hole in it while the
 * photo library is still being filled.
 */
export function ProjectCard({ project }: { project: Project }) {
  const prefersReduced = useReducedMotion();
  const { t, pick } = useLanguage();
  const location = pick(project.location);

  const status = (
    <p className="absolute start-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(241,244,238,0.95)] py-1 ps-2.5 pe-3 text-label-sm text-sage-600">
      <Icon name={project.status === 'completed' ? 'check' : 'clock'} size={14} />
      {t(project.status === 'completed' ? 'pr.completed' : 'pr.inProgress')}
    </p>
  );

  return (
    <motion.article
      whileHover={prefersReduced ? undefined : cardHover}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-line-subtle bg-bg-surface transition-colors hover:border-line-brand"
    >
      {project.imageUrl ? (
        <div className="relative h-48 w-full overflow-hidden bg-panel-900">
          <img
            src={project.imageUrl}
            alt={t('pr.imgAlt', { l: location })}
            width={1000}
            height={600}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {/* Keeps the status pill legible over a bright sky. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-20"
            style={{
              background: 'linear-gradient(to bottom, rgba(10,15,19,0.42), transparent)',
            }}
          />
          {status}
        </div>
      ) : (
        <SolarArray
          tone={project.tone}
          className="relative h-48 w-full"
          label={t('pr.imgAlt', { l: location })}
        >
          {status}
        </SolarArray>
      )}

      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div>
          <h3 className="text-h4 text-content-primary">{pick(project.title)}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-label-sm text-content-tertiary">
            <Icon name="map-pin" size={14} className="shrink-0" />
            {location}
          </p>
        </div>

        <dl className="flex flex-wrap gap-6">
          <div>
            <dd className="numeric flex items-center gap-1.5 text-label text-content-primary">
              <Icon name="zap" size={15} className="shrink-0 text-content-tertiary" />
              {project.size}
            </dd>
            <dt className="mt-0.5 text-label-sm text-content-tertiary">{t('pr.size')}</dt>
          </div>
          <div>
            <dd className="flex items-center gap-1.5 text-label text-content-primary">
              <Icon
                name={project.installationIcon}
                size={15}
                className="shrink-0 text-content-tertiary"
              />
              {pick(project.installation)}
            </dd>
            <dt className="mt-0.5 text-label-sm text-content-tertiary">{t('pr.install')}</dt>
          </div>
        </dl>

        <hr className="mt-auto border-line-subtle" />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label-sm text-content-tertiary">{t('pr.by')}</p>
            <p className="truncate text-label text-content-primary">{pick(project.company)}</p>
          </div>
          <p
            className="numeric flex shrink-0 items-center gap-1 text-label text-content-primary"
            aria-label={t('rate.aria', { s: project.rating })}
          >
            <Icon name="star" size={15} className="text-solar-500" />
            {project.rating.toFixed(1)}
          </p>
        </div>
      </div>
    </motion.article>
  );
}
