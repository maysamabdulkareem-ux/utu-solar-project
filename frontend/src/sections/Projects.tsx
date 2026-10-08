import { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { ProjectCard } from '../components/cards/ProjectCard';
import { ProjectDetailDialog } from '../components/cards/ProjectDetailDialog';
import { Reveal } from '../motion/Reveal';
import { projects as sampleProjects, type Project } from '../data/content';
import { api, toProject } from '../api/client';
import { useLanguage } from '../i18n/LanguageProvider';

export function Projects() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async (isRefresh = false) => {
    try {
      const items = await api.listProjects({ status: 'completed' });
      setProjects(items.map(toProject));
      setUnavailable(false);
    } catch {
      setUnavailable(true);
      if (!isRefresh) {
        setProjects(sampleProjects.filter((project) => project.status === 'completed'));
      }
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const visibleProjects = showAll ? projects : projects.slice(0, 3);

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
          <Button
            variant="secondary"
            size="md"
            trailingArrow={!showAll}
            aria-expanded={showAll}
            onClick={() => {
              const expand = !showAll;
              setShowAll(expand);
              if (expand) void loadProjects(true);
            }}
          >
            {showAll ? t('pr.showLess') : t('pr.viewAll')}
          </Button>
        </Reveal>

        {unavailable && (
          <p role="status" className="mt-6 text-body-sm text-content-tertiary">{t('pr.loadError')}</p>
        )}
        {loading ? (
          <p role="status" className="mt-10 border-y border-line-subtle py-8 text-body text-content-secondary">
            {t('pr.loading')}
          </p>
        ) : projects.length === 0 ? (
          <p className="mt-10 border-y border-line-subtle py-8 text-body text-content-secondary">
            {t('pr.empty')}
          </p>
        ) : (
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <li key={project.id} className="h-full">
                <ProjectCard project={project} onView={setSelectedProject} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedProject && (
        <ProjectDetailDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </section>
  );
}
