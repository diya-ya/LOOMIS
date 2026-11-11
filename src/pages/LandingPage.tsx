import { Hero } from '@/components/landing/Hero';
import { FeatureSection } from '@/components/landing/FeatureSection';

export function LandingPage() {
  return (
    <div className="bg-[var(--color-bg)]">
      <Hero />
      <FeatureSection />
    </div>
  );
}
