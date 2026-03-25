"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function MarqueeSection() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current) return;

    const track = trackRef.current;
    const firstChild = track.children[0] as HTMLElement;
    if (!firstChild) return;

    gsap.to(track, {
      x: () => -(firstChild.offsetWidth + 40),
      ease: "none",
      scrollTrigger: {
        trigger: track.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const text = "AI-Powered · Team Intelligence · RAG Search · Document Generation · Workflow Automation · ";

  return (
    <section className="overflow-hidden border-y border-white/5 py-10">
      <div ref={trackRef} className="flex whitespace-nowrap">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="mr-10 text-[clamp(3rem,8vw,7rem)] font-bold tracking-[-0.03em] text-white/[0.04]"
          >
            {text}
          </span>
        ))}
      </div>
    </section>
  );
}
