"use client";

import { useId, useMemo, useRef, type RefObject } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

/** Path from `public/Number=Gradient_18.svg` */
const NUMBER_18_PATH_D =
  "M489.734 562.379C511.96 529.114 523.824 490.006 523.824 450L523.813 450C523.813 439.193 527.017 428.629 533.021 419.644C539.025 410.658 547.559 403.655 557.543 399.519C567.527 395.384 578.513 394.302 589.112 396.41C599.711 398.518 609.447 403.722 617.089 411.364C624.73 419.005 629.934 428.741 632.043 439.34C634.151 449.939 633.069 460.926 628.933 470.91C624.798 480.894 617.795 489.428 608.809 495.432C599.824 501.435 589.259 504.64 578.453 504.64C544.25 504.64 516.523 532.367 516.523 566.57L516.523 652.276L578.453 652.276C618.459 652.276 657.567 640.413 690.831 618.187C724.095 595.96 750.022 564.369 765.331 527.408C780.641 490.447 784.647 449.776 776.842 410.538C769.037 371.3 749.772 335.258 721.483 306.969C693.195 278.68 657.152 259.416 617.915 251.611C578.677 243.806 538.006 247.812 501.045 263.121C464.084 278.431 432.493 304.357 410.266 337.622C388.04 370.886 376.177 409.994 376.177 450L376.187 450C376.187 460.807 372.983 471.371 366.979 480.356C360.975 489.342 352.441 496.345 342.457 500.481C332.473 504.616 321.487 505.698 310.888 503.59C300.289 501.482 290.553 496.278 282.911 488.636C275.27 480.995 270.066 471.259 267.957 460.66C265.849 450.061 266.931 439.074 271.067 429.09C275.202 419.106 282.206 410.572 291.191 404.569C300.177 398.565 310.741 395.36 321.547 395.36C351.724 395.36 376.187 370.897 376.187 340.72V247.724H321.547C281.541 247.724 242.433 259.587 209.169 281.814C175.905 304.04 149.978 335.631 134.669 372.592C119.359 409.553 115.353 450.224 123.158 489.462C130.963 528.7 150.228 564.742 178.517 593.031C206.805 621.32 242.848 640.585 282.085 648.389C321.323 656.194 361.994 652.189 398.955 636.879C435.916 621.569 467.507 595.643 489.734 562.379Z";

/** Virtual timeline length (seconds) — normalized to scroll 0–1 */
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

const gradientText =
  "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent";

const CHAPTER_PHASE_DUR = STORY_TL_TOTAL - CHAPTER_PHASE_START - 0.35;
const CHAPTER_STEP = CHAPTER_PHASE_DUR / Math.max(STORY_CHAPTERS.length - 1, 1);

