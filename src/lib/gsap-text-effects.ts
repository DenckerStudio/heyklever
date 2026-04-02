import gsap from "gsap";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789░▒▓<>/\\";

/**
 * Word flip-in (SplitText-style) using plain DOM word nodes — GSAP core only.
 * Mirrors the common `gsap.from(split.words, { y, opacity, rotation, stagger, ease: "back" })` pattern.
 */
export function flipWordsFrom(
  wordElements: Element[],
  options?: {
    duration?: number;
    stagger?: number;
    ease?: string;
    /** Cap random rotation in degrees (default 80). Lower = calmer, e.g. 22 for large display type */
    maxAbsRotation?: number;
  },
): gsap.core.Tween {
  const duration = options?.duration ?? 0.7;
  const stagger = options?.stagger ?? 0.15;
  const ease = options?.ease ?? "back.out(1.6)";
  const maxR = options?.maxAbsRotation ?? 80;

  return gsap.from(wordElements, {
    y: -100,
    opacity: 0,
    rotation: () => gsap.utils.random(-maxR, maxR),
    duration,
    ease,
    stagger,
    overwrite: "auto",
  });
}

/**
 * Scramble-style decode to final string (ScrambleText-style, GSAP core only).
 */
export function scrambleToText(
  element: HTMLElement,
  finalText: string,
  options?: { duration?: number; ease?: string },
): gsap.core.Tween {
  const duration = options?.duration ?? 0.85;
  const ease = options?.ease ?? "power2.out";
  const target = finalText;
  const state = { t: 0 };

  if (target.length === 0) {
    element.textContent = "";
    return gsap.to(state, { t: 1, duration: 0 });
  }

  return gsap.to(state, {
    t: 1,
    duration,
    ease,
    overwrite: "auto",
    onUpdate: () => {
      const p = state.t;
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === " ") {
          out += " ";
          continue;
        }
        const revealStart = i / target.length;
        if (p > revealStart + 0.08) out += ch;
        else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      element.textContent = out;
    },
    onComplete: () => {
      element.textContent = target;
    },
  });
}
