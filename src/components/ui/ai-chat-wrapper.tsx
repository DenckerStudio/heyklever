"use client";

/**
 * AIChatWrapper Component
 * Used for: Internal team chat (floating chat button)
 * Service: Uses GlobalChat component with unified chat service
 * Context: Dynamic - can be 'public' or 'private'
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconMaximize, IconMinimize } from '@tabler/icons-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { GlobalChat } from './global-chat';
import { GlowEffect } from './glow-effect';

interface AIChatWrapperProps {
  children: React.ReactNode;
}

// Routes where the floating chat button should be hidden
// (pages that have their own integrated chat interface)
const HIDDEN_ROUTES_PREFIX = ['/dashboard/chat', '/dashboard/docs'];
// Exact routes (like the main dashboard with NotebookLayout)
const HIDDEN_ROUTES_EXACT = ['/dashboard'];

export function AIChatWrapper({ children }: AIChatWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  
  // Hide floating button on pages with integrated chat
  const shouldHideFloatingButton = 
    HIDDEN_ROUTES_EXACT.includes(pathname || '') ||
    HIDDEN_ROUTES_PREFIX.some(route => pathname?.startsWith(route));

  // Close panel if navigating to a hidden route
  useEffect(() => {
    if (shouldHideFloatingButton && isOpen) {
      setIsOpen(false);
    }
  }, [shouldHideFloatingButton, isOpen]);

  return (
    <>
      {children}

      {/* Floating Chat Button - Hidden on pages with integrated chat */}
      {!shouldHideFloatingButton && (
        <motion.div
          className="fixed md:bottom-6 bottom-22 right-6 z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring" as const, stiffness: 260, damping: 20, delay: 0.5 }}
        >
        <GlowEffect
          colors={[
            "oklch(58.5% 0.233 277.117)",
            "oklch(81.1% 0.111 293.571)",
            "oklch(62.7% 0.265 303.9)",
            "oklch(58.5% 0.233 277.117)",
            "oklch(81.1% 0.111 293.571)",
            "oklch(62.7% 0.265 303.9)",
          ]}
          mode="rotate"
          blur="strong"
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          scale={0.7}
          duration={5}
        />
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-gradient-to-r from-background dark:via-background/80 via-background/70 to-background",
            "border-0 p-0 relative overflow-hidden group"
          )}
        >
          <motion.div
            className="absolute inset-0 bg-white/20"
            animate={{
              scale: isOpen ? [1, 1.2, 1] : 1,
              opacity: isOpen ? [0, 0.3, 0] : 0,
            }}
            transition={{ duration: 0.6 }}
          />
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <IconX size={24} className="text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Image
                  src="/logo-icon.png"
                  alt="Klever AI"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
      )}

      {/* Chat Panel with new chat-01 components - Also hidden on integrated chat pages */}
      <AnimatePresence>
        {isOpen && !shouldHideFloatingButton && (
          <motion.div
            className={cn(
              "fixed z-40 bg-background border dark:border-border/10 border-border/90 shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ease-in-out",
              // Mobile styles (always full screen when open)
              "bottom-0 right-0 w-full h-full rounded-none",
              // Desktop styles
              "md:bottom-24 md:right-6 md:rounded-2xl",
              // Expanded vs Collapsed desktop styles
              isExpanded
                ? "md:w-[60vw] md:h-[85vh] md:max-w-[1200px]"
                : "md:w-[28rem] md:h-[70vh]"
            )}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.3,
            }}
          >
            {/* Expand/Collapse Toggle - Only visible on Desktop */}
            <div className="hidden md:flex absolute top-3 right-4 z-50">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? (
                  <IconMinimize size={16} />
                ) : (
                  <IconMaximize size={16} />
                )}
              </button>
            </div>

            <GlobalChat
              variant="team"
              context="private"
              className="h-full"
              showHeader={true}
              allowContextSwitch={true}
              allowFileUpload={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
