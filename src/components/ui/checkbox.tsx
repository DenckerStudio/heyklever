"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

// Since @radix-ui/react-checkbox is not installed, I'll create a simple accessible checkbox
// or just use a standard input with styling.
// Given the user might expect Shadcn-like components, I'll try to mimic it with standard input
// but actually, using a standard input is safer without the dependency.

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }
>(({ className, onCheckedChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <input
      type="checkbox"
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground accent-primary",
        className
      )}
      ref={ref}
      onChange={handleChange}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }

