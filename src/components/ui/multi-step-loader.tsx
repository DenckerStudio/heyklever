"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

export type StepState = "upcoming" | "current" | "completed";

interface Step {
  title: string;
  description?: string;
}

interface MultiStepLoaderProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function MultiStepLoader({ steps, currentStep, className }: MultiStepLoaderProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const state: StepState = 
            index < currentStep ? "completed" : 
            index === currentStep ? "current" : "upcoming";
            
          return (
            <div key={index} className="flex flex-col items-center relative z-10 w-full">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: state === "completed" || state === "current" ? "var(--primary)" : "var(--muted)",
                  borderColor: state === "completed" || state === "current" ? "var(--primary)" : "var(--border)",
                  scale: state === "current" ? 1.1 : 1,
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 bg-background",
                  state === "upcoming" && "text-muted-foreground",
                  state === "current" && "text-primary-foreground",
                  state === "completed" && "text-primary-foreground"
                )}
              >
                {state === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </motion.div>
              <div className="mt-2 text-center">
                <p className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    state === "current" ? "text-primary" : "text-muted-foreground"
                )}>
                    {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Connecting Lines */}
      <div className="absolute top-4 left-0 w-full h-[2px] bg-muted -z-0">
          <motion.div 
            className="h-full bg-primary origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: currentStep / (steps.length - 1) }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{ width: "100%" }}
          />
      </div>
    </div>
  );
}

