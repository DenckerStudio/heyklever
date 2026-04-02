"use client";

import gsap from "gsap";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import { flipWordsFrom, scrambleToText } from "@/lib/gsap-text-effects";

const FLIP_DURATION = 0.95;
const FLIP_STAGGER = 0.2;
const SCRAMBLE_DURATION = 1.15;
const SCRAMBLE_DELAY = 0.18;

type HeroLaptopStepCopyProps = {
  title: string;
  body: string;
  microLabel: string;
  active: boolean;
  reduceMotion: boolean;
  className?: string;
  "aria-hidden"?: boolean;
};

export const HeroLaptopStepCopy = forwardRef<HTMLDivElement, HeroLaptopStepCopyProps>(
  function HeroLaptopStepCopy(
    { title, body, microLabel, active, reduceMotion, className = "", "aria-hidden": ariaHidden },
    ref,
  ) {
    const pRef = useRef<HTMLParagraphElement>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    const setRootRef = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    useEffect(() => {
      const root = rootRef.current;
      const p = pRef.current;
      if (reduceMotion || !root || !p) return;

      timelineRef.current?.kill();

      if (!active) {
        p.textContent = body;
        const words = root.querySelectorAll<HTMLElement>("[data-flip-word]");
        gsap.set(words, { clearProps: "transform,opacity" });
        return;
      }

      const words = root.querySelectorAll<HTMLElement>("[data-flip-word]");
      if (!words.length) return;

      p.textContent = "";
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      tl.add(
        flipWordsFrom(Array.from(words), {
          duration: FLIP_DURATION,
          stagger: FLIP_STAGGER,
          ease: "back.out(1.45)",
        }),
        0,
      );
      tl.add(
        scrambleToText(p, body, { duration: SCRAMBLE_DURATION, ease: "power2.out" }),
        SCRAMBLE_DELAY,
      );
      timelineRef.current = tl;

      return () => {
        tl.kill();
      };
    }, [active, body, reduceMotion, title]);

    const outerClass = `absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center sm:gap-2.5 ${className}`;

    if (reduceMotion) {
      return (
        <div ref={setRootRef} className={outerClass} aria-hidden={ariaHidden}>
          <h2 className="text-balance text-[clamp(1.25rem,4.2vw,1.875rem)] font-bold leading-tight tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="max-w-[20rem] text-pretty text-sm leading-relaxed text-white/[0.58] sm:text-base">
            {body}
          </p>
        </div>
      );
    }

    const titleWords = title.split(/\s+/).filter(Boolean);

    return (
      <div ref={setRootRef} className={outerClass} aria-hidden={ariaHidden}>
        <h2 className="text-balance text-[clamp(1.25rem,4.2vw,1.875rem)] font-semibold leading-tight tracking-[0.06em] text-white sm:text-3xl">
          <span className="mb-1 block font-mono text-[0.55rem] font-medium uppercase tracking-[0.38em] text-cyan-300/85 sm:text-[0.65rem]">
            {microLabel}
          </span>
          <span className="inline-flex flex-wrap justify-center gap-x-[0.28em] gap-y-1">
            {titleWords.map((word, wi) => (
              <span
                key={`${title}-${wi}`}
                className="inline-block overflow-hidden pb-0.5 align-bottom"
              >
                <span
                  data-flip-word
                  className="inline-block will-change-transform [text-shadow:0_0_28px_rgba(34,211,238,0.35)]"
                >
                  {word}
                </span>
              </span>
            ))}
          </span>
        </h2>
        <p
          ref={pRef}
          className="hero-laptop-body max-w-[22rem] min-h-[2.75rem] text-pretty font-mono text-sm leading-relaxed tracking-[0.04em] text-white/[0.78] sm:min-h-[3rem] sm:text-base"
          aria-label={body}
        />
      </div>
    );
  },
);

HeroLaptopStepCopy.displayName = "HeroLaptopStepCopy";
