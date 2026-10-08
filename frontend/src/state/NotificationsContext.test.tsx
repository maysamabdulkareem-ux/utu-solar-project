import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { Header } from '../components/layout/Header';
import { NotificationsProvider } from './NotificationsContext';

const { apiMocks, authState } = vi.hoisted(() => ({
  apiMocks: {
    myQuoteRequests: vi.fn(),
    chatMessages: vi.fn(),
  },
  authState: {
    user: {
      id: 42,
      email: 'client@example.com',
      full_name: 'Solar Client',
      role: 'client' as const,
      phone: null,
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    },
    token: 'test-token',
    isLoading: false,
    openAuthModal: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({ api: apiMocks }));
vi.mock('./AuthContext', () => ({ useAuth: () => authState }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('in-app notifications', () => {
  it('updates the bell for a new chat message and routes to that conversation', async () => {
    localStorage.clear();
    let quote: { total_iqd: number; created_at: string } | null = null;
    let payment: { payment_status: 'paid'; transaction_id: string; created_at: string } | null = null;
    let messages: Array<{
      id: number;
      sender_role: 'client' | 'company';
      sender_name: string;
      content: string;
      created_at: string;
    }> = [];
    apiMocks.myQuoteRequests.mockImplementation(async () => [{
      group_id: 'request-42',
      companies: [{
        company_id: 7,
        company_name: 'Solar Company',
        company_verification_status: 'identity_verified',
        quote,
        completed_projects: [],
        payment,
      }],
    }]);
    apiMocks.chatMessages.mockImplementation(async () => messages);

    const intervalCallbacks: (() => void)[] = [];
    vi.spyOn(window, 'setInterval').mockImplementation((handler, delay) => {
      if (typeof handler === 'function' && delay === 8000) {
        intervalCallbacks.push(() => { void (handler as () => void)(); });
      }
      return 1;
    });

    render(
      <LanguageProvider>
        <NotificationsProvider>
          <Header />
        </NotificationsProvider>
      </LanguageProvider>,
    );

    await waitFor(() => expect(apiMocks.myQuoteRequests).toHaveBeenCalled());
    await waitFor(() => expect(apiMocks.chatMessages).toHaveBeenCalledOnce());
    await waitFor(() => expect(
      localStorage.getItem('utu-notification-snapshot-v1:client:42'),
    ).toContain('"chat:request-42:7":"0"'));
    messages = [{
      id: 1,
      sender_role: 'company',
      sender_name: 'Solar Company',
      content: 'Your quotation is ready.',
      created_at: '2026-06-01T09:00:00Z',
    }];
    expect(intervalCallbacks).toHaveLength(1);
    await act(async () => intervalCallbacks[0]());
    await waitFor(() => expect(apiMocks.myQuoteRequests).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(
      localStorage.getItem('utu-notification-snapshot-v1:client:42'),
    ).toContain('"chat:request-42:7":"1"'));
    await waitFor(() => expect(
      localStorage.getItem('utu-notifications-v1:client:42'),
    ).toContain('New chat message'));

    expect(await screen.findByLabelText('1 Unread')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('New chat message')).toBeInTheDocument();
    const notificationLink = screen.getByRole('link', { name: /New chat message/ });
    expect(notificationLink).toHaveAttribute(
      'href',
      '#/requests?requestId=request-42&companyId=7&chat=1',
    );
    fireEvent.click(notificationLink);
    expect(screen.queryByLabelText('1 Unread')).not.toBeInTheDocument();

    quote = { total_iqd: 1_250_000, created_at: '2026-06-01T10:00:00Z' };
    await act(async () => intervalCallbacks[0]());
    await waitFor(() => expect(apiMocks.myQuoteRequests).toHaveBeenCalledTimes(3));
    expect(await screen.findByLabelText('1 Unread')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    const quoteNotification = screen.getByRole('link', { name: /New quote received/ });
    expect(quoteNotification).toHaveAttribute(
      'href',
      '#/requests?requestId=request-42&companyId=7',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(screen.queryByLabelText('1 Unread')).not.toBeInTheDocument();

    payment = {
      payment_status: 'paid',
      transaction_id: 'UTU-NOTIFY-42',
      created_at: '2026-06-01T11:00:00Z',
    };
    await act(async () => intervalCallbacks[0]());
    await waitFor(() => expect(apiMocks.myQuoteRequests).toHaveBeenCalledTimes(4));
    expect(await screen.findByLabelText('1 Unread')).toBeInTheDocument();
    const paymentNotification = screen.getByRole('link', { name: /Deposit payment confirmed/ });
    expect(paymentNotification).toHaveAttribute(
      'href',
      '#/requests?requestId=request-42&companyId=7&payment=1',
    );
  });
});
