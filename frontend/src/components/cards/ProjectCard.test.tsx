import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { projects } from '../../data/content';
import { ProjectCard } from './ProjectCard';
import { ProjectDetailDialog } from './ProjectDetailDialog';

afterEach(cleanup);

const project = {
  ...projects[0],
  title: { en: 'Baghdad Home Array', ar: 'منظومة منزل بغداد' },
  size: '9.2 kWp',
  rating: 4.7,
  company: { en: 'Rafidain Solar Systems', ar: 'الرافدين للأنظمة الشمسية' },
};

function renderCard(onView = vi.fn()) {
  render(
    <LanguageProvider>
      <ProjectCard project={project} onView={onView} />
    </LanguageProvider>,
  );
  return onView;
}

describe('ProjectCard', () => {
  it('renders dynamic project content and rating', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Baghdad Home Array' })).toBeInTheDocument();
    expect(screen.getByText('9.2 kWp')).toBeInTheDocument();
    expect(screen.getByText('Rafidain Solar Systems')).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 4.7 out of 5')).toBeInTheDocument();
  });

  it('opens the project detail view when its action is selected', () => {
    const onView = renderCard();

    fireEvent.click(screen.getByRole('button', { name: 'View Project' }));

    expect(onView).toHaveBeenCalledWith(project);
  });

  it('shows the image placeholder when the project photo cannot load', () => {
    render(
      <LanguageProvider>
        <ProjectDetailDialog
          project={{ ...project, imageUrl: '/broken-project.jpg', galleryUrls: ['/broken-project.jpg'] }}
          onClose={vi.fn()}
        />
      </LanguageProvider>,
    );

    fireEvent.error(screen.getByRole('dialog').querySelector('img')!);

    expect(screen.queryByRole('dialog')?.querySelector('img')).not.toBeInTheDocument();
  });
});