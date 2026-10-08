import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../icons/Icon';

export function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    login,
    registerClient,
    logout,
    user,
  } = useAuth();
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldsUnlocked, setLoginFieldsUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | ''>('');

  const text = {
    login: t('auth.login'),
    register: t('auth.register'),
    email: t('auth.email'),
    password: t('auth.password'),
    name: t('auth.fullName'),
    phone: t('auth.phone'),
    submit: t('auth.submit'),
    close: t('auth.close'),
    show: t('auth.showPassword'),
    hide: t('auth.hidePassword'),
    signedIn: t('auth.signedIn'),
    signOut: t('auth.signOut'),
    companyDoor: ar ? 'عندك شركة طاقة شمسية؟' : 'Run a solar company?',
    companyDoorLink: ar ? 'سجّل أو ادخل من بوابة الشركات' : 'Register or sign in on the company portal',
  };
  const roleLabel = {
    client: t('auth.roleClient'),
    company: t('auth.roleCompany'),
    admin: t('auth.roleAdmin'),
  };

  const localizedError = (cause: unknown): TranslationKey => {
    const message = cause instanceof Error ? cause.message : '';
    if (cause instanceof ApiError) {
      if (cause.status === 0) {
        return message.includes('timed out') ? 'auth.requestTimedOut' : 'auth.serverUnreachable';
      }
      if (cause.status === 401) return 'auth.invalidCredentials';
      if (cause.status === 409) return 'auth.accountConflict';
      if (cause.status === 422) return 'auth.invalidInput';
    }
    if (message === 'Not Found' || message.startsWith('404 ')) return 'auth.backendNotUpdated';
    if (message.includes('Email or password is incorrect')) return 'auth.invalidCredentials';
    if (message.includes('phone number already exists')) return 'auth.phoneExists';
    if (message.includes('email already exists') || message.includes('already listed')) return 'auth.emailExists';
    if (message.includes('valid email address')) return 'auth.invalidEmail';
    return 'auth.genericError';
  };

  useEffect(() => {
    setShowPassword(false);
    setError('');
    if (!authModalOpen) {
      setMode('login');
      setLoginFieldsUnlocked(false);
      return;
    }
    setMode(authModalMode);
    setLoginFieldsUnlocked(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authModalOpen, authModalMode, closeAuthModal]);

  useEffect(() => {
    if (!authModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get(mode === 'login' ? 'login_identifier' : 'email') ?? '').trim();
    const password = String(fields.get(mode === 'login' ? 'login_secret' : 'password') ?? '');
    const fullName = String(fields.get('full_name') ?? '').trim();
    const phone = String(fields.get('phone') ?? '').trim();

    if (!email || !password || (mode === 'register' && !fullName)) {
      setError('auth.requiredFields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('auth.invalidEmail');
      return;
    }
    if (mode === 'register' && password.length < 10) {
      setError('auth.passwordShort');
      return;
    }
    if (mode === 'register' && fullName.length < 2) {
      setError('auth.nameShort');
      return;
    }
    if (mode === 'register' && phone && !/^07\d{9}$/.test(phone)) {
      setError('auth.phoneInvalid');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const signedIn = await login(email, password);
        // A company that signs in here is taken to its own portal.
        if (signedIn.role === 'company') window.location.hash = '#/company';
      } else {
        await registerClient({
          full_name: fullName,
          email,
          phone: phone || undefined,
          password,
        });
      }
      closeAuthModal();
      setMode('login');
    } catch (cause) {
      setError(localizedError(cause));
    } finally {
      setBusy(false);
    }
  };

  const passwordAdornment = (
    <button
      type="button"
      aria-label={showPassword ? text.hide : text.show}
      title={showPassword ? text.hide : text.show}
      aria-pressed={showPassword}
      onClick={() => setShowPassword((current) => !current)}
      className="grid h-9 w-9 place-items-center rounded text-content-tertiary hover:bg-bg-subtle hover:text-content-primary"
    >
      <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/55 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeAuthModal(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-line-subtle bg-bg-page p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-title" className="text-h3 text-content-primary">{user ? text.signedIn : mode === 'login' ? text.login : text.register}</h2>
            {user && <p className="mt-1 text-body-sm text-content-secondary">{user.full_name} · {roleLabel[user.role]}</p>}
          </div>
          <button type="button" aria-label={text.close} onClick={closeAuthModal} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-bg-subtle"><Icon name="x-mark" /></button>
        </div>

        {user ? (
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => { logout(); closeAuthModal(); }}>{text.signOut}</Button>
            {(user.role === 'company' || user.role === 'admin') && (
              <a href={user.role === 'admin' ? '#/admin' : '#/company'} onClick={closeAuthModal} className="inline-flex items-center rounded-md px-4 py-2 text-label text-content-brand underline">
                {user.role === 'admin' ? t('auth.adminDashboard') : t('auth.companyRequests')}
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 flex gap-3 border-b border-line-subtle">
              {(['login', 'register'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => { setMode(tab); setShowPassword(false); setError(''); }} className={`border-b-2 px-3 py-3 text-label ${mode === tab ? 'border-line-brand text-content-primary' : 'border-transparent text-content-secondary'}`}>
                  {tab === 'login' ? text.login : text.register}
                </button>
              ))}
            </div>
            {error && <p role="alert" className="mt-4 rounded-md border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-3 py-2 text-body-sm text-[var(--status-danger)]">{t(error)}</p>}
            <form
              key={mode}
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={submit}
              onChange={() => setError('')}
              noValidate
              autoComplete="off"
            >
              {mode === 'register' && <Input label={text.name} name="full_name" autoComplete="name" required minLength={2} />}
              <Input
                label={text.email}
                name={mode === 'login' ? 'login_identifier' : 'email'}
                type={mode === 'login' ? 'text' : 'email'}
                inputMode={mode === 'login' ? 'email' : undefined}
                autoComplete="off"
                readOnly={mode === 'login' && !loginFieldsUnlocked}
                onFocus={mode === 'login' ? () => setLoginFieldsUnlocked(true) : undefined}
                required
              />
              {mode === 'register' && <Input label={text.phone} name="phone" type="tel" inputMode="numeric" autoComplete="off" pattern="07[0-9]{9}" maxLength={11} optional optionalLabel={ar ? 'اختياري' : 'Optional'} />}
              <Input
                label={text.password}
                name={mode === 'login' ? 'login_secret' : 'password'}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'off' : 'new-password'}
                readOnly={mode === 'login' && !loginFieldsUnlocked}
                onFocus={mode === 'login' ? () => setLoginFieldsUnlocked(true) : undefined}
                required
                minLength={mode === 'login' ? 1 : 10}
                endAdornment={passwordAdornment}
              />
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" loading={busy}>{text.submit}</Button>
              </div>
            </form>
            <p className="mt-6 border-t border-line-subtle pt-4 text-body-sm text-content-secondary">
              {text.companyDoor}{' '}
              <a href="#/company" onClick={closeAuthModal} className="text-content-brand underline">{text.companyDoorLink}</a>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
