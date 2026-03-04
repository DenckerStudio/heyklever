"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Callout Block Component
// ============================================================================

export type CalloutType = "info" | "warning" | "success" | "error" | "note";

interface CalloutBlockProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const calloutConfig: Record<CalloutType, { 
  icon: React.ElementType; 
  bgClass: string; 
  borderClass: string; 
  iconClass: string;
  titleClass: string;
}> = {
  info: {
    icon: Info,
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-800",
    iconClass: "text-blue-500 dark:text-blue-400",
    titleClass: "text-blue-800 dark:text-blue-200",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200 dark:border-amber-800",
    iconClass: "text-amber-500 dark:text-amber-400",
    titleClass: "text-amber-800 dark:text-amber-200",
  },
  success: {
    icon: CheckCircle,
    bgClass: "bg-green-50 dark:bg-green-950/30",
    borderClass: "border-green-200 dark:border-green-800",
    iconClass: "text-green-500 dark:text-green-400",
    titleClass: "text-green-800 dark:text-green-200",
  },
  error: {
    icon: XCircle,
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-800",
    iconClass: "text-red-500 dark:text-red-400",
    titleClass: "text-red-800 dark:text-red-200",
  },
  note: {
    icon: Info,
    bgClass: "bg-zinc-50 dark:bg-zinc-900/50",
    borderClass: "border-zinc-200 dark:border-zinc-700",
    iconClass: "text-zinc-500 dark:text-zinc-400",
    titleClass: "text-zinc-800 dark:text-zinc-200",
  },
};

export function CalloutBlock({ type, title, children, className }: CalloutBlockProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 p-4",
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-5 w-5 flex-shrink-0 mt-0.5", config.iconClass)}>
          {React.createElement(Icon as React.ComponentType<React.SVGAttributes<SVGElement>>, { className: "h-full w-full" })}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn("font-semibold mb-1", config.titleClass)}>
              {title}
            </p>
          )}
          <div className="text-sm text-foreground/80 [&>p]:m-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tag Badge Component
// ============================================================================

export type TagVariant = "default" | "primary" | "secondary" | "success" | "warning" | "error";

interface TagBadgeProps {
  children: React.ReactNode;
  variant?: TagVariant;
  className?: string;
}

const tagVariantClasses: Record<TagVariant, string> = {
  default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function TagBadge({ children, variant = "default", className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        "transition-colors duration-200",
        tagVariantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Action Button Component
// ============================================================================

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

interface ActionButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  external?: boolean;
  className?: string;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
};

export function ActionButton({ 
  href, 
  children, 
  variant = "primary", 
  external = true,
  className 
}: ActionButtonProps) {
  const isExternal = external || href.startsWith("http");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md",
        "text-sm font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonVariantClasses[variant],
        className
      )}
    >
      {children}
      {isExternal && <ExternalLink className="h-3.5 w-3.5" />}
    </a>
  );
}

// ============================================================================
// Collapsible Block Component
// ============================================================================

interface CollapsibleBlockProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleBlock({ 
  title, 
  children, 
  defaultOpen = false,
  className 
}: CollapsibleBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "my-4 rounded-lg border border-border bg-card overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3",
          "text-left font-medium text-sm",
          "hover:bg-muted/50 transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
      >
        <span>{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground border-t border-border">
              <div className="pt-3">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Inline Tag Group (for rendering multiple tags)
// ============================================================================

interface TagGroupProps {
  tags: string[];
  variant?: TagVariant;
  className?: string;
}

export function TagGroup({ tags, variant = "default", className }: TagGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 my-2", className)}>
      {tags.map((tag, index) => (
        <TagBadge key={`${tag}-${index}`} variant={variant}>
          {tag}
        </TagBadge>
      ))}
    </div>
  );
}

// ============================================================================
// Export all components
// ============================================================================

export {
  type CalloutBlockProps,
  type TagBadgeProps,
  type ActionButtonProps,
  type CollapsibleBlockProps,
  type TagGroupProps,
};
