/** Shared indigo → violet → purple accents for hero + landing SVGs */
export const LANDING_ACCENT = {
  indigo: "#818cf8",
  violet: "#a78bfa",
  purple: "#c084fc",
  indigoDeep: "#6366f1",
  fuchsia: "#e879f9",
} as const;

export const landingSvgGradientStops = [
  { offset: "0%", color: LANDING_ACCENT.indigo, opacity: 0.95 },
  { offset: "45%", color: LANDING_ACCENT.violet, opacity: 0.75 },
  { offset: "100%", color: LANDING_ACCENT.purple, opacity: 0.55 },
] as const;
