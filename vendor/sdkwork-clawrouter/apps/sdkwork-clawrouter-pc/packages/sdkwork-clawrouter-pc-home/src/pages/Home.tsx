import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { ModelShowcase } from '@sdkwork/clawrouter-pc-models';
import { SupportedModalities } from '../components/SupportedModalities';
import { DownloadSection } from '../components/DownloadSection';

export function Home() {
  return (
    <main>
      <Hero />
      <SupportedModalities />
      <Features />
      <ModelShowcase />
      <DownloadSection />
    </main>
  );
}
