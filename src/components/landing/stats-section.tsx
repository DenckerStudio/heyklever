"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollCounter } from "./scroll-counter";
import { landingSvgGradientStops } from "@/constants/landing-visual-theme";

gsap.registerPlugin(ScrollTrigger);

export function StatsSection() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    const ctx = gsap.context(() => {
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
          end: "+=95%",
          pin: pin,
          scrub: 0.6,
          anticipatePin: 1,
        },
      });

      if (paths?.length) {
        paths.forEach((path, i) => {
          const len = path.getTotalLength();
          tl.fromTo(
            path,
            { strokeDashoffset: len, opacity: 0.2 },
            { strokeDashoffset: 0, opacity: 0.75, ease: "none", duration: 0.45 },
            i * 0.12
          );
        });
      }

      tl.fromTo(
        pin.querySelector(".stats-heading"),
        { opacity: 0.35, y: 16 },
        { opacity: 1, y: 0, ease: "power2.out", duration: 0.35 },
        0.05
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative">
      <div
        ref={pinRef}
        className="relative flex min-h-screen items-center overflow-hidden px-6 py-24"
      >
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1200 600"
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
                  stopOpacity={s.opacity * 0.55}
                />
              ))}
            </linearGradient>
          </defs>
          <circle
            className="stats-draw-path"
            cx="600"
            cy="300"
            r="220"
            fill="none"
            stroke="url(#stats-line-grad)"
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="stats-draw-path"
            d="M 80 480 C 260 360 440 520 620 400 S 980 280 1120 380"
            fill="none"
            stroke="url(#stats-line-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="stats-draw-path"
            d="M 100 120 L 180 120 M 140 80 L 140 160"
            stroke="url(#stats-line-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(129,140,248,0.07),transparent_50%)]" />

        <div className="relative z-[1] mx-auto w-full max-w-5xl">
          <div className="stats-heading mb-14 text-center md:mb-16">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/50">
              Proof in the numbers
            </span>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-lg text-white/45 md:text-xl">
              Reliability and speed teams feel on day one.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
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
