import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, type GreenInitiativeVerification } from '../api/client';
import { Logo } from '../components/Logo';
import { FlowHeader } from '../components/layout/FlowHeader';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../i18n/LanguageProvider';

export function GreenInitiativeVerificationPage({ verificationId }: { verificationId: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<GreenInitiativeVerification | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setFailed(false);
    api.greenInitiativeVerification(verificationId).then(
      (result) => {
        if (active) setData(result);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [verificationId]);

  const verificationUrl =
    `${window.location.origin}${window.location.pathname}#/verify/${encodeURIComponent(verificationId)}`;
  const printReport = () => window.print();

  return (
    <>
      <div className="no-print">
        <FlowHeader />
      </div>
      <main id="main" className="bg-bg-page pb-16">
        <div className="container-page max-w-3xl">
          <header className="no-print border-b border-line-subtle py-8">
            <h1 className="text-h2 text-content-primary">{t('green.verifyTitle')}</h1>
            <p className="mt-2 text-body text-content-secondary">{t('green.verifySubtitle')}</p>
          </header>

          {!data && !failed && (
            <p role="status" className="py-8 text-body text-content-secondary">
              {t('green.loading')}
            </p>
          )}
          {failed && (
            <p role="alert" className="mt-6 rounded-lg border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-body-sm text-[var(--status-danger)]">
              {t('green.loadError')}
            </p>
          )}
          {data && (
            <div className="green-verification-report">
              <header className="print-certificate-header">
                <Logo />
                <h1>Official Green Initiative Verification Certificate / شهادة توثيق المبادرة الخضراء</h1>
              </header>
              <div className="green-verification-report-content">
              <section className="green-verification-card rounded-xl border border-line-subtle bg-bg-surface p-5">
                <h2 className="text-h4 text-content-primary">{t('green.project')}</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <VerificationField label={t('green.reference')} value={data.reference} />
                  <VerificationField label={t('green.capacity')} value={`${data.system_kwp} kWp`} />
                  <VerificationField label={t('green.battery')} value={`${data.battery_kwh} kWh`} />
                  <VerificationField label={t('green.panels')} value={String(data.panel_count)} />
                  <VerificationField
                    label={t('green.location')}
                    value={[data.governorate, data.district].filter(Boolean).join(' · ') || '—'}
                  />
                </dl>

                <h2 className="mt-7 text-h4 text-content-primary">
                  {t('green.company')} · {t('green.companyVerified')}
                </h2>
                <p className="mt-2 text-body text-content-primary">
                  {data.company_name} · {t('green.companyVerified')}
                </p>
                <dl className="mt-3 grid gap-3">
                  <VerificationField
                    label={t('green.license')}
                    value={data.license_checked && data.business_license_number
                      ? `${data.business_license_number} — ${t('green.licenseVerified')}`
                      : t('green.licensePending')}
                  />
                  <VerificationField
                    label={t('green.taxVerified')}
                    value={data.tax_record_checked && data.tax_registration_number
                      ? `${data.tax_registration_number} — ${t('green.licenseVerified')}`
                      : t('green.licensePending')}
                  />
                  <VerificationField
                    label={t('green.projectsVerified')}
                    value={data.projects_checked ? t('green.licenseVerified') : t('green.licensePending')}
                  />
                </dl>
                <p className="mt-5 border-t border-line-subtle pt-4 text-body-sm text-content-tertiary">
                  {t('green.copyDisclaimer')}
                </p>
              </section>

              <aside className="green-verification-qr flex flex-col items-center gap-3 rounded-xl border border-line-subtle bg-bg-surface p-5">
                <QRCodeSVG
                  value={verificationUrl}
                  size={192}
                  level="M"
                  includeMargin
                  aria-label={t('green.qrLabel')}
                />
                <p className="max-w-48 text-center text-label-sm text-content-secondary">
                  {t('green.qrLabel')}
                </p>
              </aside>
              </div>
              <p className="print-verification-url">{verificationUrl}</p>
              <div className="no-print mt-6 flex justify-end">
                <Button type="button" onClick={printReport}>
                  Download PDF / طباعة التقرير
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function VerificationField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-sm text-content-tertiary">{label}</dt>
      <dd className="mt-0.5 text-label text-content-primary">{value}</dd>
    </div>
  );
}
