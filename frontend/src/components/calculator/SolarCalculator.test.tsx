import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { QuoteRequestProvider } from '../../state/QuoteRequestProvider';
import { AssessmentProvider } from '../../state/AssessmentProvider';
import { SolarCalculator } from './SolarCalculator';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

describe('SolarCalculator quote handoff', () => {
  it('starts a new quote request pre-filled with the calculator result', async () => {
    localStorage.setItem('utu-quote-draft', JSON.stringify({ systemKWp: 20, panelCount: 30 }));
    localStorage.setItem('utu-quote-step', '4');
    render(
      <LanguageProvider>
        <QuoteRequestProvider>
          <AssessmentProvider>
            <SolarCalculator />
          </AssessmentProvider>
        </QuoteRequestProvider>
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate My System' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Quotes' }));

    await waitFor(() => expect(window.location.hash).toBe('#/request'));
    const draft = JSON.parse(localStorage.getItem('utu-quote-draft') ?? '{}');
    expect(draft.fromCalculator).toBe(true);
    expect(draft.systemKWp).toBeGreaterThan(0);
    expect(draft.panelCount).toBeGreaterThan(0);
    // The old draft's numbers are replaced and the new request starts at step 1.
    expect(draft.systemKWp).not.toBe(20);
    expect(localStorage.getItem('utu-quote-step')).toBeNull();
  });

  it('opens the UTU assessment with the same appliances', async () => {
    render(
      <LanguageProvider>
        <QuoteRequestProvider>
          <AssessmentProvider>
            <SolarCalculator />
          </AssessmentProvider>
        </QuoteRequestProvider>
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate My System' }));
    fireEvent.click(screen.getByRole('button', { name: 'See UTU assessment' }));

    await waitFor(() => expect(window.location.hash).toBe('#/assessment'));
    const saved = JSON.parse(localStorage.getItem('utu-assessment-appliances') ?? '[]');
    expect(saved.length).toBeGreaterThan(0);
  });
});
