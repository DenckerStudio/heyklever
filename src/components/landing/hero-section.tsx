"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLenis } from "@/components/landing/lenis-context";
import { HeroLaptopStepCopy } from "@/components/landing/hero-laptop-step-copy";

const HERO_MASK_SRC = "/hero-mask.png";

const line1 = "We have reinvented";
const line2 = "the future of";
const line3 = "team intelligence.";

const altLine1a = "One connected ";
const altLine1b = "layer";
const altLine2 = "for every document,";
const altLine3 = "decision, and team.";

const gradientText =
  "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent";

/** Extra wait before hero heading A lines start their motion entrance */
const HEADING_A_ENTRY_BASE_DELAY_S = 0.55;

/** Scroll timeline (0–1): zoom-out starts here; hero copy fades in only after zoom finishes */
const ZOOM_START_AT = HEADING_A_ENTRY_BASE_DELAY_S + 0.12;
const ZOOM_OUT_DUR = Math.min(0.22, Math.max(0.14, 1 - ZOOM_START_AT - 0.1));
const HERO_COPY_SHOW_AT = ZOOM_START_AT + ZOOM_OUT_DUR;
const HERO_COPY_FADE_DUR = Math.max(0.1, 1 - HERO_COPY_SHOW_AT);

/** After hero beats, scrub marquee overlay x (hero/laptop layer stays fixed), timeline units */
const MARQUEE_OVERLAY_SLIDE_DUR = 0.85;
/** Extra pinned scroll with hero/laptop held before the overlay starts sliding in */
const HERO_HOLD_BEFORE_MARQUEE_SLIDE = 0.42;
const BASE_HERO_PIN_SCROLL_PCT = 115;

const LAPTOP_STEPS = [
  {
    title: "Find it fast",
    body: "Search across every connected source",
  },
  {
    title: "See the solution",
    body: "Get clarity every time",
  },
  {
    title: "Make the decision",
    body: "With your magnified knowledge",
  },
] as const;

const LAPTOP_STEP_MICRO_LABELS = ["Scan", "See", "Make"] as const;

function scrollCueOpacityAt(p: number): number {
  if (p >= 0.75) return 0;
  return 1 - p / 0.75;
}

