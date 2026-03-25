"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const contactOptions = [
  "Schedule a 30-minute meeting with a product expert",
  "Schedule a Klever AI Demo",
  "Arrange ROI consultation",
  "Set up a proof-of-value pilot",
  "Something else",
];

export function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    gsap.fromTo(
      sectionRef.current.querySelector(".contact-heading"),
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      }
    );

    const items = sectionRef.current.querySelectorAll(".contact-option");
    items.forEach((item, i) => {
      gsap.fromTo(
        item,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
            toggleActions: "play none none reverse",
          },
          delay: i * 0.08,
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section id="contact" ref={sectionRef} className="relative py-32 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-16 md:grid-cols-2">
          <div>
            <h2 className="contact-heading text-4xl font-bold text-white md:text-5xl">
              Contact Us
            </h2>
            <p className="mt-4 text-base text-white/50">
              Reach out to learn more about Klever AI, on your terms:
            </p>
            <ul className="mt-8 space-y-4">
              {contactOptions.map((opt, i) => (
                <li
                  key={i}
                  className="contact-option flex items-center gap-3 text-sm text-white/60"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  {opt}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Full Name *"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/50"
            />
            <input
              type="text"
              placeholder="Role or position *"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/50"
            />
            <input
              type="email"
              placeholder="Email *"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/50"
            />
            <input
              type="text"
              placeholder="Company name *"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-indigo-400/50"
            />
            <button className="mt-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400">
              Send Message
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current) return;

    gsap.fromTo(
      bannerRef.current,
      { opacity: 0, scale: 0.95 },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: bannerRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
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
        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Take charge of your team
          </Link>
        </div>
      </div>
    </section>
  );
}
