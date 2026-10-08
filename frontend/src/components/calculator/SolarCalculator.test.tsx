import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { QuoteRequestProvider } from '../../state/QuoteRequestProvider';
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
  it('starts a clean quote draft without pre-filling the estimate', async () => {
    localStorage.setItem('utu-quote-draft', JSON.stringify({ systemKWp: 20, panelCount: 30 }));
    localStorage.setItem('utu-quote-step', '4');
    render(
      <LanguageProvider>
        <QuoteRequestProvider>
          <SolarCalculator />
        </QuoteRequestProvider>
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Calculate My System' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Quotes' }));

    await waitFor(() => expect(localStorage.getItem('utu-quote-draft')).toBeNull());
    expect(localStorage.getItem('utu-quote-step')).toBeNull();
    expect(window.location.hash).toBe('#/request');
  });
});
