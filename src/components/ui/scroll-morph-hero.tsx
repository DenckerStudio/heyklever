"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";

// --- Utility ---
// function cn(...inputs: ClassValue[]) {
//     return twMerge(clsx(inputs));
// }

// --- Types ---
export type AnimationPhase = "scatter" | "k" | "circle" | "bottom-strip";

interface FlipCardProps {
    src: string;
    index: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

// --- FlipCard Component ---
const IMG_WIDTH = 60;  // Reduced from 100
const IMG_HEIGHT = 85; // Reduced from 140

function FlipCard({
    src,
    index,
    phase,
    target,
}: FlipCardProps) {
    // Stagger delay based on index for smooth sequential animation
    const staggerDelay = phase === "scatter" ? index * 0.03 : 0;
    
    return (
        <motion.div
            // Smoothly animate to the coordinates defined by the parent
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
                delay: staggerDelay,
            }}

            // Initial style
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d", // Essential for the 3D hover effect
                perspective: "1000px",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring" as const, stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-200"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img
                        src={src}
                        alt={`hero-${index}`}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-xl shadow-lg bg-gray-900 flex flex-col items-center justify-center p-4 border border-gray-700"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className="text-center">
                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-white">Details</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Main Hero Component ---
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000; // Virtual scroll range

// Unsplash Images
const IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=300&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80",
    "https://images.unsplash.com/photo-1506765515384-028b60a970df?w=300&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?w=300&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=300&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=300&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&q=80",
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=300&q=80",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=300&q=80",
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=300&q=80",
    "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=300&q=80",
];

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// Generate positions for letter 'K'
const generateKPositions = (total: number, containerWidth: number, containerHeight: number) => {
    const positions: Array<{ x: number; y: number; rotation: number; scale: number; opacity: number }> = [];
    
    // K shape dimensions
    const kHeight = Math.min(containerHeight * 0.6, 400);
    const kWidth = Math.min(containerWidth * 0.4, 300);
    const centerX = 0; // Center of container
    const centerY = 0; // Center of container
    
    // Vertical line (left side of K) - uses ~40% of images
    const verticalCount = Math.floor(total * 0.4);
    const verticalSpacing = kHeight / (verticalCount - 1);
    const verticalX = centerX - kWidth * 0.3;
    
    for (let i = 0; i < verticalCount; i++) {
        positions.push({
            x: verticalX,
            y: centerY - kHeight / 2 + i * verticalSpacing,
            rotation: 0,
            scale: 1,
            opacity: 1,
        });
    }
    
    // Top diagonal (upper arm of K) - uses ~30% of images
    // Start from a point on the vertical line, very close to center
    const topDiagonalCount = Math.floor(total * 0.3);
    const topDiagonalLength = kWidth * 0.8;
    // Start Y position: very close to center, on the vertical line (almost connected)
    const topDiagonalStartY = centerY - kHeight * 0.05;
    
    for (let i = 0; i < topDiagonalCount; i++) {
        const progress = i / (topDiagonalCount - 1);
        const angle = -45; // Diagonal going up-right
        // Start from vertical line position, extend diagonally
        const x = verticalX + Math.cos((angle * Math.PI) / 180) * progress * topDiagonalLength;
        // For up-right: sin is negative, so we add it to move upward
        const y = topDiagonalStartY + Math.sin((angle * Math.PI) / 180) * progress * topDiagonalLength;
        positions.push({
            x,
            y,
            rotation: angle,
            scale: 1,
            opacity: 1,
        });
    }
    
    // Bottom diagonal (lower arm of K) - uses remaining ~30% of images
    // Start from a point on the vertical line, very close to center
    const bottomDiagonalCount = total - verticalCount - topDiagonalCount;
    const bottomDiagonalLength = kWidth * 0.8;
    // Start Y position: very close to center, on the vertical line (almost connected)
    const bottomDiagonalStartY = centerY + kHeight * 0.05;
    
    for (let i = 0; i < bottomDiagonalCount; i++) {
        const progress = i / (bottomDiagonalCount - 1);
        const angle = 45; // Diagonal going down-right
        // Start from vertical line position, extend diagonally
        const x = verticalX + Math.cos((angle * Math.PI) / 180) * progress * bottomDiagonalLength;
        const y = bottomDiagonalStartY + Math.sin((angle * Math.PI) / 180) * progress * bottomDiagonalLength;
        positions.push({
            x,
            y,
            rotation: angle,
            scale: 1,
            opacity: 1,
        });
    }
    
    return positions;
};

