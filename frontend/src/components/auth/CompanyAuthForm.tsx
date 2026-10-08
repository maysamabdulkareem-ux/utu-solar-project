import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  IRAQI_MOBILE_PATTERN,
  isValidIraqiMobile,
  isValidSupportPhone,
  SUPPORT_PHONE_PATTERN,
} from '../../lib/supportPhone';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useAuth, WrongAccountTypeError } from '../../state/AuthContext';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { Input } from '../ui/Input';

type CompanyAuthMode = 'login' | 'register';

/** `#/company?register` opens the portal on the registration tab. */
export function companyAuthModeFromHash(hash = window.location.hash): CompanyAuthMode {
  const query = hash.split('?')[1] ?? '';
  return new URLSearchParams(query).has('register') ? 'register' : 'login';
}

/**
 * The company sign-in screen, shown on the company portal page.
 *
 * It is a separate door from the client pop-up, but both use the same account
 * system: the account type saved at registration decides what each person can
 * do. Client accounts are turned away here without starting a session.
 */
export function CompanyAuthForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const { login, registerCompany, openAuthModal, openClientRegistration } = useAuth();
  const [mode, setMode] = useState<CompanyAuthMode>(() => companyAuthModeFromHash());
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const follow = () => {
      setMode(companyAuthModeFromHash());
      setError('');
    };
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  const text = {
    login: ar ? 'تسجيل الدخول' : 'Sign in',
    register: ar ? 'تسجيل شركة جديدة' : 'Register your company',
    submit: ar ? 'متابعة' : 'Continue',
    companyName: ar ? 'اسم الشركة' : 'Company name',
    founded: ar ? 'سنة التأسيس' : 'Founded year',
    phone: ar ? 'رقم الموبايل العراقي' : 'Iraqi Mobile Phone',
    supportPhone: ar ? 'رقم الدعم السريع للشركة' : 'Company Support Hotline',
    address: ar ? 'المحافظة والعنوان' : 'Governorate and address',
    license: ar ? 'رقم رخصة النشاط' : 'Business license number',
    tax: ar ? 'رقم التسجيل الضريبي' : 'Tax registration number',
    projects: ar ? 'عدد المشاريع المنجزة' : 'Completed projects',
    email: ar ? 'البريد الإلكتروني' : 'Email address',
    password: ar ? 'كلمة المرور (10 أحرف على الأقل)' : 'Password (at least 10 characters)',
    optional: ar ? 'اختياري' : 'Optional',
    show: ar ? 'إظهار كلمة المرور' : 'Show password',
    hide: ar ? 'إخفاء كلمة المرور' : 'Hide password',
    forgot: ar ? 'نسيت كلمة المرور؟' : 'Forgot password?',
    verificationNote: ar
      ? 'كل شركة جديدة تبدأ "قيد التحقق". بعد التسجيل أكمل بيانات التوثيق حتى تستلم طلبات الزبائن.'
      : 'Every new company starts as pending. After registering, complete your verification details to receive customer requests.',
    clientDoor: ar ? 'تبحث عن منظومة لبيتك؟' : 'Looking for a system for your home?',
    clientDoorLink: ar ? 'سجّل أو ادخل كزبون' : 'Register or sign in as a client',
    clientAccount: ar
      ? 'هذا حساب زبون. بوابة الشركات لحسابات الشركات فقط، سجّل دخولك من صفحة الزبائن.'
      : 'This is a client account. The company portal is for company accounts only; sign in from the client page.',
    requiredFields: ar ? 'أكمل جميع الحقول المطلوبة.' : 'Complete all required fields.',
    invalidEmail: ar ? 'أدخل بريداً إلكترونياً صحيحاً.' : 'Enter a valid email address.',
    passwordShort: ar ? 'كلمة المرور لازم تكون 10 أحرف على الأقل.' : 'Password must be at least 10 characters.',
    nameShort: ar ? 'اسم الشركة قصير جداً.' : 'The company name is too short.',
    phoneInvalid: ar ? 'رقم الهاتف غير صحيح.' : 'The phone number is not valid.',
    foundedInvalid: ar ? 'سنة التأسيس غير صحيحة.' : 'The founded year is not valid.',
    projectsInvalid: ar ? 'عدد المشاريع غير صحيح.' : 'The number of projects is not valid.',
    invalidCredentials: ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Email or password is incorrect.',
    accountConflict: ar
      ? 'يوجد حساب يستخدم هذا البريد أو رقم الهاتف. جرّب تسجيل الدخول أو استخدم بيانات أخرى.'
      : 'An account already uses this email or phone. Try signing in or use different details.',
    serverUnreachable: ar ? 'تعذر الاتصال بالخادم. تأكد إنه شغّال وحاول مرة ثانية.' : 'Could not reach the server. Make sure it is running and try again.',
    genericError: ar ? 'صار خطأ. حاول مرة ثانية.' : 'Something went wrong. Please try again.',
  };

  const describeError = (cause: unknown): string => {
    if (cause instanceof WrongAccountTypeError) return text.clientAccount;
    const message = cause instanceof Error ? cause.message : '';
    if (cause instanceof ApiError) {
      if (cause.status === 0) return text.serverUnreachable;
      if (cause.status === 401) return text.invalidCredentials;
      if (cause.status === 409) return text.accountConflict;
    }
    if (message.includes('Email or password is incorrect')) return text.invalidCredentials;
    if (message.includes('already exists') || message.includes('already listed')) return text.accountConflict;
    return text.genericError;
  };

  const switchMode = (next: CompanyAuthMode) => {
    setMode(next);
    setShowPassword(false);
    setError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const fields = new FormData(event.currentTarget);
    const value = (name: string) => String(fields.get(name) ?? '').trim();
    const email = value('email');
    const password = String(fields.get('password') ?? '');
    const companyName = value('company_name');
    const phone = value('phone');
    const supportPhone = value('support_phone');
    const foundedYear = value('founded_year');
    const projectsCount = value('projects_count');

    if (!email || !password || (mode === 'register' && (!companyName || !phone || !supportPhone))) {
      setError(text.requiredFields);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(text.invalidEmail);
      return;
    }
    if (mode === 'register') {
      if (password.length < 10) return setError(text.passwordShort);
      if (companyName.length < 2) return setError(text.nameShort);
      if (!isValidIraqiMobile(phone) || !isValidSupportPhone(supportPhone)) return setError(text.phoneInvalid);
      if (foundedYear) {
        const year = Number(foundedYear);
        if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) return setError(text.foundedInvalid);
      }
      if (projectsCount) {
        const count = Number(projectsCount);
        if (!Number.isInteger(count) || count < 0 || count > 100000) return setError(text.projectsInvalid);
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        // Administrators also manage companies from this page.
        await login(email, password, { allowedRoles: ['company', 'admin'] });
      } else {
        await registerCompany({
          name: companyName,
          email,
          phone,
          support_phone: supportPhone,
          password,
          founded_year: foundedYear ? Number(foundedYear) : undefined,
          address: value('address') || undefined,
          business_license_number: value('license') || undefined,
          tax_registration_number: value('tax_number') || undefined,
          projects_count: projectsCount ? Number(projectsCount) : 0,
        });
      }
    } catch (cause) {
      setError(describeError(cause));
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
    <div>
      <div className="flex gap-3 border-b border-line-subtle" role="tablist">
        {(['login', 'register'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => switchMode(tab)}
            className={`border-b-2 px-3 py-3 text-label ${mode === tab ? 'border-line-brand text-content-primary' : 'border-transparent text-content-secondary'}`}
          >
            {tab === 'login' ? text.login : text.register}
          </button>
        ))}
      </div>

      {mode === 'register' && (
        <p className="mt-5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">{text.verificationNote}</p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-md border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-3 py-2 text-body-sm text-[var(--status-danger)]">{error}</p>
      )}

      <form key={mode} className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit} onChange={() => setError('')} noValidate>
        {mode === 'register' && <>
          <Input label={text.companyName} name="company_name" autoComplete="organization" required minLength={2} />
          <Input label={text.founded} name="founded_year" type="number" autoComplete="off" min="1900" max={new Date().getFullYear()} optional optionalLabel={text.optional} />
          <Input label={text.phone} name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern={IRAQI_MOBILE_PATTERN} maxLength={11} placeholder="077 / 078 / 075 XXXXXXXX" required />
          <Input label={text.supportPhone} name="support_phone" type="tel" inputMode="tel" autoComplete="off" pattern={SUPPORT_PHONE_PATTERN} maxLength={11} placeholder="07XXXXXXXXX or 6060" required />
          <Input label={text.address} name="address" autoComplete="off" optional optionalLabel={text.optional} />
          <Input label={text.license} name="license" autoComplete="off" optional optionalLabel={text.optional} />
          <Input label={text.tax} name="tax_number" autoComplete="off" optional optionalLabel={text.optional} />
          <Input label={text.projects} name="projects_count" type="number" autoComplete="off" min="0" optional optionalLabel={text.optional} />
        </>}
        <Input label={text.email} name="email" type="email" autoComplete={mode === 'login' ? 'username' : 'email'} required />
        <Input
          label={text.password}
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'login' ? 1 : 10}
          endAdornment={passwordAdornment}
        />
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="submit" loading={busy}>{text.submit}</Button>
          {mode === 'login' && (
            <button type="button" className="text-label-sm text-content-brand underline" onClick={onForgotPassword}>{text.forgot}</button>
          )}
        </div>
      </form>

      <p className="mt-6 border-t border-line-subtle pt-4 text-body-sm text-content-secondary">
        {text.clientDoor}{' '}
        <button type="button" className="text-content-brand underline" onClick={() => (mode === 'register' ? openClientRegistration() : openAuthModal())}>{text.clientDoorLink}</button>
      </p>
    </div>
  );
}
