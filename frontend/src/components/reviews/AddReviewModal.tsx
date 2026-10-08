import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type ApiReview } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

export type ReviewableProject = {
  id: number;
  title: string;
  company_name: string;
  system_kwp: number;
  location_governorate: string;
  location_district: string;
};

export function AddReviewModal({
  project,
  accessToken,
  onClose,
  onSubmitted,
}: {
  project: ReviewableProject;
  accessToken: string;
  onClose: () => void;
  onSubmitted: (review: ApiReview) => void;
}) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [rating, setRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [workQualityRating, setWorkQualityRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const review = await api.createReview({
        project_id: project.id,
        access_token: accessToken,
        rating,
        communication_rating: communicationRating,
        work_quality_rating: workQualityRating,
        comment,
      });
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
    name: string,
  ) => (
    <label className="flex flex-col gap-1.5 text-label-sm text-content-secondary">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="platform-select"
      >
        {[5, 4, 3, 2, 1].map((score) => (
          <option key={score} value={score}>{score} / 5</option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-review-heading"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-bg-surface p-5 shadow-2xl sm:rounded-xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-review-heading" className="text-h3 text-content-primary">{t('rv.addReview')}</h2>
            <p className="mt-1 text-body-sm text-content-secondary">
              {project.title} · {project.company_name}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('rv.close')}
            disabled={busy}
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-bg-subtle"
          >
            <Icon name="x-mark" size={18} />
          </button>
        </div>

        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-3">
            {ratingField(t('rv.overall'), rating, setRating, 'rating')}
            {ratingField(t('rv.communication'), communicationRating, setCommunicationRating, 'communication_rating')}
            {ratingField(t('rv.workQuality'), workQualityRating, setWorkQualityRating, 'work_quality_rating')}
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
            <Button type="submit" loading={busy}>{t('rv.submitReview')}</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
              {t('rv.cancel')}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}