import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { QuoteRequestProvider, useQuoteRequest } from './QuoteRequestProvider';

vi.mock('../api/client', () => ({
  api: {
    createQuoteRequest: vi.fn(),
  },
}));

function RequestSubmitHarness() {
  const { draft, update, submit } = useQuoteRequest();
  return (
    <div>
      <button
        type="button"
        onClick={() => update({
          companyIds: ['5'],
          name: 'Test Client',
          phone: '07712345678',
          systemKWp: 8.4,
          batteryKWh: 10,
          panelCount: 12,
          greenInitiative: true,
          greenInitiativeBudgetIqd: '12000000',
          greenInitiativeRate: 0,
        })}
      >
        Prepare request
      </button>
      {draft.greenInitiative && <button type="button" onClick={() => void submit()}>Send request</button>}
    </div>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Green Initiative request submission', () => {
  it('sends the green flag and calculator inputs to the request API', async () => {
    vi.mocked(api.createQuoteRequest).mockResolvedValue({
      group_id: 'UTU-2026-GREEN-TEST',
      status: 'pending',
      created_at: '2026-10-06T00:00:00Z',
      customer_name: 'Test Client',
      customer_phone: '07712345678',
      system_kwp: 8.4,
      battery_kwh: 10,
      panel_count: 12,
      is_green_initiative: true,
      green_initiative_budget_iqd: 12_000_000,
      details: {
        greenInitiativeRate: 0,
      },
      companies: [],
      access_token: 'private-request-access-token',
    });
    render(<QuoteRequestProvider><RequestSubmitHarness /></QuoteRequestProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Prepare request' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Send request' }));

    await waitFor(() => expect(api.createQuoteRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        is_green_initiative: true,
        green_initiative_budget_iqd: 12_000_000,
        details: expect.objectContaining({
          greenInitiativeRate: 0,
        }),
      }),
    ));
  });
});
