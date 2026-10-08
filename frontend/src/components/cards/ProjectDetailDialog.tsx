import { useEffect, useRef, useState } from 'react';
import type { Project } from '../../data/content';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Icon } from '../icons/Icon';
import { VerificationBadge } from '../ui/VerificationBadge';

export function ProjectDetailDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const { lang, t, pick } = useLanguage();
  const [activePhoto, setActivePhoto] = useState(project.imageUrl ?? '');
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set());
  const closeRef = useRef<HTMLButtonElement>(null);
  const photos = [...new Set([project.imageUrl, ...(project.galleryUrls ?? [])].filter((url): url is string => Boolean(url)))];
  const missing = t('pr.notProvided');
  const specs = [
    [t('pr.size'), project.size],
    [t('pr.battery'), project.batteryKwh == null ? missing : `${project.batteryKwh} kWh`],
    [t('pr.panels'), project.panelCount == null ? missing : String(project.panelCount)],
    [t('pr.roof'), project.roofType || missing],
    [t('pr.inverter'), project.inverterDetails || missing],
  ];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setActivePhoto(project.imageUrl ?? '');
    setFailedPhotos(new Set());
  }, [project.id, project.imageUrl]);

  const completedDate = project.completedAt
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ' : 'en-IQ', { dateStyle: 'long' }).format(new Date(project.completedAt))
    : missing;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-xl bg-bg-surface shadow-2xl sm:rounded-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-line-subtle bg-bg-surface px-5 py-4 sm:px-8">
          <div>
            <p className="text-label-sm text-content-brand">{t('pr.completed')}</p>
            <h2 id="project-detail-title" className="mt-1 text-h3 text-content-primary">
              {pick(project.title)}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('pr.close')}
            title={t('pr.close')}
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-bg-subtle hover:text-content-primary"
          >
            <Icon name="x-mark" size={20} />
          </button>
        </header>

        <div className="grid gap-7 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            {activePhoto && !failedPhotos.has(activePhoto) ? (
              <img
                src={activePhoto}
                alt={t('pr.imgAlt', { l: pick(project.location) })}
                className="aspect-[4/3] w-full rounded-lg bg-bg-subtle object-cover"
                onError={() => setFailedPhotos((failed) => new Set(failed).add(activePhoto))}
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-lg bg-bg-subtle text-content-tertiary">
                <Icon name="solar-panel" size={44} />
              </div>
            )}
            {photos.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={t('pr.gallery')}>
                {photos.filter((photo) => !failedPhotos.has(photo)).map((photo) => (
                  <button
                    key={photo}
                    type="button"
                    aria-label={t('pr.imgAlt', { l: pick(project.location) })}
                    aria-pressed={photo === activePhoto}
                    onClick={() => setActivePhoto(photo)}
                    className={`h-16 w-20 shrink-0 overflow-hidden rounded border-2 ${photo === activePhoto ? 'border-line-brand' : 'border-line-subtle'}`}
                  >
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <section className="mt-7">
              <h3 className="text-label text-content-primary">{t('pr.overview')}</h3>
              <p className="mt-2 text-body-sm leading-6 text-content-secondary">
                {project.description ? pick(project.description) : missing}
              </p>
              <dl className="mt-4 grid gap-4 border-y border-line-subtle py-4 sm:grid-cols-2">
                <div>
                  <dt className="text-label-sm text-content-tertiary">{t('pr.completionDate')}</dt>
                  <dd className="mt-1 text-label text-content-primary">{completedDate}</dd>
                </div>
                <div>
                  <dt className="text-label-sm text-content-tertiary">{t('pr.location')}</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-label text-content-primary">
                    <Icon name="map-pin" size={15} />{pick(project.location)}
                  </dd>
                </div>
              </dl>
            </section>

            {project.testimonial && (
              <section className="mt-6 border-s-2 border-line-brand ps-4">
                <h3 className="text-label text-content-primary">{t('pr.testimonial')}</h3>
                <blockquote className="mt-2 text-body-sm leading-6 text-content-secondary">{project.testimonial}</blockquote>
                <div
                  role="img"
                  aria-label={t('rate.aria', { s: project.rating })}
                  className="mt-2 flex items-center gap-0.5 text-solar-500"
                >
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <Icon
                      key={starIndex}
                      name="star"
                      size={14}
                      className={starIndex < Math.round(project.rating) ? '' : 'opacity-30'}
                    />
                  ))}
                  <span className="numeric ms-1 text-label-sm text-content-primary">{project.rating.toFixed(1)}</span>
                </div>
                {project.clientName && <p className="mt-2 text-label-sm text-content-tertiary">{project.clientName}</p>}
              </section>
            )}
          </div>

          <aside className="min-w-0">
            <section>
              <h3 className="text-label text-content-primary">{t('pr.technicalSpecs')}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                {specs.map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-md border border-line-subtle bg-bg-page p-3 last:col-span-2">
                    <dt className="text-label-sm text-content-tertiary">{label}</dt>
                    <dd className="mt-1 break-words text-label text-content-primary">{value}</dd>
                  </div>
                ))}
                <div className="col-span-2 rounded-md border border-line-subtle bg-bg-page p-3">
                  <dt className="text-label-sm text-content-tertiary">{t('pr.annualGeneration')}</dt>
                  <dd className="numeric mt-1 text-label text-content-primary">
                    {project.annualGenerationKwh == null
                      ? missing
                      : `${project.annualGenerationKwh.toLocaleString('en-US')} kWh`}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-7 border-t border-line-subtle pt-5">
              <h3 className="text-label text-content-primary">{t('pr.companyDetails')}</h3>
              <div className="mt-3 flex items-center gap-3">
                {project.companyLogoUrl ? (
                  <img src={project.companyLogoUrl} alt="" className="h-12 w-12 rounded-md object-contain" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-md bg-bg-subtle text-content-brand">
                    <Icon name="solar-panel" size={22} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-label text-content-primary">{pick(project.company)}</p>
                  {project.companyVerificationStatus && (
                    <VerificationBadge status={project.companyVerificationStatus} className="mt-2" />
                  )}
                </div>
              </div>
              {project.companyId && (
                <a
                  href={`#/companies/${project.companyId}`}
                  className="mt-4 inline-flex text-label-sm font-semibold text-content-brand underline underline-offset-2"
                >
                  {t('pr.viewCompany')}
                </a>
              )}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}