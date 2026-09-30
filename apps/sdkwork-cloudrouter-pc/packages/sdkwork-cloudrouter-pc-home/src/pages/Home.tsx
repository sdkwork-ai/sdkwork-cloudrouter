import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { ModelShowcase } from '@sdkwork/cloudrouter-pc-models';
import { SupportedModalities } from '../components/SupportedModalities';
import { CtaSection } from '../components/CtaSection';
import { DownloadSection } from '../components/DownloadSection';
import { useHomeContent } from '../content/useHomeContent';

/**
 * The landing page composition root.
 *
 * Section order is fixed in code; *whether* a section renders is operator-controlled from
 * `/admin/site`, so a deployment that only sells the gateway can drop the model showcase without a
 * rebuild. Ordering itself is not configurable on purpose — a drag-and-drop layout would make the
 * page's accessibility order a per-deployment variable for no gain the operator has asked for.
 */
export function Home() {
  const { sections } = useHomeContent();

  return (
    <main>
      {sections.hero && <Hero />}
      {sections.modalities && <SupportedModalities />}
      {sections.features && <Features />}
      {sections.models && <ModelShowcase />}
      {sections.cta && <CtaSection />}
      {sections.download && <DownloadSection />}
    </main>
  );
}
