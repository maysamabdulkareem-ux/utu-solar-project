import { useMemo, useState } from 'react';
import { FlowHeader } from '../components/layout/FlowHeader';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { RecommendationTiers } from '../components/assessment/RecommendationTiers';
import { EnergyImpactSection } from '../components/assessment/EnergyImpactSection';
import { CompanySuggestions } from '../components/assessment/CompanySuggestions';
import { UtuAssistant } from '../components/assessment/UtuAssistant';
import { useSolarEstimate } from '../components/calculator/useSolarEstimate';
import { useAssessment } from '../state/AssessmentProvider';
import { useQuoteRequest } from '../state/QuoteRequestProvider';
import { useCompanies } from '../api/useCompanies';
import { useLanguage } from '../i18n/LanguageProvider';
import { paths } from '../routes/useHashRoute';
import {
  buildEnergyImpact,
  buildInsight,
  buildTiers,
  companiesThatCanQuote,
  tierToQuoteSystem,
  type TierId,
} from '../assessment/utuAssessment';

function goTo(hash: string) {
  window.location.hash = hash;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/**
 * UTU system assessment: three options → why this size → energy mix →
 * verified companies → UTU assistant.
 *
 * Input is the appliance list handed over by the smart calculator. Sizing
 * uses the same `useSolarEstimate` maths as the calculator; the page only
 * interprets it and hands the chosen option to the quote request.
 */
export function AssessmentPage() {
  const { t } = useLanguage();
  const { appliances } = useAssessment();
  const { startFromSystem } = useQuoteRequest();
  const { companies, source } = useCompanies();
  const [selectedTier, setSelectedTier] = useState<TierId>('balanced');
  const [assistantOpen, setAssistantOpen] = useState(false);

  const estimate = useSolarEstimate(appliances ?? []);
  const tiers = useMemo(() => buildTiers(estimate), [estimate]);
  const insight = useMemo(() => buildInsight(appliances ?? [], estimate), [appliances, estimate]);
  const impact = useMemo(() => buildEnergyImpact(estimate, tiers[selectedTier]), [estimate, tiers, selectedTier]);
  const quotable = useMemo(() => companiesThatCanQuote(companies), [companies]);

  const requestQuotes = (companyIds: string[] = []) => {
    startFromSystem(tierToQuoteSystem(tiers[selectedTier]), companyIds);
    goTo(paths.request);
  };

  if (!appliances || appliances.length === 0 || estimate.dailyWh === 0) {
    return (
      <>
        <FlowHeader />
        <main id="main" className="grid min-h-[70vh] place-items-center px-4">
          <div className="max-w-sm text-center">
            <Icon name="calculator" size={32} className="mx-auto text-content-tertiary" aria-hidden="true" />
            <p className="mt-4 text-body text-content-secondary">{t('as.empty')}</p>
            <Button className="mt-5" trailingArrow onClick={() => { window.location.hash = '#calculator'; }}>
              {t('as.emptyCta')}
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <FlowHeader />
      <main id="main" className="bg-bg-page pb-24">
        <header className="container-page flex flex-wrap items-start justify-between gap-6 pt-10">
          <div className="min-w-0 flex-1">
            <a href="#calculator" className="inline-flex items-center gap-1.5 text-label-sm text-content-brand underline underline-offset-2">
              <Icon name="arrow-right" size={14} className="-scale-x-100 rtl:scale-x-100" />
              {t('as.back')}
            </a>
            <h1 className="mt-4 text-h1 text-content-primary">{t('as.title')}</h1>
            <p className="mt-2 max-w-2xl text-body text-content-secondary">{t('as.subtitle')}</p>
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              aria-haspopup="dialog"
              className="mt-5 inline-flex items-center gap-3 rounded-xl border-[1.5px] border-line-brand bg-[var(--brand-subtle)] px-4 py-3 text-start transition-colors hover:bg-bg-surface"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-content-on-brand">
                <Icon name="zap" size={17} />
              </span>
              <span>
                <span className="block text-label font-semibold text-content-primary">{t('as.assistant.inlineTitle')}</span>
                <span className="block text-label-sm text-content-secondary">{t('as.assistant.inlineBody')}</span>
              </span>
            </button>
          </div>
          {/* Top-corner entry to the assistant (left in Arabic, right in English). */}
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            aria-haspopup="dialog"
            className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-3.5 text-label font-semibold text-content-on-brand shadow-lg ring-4 ring-[var(--brand-subtle)] transition-colors hover:bg-[var(--brand-primary-hover)]"
          >
            <Icon name="zap" size={17} />
            {t('as.assistant.entry')}
          </button>
        </header>

        <RecommendationTiers
          tiers={tiers}
          appliances={appliances}
          estimate={estimate}
          insight={insight}
          selected={selectedTier}
          onSelect={setSelectedTier}
          onRequestQuotes={() => requestQuotes()}
        />
        <EnergyImpactSection impact={impact} />
        <CompanySuggestions
          companies={quotable}
          loading={source === 'loading'}
          onRequestFrom={(companyId) => requestQuotes([companyId])}
        />
      </main>
      <Footer />

      <UtuAssistant
        estimate={estimate}
        tier={tiers[selectedTier]}
        insight={insight}
        companyCount={quotable.length}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        showFloatingButton={false}
      />
    </>
  );
}
