"use client";

import { motion, type Variants } from "framer-motion";
import { landingSvgGradientStops } from "@/constants/landing-visual-theme";

const viewport = { once: true, margin: "-80px 0px -40px 0px", amount: 0.2 } as const;

const easeOut = [0.22, 1, 0.36, 1] as const;

const sectionCardVariants: Variants = {
  hidden: { opacity: 0, y: 56 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeOut },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut },
  },
};

const stepRowVariants: Variants = {
  hidden: { opacity: 0, y: 52 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.62,
      ease: easeOut,
      staggerChildren: 0.12,
      delayChildren: 0.06,
    },
  },
};

const stepTextVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.48, ease: easeOut },
  },
};

const stepVisualVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.52, ease: easeOut },
  },
};

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
  return (
    <section className="relative bg-background px-6 py-32">
      <motion.div
        className="mx-auto h-full w-full max-w-5xl rounded-3xl bg-black p-5"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={sectionCardVariants}
      >
        <motion.div
          className="mb-20 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={headerVariants}
        >
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/55">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            From chaos to clarity in four steps
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-indigo-400/25 to-transparent md:block" />

          <div className="grid gap-16 md:gap-24">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className={`step-item flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-16 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
                initial="hidden"
                whileInView="visible"
                viewport={viewport}
                variants={stepRowVariants}
              >
                <motion.div className="flex-1" variants={stepTextVariants}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/35 font-mono text-xs text-indigo-300/90">
                      {step.num}
                    </span>
                    <span className="h-px w-8 bg-gradient-to-r from-indigo-400/35 to-transparent" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{step.title}</h3>
                  <p className="text-base leading-relaxed text-white/50">{step.description}</p>
                </motion.div>
                <motion.div
                  className="step-visual-panel relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.09] via-white/[0.02] to-violet-500/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] md:h-64 md:w-96"
                  variants={stepVisualVariants}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_40%_25%,rgba(129,140,248,0.14),transparent_58%)]" />
                  <div className="step-visual-inner relative z-[1] flex h-full w-full items-center justify-center px-6 py-4">
                    <StepVisual index={i} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
