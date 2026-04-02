"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollCounter } from "./scroll-counter";
import { landingSvgGradientStops } from "@/constants/landing-visual-theme";

gsap.registerPlugin(ScrollTrigger);

export function StatsSection() {
  const rootRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const svgMotionRef = useRef<SVGGElement>(null);
  const svgDriftRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    const ctx = gsap.context(() => {
      const motionG = svgMotionRef.current;
      const driftG = svgDriftRef.current;
      const paths = svgRef.current?.querySelectorAll<SVGGeometryElement>(".stats-draw-path");
      if (paths?.length) {
        paths.forEach((path) => {
          const len = path.getTotalLength();
          path.style.strokeDasharray = `${len}`;
          path.style.strokeDashoffset = `${len}`;
        });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=165%",
          scrub: 0.72,
        },
      });

      if (motionG) {
        tl.fromTo(
          motionG,
          { y: 18, opacity: 0.38 },
          { y: 0, opacity: 1, ease: "power2.out", duration: 0.48 },
          0
        );
        tl.to(motionG, { y: -12, opacity: 0.9, ease: "none", duration: 0.52 }, 0.42);
      }

      if (paths?.length) {
        paths.forEach((path, i) => {
          const len = path.getTotalLength();
          const staggerIn = i * 0.12;
          const drawInDur = 0.46;
          const drawInStart = 0.02 + staggerIn;
          const drawOutDur = 0.38;
          const drawOutStart = 0.6 + i * 0.02;

          tl.fromTo(
            path,
            { strokeDashoffset: len },
            {
              strokeDashoffset: 0,
              ease: "power2.inOut",
              duration: drawInDur,
            },
            drawInStart
          );
          tl.to(
            path,
            {
              strokeDashoffset: len,
              ease: "sine.inOut",
              duration: drawOutDur,
            },
            drawOutStart
          );
        });
      }

      tl.fromTo(
        content.querySelector(".stats-heading"),
        { opacity: 0.35, y: 16 },
        { opacity: 1, y: 0, ease: "power2.out", duration: 0.48 },
        0.06
      );

      let driftTween: gsap.core.Tween | null = null;
      ScrollTrigger.create({
        trigger: root,
        start: "top 85%",
        end: "bottom 15%",
        onToggle: (self) => {
          if (!driftG) return;
          if (self.isActive) {
            if (driftTween) return;
            gsap.set(driftG, { y: 0 });
            driftTween = gsap.to(driftG, {
              y: 3,
              duration: 2.8,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut",
            });
          } else {
            driftTween?.kill();
            driftTween = null;
            gsap.set(driftG, { y: 0 });
          }
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative bg-background/95">
      <div
        ref={contentRef}
        className="relative flex items-center overflow-hidden px-6 py-8"
      >
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="-180 40 1980 520"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="stats-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              {landingSvgGradientStops.map((s) => (
                <stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity * 0.62}
                />
              ))}
            </linearGradient>
            <filter
              id="stats-line-glow"
              x="-8%"
              y="-8%"
              width="116%"
              height="116%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g ref={svgMotionRef} filter="url(#stats-line-glow)">
            <g ref={svgDriftRef}>
              <circle
                className="stats-draw-path"
                cx="800"
                cy="300"
                r="220"
                fill="none"
                stroke="url(#stats-line-grad)"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                className="stats-draw-path"
                d="M -120 505 C 180 385 420 555 800 415 S 1220 255 1720 355"
                fill="none"
                stroke="url(#stats-line-grad)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(129,140,248,0.07),transparent_50%)]" />

        <div className="relative z-[1] mx-auto w-full max-w-5xl">
          <div className="stats-heading mb-14 text-center md:mb-16">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-foreground">
              Proof in the numbers
            </span>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-lg text-foreground/45 md:text-xl">
              Reliability and speed teams feel on day one.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10 max-w-5xl mx-auto">
            <ScrollCounter end={99} suffix="%" label="Uptime SLA" />
            <ScrollCounter end={50} suffix="x" label="Faster search" />
            <ScrollCounter end={10} suffix="k+" label="Docs processed" />
            <ScrollCounter end={85} suffix="%" label="Time saved" />
          </div>
        </div>
      </div>
    </section>
  );
}
