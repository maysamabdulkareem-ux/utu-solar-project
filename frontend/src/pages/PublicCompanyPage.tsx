import { useEffect, useState } from 'react';
import { api, type ApiCompany, type ApiReview, type CompanyProject } from '../api/client';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { FlowHeader } from '../components/layout/FlowHeader';
import { useLanguage } from '../i18n/LanguageProvider';

export function PublicCompanyPage({ companyId }: { companyId: number }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const text = {
    loading: ar ? 'جارٍ تحميل معلومات الشركة…' : 'Loading company profile…',
    unavailable: ar ? 'ما قدرنا نحمّل صفحة الشركة.' : 'This company profile could not be loaded.',
    back: ar ? 'العودة إلى الشركات' : 'Back to companies',
    status: ar ? 'حالة التوثيق' : 'Verification status',
    silver: ar ? 'هوية معتمدة · شارة فضية' : 'Identity verified · Silver Badge',
    gold: ar ? 'شركة موثوقة رسمياً · شارة ذهبية' : 'Officially verified · Gold Badge',
    unverified: ar ? 'غير موثّقة' : 'Unverified',
    address: ar ? 'الموقع' : 'Location',
    founded: ar ? 'سنة التأسيس' : 'Founded',
    experience: ar ? 'سنوات الخبرة' : 'Years operating',
    projects: ar ? 'المشاريع المنجزة' : 'Completed projects',
    projectCount: ar ? 'المشاريع المعلنة' : 'Projects reported',
    portfolio: ar ? 'معرض المشاريع' : 'Project portfolio',
    reviews: ar ? 'تقييمات الزبائن' : 'Customer Reviews',
    reviewsEmpty: ar ? 'ماكو تقييمات موثقة منشورة لهذه الشركة حالياً.' : 'There are no verified customer reviews for this company yet.',
    empty: ar ? 'ماكو مشاريع منشورة لهالشركة حالياً.' : 'No projects have been published for this company yet.',
    system: ar ? 'حجم المنظومة' : 'System size',
    noAddress: ar ? 'الموقع غير مضاف' : 'Location not provided',
    noYear: ar ? 'غير مضاف' : 'Not provided',
    ask: ar ? 'اطلب عرض سعر من هالشركة' : 'Request a quote from this company',
    completedAt: ar ? 'تاريخ الإكمال' : 'Completed',
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      api.getCompany(companyId),
      api.listCompanyProjects(companyId),
      api.companyReviews(companyId).catch(() => []),
    ])
      .then(([profile, records, reviewRecords]) => {
        if (cancelled) return;
        setCompany(profile);
        setProjects(records);
        setReviews(reviewRecords.filter((review) => review.is_verified));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const dateFormat = new Intl.DateTimeFormat(ar ? 'ar-IQ' : 'en-GB', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <FlowHeader />
      <main id="main" className="min-h-[70vh] bg-bg-page pb-20">
        <div className="container-page max-w-5xl">
          {loading ? (
            <p role="status" className="py-16 text-body text-content-secondary">{text.loading}</p>
          ) : error || !company ? (
            <section className="py-16">
              <p role="alert" className="text-body text-content-secondary">{text.unavailable}</p>
              <a href="#/" className="mt-5 inline-flex text-label text-content-brand underline">{text.back}</a>
            </section>
          ) : (
            <>
              <header className="relative isolate mb-8 overflow-hidden rounded-3xl border border-amber-500/15 bg-gradient-to-br from-white via-amber-50/70 to-slate-100 px-6 py-8 shadow-sm md:px-9 md:py-10">
                <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
                <a href="#/" className="mb-6 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-500 hover:text-white hover:shadow-[0_0_16px_rgba(245,158,11,0.2)]">
                  <Icon name="arrow-right" size={16} className="rtl:-scale-x-100" />
                  {text.back}
                </a>
                <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                  <span aria-hidden="true" className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl font-bold text-amber-700 shadow-inner shadow-amber-500/10">
                    {company.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? '').join('').toLocaleUpperCase()}
                    {company.logo_url && <img src={company.logo_url} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{company.name}</h1>
                    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-sm text-slate-600 shadow-sm">
                      <Icon name="map-pin" size={16} />
                      {company.address || text.noAddress}
                    </p>
                    <div className="mt-3"><VerificationBadge status={
                      company.verification_status === 'verified'
                        ? 'verified'
                        : company.verification_status === 'identity_verified'
                          ? 'identity_verified'
                          : company.verification_status === 'rejected' ? 'rejected' : 'pending'
                    } /></div>
                  </div>
                  <Button
                    onClick={() => { window.location.hash = '#/request'; }}
                    className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 font-bold text-white shadow-lg transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-[0_12px_30px_rgba(245,158,11,0.3)]"
                  >
                    {text.ask}
                  </Button>
                </div>
              </header>

              <section aria-labelledby="company-facts" className="py-4">
                <h2 id="company-facts" className="text-h3 font-bold text-slate-900">{ar ? 'عن الشركة' : 'Company information'}</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-4 shadow-sm transition-all hover:border-amber-500/40 md:p-5"><dt className="flex items-center gap-2 text-sm text-slate-600"><Icon name="building" size={17} className="text-amber-600" />{text.founded}</dt><dd className="mt-2 text-2xl font-bold text-amber-600">{company.founded_year > 0 ? company.founded_year : text.noYear}</dd></div>
                  <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-4 shadow-sm transition-all hover:border-amber-500/40 md:p-5"><dt className="flex items-center gap-2 text-sm text-slate-600"><Icon name="trending-up" size={17} className="text-amber-600" />{text.experience}</dt><dd className="numeric mt-2 text-2xl font-bold text-amber-600">{company.founded_year > 0 ? `${Math.max(new Date().getFullYear() - company.founded_year, 0)} ${ar ? 'سنة' : 'years'}` : text.noYear}</dd></div>
                  <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-4 shadow-sm transition-all hover:border-amber-500/40 md:p-5"><dt className="flex items-center gap-2 text-sm text-slate-600"><Icon name="solar-panel" size={17} className="text-amber-600" />{company.verification_status !== 'pending' && company.verification_status !== 'rejected' ? text.projects : text.projectCount}</dt><dd className="numeric mt-2 text-2xl font-bold text-amber-600">{company.projects_count}</dd></div>
                  <div className="rounded-2xl border border-amber-500/15 bg-white/80 p-4 shadow-sm transition-all hover:border-amber-500/40 md:p-5"><dt className="flex items-center gap-2 text-sm text-slate-600"><Icon name="shield-check" size={17} className="text-amber-600" />{text.status}</dt><dd className="mt-2 text-base font-bold text-amber-700">{company.verification_status === 'verified' ? text.gold : company.verification_status === 'identity_verified' ? text.silver : company.verification_status === 'rejected' ? (ar ? 'غير مستوفية للشروط' : 'Not approved') : text.unverified}</dd></div>
                </dl>
              </section>

              <section aria-labelledby="company-reviews" className="py-8">
                <h2 id="company-reviews" className="text-h3 font-bold text-slate-900">{text.reviews}</h2>
                {reviews.length === 0 ? (
                  <p className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 text-body text-slate-600 shadow-sm">{text.reviewsEmpty}</p>
                ) : (
                  <ul className="mt-5 grid gap-4 md:grid-cols-2">
                    {reviews.map((review) => (
                      <li key={review.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{review.client_name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{review.project_title}</p>
                          </div>
                          <div className="flex items-center gap-1.5" role="img" aria-label={`${review.rating} / 5`}>
                            <span aria-hidden="true" className="font-bold tracking-wide text-amber-400">{'★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Math.round(review.rating))))}</span>
                            <span className="numeric text-label font-bold text-amber-600">{review.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="mt-4 text-body-sm leading-relaxed text-slate-700">{review.comment}</p>
                        <time className="mt-4 block text-label-sm text-slate-500" dateTime={review.created_at}>
                          {dateFormat.format(new Date(review.created_at))}
                        </time>
                        <span className="mt-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                          {ar ? 'مشروع موثق' : 'Verified project'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="company-projects" className="py-8">
                <h2 id="company-projects" className="text-h3 font-bold text-slate-900">{text.portfolio}</h2>
                {projects.length === 0 ? (
                  <p className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 text-body text-slate-600 shadow-sm">{text.empty}</p>
                ) : (
                  <ul className="mt-5 grid gap-5 md:grid-cols-2">
                    {projects.map((project) => (
                      <li key={project.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-md">
                        <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
                        {project.description && <p className="mt-2 text-body-sm leading-relaxed text-slate-600">{project.description}</p>}
                        <dl className="mt-4 flex flex-wrap gap-2 text-xs">
                          {project.system_kwp !== null && <div className="rounded-xl bg-slate-100 px-3 py-1.5 font-semibold text-slate-700"><dt className="sr-only">{text.system}</dt><dd className="numeric">{text.system}: {project.system_kwp} kWp</dd></div>}
                          {project.location && <div className="rounded-xl bg-slate-100 px-3 py-1.5 font-semibold text-slate-700"><dt className="sr-only">{text.address}</dt><dd>{text.address}: {project.location}</dd></div>}
                          {project.completed_at && <div className="rounded-xl bg-slate-100 px-3 py-1.5 font-semibold text-slate-700"><dt className="sr-only">{text.completedAt}</dt><dd>{text.completedAt}: {dateFormat.format(new Date(project.completed_at))}</dd></div>}
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
