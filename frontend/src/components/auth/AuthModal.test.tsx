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
  const { openAuthModal, openCompanyRegistrationModal } = useAuth();
  const { setLang } = useLanguage();
  return (
    <>
      <button onClick={openAuthModal}>Open authentication</button>
      <button onClick={openCompanyRegistrationModal}>Register company from footer</button>
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
  it('opens directly on company registration when requested from company onboarding links', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Register company from footer' }));

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Company' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
    expect(screen.getByLabelText('Iraqi Mobile Phone')).toBeRequired();
    expect(screen.getByLabelText('Company Support Hotline')).toBeRequired();
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

  it('clears form values when changing between login and registration roles', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    expect(screen.getAllByRole('button', { name: 'Create account' })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'saved@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'old-password' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    expect((screen.getByLabelText('Email address') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Company' }));
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Previously typed company' } });
    fireEvent.click(screen.getByRole('button', { name: 'Client' }));

    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Company name')).not.toBeInTheDocument();
    expect((screen.getByLabelText('Email address') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
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

  it('switches to company registration and submits a company account', async () => {
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
    vi.mocked(api.authRegisterCompany).mockResolvedValue(response);
    vi.mocked(api.authMe).mockResolvedValue(response.user);
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Company' }));
    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Solar Company' } });
    const primaryPhone = screen.getByLabelText('Iraqi Mobile Phone');
    expect(primaryPhone).toHaveAttribute('placeholder', '077 / 078 / 075 XXXXXXXX');
    expect(primaryPhone).toBeRequired();
    const supportPhone = screen.getByLabelText('Company Support Hotline');
    expect(supportPhone).toHaveAttribute('placeholder', '07XXXXXXXXX or 6060');
    expect(supportPhone).toBeRequired();
    fireEvent.change(primaryPhone, { target: { value: '07712345678' } });
    fireEvent.change(supportPhone, { target: { value: '6060' } });
    expect(supportPhone).toBeValid();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'solar@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-company-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(api.authRegisterCompany).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Solar Company',
      email: 'solar@example.com',
      password: 'a-long-company-password',
      phone: '07712345678',
      support_phone: '6060',
    })));
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('company-jwt');
    fireEvent.click(screen.getByRole('button', { name: 'Open authentication' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Signed in' })).toBeInTheDocument());
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
