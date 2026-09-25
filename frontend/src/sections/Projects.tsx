import { Button } from '../components/ui/Button';
import { ProjectCard } from '../components/cards/ProjectCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { projects } from '../data/content';
import { useLanguage } from '../i18n/LanguageProvider';

export function Projects() {
  const { t } = useLanguage();

  return (
    <section id="projects" aria-labelledby="projects-heading" className="section-y bg-bg-page">
      <div className="container-page">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow text-[var(--color-sunset-500)]">{t('pr.eyebrow')}</p>
            <h2 id="projects-heading" className="mt-3 text-h1 text-content-primary">
              {t('pr.h2')}
            </h2>
          </div>
          <Button variant="secondary" size="md" trailingArrow>
            {t('pr.viewAll')}
          </Button>
        </Reveal>

        <Reveal stagger as="ul" className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <RevealItem key={project.id} as="li" className="h-full">
              <ProjectCard project={project} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
