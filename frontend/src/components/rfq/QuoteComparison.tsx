import { useEffect, useState } from 'react';
import type { DepositPayment } from '../../api/client';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { useCompanies } from '../../api/useCompanies';
import { formatIQD } from '../../data/rfq';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { SubmittedRequest } from '../../state/QuoteRequestProvider';
import { useQuoteRequest } from '../../state/QuoteRequestProvider';

/**
 * Side-by-side quote comparison — the screen the platform exists for.
 *
 * Every company answers the same fields, so the difference a customer sees is
 * the offer rather than how each company chose to write it up. That is the
 * thing a round of phone calls cannot produce.
 *
 * On a phone the table becomes one card per company: a 7-column grid at 390px
 * would be unreadable at any font size that still counts as text.
 */
export function QuoteComparison({ request }: { request: SubmittedRequest }) {
  const { t, pick, lang } = useLanguage();
  const { companies } = useCompanies();
  const { confirmDepositPayment } = useQuoteRequest();
  const [choosingCompany, setChoosingCompany] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<DepositPayment['payment_method']>('zaincash');
  const [paymentPhone, setPaymentPhone] = useState(request.draft.phone);
  const [isPaying, setIsPaying] = useState(false);
  const [receipt, setReceipt] = useState<DepositPayment | null>(null);

  useEffect(() => {
    const openLinkedReceipt = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      if (params.get('requestId') !== request.id || params.get('payment') !== '1') return;
      const companyId = params.get('companyId');
      const payment = companyId ? request.payments?.[companyId] : undefined;
      if (companyId && payment) {
        setChoosingCompany(companyId);
        setReceipt(payment);
      }
    };
    openLinkedReceipt();
    window.addEventListener('hashchange', openLinkedReceipt);
    return () => window.removeEventListener('hashchange', openLinkedReceipt);
  }, [request.id, request.payments]);

  const quotes = request.draft.companyIds.flatMap((companyId) => {
    const quote = request.quotes[companyId];
    return ['quoted', 'selected'].includes(request.statuses[companyId]) && quote
      ? [{ companyId, ...quote }]
      : [];
  });

  const pending = request.draft.companyIds.filter(
    (id) => !['quoted', 'selected'].includes(request.statuses[id]),
  );
  const selectedCompanyId = Object.entries(request.statuses).find(([, status]) => status === 'selected')?.[0];
  const lowest = quotes.length ? Math.min(...quotes.map((q) => q.total_iqd)) : 0;
  const hasItemizedPricing = quotes.some(
    (quote) => quote.panel_iqd + quote.inverter_iqd + quote.battery_iqd + quote.installation_iqd > 0,
  );
  const nameOf = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? pick(c.name) : id;
  };
  const openPaymentOrReceipt = (companyId: string) => {
    const payment = request.payments?.[companyId];
    setChoosingCompany(companyId);
    setPaymentPhone(request.draft.phone);
    setSelectionError('');
    setReceipt(payment ?? null);
  };

  const payDeposit = async () => {
    if (!choosingCompany) return;
    setIsPaying(true);
    setSelectionError('');
    try {
      const payment = await confirmDepositPayment(request.id, choosingCompany, paymentMethod, paymentPhone);
      setReceipt(payment);
    } catch {
      setSelectionError(t('cmp.chooseError'));
    } finally {
      setIsPaying(false);
    }
  };

  if (quotes.length === 0) return null;

  const rows: { label: string; value: (q: (typeof quotes)[number]) => string; numeric?: boolean }[] =
    [
      { label: t('cmp.total'), value: (q) => `${formatIQD(q.total_iqd)} IQD`, numeric: true },
      ...(hasItemizedPricing ? [
        { label: t('cmp.panelCost'), value: (q: (typeof quotes)[number]) => q.panel_iqd ? `${formatIQD(q.panel_iqd)} IQD` : '—', numeric: true },
        { label: t('cmp.inverterCost'), value: (q: (typeof quotes)[number]) => q.inverter_iqd ? `${formatIQD(q.inverter_iqd)} IQD` : '—', numeric: true },
        { label: t('cmp.batteryCost'), value: (q: (typeof quotes)[number]) => q.battery_iqd ? `${formatIQD(q.battery_iqd)} IQD` : '—', numeric: true },
        { label: t('cmp.installationCost'), value: (q: (typeof quotes)[number]) => q.installation_iqd ? `${formatIQD(q.installation_iqd)} IQD` : '—', numeric: true },
      ] : []),
      { label: t('cmp.capacity'), value: (q) => `${q.capacity_kwp} kWp`, numeric: true },
      { label: t('cmp.panelBrand'), value: (q) => q.panel_brand },
      { label: t('cmp.inverterBrand'), value: (q) => q.inverter_brand },
      { label: t('cmp.batteryBrand'), value: (q) => q.battery_brand },
      { label: t('cmp.warranty'), value: (q) => q.warranty },
      { label: t('cmp.install'), value: (q) => `${q.install_days} ${lang === 'ar' ? 'يوم' : 'days'}` },
      {
        label: t('cmp.financing'),
        value: (q) => (q.financing ? t('cmp.financingYes') : t('cmp.financingNo')),
      },
      ...(quotes.some((quote) => quote.financing && quote.down_payment_iqd != null)
        ? [
            {
              label: t('cmp.downPayment'),
              value: (q: (typeof quotes)[number]) => q.financing && q.down_payment_iqd != null
                ? `${formatIQD(q.down_payment_iqd)} IQD`
                : '—',
              numeric: true,
            },
            {
              label: t('cmp.monthlyInstallment'),
              value: (q: (typeof quotes)[number]) =>
                q.financing && q.monthly_installment_iqd != null && q.installment_months != null
                  ? `${formatIQD(q.monthly_installment_iqd)} IQD × ${q.installment_months} ${t('cmp.installments')}`
                  : '—',
              numeric: true,
            },
          ]
        : []),
      ...(request.draft.greenInitiative
        ? [{
            label: t('green.supported'),
            value: (q: (typeof quotes)[number]) =>
              q.green_initiative_supported ? t('green.supported') : t('green.notSupported'),
          }]
        : []),
      { label: lang === 'ar' ? 'صلاحية العرض' : 'Quote valid', value: (q) => `${q.valid_days} ${lang === 'ar' ? 'يوم' : 'days'}` },
      { label: lang === 'ar' ? 'ملاحظات' : 'Notes', value: (q) => q.notes || '—' },
    ];

  return (
    <section className="mt-8">
      <h3 className="text-h3 text-content-primary">{t('cmp.title')}</h3>
      <p className="mt-2 max-w-prose text-body-sm text-content-secondary">{t('cmp.desc')}</p>

      {/* Tablet and up: one table, one scale */}
      <div className="mt-5 hidden overflow-x-auto rounded-xl border border-line-subtle bg-bg-surface md:block">
        <table className="w-full min-w-[46rem] border-collapse text-start">
          <caption className="sr-only">{t('cmp.title')}</caption>
          <thead>
            <tr className="border-b border-line-subtle">
              <th scope="col" className="p-4 text-start text-label-sm font-medium text-content-tertiary">
                {t('cmp.field')}
              </th>
              {quotes.map((q) => (
                <th key={q.companyId} scope="col" className="p-4 text-start">
                  <span className="block text-label text-content-primary">
                    {nameOf(q.companyId)}
                  </span>
                  {q.total_iqd === lowest && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-label-sm text-[var(--status-success)]">
                      <Icon name="trending-up" size={13} />
                      {t('cmp.best')}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`} className="border-b border-line-subtle last:border-0">
                <th scope="row" className="p-4 text-start text-body-sm font-normal text-content-tertiary">
                  {row.label}
                </th>
                {quotes.map((q) => (
                  <td
                    key={q.companyId}
                    className={cn(
                      'p-4 text-body-sm text-content-primary',
                      row.numeric && 'numeric font-medium',
                    )}
                  >
                    {row.value(q)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {quotes.map((q) => (
                <td key={q.companyId} className="p-4">
                  <Button
                    variant="secondary"
                    size="md"
                    loading={isPaying && choosingCompany === q.companyId}
                    disabled={Boolean(selectedCompanyId && selectedCompanyId !== q.companyId)}
                    onClick={() => openPaymentOrReceipt(q.companyId)}
                  >
                    {request.payments?.[q.companyId]?.payment_status === 'paid'
                      ? (lang === 'ar' ? 'عرض الإيصال' : 'View receipt')
                      : request.payments?.[q.companyId]?.payment_status === 'refunded'
                        ? (lang === 'ar' ? 'تم إرجاع العربون' : 'Deposit refunded')
                        : selectedCompanyId === q.companyId
                          ? (lang === 'ar' ? 'دفع العربون' : 'Pay deposit')
                          : t('cmp.choose')}
                    <span className="sr-only"> — {nameOf(q.companyId)}</span>
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Phone: one card per quote, same field order */}
      <ul className="mt-5 flex flex-col gap-4 md:hidden">
        {quotes.map((q) => (
          <li
            key={q.companyId}
            className="rounded-xl border border-line-subtle bg-bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-h4 text-content-primary">{nameOf(q.companyId)}</h4>
              {q.total_iqd === lowest && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-success-bg)] px-2.5 py-1 text-label-sm text-[var(--status-success)]">
                  <Icon name="trending-up" size={13} />
                  {t('cmp.best')}
                </span>
              )}
            </div>
            <dl className="mt-4 flex flex-col gap-2.5">
              {rows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-subtle pb-2.5 last:border-0"
                >
                  <dt className="text-body-sm text-content-tertiary">{row.label}</dt>
                  <dd
                    className={cn(
                      'text-body-sm text-content-primary',
                      row.numeric && 'numeric font-medium',
                    )}
                  >
                    {row.value(q)}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              className="mt-4"
              loading={isPaying && choosingCompany === q.companyId}
              disabled={Boolean(selectedCompanyId && selectedCompanyId !== q.companyId)}
              onClick={() => openPaymentOrReceipt(q.companyId)}
            >
              {request.payments?.[q.companyId]?.payment_status === 'paid'
                ? (lang === 'ar' ? 'عرض الإيصال' : 'View receipt')
                : request.payments?.[q.companyId]?.payment_status === 'refunded'
                  ? (lang === 'ar' ? 'تم إرجاع العربون' : 'Deposit refunded')
                  : selectedCompanyId === q.companyId
                    ? (lang === 'ar' ? 'دفع العربون' : 'Pay deposit')
                    : t('cmp.choose')}
              <span className="sr-only"> — {nameOf(q.companyId)}</span>
            </Button>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3">
          <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-content-tertiary" />
          <span className="text-body-sm text-content-secondary">
            {t('cmp.awaiting')}: {pending.map(nameOf).join(' · ')}
          </span>
        </p>
      )}

      {selectionError && <p role="alert" className="mt-3 text-body-sm text-[var(--status-danger)]">{selectionError}</p>}

      <p className="mt-3 text-label-sm text-content-tertiary">{t('cmp.note')}</p>
      {choosingCompany && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="deposit-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-bg-surface p-5 shadow-2xl sm:rounded-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="deposit-title" className="text-h3 text-content-primary">
                  {receipt
                    ? receipt.payment_status === 'refunded'
                      ? (lang === 'ar' ? 'إيصال إرجاع العربون' : 'Deposit refund receipt')
                      : (lang === 'ar' ? 'إيصال دفع رقمي' : 'Digital payment receipt')
                    : (lang === 'ar' ? 'تأكيد الحجز ودفع العربون' : 'Confirm booking & pay deposit')}
                </h2>
                <p className="mt-1 text-body-sm text-content-secondary">{nameOf(choosingCompany)}</p>
              </div>
              <button type="button" aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} onClick={() => { setChoosingCompany(null); setReceipt(null); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-bg-subtle">
                <Icon name="x-mark" />
              </button>
            </div>
            {receipt ? (
              <div className="mt-5 space-y-3 rounded-lg border border-line-subtle p-4 text-body-sm text-content-primary">
                <p><strong>{lang === 'ar' ? 'رقم المعاملة' : 'Transaction ID'}:</strong> {receipt.transaction_id}</p>
                <p><strong>{lang === 'ar' ? 'المبلغ المدفوع' : 'Amount paid'}:</strong> {formatIQD(receipt.deposit_iqd)} IQD</p>
                <p><strong>{lang === 'ar' ? 'المبلغ المتبقي' : 'Remaining balance'}:</strong> {formatIQD(receipt.remaining_iqd)} IQD</p>
                <p><strong>{lang === 'ar' ? 'الحالة' : 'Status'}:</strong> {receipt.payment_status === 'refunded'
                  ? (lang === 'ar' ? 'تم إرجاع العربون وإلغاء المشروع' : 'Deposit refunded; project cancelled')
                  : (lang === 'ar' ? 'قيد التنفيذ' : 'In Progress')}</p>
                {receipt.payment_status === 'paid' && <a
                  className="inline-flex rounded-md border border-line-subtle px-4 py-2 text-label text-content-primary hover:bg-bg-subtle"
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent([
                    'UTU Solar - Digital Payment Receipt',
                    `Transaction: ${receipt.transaction_id}`,
                    `Amount paid: ${receipt.deposit_iqd} IQD`,
                    `Remaining balance: ${receipt.remaining_iqd} IQD`,
                    `Payment method: ${receipt.payment_method}`,
                  ].join('\n'))}`}
                  download={`utu-receipt-${receipt.transaction_id}.txt`}
                >
                  {lang === 'ar' ? 'تنزيل الإيصال' : 'Download receipt'}
                </a>}
              </div>
            ) : (() => {
              const quote = request.quotes[choosingCompany];
              if (!quote) return null;
              const deposit = Math.min(quote.total_iqd, Math.max(50_000, Math.round(quote.total_iqd * 0.05)));
              const options: { id: DepositPayment['payment_method']; label: string }[] = [
                { id: 'zaincash', label: '🟡 ZainCash · زين كاش' },
                { id: 'fib', label: '🔵 First Iraqi Bank · FIB' },
                { id: 'qi_card', label: '💳 Qi Card / Mastercard · كي كارد' },
              ];
              return (
                <div className="mt-5 space-y-5">
                  <dl className="grid grid-cols-2 gap-3 rounded-lg bg-bg-subtle p-4 text-body-sm">
                    <dt className="text-content-secondary">{lang === 'ar' ? 'قيمة المشروع' : 'Project total'}</dt>
                    <dd className="numeric text-end text-content-primary">{formatIQD(quote.total_iqd)} IQD</dd>
                    <dt className="text-content-secondary">{lang === 'ar' ? 'العربون (٥٪، حد أدنى ٥٠٬٠٠٠ د.ع)' : 'Deposit (5%, min 50,000 IQD)'}</dt>
                    <dd className="numeric text-end font-semibold text-content-primary">{formatIQD(deposit)} IQD</dd>
                    <dt className="text-content-secondary">{lang === 'ar' ? 'المتبقي عند الإنجاز' : 'Remaining on completion'}</dt>
                    <dd className="numeric text-end text-content-primary">{formatIQD(quote.total_iqd - deposit)} IQD</dd>
                  </dl>
                  <fieldset>
                    <legend className="mb-2 text-label text-content-primary">{lang === 'ar' ? 'طريقة الدفع التجريبية' : 'Mock payment method'}</legend>
                    <div className="grid gap-2">
                      {options.map((option) => (
                        <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-line-subtle p-3 text-body-sm text-content-primary">
                          <input type="radio" name="deposit-payment-method" value={option.id} checked={paymentMethod === option.id} onChange={() => setPaymentMethod(option.id)} />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="block text-label text-content-primary">
                    {lang === 'ar' ? 'رقم الهاتف المرتبط بالدفع' : 'Payment phone number'}
                    <input
                      className="mt-2 w-full rounded-md border border-line-subtle bg-bg-page px-3 py-2 text-body text-content-primary"
                      type="tel"
                      inputMode="numeric"
                      pattern="07[0-9]{9}"
                      maxLength={11}
                      value={paymentPhone}
                      onChange={(event) => setPaymentPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                    />
                  </label>
                  <div aria-label={lang === 'ar' ? 'محاكاة رمز QR للدفع' : 'Simulated payment QR'} className="mx-auto grid h-24 w-24 grid-cols-5 gap-1 rounded-md border border-line-subtle p-2" role="img">
                    {[1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1].map((cell, index) => (
                      <span key={index} className={cell ? 'bg-content-primary' : 'bg-bg-subtle'} />
                    ))}
                  </div>
                  <p className="text-center text-label-sm text-content-tertiary">
                    {lang === 'ar' ? 'محاكاة تجريبية فقط — لا يتم تنفيذ خصم مصرفي حقيقي.' : 'Simulation only — no real bank charge is made.'}
                  </p>
                  {selectionError && <p role="alert" className="text-body-sm text-[var(--status-danger)]">{selectionError}</p>}
                  <Button fullWidth loading={isPaying} disabled={!/^07\d{9}$/.test(paymentPhone)} onClick={() => { void payDeposit(); }}>
                    {lang === 'ar' ? 'تأكيد الدفع التجريبي' : 'Confirm mock payment'}
                  </Button>
                </div>
              );
            })()}
          </section>
        </div>
      )}
    </section>
  );
}
