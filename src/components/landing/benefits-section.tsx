"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Plug } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const benefitsPair = [
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
];

const benefit03 = {
  num: "03",
  title: "Rapid, repeatable\nROI",
  description:
    "We know that teams run on lean budgets, which is why we price our all-inclusive solution as a service with terms that scale with you. Ready to deploy right away, and rapid to grow over time. From onboarding to full production, Klever AI delivers measurable returns in weeks, not months.",
};

const integrations = [
  "Google Drive",
  "Microsoft 365",
  "OneDrive",
  "Slack",
  "Notion",
  "Confluence",
  "SharePoint",
  "Dropbox",
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function setSceneA11y(
  sceneA: HTMLElement | null,
  sceneB: HTMLElement | null,
  sceneC: HTMLElement | null,
  progress: number
) {
  const active = progress < 0.36 ? "a" : progress < 0.58 ? "b" : "c";
  sceneA?.setAttribute("aria-hidden", active === "a" ? "false" : "true");
  sceneB?.setAttribute("aria-hidden", active === "b" ? "false" : "true");
  sceneC?.setAttribute("aria-hidden", active === "c" ? "false" : "true");
}

function BenefitBlock({
  b,
  reverse,
}: {
  b: (typeof benefitsPair)[0];
  reverse?: boolean;
}) {
  return (
    <div className="grid items-start gap-6 md:grid-cols-2 md:gap-12">
      <div className={reverse ? "md:order-2 md:text-left" : ""}>
        <div className="mb-3 inline-flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-indigo-400">
            Benefit {b.num}
          </span>
          <span className="h-px w-8 bg-indigo-400/30" />
        </div>
        <h3 className="whitespace-pre-line text-2xl font-bold leading-tight text-white md:text-3xl">
          {b.title}
        </h3>
      </div>
      <div className={reverse ? "md:order-1" : ""}>
        <p className="text-sm leading-relaxed text-white/55 md:text-base">{b.description}</p>
      </div>
    </div>
  );
}

export function BenefitsSection() {
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneARef = useRef<HTMLDivElement>(null);
  const sceneBRef = useRef<HTMLDivElement>(null);
  const sceneCRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion) return;

    const root = sectionRef.current;
    const pin = pinRef.current;
    const video = videoRef.current;
    if (!root || !pin) return;

    const sceneA = sceneARef.current;
    const sceneB = sceneBRef.current;
    const sceneC = sceneCRef.current;

    const ctx = gsap.context(() => {
      const blurIn = "blur(5px)";
      const blurOut = "blur(5px)";

      gsap.set(video, { opacity: 0 });
      if (sceneA) gsap.set(sceneA, { opacity: 0, y: 44, filter: blurIn });
      if (sceneB) gsap.set(sceneB, { opacity: 0, y: 44, filter: blurIn });
      if (sceneC) gsap.set(sceneC, { opacity: 0, y: 44, filter: blurIn });

      setSceneA11y(sceneA, sceneB, sceneC, 0);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 88%",
          end: "+=220%",
          pin: pin,
          scrub: 0.72,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setSceneA11y(sceneA, sceneB, sceneC, self.progress);
          },
          onLeaveBack: () => {
            setSceneA11y(sceneA, sceneB, sceneC, 0);
          },
        },
      });

      tl.to(video, { opacity: 0.5, duration: 0.1, ease: "power2.out" }, 0);
      tl.to(
        sceneA,
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.16, ease: "power2.out" },
        0,
      );

      tl.to(
        sceneA,
        { opacity: 0, y: -28, filter: blurOut, duration: 0.13, ease: "power2.inOut" },
        0.34
      );
      tl.to(
        sceneB,
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.13, ease: "power2.inOut" },
        0.34
      );

      tl.to(
        sceneB,
        { opacity: 0, y: -28, filter: blurOut, duration: 0.13, ease: "power2.inOut" },
        0.55
      );
      tl.to(
        sceneC,
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.13, ease: "power2.inOut" },
        0.55
      );

      tl.to(
        sceneC,
        { opacity: 0, y: -18, filter: blurOut, duration: 0.12, ease: "power2.inOut" },
        0.88
      );
      tl.to(video, { opacity: 0.12, duration: 0.12, ease: "power2.inOut" }, 0.88);
    }, root);

    return () => ctx.revert();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      void video.play().catch(() => {});
    };

    video.addEventListener("loadeddata", tryPlay);
    tryPlay();

    const onVis = () => {
      if (document.hidden) video.pause();
      else tryPlay();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      video.removeEventListener("loadeddata", tryPlay);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section id="benefits" className="relative bg-[#0a0a0a] px-6">
        <div className="mx-auto max-w-6xl space-y-20">
          <div className="text-center">
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
          <div className="grid gap-20 md:gap-28">
            {benefitsPair.map((b, i) => (
              <BenefitBlock key={b.num} b={b} reverse={i % 2 === 1} />
            ))}
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 md:p-10">
            <div className="mb-6 flex items-center gap-2 text-indigo-400">
              <Plug className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
              <span className="text-sm font-medium uppercase tracking-[0.2em]">Integrations</span>
            </div>
            <p className="mb-6 text-lg text-white/70">
              Connect the tools your team already uses—documents and conversations flow into one intelligence layer.
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {integrations.map((name) => (
                <li
                  key={name}
                  className="rounded-lg border border-white/[0.07] px-3 py-2 text-center text-sm text-white/65"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <BenefitBlock b={benefit03} />
        </div>
      </section>
    );
  }

  return (
    <section id="benefits" ref={sectionRef} className="relative bg-[#0a0a0a]">
      <div
        ref={pinRef}
        className="relative flex min-h-screen flex-col overflow-hidden px-5 py-16 sm:px-8 sm:py-20"
      >
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
          src="/3D-brain.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[#0a0a0a]/72"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(99,102,241,0.12),transparent_55%)]"
          aria-hidden
        />

        <div
          ref={sceneARef}
          className="benefits-scene-a relative z-[1] mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center opacity-0"
          aria-hidden={false}
        >
          <div className="mb-10 text-center md:mb-14">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/60">
              Benefits
            </span>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              That&apos;s the{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Klever
              </span>{" "}
              advantage
            </h2>
          </div>
          <div className="grid gap-14 md:gap-20">
            {benefitsPair.map((b, i) => (
              <BenefitBlock key={b.num} b={b} reverse={i % 2 === 1} />
            ))}
          </div>
        </div>

        <div
          ref={sceneBRef}
          className="benefits-scene-b absolute inset-0 z-[2] flex items-center justify-center px-5 py-16 opacity-0 sm:px-8"
          aria-hidden
        >
          <div className="mx-auto w-full max-w-4xl text-center">
            <div className="mb-4 flex justify-center text-indigo-400">
              <Plug className="h-8 w-8 opacity-85" aria-hidden />
            </div>
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400/70">
              Integrations
            </span>
            <h3 className="mt-4 text-3xl font-bold text-white md:text-4xl">
              Plugs into your stack
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/55 md:text-lg">
              Connect the tools your team already uses—documents and conversations flow into one intelligence layer.
            </p>
            <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {integrations.map((name) => (
                <li
                  key={name}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-3 text-center text-sm font-medium text-white/75 backdrop-blur-sm"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          ref={sceneCRef}
          className="benefits-scene-c absolute inset-0 z-[3] flex items-center justify-center px-5 py-16 opacity-0 sm:px-8"
          aria-hidden
        >
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-indigo-400">
                Benefit {benefit03.num}
              </span>
              <span className="h-px w-8 bg-indigo-400/30" />
            </div>
            <h3 className="whitespace-pre-line text-3xl font-bold leading-tight text-white md:text-5xl">
              {benefit03.title}
            </h3>
            <p className="mt-6 text-base leading-relaxed text-white/55 md:text-lg">
              {benefit03.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
