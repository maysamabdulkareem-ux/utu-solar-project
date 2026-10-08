import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { QuoteRequestProvider } from '../../state/QuoteRequestProvider';
import { StepPreferences, calculateGreenMonthlyPayment } from './StepPreferences';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderPreferences() {
  return render(
    <LanguageProvider>
      <QuoteRequestProvider>
        <StepPreferences errors={{}} />
      </QuoteRequestProvider>
    </LanguageProvider>,
  );
}

describe('Green Initiative financing estimate', () => {
  it('calculates an interactive 60-month estimate and shows the non-offer disclaimer', () => {
    renderPreferences();

    fireEvent.click(screen.getByRole('checkbox', { name: /Central Bank Green Initiative Financing/ }));
    fireEvent.change(screen.getByLabelText('Estimated project budget (IQD)'), {
      target: { value: '12000000' },
    });

    expect(screen.getByText(/Estimated monthly installment: 200,000 IQD/)).toBeInTheDocument();
    expect(screen.getByText(/not a loan offer or confirmation of Central Bank terms/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Illustrative annual rate'), {
      target: { value: '5' },
    });
    expect(screen.getByLabelText('Illustrative annual rate')).toHaveClass('platform-select');
    expect(screen.getByLabelText('Illustrative annual rate')).toHaveValue('5');
    expect(screen.getByText(/Estimated monthly installment:/)).not.toHaveTextContent('200,000 IQD');
    expect(calculateGreenMonthlyPayment(12_000_000, 5)).toBeGreaterThan(200_000);
  });

  it('uses the zero-interest principal divided across 60 monthly payments', () => {
    expect(calculateGreenMonthlyPayment(12_000_000, 0)).toBe(200_000);
  });
});
