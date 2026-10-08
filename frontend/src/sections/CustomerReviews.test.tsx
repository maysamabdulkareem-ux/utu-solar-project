import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { api, type ApiReview } from '../api/client';
import { reviews as demoReviews } from '../data/content';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { CustomerReviews } from './CustomerReviews';

vi.mock('../api/client', () => ({
  api: {
    publicReviews: vi.fn(),
  },
}));

vi.mock('../motion/Reveal', () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
  RevealItem: ({ children }: { children: ReactNode }) => children,
}));

afterEach(cleanup);

const sampleReview: ApiReview = {
  id: 42,
  company_id: 3,
  company_name: 'Al-Nahrain Renewables',
  project_id: 7,
  project_title: 'Hybrid Solar System',
  system_kwp: 12.6,
  location_governorate: 'Basra',
  location_district: 'Al-Zubair',
  client_name: 'Basra Homeowner',
  rating: 4.8,
  communication_rating: 5,
  work_quality_rating: 5,
  comment: 'The battery backup makes evening outages much easier to manage.',
  is_verified: true,
  created_at: '2025-02-12T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(api.publicReviews).mockResolvedValue([sampleReview]);
});

describe('CustomerReviews', () => {
  it('renders verified review content and its linked project details', async () => {
    render(
      <LanguageProvider>
        <CustomerReviews />
      </LanguageProvider>,
    );

    expect(await screen.findByText('The battery backup makes evening outages much easier to manage.')).toBeInTheDocument();
    expect(screen.getByText('Verified installation')).toBeInTheDocument();
    expect(screen.getByText('Hybrid Solar System')).toBeInTheDocument();
    expect(screen.getByText('Al-Nahrain Renewables')).toBeInTheDocument();
    expect(screen.getByText('Basra · Al-Zubair')).toBeInTheDocument();
  });

  it('shows newest verified database reviews alongside demo reviews', async () => {
    const newestReview = {
      ...sampleReview,
      id: 78,
      client_name: 'Zaha K.',
      comment: 'The team completed my installation on time and answered every question.',
      created_at: '2026-10-06T00:00:00Z',
    };
    vi.mocked(api.publicReviews).mockResolvedValue([newestReview, sampleReview]);
    render(
      <LanguageProvider>
        <CustomerReviews />
      </LanguageProvider>,
    );

    expect(await screen.findByText(newestReview.comment)).toBeInTheDocument();
    expect(screen.getByText(sampleReview.comment)).toBeInTheDocument();
    expect(screen.getByText(demoReviews[0].body.en)).toBeInTheDocument();
    expect(api.publicReviews).toHaveBeenCalledOnce();
  });

  it('preserves demo reviews when there are no database reviews', async () => {
    vi.mocked(api.publicReviews).mockResolvedValue([]);
    render(
      <LanguageProvider>
        <CustomerReviews />
      </LanguageProvider>,
    );

    expect(await screen.findByText(demoReviews[0].body.en)).toBeInTheDocument();
    expect(screen.getByText(demoReviews[1].body.en)).toBeInTheDocument();
  });

  it('does not display unverified database reviews', async () => {
    vi.mocked(api.publicReviews).mockResolvedValue([{ ...sampleReview, is_verified: false }]);
    render(
      <LanguageProvider>
        <CustomerReviews />
      </LanguageProvider>,
    );

    expect(await screen.findByText(demoReviews[0].body.en)).toBeInTheDocument();
    expect(screen.queryByText(sampleReview.comment)).not.toBeInTheDocument();
  });

  it('falls back to demo reviews and explains when the live feed fails', async () => {
    vi.mocked(api.publicReviews).mockRejectedValue(new Error('API unavailable'));
    render(
      <LanguageProvider>
        <CustomerReviews />
      </LanguageProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Live reviews could not be loaded. Showing sample reviews instead.');
    expect(screen.getByText(demoReviews[0].body.en)).toBeInTheDocument();
  });
});