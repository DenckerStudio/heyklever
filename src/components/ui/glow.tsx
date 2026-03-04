import { cva, VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "@/lib/utils";

const glowVariants = cva("absolute w-full", {
  variants: {
    variant: {
      top: "top-0",
      above: "-top-[128px]",
      bottom: "bottom-0",
      below: "-bottom-[128px]",
      center: "top-[50%]",
    },
    toColor: {
      brand: "to-brand-foreground/0",
      brandForeground: "to-brand-foreground/0",
      red: "to-red-500/0",
      green: "to-green-500/0",
      blue: "to-blue-500/0",
      purple: "to-purple-500/0",
      pink: "to-pink-500/0",
    },
    fromColor: {
      brand: "from-brand/30",
      brandForeground: "from-brand-foreground/50 dark:from-brand-foreground/50",
      red: "from-red-300/50 dark:from-red-700/50",
      green: "from-green-300/50 dark:from-green-700/50",
      blue: "from-blue-300/50 dark:from-blue-700/50",
      purple: "from-purple-300/50 dark:from-purple-700/30",
      pink: "from-pink-300/50 dark:from-pink-700/30",
    },
  },
  defaultVariants: {
    variant: "top",
    toColor: "brand",
    fromColor: "brandForeground",
  },
});

function Glow({
  className,
  variant,
  toColor = "brand",
  fromColor = "brandForeground",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof glowVariants>) {
  // Get color classes directly
  const fromColorClass = glowVariants({ fromColor }).split(' ').find(cls => cls.startsWith('from-')) || 'from-brand-foreground/50';
  const toColorClass = glowVariants({ toColor }).split(' ').find(cls => cls.startsWith('to-')) || 'to-brand-foreground/0';
  
  return (
    <div
      data-slot="glow"
      className={cn(glowVariants({ variant }), className)}
      {...props}
    >
      <div
        className={cn(
          "absolute left-1/2 h-[256px] w-[60%] -translate-x-1/2 scale-[2.5] rounded-[50%] bg-radial from-10% to-60% opacity-100 sm:h-[512px] dark:opacity-100",
          variant === "center" && "-translate-y-1/2",
          fromColorClass,
          toColorClass
        )}
      />
      <div
        className={cn(
          "absolute left-1/2 h-[128px] w-[40%] -translate-x-1/2 scale-200 rounded-[50%] bg-radial from-10% to-60% opacity-100 sm:h-[256px] dark:opacity-100",
          variant === "center" && "-translate-y-1/2",
          fromColorClass,
          toColorClass
        )}
      />
    </div>
  );
}

export default Glow;
