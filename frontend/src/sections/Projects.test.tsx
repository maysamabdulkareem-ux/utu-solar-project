import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { api, type ApiProject } from '../api/client';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { Projects } from './Projects';

vi.mock('../motion/Reveal', () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderProjects() {
  render(
    <LanguageProvider>
      <Projects />
    </LanguageProvider>,
  );
}

function makeApiProject(id: number): ApiProject {
  return {
    id,
    title: `Solar installation ${id}`,
    description: 'Completed rooftop installation',
    company_id: 1,
    company: {
      id: 1,
      name: 'Test Solar',
      logo_url: null,
      founded_year: 2015,
      projects_count: 10,
      address: 'Baghdad',
      verification_status: 'verified',
    },
    client_name: null,
    location_governorate: 'Baghdad',
    location_district: `District ${id}`,
    system_kwp: 8,
    battery_kwh: null,
    installation_type: 'On-grid rooftop',
    rating: 4.8,
    image_url: '',
    gallery_urls: [],
    status: 'completed',
    completed_at: `2026-01-${String(id).padStart(2, '0')}T00:00:00Z`,
    created_at: `2026-01-${String(id).padStart(2, '0')}T00:00:00Z`,
    panel_count: null,
    roof_type: null,
    inverter_details: null,
    annual_generation_kwh: null,
    testimonial: null,
  };
}

describe('Projects section request states', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listProjects').mockReturnValue(new Promise(() => {}));
  });

  it('announces loading while projects are being fetched', () => {
    renderProjects();
    expect(screen.getByRole('status')).toHaveTextContent('Loading completed projects…');
  });

  it('shows an empty state when the API has no completed projects', async () => {
    vi.mocked(api.listProjects).mockResolvedValue([]);
    renderProjects();

    expect(await screen.findByText('No completed projects are listed yet.')).toBeInTheDocument();
  });

  it('discloses API failure and falls back to bundled sample projects', async () => {
    vi.mocked(api.listProjects).mockRejectedValue(new Error('API unavailable'));
    renderProjects();

    expect(await screen.findByText('Live projects are unavailable. Showing sample projects instead.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Residential Solar System' })).toBeInTheDocument();
  });

  it('refreshes and shows older projects created after the homepage initially loaded', async () => {
    vi.mocked(api.listProjects)
      .mockResolvedValueOnce(Array.from({ length: 3 }, (_, index) => makeApiProject(index + 7)))
      .mockResolvedValueOnce(Array.from({ length: 9 }, (_, index) => makeApiProject(index + 1)));
    renderProjects();

    expect(await screen.findByRole('heading', { name: 'Solar installation 7' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /Solar installation/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'View All Projects' }));

    expect(await screen.findByRole('heading', { name: 'Solar installation 1' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /Solar installation/ })).toHaveLength(9);
    expect(screen.getByRole('heading', { name: 'Solar installation 9' })).toBeInTheDocument();
    expect(api.listProjects).toHaveBeenCalledTimes(2);
  });

  it('shows a verified project review directly on its public project card', async () => {
    vi.mocked(api.listProjects).mockResolvedValue([{
      ...makeApiProject(4),
      verified_review: {
        rating: 5,
        client_name: 'Ahmed M.',
        comment: 'The completed installation works exactly as agreed.',
        is_verified: true,
      },
    }]);
    renderProjects();

    expect(await screen.findByText('The completed installation works exactly as agreed.')).toBeInTheDocument();
    expect(screen.getByText('Ahmed M.')).toBeInTheDocument();
    expect(screen.getByText('Verified Purchase')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 5 out of 5' })).toBeInTheDocument();
  });
});
