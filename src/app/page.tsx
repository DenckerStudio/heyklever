import { TimelineSection } from "@/components/sections/timeline";

import { NavbarSection } from "@/components/sections/navbar/navbar";
import FooterSection from "@/components/sections/footer/default";
import CtaSection from "@/components/sections/cta/page";
import { FeatureComparisonBlock } from "@/components/sections/feature-comparison-block";
import { LetsWorkTogether } from "@/components/ui/lets-work-section";
import FeaturesSection from "@/components/features-9";
import IntegrationsSection from "@/components/ui/integrations-component";
import { Testimonial } from "@/components/ui/design-testimonial";
import { HeroGridSection } from "@/components/ui/hero-grid-section";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <NavbarSection />
      <section className="w-full h-[100vh] relative mb-10">
        <HeroGridSection />
      </section>
      <section className="px-6 pb-20">
        <IntegrationsSection />
        <FeaturesSection />
      </section>
      <section className="px-6 pb-20">
        <Testimonial />
        <LetsWorkTogether />
      </section>
      <section className="px-6 pb-20">
        <CtaSection />
      </section>
      <section className="px-6 pb-20">
        <FeatureComparisonBlock />
      </section>
      <section className="px-6 pb-20">
        <TimelineSection />
      </section>
      <FooterSection />
    </main>
  );
}
