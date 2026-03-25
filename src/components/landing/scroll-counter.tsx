"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollCounterProps {
  end: number;
  suffix?: string;
  label: string;
}

export function ScrollCounter({ end, suffix = "", label }: ScrollCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          setVisible(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * end);
      setCount(start);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [visible, end]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl font-bold tabular-nums text-white md:text-7xl">
        {String(count).padStart(2, "0")}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-white/40">{label}</div>
    </div>
  );
}