export default function IntroAnimation() {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Container Size ---
    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };

        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);

        // Initial set
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });

        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0); // Keep track of scroll value without re-renders

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            const currentScroll = scrollRef.current;
            const isScrollingDown = e.deltaY > 0;
            const isScrollingUp = e.deltaY < 0;

            // Allow normal page scrolling when:
            // 1. At max scroll and scrolling down (let page scroll)
            // 2. At min scroll and scrolling up (let page scroll)
            const shouldAllowPageScroll = 
                (currentScroll >= MAX_SCROLL && isScrollingDown) ||
                (currentScroll <= 0 && isScrollingUp);

            if (shouldAllowPageScroll) {
                // Don't prevent default - allow normal page scrolling
                return;
            }

            // Otherwise, handle virtual scroll
            e.preventDefault();

            const newScroll = Math.min(Math.max(currentScroll + e.deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Touch support
        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            touchStartY = touchY;

            const currentScroll = scrollRef.current;
            const isScrollingDown = deltaY < 0;
            const isScrollingUp = deltaY > 0;

            // Allow normal page scrolling when at boundaries
            const shouldAllowPageScroll = 
                (currentScroll >= MAX_SCROLL && isScrollingDown) ||
                (currentScroll <= 0 && isScrollingUp);

            if (shouldAllowPageScroll) {
                return;
            }

            e.preventDefault();

            const newScroll = Math.min(Math.max(currentScroll + deltaY, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
        };

        // Attach listeners to container instead of window for portability
        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
        };
    }, [virtualScroll]);

    // 1. Morph Progress: 0 (Circle) -> 1 (Bottom Arc)
    // Happens between scroll 0 and 600
    const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

    // 2. Scroll Rotation (Shuffling): Starts after morph (e.g., > 600)
    // Rotates the bottom arc as user continues scrolling
    const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

    // --- Mouse Parallax ---
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;

            // Normalize -1 to 1
            const normalizedX = (relativeX / rect.width) * 2 - 1;
            // Move +/- 100px
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // --- Intro Sequence ---
    useEffect(() => {
        const timer1 = setTimeout(() => setIntroPhase("k"), 800);
        const timer2 = setTimeout(() => setIntroPhase("circle"), 3000);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    // --- Initial Scatter Positions (start from center to avoid stagger) ---
    const scatterPositions = useMemo(() => {
        return IMAGES.map(() => ({
            x: 0, // Start from center
            y: 0, // Start from center
            rotation: 0,
            scale: 0.8,
            opacity: 1, // Fade in immediately
        }));
    }, []);

    // --- K Letter Positions ---
    const kPositions = useMemo(() => {
        if (containerSize.width === 0 || containerSize.height === 0) {
            // Return default positions until container is measured
            return Array(TOTAL_IMAGES).fill(null).map((_) => ({
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1,
                opacity: 1,
            }));
        }
        return generateKPositions(TOTAL_IMAGES, containerSize.width, containerSize.height);
    }, [containerSize.width, containerSize.height]);

    // --- Render Loop (Manual Calculation for Morph) ---
    const [morphValue, setMorphValue] = useState(0);
    const [rotateValue, setRotateValue] = useState(0);
    const [parallaxValue, setParallaxValue] = useState(0);

    useEffect(() => {
        const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
        const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
        const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
        return () => {
            unsubscribeMorph();
            unsubscribeRotate();
            unsubscribeParallax();
        };
    }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

    // --- Content Opacity ---
    // Fade in content when arc is formed (morphValue > 0.8)
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
      >
        {/* Container */}
        <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">
          {/* Intro Text (Fades out) */}
          <div className="absolute z-0 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2">
            <motion.h1
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={
                introPhase === "circle" && morphValue < 0.5
                  ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, filter: "blur(10px)" }
              }
              transition={{ duration: 1, delay: 0.2 }}
              className="text-2xl font-medium tracking-tight text-foreground md:text-4xl"
            >
              Life is short.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={
                introPhase === "circle" && morphValue < 0.5
                  ? { opacity: 0.5 - morphValue }
                  : { opacity: 0 }
              }
              transition={{ duration: 1, delay: 0.4 }}
              className="mt-4 text-xs font-bold tracking-[0.2em] text-foreground/80"
            >
              Dont waste it looking for information you already have. <br />
              Let Klever do it for you.
            </motion.p>
          </div>

          {/* Arc Active Content (Fades in) */}
          <motion.div
            style={{ opacity: contentOpacity, y: contentY }}
            className="absolute top-[20%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4"
          >
            <h2 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight mb-4">
              Skip the search, start the discovery
            </h2>
            <p className="text-sm md:text-base text-foreground/80 max-w-lg leading-relaxed">
              Klever helps you reclaim your time, being the bridge between your
              brain and the documents your wrote ... some time ago.
            </p>
          </motion.div>

          {/* Main Container */}
          <div className="relative flex items-center justify-center w-full h-full">
            {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
              let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

              // 1. Intro Phases (Scatter -> K -> Circle)
              if (introPhase === "scatter") {
                target = scatterPositions[i];
              } else if (introPhase === "k") {
                // Use K letter positions
                if (kPositions[i]) {
                  target = kPositions[i];
                } else {
                  // Fallback if positions not ready
                  target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
                }
              } else {
                // 2. Circle Phase & Morph Logic

                // Responsive Calculations
                const isMobile = containerSize.width < 768;
                const minDimension = Math.min(
                  containerSize.width,
                  containerSize.height
                );

                // A. Calculate Circle Position
                const circleRadius = Math.min(minDimension * 0.35, 350);

                const circleAngle = (i / TOTAL_IMAGES) * 360;
                const circleRad = (circleAngle * Math.PI) / 180;
                const circlePos = {
                  x: Math.cos(circleRad) * circleRadius,
                  y: Math.sin(circleRad) * circleRadius,
                  rotation: circleAngle + 90,
                };

                // B. Calculate Bottom Arc Position
                // "Rainbow" Arch: Convex up. Center is highest point.

                // Radius:
                const baseRadius = Math.min(
                  containerSize.width,
                  containerSize.height * 1.5
                );
                const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);

                // Position:
                const arcApexY =
                  containerSize.height * (isMobile ? 0.35 : 0.25);
                const arcCenterY = arcApexY + arcRadius;

                // Spread angle:
                const spreadAngle = isMobile ? 100 : 130;
                const startAngle = -90 - spreadAngle / 2;
                const step = spreadAngle / (TOTAL_IMAGES - 1);

                // Apply Scroll Rotation (Shuffle) with Bounds
                // We want to clamp rotation so images don't disappear.
                // Map scroll range [600, 3000] to a limited rotation range.
                // Range: [-spreadAngle/2, spreadAngle/2] keeps them roughly in view.
                // We map 0 -> 1 (progress of scroll loop) to this range.

                // Note: rotateValue comes from smoothScrollRotate which maps [600, 3000] -> [0, 360]
                // We need to adjust that mapping in the hook above, OR adjust it here.
                // Better to adjust it here relative to the spread.

                // Let's interpret rotateValue (0 to 360) as a progress 0 to 1
                const scrollProgress = Math.min(
                  Math.max(rotateValue / 360, 0),
                  1
                );

                // Calculate bounded rotation:
                // Move from 0 (centered) to -spreadAngle (all the way left) or similar.
                // Let's allow scrolling through the list.
                // Total sweep needed to see all items if we start at one end?
                // If we start centered, we can go +/- spreadAngle/2.

                // User wants to "stop on the last image".
                // Let's map scroll to: 0 -> -spreadAngle (shifts items left)
                const maxRotation = spreadAngle * 0.8; // Don't go all the way, keep last item visible
                const boundedRotation = -scrollProgress * maxRotation;

                const currentArcAngle = startAngle + i * step + boundedRotation;
                const arcRad = (currentArcAngle * Math.PI) / 180;

                const arcPos = {
                  x: Math.cos(arcRad) * arcRadius + parallaxValue,
                  y: Math.sin(arcRad) * arcRadius + arcCenterY,
                  rotation: currentArcAngle + 90,
                  scale: isMobile ? 1.4 : 1.8, // Increased scale for active state
                };

                // C. Interpolate (Morph)
                target = {
                  x: lerp(circlePos.x, arcPos.x, morphValue),
                  y: lerp(circlePos.y, arcPos.y, morphValue),
                  rotation: lerp(
                    circlePos.rotation,
                    arcPos.rotation,
                    morphValue
                  ),
                  scale: lerp(1, arcPos.scale, morphValue),
                  opacity: 1,
                };
              }

              return (
                <FlipCard
                  key={i}
                  src={src}
                  index={i}
                  phase={introPhase} // Pass intro phase for initial animations
                  target={target}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
}