export function HeroSection({
  backdropVideoRef,
  backdropVideoWrapRef,
  heroPinStageRef,
  marqueeOverlaySlideRef,
}: {
  backdropVideoRef: RefObject<HTMLVideoElement | null>;
  backdropVideoWrapRef: RefObject<HTMLDivElement | null>;
  /** Pins this wrapper; hero/laptop stays fixed while marquee overlay slides in above it */
  heroPinStageRef?: RefObject<HTMLDivElement | null>;
  marqueeOverlaySlideRef?: RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingARef = useRef<HTMLDivElement>(null);
  const headingBRef = useRef<HTMLDivElement>(null);
  const copyLiftRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const screenCopyRef = useRef<HTMLDivElement>(null);
  const laptopStepsWrapRef = useRef<HTMLDivElement>(null);
  const laptopStep1Ref = useRef<HTMLDivElement>(null);
  const laptopStep2Ref = useRef<HTMLDivElement>(null);
  const laptopStep3Ref = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion() ?? false;
  const lenis = useLenis();
  const [showHeadingB, setShowHeadingB] = useState(false);
  /** Which laptop overlay slide is active for a11y; -1 = faded out */
  const [activeLaptopStep, setActiveLaptopStep] = useState(0);
  /** True once scroll progress passes zoom-out; drives Framer entrances inside screen copy */
  const [heroCopyInView, setHeroCopyInView] = useState(false);

  useGSAP(
    () => {
      if (reduceMotion) return;

      const container = containerRef.current;
      const mask = maskRef.current;
      const headingA = headingARef.current;
      const headingB = headingBRef.current;
      const copyLift = copyLiftRef.current;
      const scrollCue = scrollCueRef.current;
      const screenVideo = backdropVideoRef.current;
      const screenVideoWrap = backdropVideoWrapRef.current;
      const screenCopy = screenCopyRef.current;
      const laptopStepsWrap = laptopStepsWrapRef.current;
      const laptopStep1 = laptopStep1Ref.current;
      const laptopStep2 = laptopStep2Ref.current;
      const laptopStep3 = laptopStep3Ref.current;
      if (
        !container ||
        !mask ||
        !headingA ||
        !headingB ||
        !copyLift ||
        !scrollCue ||
        !screenVideo ||
        !screenVideoWrap ||
        !screenCopy ||
        !laptopStepsWrap ||
        !laptopStep1 ||
        !laptopStep2 ||
        !laptopStep3
      )
        return;

      const stage = heroPinStageRef?.current ?? null;
      const marqueeOverlay = marqueeOverlaySlideRef?.current ?? null;
      const useMarqueeOverlaySlide = !!(stage && marqueeOverlay);

      gsap.registerPlugin(ScrollTrigger);

      gsap.set(headingB, { opacity: 0, x: 10 });
      /* Start zoomed in through the mask; zoom out from ZOOM_START_AT; copy fades in at HERO_COPY_SHOW_AT */
      gsap.set(mask, { scale: 8, yPercent: -15 });
      gsap.set(screenVideo, { opacity: 1 });
      gsap.set(screenVideoWrap, { scale: 1.22 });
      gsap.set(screenCopy, { autoAlpha: 0, y: 8 });
      gsap.set(laptopStep1, { autoAlpha: 1 });
      gsap.set([laptopStep2, laptopStep3], { autoAlpha: 0 });
      gsap.set(laptopStepsWrap, { autoAlpha: 1 });
      if (useMarqueeOverlaySlide) {
        gsap.set(marqueeOverlay, { x: "100%" });
      }

      const pinScrollPct = useMarqueeOverlaySlide
        ? Math.round(
            BASE_HERO_PIN_SCROLL_PCT *
              (1 + HERO_HOLD_BEFORE_MARQUEE_SLIDE + MARQUEE_OVERLAY_SLIDE_DUR),
          )
        : BASE_HERO_PIN_SCROLL_PCT;

      let lastAriaB = false;
      let lastLaptopSlide = 0;
      let lastHeroCopy = false;
      const setScrollCueOpacity = gsap.quickSetter(scrollCue, "opacity", "number");

      /** Crossfade between steps; hold times set by laptopS1 / laptopS2 / laptopWrapFadeStart */
      const laptopStepCross = 0.08;
      const laptopS1 = 0.26;
      const laptopS2 = 0.58;
      const laptopWrapFadeStart = 0.84;
      const laptopWrapFadeDur = 0.32;
      const laptopWrapDone = laptopWrapFadeStart + laptopWrapFadeDur;

      /** Timeline time (seconds), not ScrollTrigger progress — totalDuration grows with hold + marquee */
      const laptopSlideAtTime = (time: number) => {
        if (time >= laptopWrapDone) return -1;
        if (time >= laptopS2 + laptopStepCross * 0.45) return 2;
        if (time >= laptopS1 + laptopStepCross * 0.45) return 1;
        return 0;
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          id: "hero-pin",
          trigger: useMarqueeOverlaySlide ? stage : container,
          start: "top top",
          end: `+=${pinScrollPct}%`,
          scrub: 0.35,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;
            const t =
              (self.animation as gsap.core.Timeline | undefined)?.time() ?? 0;
            setScrollCueOpacity(scrollCueOpacityAt(p));
            const nextAria = t > 0.44;
            if (nextAria !== lastAriaB) {
              lastAriaB = nextAria;
              setShowHeadingB(nextAria);
            }
            const slide = laptopSlideAtTime(t);
            if (slide !== lastLaptopSlide) {
              lastLaptopSlide = slide;
              setActiveLaptopStep(slide);
            }
            const copyIn = t >= HERO_COPY_SHOW_AT;
            if (copyIn !== lastHeroCopy) {
              lastHeroCopy = copyIn;
              setHeroCopyInView(copyIn);
            }
          },
          onRefresh: (self) => {
            const t =
              (self.animation as gsap.core.Timeline | undefined)?.time() ?? 0;
            const copyIn = t >= HERO_COPY_SHOW_AT;
            lastHeroCopy = copyIn;
            setHeroCopyInView(copyIn);
          },
        },
      });

      const st = tl.scrollTrigger;
      let commitInFlight = false;

      const tryCommitHeroScroll = () => {
        if (!lenis || !st || commitInFlight) return;
        if (st.progress >= 0.998) return;
        commitInFlight = true;
        lenis.scrollTo(st.end, {
          duration: 0.85,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          onComplete: () => {
            commitInFlight = false;
          },
        });
      };

      const onWheel = (e: WheelEvent) => {
        if (!lenis || !st) return;
        if (e.deltaY <= 0) return;
        if (st.progress >= 0.998) return;
        if (commitInFlight) return;
        e.preventDefault();
        tryCommitHeroScroll();
      };

      let touchStartY = 0;
      const onTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0]?.clientY ?? 0;
      };
      const onTouchMove = (e: TouchEvent) => {
        if (!st || st.progress >= 0.998) return;
        const y = e.touches[0]?.clientY;
        if (y === undefined) return;
        if (touchStartY - y > 28) {
          tryCommitHeroScroll();
          touchStartY = y;
        }
      };

      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });

      tl.to(
        headingA,
        { opacity: 1, x: 0, duration: 0.4, ease: "none" },
        0,
      ).to(headingA, { opacity: 0, x: -8, duration: 0.16, ease: "none" }, 0.4);

      tl.fromTo(
        headingB,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.24, ease: "none" },
        0.28,
      );

      tl.to(copyLift, { y: -11, duration: 1, ease: "none" }, 0);

      tl.to(
        mask,
        {
          scale: 1,
          yPercent: 0,
          duration: ZOOM_OUT_DUR,
          ease: "none",
        },
        ZOOM_START_AT,
      );

      tl.to(
        screenVideoWrap,
        {
          scale: 1,
          duration: ZOOM_OUT_DUR,
          ease: "none",
        },
        ZOOM_START_AT,
      );

      tl.to(
        screenCopy,
        { autoAlpha: 1, y: 0, duration: HERO_COPY_FADE_DUR, ease: "power2.out" },
        HERO_COPY_SHOW_AT,
      );

      tl.to(
        laptopStep1,
        { autoAlpha: 0, duration: laptopStepCross, ease: "none" },
        laptopS1,
      );
      tl.to(
        laptopStep2,
        { autoAlpha: 1, duration: laptopStepCross, ease: "none" },
        laptopS1,
      );

      tl.to(
        laptopStep2,
        { autoAlpha: 0, duration: laptopStepCross, ease: "none" },
        laptopS2,
      );
      tl.to(
        laptopStep3,
        { autoAlpha: 1, duration: laptopStepCross, ease: "none" },
        laptopS2,
      );

      tl.to(
        laptopStepsWrap,
        { autoAlpha: 0, duration: laptopWrapFadeDur, ease: "power1.out" },
        laptopWrapFadeStart,
      );

      if (useMarqueeOverlaySlide) {
        tl.to({}, { duration: HERO_HOLD_BEFORE_MARQUEE_SLIDE }, ">");
        tl.to(
          marqueeOverlay,
          {
            x: 0,
            ease: "none",
            duration: MARQUEE_OVERLAY_SLIDE_DUR,
          },
          ">",
        );
      }

      setScrollCueOpacity(1);
      ScrollTrigger.refresh();

      return () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    },
    {
      scope: containerRef,
      dependencies: [reduceMotion, lenis, heroPinStageRef, marqueeOverlaySlideRef],
      revertOnUpdate: true,
    },
  );

  const fillPinStage = !!(heroPinStageRef && marqueeOverlaySlideRef);

  return (
    <section
      className={`relative bg-transparent ${fillPinStage ? "h-full min-h-0 w-full" : ""}`}
    >
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-transparent ${fillPinStage ? "h-full min-h-0" : "h-[100dvh] min-h-[100dvh]"}`}
      >
        {/* 1. LAYER BEHIND: hero copy + atmosphere (visible through transparent screen in PNG) */}
        <div
          ref={contentRef}
          className="absolute inset-0 z-10 flex min-h-0 flex-col items-center justify-center overflow-hidden px-5 pb-28 pt-24 sm:px-8 sm:pb-32 sm:pt-28"
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[#0a0a0a]/72"
            aria-hidden
          />

          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[#0a0a0a]/35"
            aria-hidden
          />

          <div
            className={`pointer-events-none absolute inset-0 z-0 opacity-[0.28] mix-blend-soft-light ${reduceMotion ? "" : "hero-mesh-drift"}`}
            style={{
              backgroundImage: `
              radial-gradient(ellipse 80% 50% at 22% 32%, rgba(139, 92, 246, 0.14) 0%, transparent 60%),
              radial-gradient(ellipse 70% 48% at 86% 18%, rgba(99, 102, 241, 0.11) 0%, transparent 55%),
              radial-gradient(ellipse 55% 44% at 68% 72%, rgba(167, 139, 250, 0.09) 0%, transparent 50%),
              radial-gradient(ellipse 85% 65% at 50% 48%, rgba(15, 15, 25, 0.08) 0%, transparent 68%)
            `,
            }}
            aria-hidden
          />

          <motion.div
            className="pointer-events-none absolute -left-[20%] top-[18%] z-0 h-[min(64vw,28rem)] w-[min(64vw,28rem)] rounded-full bg-violet-500/[0.045] blur-[88px]"
            aria-hidden
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, 8, 0],
                    y: [0, 6, 0],
                    opacity: [0.4, 0.58, 0.4],
                  }
            }
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -right-[15%] bottom-[22%] z-0 h-[min(56vw,24rem)] w-[min(56vw,24rem)] rounded-full bg-indigo-500/[0.04] blur-[80px]"
            aria-hidden
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, -8, 0],
                    y: [0, -5, 0],
                    opacity: [0.38, 0.52, 0.38],
                  }
            }
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[min(44vw,20rem)] w-[min(88vw,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.07),rgba(167,139,250,0.025)_52%,transparent_74%)]"
            aria-hidden
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1.018, 1], opacity: [0.75, 0.92, 0.75] }
            }
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(58%,24rem)] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/55 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent"
            aria-hidden
          />

          {/* Backdrop video lives in `LandingHomeContent` (fixed, full page); GSAP targets shared refs */}

          {/* Copy: centered on viewport — visible through hole + full frame late */}
          <div
            ref={copyLiftRef}
            className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center px-5 pt-20 sm:px-8"
          >
            {/* Same vertical band as laptop step copy so headline reads inside the LCD */}
            <div
              ref={screenCopyRef}
              className="relative z-[1] mt-[-5dvh] flex w-[min(92vw,26rem)] flex-col items-center text-center sm:w-[min(88vw,30rem)] [text-shadow:0_1px_24px_rgba(0,0,0,0.6)]"
            >
              <div className="relative w-full min-h-[clamp(7.5rem,22vw,13rem)]">
                <div
                  ref={headingARef}
                  className="absolute inset-x-0 top-0 overflow-visible px-0.5"
                  aria-hidden={showHeadingB}
                >
                  <h1 className="text-[clamp(1.15rem,3.5vw,2.15rem)] font-bold leading-[1.12] tracking-[-0.03em] text-white text-balance hyphens-none">
                    <motion.span
                      className="block"
                      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                      animate={
                        reduceMotion || heroCopyInView
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: 12 }
                      }
                      transition={{
                        duration: 0.85,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        delay: reduceMotion ? 0 : 0.05,
                      }}
                    >
                      {line1}
                    </motion.span>
                    <motion.span
                      className="block"
                      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                      animate={
                        reduceMotion || heroCopyInView
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: 12 }
                      }
                      transition={{
                        duration: 0.85,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        delay: reduceMotion ? 0 : 0.12,
                      }}
                    >
                      {line2}
                    </motion.span>
                    <motion.span
                      className={`block ${gradientText}`}
                      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                      animate={
                        reduceMotion || heroCopyInView
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: 12 }
                      }
                      transition={{
                        duration: 0.85,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        delay: reduceMotion ? 0 : 0.2,
                      }}
                    >
                      {line3}
                    </motion.span>
                  </h1>
                </div>

                <div
                  ref={headingBRef}
                  className="absolute inset-x-0 top-0 overflow-visible px-0.5"
                  aria-hidden={!showHeadingB}
                >
                  <p className="m-0 text-[clamp(1.15rem,3.5vw,2.15rem)] font-bold leading-[1.12] tracking-[-0.03em] text-white text-balance hyphens-none">
                    <span className="block">
                      {altLine1a}
                      <span className="whitespace-nowrap">{altLine1b}</span>
                    </span>
                    <span className="block">{altLine2}</span>
                    <span className={`block ${gradientText}`}>{altLine3}</span>
                  </p>
                </div>
              </div>

              <motion.p
                className="relative z-[1] mx-auto mt-5 max-w-[min(100%,22rem)] text-pretty text-[0.8125rem] leading-relaxed text-white/[0.62] sm:mt-6 sm:text-sm sm:leading-relaxed"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={
                  reduceMotion || heroCopyInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 10 }
                }
                transition={{
                  duration: 0.75,
                  delay: reduceMotion ? 0 : 0.28,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                AI-native technology that turns scattered knowledge into
                connected workflows. From documents to decisions, Klever AI
                makes your team smarter.
              </motion.p>
            </div>
          </div>

          <div
            ref={scrollCueRef}
            className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 sm:bottom-10"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              <motion.div
                className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 p-1"
                animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="h-1.5 w-0.5 rounded-full bg-indigo-300/60" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* 2. LAYER ABOVE: mask PNG (screen area must be transparent for copy to show through) */}
        {!reduceMotion ? (
          <div>
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- GSAP animates transform on this node */}
              <img
                ref={maskRef}
                src={HERO_MASK_SRC}
                alt=""
                width={1920}
                height={1080}
                className="h-full w-[100vw] will-change-transform object-cover"
                style={{ transformOrigin: "55.5% 41.5%" }}
                draggable={false}
                aria-hidden
              />
            </div>
            <div
              ref={laptopStepsWrapRef}
              className="pointer-events-none absolute inset-0 z-[55] flex items-center justify-center"
              aria-hidden={activeLaptopStep < 0}
            >
              <div className="relative mt-[-5dvh] w-[min(78vw,22rem)] min-h-[5.5rem] sm:w-[min(72vw,26rem)] sm:min-h-[6.5rem]">
                {LAPTOP_STEPS.map((step, i) => (
                  <HeroLaptopStepCopy
                    key={step.title}
                    ref={
                      i === 0
                        ? laptopStep1Ref
                        : i === 1
                          ? laptopStep2Ref
                          : laptopStep3Ref
                    }
                    title={step.title}
                    body={step.body}
                    microLabel={LAPTOP_STEP_MICRO_LABELS[i]}
                    active={activeLaptopStep === i}
                    reduceMotion={false}
                    aria-hidden={activeLaptopStep < 0 || activeLaptopStep !== i}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center opacity-[0.22]">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative static hero art */}
            <img
              src={HERO_MASK_SRC}
              alt=""
              width={1920}
              height={1080}
              className="h-full w-[100vw] will-change-transform object-cover"
              draggable={false}
              aria-hidden
            />
          </div>
        )}
      </div>
    </section>
  );
}
