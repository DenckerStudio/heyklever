"use client";

import { useRef, useEffect, useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { User, Database, Users, ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

// Animated Beam component with solid traveling line using Framer Motion
const AnimatedBeam = ({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  duration = 2,
  delay = 0,
  pathWidth = 2,
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fromRef: React.RefObject<HTMLDivElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  curvature?: number;
  duration?: number;
  delay?: number;
  pathWidth?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}) => {
  const id = useRef(`beam-${Math.random().toString(36).substring(2, 9)}`);
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [pathLength, setPathLength] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();

        const startX =
          fromRect.left - containerRect.left + fromRect.width / 2 + startXOffset;
        const startY =
          fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
        const endX =
          toRect.left - containerRect.left + toRect.width / 2 + endXOffset;
        const endY =
          toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

        const controlY = startY - curvature;
        const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`;

        setPathD(d);
        setSvgDimensions({
          width: containerRect.width,
          height: containerRect.height,
        });
      }
    };

    // Initial update with small delay to ensure refs are ready
    const timer = setTimeout(updatePath, 100);

    const resizeObserver = new ResizeObserver(updatePath);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset, isMounted]);

  // Calculate path length after path is set
  useEffect(() => {
    if (pathRef.current && pathD) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, [pathD]);

  if (!isMounted || !pathD || pathLength === 0) {
    return (
      <svg
        fill="none"
        width={svgDimensions.width || "100%"}
        height={svgDimensions.height || "100%"}
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute left-0 top-0"
        viewBox={`0 0 ${svgDimensions.width || 100} ${svgDimensions.height || 100}`}
      >
        <path ref={pathRef} d={pathD} stroke="transparent" fill="none" />
      </svg>
    );
  }

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute left-0 top-0 transform-gpu"
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <defs>
        {/* Primary gradient */}
        <linearGradient
          id={`${id.current}-gradient`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`${id.current}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Static background path */}
      <path
        d={pathD}
        stroke="#e5e7eb"
        strokeWidth={pathWidth}
        strokeOpacity={0.4}
        strokeLinecap="round"
        fill="none"
      />

      {/* Animated beam using motion.path */}
      <motion.path
        d={pathD}
        stroke={`url(#${id.current}-gradient)`}
        strokeWidth={pathWidth + 0.5}
        strokeLinecap="round"
        fill="none"
        filter={`url(#${id.current}-glow)`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 1, 1, 0],
          opacity: [1, 1, 1, 0],
        }}
        transition={{
          duration: duration,
          delay: delay,
          repeat: Infinity,
          repeatDelay: 1,
          times: [0, 0.4, 0.6, 1],
          ease: "easeInOut",
        }}
        style={{
          pathLength: 0,
        }}
      />

      {/* Glowing particle */}
      <motion.circle
        r="3"
        fill="#3b82f6"
        filter={`url(#${id.current}-glow)`}
        initial={{ offsetDistance: "0%", opacity: 0 }}
        animate={{
          offsetDistance: ["0%", "100%", "100%", "0%"],
          opacity: [1, 1, 0, 0],
        }}
        transition={{
          duration: duration,
          delay: delay,
          repeat: Infinity,
          repeatDelay: 1,
          times: [0, 0.4, 0.5, 1],
          ease: "easeInOut",
        }}
        style={{
          offsetPath: `path("${pathD}")`,
        }}
      />
    </svg>
  );
};

// Flow node component
const FlowNode = forwardRef<
  HTMLDivElement,
  {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    className?: string;
    isCenter?: boolean;
  }
>(({ icon, label, sublabel, className, isCenter }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className={cn("flex flex-col items-center gap-3 z-10", isCenter && "z-20", className)}
  >
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl border transition-all duration-300",
        isCenter
          ? "size-20 border-primary/30 shadow-lg shadow-primary/10 bg-background"
          : "size-16 border-black/10 dark:border-white/10 hover:border-primary/30 hover:shadow-md bg-background"
      )}
    >
      {isCenter && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-background" />
      )}
      <div
        className={cn(
          "relative z-10",
          isCenter ? "text-primary" : "text-muted-foreground"
        )}
      >
        {icon}
      </div>
    </div>
    <div className="text-center">
      <p
        className={cn(
          "text-sm font-medium",
          isCenter ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground/60 mt-0.5">{sublabel}</p>
      )}
    </div>
  </motion.div>
));
FlowNode.displayName = "FlowNode";

