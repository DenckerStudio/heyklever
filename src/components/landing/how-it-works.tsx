"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landingSvgGradientStops } from "@/constants/landing-visual-theme";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: "01",
    title: "Connect Your Data",
    description:
      "Link your Google Drive, OneDrive, or upload files directly. Klever AI ingests and indexes everything securely.",
  },
  {
    num: "02",
    title: "AI Processes & Learns",
    description:
      "Our RAG pipeline extracts knowledge, builds vector embeddings, and creates a searchable intelligence layer for your team.",
  },
  {
    num: "03",
    title: "Ask Anything",
    description:
      "Chat with your data using natural language. Get instant, accurate answers grounded in your team's actual documents.",
  },
  {
    num: "04",
    title: "Generate & Act",
    description:
      "Create documents, reports, and guidelines from your knowledge base. Turn insights into action with AI-powered generation.",
  },
] as const;

function StepVisual({ index }: { index: number }) {
  const gid = `hiw-grad-${index}`;
  const common = "hiw-draw-path";

  if (index === 0) {
    return (
      <svg
        className="h-full w-full max-h-[200px]"
        viewBox="0 0 320 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            {landingSvgGradientStops.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </linearGradient>
        </defs>
        <rect
          className={common}
          data-hiw-order="0"
          x="36"
          y="44"
          width="88"
          height="112"
          rx="10"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          className={common}
          data-hiw-order="1"
          x="148"
          y="44"
          width="88"
          height="112"
          rx="10"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className={common}
          data-hiw-order="2"
          d="M 124 100 L 148 100"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className={common}
          data-hiw-order="3"
          cx="260"
          cy="100"
          r="28"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className={common}
          data-hiw-order="4"
          d="M 236 100 L 216 100"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (index === 1) {
    return (
      <svg
        className="h-full w-full max-h-[200px]"
        viewBox="0 0 320 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
            {landingSvgGradientStops.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </linearGradient>
        </defs>
        <path
          className={common}
          data-hiw-order="0"
          d="M 48 160 L 48 52 L 160 52 L 160 104 L 272 104 L 272 160"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className={common}
          data-hiw-order="1"
          cx="48"
          cy="160"
          r="8"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className={common}
          data-hiw-order="2"
          cx="160"
          cy="52"
          r="8"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className={common}
          data-hiw-order="3"
          cx="272"
          cy="104"
          r="8"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className={common}
          data-hiw-order="4"
          cx="272"
          cy="160"
          r="8"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg
        className="h-full w-full max-h-[200px]"
        viewBox="0 0 320 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            {landingSvgGradientStops.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </linearGradient>
        </defs>
        <path
          className={common}
          data-hiw-order="0"
          d="M 72 52 L 248 52 L 248 88 L 72 88 Z"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className={common}
          data-hiw-order="1"
          d="M 88 68 L 200 68"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className={common}
          data-hiw-order="2"
          d="M 88 80 L 168 80"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.45"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className={common}
          data-hiw-order="3"
          d="M 160 88 L 160 120"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          className={common}
          data-hiw-order="4"
          x="40"
          y="120"
          width="240"
          height="48"
          rx="24"
          stroke={`url(#${gid})`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-full w-full max-h-[200px]"
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="50%" x2="100%" y2="50%">
          {landingSvgGradientStops.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </linearGradient>
      </defs>
      <path
        className={common}
        data-hiw-order="0"
        d="M 52 140 L 120 72 L 188 112 L 268 52"
        stroke={`url(#${gid})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        className={common}
        data-hiw-order="1"
        x="36"
        y="132"
        width="40"
        height="52"
        rx="6"
        stroke={`url(#${gid})`}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        className={common}
        data-hiw-order="2"
        x="244"
        y="36"
        width="40"
        height="52"
        rx="6"
        stroke={`url(#${gid})`}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const items = section.querySelectorAll<HTMLElement>(".step-item");
      items.forEach((item, i) => {
        gsap.fromTo(
          item,
          { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.85,
            delay: 0.14,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          }
        );

        const panel = item.querySelector<HTMLElement>(".step-visual-panel");
        const inner = item.querySelector<HTMLElement>(".step-visual-inner");
        const paths = Array.from(item.querySelectorAll<SVGGeometryElement>(".hiw-draw-path")).sort(
          (a, b) =>
            Number(a.getAttribute("data-hiw-order") ?? 0) -
            Number(b.getAttribute("data-hiw-order") ?? 0)
        );

        if (panel && paths.length) {
          paths.forEach((path) => {
            try {
              const len = path.getTotalLength();
              path.style.strokeDasharray = `${len}`;
              path.style.strokeDashoffset = `${len}`;
            } catch {
              /* ignore */
            }
          });

          const drawTl = gsap.timeline({
            scrollTrigger: {
              trigger: panel,
              start: "top 92%",
              end: () => `+=${Math.max(Math.round(panel.offsetHeight * 1.35), 220)}`,
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          });

          const segment = 0.3;
          paths.forEach((path, j) => {
            const len = (() => {
              try {
                return path.getTotalLength();
              } catch {
                return 0;
              }
            })();
            const endOpacity = path.hasAttribute("opacity")
              ? Number(path.getAttribute("opacity"))
              : 1;
            drawTl.fromTo(
              path,
              { strokeDashoffset: len, opacity: 0.28 },
              {
                strokeDashoffset: 0,
                opacity: endOpacity,
                ease: "none",
                duration: segment,
              },
              j * (segment * 0.85)
            );
          });
        }

        if (inner && panel) {
          gsap.fromTo(
            inner,
            { scale: 0.94, y: 14 },
            {
              scale: 1,
              y: 0,
              ease: "none",
              scrollTrigger: {
                trigger: panel,
                start: "top 92%",
                end: () => `+=${Math.max(Math.round(panel.offsetHeight * 1.35), 220)}`,
                scrub: 0.7,
                invalidateOnRefresh: true,
              },
            }
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 px-6 bg-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/55">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            From chaos to clarity in four steps
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-indigo-400/25 to-transparent md:block" />

          <div className="grid gap-16 md:gap-24">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`step-item flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-16 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/35 font-mono text-xs text-indigo-300/90">
                      {step.num}
                    </span>
                    <span className="h-px w-8 bg-gradient-to-r from-indigo-400/35 to-transparent" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{step.title}</h3>
                  <p className="text-base leading-relaxed text-white/50">{step.description}</p>
                </div>
                <div
                  className="step-visual-panel relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.09] via-white/[0.02] to-violet-500/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] md:h-64 md:w-96"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_40%_25%,rgba(129,140,248,0.14),transparent_58%)]" />
                  <div className="step-visual-inner relative z-[1] flex h-full w-full items-center justify-center px-6 py-4">
                    <StepVisual index={i} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
