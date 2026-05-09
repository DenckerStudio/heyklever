"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

type TestimonialTheme = {
  label: string;
  /** Tailwind gradient classes for the outer border (no `bg-gradient-to-br` prefix). */
  borderGradient: string;
  /** CSS background value for the inner radial glow. */
  glow: string;
  /** Border color utility for corner brackets. */
  cornerBorder: string;
  /** Ring utilities for the monogram (includes ring-2, ring-offset-2, ring-offset color). */
  ring: string;
  /** Tailwind gradient for active progress fill (full `bg-gradient-to-r ...`). */
  progressFill: string;
  /** Muted fill for segments before the active one. */
  progressComplete: string;
  /** Tailwind for decorative quote mark (full `bg-gradient-to-br ... bg-clip-text text-transparent`). */
  quoteMark: string;
  /** Chip border + text tint. */
  chip: string;
  /** Horizontal rule after avatar row: `from-… via-… to-transparent` for `bg-gradient-to-r`. */
  accentRule: string;
};

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
  theme: TestimonialTheme;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "We have not seen this kind of accuracy with AI-powered document intelligence. This is a significant milestone in the race to modernize team knowledge.",
    author: "Sarah Chen",
    role: "VP of Engineering",
    company: "Acme Corp",
    theme: {
      label: "Engineering",
      borderGradient: "from-cyan-400/75 via-sky-500/45 to-blue-600/70",
      glow: "radial-gradient(ellipse 75% 55% at 92% 10%, rgba(34,211,238,0.14), transparent 52%)",
      cornerBorder: "border-cyan-400/40",
      ring: "ring-2 ring-cyan-400/55 ring-offset-2 ring-offset-[#0a0a0a]",
      progressFill: "bg-gradient-to-r from-cyan-400 to-blue-500",
      progressComplete: "bg-cyan-400/45",
      quoteMark:
        "bg-gradient-to-br from-cyan-200 via-sky-300 to-blue-400 bg-clip-text text-transparent",
      chip: "border-cyan-400/30 text-cyan-200/80 bg-cyan-400/[0.06]",
      accentRule: "from-cyan-400/90 via-sky-400/45 to-transparent",
    },
  },
  {
    quote:
      "Klever AI transformed how our distributed team accesses and shares institutional knowledge. The ROI was visible within the first month.",
    author: "Marcus Webb",
    role: "Head of Operations",
    company: "NovaTech",
    theme: {
      label: "Operations",
      borderGradient: "from-violet-400/75 via-fuchsia-500/50 to-purple-600/70",
      glow: "radial-gradient(ellipse 70% 50% at 88% 18%, rgba(167,139,250,0.13), transparent 55%)",
      cornerBorder: "border-violet-400/40",
      ring: "ring-2 ring-violet-400/55 ring-offset-2 ring-offset-[#0a0a0a]",
      progressFill: "bg-gradient-to-r from-violet-400 to-fuchsia-500",
      progressComplete: "bg-violet-400/45",
      quoteMark:
        "bg-gradient-to-br from-violet-200 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent",
      chip: "border-violet-400/30 text-violet-200/80 bg-violet-400/[0.06]",
      accentRule: "from-violet-400/90 via-fuchsia-400/45 to-transparent",
    },
  },
  {
    quote:
      "The integration was seamless and the AI accuracy is remarkable. Our support team now resolves queries in half the time.",
    author: "Elena Frost",
    role: "Director of Customer Success",
    company: "CloudScale",
    theme: {
      label: "Customer success",
      borderGradient: "from-emerald-400/75 via-teal-500/45 to-cyan-600/55",
      glow: "radial-gradient(ellipse 72% 52% at 90% 14%, rgba(52,211,153,0.12), transparent 54%)",
      cornerBorder: "border-emerald-400/40",
      ring: "ring-2 ring-emerald-400/55 ring-offset-2 ring-offset-[#0a0a0a]",
      progressFill: "bg-gradient-to-r from-emerald-400 to-teal-500",
      progressComplete: "bg-emerald-400/45",
      quoteMark:
        "bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-400 bg-clip-text text-transparent",
      chip: "border-emerald-400/30 text-emerald-200/80 bg-emerald-400/[0.06]",
      accentRule: "from-emerald-400/90 via-teal-400/45 to-transparent",
    },
  },
];

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]!}${parts[1][0]!}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((p) => (p + 1) % testimonials.length),
      7000
    );
    return () => clearInterval(timer);
  }, []);

  const current = testimonials[active];
  const t = current.theme;

  const motionEnter = useMemo(
    () => ({
      opacity: reduceMotion ? 1 : 0,
      y: reduceMotion ? 0 : 28,
    }),
    [reduceMotion]
  );

  const motionExit = useMemo(
    () => ({
      opacity: reduceMotion ? 1 : 0,
      y: reduceMotion ? 0 : -24,
    }),
    [reduceMotion]
  );

  return (
    <section
      id="testimonials"
      className="relative py-32 px-6 bg-background overflow-hidden"
    >
        <Image
          src="/gradient_11.svg"
          alt="Planet"
          width={1000}
          height={1000}
          className="absolute scale-[100%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"
        />
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 flex items-center gap-4">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            Built by the Industry
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div
          className={`rounded-3xl bg-gradient-to-br p-px shadow-[0_0_0_1px_rgba(255,255,255,0.04)] motion-safe:transition-[background-image] motion-safe:duration-500 ${t.borderGradient}`}
        >
          <div className="relative overflow-hidden rounded-[inherit] bg-[#0a0a0a]/88 backdrop-blur-md">
            <div
              className="pointer-events-none absolute inset-0 motion-safe:transition-opacity motion-safe:duration-500"
              style={{ background: t.glow }}
              aria-hidden
            />

            <div
              className={`pointer-events-none absolute left-5 top-5 z-[1] h-9 w-9 rounded-tl-lg border-l-2 border-t-2 md:left-7 md:top-7 ${t.cornerBorder}`}
              aria-hidden
            />
            <div
              className={`pointer-events-none absolute bottom-5 right-5 z-[1] h-9 w-9 rounded-br-lg border-b-2 border-r-2 md:bottom-7 md:right-7 ${t.cornerBorder}`}
              aria-hidden
            />

            <div className="relative z-[2] min-h-[min(22rem,70vw)] px-6 py-10 md:px-10 md:py-12">
              <AnimatePresence mode="wait">
                <motion.div
                  id={`testimonial-panel-${active}`}
                  role="tabpanel"
                  aria-labelledby={`testimonial-tab-${active}`}
                  key={active}
                  initial={motionEnter}
                  animate={{ opacity: 1, y: 0 }}
                  exit={motionExit}
                  transition={{
                    duration: reduceMotion ? 0.15 : 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <span
                    className={`relative mb-6 inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.18em] backdrop-blur-sm ${t.chip}`}
                  >
                    {t.label}
                  </span>

                  <blockquote className="relative">
                    <span
                      className={`pointer-events-none select-none font-serif text-[4.5rem] leading-none md:text-[5.5rem] ${t.quoteMark}`}
                      aria-hidden
                    >
                      &ldquo;
                    </span>
                    <p className="-mt-8 text-2xl font-light leading-relaxed text-white/88 md:-mt-10 md:text-3xl lg:text-[2.125rem] lg:leading-snug">
                      {current.quote}
                    </p>
                  </blockquote>

                  <div className="relative mt-10 flex items-center gap-4 md:mt-12">
                    <div
                      className={`h-px w-12 shrink-0 bg-gradient-to-r ${t.accentRule}`}
                      aria-hidden
                    />
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold tracking-tight text-white ${t.ring}`}
                    >
                      {authorInitials(current.author)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {current.author}
                      </p>
                      <p className="text-xs text-white/45">
                        <span>{current.role}</span>
                        <span className="text-white/25"> · </span>
                        <span className="font-mono tracking-wide text-white/55">
                          {current.company}
                        </span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div
          className="mt-10 flex gap-2 md:mt-12"
          role="tablist"
          aria-label="Testimonial slides"
        >
          {testimonials.map((item, i) => {
            const itemTheme = item.theme;
            return (
              <button
                key={item.author}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls={`testimonial-panel-${i}`}
                id={`testimonial-tab-${i}`}
                onClick={() => setActive(i)}
                className="group relative h-2 flex-1 overflow-hidden rounded-full bg-white/10 outline-none ring-offset-2 ring-offset-[#0a0a0a] transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-white/30"
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setActive((i + 1) % testimonials.length);
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setActive(
                      (i - 1 + testimonials.length) % testimonials.length,
                    );
                  }
                }}
              >
                {i < active && (
                  <div
                    className={`absolute inset-0 ${itemTheme.progressComplete}`}
                    aria-hidden
                  />
                )}
                {i === active && (
                  <motion.div
                    className={`absolute inset-y-0 left-0 ${itemTheme.progressFill}`}
                    initial={{ width: reduceMotion ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: reduceMotion ? 0 : 7,
                      ease: "linear",
                    }}
                  />
                )}
                <span className="sr-only">
                  Show testimonial {i + 1}: {item.author} at {item.company}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
