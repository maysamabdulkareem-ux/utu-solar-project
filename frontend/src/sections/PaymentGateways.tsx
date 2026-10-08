import { useLanguage } from '../i18n/LanguageProvider';

/**
 * Methods offered in the deposit demo. Must match DepositPaymentCreate in the
 * backend (zaincash, fib, qi_card). No gateway is connected and the platform
 * has no agreement with these providers, so this is shown as a demo only.
 */
const gateways = [
  { id: 'zaincash', logo: 'ZainCash', name: 'زين كاش', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  { id: 'fib', logo: 'FIB', name: 'المصرف العراقي الأول', tone: 'border-sky-200 bg-sky-50 text-sky-800' },
  { id: 'qi-card', logo: 'QI', name: 'Qi Card', tone: 'border-rose-200 bg-rose-50 text-rose-800' },
] as const;

export function PaymentGateways() {
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  return (
    <section
      aria-labelledby="payment-gateways-heading"
      className="border-y border-line-subtle bg-bg-subtle py-12 sm:py-16"
    >
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-[var(--color-sunset-500)]">
            {isArabic ? 'عرض تجريبي' : 'Demo'}
          </p>
          <h2 id="payment-gateways-heading" className="mt-3 text-h2 text-content-primary">
            {isArabic
              ? 'طرق دفع العربون في النسخة التجريبية'
              : 'Deposit methods in the demo'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-body-sm text-content-secondary">
            {isArabic
              ? 'هذه الخيارات للتجربة فقط: لا يوجد ربط مع أي بوابة دفع ولا يتم تنفيذ خصم مصرفي حقيقي.'
              : 'For demonstration only: no payment gateway is connected and no real bank charge is made.'}
          </p>
        </div>

        <ul className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
          {gateways.map((gateway) => (
            <li
              key={gateway.id}
              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-line-subtle bg-bg-surface px-3 py-4 text-center shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                aria-hidden="true"
                className={`inline-flex min-h-10 min-w-14 items-center justify-center rounded-lg border px-2.5 text-label font-bold tracking-wide ${gateway.tone}`}
              >
                {gateway.logo}
              </span>
              <span className="text-label-sm text-content-primary">{gateway.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
