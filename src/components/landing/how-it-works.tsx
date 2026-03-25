"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const items = sectionRef.current.querySelectorAll(".step-item");
    items.forEach((item, i) => {
      gsap.fromTo(
        item,
        { opacity: 0, x: i % 2 === 0 ? -60 : 60 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/60">
            How It Works
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            From chaos to clarity in four steps
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent hidden md:block" />

          <div className="grid gap-16 md:gap-24">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`step-item flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-16 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-400/30 font-mono text-xs text-indigo-400">
                      {step.num}
                    </span>
                    <span className="h-px w-8 bg-indigo-400/20" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="text-base leading-relaxed text-white/50">
                    {step.description}
                  </p>
                </div>
                <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] md:w-80">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full bg-indigo-400"
                      style={{
                        animation: `pulse 2s ease-in-out ${i * 0.3}s infinite`,
                      }}
                    />
                    <div
                      className="h-2 w-2 rounded-full bg-violet-400"
                      style={{
                        animation: `pulse 2s ease-in-out ${i * 0.3 + 0.2}s infinite`,
                      }}
                    />
                    <div
                      className="h-2 w-2 rounded-full bg-purple-400"
                      style={{
                        animation: `pulse 2s ease-in-out ${i * 0.3 + 0.4}s infinite`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