export default function CtaSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const ragRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  // Total cycle: 4s per beam segment
  // User→RAG: 0s start, travels 1.5s, pause 1s at RAG = 2.5s total phase
  // RAG→Team: starts at 2.5s, travels 1.5s, pause 1s at Team
  // Return beams follow similar pattern

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4"
          >
            <Sparkles className="size-3" />
            How it works
          </motion.span>
          <h2 className="text-3xl font-semibold md:text-4xl lg:text-5xl tracking-tight mb-4 text-foreground">
            <TextGenerateEffect
              words="Your knowledge, instantly accessible"
              className="inline"
              margin="-100px"
              duration={0.4}
            />
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg"
          >
            Upload your documents, ask questions, and get intelligent answers.
            KleverAI connects your team&apos;s knowledge in seconds.
          </motion.p>
        </div>

        {/* Animated Flow Diagram */}
        <div
          ref={containerRef}
          className="relative mx-auto max-w-3xl h-[280px] md:h-[320px]"
        >
          {/* Flow Nodes */}
          <div className="absolute inset-0 flex items-center justify-between px-4 md:px-12">
            <FlowNode
              ref={userRef}
              icon={<User className="size-6 md:size-7" />}
              label="You"
              sublabel="Ask anything"
            />

            <FlowNode
              ref={ragRef}
              icon={
                <Image
                  src="/logo-icon.png"
                  alt="KleverAI"
                  width={36}
                  height={36}
                  className="size-8 md:size-9"
                />
              }
              label="KleverAI"
              sublabel="RAG Engine"
              isCenter
            />

            <FlowNode
              ref={teamRef}
              icon={<Users className="size-6 md:size-7" />}
              label="Your Team"
              sublabel="Knowledge base"
            />
          </div>

          {/* Animated Beams - Sequential flow with pause at center */}
          {/* Forward flow: User → RAG (top curve) */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={userRef}
            toRef={ragRef}
            curvature={-50}
            duration={3}
            delay={0}
            pathWidth={1.5}
          />

          {/* Forward flow: RAG → Team (top curve) */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={ragRef}
            toRef={teamRef}
            curvature={-50}
            duration={3}
            delay={2}
            pathWidth={1.5}
          />

          {/* Return flow: Team → RAG (bottom curve) */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={teamRef}
            toRef={ragRef}
            curvature={50}
            duration={3}
            delay={4}
            pathWidth={1.5}
          />

          {/* Return flow: RAG → User (bottom curve) */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={ragRef}
            toRef={userRef}
            curvature={50}
            duration={3}
            delay={6}
            pathWidth={1.5}
          />

          {/* Flow labels */}
          <div className="absolute top-6 left-1/4 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="hidden md:inline">Questions</span>
            <ArrowRight className="size-3" />
          </div>
          <div className="absolute bottom-6 left-1/4 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/60">
            <ArrowRight className="size-3 rotate-180" />
            <span className="hidden md:inline">Answers</span>
          </div>
          <div className="absolute top-6 right-1/4 translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="hidden md:inline">Search</span>
            <ArrowRight className="size-3" />
          </div>
          <div className="absolute bottom-6 right-1/4 translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground/60">
            <ArrowRight className="size-3 rotate-180" />
            <span className="hidden md:inline">Knowledge</span>
          </div>
        </div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-12 mb-12"
        >
          {[
            { icon: <Database className="size-3.5" />, label: "Trained on your data" },
            { icon: <Sparkles className="size-3.5" />, label: "AI-Powered" },
            { icon: <Users className="size-3.5" />, label: "Team Collaboration" },
          ].map((feature, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/10 bg-background/50 backdrop-blur-sm text-xs font-medium text-muted-foreground"
            >
              {feature.icon}
              {feature.label}
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="min-w-[200px] bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white shadow-lg shadow-primary/20"
          >
            Get Started Today
            <ArrowRight className="ml-2 size-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-w-[200px] border-black/10 dark:border-white/10"
          >
            Watch Demo
          </Button>
        </motion.div>

        {/* Trust badge */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-xs text-muted-foreground/50 mt-8"
        >
          No credit card required • Free tier available • Setup in minutes
        </motion.p>
      </div>
    </section>
  );
}
