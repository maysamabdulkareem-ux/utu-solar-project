import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { HomePage } from './HomePage';

vi.mock('../components/layout/Header', () => ({ Header: () => null }));
vi.mock('../components/layout/Footer', () => ({ Footer: () => null }));
vi.mock('../sections/Hero', () => ({ Hero: () => null }));
vi.mock('../sections/CalculatorSection', () => ({ CalculatorSection: () => null }));
vi.mock('../sections/HowItWorks', () => ({ HowItWorks: () => null }));
vi.mock('../sections/Companies', () => ({ Companies: () => null }));
vi.mock('../sections/Projects', () => ({ Projects: () => null }));
vi.mock('../sections/Trust', () => ({ Trust: () => null }));
vi.mock('../sections/WarrantySection', () => ({ WarrantySection: () => null }));
vi.mock('../sections/CustomerReviews', () => ({ CustomerReviews: () => null }));
vi.mock('../sections/FinalCTA', () => ({ FinalCTA: () => null }));

afterEach(cleanup);

describe('HomePage payment gateway placement', () => {
  it('renders the gateway showcase inside the landing page content', () => {
    render(
      <LanguageProvider>
        <HomePage />
      </LanguageProvider>,
    );

    const heading = screen.getByRole('heading', {
      name: 'Supporting Major Local & Regional Payment Gateways',
    });
    expect(heading.closest('main')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
