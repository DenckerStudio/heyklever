"use client";
import React from "react";
import { PinContainer } from "@/components/ui/3d-pin";
import { cn } from "@/lib/utils";

type Stat = { title: string; value: string };
interface WidgetProps {
  title: string;
  href: string;
  stats: [Stat, Stat];
  footer: [{ title: string; value: string }];
  isActive?: boolean;
}

export function Widget(props: WidgetProps) {
  return (
    <div className="w-full h-full flex items-stretch justify-center">
      <PinContainer title={props.title} href={props.href}>
        <div className="flex flex-col p-4 tracking-tight min-w-[20rem] text-slate-100/50 w-full max-w-full bg-gradient-to-b from-slate-200/50 to-slate-200/0 backdrop-blur-sm border border-slate-300/50 rounded-2xl dark:from-neutral-900 dark:to-neutral-900/0 dark:border-neutral-700 dark:text-slate-100/50 min-h-[14rem] sm:min-h-[16rem] md:min-h-[18rem]">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className={cn("size-3 rounded-full bg-red-500 animate-pulse", props.isActive ? "bg-green-500" : "bg-red-500")} />
            <div className="text-xs text-slate-400">{props.isActive ? "Active" : "Inactive"}</div>
          </div>

          {/* Content */}
          <div className="flex-1 mt-4 space-y-4 min-h-0">
            <div className="text-2xl font-bold text-slate-100">
              {props.title}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-sky-400">{props.stats[0].value}</div>
                <div className="text-xs text-slate-400">{props.stats[0].title}</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-emerald-400">{props.stats[1].value}</div>
                <div className="text-xs text-slate-400">{props.stats[1].title}</div>
              </div>
            </div>

            {/* Animated Waves */}
            <div className="relative h-16 sm:h-20 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <>
                <div
                  key={i}
                  className="absolute w-full h-20 dark:hidden"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)`,
                    animation: `wave ${2 + i * 0.5}s ease-in-out infinite`,
                    opacity: 0.2 / i,
                    transform: `translateY(${i * 10}px)`,
                  }}
                />
                <div
                  key={i}
                  className="absolute w-full h-20 dark:block hidden"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, rgba(159, 230, 246, 0.1) 50%, transparent 100%)`,
                    animation: `wave ${2 + i * 0.5}s ease-in-out infinite`,
                    opacity: 0.2 / i,
                    transform: `translateY(${i * 10}px)`,
                  }}
                />
                </>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end mt-auto pt-2">
              <div className="text-xs text-slate-400">
                 {props.footer[0].title}: {props.footer[0].value} min ago
              </div>
              <div className="text-sky-400 text-sm font-medium">Visit {props.title} →</div>
            </div>
          </div>
        </div>
      </PinContainer>

      <style jsx>{`
        @keyframes wave {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
