"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Zap } from "lucide-react";

const features = [
  {
    category: "Core Features",
    items: [
      { name: "Basic Components", free: true, enterprise: true },
      { name: "Advanced Animations", free: false, enterprise: true },
      { name: "Custom Themes", free: false, enterprise: true },
      { name: "Priority Support", free: false, enterprise: true },
    ],
  },
  {
    category: "Integrations",
    items: [
      { name: "API Access", free: false, enterprise: true },
      { name: "Webhooks", free: false, enterprise: true },
      { name: "Custom Integrations", free: false, enterprise: true },
    ],
  },
  {
    category: "Support & Limits",
    items: [
      { name: "5 Projects", free: true, enterprise: false },
      { name: "Unlimited Projects", free: false, enterprise: true },
      { name: "Team Collaboration", free: false, enterprise: true },
      { name: "Dedicated Manager", free: false, enterprise: true },
    ],
  },
];

export function FeatureComparisonBlock() {
  return (
    <section className="w-full bg-background px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <Badge className="mb-4" variant="secondary">
            <div className="flex items-center justify-center gap-2">
              <Zap className="mr-1 h-3 w-3" />
              Compare Plans
            </div>
          </Badge>
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Choose the right plan for you
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground px-2">
            Compare features across Free and Enterprise and find the perfect fit
            for your needs
          </p>
        </motion.div>

        {/* Feature Comparison Table - Free vs Enterprise */}
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="min-w-[280px] w-full max-w-2xl mx-auto"
          >
            <div className="space-y-6">
              {/* Column headers for comparison table */}
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-3 gap-3 sm:gap-4 px-3 sm:px-4 pb-2 text-xs sm:text-sm font-medium text-muted-foreground">
                <span>Feature</span>
                <span className="text-center w-10 sm:w-12 shrink-0">Free</span>
                <span className="text-center w-10 sm:w-12 shrink-0">Enterprise</span>
              </div>
              {features.map((category, categoryIndex) => (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: 0.1 * categoryIndex, duration: 0.4 }}
                >
                  <h4 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold">
                    {category.category}
                  </h4>
                  <Card className="relative overflow-hidden border-border/20 bg-card/50 backdrop-blur-sm">
                    {/* Animated border glow */}
                    <motion.div
                      className="absolute inset-0 rounded-lg"
                      animate={{
                        boxShadow: [
                          "0 0 0px 0px hsl(var(--primary) / 0)",
                          "0 0 20px 1px hsl(var(--primary) / 0.15)",
                          "0 0 0px 0px hsl(var(--primary) / 0)",
                        ],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Subtle shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                        repeatDelay: 2,
                      }}
                    />

                    {category.items.map((feature, featureIndex) => (
                      <motion.div
                        key={feature.name}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-20px" }}
                        transition={{
                          delay: 0.05 * featureIndex,
                          duration: 0.3,
                        }}
                        whileHover={{
                          backgroundColor: "hsl(var(--muted) / 0.5)",
                          transition: { duration: 0.2 },
                        }}
                        className={`relative grid grid-cols-[1fr_auto_auto] sm:grid-cols-3 gap-3 sm:gap-4 border-b border-border/10 p-3 sm:p-4 last:border-b-0 transition-colors ${
                          featureIndex % 2 === 0
                            ? "bg-muted/20"
                            : "bg-background/50"
                        }`}
                      >
                        {/* Animated row border on hover */}
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/0"
                          whileHover={{
                            backgroundColor: "hsl(var(--primary) / 0.3)",
                            width: "2px",
                          }}
                          transition={{ duration: 0.2 }}
                        />

                        <div className="flex items-center min-w-0">
                          <span className="text-sm font-medium text-foreground/90 truncate">
                            {feature.name}
                          </span>
                        </div>

                        {/* Free */}
                        <div className="flex items-center justify-center w-10 sm:w-12 shrink-0">
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            whileInView={{
                              scale: feature.free ? 1 : 0.6,
                              rotate: 0,
                            }}
                            viewport={{ once: true, margin: "-20px" }}
                            transition={{
                              delay: 0.1 * featureIndex + 0.2,
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                            }}
                            whileHover={{
                              scale: feature.free ? 1.3 : 0.8,
                              rotate: feature.free ? [0, -10, 10, -10, 0] : 0,
                            }}
                            className="relative"
                          >
                            {feature.free ? (
                              <Check
                                className="h-5 w-5 text-primary"
                                strokeWidth={2.5}
                              />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/20" />
                            )}
                          </motion.div>
                        </div>

                        {/* Enterprise */}
                        <div className="flex items-center justify-center w-10 sm:w-12 shrink-0">
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            whileInView={{
                              scale: feature.enterprise ? 1 : 0.6,
                              rotate: 0,
                            }}
                            viewport={{ once: true, margin: "-20px" }}
                            transition={{
                              delay: 0.1 * featureIndex + 0.3,
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                            }}
                            whileHover={{
                              scale: feature.enterprise ? 1.3 : 0.8,
                              rotate: feature.enterprise
                                ? [0, -10, 10, -10, 0]
                                : 0,
                            }}
                            className="relative"
                          >
                            {feature.enterprise ? (
                              <Check
                                className="h-5 w-5 text-primary"
                                strokeWidth={2.5}
                              />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/20" />
                            )}
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-12 text-center"
            >
              <p className="mb-4 text-sm text-muted-foreground">
                Need a custom plan?
              </p>
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
