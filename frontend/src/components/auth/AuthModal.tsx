import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  IRAQI_MOBILE_PATTERN,
  isValidIraqiMobile,
  isValidSupportPhone,
  SUPPORT_PHONE_PATTERN,
} from '../../lib/supportPhone';
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
    authModalRole,
    closeAuthModal,
    login,
    registerClient,
    registerCompany,
    logout,
    user,
  } = useAuth();
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [registrationRole, setRegistrationRole] = useState<'client' | 'company'>(authModalRole);
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldsUnlocked, setLoginFieldsUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | ''>('');

  const text = {
    login: t('auth.login'),
    register: t('auth.register'),
    client: t('auth.client'),
    company: t('auth.company'),
    email: t('auth.email'),
    password: t('auth.password'),
    name: t('auth.fullName'),
    companyName: t('auth.companyName'),
    phone: t('auth.phone'),
    founded: t('auth.founded'),
    address: t('auth.address'),
    license: t('auth.license'),
    tax: t('auth.tax'),
    projects: t('auth.projects'),
    submit: t('auth.submit'),
    close: t('auth.close'),
    show: t('auth.showPassword'),
    hide: t('auth.hidePassword'),
    pending: t('auth.pendingCompany'),
    signedIn: t('auth.signedIn'),
    signOut: t('auth.signOut'),
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
      setRegistrationRole('client');
      setLoginFieldsUnlocked(false);
      return;
    }
    setMode(authModalMode);
    setRegistrationRole(authModalRole);
    setLoginFieldsUnlocked(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authModalOpen, authModalMode, authModalRole, closeAuthModal]);

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
    const companyName = String(fields.get('company_name') ?? '').trim();
    const phone = String(fields.get('phone') ?? '').trim();
    const supportPhone = String(fields.get('support_phone') ?? '').trim();
    const foundedYear = String(fields.get('founded_year') ?? '').trim();
    const projectsCount = String(fields.get('projects_count') ?? '').trim();

    if (!email || !password ||
      (mode === 'register' && registrationRole === 'client' && !fullName) ||
      (mode === 'register' && registrationRole === 'company' && !companyName)) {
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
    if (mode === 'register' && registrationRole === 'client' && fullName.length < 2) {
      setError('auth.nameShort');
      return;
    }
    if (mode === 'register' && registrationRole === 'company' && companyName.length < 2) {
      setError('auth.nameShort');
      return;
    }
    if (mode === 'register' && registrationRole === 'company' && (!phone || !supportPhone)) {
      setError('auth.requiredFields');
      return;
    }
    if (mode === 'register' && registrationRole === 'company' && !isValidIraqiMobile(phone)) {
      setError('auth.phoneInvalid');
      return;
    }
    if (mode === 'register' && registrationRole === 'client' && phone && !/^07\d{9}$/.test(phone)) {
      setError('auth.phoneInvalid');
      return;
    }
    if (mode === 'register' && registrationRole === 'company' && !isValidSupportPhone(supportPhone)) {
      setError('auth.phoneInvalid');
      return;
    }
    if (mode === 'register' && registrationRole === 'company' && foundedYear) {
      const year = Number(foundedYear);
      if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
        setError('auth.foundedInvalid');
        return;
      }
    }
    if (mode === 'register' && registrationRole === 'company' && projectsCount) {
      const count = Number(projectsCount);
      if (!Number.isInteger(count) || count < 0 || count > 100000) {
        setError('auth.projectsInvalid');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (registrationRole === 'client') {
        await registerClient({
          full_name: fullName,
          email,
          phone: phone || undefined,
          password,
        });
      } else {
        await registerCompany({
          name: companyName,
          email,
          phone: phone || undefined,
          support_phone: supportPhone || undefined,
          password,
          founded_year: foundedYear ? Number(foundedYear) : undefined,
          address: String(fields.get('address') || '') || undefined,
          business_license_number: String(fields.get('license') || '') || undefined,
          tax_registration_number: String(fields.get('tax_number') || '') || undefined,
          projects_count: projectsCount ? Number(projectsCount) : 0,
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
            {user && <p className="mt-1 text-body-sm text-content-secondary">{user.full_name} · {user.role}</p>}
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
            {mode === 'register' && (
              <div className="mt-5 flex gap-2" role="group" aria-label={t('auth.accountType')}>
                {(['client', 'company'] as const).map((role) => (
                  <button key={role} type="button" onClick={() => { setRegistrationRole(role); setShowPassword(false); setError(''); }} aria-pressed={registrationRole === role} className={`rounded-md border px-4 py-2 text-label ${registrationRole === role ? 'border-line-brand bg-[var(--brand-subtle)] text-content-brand' : 'border-line text-content-secondary'}`}>
                    {role === 'client' ? text.client : text.company}
                  </button>
                ))}
              </div>
            )}
            {error && <p role="alert" className="mt-4 rounded-md border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-3 py-2 text-body-sm text-[var(--status-danger)]">{t(error)}</p>}
            <form
              key={`${mode}-${registrationRole}`}
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={submit}
              onChange={() => setError('')}
              noValidate
              autoComplete="off"
            >
              {mode === 'register' && registrationRole === 'client' && <Input label={text.name} name="full_name" autoComplete="name" required minLength={2} />}
              {mode === 'register' && registrationRole === 'company' && <>
                <Input label={text.companyName} name="company_name" autoComplete="off" required minLength={2} />
                <Input label={text.founded} name="founded_year" type="number" autoComplete="off" min="1900" max={new Date().getFullYear()} optional optionalLabel={ar ? 'اختياري' : 'Optional'} />
                <Input label={ar ? 'رقم الموبايل العراقي' : 'Iraqi Mobile Phone'} name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern={IRAQI_MOBILE_PATTERN} maxLength={11} placeholder="077 / 078 / 075 XXXXXXXX" required />
                <Input label={ar ? 'رقم الدعم السريع للشركة' : 'Company Support Hotline'} name="support_phone" type="tel" inputMode="tel" autoComplete="off" pattern={SUPPORT_PHONE_PATTERN} maxLength={11} placeholder="07XXXXXXXXX or 6060" required />
                <Input label={text.address} name="address" autoComplete="off" optional optionalLabel={ar ? 'اختياري' : 'Optional'} />
                <Input label={text.license} name="license" autoComplete="off" optional optionalLabel={ar ? 'اختياري' : 'Optional'} />
                <Input label={text.tax} name="tax_number" autoComplete="off" optional optionalLabel={ar ? 'اختياري' : 'Optional'} />
                <Input label={text.projects} name="projects_count" type="number" autoComplete="off" min="0" optional optionalLabel={ar ? 'اختياري' : 'Optional'} />
              </>}
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
              {mode === 'register' && registrationRole === 'client' && <Input label={text.phone} name="phone" type="tel" inputMode="numeric" autoComplete="off" pattern="07[0-9]{9}" maxLength={11} optional optionalLabel={ar ? 'اختياري' : 'Optional'} />}
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
          </>
        )}
      </section>
    </div>
  );
}
