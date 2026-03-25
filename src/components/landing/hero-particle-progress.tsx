"use client";

import { createContext, useContext, useRef, type MutableRefObject } from "react";

export const HeroParticleProgressContext = createContext<MutableRefObject<number> | null>(null);

const fallbackProgressRef: MutableRefObject<number> = { current: 0 };

export function HeroParticleProgressProvider({ children }: { children: React.ReactNode }) {
  const progressRef = useRef(0);
  return (
    <HeroParticleProgressContext.Provider value={progressRef}>
      {children}
    </HeroParticleProgressContext.Provider>
  );
}

export function useHeroParticleProgressRef(): MutableRefObject<number> {
  return useContext(HeroParticleProgressContext) ?? fallbackProgressRef;
}
