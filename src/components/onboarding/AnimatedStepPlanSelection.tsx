"use client";

import React from "react";
import { motion } from "framer-motion";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedStepPlanSelectionProps {
  selectedPlan: string;
  setSelectedPlan: (plan: string) => void;
  onNext: () => void;
  isProcessing: boolean;
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    features: [
      "Basic features",
      "Limited storage",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "For small teams",
    features: [
      "50GB storage",
      "1M tokens included",
      "1 client page",
      "Email support",
    ],
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$99",
    period: "/month",
    description: "For growing teams",
    features: [
      "200GB storage",
      "5M tokens included",
      "3 client pages",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$199",
    period: "/month",
    description: "For large teams",
    features: [
      "500GB storage",
      "20M tokens included",
      "5 client pages",
      "Dedicated support",
    ],
    popular: false,
  },
];

export function AnimatedStepPlanSelection({
  selectedPlan,
  setSelectedPlan,
  onNext,
  isProcessing,
}: AnimatedStepPlanSelectionProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              disabled={isProcessing}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative p-6 rounded-xl border-[0.5px] border-border/30 bg-card/30 backdrop-blur-sm transition-all text-left",
                "hover:border-primary/50 hover:bg-card/50",
                selectedPlan === plan.id && "border-primary/60 bg-primary/5 ring-1 ring-primary/20",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary/20 border-[0.5px] border-primary/30 text-xs font-medium text-primary">
                  Popular
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {plan.price}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plan.period}
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {selectedPlan === plan.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 right-4"
                >
                  <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="size-3 text-primary-foreground" />
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          You can change your plan anytime from the dashboard
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex justify-end pt-4 border-t-[0.5px] border-border/30"
      >
        <RainbowButton
          onClick={onNext}
          disabled={!selectedPlan || isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue"
          )}
        </RainbowButton>
      </motion.div>
    </motion.div>
  );
}

