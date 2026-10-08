import { useEffect, useState, type FormEvent } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from '../components/icons/Icon';
import { Button } from '../components/ui/Button';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { FlowHeader } from '../components/layout/FlowHeader';
import { Footer } from '../components/layout/Footer';
import { QuoteComparison } from '../components/rfq/QuoteComparison';
import { RequestChat } from '../components/rfq/RequestChat';
import { ProjectReviewForm } from '../components/reviews/ProjectReviewForm';
import type { ReviewableProject } from '../components/reviews/AddReviewModal';
import type { VerifiedProjectReview } from '../data/content';
import { invalidateCompanies, useCompanies } from '../api/useCompanies';
import { governorates } from '../data/rfq';
import { useLanguage } from '../i18n/LanguageProvider';
import {
  getRequestAccessToken,
  useQuoteRequest,
  type CompanyStatus,
  type QuoteDraft,
} from '../state/QuoteRequestProvider';
import { paths } from '../routes/useHashRoute';
import { useAuth } from '../state/AuthContext';
import type { TranslationKey } from '../i18n/translations';

type RequestEditForm = {
  customer_phone: string;
  system_kwp: string;
  battery_kwh: string;
  panel_count: string;
  governorate: string;
  district: string;
  notes: string;
};

const STATUS: Record<CompanyStatus, { label: TranslationKey; icon: IconName; className: string }> = {
  sent: {
    label: 'my.statusSent',
    icon: 'clock',
    className: 'text-content-tertiary bg-bg-subtle border-line-subtle',
  },
  viewed: {
    label: 'my.statusViewed',
    icon: 'search',
    className:
      'text-[var(--color-dusk-500)] bg-[var(--color-dusk-50)] border-[var(--color-dusk-300)]',
  },
  quoted: {
    label: 'my.statusQuoted',
    icon: 'check',
    className:
      'text-[var(--status-success)] bg-[var(--status-success-bg)] border-[var(--status-success)]',
  },
  selected: {
    label: 'my.statusSelected',
    icon: 'check',
    className:
      'text-[var(--status-success)] bg-[var(--status-success-bg)] border-[var(--status-success)]',
  },
  declined: {
    label: 'my.statusDeclined',
    icon: 'x-mark',
    className:
      'text-[var(--status-danger)] bg-[var(--status-danger-bg)] border-[var(--status-danger)]',
  },
};

/**
 * Request tracking.
 *
 * Status is per company, not per request — "sent" tells the customer nothing
 * when three companies are involved and only one has replied. Each row carries
 * an icon and a word, so progress survives greyscale.
 */
