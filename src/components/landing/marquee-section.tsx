"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landingSvgGradientStops } from "@/constants/landing-visual-theme";

gsap.registerPlugin(ScrollTrigger);

export function MarqueeSection() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!root || !pin || !track) return;

    const firstChild = track.children[0] as HTMLElement;
    if (!firstChild) return;

    const ctx = gsap.context(() => {
      const paths = svgRef.current?.querySelectorAll<SVGGeometryElement>(".marquee-draw-path");
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
          end: "+=115%",
          pin: pin,
          scrub: 0.65,
          anticipatePin: 1,
        },
      });

      tl.to(
        track,
        {
          x: () => -(firstChild.offsetWidth + 40),
          ease: "none",
          duration: 1,
        },
        0
      );

      if (paths?.length) {
        paths.forEach((path, i) => {
          const len = path.getTotalLength();
          tl.fromTo(
            path,
            { strokeDashoffset: len, opacity: 0.25 },
            { strokeDashoffset: 0, opacity: 0.55, ease: "none", duration: 0.38 },
            0.08 + i * 0.1
          );
        });
      }
    }, root);

    return () => ctx.revert();
  }, []);

  const text = "AI-Powered · Team Intelligence · RAG Search · Document Generation · Workflow Automation · ";

  return (
    <section ref={rootRef} className="relative overflow-hidden">
      <div
        ref={pinRef}
        className="relative flex min-h-screen flex-col justify-center overflow-hidden border-y border-white/[0.06] py-12"
      >
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
          viewBox="0 0 1400 400"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="marquee-line-grad" x1="0%" y1="50%" x2="100%" y2="50%">
              {landingSvgGradientStops.map((s) => (
                <stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={Math.min(1, s.opacity * 0.65)}
                />
              ))}
            </linearGradient>
          </defs>
          <path
            className="marquee-draw-path"
            d="M -40 120 Q 320 40 700 120 T 1440 100"
            fill="none"
            stroke="url(#marquee-line-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="marquee-draw-path"
            d="M 1440 300 Q 1020 360 700 280 T -40 320"
            fill="none"
            stroke="url(#marquee-line-grad)"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(99,102,241,0.06),transparent_55%)]" />

        <div ref={trackRef} className="relative z-[1] flex whitespace-nowrap">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="mr-10 text-[clamp(3rem,8vw,7rem)] font-bold tracking-[-0.03em] text-white/[0.055]"
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
