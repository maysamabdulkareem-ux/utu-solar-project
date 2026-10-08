import { useEffect, useState } from 'react';
import { api, type ApiReview } from '../api/client';
import { reviews as demoReviews, type Review } from '../data/content';
import { ReviewCard } from '../components/cards/ReviewCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { useLanguage } from '../i18n/LanguageProvider';

const ARABIC_COMPANY_NAMES: Record<string, string> = {
  'Rafidain Solar Systems': 'الرافدين للأنظمة الشمسية',
  'Tigris Energy Works': 'دجلة لأعمال الطاقة',
  'Al-Nahrain Renewables': 'النهرين للطاقة المتجددة',
};

const ARABIC_PROJECT_TITLES: Record<string, string> = {
  'Residential Solar System': 'منظومة شمسية سكنية',
  'Commercial Solar Installation': 'تركيب شمسي تجاري',
  'Hybrid Solar System': 'منظومة شمسية هجينة',
};

const ARABIC_GOVERNORATES: Record<string, string> = {
  Baghdad: 'بغداد',
  Basra: 'البصرة',
  Erbil: 'أربيل',
};

const ARABIC_DISTRICTS: Record<string, string> = {
  'Al-Jadriya': 'الجادرية',
  'Industrial Zone': 'المنطقة الصناعية',
  'Al-Zubair': 'الزبير',
};

const ARABIC_SAMPLE_CLIENTS: Record<string, string> = {
  'Ahmed M.': 'أحمد م.',
  'Erbil Business Park': 'مجمع أعمال أربيل',
  'Basra Homeowner': 'صاحب منزل من البصرة',
};

const ARABIC_SAMPLE_COMMENTS: Record<string, string> = {
  'The installation was tidy and the system has been reliable through the summer.':
    'كان التركيب مرتباً والمنظومة مستقرة طوال فصل الصيف.',
  'The project was delivered on schedule with a clear handover and monitoring setup.':
    'اكتمل المشروع في موعده مع تسليم واضح ونظام متابعة جاهز.',
  'The battery backup makes evening outages much easier to manage.':
    'بطارية التخزين جعلت التعامل مع انقطاعات المساء أسهل بكثير.',
};

function localized(en: string, ar: string) {
  return { en, ar };
}

function toReview(review: ApiReview): Review {
  const initials = review.client_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
  const locationEn = `${review.location_governorate} · ${review.location_district}`;
  const locationAr = `${ARABIC_GOVERNORATES[review.location_governorate] ?? review.location_governorate} · ${ARABIC_DISTRICTS[review.location_district] ?? review.location_district}`;

  return {
    id: String(review.id),
    rating: review.rating,
    initials: localized(initials, initials),
    name: localized(review.client_name, ARABIC_SAMPLE_CLIENTS[review.client_name] ?? review.client_name),
    role: localized('Verified customer', 'عميل موثّق'),
    body: localized(review.comment, ARABIC_SAMPLE_COMMENTS[review.comment] ?? review.comment),
    projectType: localized(`${review.system_kwp} kWp system`, `منظومة بقدرة ${review.system_kwp} kWp`),
    isVerified: review.is_verified,
    companyName: localized(
      review.company_name,
      ARABIC_COMPANY_NAMES[review.company_name] ?? review.company_name,
    ),
    projectTitle: localized(
      review.project_title,
      ARABIC_PROJECT_TITLES[review.project_title] ?? review.project_title,
    ),
    location: localized(locationEn, locationAr),
    systemKWp: review.system_kwp,
    communicationRating: review.communication_rating,
    workQualityRating: review.work_quality_rating,
    createdAt: review.created_at,
  };
}

export function CustomerReviews() {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>(demoReviews);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.publicReviews()
      .then((items) => {
        if (!cancelled) {
          const submitted = items.filter((item) => item.is_verified).map(toReview);
          setReviews([...submitted, ...demoReviews]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setReviews(demoReviews);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="section-y bg-bg-subtle">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-sunset-500)]">{t('rv.eyebrow')}</p>
          <h2 id="reviews-heading" className="mt-3 text-h1 text-content-primary">
            {t('rv.h2')}
          </h2>
          <p className="mt-3 text-body-lg text-content-secondary">{t('rv.lede')}</p>
        </Reveal>

        {loading ? (
          <p role="status" className="mt-10 border-y border-line-subtle py-8 text-body text-content-secondary">
            {t('rv.loading')}
          </p>
        ) : (
          <>
            {failed && (
              <p role="alert" className="mt-10 border-y border-line-subtle py-4 text-body-sm text-content-secondary">
                {t('rv.loadError')}
              </p>
            )}
            {reviews.length === 0 ? (
              <p className="mt-10 border-y border-line-subtle py-8 text-body text-content-secondary">
                {t('rv.empty')}
              </p>
            ) : (
              <Reveal stagger as="ul" className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <RevealItem key={review.id} as="li" className="h-full">
                    <ReviewCard review={review} />
                  </RevealItem>
                ))}
              </Reveal>
            )}
          </>
        )}
      </div>
    </section>
  );
}