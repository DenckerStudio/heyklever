"use client";

import * as React from "react";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CardProps = React.HTMLAttributes<HTMLDivElement>;
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        "text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-transparent",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

type CardTitleProps = React.HTMLAttributes<HTMLDivElement>;
const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

type CardDescriptionProps = React.HTMLAttributes<HTMLDivElement>;
const CardDescription = React.forwardRef<HTMLDivElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

type CardActionProps = React.HTMLAttributes<HTMLDivElement>;
const CardAction = React.forwardRef<HTMLDivElement, CardActionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
);
CardAction.displayName = "CardAction";

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

interface StatItem {
  name: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  description?: string;
  href?: string;
}

interface StatsCardsWithLinksProps {
  data: StatItem[];
  className?: string;
}

export function StatsCardsWithLinks({ data, className }: StatsCardsWithLinksProps) {
  return (
    <div className={cn("w-full", className)}>
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 w-full">
        {data.map((item) => (
          <Card key={item.name} className="p-0 gap-0 border-transparent">
            <CardContent className="p-6">
              <dd className="flex items-start justify-between space-x-2">
                <span className="truncate text-sm text-muted-foreground">
                  {item.name}
                </span>
                {item.change && item.changeType && (
                  <span
                    className={cn(
                      "text-sm font-medium",
                      item.changeType === "positive"
                        ? "text-emerald-700 dark:text-emerald-500"
                        : "text-red-700 dark:text-red-500"
                    )}
                  >
                    {item.change}
                  </span>
                )}
              </dd>
              <dd className="mt-1 text-3xl font-semibold text-foreground">
                {item.value}
              </dd>
              {item.description && (
                <dd className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </dd>
              )}
            </CardContent>
            {item.href && (
              <CardFooter className="flex justify-start !p-0">
                <a
                  href={item.href}
                  className="px-6 py-3 text-sm font-medium text-primary hover:text-primary/90"
                >
                  View more →
                </a>
              </CardFooter>
            )}
          </Card>
        ))}
      </dl>
    </div>
  );
}