import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Prop definition for individual data points
interface ActivityDataPoint {
  day: string;
  value: number;
}

// Prop definition for the component
interface ActivityChartCardProps {
  title?: string;
  totalValue: string;
  data: ActivityDataPoint[];
  className?: string;
  dropdownOptions?: string[];
}

/**
 * A responsive and animated card component to display weekly activity data.
 * Features a bar chart animated with Framer Motion and supports shadcn theming.
 */
export const ActivityChartCard = ({
  title = "Activity",
  totalValue,
  data,
  className,
  dropdownOptions = ["Weekly", "Monthly", "Yearly"],
}: ActivityChartCardProps) => {
  const [selectedRange, setSelectedRange] = React.useState(
    dropdownOptions[0] || ""
  );

  // Find the maximum value in the data to normalize bar heights
  const maxValue = React.useMemo(() => {
    return data.reduce((max, item) => (item.value > max ? item.value : max), 0);
  }, [data]);

  // Framer Motion variants for animations
  const chartVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Animate each child (bar) with a delay
      },
    },
  };

  const barVariants = {
    hidden: { scaleY: 0, opacity: 0, transformOrigin: "bottom" },
    visible: {
      scaleY: 1,
      opacity: 1,
      transformOrigin: "bottom",
      transition: {
        duration: 0.5,
        ease: "easeOut" as const, // Use string literal instead of array
      },
    },
  };

  return (
    <Card
      className={cn("w-full bg-transparent border-0 shadow-none", className)}
      aria-labelledby="activity-card-title"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle id="activity-card-title" className="text-base font-medium">{title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-sm h-8 px-2 text-muted-foreground hover:text-foreground"
                aria-haspopup="true"
              >
                {selectedRange}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dropdownOptions.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={() => setSelectedRange(option)}
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="h-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 h-content">
          {/* Total Value */}
          <div className="flex flex-col">
            <p className="text-5xl font-bold tracking-tighter text-foreground">
              {totalValue}
            </p>
            <CardDescription className="flex items-center gap-1 text-xs mt-1">
              <div className="flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+12%</span>
              </div>
              <span className="text-muted-foreground/70">from last week</span>
            </CardDescription>
          </div>

          {/* Bar Chart */}
          <motion.div
            key={selectedRange} // Re-trigger animation when range changes
            className="flex h-40 w-full items-end justify-between gap-2"
            variants={chartVariants}
            initial="hidden"
            animate="visible"
            aria-label="Activity chart"
          >
            {data.map((item, index) => (
              <div
                key={index}
                className="flex h-full w-full flex-col items-center justify-end gap-2 group"
                role="presentation"
              >
                <div className="relative w-full h-full flex items-end justify-center">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] px-2 py-1 rounded">
                    {item.value}
                  </div>
                  
                  <motion.div
                    className="w-full max-w-[24px] rounded-t-sm bg-primary/80 group-hover:bg-primary transition-colors"
                    style={{
                      height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                    }}
                    variants={barVariants}
                    aria-label={`${item.day}: ${item.value} hours`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {item.day}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};
