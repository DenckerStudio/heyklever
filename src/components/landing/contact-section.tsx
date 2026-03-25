"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLATFORM_PLANS, SETUP_FEE, type PlanSlug } from "@/lib/pricing-constants";

gsap.registerPlugin(ScrollTrigger);

const PLAN_ORDER: PlanSlug[] = ["starter", "growth", "pro"];

const SHARED_FEATURES = [
  "RAG-powered AI chat across your documents",
  "Smart ingestion (uploads, cloud drives)",
  "AI-generated docs & audio overviews",
  "Usage analytics & knowledge insights",
  "Unlimited documents (fair use)",
] as const;

function formatTokens(n: number) {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelector(".pricing-heading"),
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 72%",
            toggleActions: "play none none reverse",
          },
        }
      );

      const cards = el.querySelectorAll(".pricing-card");
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 62%",
              toggleActions: "play none none reverse",
            },
            delay: i * 0.1,
          }
        );
      });

      gsap.fromTo(
        el.querySelector(".pricing-footnote"),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 50%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section id="pricing" ref={sectionRef} className="relative py-32 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="pricing-heading mb-14 text-center md:mb-16">
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/55">
            Pricing
          </span>
          <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
            Plans that match how your team works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-white/50 md:text-lg">
            Every tier includes the same core platform: RAG chat, document intelligence, client pages,
            and analytics. Scale tokens, storage, and published client experiences as you grow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLAN_ORDER.map((slug) => {
            const plan = PLATFORM_PLANS[slug];
            const popular = slug === "growth";
            return (
              <div
                key={slug}
                className={`pricing-card relative flex flex-col rounded-2xl border p-7 ${
                  popular
                    ? "border-indigo-400/40 bg-gradient-to-b from-indigo-500/[0.12] to-transparent shadow-[0_0_0_1px_rgba(129,140,248,0.15)_inset]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-white">${plan.price}</span>
                  <span className="text-sm text-white/45">/month</span>
                </div>
                <p className="mt-2 text-sm text-white/45">
                  {formatTokens(plan.includedTokens)} included AI tokens per billing period
                </p>

                <ul className="mt-6 space-y-3 text-sm text-white/70">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                    <span>{plan.specs.storage} team storage</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                    <span>
                      {plan.specs.clientPages} client page{plan.specs.clientPages !== 1 ? "s" : ""}{" "}
                      (public AI chat for your brand)
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                    <span>{plan.specs.documents}</span>
                  </li>
                </ul>

                <div className="my-6 h-px bg-white/10" />

                <p className="text-xs font-medium uppercase tracking-wider text-white/35">
                  Also included
                </p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/55">
                  {SHARED_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400/80" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Link
                    href="/signup"
                    className={`flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold transition ${
                      popular
                        ? "bg-white text-black hover:bg-white/90"
                        : "border border-white/20 bg-white/[0.04] text-white hover:border-indigo-400/40 hover:bg-white/[0.07]"
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="pricing-footnote mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-white/40">
          <span className="text-white/55">14-day trial</span> on paid plans when you subscribe from
          your workspace. One-time{" "}
          <span className="text-white/60">${SETUP_FEE.price}</span> {SETUP_FEE.name.toLowerCase()}{" "}
          applies at checkout. Need a custom deployment or higher limits?{" "}
          <Link href="/docs" className="text-indigo-400/90 underline-offset-2 hover:underline">
            Read the docs
          </Link>{" "}
          or talk to us from the dashboard after you sign up.
        </p>
      </div>
    </section>
  );
}

export function CtaBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-32 px-6">
      <div
        ref={bannerRef}
        className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10 px-8 py-20 text-center md:px-16"
      >
        <h2 className="text-3xl font-bold text-white md:text-5xl">
          The future of team intelligence starts today.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
          Join the teams already using Klever AI to transform how they work
          with knowledge.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Take charge of your team
          </Link>
          <Link
            href="#pricing"
            className="inline-flex rounded-full border border-white/20 px-8 py-3 text-sm font-medium text-white/80 transition hover:border-white/35 hover:text-white"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
