"use client";

import dynamic from "next/dynamic";

const ParticleSphere = dynamic(
  () =>
    import("@/components/landing/particle-sphere").then(
      (mod) => mod.ParticleSphere
    ),
  { ssr: false }
);

export function ParticleSphereWrapper() {
  return <ParticleSphere />;
}
