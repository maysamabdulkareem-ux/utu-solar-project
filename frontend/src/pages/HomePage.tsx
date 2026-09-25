import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../sections/Hero';
import { CalculatorSection } from '../sections/CalculatorSection';
import { HowItWorks } from '../sections/HowItWorks';
import { Companies } from '../sections/Companies';
import { Projects } from '../sections/Projects';
import { Trust } from '../sections/Trust';
import { WarrantySection } from '../sections/WarrantySection';
import { Reviews } from '../sections/Reviews';
import { FinalCTA } from '../sections/FinalCTA';

/**
 * Homepage composition.
 *
 * Section order follows the user journey the product promises:
 * discover -> calculate -> understand the process -> compare companies ->
 * see real projects -> check trust and warranty -> read reviews -> convert.
 */
export function HomePage() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <CalculatorSection />
        <HowItWorks />
        <Companies />
        <Projects />
        <Trust />
        <WarrantySection />
        <Reviews />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