export function MyRequestsPage() {
  const { t, pick, lang } = useLanguage();
  const { requests, refreshFromServer, updateRequest } = useQuoteRequest();
  const { user, token: authToken, isLoading: authLoading, openAuthModal } = useAuth();
  const { companies } = useCompanies();
  const [reviewTarget, setReviewTarget] = useState<{
    project: ReviewableProject;
    accessToken?: string;
    editing: boolean;
  } | null>(null);
  const [reviewedProjectIds, setReviewedProjectIds] = useState<number[]>([]);
  const [reviewsByProject, setReviewsByProject] = useState<Record<number, VerifiedProjectReview>>({});
  const [reviewNotice, setReviewNotice] = useState('');
  const [requestView, setRequestView] = useState<'active' | 'completed'>('active');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RequestEditForm | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [requestSync, setRequestSync] = useState<{
    identity: number | 'guest' | 'restricted' | null;
    status: 'loading' | 'ready' | 'error';
  }>({ identity: null, status: 'loading' });

  const startEditing = (request: QuoteDraft, id: string) => {
    setEditingRequestId(id);
    setEditForm({
      customer_phone: request.phone,
      system_kwp: String(request.systemKWp),
      battery_kwh: String(request.batteryKWh),
      panel_count: String(request.panelCount),
      governorate: request.governorate,
      district: request.district,
      notes: request.notes,
    });
    setEditError('');
  };

  const saveEdits = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRequestId || !editForm) return;
    setEditBusy(true);
    setEditError('');
    try {
      await updateRequest(editingRequestId, {
        customer_phone: editForm.customer_phone.replace(/\D/g, ''),
        system_kwp: Number(editForm.system_kwp),
        battery_kwh: Number(editForm.battery_kwh),
        panel_count: Number(editForm.panel_count),
        details: {
          governorate: editForm.governorate,
          district: editForm.district,
          notes: editForm.notes,
        },
      });
      setEditingRequestId(null);
      setEditForm(null);
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : t('my.editFailed'));
    } finally {
      setEditBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (authLoading) {
      setRequestSync({ identity: null, status: 'loading' });
      return () => { cancelled = true; };
    }
    const authenticatedClient = user?.role === 'client';
    const identity = user
      ? authenticatedClient ? user.id : 'restricted'
      : 'guest';
    if (!authenticatedClient && user) {
      setRequestSync({ identity, status: 'ready' });
      return () => { cancelled = true; };
    }
    const sync = () => {
      setRequestSync({ identity, status: 'loading' });
      refreshFromServer(authenticatedClient)
        .then(() => {
          if (!cancelled) setRequestSync({ identity, status: 'ready' });
        })
        .catch((cause) => {
          console.warn('[utu] could not load requests for the active account:', cause);
          if (!cancelled) setRequestSync({ identity, status: 'error' });
        });
    };
    sync();
    const timer = window.setInterval(sync, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authLoading, refreshFromServer, user?.id, user?.role]);

  const nameOf = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? pick(c.name) : id;
  };

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const currentIdentity = authLoading
    ? null
    : user ? user.role === 'client' ? user.id : 'restricted' : 'guest';
  const requestsReady = requestSync.status === 'ready' && requestSync.identity === currentIdentity;
  const visibleRequests = requestsReady && currentIdentity !== 'restricted' ? requests : [];
  const activeRequests = visibleRequests.filter((request) => {
    const completedCompanyIds = new Set(request.completedProjects.map((project) => String(project.company_id)));
    const companyStatuses = Object.entries(request.statuses);
    return companyStatuses.length === 0 || companyStatuses.some(([companyId, status]) => (
      status !== 'declined' && !(status === 'selected' && completedCompanyIds.has(companyId))
    ));
  });
  const completedProjects = [...new Map(visibleRequests.flatMap((request) => request.completedProjects.map((project) => ({
    request,
    project,
    quote: request.quotes[String(project.company_id)],
    accepted: request.statuses[String(project.company_id)] === 'selected',
    reviewed: project.reviewed || reviewedProjectIds.includes(project.id),
    reviewEligible: project.review_eligible === true
      && project.status === 'completed'
      && project.company_verification_status === 'verified',
    review: reviewsByProject[project.id] ?? project.review ?? null,
    accessToken: getRequestAccessToken(request.id),
  }))).map((item) => [item.project.id, item])).values()];

  useEffect(() => {
    const navigateToRequest = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      const requestId = params.get('requestId');
      if (!requestId || !requestsReady) return;

      const hasActiveRequest = activeRequests.some((request) => request.id === requestId);
      const hasCompletedRequest = completedProjects.some((item) => item.request.id === requestId);
      const targetView = hasActiveRequest ? 'active' : hasCompletedRequest ? 'completed' : null;
      if (targetView && targetView !== requestView) {
        setRequestView(targetView);
        return;
      }

      window.requestAnimationFrame(() => {
        const target = Array.from(document.querySelectorAll<HTMLElement>('[data-notification-request-id]'))
          .find((element) => element.dataset.notificationRequestId === requestId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };
    navigateToRequest();
    window.addEventListener('hashchange', navigateToRequest);
    return () => window.removeEventListener('hashchange', navigateToRequest);
  }, [activeRequests, completedProjects, requestView, requestsReady]);

  return (
    <>
      <FlowHeader />
      <main id="main" className="min-h-[60vh] bg-bg-page pb-20">
        <div className="container-page">
          <header className="border-b border-line-subtle py-8">
            <h1 className="text-h2 text-content-primary">{t('my.title')}</h1>
          </header>

          {!requestsReady && requestSync.status !== 'error' ? (
            <p role="status" className="mt-10 border-y border-line-subtle py-8 text-body text-content-secondary">
              {t('my.loading')}
            </p>
          ) : requestSync.status === 'error' && requestSync.identity === currentIdentity ? (
            <p role="alert" className="mt-10 rounded-lg border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-5 py-4 text-body text-[var(--status-danger)]">
              {t('my.loadFailed')}
            </p>
          ) : (
            <>
              <div role="tablist" aria-label={t('my.requestViews')} className="mt-6 flex flex-wrap gap-2 border-b border-line-subtle">
                <button
                  type="button"
                  role="tab"
                  aria-selected={requestView === 'active'}
                  onClick={() => setRequestView('active')}
                  className={`border-b-2 px-4 py-3 text-label transition-colors ${
                    requestView === 'active'
                      ? 'border-line-brand text-content-primary'
                      : 'border-transparent text-content-secondary hover:text-content-primary'
                  }`}
                >
                  {t('my.activeView')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={requestView === 'completed'}
                  onClick={() => setRequestView('completed')}
                  className={`border-b-2 px-4 py-3 text-label transition-colors ${
                    requestView === 'completed'
                      ? 'border-line-brand text-content-primary'
                      : 'border-transparent text-content-secondary hover:text-content-primary'
                  }`}
                >
                  {t('my.completedView')}
                </button>
              </div>

          {requestView === 'completed' ? completedProjects.length === 0 ? (
            <div role="status" className="mt-8 rounded-xl border border-dashed border-line bg-bg-surface px-6 py-12 text-center">
              <Icon name="file-check" size={32} className="mx-auto text-content-tertiary" aria-hidden="true" />
              <h2 className="mt-4 text-h4 text-content-primary">{t('my.noCompleted')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-body-sm text-content-secondary">{t('my.noCompletedBody')}</p>
            </div>
          ) : (
            <ul className="mt-8 flex flex-col gap-5">
              {completedProjects.map(({ request, project, quote, accepted, reviewed, reviewEligible, review, accessToken }) => (
                <li
                  key={project.id}
                  data-notification-request-id={request.id}
                  className="rounded-xl border border-line-subtle bg-bg-surface p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="numeric text-label-sm text-content-tertiary">{request.id}</p>
                      <h2 className="mt-1 text-h4 text-content-primary">{project.title}</h2>
                    </div>
                    <span className="rounded-full border border-[var(--status-success)] bg-[var(--status-success-bg)] px-3 py-1 text-label-sm text-[var(--status-success)]">
                      {t('my.stateCompleted')}
                    </span>
                  </div>
                  <dl className="mt-5 grid gap-x-6 gap-y-4 border-y border-line-subtle py-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-label-sm text-content-tertiary">{t('my.system')}</dt>
                      <dd className="numeric mt-1 text-label text-content-primary">
                        {project.system_kwp} kWp · {request.draft.panelCount} {t('res.unitPanels')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-label-sm text-content-tertiary">{t('my.battery')}</dt>
                      <dd className="numeric mt-1 text-label text-content-primary">
                        {project.battery_kwh ?? request.draft.batteryKWh} kWh
                      </dd>
                    </div>
                    <div>
                      <dt className="text-label-sm text-content-tertiary">{t('my.location')}</dt>
                      <dd className="mt-1 text-label text-content-primary">
                        {project.location_governorate}{project.location_district ? ` · ${project.location_district}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-label-sm text-content-tertiary">{t('my.company')}</dt>
                      <dd className="mt-1 text-label text-content-primary">{project.company_name}</dd>
                    </div>
                    <div>
                      <dt className="text-label-sm text-content-tertiary">{t('my.warranty')}</dt>
                      <dd className="mt-1 text-label text-content-primary">{quote?.warranty || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-label-sm text-content-tertiary">{t('my.installationDate')}</dt>
                      <dd className="mt-1 text-label text-content-primary">
                        {project.completed_at ? dateFmt.format(new Date(project.completed_at)) : '—'}
                      </dd>
                    </div>
                  </dl>
                  {review?.is_verified && (
                    <section className="mt-5 rounded-lg border border-line-brand bg-[var(--brand-subtle)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div
                          role="img"
                          aria-label={t('rate.aria', { s: review.rating })}
                          className="flex items-center gap-0.5 text-solar-500"
                        >
                          {Array.from({ length: 5 }, (_, index) => (
                            <Icon
                              key={index}
                              name="star"
                              size={16}
                              className={index < Math.round(review.rating) ? '' : 'opacity-30'}
                            />
                          ))}
                          <span className="numeric ms-1 text-label-sm text-content-primary">
                            {review.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface px-2.5 py-1 text-body-xs text-content-brand">
                          <Icon name="check" size={12} />
                          {t('rv.verifiedPurchase')}
                        </span>
                      </div>
                      <blockquote className="mt-2 text-body-sm text-content-secondary">{review.comment}</blockquote>
                      <p className="mt-2 text-label-sm text-content-tertiary">{review.client_name}</p>
                    </section>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-label-sm text-content-secondary">{t('my.reviewCompletedProject')}</p>
                    {reviewed && reviewEligible && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success)] bg-[var(--status-success-bg)] px-3 py-1.5 text-label-sm text-[var(--status-success)]">
                        <Icon name="check" size={14} />
                        {t('rv.reviewed')}
                      </span>
                    )}
                    {accepted && reviewEligible && (user?.role === 'client' || accessToken) && (
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => setReviewTarget({
                          project: {
                            id: project.id,
                            title: project.title,
                            company_name: project.company_name,
                            system_kwp: project.system_kwp,
                            location_governorate: project.location_governorate,
                            location_district: project.location_district,
                          },
                          accessToken,
                          editing: reviewed,
                        })}
                      >
                        {reviewed ? t('rv.editReview') : t('rv.reviewNow')}
                      </Button>
                    )}
                    {accepted && reviewEligible && !reviewed && user?.role !== 'client' && !accessToken ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="max-w-xs text-label-sm text-content-secondary">{t('rv.signInToReview')}</p>
                        <Button variant="secondary" size="md" onClick={openAuthModal}>
                          {t('rv.signInAction')}
                        </Button>
                      </div>
                    ) : !accepted ? (
                      <p className="max-w-xs text-label-sm text-content-tertiary">
                        {t('my.reviewWaitingAcceptance')}
                      </p>
                    ) : !reviewEligible ? (
                      <p className="max-w-xs text-label-sm text-content-tertiary">
                        {t('rv.companyNotVerified')}
                      </p>
                    ) : null}
                  </div>
                  {requestView === 'completed' && reviewTarget?.project.id === project.id && (
                    <ProjectReviewForm
                      project={reviewTarget.project}
                      authToken={user?.role === 'client' ? authToken : undefined}
                      accessToken={reviewTarget.accessToken}
                      editing={reviewTarget.editing}
                      onCancel={() => setReviewTarget(null)}
                      onSubmitted={(review) => {
                        invalidateCompanies();
                        setReviewedProjectIds((current) => current.includes(review.project_id)
                          ? current
                          : [...current, review.project_id]);
                        setReviewsByProject((current) => ({
                          ...current,
                          [review.project_id]: {
                            rating: review.rating,
                            client_name: review.client_name,
                            comment: review.comment,
                            is_verified: review.is_verified,
                          },
                        }));
                        setReviewTarget(null);
                        setReviewNotice(t(reviewTarget.editing ? 'rv.updated' : 'rv.submitted'));
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : activeRequests.length === 0 ? (
            <div
              role="status"
              className="mt-10 rounded-xl border border-dashed border-line bg-bg-surface px-6 py-16 text-center"
            >
              <Icon
                name="file-check"
                size={32}
                className="mx-auto text-content-tertiary"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-h4 text-content-primary">{t('my.empty')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-body-sm text-content-secondary">
                {t('my.emptyBody')}
              </p>
              <Button
                className="mt-6"
                trailingArrow
                onClick={() => {
                  window.location.hash = '#calculator';
                }}
              >
                {t('my.emptyCta')}
              </Button>
            </div>
          ) : (
            <ul className="mt-8 flex flex-col gap-8">
              {activeRequests.map((req) => {
                const gov = governorates.find((g) => g.id === req.draft.governorate);
                const quoted = Object.values(req.statuses).filter((s) => s === 'quoted' || s === 'selected').length;
                const hasCompletedAcceptedProject = req.completedProjects.some(
                  (project) => req.statuses[String(project.company_id)] === 'selected',
                );
                const requestStatus = hasCompletedAcceptedProject
                  ? 'completed'
                  : Object.values(req.statuses).includes('selected')
                    ? 'accepted'
                    : quoted > 0
                      ? 'quotes_received'
                      : 'pending';
                const greenVerificationId = Object.entries(req.greenVerificationIds ?? {})
                  .find(([companyId]) => req.statuses[companyId] === 'selected')?.[1];
                const acceptedCompanyId = Object.entries(req.statuses)
                  .find(([, status]) => status === 'selected')?.[0];
                const acceptedQuote = acceptedCompanyId ? req.quotes[acceptedCompanyId] : undefined;

                return (
                  <li
                    key={req.id}
                    data-notification-request-id={req.id}
                    className="rounded-xl border border-line-subtle bg-bg-surface p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="numeric text-label text-content-primary">{req.id}</p>
                        <p className="mt-1 text-label-sm text-content-tertiary">
                          {t('my.sent', { d: dateFmt.format(new Date(req.createdAt)) })}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'numeric rounded-full border px-3 py-1 text-label-sm',
                          quoted > 0
                            ? 'border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                            : 'border-line-subtle bg-bg-subtle text-content-tertiary',
                        )}
                      >
                        {t('my.quotesIn', { n: quoted, total: req.draft.companyIds.length })}
                      </p>
                    </div>
                    <p className="mt-3 inline-flex rounded-full border border-line-subtle bg-bg-subtle px-3 py-1 text-label-sm text-content-secondary">
                      {t(({
                        pending: 'my.statePending',
                        quotes_received: 'my.stateQuotesReceived',
                        accepted: 'my.stateAccepted',
                        completed: 'my.stateCompleted',
                      } as const)[requestStatus])}
                    </p>
                    {req.draft.greenInitiative && (
                      <p className="mt-2 inline-flex rounded-full border border-line-brand bg-[var(--brand-subtle)] px-3 py-1 text-label-sm text-content-primary">
                        {t('green.badge')}
                      </p>
                    )}
                    {greenVerificationId && (
                      <a
                        className="mt-3 inline-flex rounded-md border border-line-brand px-3 py-2 text-label text-content-primary underline"
                        href={`#/verify/${encodeURIComponent(greenVerificationId)}`}
                      >
                        {t('green.verificationLink')}
                      </a>
                    )}

                    <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-y border-line-subtle py-4">
                      <div>
                        <dt className="text-label-sm text-content-tertiary">{t('my.system')}</dt>
                        <dd className="numeric mt-0.5 text-label text-content-primary">
                          {req.draft.systemKWp} kWp · {req.draft.panelCount}{' '}
                          {t('res.unitPanels')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-label-sm text-content-tertiary">{t('my.location')}</dt>
                        <dd className="mt-0.5 text-label text-content-primary">
                          {gov ? pick(gov.name) : '—'}
                          {req.draft.district ? ` · ${req.draft.district}` : ''}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex justify-end">
                      {editingRequestId === req.id ? (
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            setEditingRequestId(null);
                            setEditForm(null);
                            setEditError('');
                          }}
                        >
                          {t('my.cancelEdit')}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => startEditing(req.draft, req.id)}
                        >
                          {t('my.editDetails')}
                        </Button>
                      )}
                    </div>

                    {editingRequestId === req.id && editForm && (
                      <form
                        className="mt-4 grid gap-4 rounded-lg border border-line-subtle bg-bg-subtle p-4 sm:grid-cols-2"
                        onSubmit={saveEdits}
                      >
                        <label className="grid gap-1.5 text-label-sm text-content-secondary">
                          {t('my.phone')}
                          <input
                            required
                            type="tel"
                            inputMode="numeric"
                            pattern="07[0-9]{9}"
                            maxLength={11}
                            value={editForm.customer_phone}
                            onChange={(event) => setEditForm({ ...editForm, customer_phone: event.target.value })}
                            className="rounded-md border border-line bg-bg-surface px-3 py-2 text-label text-content-primary"
                          />
                        </label>
                        <label className="grid gap-1.5 text-label-sm text-content-secondary">
                          {t('my.capacity')}
                          <input
                            required
                            type="number"
                            min="0.1"
                            max="5000"
                            step="any"
                            value={editForm.system_kwp}
                            onChange={(event) => setEditForm({ ...editForm, system_kwp: event.target.value })}
                            className="rounded-md border border-line bg-bg-surface px-3 py-2 text-label text-content-primary"
                          />
                        </label>
                        <label className="grid gap-1.5 text-label-sm text-content-secondary">
                          {t('my.battery')}
                          <input
                            required
                            type="number"
                            min="0"
                            max="10000"
                            step="any"
                            value={editForm.battery_kwh}
                            onChange={(event) => setEditForm({ ...editForm, battery_kwh: event.target.value })}
                            className="rounded-md border border-line bg-bg-surface px-3 py-2 text-label text-content-primary"
                          />
                        </label>
                        <label className="grid gap-1.5 text-label-sm text-content-secondary">
                          {t('my.panels')}
                          <input
                            required
                            type="number"
                            min="1"
                            max="10000"
                            step="1"
                            value={editForm.panel_count}
                            onChange={(event) => setEditForm({ ...editForm, panel_count: event.target.value })}
                            className="rounded-md border border-line bg-bg-surface px-3 py-2 text-label text-content-primary"
                          />
                        </label>
                        <label className="grid gap-1.5 text-label-sm text-content-secondary">
                          {t('my.location')}
                          <select
                            required
                            value={editForm.governorate}
                            onChange={(event) => setEditForm({ ...editForm, governorate: event.target.value })}
                            className="platform-select"
                          >
                            <option value="">{t('s2.governoratePlaceholder')}</option>
                            {governorates.map((item) => (
                              <option key={item.id} value={item.id}>{pick(item.name)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-label-sm text-content-secondary">
                          {t('my.district')}
                          <input
                            required
                            maxLength={120}
                            value={editForm.district}
                            onChange={(event) => setEditForm({ ...editForm, district: event.target.value })}
                            className="rounded-md border border-line bg-bg-surface px-3 py-2 text-label text-content-primary"
                          />
                        </label>
                        <label className="grid gap-1.5 text-label-sm text-content-secondary sm:col-span-2">
                          {t('my.notes')}
                          <textarea
                            maxLength={2000}
                            rows={3}
                            value={editForm.notes}
                            onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}
                            className="rounded-md border border-line bg-bg-surface px-3 py-2 text-label text-content-primary"
                          />
                        </label>
                        {editError && (
                          <p role="alert" className="text-body-sm text-[var(--status-danger)] sm:col-span-2">
                            {editError}
                          </p>
                        )}
                        <div className="flex gap-3 sm:col-span-2">
                          <Button type="submit" loading={editBusy}>{t('my.saveEdits')}</Button>
                          <Button
                            variant="secondary"
                            type="button"
                            disabled={editBusy}
                            onClick={() => {
                              setEditingRequestId(null);
                              setEditForm(null);
                              setEditError('');
                            }}
                          >
                            {t('my.cancelEdit')}
                          </Button>
                        </div>
                      </form>
                    )}

                    <ul className="mt-4 flex flex-col gap-2.5">
                      {req.draft.companyIds.map((cid) => {
                        const s = STATUS[req.statuses[cid] ?? 'sent'];
                        return (
                          <li
                            key={cid}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4 py-3"
                          >
                            <span className="flex flex-wrap items-center gap-2 text-label text-content-primary">
                              {nameOf(cid)}
                              {companies.find((company) => company.id === cid) && (
                                <VerificationBadge
                                  status={companies.find((company) => company.id === cid)!.status}
                                />
                              )}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-sm',
                                s.className,
                              )}
                            >
                              <Icon name={s.icon} size={13} />
                              {t(s.label)}
                            </span>
                            {Number.isInteger(Number(cid)) && (
                              <div className="basis-full">
                                <RequestChat
                                  groupId={req.id}
                                  companyId={Number(cid)}
                                  companyName={nameOf(cid)}
                                  requestSummary={`${req.draft.systemKWp} kWp · ${req.draft.batteryKWh} kWh`}
                                  quoteTotal={req.quotes[cid]?.total_iqd}
                                  accessToken={getRequestAccessToken(req.id) || undefined}
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    <QuoteComparison request={req} />

                    {acceptedQuote?.financing
                      && acceptedQuote.down_payment_iqd != null
                      && acceptedQuote.monthly_installment_iqd != null
                      && acceptedQuote.installment_months != null && (
                      <section className="mt-6 rounded-xl border border-line-brand bg-[var(--brand-subtle)] p-5">
                        <h3 className="text-h4 text-content-primary">{t('cmp.paymentSchedule')}</h3>
                        <p className="mt-1 text-body-sm text-content-secondary">
                          {t('cmp.directFinancingHelp')}
                        </p>
                        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <dt className="text-label-sm text-content-tertiary">{t('cmp.totalPrice')}</dt>
                            <dd className="numeric mt-1 text-label text-content-primary">
                              {acceptedQuote.total_iqd.toLocaleString('en-US')} IQD
                            </dd>
                          </div>
                          <div>
                            <dt className="text-label-sm text-content-tertiary">{t('cmp.downPayment')}</dt>
                            <dd className="numeric mt-1 text-label text-content-primary">
                              {acceptedQuote.down_payment_iqd.toLocaleString('en-US')} IQD
                            </dd>
                          </div>
                          <div>
                            <dt className="text-label-sm text-content-tertiary">{t('cmp.monthlyInstallment')}</dt>
                            <dd className="numeric mt-1 text-label text-content-primary">
                              {acceptedQuote.monthly_installment_iqd.toLocaleString('en-US')} IQD × {acceptedQuote.installment_months} {t('cmp.installments')}
                            </dd>
                          </div>
                        </dl>
                      </section>
                    )}

                    {req.completedProjects.length === 0 && (
                      <p role="status" className="mt-4 rounded-md border border-line-subtle bg-bg-subtle px-4 py-3 text-body-sm text-content-secondary">
                        {quoted > 0 ? t('my.reviewWaitingCompletion') : t('my.reviewWaitingQuote')}
                      </p>
                    )}

                    {req.completedProjects.length > 0 && (
                      <section className="mt-6 border-t border-line-subtle pt-5">
                        <h3 className="text-label text-content-primary">{t('rv.project')}</h3>
                        <ul className="mt-3 flex flex-col gap-3">
                          {req.completedProjects.map((project) => {
                            const accepted = req.statuses[String(project.company_id)] === 'selected';
                            const reviewEligible = project.review_eligible === true
                              && project.status === 'completed'
                              && project.company_verification_status === 'verified';
                            const reviewed = accepted && (project.reviewed || reviewedProjectIds.includes(project.id));
                            const review = reviewsByProject[project.id] ?? project.review;
                            const accessToken = getRequestAccessToken(req.id);
                            return (
                              <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4 py-3">
                                <div>
                                  <p className="text-label text-content-primary">{project.title}</p>
                                  <p className="mt-1 text-label-sm text-content-tertiary">
                                    {project.company_name} · {project.location_governorate}, {project.location_district} · {project.system_kwp} kWp
                                  </p>
                                </div>
                                {reviewed && reviewEligible ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--status-success)] bg-[var(--status-success-bg)] px-3 py-1.5 text-label-sm text-[var(--status-success)]">
                                    <Icon name="check" size={14} />{t('rv.reviewed')}
                                  </span>
                                ) : !accepted ? (
                                  <p className="max-w-xs text-label-sm text-content-tertiary">{t('my.reviewWaitingAcceptance')}</p>
                                ) : !reviewEligible ? (
                                  <p className="max-w-xs text-label-sm text-content-tertiary">{t('rv.companyNotVerified')}</p>
                                ) : user?.role === 'client' || accessToken ? (
                                  <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={() => setReviewTarget({
                                      project: {
                                        id: project.id,
                                        title: project.title,
                                        company_name: project.company_name,
                                        system_kwp: project.system_kwp,
                                        location_governorate: project.location_governorate,
                                        location_district: project.location_district,
                                      },
                                      accessToken,
                                      editing: false,
                                    })}
                                  >
                                    {t('rv.reviewNow')}
                                  </Button>
                                ) : (
                                  <Button variant="secondary" size="md" onClick={openAuthModal}>
                                    {t('rv.signInAction')}
                                  </Button>
                                )}
                                {review?.is_verified && reviewEligible && (
                                  <div className="basis-full rounded-lg border border-line-brand bg-[var(--brand-subtle)] p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        role="img"
                                        aria-label={t('rate.aria', { s: review.rating })}
                                        className="flex items-center text-solar-500"
                                      >
                                        {Array.from({ length: 5 }, (_, index) => (
                                          <Icon
                                            key={index}
                                            name="star"
                                            size={15}
                                            className={index < Math.round(review.rating) ? '' : 'opacity-30'}
                                          />
                                        ))}
                                      </span>
                                      <span className="rounded-full bg-bg-surface px-2 py-1 text-body-xs text-content-brand">{t('rv.verifiedPurchase')}</span>
                                    </div>
                                    <p className="mt-2 text-body-sm text-content-secondary">{review.comment}</p>
                                    <p className="mt-1 text-label-sm text-content-tertiary">{review.client_name}</p>
                                  </div>
                                )}
                                {requestView === 'active' && reviewTarget?.project.id === project.id && (
                                  <div className="w-full">
                                    <ProjectReviewForm
                                      project={reviewTarget.project}
                                      authToken={user?.role === 'client' ? authToken : undefined}
                                      accessToken={reviewTarget.accessToken}
                                      editing={reviewTarget.editing}
                                      onCancel={() => setReviewTarget(null)}
                                      onSubmitted={(review) => {
                                        invalidateCompanies();
                                        setReviewedProjectIds((current) => current.includes(review.project_id)
                                          ? current
                                          : [...current, review.project_id]);
                                        setReviewsByProject((current) => ({
                                          ...current,
                                          [review.project_id]: {
                                            rating: review.rating,
                                            client_name: review.client_name,
                                            comment: review.comment,
                                            is_verified: review.is_verified,
                                          },
                                        }));
                                        setReviewTarget(null);
                                        setReviewNotice(t(reviewTarget.editing ? 'rv.updated' : 'rv.submitted'));
                                      }}
                                    />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
            </>
          )
          }

          {reviewNotice && (
            <p role="status" className="mt-5 rounded-lg border border-[var(--status-success)] bg-[var(--status-success-bg)] px-4 py-3 text-body-sm text-[var(--status-success)]">
              {reviewNotice}
            </p>
          )}

          <div className="mt-10">
            <Button
              variant="secondary"
              onClick={() => {
                window.location.hash = paths.home;
              }}
            >
              {t('done.home')}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
