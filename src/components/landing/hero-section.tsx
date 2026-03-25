"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "motion/react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const line1 = "We have reinvented";
const line2 = "the future of";
const line3 = "team intelligence.";

const altLine1 = "One connected layer";
const altLine2 = "for every document,";
const altLine3 = "decision, and team.";

function splitToChars(text: string, className?: string) {
  return text.split("").map((char, i) => (
    <span
      key={i}
      className={`hero-char inline-block ${className ?? ""}`}
      style={{ perspective: "500px" }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const headingARef = useRef<HTMLDivElement>(null);
  const headingBRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    const ctx = gsap.context(() => {
      const charsA = headingARef.current?.querySelectorAll(".hero-char");
      const charsB = headingBRef.current?.querySelectorAll(".hero-char");
      const paths = svgRef.current?.querySelectorAll<SVGGeometryElement>(
        ".hero-draw-path"
      );

      if (charsA?.length) {
        gsap.fromTo(
          charsA,
          { y: 120, opacity: 0, rotateX: -90 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.02,
            duration: 1.2,
            ease: "power4.out",
            delay: 0.25,
          }
        );
      }

      if (charsB?.length) {
        gsap.set(charsB, { y: 48, opacity: 0, rotateX: -35 });
      }

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
          end: "+=130%",
          pin: pin,
          scrub: 0.85,
          anticipatePin: 1,
        },
      });

      if (charsA?.length) {
        tl.to(
          charsA,
          {
            y: -56,
            opacity: 0,
            rotateX: 28,
            stagger: 0.015,
            ease: "power2.in",
          },
          0
        );
      }

      if (charsB?.length) {
        tl.to(
          charsB,
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.02,
            ease: "power3.out",
          },
          0.22
        );
      }

      if (subRef.current) {
        tl.fromTo(
          subRef.current,
          { opacity: 1, y: 0 },
          { opacity: 0.35, y: -12, ease: "none" },
          0
        );
        tl.to(subRef.current, { opacity: 1, y: 0, ease: "power2.out" }, 0.45);
      }

      if (ctaRef.current) {
        tl.fromTo(
          ctaRef.current,
          { opacity: 1, y: 0, scale: 1 },
          { opacity: 0, y: 16, scale: 0.97, ease: "power2.in" },
          0
        );
        tl.to(
          ctaRef.current,
          { opacity: 1, y: 0, scale: 1, ease: "power2.out" },
          0.5
        );
      }

      if (paths?.length) {
        paths.forEach((path, i) => {
          const len = path.getTotalLength();
          tl.fromTo(
            path,
            { strokeDashoffset: len },
            { strokeDashoffset: 0, ease: "none" },
            0.05 + i * 0.06
          );
        });
      }

      if (veilRef.current) {
        tl.fromTo(
          veilRef.current,
          { opacity: 0 },
          { opacity: 1, ease: "power1.inOut" },
          0.55
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative">
      <div
        ref={pinRef}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      >
        <div
          ref={veilRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent opacity-0"
          aria-hidden
        />

        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="hero-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path
            className="hero-draw-path"
            d="M -40 180 Q 280 60 560 140 T 1240 100"
            fill="none"
            stroke="url(#hero-line-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="hero-draw-path"
            d="M 1240 620 Q 840 740 480 660 T -80 720"
            fill="none"
            stroke="url(#hero-line-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.65"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            className="hero-draw-path"
            cx="1040"
            cy="200"
            r="72"
            fill="none"
            stroke="url(#hero-line-grad)"
            strokeWidth="1.5"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative z-10 text-center">
          <div className="relative min-h-[clamp(8rem,22vw,14rem)]">
            <div
              ref={headingARef}
              className="absolute inset-x-0 top-0 overflow-visible"
            >
              <h1 className="text-[clamp(2.5rem,8vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
                <span className="block">{splitToChars(line1)}</span>
                <span className="block">{splitToChars(line2)}</span>
                <span className="block">
                  {splitToChars(
                    line3,
                    "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent"
                  )}
                </span>
              </h1>
            </div>

            <div
              ref={headingBRef}
              className="absolute inset-x-0 top-0 overflow-visible"
              aria-hidden
            >
              <p className="m-0 text-[clamp(2.5rem,8vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
                <span className="block">{splitToChars(altLine1)}</span>
                <span className="block">{splitToChars(altLine2)}</span>
                <span className="block">
                  {splitToChars(
                    altLine3,
                    "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent"
                  )}
                </span>
              </p>
            </div>
          </div>

          <p
            ref={subRef}
            className="mx-auto mt-8 max-w-2xl text-base text-white/50 md:text-lg"
          >
            AI-native technology that turns scattered knowledge into connected workflows.
            From documents to decisions, Klever AI makes your team smarter.
          </p>

          <div
            ref={ctaRef}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="/signup"
              className="group relative rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90"
            >
              <span className="relative z-10">Get Started Free</span>
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-white/20 px-8 py-3 text-sm font-medium text-white/70 transition-all hover:border-white/40 hover:text-white"
            >
              View Documentation
            </Link>
          </div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <motion.div
            className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 p-1"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="h-1.5 w-0.5 rounded-full bg-white/50" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
