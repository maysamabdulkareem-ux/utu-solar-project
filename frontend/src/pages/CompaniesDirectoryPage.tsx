import { useEffect, useMemo, useState } from 'react';
import { CompanyCard } from '../components/cards/CompanyCard';
import { FlowHeader } from '../components/layout/FlowHeader';
import { Icon } from '../components/icons/Icon';
import { useCompanies } from '../api/useCompanies';
import { useLanguage } from '../i18n/LanguageProvider';
import type { VerificationStatus } from '../components/ui/VerificationBadge';

type StatusFilter = 'all' | VerificationStatus;

export function CompaniesDirectoryPage() {
  const { lang } = useLanguage();
  const { companies, source } = useCompanies();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const ar = lang === 'ar';

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const visibleCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...companies]
      .filter((company) => status === 'all' || company.status === status)
      .filter((company) =>
        !normalizedQuery ||
        `${company.name.en} ${company.location.en} ${company.name.ar} ${company.location.ar}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews || a.name.en.localeCompare(b.name.en));
  }, [companies, query, status]);

  return (
    <>
      <FlowHeader />
      <main id="main" className="min-h-[70vh] bg-bg-page pb-20">
        <div className="container-page">
          <header className="border-b border-slate-200/80 py-8">
            <a
              href="#/"
              className="mb-6 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 transition-all hover:bg-amber-500 hover:text-white hover:shadow-[0_0_16px_rgba(245,158,11,0.2)]"
            >
              <Icon name="arrow-right" size={16} className="rotate-180" />
              {ar ? 'العودة إلى الرئيسية' : 'Back to Home'}
            </a>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">{ar ? 'دليل الشركات' : 'Company directory'}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{ar ? 'كل شركات الطاقة الشمسية' : 'All solar companies'}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
              {ar ? 'ابحث بين الشركات المسجلة، بما فيها الشركات قيد استكمال التوثيق.' : 'Search all registered companies, including those still completing verification.'}
            </p>
          </header>

          <div className="mb-8 mt-7 grid items-end gap-5 rounded-2xl border border-amber-500/20 bg-white/80 p-4 shadow-sm backdrop-blur-md md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:p-6">
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              {ar ? 'بحث بالاسم أو الموقع' : 'Search by name or location'}
              <span className="relative block">
                <Icon name="search" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 ps-11 pe-4 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder={ar ? 'اكتب اسم شركة أو محافظة' : 'Enter a company or location'}
                />
              </span>
            </label>
            <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              {ar ? 'حالة التوثيق' : 'Verification status'}
              <span className="relative block">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  className="directory-status-select platform-select w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pe-11 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none transition hover:border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                >
                  <option className="directory-status-option" value="all">{ar ? 'كل الحالات' : 'All statuses'}</option>
                  <option className="directory-status-option" value="verified">{ar ? 'موثقة رسمياً' : 'Gold verified'}</option>
                  <option className="directory-status-option" value="identity_verified">{ar ? 'هوية معتمدة' : 'Identity verified'}</option>
                  <option className="directory-status-option" value="pending">{ar ? 'قيد التوثيق' : 'Pending verification'}</option>
                  <option className="directory-status-option" value="rejected">{ar ? 'غير مستوفية' : 'Not approved'}</option>
                </select>
                <Icon name="chevron-down" size={18} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-amber-600" />
              </span>
            </label>
          </div>

          {visibleCompanies.length > 0 ? (
            <ul className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visibleCompanies.map((company) => (
                <li key={company.id} className="h-full"><CompanyCard company={company} /></li>
              ))}
            </ul>
          ) : (
            <p role="status" className="mt-8 border-y border-line-subtle py-7 text-body text-content-secondary">
              {source === 'loading'
                ? (ar ? 'جارٍ تحميل الشركات…' : 'Loading companies…')
                : source === 'unavailable'
                  ? (ar ? 'تعذّر تحميل الشركات. حاول مرة ثانية لاحقاً.' : 'Companies could not be loaded. Please try again later.')
                  : (ar ? 'ماكو شركات تطابق البحث الحالي.' : 'No companies match the current search.')}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
