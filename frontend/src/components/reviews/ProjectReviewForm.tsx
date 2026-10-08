import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiReview } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import type { ReviewableProject } from './AddReviewModal';

export function ProjectReviewForm({
  project,
  authToken,
  accessToken,
  editing,
  onCancel,
  onSubmitted,
}: {
  project: ReviewableProject;
  authToken?: string;
  accessToken?: string;
  editing: boolean;
  onCancel: () => void;
  onSubmitted: (review: ApiReview) => void;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [workQualityRating, setWorkQualityRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(editing);
  const [reviewLoaded, setReviewLoaded] = useState(!editing);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing || !authToken) return;
    let cancelled = false;
    api.myProjectReview(project.id, authToken)
      .then((review) => {
        if (cancelled) return;
        if (!review) {
          setError(t('rv.error'));
          setBusy(false);
          return;
        }
        setRating(review.rating);
        setCommunicationRating(review.communication_rating);
        setWorkQualityRating(review.work_quality_rating);
        setComment(review.comment);
        setReviewLoaded(true);
        setBusy(false);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : t('rv.error'));
          setBusy(false);
        }
      });
    return () => { cancelled = true; };
  }, [authToken, editing, project.id, t]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      project_id: project.id,
      rating,
      communication_rating: communicationRating,
      work_quality_rating: workQualityRating,
      comment,
      ...(!authToken && accessToken ? { access_token: accessToken } : {}),
    };
    try {
      const review = editing && authToken
        ? await api.updateReview(body, authToken)
        : await api.createReview(body, authToken);
      onSubmitted(review);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(
        message === 'You can only review companies after completing a project with them.'
          ? t('rv.notEligible')
          : message.startsWith('A review already exists')
            ? t('rv.duplicate')
            : message || t('rv.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const ratingField = (
    label: string,
    value: number,
    onChange: (next: number) => void,
  ) => (
    <fieldset className="grid gap-2">
      <legend className="text-label-sm text-content-secondary">{label}</legend>
      <div className="flex gap-1" role="group" aria-label={label} dir="ltr">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-label={t('rv.ratingValue', { label, s: score })}
            aria-pressed={score === value}
            disabled={busy}
            onClick={() => onChange(score)}
            className="rounded p-1 text-solar-500 hover:bg-bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Icon name="star" size={22} className={score <= value ? 'text-solar-500' : 'text-sand-300'} />
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-review-title"
        className="grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-xl border border-line-subtle bg-bg-surface p-5 shadow-2xl sm:p-7"
        onSubmit={submit}
      >
        <h2 id="project-review-title" className="text-h3 text-content-primary">
          {editing ? t('rv.editReview') : t('rv.addReview')}
        </h2>
        {editing && !reviewLoaded ? (
          <>
            {busy && <p role="status" className="text-body-sm text-content-secondary">{t('rv.loadingReview')}</p>}
            {error && <p role="alert" className="text-body-sm text-[var(--status-danger)]">{error}</p>}
            {!busy && <Button type="button" variant="secondary" onClick={onCancel}>{t('rv.cancel')}</Button>}
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {ratingField(t('rv.overall'), rating, setRating)}
              {ratingField(t('rv.communication'), communicationRating, setCommunicationRating)}
              {ratingField(t('rv.workQuality'), workQualityRating, setWorkQualityRating)}
            </div>
            <Textarea
              label={t('rv.writeReview')}
              minLength={10}
              maxLength={2000}
              required
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            {error && <p role="alert" className="text-body-sm text-[var(--status-danger)]">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={busy}>{editing ? t('rv.updateReview') : t('rv.submitReview')}</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
                {t('rv.cancel')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
