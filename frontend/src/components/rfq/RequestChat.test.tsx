import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, type ChatMessage } from '../../api/client';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { RequestChat } from './RequestChat';

vi.mock('../../api/client', () => ({
  api: {
    chatMessages: vi.fn(),
    sendChatMessage: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});

const delivered: ChatMessage = {
  id: 1,
  sender_role: 'company',
  sender_name: 'Sun Company',
  content: 'We can install an 8 kWp system.',
  violation_type: null,
  created_at: '2026-10-07T06:00:00Z',
};

describe('RequestChat', () => {
  it('loads normal messages, sends a filtered contact attempt, and warns the sender', async () => {
    vi.mocked(api.chatMessages).mockResolvedValue([delivered]);
    vi.mocked(api.sendChatMessage).mockResolvedValue({
      ...delivered,
      id: 2,
      sender_role: 'client',
      sender_name: 'Ahmed',
      content: '[تم حجب معلومات التواصل المباشر لحماية الاتفاقية]',
      violation_type: 'Attempted phone number sharing in chat',
    });

    render(
      <LanguageProvider>
        <RequestChat
          groupId="UTU-CHAT-TEST"
          companyId={4}
          companyName="Sun Company"
          requestSummary="8.4 kWp · 10 kWh"
          accessToken="a-valid-test-access-token-that-is-long-enough"
        />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation' }));
    expect(await screen.findByText('We can install an 8 kWp system.')).toBeInTheDocument();
    expect(api.chatMessages).toHaveBeenCalledWith(
      'UTU-CHAT-TEST',
      4,
      'a-valid-test-access-token-that-is-long-enough',
      undefined,
    );

    fireEvent.change(screen.getByLabelText('Write a message...'), {
      target: { value: 'Please call 07712345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith(
      'UTU-CHAT-TEST',
      4,
      'Please call 07712345678',
      'a-valid-test-access-token-that-is-long-enough',
      undefined,
    ));
    expect(await screen.findByText(
      'Direct contact information was blocked to protect the agreement. Please continue negotiating here until the quote is accepted and the deposit is paid.',
    )).toBeInTheDocument();
    expect(screen.getByText('[تم حجب معلومات التواصل المباشر لحماية الاتفاقية]')).toBeInTheDocument();
    expect(screen.getByText(/Company: Sun Company/)).toBeInTheDocument();
  });

  it('uses the company session credential when the installer opens the request chat', async () => {
    vi.mocked(api.chatMessages).mockResolvedValue([]);
    render(
      <LanguageProvider>
        <RequestChat
          groupId="UTU-CHAT-COMPANY"
          companyId={4}
          companyName="Sun Company"
          requestSummary="8.4 kWp · 10 kWh"
          companyToken="company-session-token"
        />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation' }));
    expect(await screen.findByText('Start the conversation with a safe in-platform message.')).toBeInTheDocument();
    expect(api.chatMessages).toHaveBeenCalledWith(
      'UTU-CHAT-COMPANY',
      4,
      undefined,
      'company-session-token',
    );
  });

  it('opens and loads the matching conversation from its notification URL', async () => {
    vi.mocked(api.chatMessages).mockResolvedValue([delivered]);
    window.history.replaceState(
      null,
      '',
      '/#/requests?requestId=request-42&companyId=7&chat=1',
    );

    render(
      <LanguageProvider>
        <RequestChat
          groupId="request-42"
          companyId={7}
          companyName="Solar Company"
          requestSummary="8 kWp"
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: 'Close conversation' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(await screen.findByText('We can install an 8 kWp system.')).toBeInTheDocument();
    expect(api.chatMessages).toHaveBeenCalledWith('request-42', 7, undefined, undefined);
  });
});
