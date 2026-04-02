"use client";

import { useId, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { flipWordsFrom } from "@/lib/gsap-text-effects";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

const USE_DRAW_SVG_PLUGIN = true;

/** Path from `public/Number=Gradient_18.svg` */
const NUMBER_18_PATH_D =
  "M489.734 562.379C511.96 529.114 523.824 490.006 523.824 450L523.813 450C523.813 439.193 527.017 428.629 533.021 419.644C539.025 410.658 547.559 403.655 557.543 399.519C567.527 395.384 578.513 394.302 589.112 396.41C599.711 398.518 609.447 403.722 617.089 411.364C624.73 419.005 629.934 428.741 632.043 439.34C634.151 449.939 633.069 460.926 628.933 470.91C624.798 480.894 617.795 489.428 608.809 495.432C599.824 501.435 589.259 504.64 578.453 504.64C544.25 504.64 516.523 532.367 516.523 566.57L516.523 652.276L578.453 652.276C618.459 652.276 657.567 640.413 690.831 618.187C724.095 595.96 750.022 564.369 765.331 527.408C780.641 490.447 784.647 449.776 776.842 410.538C769.037 371.3 749.772 335.258 721.483 306.969C693.195 278.68 657.152 259.416 617.915 251.611C578.677 243.806 538.006 247.812 501.045 263.121C464.084 278.431 432.493 304.357 410.266 337.622C388.04 370.886 376.177 409.994 376.177 450L376.187 450C376.187 460.807 372.983 471.371 366.979 480.356C360.975 489.342 352.441 496.345 342.457 500.481C332.473 504.616 321.487 505.698 310.888 503.59C300.289 501.482 290.553 496.278 282.911 488.636C275.27 480.995 270.066 471.259 267.957 460.66C265.849 450.061 266.931 439.074 271.067 429.09C275.202 419.106 282.206 410.572 291.191 404.569C300.177 398.565 310.741 395.36 321.547 395.36C351.724 395.36 376.187 370.897 376.187 340.72V247.724H321.547C281.541 247.724 242.433 259.587 209.169 281.814C175.905 304.04 149.978 335.631 134.669 372.592C119.359 409.553 115.353 450.224 123.158 489.462C130.963 528.7 150.228 564.742 178.517 593.031C206.805 621.32 242.848 640.585 282.085 648.389C321.323 656.194 361.994 652.189 398.955 636.879C435.916 621.569 467.507 595.643 489.734 562.379Z";

/** Virtual timeline length (seconds) mapped to scroll distance via scrub */
const STORY_TL_TOTAL = 9;
const CHAPTER_PHASE_START = 0.14;

const KICKER = "Capabilities";
const HEADLINE_LINE1 = "Clarity for every decision.";
const HEADLINE_LINE2 = "Turn team knowledge into momentum.";

const STORY_CHAPTERS = [
  {
    title: "Unify inputs",
    body: "Connect docs, chats, tickets, and notes into one coherent context stream.",
  },
  {
    title: "Understand fast",
    body: "AI surfaces intent, entities, and risk signals—without another dashboard.",
  },
  {
    title: "Surface what matters",
    body: "The right evidence appears at the moment your team needs to decide.",
  },
  {
    title: "Coordinate decisions",
    body: "Shared context aligns stakeholders and cuts rework before it spreads.",
  },
  {
    title: "Execute with confidence",
    body: "Move from insight to action with traceable outcomes you can trust.",
  },
] as const;

const MARQUEE_FLIP = {
  duration: 0.42,
  stagger: 0.055,
  ease: "back.out(1.12)",
  maxAbsRotation: 22,
} as const;

const gradientText =
  "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent";

function splitWords(line: string) {
  return line.split(/\s+/).filter(Boolean);
}

type MarqueeSectionProps = {
  suppressScrollPinForHeroOverlay?: boolean;
  overlayScrollerRef?: RefObject<HTMLElement | null>;
};

export function MarqueeSection({
  suppressScrollPinForHeroOverlay = false,
  overlayScrollerRef,
}: MarqueeSectionProps) {
  const marqueeBgSvgUid = useId().replace(/:/g, "_");
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const headerPinRef = useRef<HTMLDivElement>(null);
  const marqueeBgLayerRef = useRef<HTMLDivElement>(null);
  const marqueeBgDrawPathRef = useRef<SVGPathElement>(null);
  const marqueeBgFillPathRef = useRef<SVGPathElement>(null);
  const kickerRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressDotsRef = useRef<(HTMLSpanElement | null)[]>([]);

  const reduceMotionPreference = useReducedMotion() ?? false;

  const line1Words = splitWords(HEADLINE_LINE1);
  const line2Words = splitWords(HEADLINE_LINE2);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const headerPin = headerPinRef.current;
    const kicker = kickerRef.current;
    const headline = headlineRef.current;
    const bgDrawPath = marqueeBgDrawPathRef.current;
    const bgFillPath = marqueeBgFillPathRef.current;
    const bgLayer = marqueeBgLayerRef.current;
    const progressFill = progressFillRef.current;

    const chapterEls = STORY_CHAPTERS.map((_, i) => chapterRefs.current[i]).filter(
      (el): el is HTMLElement => el != null,
    );

    if (!root || !pin || !headerPin || !kicker || !headline || chapterEls.length !== STORY_CHAPTERS.length)
      return;

    const reduceMotion =
      reduceMotionPreference || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      gsap.set(kicker, { opacity: 1, y: 0, clearProps: "all" });
      gsap.set(headline, { opacity: 1, y: 0, clearProps: "all" });
      chapterEls.forEach((el) => gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: "all" }));
      if (bgLayer) gsap.set(bgLayer, { scale: suppressScrollPinForHeroOverlay ? 1.22 : 1.05, opacity: 1 });
      if (bgDrawPath) {
        if (USE_DRAW_SVG_PLUGIN) gsap.set(bgDrawPath, { drawSVG: "100%" });
        else {
          const len = bgDrawPath.getTotalLength();
          gsap.set(bgDrawPath, { strokeDasharray: len, strokeDashoffset: 0 });
        }
      }
      if (bgFillPath) gsap.set(bgFillPath, { opacity: 0.3 });
      if (progressFill) gsap.set(progressFill, { scaleY: 1, transformOrigin: "top center" });
      progressDotsRef.current.forEach((dot) => {
        if (dot) gsap.set(dot, { opacity: 1, scale: 1 });
      });
      return;
    }

    const scrollerEl =
      suppressScrollPinForHeroOverlay && overlayScrollerRef?.current
        ? overlayScrollerRef.current
        : undefined;

    const flipNodes = headline.querySelectorAll<HTMLElement>("[data-flip-word]");

    const chapterPhaseDur = STORY_TL_TOTAL - CHAPTER_PHASE_START - 0.35;
    const step = chapterPhaseDur / Math.max(STORY_CHAPTERS.length - 1, 1);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          scroller: scrollerEl,
          start: suppressScrollPinForHeroOverlay
            ? "top top"
            : () => {
                const hero = ScrollTrigger.getById("hero-pin");
                return hero ? hero.end : "top top";
              },
          end: "+=420%",
          pin: headerPin,
          scrub: 0.55,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      if (bgDrawPath) {
        if (USE_DRAW_SVG_PLUGIN) {
          gsap.set(bgDrawPath, { drawSVG: "0%" });
          tl.fromTo(
            bgDrawPath,
            { drawSVG: "0%" },
            { drawSVG: "100%", ease: "none", duration: STORY_TL_TOTAL },
            0,
          );
        } else {
          const len = bgDrawPath.getTotalLength();
          gsap.set(bgDrawPath, { strokeDasharray: len, strokeDashoffset: len });
          tl.fromTo(
            bgDrawPath,
            { strokeDashoffset: len },
            { strokeDashoffset: 0, ease: "none", duration: STORY_TL_TOTAL },
            0,
          );
        }
      }

      if (bgFillPath) {
        gsap.set(bgFillPath, { opacity: 0 });
        tl.to(
          bgFillPath,
          { opacity: 0.32, ease: "none", duration: STORY_TL_TOTAL * 0.72 },
          0,
        );
      }

      if (bgLayer) {
        gsap.set(bgLayer, {
          scale: suppressScrollPinForHeroOverlay ? 0.84 : 0.88,
          opacity: 0.42,
          transformOrigin: "50% 42%",
        });
        tl.to(
          bgLayer,
          {
            scale: suppressScrollPinForHeroOverlay ? 1.32 : 1.22,
            opacity: 0.94,
            ease: "none",
            duration: STORY_TL_TOTAL,
            transformOrigin: "50% 42%",
          },
          0,
        );
      }

      if (progressFill) {
        gsap.set(progressFill, { scaleY: 0, transformOrigin: "top center" });
        tl.to(
          progressFill,
          {
            scaleY: 1,
            ease: "none",
            duration: STORY_TL_TOTAL - CHAPTER_PHASE_START,
            transformOrigin: "top center",
          },
          CHAPTER_PHASE_START,
        );
      }

      gsap.set(kicker, { opacity: 0, y: 10 });
      tl.to(kicker, { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }, 0);

      if (flipNodes.length) {
        tl.add(
          flipWordsFrom(Array.from(flipNodes), {
            duration: MARQUEE_FLIP.duration,
            stagger: MARQUEE_FLIP.stagger,
            ease: MARQUEE_FLIP.ease,
            maxAbsRotation: MARQUEE_FLIP.maxAbsRotation,
          }),
          0.06,
        );
      }

      chapterEls.forEach((el) => {
        gsap.set(el, { opacity: 0, y: 22, scale: 0.985 });
      });

      STORY_CHAPTERS.forEach((_, i) => {
        const tIn = CHAPTER_PHASE_START + i * step * 0.92;
        if (i > 0) {
          tl.to(
            chapterEls[i - 1],
            {
              opacity: 0,
              y: -14,
              duration: 0.26,
              ease: "power2.in",
            },
            tIn,
          );
        }
        tl.fromTo(
          chapterEls[i],
          { opacity: 0, y: 22, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            ease: "power2.out",
          },
          tIn,
        );

        const dot = progressDotsRef.current[i];
        if (dot) {
          gsap.set(dot, { opacity: 0.28, scale: 0.85 });
          tl.to(
            dot,
            { opacity: 1, scale: 1, duration: 0.2, ease: "back.out(1.6)" },
            tIn,
          );
        }
      });
    }, root);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, [suppressScrollPinForHeroOverlay, reduceMotionPreference, overlayScrollerRef]);

  return (
    <section
      ref={rootRef}
      className={`relative overflow-hidden bg-background ${suppressScrollPinForHeroOverlay ? "min-h-[140dvh]" : ""}`}
    >
      <div
        ref={pinRef}
        className={`relative overflow-hidden border-b border-white/[0.045] px-5 py-16 sm:px-8 sm:py-20 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[4] before:h-24 before:bg-gradient-to-b before:from-[#0a0a0a] before:via-[#0a0a0a]/35 before:to-transparent before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-[4] after:h-24 after:bg-gradient-to-t after:from-[#0a0a0a] after:via-[#0a0a0a]/45 after:to-transparent after:content-[''] ${suppressScrollPinForHeroOverlay ? "min-h-[100dvh]" : ""}`}
      >
        <div
          ref={marqueeBgLayerRef}
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden will-change-transform"
          aria-hidden
        >
          <svg
            className={`max-w-none -translate-y-[6%] ${
              suppressScrollPinForHeroOverlay
                ? "h-[min(120vmin,1020px)] w-[min(120vmin,1020px)] opacity-[0.48] sm:opacity-[0.58]"
                : "h-[min(92vmin,760px)] w-[min(92vmin,760px)] opacity-[0.4] sm:opacity-[0.5]"
            }`}
            viewBox="0 0 900 900"
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
          >
            <defs>
              <linearGradient
                id={`${marqueeBgSvgUid}_stroke`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0%" stopColor="rgb(129 140 248)" stopOpacity="0.92" />
                <stop offset="52%" stopColor="rgb(167 139 250)" stopOpacity="0.62" />
                <stop offset="100%" stopColor="rgb(192 132 252)" stopOpacity="0.38" />
              </linearGradient>
              <linearGradient
                id={`${marqueeBgSvgUid}_fill`}
                x1="350"
                y1="240"
                x2="720"
                y2="660"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.14" />
                <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.09" />
                <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <path
              ref={marqueeBgFillPathRef}
              d={NUMBER_18_PATH_D}
              fill={`url(#${marqueeBgSvgUid}_fill)`}
              fillRule="evenodd"
              className="marquee-bg-fill"
              opacity={reduceMotionPreference ? 0.3 : 0}
            />
            <path
              ref={marqueeBgDrawPathRef}
              data-marquee-bg-draw
              d={NUMBER_18_PATH_D}
              fill="none"
              fillRule="evenodd"
              stroke={`url(#${marqueeBgSvgUid}_stroke)`}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="nonScalingStroke"
            />
          </svg>
        </div>

        <div
          ref={headerPinRef}
          className="relative z-[3] mx-auto w-full max-w-[min(44rem,100%)] bg-[#0a0a0a]/55 px-4 pb-3 pt-2 backdrop-blur-md sm:px-6 sm:pb-4 sm:pt-3"
        >
          <p
            ref={kickerRef}
            className="mb-2 text-center font-mono text-[0.55rem] font-medium uppercase tracking-[0.38em] text-cyan-300/85 sm:mb-3 sm:text-[0.65rem]"
          >
            {KICKER}
          </p>
          <h2
            ref={headlineRef}
            className={`m-0 text-center text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.032em] text-balance [text-shadow:0_1px_28px_rgba(0,0,0,0.55)] ${reduceMotionPreference ? "font-bold" : "font-semibold"}`}
          >
            {reduceMotionPreference ? (
              <>
                <span className="block text-white">{HEADLINE_LINE1}</span>
                <span className={`mt-1 block sm:mt-1.5 ${gradientText}`}>{HEADLINE_LINE2}</span>
              </>
            ) : (
              <>
                <span className="inline-flex flex-wrap justify-center gap-x-[0.3em] gap-y-1.5">
                  {line1Words.map((word, wi) => (
                    <span
                      key={`l1-${wi}`}
                      className="inline-block overflow-hidden pb-0.5 align-bottom text-white"
                    >
                      <span
                        data-flip-word
                        className="inline-block will-change-transform [text-shadow:0_0_24px_rgba(167,139,250,0.2)]"
                      >
                        {word}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="mt-1.5 flex flex-wrap justify-center gap-x-[0.3em] gap-y-1.5 sm:mt-2">
                  {line2Words.map((word, wi) => (
                    <span
                      key={`l2-${wi}`}
                      className="inline-block overflow-hidden pb-0.5 align-bottom"
                    >
                      <span
                        data-flip-word
                        className={`inline-block will-change-transform ${gradientText}`}
                      >
                        {word}
                      </span>
                    </span>
                  ))}
                </span>
              </>
            )}
          </h2>
        </div>

        <div className="relative z-[2] mx-auto mt-10 flex w-full max-w-[min(40rem,100%)] gap-8 sm:mt-14 sm:gap-10">
          <div
            className="relative hidden min-h-[min(42vh,18rem)] w-10 shrink-0 sm:block"
            aria-hidden
          >
            <div className="absolute left-1/2 top-3 bottom-3 w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                ref={progressFillRef}
                className="h-full w-full origin-top bg-gradient-to-b from-cyan-400/80 via-indigo-400/55 to-violet-500/40"
              />
            </div>
            <div className="pointer-events-none absolute inset-y-3 left-0 flex w-full flex-col justify-between py-0.5">
              {STORY_CHAPTERS.map((ch, i) => (
                <span
                  key={`dot-${ch.title}`}
                  ref={(el) => {
                    progressDotsRef.current[i] = el;
                  }}
                  className="mx-auto block h-2 w-2 shrink-0 rounded-full bg-white/[0.22] ring-1 ring-white/10"
                />
              ))}
            </div>
          </div>

          <div
            className={`min-h-[min(42vh,18rem)] flex-1 pb-20 sm:min-h-[min(44vh,20rem)] sm:pb-24 ${
              reduceMotionPreference ? "" : "relative"
            }`}
          >
            <div className="mb-6 flex justify-center gap-2 sm:hidden" aria-hidden>
              {STORY_CHAPTERS.map((ch) => (
                <span
                  key={`m-dot-${ch.title}`}
                  className="h-1.5 w-1.5 rounded-full bg-white/[0.18] ring-1 ring-white/10"
                />
              ))}
            </div>
            {STORY_CHAPTERS.map((ch, i) => (
              <article
                key={ch.title}
                ref={(el) => {
                  chapterRefs.current[i] = el;
                }}
                data-story-chapter
                className={
                  reduceMotionPreference
                    ? `text-left ${i > 0 ? "mt-10 sm:mt-12" : ""}`
                    : "absolute inset-x-0 top-0 mx-auto max-w-[min(36rem,100%)] text-left opacity-0"
                }
              >
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-cyan-300/70 sm:text-[0.65rem]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="m-0 text-xl font-medium tracking-[-0.02em] text-white sm:text-2xl">
                  {ch.title}
                </h3>
                <p className="mt-3 text-pretty text-[0.9375rem] leading-relaxed text-white/[0.62] sm:text-lg sm:leading-relaxed">
                  {ch.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
