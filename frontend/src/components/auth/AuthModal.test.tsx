import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../../api/client';
import { LanguageProvider, useLanguage } from '../../i18n/LanguageProvider';
import { AuthProvider, AUTH_TOKEN_KEY, useAuth } from '../../state/AuthContext';
import { AuthModal } from './AuthModal';

vi.mock('../../api/client', () => ({
  api: {
    authMe: vi.fn(),
    authLogin: vi.fn(),
    authRegisterClient: vi.fn(),
    authRegisterCompany: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});
beforeEach(() => localStorage.clear());

function ModalHarness() {
  const { openAuthModal } = useAuth();
  const { setLang } = useLanguage();
  return (
    <>
      <button onClick={openAuthModal}>Open authentication</button>
      <button onClick={() => setLang('ar')}>العربية</button>
      <AuthModal />
    </>
  );
}

function renderModal() {
  return render(
    <LanguageProvider>
      <AuthProvider><ModalHarness /></AuthProvider>
    </LanguageProvider>,
  );
}

describe('AuthModal', () => {
  it('registers clients only and points companies to the company portal', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Company' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register or sign in on the company portal' })).toHaveAttribute('href', '#/company');
  });

  it('starts with blank fields and keeps passwords hidden unless explicitly shown', () => {
    renderModal();
    const previousOverflow = document.body.style.overflow;
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    const overlay = screen.getByRole('dialog').parentElement;
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-[70]', 'flex', 'items-center', 'justify-center');
    expect(document.body.style.overflow).toBe('hidden');

    const email = screen.getByLabelText('Email address') as HTMLInputElement;
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(email.value).toBe('');
    expect(email.autocomplete).toBe('off');
    expect(email.name).toBe('login_identifier');
    expect(email.readOnly).toBe(true);
    expect(password.value).toBe('');
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('off');
    expect(password.name).toBe('login_secret');
    expect(password.readOnly).toBe(true);

    fireEvent.focus(email);
    fireEvent.focus(password);
    expect(email.readOnly).toBe(false);
    expect(password.readOnly).toBe(false);

    fireEvent.change(password, { target: { value: 'secret-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(document.body.style.overflow).toBe(previousOverflow);
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));

    const reopenedPassword = screen.getByLabelText('Password') as HTMLInputElement;
    expect(reopenedPassword.value).toBe('');
    expect(reopenedPassword.type).toBe('password');
  });

  it('clears form values when changing between login and registration', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    expect(screen.getAllByRole('button', { name: 'Create account' })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'saved@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'old-password' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    expect((screen.getByLabelText('Email address') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('explains when the active backend does not expose auth endpoints', async () => {
    vi.mocked(api.authLogin).mockRejectedValue(new Error('Not Found'));
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'client@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The authentication API was not found. Restart the backend from this project and try again.',
    );
  });

  it('shows localized invalid-credential feedback', async () => {
    vi.mocked(api.authLogin).mockRejectedValue(new Error('Email or password is incorrect'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'client@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('البريد الإلكتروني أو كلمة المرور غير صحيحة.'));
  });

  it('shows a useful error when the backend reports a registration conflict', async () => {
    vi.mocked(api.authRegisterClient).mockRejectedValue(
      new ApiError('An account with this email or phone already exists', 409),
    );
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test Client' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'client@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-client-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account already uses this email or phone. Try signing in or use different details.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(
      'يوجد حساب يستخدم هذا البريد أو رقم الهاتف. جرّب تسجيل الدخول أو استخدم بيانات أخرى.',
    ));
  });

  it('shows translated validation errors for missing required fields', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Complete all required fields.');
    fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('أكمل جميع الحقول المطلوبة.'));
  });

  it('takes a company that signs in from the client pop-up to its portal', async () => {
    const response = {
      access_token: 'company-jwt',
      token_type: 'bearer',
      user: {
        id: 2,
        email: 'solar@example.com',
        phone: null,
        full_name: 'Solar Company',
        role: 'company',
        is_active: true,
        is_verified: false,
        company_id: 8,
        created_at: '2026-01-01T00:00:00Z',
      },
    } as const;
    vi.mocked(api.authLogin).mockResolvedValue(response);
    vi.mocked(api.authMe).mockResolvedValue(response.user);
    window.location.hash = '#/';
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'solar@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-company-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(window.location.hash).toBe('#/company'));
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('company-jwt');
  });

  it('registers clients using the client endpoint and profile fields', async () => {
    const clientUser = {
      id: 3,
      email: 'client@example.com',
      phone: null,
      full_name: 'Test Client',
      role: 'client' as const,
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    vi.mocked(api.authRegisterClient).mockResolvedValue({
      access_token: 'client-jwt',
      token_type: 'bearer',
      user: clientUser,
    });
    vi.mocked(api.authMe).mockResolvedValue(clientUser);
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Test Client' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'client@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-client-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(api.authRegisterClient).toHaveBeenCalledWith({
      full_name: 'Test Client',
      email: 'client@example.com',
      phone: undefined,
      password: 'a-long-client-password',
    }));
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('client-jwt');
  });
});
