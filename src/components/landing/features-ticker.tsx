"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { num: "01", text: "Autonomous, agentic AI-driven workflows from upload to insight" },
  { num: "02", text: "Single pane of glass visibility across all team knowledge" },
  { num: "03", text: "Managed by a unified platform with AI-powered search" },
  { num: "04", text: "Highly configurable to every team in your organization" },
  { num: "05", text: "Unlocked value from your existing documents and data" },
  { num: "06", text: "Digitally transformed, data rich, and predictive" },
];

export function FeaturesTicker() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const items = el.querySelectorAll(".feature-item");
      gsap.set(items, { autoAlpha: 0, y: 36 });

      items.forEach((item, i) => {
        const enterTween = gsap.to(item, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          paused: true,
          delay: i * 0.05,
        });

        ScrollTrigger.create({
          trigger: item,
          start: "top 85%",
          onEnter: () => enterTween.play(),
          onLeaveBack: () => enterTween.reverse(),
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-32 px-6 bg-background"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 flex items-end justify-between border-b border-white/10 pb-6">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            Platform Capabilities
          </h2>
        </div>

        <div className="grid gap-0">
          {features.map((f) => (
            <div
              key={f.num}
              className="feature-item group flex items-start gap-6 border-b border-white/5 py-6 transition-colors hover:border-white/20"
            >
              <span className="mt-1 font-mono text-xs text-indigo-400/60">
                {f.num}
              </span>
              <p className="text-lg font-light text-white/70 transition-colors group-hover:text-white md:text-xl">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
