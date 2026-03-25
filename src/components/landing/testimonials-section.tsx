"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const testimonials = [
  {
    quote:
      "We have not seen this kind of accuracy with AI-powered document intelligence. This is a significant milestone in the race to modernize team knowledge.",
    author: "Sarah Chen",
    role: "VP of Engineering",
    company: "Acme Corp",
  },
  {
    quote:
      "Klever AI transformed how our distributed team accesses and shares institutional knowledge. The ROI was visible within the first month.",
    author: "Marcus Webb",
    role: "Head of Operations",
    company: "NovaTech",
  },
  {
    quote:
      "The integration was seamless and the AI accuracy is remarkable. Our support team now resolves queries in half the time.",
    author: "Elena Frost",
    role: "Director of Customer Success",
    company: "CloudScale",
  },
];

export function TestimonialsSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((p) => (p + 1) % testimonials.length),
      7000
    );
    return () => clearInterval(timer);
  }, []);

  const current = testimonials[active];

  return (
    <section id="testimonials" className="relative py-32 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 flex items-center gap-4">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            Built by the Industry
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <blockquote className="text-2xl font-light leading-relaxed text-white/80 md:text-3xl lg:text-4xl">
                &ldquo;{current.quote}&rdquo;
              </blockquote>

              <div className="mt-10 flex items-center gap-4">
                <div className="h-px w-8 bg-indigo-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {current.author}
                  </p>
                  <p className="text-xs text-white/40">
                    {current.role}, {current.company}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 flex gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="group relative h-1 flex-1 overflow-hidden rounded-full bg-white/10"
            >
              {i === active && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-indigo-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 7, ease: "linear" }}
                />
              )}
              {i < active && (
                <div className="absolute inset-0 bg-indigo-400/40" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
