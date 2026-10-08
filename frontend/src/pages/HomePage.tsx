import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../sections/Hero';
import { CalculatorSection } from '../sections/CalculatorSection';
import { HowItWorks } from '../sections/HowItWorks';
import { PaymentGateways } from '../sections/PaymentGateways';
import { Companies } from '../sections/Companies';
import { Projects } from '../sections/Projects';
import { Trust } from '../sections/Trust';
import { WarrantySection } from '../sections/WarrantySection';
import { CustomerReviews } from '../sections/CustomerReviews';
import { FinalCTA } from '../sections/FinalCTA';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * Homepage composition.
 *
 * Section order follows the user journey the product promises:
 * discover -> calculate -> understand the process -> compare companies ->
 * see real projects -> check trust and warranty -> read reviews -> convert.
 */
export function HomePage() {
  const { lang } = useLanguage();

  return (
    <>
      <Header />
      <main id="main">
        <p role="note" className="border-b border-line-subtle bg-bg-subtle px-4 py-2.5 text-center text-label-sm text-content-secondary">
          {lang === 'ar'
            ? 'نسخة تجريبية: الأرقام والصور والمشاريع أمثلة. قد تظهر مراجعات العملاء الموثّقة مع مراجعات تجريبية.'
            : 'Preview: displayed figures, photos and projects are examples. Verified customer reviews may appear alongside sample reviews.'}
        </p>
        <Hero />
        <CalculatorSection />
        <HowItWorks />
        <PaymentGateways />
        <Companies />
        <Projects />
        <Trust />
        <WarrantySection />
        <CustomerReviews />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
