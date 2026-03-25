"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import Link from "next/link";

export function HeroSection() {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headingRef.current) return;
    const chars = headingRef.current.querySelectorAll(".hero-char");
    gsap.fromTo(
      chars,
      { y: 120, opacity: 0, rotateX: -90 },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        stagger: 0.02,
        duration: 1.2,
        ease: "power4.out",
        delay: 0.3,
      }
    );
  }, []);

  const line1 = "We have reinvented";
  const line2 = "the future of";
  const line3 = "team intelligence.";

  const splitToChars = (text: string, className?: string) =>
    text.split("").map((char, i) => (
      <span
        key={i}
        className={`hero-char inline-block ${className ?? ""}`}
        style={{ perspective: "500px" }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div ref={headingRef} className="relative z-10 text-center">
        <div className="overflow-hidden">
          <h1 className="text-[clamp(2.5rem,8vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
            <span className="block">{splitToChars(line1)}</span>
            <span className="block">{splitToChars(line2)}</span>
            <span className="block">
              {splitToChars(line3, "bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent")}
            </span>
          </h1>
        </div>

        <motion.p
          className="mx-auto mt-8 max-w-2xl text-base text-white/50 md:text-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
        >
          AI-native technology that turns scattered knowledge into connected workflows.
          From documents to decisions, Klever AI makes your team smarter.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5, ease: "easeOut" }}
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
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
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
    </section>
  );
}
