import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WizardLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  completedSteps?: number[];
  steps?: { step: number; label: string }[];
}

export function WizardLayout({
  children,
  currentStep,
  totalSteps,
  title,
  description,
  completedSteps = [],
  steps,
}: WizardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {description}
          </p>
        </div>

        {/* Progress Steps */}
        {steps && steps.length > 0 && (
          <nav aria-label="Progress" className="mt-8">
            <ol role="list" className="flex items-center justify-center">
              {steps.map((stepItem, index) => {
                const isCompleted = completedSteps.includes(stepItem.step) || currentStep > stepItem.step;
                const isCurrent = currentStep === stepItem.step;

                return (
                  <li key={stepItem.step} className={cn("relative", index !== steps.length - 1 ? "pr-8 sm:pr-20" : "")}>
                    {index !== steps.length - 1 && (
                      <div className="absolute top-4 left-0 -right-8 sm:-right-20 h-0.5 bg-gray-200" aria-hidden="true">
                        <div
                          className={cn(
                            "h-full transition-all duration-500 ease-in-out bg-primary",
                            isCompleted ? "w-full" : "w-0"
                          )}
                        />
                      </div>
                    )}
                    <div className="relative flex flex-col items-center group">
                      <span className="h-9 flex items-center">
                        <span
                          className={cn(
                            "relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors duration-200",
                            isCompleted
                              ? "bg-primary border-primary"
                              : isCurrent
                              ? "bg-white border-primary"
                              : "bg-white border-gray-300"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 text-white" />
                          ) : (
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isCurrent ? "text-primary" : "text-gray-500"
                              )}
                            >
                              {stepItem.step}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="ml-0 mt-2 min-w-max text-xs font-medium text-gray-500 tracking-wide uppercase">
                        {stepItem.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Content */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
            {children}
        </div>
      </div>
    </div>
  );
}

