import { useMemo, useState } from 'react';
import { FlowHeader } from '../components/layout/FlowHeader';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { AnalyzingScreen } from '../components/assessment/AnalyzingScreen';
import { RecommendationTiers } from '../components/assessment/RecommendationTiers';
import { EnergyImpactSection } from '../components/assessment/EnergyImpactSection';
import { CompanyMatching } from '../components/assessment/CompanyMatching';
import { AIAssistant } from '../components/assessment/AIAssistant';
import { OptimizeSystem } from '../components/assessment/OptimizeSystem';
import { useSolarEstimate } from '../components/calculator/useSolarEstimate';
import { useAssessment } from '../state/AssessmentProvider';
import { useCompanies } from '../api/useCompanies';
import { useLanguage } from '../i18n/LanguageProvider';
import { paths } from '../routes/useHashRoute';
import {
  buildTiers,
  buildInsight,
  buildEnergyImpact,
  matchCompanies,
  type TierId,
} from '../ai/solarAssessment';

/**
 * Orchestrates the AI Solar Assessment: AI Analysis → AI Recommendations →
 * Why This System → Energy Impact → Company Matching → AI Assistant.
 *
 * Reads its input from `useAssessment()` (the appliance snapshot handed off
 * by the existing Solar Load Calculator) and does all its own sizing through
 * the same `useSolarEstimate` Calculation Engine the calculator uses — the AI
 * layer in `ai/solarAssessment.ts` only interprets that output, it never
 * recomputes physics on its own.
 */
export function AssessmentPage() {
  const { t } = useLanguage();
  const { appliances } = useAssessment();
  const [phase, setPhase] = useState<'analyzing' | 'results'>('analyzing');
  const [selectedTier, setSelectedTier] = useState<TierId>('balanced');

  const estimate = useSolarEstimate(appliances ?? []);
  const tiers = useMemo(() => buildTiers(estimate), [estimate]);
  const insight = useMemo(() => buildInsight(appliances ?? [], estimate), [appliances, estimate]);
  const impact = useMemo(() => buildEnergyImpact(estimate, tiers[selectedTier]), [estimate, tiers, selectedTier]);
  const { companies } = useCompanies();
  const matches = useMemo(() => matchCompanies(companies, tiers[selectedTier]), [companies, tiers, selectedTier]);

  if (!appliances || appliances.length === 0) {
    return (
      <>
        <FlowHeader />
        <main id="main" className="grid min-h-[70vh] place-items-center px-4">
          <div className="max-w-sm text-center">
            <Icon name="calculator" size={32} className="mx-auto text-content-tertiary" aria-hidden="true" />
            <p className="mt-4 text-body text-content-secondary">{t('ai.analyzing.empty')}</p>
            <Button
              className="mt-5"
              trailingArrow
              onClick={() => {
                window.location.hash = paths.home;
              }}
            >
              {t('ai.analyzing.emptyCta')}
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (phase === 'analyzing') {
    return (
      <>
        <FlowHeader />
        <main id="main" className="bg-bg-page">
          <AnalyzingScreen onDone={() => setPhase('results')} />
        </main>
      </>
    );
  }

  return (
    <>
      <FlowHeader />
      <main id="main" className="bg-bg-page pb-24">
        <RecommendationTiers
          tiers={tiers}
          appliances={appliances}
          estimate={estimate}
          insight={insight}
          selected={selectedTier}
          onSelect={setSelectedTier}
        />
        <EnergyImpactSection impact={impact} />
        <CompanyMatching matches={matches} tier={tiers[selectedTier]} />
        <OptimizeSystem estimate={estimate} tier={tiers[selectedTier]} />

        <div className="container-page mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.hash = paths.home;
            }}
          >
            {t('ai.backHome')}
          </Button>
        </div>
      </main>
      <Footer />

      <AIAssistant estimate={estimate} tier={tiers[selectedTier]} insight={insight} companyCount={matches.length} />
    </>
  );
}
