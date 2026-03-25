"use client";

import { ScrollCounter } from "./scroll-counter";

export function StatsSection() {
  return (
    <section className="relative py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <ScrollCounter end={99} suffix="%" label="Uptime SLA" />
          <ScrollCounter end={50} suffix="x" label="Faster search" />
          <ScrollCounter end={10} suffix="k+" label="Docs processed" />
          <ScrollCounter end={85} suffix="%" label="Time saved" />
        </div>
      </div>
    </section>
  );
}