function chapterTIn(i: number): number {
  if (i === 0) return 0;
  return CHAPTER_PHASE_START + i * CHAPTER_STEP * 0.92;
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function chapterMotionAtProgress(p: number, i: number) {
  const t = p * STORY_TL_TOTAL;
  const tIn = chapterTIn(i);
  const n = STORY_CHAPTERS.length;
  const tNext = i < n - 1 ? chapterTIn(i + 1) : Number.POSITIVE_INFINITY;

  if (i === 0) {
    if (t < tNext) {
      return { opacity: 1, y: 0, scale: 1 };
    }
    if (t < tNext + 0.26) {
      const u = clamp01((t - tNext) / 0.26);
      return {
        opacity: 1 - u,
        y: -14 * u,
        scale: 1,
      };
    }
    return { opacity: 0, y: -14, scale: 1 };
  }

  if (t < tIn) {
    return { opacity: 0, y: 22, scale: 0.985 };
  }
  if (t < tIn + 0.4) {
    const u = clamp01((t - tIn) / 0.4);
    return {
      opacity: u,
      y: 22 * (1 - u),
      scale: 0.985 + 0.015 * u,
    };
  }
  if (i < n - 1 && t >= tNext) {
    if (t < tNext + 0.26) {
      const u = clamp01((t - tNext) / 0.26);
      return {
        opacity: 1 - u,
        y: -14 * u,
        scale: 1,
      };
    }
    return { opacity: 0, y: -14, scale: 1 };
  }
  return { opacity: 1, y: 0, scale: 1 };
}

function dotMotionAtProgress(p: number, i: number) {
  const t = p * STORY_TL_TOTAL;
  const tIn = chapterTIn(i);
  if (t < tIn) {
    return { opacity: 0.28, scale: 0.85 };
  }
  if (t < tIn + 0.2) {
    const u = clamp01((t - tIn) / 0.2);
    return {
      opacity: 0.28 + (1 - 0.28) * u,
      scale: 0.85 + (1 - 0.85) * u,
    };
  }
  return { opacity: 1, scale: 1 };
}

function splitWords(line: string) {
  return line.split(/\s+/).filter(Boolean);
}

type MarqueeSectionProps = {
  suppressScrollPinForHeroOverlay?: boolean;
  overlayScrollerRef?: RefObject<HTMLElement | null>;
};

function HeadlineWordSpan({
  word,
  gradientClass,
}: {
  word: string;
  gradientClass?: string;
}) {
  return (
    <span className="inline-block overflow-hidden pb-0.5 align-bottom text-white">
      <span
        className={
          gradientClass ??
          "inline-block will-change-transform [text-shadow:0_0_24px_rgba(167,139,250,0.2)]"
        }
      >
        {word}
      </span>
    </span>
  );
}

function StoryChapterStatic({
  ch,
  index,
}: {
  ch: (typeof STORY_CHAPTERS)[number];
  index: number;
}) {
  return (
    <article
      data-story-chapter
      className={`text-left ${index > 0 ? "mt-10 sm:mt-12" : ""}`}
    >
      <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-cyan-300/70 sm:text-[0.65rem]">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="m-0 text-xl font-medium tracking-[-0.02em] text-white sm:text-2xl">
        {ch.title}
      </h3>
      <p className="mt-3 text-pretty text-[0.9375rem] leading-relaxed text-white/[0.62] sm:text-lg sm:leading-relaxed">
        {ch.body}
      </p>
    </article>
  );
}

function StoryChapterAnimated({
  ch,
  index,
  progress,
}: {
  ch: (typeof STORY_CHAPTERS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(
    progress,
    (p) => chapterMotionAtProgress(p, index).opacity,
  );
  const y = useTransform(progress, (p) => chapterMotionAtProgress(p, index).y);
  const scale = useTransform(
    progress,
    (p) => chapterMotionAtProgress(p, index).scale,
  );

  return (
    <motion.article
      data-story-chapter
      className="absolute inset-x-0 top-0 mx-auto max-w-[min(36rem,100%)] text-left"
      style={{ opacity, y, scale }}
    >
      <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-cyan-300/70 sm:text-[0.65rem]">
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="m-0 text-xl font-medium tracking-[-0.02em] text-white sm:text-2xl">
        {ch.title}
      </h3>
      <p className="mt-3 text-pretty text-[0.9375rem] leading-relaxed text-white/[0.62] sm:text-lg sm:leading-relaxed">
        {ch.body}
      </p>
    </motion.article>
  );
}

function ProgressDot({
  progress,
  index,
}: {
  progress: MotionValue<number>;
  index: number;
}) {
  const opacity = useTransform(
    progress,
    (p) => dotMotionAtProgress(p, index).opacity,
  );
  const scale = useTransform(
    progress,
    (p) => dotMotionAtProgress(p, index).scale,
  );

  return (
    <motion.span
      className="mx-auto block h-2 w-2 shrink-0 rounded-full bg-white/[0.22] ring-1 ring-white/10"
      style={{ opacity, scale }}
    />
  );
}

export function MarqueeSection({
  suppressScrollPinForHeroOverlay = false,
  overlayScrollerRef,
}: MarqueeSectionProps) {
  const marqueeBgSvgUid = useId().replace(/:/g, "_");
  const rootRef = useRef<HTMLElement>(null);

  const reduceMotionPreference = useReducedMotion() ?? false;

  const line1Words = useMemo(() => splitWords(HEADLINE_LINE1), []);
  const line2Words = useMemo(() => splitWords(HEADLINE_LINE2), []);

  const { scrollYProgress } = useScroll({
    target: rootRef,
    container: suppressScrollPinForHeroOverlay ? overlayScrollerRef : undefined,
    offset: ["start start", "end end"],
  });

  /** Raw progress avoids spring lag at scroll 0 (was leaving intro copy invisible). */
  const progress = scrollYProgress;

  const pathDraw = useTransform(progress, [0, 1], [0, 1]);
  const fillOpacity = useTransform(progress, [0, 0.72, 1], [0, 0.32, 0.32]);

  const bgScaleFrom = suppressScrollPinForHeroOverlay ? 0.84 : 0.88;
  const bgScaleTo = suppressScrollPinForHeroOverlay ? 1.32 : 1.22;
  const bgScale = useTransform(progress, [0, 1], [bgScaleFrom, bgScaleTo]);
  const bgLayerOpacity = useTransform(progress, [0, 1], [0.42, 0.94]);

  const progressFillScaleY = useTransform(
    progress,
    [CHAPTER_PHASE_START / STORY_TL_TOTAL, 1],
    [0, 1],
  );

  const sectionScrollHeightClass = reduceMotionPreference
    ? suppressScrollPinForHeroOverlay
      ? "min-h-[140dvh]"
      : ""
    : "min-h-[calc(100dvh+420dvh)]";

  /** Pinned stage: whole block sticks to the overlay viewport while scroll advances story progress. */
  const pinStageClass = reduceMotionPreference
    ? `relative overflow-x-hidden overflow-y-visible ${
        suppressScrollPinForHeroOverlay ? "min-h-[140dvh]" : ""
      }`
    : "sticky top-0 z-[5] flex min-h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-visible";

  const pinInnerClass = reduceMotionPreference
    ? `relative overflow-x-hidden overflow-y-visible border-b border-white/[0.045] px-5 py-16 sm:px-8 sm:py-20 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[4] before:h-24 before:bg-gradient-to-b before:from-[#0a0a0a] before:via-[#0a0a0a]/35 before:to-transparent before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-[4] after:h-24 after:bg-gradient-to-t after:from-[#0a0a0a] after:via-[#0a0a0a]/45 after:to-transparent after:content-[''] ${
        suppressScrollPinForHeroOverlay ? "min-h-screen" : ""
      }`
    : `relative flex min-h-[100dvh] flex-1 flex-col overflow-x-hidden overflow-y-visible border-b border-white/[0.045] px-5 py-16 sm:px-8 sm:py-20 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[4] before:h-24 before:bg-gradient-to-b before:from-[#0a0a0a] before:via-[#0a0a0a]/35 before:to-transparent before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-[4] after:h-24 after:bg-gradient-to-t after:from-[#0a0a0a] after:via-[#0a0a0a]/45 after:to-transparent after:content-['']`;

  return (
    <section
      ref={rootRef}
      className={`relative bg-background ${sectionScrollHeightClass} ${
        reduceMotionPreference
          ? "overflow-x-hidden overflow-y-visible"
          : "overflow-visible"
      }`}
    >
      <div className={pinStageClass}>
        <div className={pinInnerClass}>
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden will-change-transform"
          style={{
            scale: reduceMotionPreference
              ? suppressScrollPinForHeroOverlay
                ? 1.22
                : 1.05
              : bgScale,
            opacity: reduceMotionPreference ? 1 : bgLayerOpacity,
            transformOrigin: "50% 42%",
          }}
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
                <stop
                  offset="0%"
                  stopColor="rgb(129 140 248)"
                  stopOpacity="0.92"
                />
                <stop
                  offset="52%"
                  stopColor="rgb(167 139 250)"
                  stopOpacity="0.62"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(192 132 252)"
                  stopOpacity="0.38"
                />
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
            <motion.path
              d={NUMBER_18_PATH_D}
              fill={`url(#${marqueeBgSvgUid}_fill)`}
              fillRule="evenodd"
              className="marquee-bg-fill"
              initial={false}
              style={{
                opacity: reduceMotionPreference ? 0.3 : fillOpacity,
              }}
            />
            <motion.path
              d={NUMBER_18_PATH_D}
              fill="none"
              fillRule="evenodd"
              stroke={`url(#${marqueeBgSvgUid}_stroke)`}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="nonScalingStroke"
              initial={false}
              style={{
                pathLength: reduceMotionPreference ? 1 : pathDraw,
              }}
            />
          </svg>
        </motion.div>

        <div className="relative z-[3] mx-auto w-full max-w-[min(44rem,100%)] bg-[#0a0a0a]/55 px-4 pb-3 pt-2 backdrop-blur-md sm:px-6 sm:pb-4 sm:pt-3">
          <p className="mb-2 text-center font-mono text-[0.55rem] font-medium uppercase tracking-[0.38em] text-cyan-300/85 sm:mb-3 sm:text-[0.65rem]">
            {KICKER}
          </p>
          <h2
            className={`m-0 text-center text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.032em] text-balance [text-shadow:0_1px_28px_rgba(0,0,0,0.55)] ${reduceMotionPreference ? "font-bold" : "font-semibold"}`}
          >
            {reduceMotionPreference ? (
              <>
                <span className="block text-white">{HEADLINE_LINE1}</span>
                <span className={`mt-1 block sm:mt-1.5 ${gradientText}`}>
                  {HEADLINE_LINE2}
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex flex-wrap justify-center gap-x-[0.3em] gap-y-1.5">
                  {line1Words.map((word, wi) => (
                    <HeadlineWordSpan key={`l1-${wi}`} word={word} />
                  ))}
                </span>
                <span className="mt-1.5 flex flex-wrap justify-center gap-x-[0.3em] gap-y-1.5 sm:mt-2">
                  {line2Words.map((word, wi) => (
                    <HeadlineWordSpan
                      key={`l2-${wi}`}
                      word={word}
                      gradientClass={`inline-block will-change-transform ${gradientText}`}
                    />
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
              <motion.div
                className="h-full w-full origin-top bg-gradient-to-b from-cyan-400/80 via-indigo-400/55 to-violet-500/40"
                style={{
                  scaleY: reduceMotionPreference ? 1 : progressFillScaleY,
                  transformOrigin: "top center",
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-y-3 left-0 flex w-full flex-col justify-between py-0.5">
              {reduceMotionPreference
                ? STORY_CHAPTERS.map((ch) => (
                    <span
                      key={`dot-${ch.title}`}
                      className="mx-auto block h-2 w-2 shrink-0 rounded-full bg-white/[0.22] ring-1 ring-white/10"
                    />
                  ))
                : STORY_CHAPTERS.map((ch, i) => (
                    <ProgressDot
                      key={`dot-${ch.title}`}
                      progress={progress}
                      index={i}
                    />
                  ))}
            </div>
          </div>

          <div
            className={`min-h-[min(42vh,18rem)] flex-1 pb-20 sm:min-h-[min(44vh,20rem)] sm:pb-24 ${
              reduceMotionPreference ? "" : "relative"
            }`}
          >
            <div
              className="mb-6 flex justify-center gap-2 sm:hidden"
              aria-hidden
            >
              {STORY_CHAPTERS.map((ch) => (
                <span
                  key={`m-dot-${ch.title}`}
                  className="h-1.5 w-1.5 rounded-full bg-white/[0.18] ring-1 ring-white/10"
                />
              ))}
            </div>
            {STORY_CHAPTERS.map((ch, i) =>
              reduceMotionPreference ? (
                <StoryChapterStatic key={ch.title} ch={ch} index={i} />
              ) : (
                <StoryChapterAnimated
                  key={ch.title}
                  ch={ch}
                  index={i}
                  progress={progress}
                />
              ),
            )}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
