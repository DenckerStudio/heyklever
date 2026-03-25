"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  {
    num: "01",
    title: "A single solution for\nmaximum, automated throughput",
    description:
      "Deep integrations anticipate incoming requests, enabling our AI technology to automate document processing and all critical team operations: from assigning categories and maintaining real-time visibility to coordinating workflows for efficient knowledge flow. It then closes the loop by validating outputs before delivery, providing comprehensive performance oversight across your entire organization.",
  },
  {
    num: "02",
    title: "Easy, scalable\noperation",
    description:
      "Klever AI was designed from the ground up for disruption-free operations. Easy to deploy and support, the system has a low IT lift with no third-party devices to manage, and a modern UI/UX that's intuitive for operators from day one. Configurable to your team, Klever AI integrates seamlessly with most document management and communication systems.",
  },
  {
    num: "03",
    title: "Rapid, repeatable\nROI",
    description:
      "We know that teams run on lean budgets, which is why we price our all-inclusive solution as a service with terms that scale with you. Ready to deploy right away, and rapid to grow over time. From onboarding to full production, Klever AI delivers measurable returns in weeks, not months.",
  },
];

export function BenefitsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const cards = el.querySelectorAll(".benefit-card");

      cards.forEach((card) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 75%",
            end: "top 25%",
            toggleActions: "play none none reverse",
          },
        });

        tl.fromTo(
          card.querySelector(".benefit-num"),
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }
        );
        tl.fromTo(
          card.querySelector(".benefit-title"),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "-=0.4"
        );
        tl.fromTo(
          card.querySelector(".benefit-desc"),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "-=0.5"
        );
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section id="benefits" ref={sectionRef} className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/60">
            Benefits
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            That&apos;s the{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Klever
            </span>{" "}
            advantage
          </h2>
        </div>

        <div className="grid gap-24 md:gap-32">
          {benefits.map((b, i) => (
            <div
              key={b.num}
              className={`benefit-card grid items-start gap-8 md:grid-cols-2 md:gap-16 ${
                i % 2 === 1 ? "md:direction-rtl" : ""
              }`}
            >
              <div className={i % 2 === 1 ? "md:order-2 md:text-left" : ""}>
                <div className="benefit-num mb-4 inline-flex items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-indigo-400">
                    Benefit {b.num}
                  </span>
                  <span className="h-px w-8 bg-indigo-400/30" />
                </div>
                <h3 className="benefit-title whitespace-pre-line text-3xl font-bold leading-tight text-white md:text-4xl">
                  {b.title}
                </h3>
              </div>
              <div className={i % 2 === 1 ? "md:order-1" : ""}>
                <p className="benefit-desc text-base leading-relaxed text-white/50">
                  {b.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
