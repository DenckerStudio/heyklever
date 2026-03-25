import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesTicker } from "@/components/landing/features-ticker";
import { MarqueeSection } from "@/components/landing/marquee-section";
import { StatsSection } from "@/components/landing/stats-section";
import { BenefitsSection } from "@/components/landing/benefits-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ContactSection, CtaBanner } from "@/components/landing/contact-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { SmoothScrollProvider } from "@/components/landing/smooth-scroll-provider";
import { ParticleSphereWrapper } from "@/components/landing/particle-sphere-wrapper";

export default function Home() {
  return (
    <SmoothScrollProvider>
      <main className="relative min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
        <LandingNavbar />

        <div className="relative">
          <ParticleSphereWrapper />
          <HeroSection />
        </div>

        <MarqueeSection />
        <FeaturesTicker />
        <StatsSection />
        <BenefitsSection />
        <TestimonialsSection />
        <HowItWorks />
        <ContactSection />
        <CtaBanner />
        <LandingFooter />
      </main>
    </SmoothScrollProvider>
  );
}
