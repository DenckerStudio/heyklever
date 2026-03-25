"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { landingSvgGradientStops } from "@/constants/landing-visual-theme";

gsap.registerPlugin(ScrollTrigger);

const line1 = "We have reinvented";
const line2 = "the future of";
const line3 = "team intelligence.";

const altLine1 = "One connected layer";
const altLine2 = "for every document,";
const altLine3 = "decision, and team.";

const gradientText =
  "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent";

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
  const svgGroupRef = useRef<SVGGElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end start"],
  });
  const scrollCueOpacity = useTransform(scrollYProgress, [0, 0.82], [1, 0]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    const ctx = gsap.context(() => {
      const charsA = headingARef.current?.querySelectorAll(".hero-char");
      const charsB = headingBRef.current?.querySelectorAll(".hero-char");
      const paths = svgRef.current?.querySelectorAll<SVGGeometryElement>(".hero-draw-path");

      if (charsA?.length) {
        gsap.fromTo(
          charsA,
          { y: 100, opacity: 0, rotateX: -78 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.018,
            duration: 1.05,
            ease: "power4.out",
            delay: 0.2,
          }
        );
      }

      if (charsB?.length) {
        gsap.set(charsB, { y: 40, opacity: 0, rotateX: -28, filter: "blur(6px)" });
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
          end: "+=165%",
          pin: pin,
          scrub: 0.55,
          anticipatePin: 1,
        },
      });

      if (svgGroupRef.current) {
        tl.fromTo(
          svgGroupRef.current,
          { y: 10, opacity: 0.55 },
          { y: 0, opacity: 1, ease: "none", duration: 0.35 },
          0
        );
        tl.to(svgGroupRef.current, { y: -14, opacity: 0.85, ease: "none" }, 0.45);
      }

      if (glowRef.current) {
        tl.fromTo(
          glowRef.current,
          { opacity: 0.25, scale: 0.92 },
          { opacity: 0.55, scale: 1.05, ease: "power1.out" },
          0.15
        );
        tl.to(glowRef.current, { opacity: 0.35, scale: 1.12, ease: "none" }, 0.55);
      }

      if (charsA?.length) {
        tl.to(
          charsA,
          {
            y: -44,
            opacity: 0,
            rotateX: 22,
            filter: "blur(8px)",
            stagger: { each: 0.012, from: "start" },
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
            filter: "blur(0px)",
            stagger: { each: 0.016, from: "center" },
            ease: "power3.out",
          },
          0.26
        );
        tl.to(charsB, { y: -6, ease: "power1.out" }, 0.62);
      }

      if (subRef.current) {
        tl.fromTo(
          subRef.current,
          { opacity: 1, y: 0 },
          { opacity: 0.2, y: -10, ease: "power1.in" },
          0
        );
        tl.to(subRef.current, { opacity: 1, y: 0, ease: "power2.out" }, 0.38);
      }

      if (ctaRef.current) {
        tl.fromTo(
          ctaRef.current,
          { opacity: 1, y: 0, scale: 1 },
          { opacity: 0, y: 20, scale: 0.96, ease: "power2.in" },
          0
        );
        tl.to(
          ctaRef.current,
          { opacity: 1, y: 0, scale: 1, ease: "back.out(1.2)" },
          0.42
        );
      }

      if (paths?.length) {
        paths.forEach((path) => {
          const order = Number(path.dataset.drawOrder ?? "0");
          const len = path.getTotalLength();
          const startT = 0.06 + order * 0.07;
          tl.fromTo(
            path,
            { strokeDashoffset: len, opacity: path.dataset.dim === "1" ? 0.35 : 0.95 },
            {
              strokeDashoffset: 0,
              opacity: Number(path.dataset.targetOpacity ?? 1),
              ease: "none",
              duration: 0.42,
            },
            startT
          );
        });
      }

      if (veilRef.current) {
        tl.fromTo(
          veilRef.current,
          { opacity: 0 },
          { opacity: 1, ease: "power1.inOut" },
          0.58
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative">
      <div
        ref={pinRef}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 sm:px-8"
      >
        <div
          ref={glowRef}
          className="pointer-events-none absolute left-1/2 top-[38%] h-[min(52vw,28rem)] w-[min(92vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.14),rgba(167,139,250,0.06)_45%,transparent_70%)] opacity-[0.25]"
          aria-hidden
        />

        <div
          ref={veilRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/55 to-transparent opacity-0"
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
              {landingSvgGradientStops.map((s) => (
                <stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                />
              ))}
            </linearGradient>
          </defs>
          <g ref={svgGroupRef}>
            <path
              className="hero-draw-path"
              data-draw-order="0"
              data-target-opacity="0.88"
              d="M -48 200 Q 260 72 540 148 T 1220 112"
              fill="none"
              stroke="url(#hero-line-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="hero-draw-path"
              data-draw-order="1"
              data-dim="1"
              data-target-opacity="0.55"
              d="M 1220 628 Q 820 752 460 672 T -96 736"
              fill="none"
              stroke="url(#hero-line-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              className="hero-draw-path"
              data-draw-order="2"
              data-target-opacity="0.5"
              cx="1020"
              cy="188"
              r="76"
              fill="none"
              stroke="url(#hero-line-grad)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className="hero-draw-path"
              data-draw-order="3"
              data-dim="1"
              data-target-opacity="0.4"
              d="M 140 620 C 280 520 420 720 560 600 S 840 480 980 560"
              fill="none"
              stroke="url(#hero-line-grad)"
              strokeWidth="1.25"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>

        <div className="relative z-10 mx-auto w-full max-w-[min(52rem,100%)] text-center">
          <div className="relative mx-auto min-h-[clamp(7.5rem,20vw,13.5rem)] max-w-[min(48rem,100%)]">
            <div
              ref={headingARef}
              className="absolute inset-x-0 top-0 overflow-visible px-1"
            >
              <h1 className="text-[clamp(2.25rem,6.5vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.038em] text-white">
                <span className="block">{splitToChars(line1)}</span>
                <span className="block">{splitToChars(line2)}</span>
                <span className="block">{splitToChars(line3, gradientText)}</span>
              </h1>
            </div>

            <div ref={headingBRef} className="absolute inset-x-0 top-0 overflow-visible px-1" aria-hidden>
              <p className="m-0 text-[clamp(2.25rem,6.5vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.038em] text-white">
                <span className="block">{splitToChars(altLine1)}</span>
                <span className="block">{splitToChars(altLine2)}</span>
                <span className="block">{splitToChars(altLine3, gradientText)}</span>
              </p>
            </div>
          </div>

          <p
            ref={subRef}
            className="mx-auto mt-8 max-w-[34rem] text-pretty text-base leading-relaxed text-white/55 md:text-lg"
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
              className="rounded-full border border-indigo-400/25 bg-white/[0.03] px-8 py-3 text-sm font-medium text-white/75 transition-all hover:border-indigo-400/45 hover:text-white"
            >
              View Documentation
            </Link>
          </div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          style={{ opacity: scrollCueOpacity }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.7 }}
        >
          <motion.div
            className="flex h-8 w-5 items-start justify-center rounded-full border border-white/25 p-1"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="h-1.5 w-0.5 rounded-full bg-indigo-300/70" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
