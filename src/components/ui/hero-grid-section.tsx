"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const FLIP_WORDS = [
  "Teams",
  "Studios",
  "Schools",
  "Agencies",
  "Startups",
  "Enterprises",
  "Creators",
];

function FlipPhrase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FLIP_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative flex h-4 items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={FLIP_WORDS[index]}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
          className="whitespace-nowrap text-xs font-medium tracking-wide"
        >
          <span className="text-foreground/50">Built for </span>
          <span className="text-foreground">{FLIP_WORDS[index]}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface Avatar {
  id: number;
  src: string;
  alt: string;
}

const AVATARS: Avatar[] = [
  { id: 1, src: "https://i.pravatar.cc/40?img=12", alt: "Customer avatar 1" },
  { id: 2, src: "https://i.pravatar.cc/40?img=32", alt: "Customer avatar 2" },
  { id: 3, src: "https://i.pravatar.cc/40?img=45", alt: "Customer avatar 3" },
  { id: 4, src: "https://i.pravatar.cc/40?img=56", alt: "Customer avatar 4" },
];

function AnimatedHeading() {
  const words = ["Think", "less.", "Create", "more."];
  
  return (
    <h1 className="!max-w-screen-lg text-pretty text-center text-[clamp(32px,7vw,64px)] font-medium leading-none tracking-[-1.44px] md:tracking-[-2.16px]">
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.6,
            delay: index * 0.15,
            ease: [0.25, 0.4, 0.25, 1],
          }}
          className={cn(
            "inline-block mr-[0.25em]",
            index < 2
              ? "text-foreground/60"
              : "bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent"
          )}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

export function HeroGridSection() {
  return (
    <HeroGrid
      avatars={AVATARS}
      title={<AnimatedHeading />}
      subtitle="Your AI companion for writing, learning, and building ideas."
      primaryCtaText="Request Demo"
      secondaryCtaText="Get Started For Free"
    />
  );
}

interface HeroGridSectionProps {
  avatars: Avatar[];
  title?: ReactNode | string;
  subtitle?: ReactNode | string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  onPrimaryCtaClick?: () => void;
  onSecondaryCtaClick?: () => void;
  className?: string;
}

export function HeroGrid({
  avatars = AVATARS,
  title = "Build, launch, and scale your product faster",
  subtitle = "A modern platform that helps teams ship better software with less effort.",
  primaryCtaText = "Request Demo",
  secondaryCtaText = "Get Started For Free",
  onPrimaryCtaClick,
  onSecondaryCtaClick,
  className,
}: HeroGridSectionProps) {
  return (
    <section
      className={cn(
        "relative min-h-[100vh] overflow-hidden pb-10 flex flex-col justify-center",
        className
      )}
    >
      <div className="absolute inset-0 z-0 grid h-full w-full grid-cols-[1fr_800px_1fr] mt-[80px]">
        {/* Animated Grid Lines */}
        <div className="col-span-1 flex h-full items-center justify-center" />
        <div className="col-span-1 relative flex h-full items-center justify-center">
          {/* Left vertical line */}
          <motion.div
            className="absolute left-0 top-0 h-full w-px bg-border"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            style={{ transformOrigin: "top" }}
          />
          {/* Right vertical line */}
          <motion.div
            className="absolute right-0 top-0 h-full w-px bg-border"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            style={{ transformOrigin: "top" }}
          />
        </div>
        <div className="col-span-1 flex h-full items-center justify-center" />
        {/* Bottom horizontal line */}
        <motion.div
          className="absolute bottom-0 left-0 h-px w-full bg-border"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          style={{ transformOrigin: "center" }}
        />
      </div>
      {/* --- */}
      <figure className="pointer-events-none absolute -bottom-[70%] left-1/2 z-0 block aspect-square w-[520px] -translate-x-1/2 rounded-full bg-[--accent-500-40] blur-[200px]" />
      <figure className="pointer-events-none absolute left-[4vw] top-[64px] z-20 hidden aspect-square w-[32vw] rounded-full bg-[--surface-primary] opacity-50 blur-[100px] dark:bg-[--dark-surface-primary] md:block" />
      <figure className="pointer-events-none absolute bottom-[-50px] right-[7vw] z-20 hidden aspect-square w-[30vw] rounded-full bg-[--surface-primary] opacity-50 blur-[100px] dark:bg-[--dark-surface-primary] md:block" />
      {/* --- */}
      <div className="relative z-10 flex flex-col pt-[80px]">
        {/* Organization badge with animated border */}
        <div className="relative flex flex-col items-center justify-end pb-px">
          <motion.div
            className="flex items-center w-52 justify-center gap-2 border border-b-0 border-border px-4 py-2.5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <FlipPhrase />
          </motion.div>
          {/* Animated horizontal divider */}
          <motion.div
            className="absolute bottom-0 left-0 h-px w-full bg-border"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            style={{ transformOrigin: "center" }}
          />
        </div>

        {/* Title section */}
        <div className="relative">
          <div className="mx-auto flex min-h-[288px] max-w-[80vw] shrink-0 flex-col items-center justify-center gap-4 px-2 py-4 sm:px-16 lg:px-24">
            {typeof title === "string" ? (
              <h1 className="!max-w-screen-lg text-pretty text-center text-[clamp(32px,7vw,64px)] font-medium leading-none tracking-[-1.44px] md:tracking-[-2.16px] bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                {title}
              </h1>
            ) : (
              title
            )}
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
              className="text-md max-w-2xl text-pretty text-center text-muted-foreground md:text-lg"
            >
              {subtitle}
            </motion.h2>
          </div>
          {/* Animated horizontal divider */}
          <motion.div
            className="absolute bottom-0 left-0 h-px w-full bg-border"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            style={{ transformOrigin: "center" }}
          />
        </div>

        {/* Buttons section */}
        <div className="flex items-start justify-center px-8.25 sm:px-24">
          <div className="flex w-full max-w-[80vw] flex-col items-center justify-start md:!max-w-[392px]">
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <Button
                className="!h-14 flex-col items-center justify-center rounded-none !text-base flex w-full max-w-sm:!border-x-0 !border-x !border-y-0 border-border !bg-transparent backdrop-blur-xl transition-all duration-200 hover:!bg-foreground/5 cursor-pointer"
                variant="outline"
                onClick={onPrimaryCtaClick}
              >
                {primaryCtaText}
              </Button>
            </motion.div>
            <motion.div
              className="relative w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {/* Top border of second button */}
              <motion.div
                className="absolute top-0 left-0 h-px w-full bg-border"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 1.0, ease: [0.25, 0.4, 0.25, 1] }}
                style={{ transformOrigin: "center" }}
              />
              <Button
                className="max-w-sm:!border-x-0 flex w-full !border-x !border-y-0 border-border bg-gradient-to-b from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 dark:hover:from-indigo-500 dark:hover:to-indigo-600 backdrop-blur-xl transition-all duration-200 !h-14 flex-col items-center justify-center rounded-none !text-base cursor-pointer text-white"
                onClick={onSecondaryCtaClick}
              >
                {secondaryCtaText}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
