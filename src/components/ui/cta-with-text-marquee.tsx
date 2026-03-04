"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef, useState } from "react";
import { NumberTicker } from "./number-ticker";

interface VerticalMarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
  onItemsRef?: (items: HTMLElement[]) => void;
}

function VerticalMarquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 30,
  onItemsRef,
}: VerticalMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onItemsRef && containerRef.current) {
      const items = Array.from(containerRef.current.querySelectorAll('.marquee-item')) as HTMLElement[];
      onItemsRef(items);
    }
  }, [onItemsRef]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group flex flex-col overflow-hidden",
        className
      )}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

const marqueeItems = [
  "Educational Institutions",
  "Startups",
  "Founders & Execs",
  "Content Agencies",
  "Social Media Managers",
  "HeyKlever Team",
  "Content Marketers",
  "Libraries",
  "Sales Teams",
  "Marketing Teams",
  "IT departments",
  "Customer Support",
  "Legal departments",
  "HR Teams",
  "Finance departments",
  "Laywers",
  "Engineering Teams",
  "Design Teams",
];

export default function CTAWithVerticalMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Viewport intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsInView(true);
          setHasAnimated(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  // Marquee opacity effect
  useEffect(() => {
    const marqueeContainer = marqueeRef.current;
    if (!marqueeContainer) return;

    const updateOpacity = () => {
      const items = marqueeContainer.querySelectorAll('.marquee-item');
      const containerRect = marqueeContainer.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);
        const maxDistance = containerRect.height / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const opacity = 1 - normalizedDistance * 0.75;
        (item as HTMLElement).style.opacity = opacity.toString();
      });
    };

    const animationFrame = () => {
      updateOpacity();
      requestAnimationFrame(animationFrame);
    };

    const frame = requestAnimationFrame(animationFrame);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16 overflow-hidden relative"
    >
      {/* Top gradient background */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 min-h-screen"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            background: `linear-gradient(to top right, var(--brand), var(--brand-foreground))`,
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] min-h-screen"
        />
      </div>
      <div className="absolute inset-0 pointer-events-none" />

      <div className="w-full max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left Content */}
          <div className="space-y-10 max-w-2xl">
            <div
              className={cn(
                "space-y-6 transition-all duration-1000 ease-out",
                isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.9] tracking-tight text-foreground">
                Get Started in{" "}
                <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Minutes
                </span>
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-foreground to-muted-foreground rounded-full" />
            </div>

            <div
              className={cn(
                "transition-all duration-1000 ease-out delay-200",
                isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8">
                Klever AI helps you reclaim your time by instantly surfacing the
                information you need—no more endless searching or
                second-guessing.
              </p>
              <p className="text-lg text-muted-foreground/80 leading-relaxed">
                Every time you look for a document, you could save up to 5
                minutes. If you search for files just twice a day, that&apos;s
                over 60 hours saved per year. Let Klever handle the busywork, so
                your mind is free for what matters most.
              </p>
            </div>

            <div
              className={cn(
                "flex flex-wrap gap-4 transition-all duration-1000 ease-out delay-400",
                isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <button className="group relative px-8 py-4 bg-foreground text-background rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-foreground/20">
                <span className="relative z-10">Get started</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
              <button className="group relative px-8 py-4 bg-secondary text-secondary-foreground rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-secondary/20 border border-border dark:border-border/20">
                <span className="relative z-10">See pricing</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
            </div>

            <div
              className={cn(
                "transition-all duration-1000 ease-out delay-600",
                isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <div className="bg-muted/50 dark:bg-muted/10 backdrop-blur-sm rounded-2xl p-6 border border-border/50 dark:border-border/10">
                <p className="text-muted-foreground text-sm mb-2">
                  <span className="font-semibold text-foreground">
                    Estimated time saved per year:
                  </span>
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">
                    5 min/search × 2 searches/day × 260 workdays =
                  </span>
                  <NumberTicker
                    value={43.3}
                    decimalPlaces={1}
                    startValue={0}
                    className="font-bold text-2xl tracking-tight text-foreground"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Marquee */}
          <div
            ref={marqueeRef}
            className={cn(
              "relative h-[600px] lg:h-[700px] flex items-center justify-center transition-all duration-1000 ease-out delay-300",
              isInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            )}
          >
            <div className="relative w-full h-full">
              <VerticalMarquee speed={25} className="h-full">
                {marqueeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light tracking-tight py-8 marquee-item text-muted-foreground/60 hover:text-foreground transition-colors duration-300"
                  >
                    {item}
                  </div>
                ))}
              </VerticalMarquee>

              {/* Enhanced vignettes */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background via-background/80 to-transparent z-10"></div>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
