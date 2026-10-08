import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { invalidateCompanies } from '../api/useCompanies';
import { Companies } from './Companies';
import { CompaniesDirectoryPage } from '../pages/CompaniesDirectoryPage';
import { PublicCompanyPage } from '../pages/PublicCompanyPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const companyRows = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Solar Company ${index + 1}`,
  logo_url: index === 0 ? 'https://example.test/logo.svg' : null,
  founded_year: 2017 + (index % 5),
  projects_count: index + 2,
  address: `Baghdad, District ${index + 1}`,
  verification_status: index === 0 ? 'verified' : index === 1 ? 'identity_verified' : 'pending',
  rating: index === 1 ? 3.6 : 3.2 + index / 10,
  reviews_count: index === 1 ? 2 : 1,
}));

function renderHomepageCompanies() {
  return render(
    <LanguageProvider>
      <Companies />
    </LanguageProvider>,
  );
}

describe('company discovery', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.stubGlobal('IntersectionObserver', class {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: number[] = [];
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] { return []; }
    });
    invalidateCompanies();
    vi.spyOn(api, 'listCompanies').mockResolvedValue(companyRows);
    vi.spyOn(api, 'publicReviews').mockResolvedValue([
      {
        id: 1, company_id: 1, company_name: 'Solar Company 1', project_id: 3, project_title: 'Baghdad project',
        system_kwp: 8, location_governorate: 'Baghdad', location_district: 'Mansour', client_name: 'Customer',
        rating: 5, communication_rating: 5, work_quality_rating: 5, comment: 'Excellent work.',
        is_verified: true, created_at: '2026-05-20T00:00:00Z',
      },
      {
        id: 2, company_id: 1, company_name: 'Solar Company 1', project_id: 4, project_title: 'Basra project',
        system_kwp: 10, location_governorate: 'Basra', location_district: 'Ashar', client_name: 'Customer 2',
        rating: 3, communication_rating: 3, work_quality_rating: 3, comment: 'Good work.',
        is_verified: true, created_at: '2026-04-20T00:00:00Z',
      },
      {
        id: 3, company_id: 2, company_name: 'Solar Company 2', project_id: 5, project_title: 'Unverified review',
        system_kwp: 6, location_governorate: 'Baghdad', location_district: 'Karrada', client_name: 'Customer 3',
        rating: 1, communication_rating: 1, work_quality_rating: 1, comment: 'Not verified.',
        is_verified: false, created_at: '2026-03-20T00:00:00Z',
      },
    ]);
  });

  it('shows six ranked homepage cards with unique initials/custom logos and real verified-review averages', async () => {
    renderHomepageCompanies();

    const cards = await screen.findAllByRole('button', { name: /View Company/ });
    expect(cards).toHaveLength(6);
    expect(cards[0]).toHaveAccessibleName(/Solar Company 1/);
    expect(screen.getByRole('img', { name: /Rated 4 out of 5 from 2 reviews/i })).toBeInTheDocument();
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.test/logo.svg');
    expect(screen.getByText('Verified Gold')).toBeInTheDocument();
    expect(document.querySelector('[title="Identity or office document reviewed"]')).toBeInTheDocument();
    expect(document.querySelector('[title="Verification is incomplete; review is still in progress"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View All Companies' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discover More Companies' })).toBeInTheDocument();
    expect(screen.getByTestId('company-peek-pocket')).toBeInTheDocument();
    expect(document.querySelectorAll('#companies article')).toHaveLength(8);
    expect(screen.getByTestId('company-peek-pocket').querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByText('Solar companies')).toHaveClass('text-amber-600');
    expect(screen.getByRole('heading', { name: 'Compare installers with status shown clearly' })).toHaveClass('text-slate-900', 'tracking-tight');

    const logoInitials = screen.getAllByText(/^SC$/);
    expect(logoInitials.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('article').every((card) =>
      card.className.includes('bg-[#131F37]') &&
      card.className.includes('rounded-2xl') &&
      card.className.includes('border-slate-700/40') &&
      card.className.includes('hover:border-amber-500/40') &&
      card.className.includes('hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'),
    )).toBe(true);
    expect(screen.getAllByRole('article').every((card) =>
      card.querySelector('span[aria-hidden="true"]')?.className.includes('border-blue-300/20') ||
      card.querySelector('span[aria-hidden="true"]')?.className.includes('border-teal-300/20') ||
      card.querySelector('span[aria-hidden="true"]')?.className.includes('border-rose-300/20') ||
      card.querySelector('span[aria-hidden="true"]')?.className.includes('border-amber-300/20'),
    )).toBe(true);
    expect(cards.every((card) =>
      card.className.includes('!bg-[#F8F6F0]') &&
      card.className.includes('text-amber-600') &&
      card.className.includes('hover:!text-amber-700'),
    )).toBe(true);
    expect(screen.getAllByRole('article').every((card) =>
      card.querySelector('[aria-hidden="true"].absolute')?.className.includes('from-amber-500/15'),
    )).toBe(true);
    fireEvent.click(cards[0]);
    expect(window.location.hash).toBe('#/companies/1');
    fireEvent.click(screen.getByRole('button', { name: 'Discover More Companies' }));
    expect(window.location.hash).toBe('#/companies');
  });

  it('opens the searchable, status-filtered full company directory and routes back home', async () => {
    render(
      <LanguageProvider>
        <CompaniesDirectoryPage />
      </LanguageProvider>,
    );

    expect(await screen.findAllByRole('button', { name: /View Company/ })).toHaveLength(8);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Company 4' } });
    expect(screen.getAllByRole('button', { name: /View Company/ })).toHaveLength(1);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Verification status'), { target: { value: 'identity_verified' } });
    expect(screen.getAllByRole('button', { name: /View Company/ })).toHaveLength(1);
    const backLink = screen.getByRole('link', { name: 'Back to Home' });
    expect(backLink).toHaveAttribute('href', '#/');
    expect(backLink).toHaveClass('rounded-xl', 'bg-amber-500/10', 'text-amber-700');
    expect(screen.getByText('Company directory')).toHaveClass('tracking-widest', 'text-amber-600');
    expect(screen.getByRole('heading', { name: 'All solar companies' })).toHaveClass('text-slate-900', 'tracking-tight');
    expect(screen.getByText(/Search all registered companies/)).toHaveClass('text-slate-600');
    expect(screen.getByText('Search by name or location')).toHaveClass('font-semibold', 'tracking-wider');
    expect(screen.getByRole('searchbox')).toHaveClass('border-slate-200', 'focus:border-amber-500', 'ps-11');
    expect(screen.getByLabelText('Verification status')).toHaveClass('appearance-none', 'px-4', 'py-3', 'text-slate-800');
    expect(screen.getByLabelText('Verification status')).toHaveClass('directory-status-select');
    expect(screen.getByRole('option', { name: 'All statuses' })).toHaveClass('directory-status-option');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(screen.getByText('Search by name or location').closest('div'))
      .toHaveClass('rounded-2xl', 'bg-white/80', 'backdrop-blur-md');
  });

  it('renders verified reviews in a company detail profile', async () => {
    vi.spyOn(api, 'getCompany').mockResolvedValue({
      ...companyRows[0],
      logo_url: null,
      phone: null,
      support_phone: null,
      verification_documents: [],
      completed_project_count: 7,
      reviews_count: 2,
      business_license_number: '',
      tax_registration_number: '',
    });
    vi.spyOn(api, 'listCompanyProjects').mockResolvedValue([
      {
        id: 22,
        title: 'Mansour rooftop installation',
        description: 'Residential hybrid solar installation.',
        system_kwp: 8.4,
        location: 'Baghdad, Mansour',
        completed_at: '2026-05-15T00:00:00Z',
      },
    ]);
    vi.spyOn(api, 'companyReviews').mockResolvedValue([
      {
        id: 10, company_id: 1, company_name: 'Solar Company 1', project_id: 22, project_title: 'Mansour roof system',
        system_kwp: 8.4, location_governorate: 'Baghdad', location_district: 'Mansour', client_name: 'Zainab A.',
        rating: 5, communication_rating: 5, work_quality_rating: 5, comment: 'Excellent installation and service.',
        is_verified: true, created_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 11, company_id: 1, company_name: 'Solar Company 1', project_id: 23, project_title: 'Unverified',
        system_kwp: 5, location_governorate: 'Baghdad', location_district: 'Karrada', client_name: 'Unknown',
        rating: 1, communication_rating: 1, work_quality_rating: 1, comment: 'Must not be shown.',
        is_verified: false, created_at: '2026-05-01T00:00:00Z',
      },
    ]);

    render(
      <LanguageProvider>
        <PublicCompanyPage companyId={1} />
      </LanguageProvider>,
    );

    const reviewsHeading = await screen.findByRole('heading', { name: 'Customer Reviews' });
    expect(reviewsHeading).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(screen.getByRole('link', { name: 'Back to companies' })).toHaveClass('rounded-xl', 'bg-amber-500/10');
    expect(screen.getByRole('heading', { name: 'Solar Company 1' })).toHaveClass('text-3xl', 'font-extrabold');
    expect(screen.getByRole('button', { name: 'Request a quote from this company' })).toHaveClass('from-amber-500', 'to-orange-500');
    expect(screen.getByRole('heading', { name: 'Company information' }).nextElementSibling).toHaveClass('lg:grid-cols-4');
    expect(screen.getByText('Founded').parentElement).toHaveClass('rounded-2xl', 'bg-white/80');
    const reviewsSection = reviewsHeading.closest('section');
    expect(reviewsSection).not.toBeNull();
    expect(within(reviewsSection as HTMLElement).getByText('Zainab A.')).toBeInTheDocument();
    expect(within(reviewsSection as HTMLElement).getByText('Excellent installation and service.')).toBeInTheDocument();
    expect(within(reviewsSection as HTMLElement).queryByText('Must not be shown.')).not.toBeInTheDocument();
    expect(within(reviewsSection as HTMLElement).getByText('Verified project')).toHaveClass('bg-emerald-500/10', 'text-emerald-600');
    expect(within(reviewsSection as HTMLElement).getByRole('listitem')).toHaveClass('rounded-2xl', 'bg-white');
    const portfolioHeading = screen.getByRole('heading', { name: 'Project portfolio' });
    const projectCard = portfolioHeading.parentElement?.querySelector('li');
    expect(projectCard).toHaveClass('rounded-2xl', 'bg-white');
    expect(within(projectCard as HTMLElement).getByText('Mansour rooftop installation')).toBeInTheDocument();
    expect(within(projectCard as HTMLElement).getByText(/8.4 kWp/)).toHaveClass('numeric');
    expect(within(projectCard as HTMLElement).getByText(/Baghdad, Mansour/)).toBeInTheDocument();
  });
});
