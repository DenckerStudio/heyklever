'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Maximize2 } from 'lucide-react';
import { Button } from './button';

export interface BentoGridItemProps {
  children: React.ReactNode | ((isExpanded: boolean) => React.ReactNode);
  className?: string;
  span?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  rowSpan?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  expandable?: boolean;
  title?: string;
  onExpand?: () => void;
}

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
}

// Column span mapping for Tailwind classes
const colSpanMap: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

const colSpanMapMd: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
};

const colSpanMapLg: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
};

// Row span mapping for Tailwind classes
const rowSpanMap: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
};

const rowSpanMapMd: Record<number, string> = {
  1: 'md:row-span-1',
  2: 'md:row-span-2',
  3: 'md:row-span-3',
  4: 'md:row-span-4',
  5: 'md:row-span-5',
  6: 'md:row-span-6',
};

const rowSpanMapLg: Record<number, string> = {
  1: 'lg:row-span-1',
  2: 'lg:row-span-2',
  3: 'lg:row-span-3',
  4: 'lg:row-span-4',
  5: 'lg:row-span-5',
  6: 'lg:row-span-6',
};

// Grid columns mapping
const gridColsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
};

const gridColsMapMd: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
  7: 'md:grid-cols-7',
  8: 'md:grid-cols-8',
  9: 'md:grid-cols-9',
  10: 'md:grid-cols-10',
  11: 'md:grid-cols-11',
  12: 'md:grid-cols-12',
};

const gridColsMapLg: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
  7: 'lg:grid-cols-7',
  8: 'lg:grid-cols-8',
  9: 'lg:grid-cols-9',
  10: 'lg:grid-cols-10',
  11: 'lg:grid-cols-11',
  12: 'lg:grid-cols-12',
};

// Fullscreen expanded view
function ExpandedFullscreen({
  children,
  onClose,
}: {
  children: React.ReactNode;
  title?: string; // Keep in interface for compatibility but don't render
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 w-screen h-screen bg-background"
    >
      {/* Close button */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-xl shadow-lg bg-background/90 backdrop-blur-md border border-border/40"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Fullscreen content */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * BentoGridItem - A single item in the Bento grid with subtle styling
 */
export const BentoGridItem = ({
  children,
  className,
  span = { mobile: 1, tablet: 1, desktop: 1 },
  rowSpan = { mobile: 1, tablet: 1, desktop: 1 },
  expandable = false,
  title,
  onExpand,
}: BentoGridItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const colSpan = span.mobile || 1;
  const colSpanTablet = span.tablet || colSpan;
  const colSpanDesktop = span.desktop || colSpanTablet;

  const rowSpanMobile = rowSpan.mobile || 1;
  const rowSpanTablet = rowSpan.tablet || rowSpanMobile;
  const rowSpanDesktop = rowSpan.desktop || rowSpanTablet;

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    onExpand?.();
  }, [onExpand]);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return (
    <>
      <div
        className={cn(
          colSpanMap[colSpan] || 'col-span-1',
          colSpanMapMd[colSpanTablet] || 'md:col-span-1',
          colSpanMapLg[colSpanDesktop] || 'lg:col-span-1',
          rowSpanMap[rowSpanMobile] || 'row-span-1',
          rowSpanMapMd[rowSpanTablet] || 'md:row-span-1',
          rowSpanMapLg[rowSpanDesktop] || 'lg:row-span-1',
          'w-full h-full'
        )}
      >
        <motion.div
          whileHover={{ scale: expandable ? 1.01 : 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-full h-full rounded-xl",
            "bg-muted/20 dark:bg-muted/10",
            "border border-border/30 dark:border-border/20",
            "backdrop-blur-sm",
            "transition-all duration-300",
            "hover:border-border/50 dark:hover:border-border/30",
            "hover:bg-muted/30 dark:hover:bg-muted/15",
            "relative group",
            className
          )}
        >
          {/* Expand button - positioned at bottom right */}
          {expandable && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute bottom-3 right-3 z-10",
                "h-8 w-8 rounded-lg",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity duration-200",
                "bg-background/80 hover:bg-background border border-border/40",
                "shadow-sm"
              )}
              onClick={handleExpand}
              title="Expand to fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          
          <div className="relative z-0 w-full h-full p-5">
            {typeof children === 'function' ? children(false) : children}
          </div>
        </motion.div>
      </div>

      {/* Expanded fullscreen view */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedFullscreen title={title} onClose={handleClose}>
            {typeof children === 'function' ? children(true) : children}
          </ExpandedFullscreen>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * BentoGrid - A responsive grid layout with more spacious design
 */
export const BentoGrid = ({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 4 },
  gap = 'gap-5',
}: BentoGridProps) => {
  const colsMobile = columns.mobile || 1;
  const colsTablet = columns.tablet || 2;
  const colsDesktop = columns.desktop || 4;

  return (
    <div
      className={cn(
        "grid",
        "w-full",
        gridColsMap[colsMobile] || "grid-cols-1",
        gridColsMapMd[colsTablet] || "md:grid-cols-2",
        gridColsMapLg[colsDesktop] || "lg:grid-cols-4",
        gap,
        "auto-rows-auto",
        className
      )}
    >
      {children}
    </div>
  );
};
