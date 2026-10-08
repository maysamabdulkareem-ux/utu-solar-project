import { useLanguage } from '../i18n/LanguageProvider';

const gateways = [
  { id: 'zaincash', logo: 'ZainCash', name: 'زين كاش', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  { id: 'fib', logo: 'FIB', name: 'المصرف العراقي الأول', tone: 'border-sky-200 bg-sky-50 text-sky-800' },
  { id: 'qi-card', logo: 'QI', name: 'Qi Card / Mastercard', tone: 'border-rose-200 bg-rose-50 text-rose-800' },
  { id: 'asia-hawala', logo: 'AsiaHawala', name: 'آسيا حوالة', tone: 'border-orange-200 bg-orange-50 text-orange-800' },
  { id: 'visa', logo: 'VISA', name: 'Visa Card · فيزا كارد', tone: 'border-indigo-200 bg-indigo-50 text-indigo-800' },
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
            {isArabic ? 'دفع محلي' : 'Local payments'}
          </p>
          <h2 id="payment-gateways-heading" className="mt-3 text-h2 text-content-primary">
            {isArabic
              ? 'يدعم أبرز بوابات الدفع العراقية والإقليمية'
              : 'Supporting Major Local & Regional Payment Gateways'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-body-sm text-content-secondary">
            {isArabic
              ? 'خيارات الدفع الظاهرة جزء من محاكاة العربون التجريبية؛ لا يتم تنفيذ خصم مصرفي حقيقي.'
              : 'These payment options are shown in the deposit demo; no real bank charge is made.'}
          </p>
        </div>

        <ul className="mx-auto mt-8 grid max-w-6xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
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
