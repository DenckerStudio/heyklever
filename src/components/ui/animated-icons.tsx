"use client";

import { motion } from "motion/react";

export interface AnimatedIconProps {
  className?: string;
  isHovered?: boolean;
}

export function AnimatedNotebookIcon({ className, isHovered }: AnimatedIconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { rotate: [0, -3, 2, 0] } : { rotate: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-11a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1m3 0v18" />
      <motion.path
        d="M13 8l2 0"
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
      />
      <motion.path
        d="M13 12l2 0"
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

export function AnimatedDashboardIcon({ className, isHovered }: AnimatedIconProps) {
  const tiles = [
    { x: 3, y: 3, w: 7, h: 9, rx: 1 },
    { x: 14, y: 3, w: 7, h: 5, rx: 1 },
    { x: 14, y: 12, w: 7, h: 9, rx: 1 },
    { x: 3, y: 16, w: 7, h: 5, rx: 1 },
  ];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {tiles.map((tile, i) => (
        <motion.rect
          key={i}
          x={tile.x}
          y={tile.y}
          width={tile.w}
          height={tile.h}
          rx={tile.rx}
          animate={
            isHovered
              ? { scale: [1, 1.15, 1], opacity: [0.5, 1, 1] }
              : { scale: 1, opacity: 1 }
          }
          transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
          style={{
            transformOrigin: `${tile.x + tile.w / 2}px ${tile.y + tile.h / 2}px`,
          }}
        />
      ))}
    </svg>
  );
}

export function AnimatedTeamIcon({ className, isHovered }: AnimatedIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <motion.g
        animate={isHovered ? { y: [0, -2, 0] } : { y: 0 }}
        transition={{ delay: 0, duration: 0.35, ease: "easeOut" }}
      >
        <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
        <path d="M3 13v-1a2 2 0 0 1 2 -2h2" />
      </motion.g>
      <motion.g
        animate={isHovered ? { y: [0, -2, 0] } : { y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
      >
        <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
        <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" />
      </motion.g>
      <motion.g
        animate={isHovered ? { y: [0, -2, 0] } : { y: 0 }}
        transition={{ delay: 0.16, duration: 0.35, ease: "easeOut" }}
      >
        <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
        <path d="M17 10h2a2 2 0 0 1 2 2v1" />
      </motion.g>
    </svg>
  );
}

export function AnimatedPackageIcon({ className, isHovered }: AnimatedIconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isHovered ? { y: [0, -3, 0], rotate: [0, -3, 0] } : { y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 12 }}
    >
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <path d="m7.5 4.27 9 5.15" />
    </motion.svg>
  );
}

export function AnimatedBrainIcon({ className, isHovered }: AnimatedIconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={
        isHovered
          ? { scale: [1, 1.12, 1], rotate: [0, 3, -2, 0] }
          : { scale: 1, rotate: 0 }
      }
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <path d="M12 18V5" />
      <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
      <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
      <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
      <path d="M18 18a4 4 0 0 0 2-7.464" />
      <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
      <path d="M6 18a4 4 0 0 1-2-7.464" />
      <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
    </motion.svg>
  );
}

export function AnimatedChartIcon({ className, isHovered }: AnimatedIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <motion.path
        d="M7 16h8"
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ delay: 0, duration: 0.3, ease: "easeOut" }}
      />
      <motion.path
        d="M7 11h12"
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
      />
      <motion.path
        d="M7 6h3"
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
      />
    </svg>
  );
}

export function AnimatedCreditCardIcon({ className, isHovered }: AnimatedIconProps) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={
        isHovered
          ? { rotate: [0, -5, 3, 0], scale: [1, 1.06, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <rect x={2} y={5} width={20} height={14} rx={2} />
      <motion.line
        x1={2} y1={10} x2={22} y2={10}
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
