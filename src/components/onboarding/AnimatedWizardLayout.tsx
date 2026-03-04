"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AnimatedWizardLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  completedSteps?: number[];
  steps?: { step: number; label: string }[];
}

export function AnimatedWizardLayout({
  children,
  currentStep,
  totalSteps,
  title,
  description,
  completedSteps = [],
  steps,
}: AnimatedWizardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        </motion.div>

        {/* Progress Steps */}
        {steps && steps.length > 0 && (
          <nav aria-label="Progress" className="mt-8">
            <ol role="list" className="flex items-center justify-center">
              {steps.map((stepItem, index) => {
                const isCompleted = completedSteps.includes(stepItem.step) || currentStep > stepItem.step;
                const isCurrent = currentStep === stepItem.step;
                const isPast = currentStep > stepItem.step;

                return (
                  <li key={stepItem.step} className={cn("relative", index !== steps.length - 1 ? "pr-12 sm:pr-24" : "")}>
                    {index !== steps.length - 1 && (
                      <div className="absolute top-4 left-8 sm:left-10 -right-8 sm:-right-10 h-[1px] bg-border/30" aria-hidden="true">
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/60"
                          initial={{ width: 0 }}
                          animate={{ width: isCompleted ? "100%" : "0%" }}
                          transition={{ 
                            duration: 0.8, 
                            ease: [0.4, 0, 0.2, 1] // Custom cubic-bezier for fluid motion
                          }}
                          style={{
                            boxShadow: isCompleted 
                              ? "0 0 8px rgba(var(--primary), 0.3)" 
                              : "none"
                          }}
                        />
                      </div>
                    )}
                    <div className="relative flex flex-col items-center group">
                      <span className="h-9 flex items-center">
                        <motion.span
                          className={cn(
                            "relative z-10 w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-300",
                            isCompleted
                              ? "bg-primary border-primary shadow-sm shadow-primary/20"
                              : isCurrent
                              ? "bg-background border-primary/60 shadow-sm"
                              : "bg-background/50 border-border/40"
                          )}
                          initial={false}
                          animate={{
                            scale: isCurrent ? 1.05 : isCompleted ? 1 : 0.95,
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <AnimatePresence mode="wait">
                            {isCompleted ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                exit={{ scale: 0, rotate: 180, opacity: 0 }}
                                transition={{ 
                                  duration: 0.4,
                                  ease: [0.34, 1.56, 0.64, 1] // Bounce effect
                                }}
                              >
                                <Check className="w-4 h-4 text-primary-foreground" />
                              </motion.div>
                            ) : (
                              <motion.span
                                key="number"
                                className={cn(
                                  "text-sm font-medium",
                                  isCurrent ? "text-primary" : "text-muted-foreground/70"
                                )}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {stepItem.step}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.span>
                      </span>
                      <motion.span
                        className={cn(
                          "ml-0 mt-2.5 min-w-max text-xs font-medium tracking-wider uppercase",
                          isCurrent 
                            ? "text-foreground" 
                            : isPast
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground/40"
                        )}
                        initial={{ opacity: 0.4 }}
                        animate={{ 
                          opacity: isCurrent ? 1 : isPast ? 0.6 : 0.4,
                          y: isCurrent ? 0 : 2
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        {stepItem.label}
                      </motion.span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="bg-card/50 backdrop-blur-sm border-[0.5px] border-border/30 rounded-2xl shadow-sm py-8 px-6 sm:px-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

