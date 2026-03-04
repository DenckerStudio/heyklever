"use client";
import { useEffect, useRef } from "react";
import { motion, stagger, useAnimate, useInView, UseInViewOptions } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  margin = "0px",
  once = true,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  margin?: UseInViewOptions["margin"];
  once?: boolean;
}) => {
  const [scope, animate] = useAnimate();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once, margin });
  const wordsArray = words.split(" ");
  
  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          opacity: 1,
          filter: filter ? "blur(0px)" : "none",
        },
        {
          duration: duration ? duration : 1,
          delay: stagger(0.1),
        }
      );
    }
  }, [isInView, animate, duration, filter]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className="opacity-0"
              style={{
                filter: filter ? "blur(10px)" : "none",
              }}
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div ref={containerRef} className={cn(className)}>
      {renderWords()}
    </div>
  );
};
