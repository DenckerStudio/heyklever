"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
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

gsap.registerPlugin(ScrollTrigger);

const LANDING_VIDEO_SRC = "technology-binary-code-background.mp4";

export function LandingHomeContent() {
  const backdropVideoRef = useRef<HTMLVideoElement>(null);
  const backdropVideoWrapRef = useRef<HTMLDivElement>(null);
  const heroMarqueePinStageRef = useRef<HTMLDivElement>(null);
  const marqueeOverlayScrollerRef = useRef<HTMLDivElement>(null);
  const marqueeOverlaySlideRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const v = backdropVideoRef.current;
    if (!v) return;
    void v.play().catch(() => {});
  }, [reduceMotion]);

  /** Recalculate triggers after layout (Lenis + pins + async content) */
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => cancelAnimationFrame(id);
  }, [reduceMotion]);

  /** Full opacity during hero (laptop screen); fade down after scroll passes the hero pin */
  useGSAP(
    () => {
      if (reduceMotion) return;

      const video = backdropVideoRef.current;
      if (!video) return;

      gsap.set(video, { opacity: 1 });

      const ctx = gsap.context(() => {
        gsap.fromTo(
          video,
          { opacity: 1 },
          {
            opacity: 0.05,
            ease: "none",
            scrollTrigger: {
              start: () =>
                ScrollTrigger.getById("hero-pin")?.end ?? Number.MAX_SAFE_INTEGER,
              end: () => {
                const heroEnd = ScrollTrigger.getById("hero-pin")?.end;
                if (heroEnd === undefined) return Number.MAX_SAFE_INTEGER;
                return heroEnd + window.innerHeight * 0.42;
              },
              scrub: 0.35,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      return () => ctx.revert();
    },
    { dependencies: [reduceMotion] },
  );

  return (
    <>
      <div
        ref={backdropVideoWrapRef}
        className="pointer-events-none fixed inset-0 z-0 will-change-transform"
        style={{ transformOrigin: "71% 41.5%" }}
        aria-hidden
      >
        <video
          ref={backdropVideoRef}
          className={`absolute left-1/2 top-1/2 z-0 h-auto w-auto min-h-[100dvh] min-w-[100vw] -translate-x-1/2 -translate-y-1/2 object-cover ${reduceMotion ? "opacity-[0.05]" : ""}`}
          src={LANDING_VIDEO_SRC}
          muted
          loop
          playsInline
          preload="auto"
          autoPlay={!reduceMotion}
          aria-hidden
        />
      </div>

      <main className="relative z-10 min-h-screen overflow-x-hidden bg-transparent text-white">
        <LandingNavbar />

        {reduceMotion ? (
          <>
            <div className="relative">
              <HeroSection
                backdropVideoRef={backdropVideoRef}
                backdropVideoWrapRef={backdropVideoWrapRef}
              />
            </div>
            <MarqueeSection />
          </>
        ) : (
          <div
            ref={heroMarqueePinStageRef}
            className="relative min-h-[100dvh] w-full overflow-hidden"
          >
            <div className="relative h-[100dvh] min-h-[100dvh] w-full">
              <div className="absolute inset-0 z-0">
                <HeroSection
                  backdropVideoRef={backdropVideoRef}
                  backdropVideoWrapRef={backdropVideoWrapRef}
                  heroPinStageRef={heroMarqueePinStageRef}
                  marqueeOverlaySlideRef={marqueeOverlaySlideRef}
                />
              </div>
              <div
                ref={marqueeOverlayScrollerRef}
                className="pointer-events-none absolute inset-0 z-[55] overflow-x-hidden overflow-y-auto"
              >
                <div
                  ref={marqueeOverlaySlideRef}
                  className="pointer-events-auto h-full min-h-[100dvh] w-full min-w-[100vw] max-w-none will-change-transform shadow-[inset_4px_0_24px_rgba(0,0,0,0.35)]"
                >
                  <MarqueeSection
                    suppressScrollPinForHeroOverlay
                    overlayScrollerRef={marqueeOverlayScrollerRef}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <StatsSection />
          <FeaturesTicker />
          <BenefitsSection />
          <TestimonialsSection />

        <HowItWorks />
        <ContactSection />
        <CtaBanner />
        <LandingFooter />
      </main>
    </>
  );
}
