import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { NotificationsProvider } from '../../state/NotificationsContext';
import { Header } from './Header';

const { authState } = vi.hoisted(() => ({
  authState: {
    user: null as null | {
      id: number;
      email: string;
      full_name: string;
      role: 'client' | 'company' | 'admin';
      phone: string | null;
      is_active: boolean;
      is_verified: boolean;
      company_id: number | null;
      created_at: string;
    },
    token: null as string | null,
    isLoading: false,
    openAuthModal: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../state/AuthContext', () => ({
  useAuth: () => authState,
}));

afterEach(cleanup);
beforeEach(() => {
  authState.user = null;
  authState.openAuthModal.mockReset();
  authState.logout.mockReset();
});

function renderHeader() {
  return render(
    <LanguageProvider>
      <NotificationsProvider>
        <Header />
      </NotificationsProvider>
    </LanguageProvider>,
  );
}

describe('Header account navigation', () => {
  it('keeps sign-in available to guests', () => {
    renderHeader();
    expect(screen.queryByRole('link', { name: /FAQ & Support/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(authState.openAuthModal).toHaveBeenCalledOnce();
  });

  it('shows account identity, role-specific navigation, and sign-out after login', () => {
    authState.user = {
      id: 8,
      email: 'company@example.com',
      full_name: 'Blue Company',
      role: 'company',
      phone: null,
      is_active: true,
      is_verified: false,
      company_id: 8,
      created_at: '2026-01-01T00:00:00Z',
    };
    renderHeader();

    const trigger = screen.getByRole('button', { name: 'Account: Blue Company' });
    expect(trigger).toHaveTextContent('Blue Company');
    fireEvent.click(trigger);

    const accountMenu = within(screen.getByRole('region', { name: 'Account menu' }));
    expect(screen.getByRole('region', { name: 'Account menu' })).toHaveClass('w-[min(20rem,calc(100vw-2.5rem))]');
    expect(accountMenu.getByText('company@example.com')).toBeInTheDocument();
    expect(accountMenu.getByText('Company account')).toBeInTheDocument();
    expect(accountMenu.getByRole('link', { name: 'Company requests' })).toHaveAttribute('href', '#/company');
    fireEvent.click(accountMenu.getByRole('button', { name: 'Sign out' }));
    expect(authState.logout).toHaveBeenCalledOnce();
  });

  it('links client accounts to their requests instead of the company workspace', () => {
    authState.user = {
      id: 12,
      email: 'client@example.com',
      full_name: 'Solar Client',
      role: 'client',
      phone: null,
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    renderHeader();

    expect(screen.getByRole('button', { name: 'Post Project' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Get Started' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Account: Solar Client' }));
    const accountMenu = within(screen.getByRole('region', { name: 'Account menu' }));
    expect(accountMenu.getByRole('link', { name: 'My Requests' })).toHaveAttribute('href', '#/requests');
    expect(accountMenu.queryByRole('link', { name: 'Company requests' })).not.toBeInTheDocument();
  });

  it('opens a spacious notification menu for signed-in clients', () => {
    authState.user = {
      id: 12,
      email: 'client@example.com',
      full_name: 'Solar Client',
      role: 'client',
      phone: null,
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    const notificationsMenu = screen.getByRole('region', { name: 'Notifications' });
    expect(notificationsMenu).toHaveClass('w-[min(24rem,calc(100vw-2.5rem))]');
    expect(notificationsMenu).toHaveClass('shadow-xl');
    expect(within(notificationsMenu).getByText('No notifications yet.')).toBeInTheDocument();
  });

  it('routes administrators to a dedicated admin dashboard', () => {
    authState.user = {
      id: 1,
      email: 'admin@example.com',
      full_name: 'Platform Admin',
      role: 'admin',
      phone: null,
      is_active: true,
      is_verified: true,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Account: Platform Admin' }));
    expect(within(screen.getByRole('region', { name: 'Account menu' }))
      .getByRole('link', { name: 'Admin dashboard' })).toHaveAttribute('href', '#/admin');
  });
});
