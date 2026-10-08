import { useEffect, useState, type FormEvent } from 'react';
import { Logo } from '../Logo';
import { Icon, type IconName } from '../icons/Icon';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import { paths } from '../../routes/useHashRoute';
import { useAuth } from '../../state/AuthContext';

const GROUPS: { title: TranslationKey; links: TranslationKey[]; hrefs: string[] }[] = [
  {
    title: 'ft.platform',
    links: ['ft.l1', 'ft.l2', 'ft.l3', 'ft.l4', 'ft.l5', 'ft.l6', 'ft.l7'],
    hrefs: ['#top', '#companies', '#projects', '#calculator', '#how-it-works', '#services', '#/rfq'],
  },
  { title: 'ft.forCompanies', links: ['ft.c1', 'ft.c2', 'ft.c3'], hrefs: ['#/company', '#/company', '#/company'] },
  { title: 'ft.support', links: ['ft.s2', 'ft.s3'], hrefs: ['#contact', '#reviews'] },
];

type FooterDialog = 'contact' | 'privacy' | 'terms' | null;

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || 'support@utu-solar.iq';
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE?.trim() || '+964 770 000 0000';

function validSupportEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validSupportPhone(value: string): boolean {
  return /^[+\d()\s-]+$/.test(value) && value.replace(/\D/g, '').length >= 7;
}

const SOCIAL: { name: string; icon: IconName; envKey: string }[] = [
  { name: 'Facebook', icon: 'facebook', envKey: 'VITE_SOCIAL_FACEBOOK' },
  { name: 'Instagram', icon: 'instagram', envKey: 'VITE_SOCIAL_INSTAGRAM' },
  { name: 'LinkedIn', icon: 'linkedin', envKey: 'VITE_SOCIAL_LINKEDIN' },
  { name: 'X', icon: 'x-social', envKey: 'VITE_SOCIAL_X' },
];

function isExternalHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function Footer() {
  const { lang, t } = useLanguage();
  const { user, isLoading, openCompanyRegistrationModal } = useAuth();
  const [dialog, setDialog] = useState<FooterDialog>(null);
  const [contactSuccess, setContactSuccess] = useState(false);
  const supportEmail = validSupportEmail(SUPPORT_EMAIL) ? SUPPORT_EMAIL : 'support@utu-solar.iq';
  const supportPhone = validSupportPhone(SUPPORT_PHONE) ? SUPPORT_PHONE : '+964 770 000 0000';
  const isArabic = lang === 'ar';

  useEffect(() => {
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dialog]);

  useEffect(() => {
    if (!contactSuccess) return;
    const timer = window.setTimeout(() => setContactSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [contactSuccess]);

  const socialLinks = SOCIAL
    .map((social) => ({ ...social, href: import.meta.env[social.envKey] }))
    .filter((social) => isExternalHttpUrl(social.href));

  const navigateFooterLink = (href: string) => {
    if (href === '#contact' || href === '#privacy' || href === '#terms') {
      setContactSuccess(false);
      setDialog(href.slice(1) as Exclude<FooterDialog, null>);
      return;
    }

    if (href.startsWith('#/')) {
      if (href === paths.company && !user && !isLoading) {
        openCompanyRegistrationModal();
        return;
      }
      window.location.hash = href;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetId = href.slice(1);
    window.location.hash = href;
    const scrollToTarget = () => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (document.getElementById(targetId)) {
      scrollToTarget();
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToTarget));
    }
  };

  const sendContactMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    setDialog(null);
    setContactSuccess(true);
  };

  return (
    <footer className="on-dark bg-bg-inverse">
      <div className="container-page py-16 lg:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          <div className="max-w-sm">
            <Logo onDark />
            <p className="mt-4 text-body-sm text-content-on-dark-muted">{t('ft.tagline')}</p>
            <ul className="mt-5 flex gap-2.5">
              {socialLinks.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('ft.social', { n: s.name })}
                    className="grid h-10 w-10 place-items-center rounded-md bg-bg-panel-raised text-content-on-dark-muted transition-colors hover:text-content-on-dark"
                  >
                    <Icon name={s.icon} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-14">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="eyebrow text-solar-300">{t(group.title)}</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {group.links.map((link, i) => (
                    <li key={link}>
                      <a
                        href={group.hrefs[i]}
                        onClick={(event) => {
                          event.preventDefault();
                          navigateFooterLink(group.hrefs[i]);
                        }}
                        className="text-body-sm text-content-on-dark-muted transition-colors hover:text-content-on-dark"
                      >
                        {link === 'ft.l2' ? (isArabic ? 'شركات الطاقة الشمسية' : 'Solar Companies') :
                          link === 'ft.l4' ? (isArabic ? 'حاسبة الطاقة الشمسية' : 'Solar Calculator') :
                          link === 'ft.s2' ? (isArabic ? 'اتصل بنا' : 'Contact Us') :
                            t(link)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="my-8 border-line-on-dark" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-label-sm text-content-on-dark-muted">{t('ft.copy')}</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#privacy" onClick={(event) => { event.preventDefault(); navigateFooterLink('#privacy'); }} className="text-label-sm text-content-on-dark-muted transition-colors hover:text-content-on-dark">
              {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
            <a href="#terms" onClick={(event) => { event.preventDefault(); navigateFooterLink('#terms'); }} className="text-label-sm text-content-on-dark-muted transition-colors hover:text-content-on-dark">
              {isArabic ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </a>
            {/* Second switch, for anyone who reached the bottom without seeing the header. */}
            <LanguageToggle />
          </div>
        </div>
      </div>
      {dialog && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/55 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="footer-dialog-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-line-subtle bg-bg-page p-6 text-content-primary shadow-2xl sm:p-8">
            <header className="flex items-start justify-between gap-4">
              <h2 id="footer-dialog-title" className="text-h3">
                {dialog === 'contact'
                  ? (isArabic ? 'اتصل بنا' : 'Contact Us')
                  : dialog === 'privacy'
                    ? (isArabic ? 'سياسة الخصوصية' : 'Privacy Policy')
                    : (isArabic ? 'الشروط والأحكام' : 'Terms & Conditions')}
              </h2>
              <button type="button" aria-label={isArabic ? 'إغلاق' : 'Close'} onClick={() => setDialog(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-bg-subtle">
                <Icon name="x-mark" />
              </button>
            </header>
            {dialog === 'contact' ? (
              <div className="mt-5 grid gap-5">
                <div className="flex flex-wrap gap-x-6 gap-y-3 text-body-sm">
                  {supportEmail ? (
                    <a className="text-content-brand underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
                  ) : (
                    <span>{isArabic ? 'البريد الإلكتروني للدعم غير مُعدّ حالياً.' : 'Support email is not configured yet.'}</span>
                  )}
                  {supportPhone ? (
                    <a className="text-content-brand underline" href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`} dir="ltr">{supportPhone}</a>
                  ) : (
                    <span>{isArabic ? 'رقم الخط الساخن غير مُعدّ حالياً.' : 'Support hotline is not configured yet.'}</span>
                  )}
                </div>
                <form className="grid gap-4" onSubmit={sendContactMessage}>
                  <label className="grid gap-1.5 text-label">
                    {isArabic ? 'الموضوع' : 'Subject'}
                    <input className="rounded-md border border-line bg-bg-surface px-3 py-2.5 text-body" name="subject" required />
                  </label>
                  <label className="grid gap-1.5 text-label">
                    {isArabic ? 'الاسم' : 'Name'}
                    <input className="rounded-md border border-line bg-bg-surface px-3 py-2.5 text-body" name="name" required />
                  </label>
                  <label className="grid gap-1.5 text-label">
                    {isArabic ? 'البريد الإلكتروني' : 'Email'}
                    <input className="rounded-md border border-line bg-bg-surface px-3 py-2.5 text-body" name="email" type="email" required />
                  </label>
                  <label className="grid gap-1.5 text-label">
                    {isArabic ? 'رسالتك' : 'Message'}
                    <textarea className="min-h-28 rounded-md border border-line bg-bg-surface px-3 py-2.5 text-body" name="message" required />
                  </label>
                  <button type="submit" className="w-fit rounded-md bg-[var(--brand-primary)] px-5 py-3 text-label text-content-on-brand">
                    {isArabic ? 'إرسال الرسالة' : 'Send message'}
                  </button>
                </form>
              </div>
            ) : (
              <p className="mt-5 text-body leading-relaxed">
                {dialog === 'privacy'
                  ? (isArabic
                    ? 'نستخدم البيانات التي تقدمها لتشغيل خدمات المنصة، مثل طلبات عروض الأسعار والتواصل المرتبط بها. لا تُدخل معلومات حساسة لا تحتاجها الخدمة. تبقى سجلات حساباتك وطلباتك محفوظة وفق إعدادات المنصة.'
                    : 'We use information you provide to operate platform services, including quote requests and related communications. Do not submit sensitive information that the service does not need. Account and request records are retained under the platform settings.')
                  : (isArabic
                    ? 'باستخدام المنصة، توافق على تقديم معلومات صحيحة واستخدام أدواتها للتواصل بشأن مشاريع الطاقة الشمسية. تخضع العروض والأسعار والاتفاقات للتأكيد المباشر بين العميل والشركة، ولا تُعدّ الأمثلة المعروضة عروضاً ملزمة.'
                    : 'By using the platform, you agree to provide accurate information and use its tools for solar project communications. Quotes, pricing, and agreements must be confirmed between the client and company; sample content is not a binding offer.')}
              </p>
            )}
          </section>
        </div>
      )}
      {contactSuccess && (
        <div role="status" className="fixed bottom-5 end-5 z-[90] max-w-sm rounded-lg border border-[var(--status-success)] bg-[var(--status-success-bg)] px-5 py-4 text-body-sm text-[var(--status-success)] shadow-xl">
          {isArabic ? 'شكراً لتواصلك معنا! سيعاود فريقنا التواصل معك قريباً.' : 'Thank you for reaching out! Our team will get back to you shortly.'}
        </div>
      )}
    </footer>
  );
}
