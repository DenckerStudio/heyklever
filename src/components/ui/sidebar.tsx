"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";
import { AnimatedThemeToggler } from "./animated-theme-toggler";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  locked: boolean;
  setLocked: (locked: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const [locked, setLockedState] = useState(false);
  const isMobile = useIsMobile();

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  
  const setLocked = (locked: boolean) => {
    setLockedState(locked);
  };

  const toggleSidebar = () => {
    setOpen(!open);
  };

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate, locked, setLocked, toggleSidebar, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  className,
  variant,
  collapsible,
  ...props
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  className?: string;
  variant?: "inset" | "floating" | "sidebar";
  collapsible?: "icon" | "offcanvas" | "none";
} & React.ComponentProps<"div">) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      <div 
        className={cn("md:h-full shrink-0", className)} 
        data-variant={variant}
        data-collapsible={collapsible}
        {...props}
      >
        {children}
      </div>
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, locked } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar w-[300px] shrink-0",
          className
        )}
        animate={{
          width: animate ? (open ? "300px" : "60px") : "300px",
        }}
        onMouseEnter={() => !locked && setOpen(true)}
        onMouseLeave={() => !locked && setOpen(false)}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  
  // Extract main content and profile sections
  const childrenArray = React.Children.toArray(children);
  let mainContentSection: React.ReactElement | null = null;
  let profileSection: React.ReactNode = null;
  let teamSwitcherSection: React.ReactNode = null;
  let navigationSection: React.ReactNode = null;
  
  childrenArray.forEach((child) => {
    if (React.isValidElement(child)) {
      const props = child.props as { className?: string; children?: React.ReactNode };
      if (props.className?.includes('flex flex-1 flex-col')) {
        mainContentSection = child as React.ReactElement;
        const mainChildren = React.Children.toArray(props.children);
        teamSwitcherSection = mainChildren[0] || null;
        navigationSection = mainChildren[1] || null;
      } else {
        profileSection = child;
      }
    }
  });

  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between",
          "bg-sidebar dark:bg-sidebar border-b border-sidebar-border",
          "w-full z-30 relative"
        )}
        {...props}
      >
        <div className="flex justify-between w-full">
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <AnimatedThemeToggler className="my-auto h-6 w-6 mx-2 cursor-pointer" />
          </div>
          <motion.button
            onClick={() => setOpen(!open)}
            className="relative p-2 rounded-lg hover:bg-sidebar-accent dark:hover:bg-sidebar-accent transition-colors"
            whileTap={{ scale: 0.95 }}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <motion.div
              className="relative w-6 h-6"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <AnimatePresence mode="wait">
                {open ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    <X className="w-6 h-6 text-sidebar-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0"
                  >
                    <Menu className="w-6 h-6 text-sidebar-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.button>
        </div>
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-0 bg-foreground/20 dark:bg-black/40 backdrop-blur-sm z-[100]"
                onClick={() => setOpen(false)}
              />
              {/* Floating sidebar panel */}
              <motion.div
                initial={{
                  x: "-100%",
                  opacity: 0,
                  scale: 0.95,
                  filter: "blur(10px)",
                }}
                animate={{
                  x: 0,
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  x: "-100%",
                  opacity: 0,
                  scale: 0.95,
                  filter: "blur(10px)",
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className={cn(
                  "fixed top-0 left-0 h-full w-[85%] max-w-sm z-[101] rounded-r-2xl",
                  "bg-sidebar/95 dark:bg-sidebar/95",
                  "backdrop-blur-xl backdrop-saturate-150",
                  "border-r border-sidebar-border",
                  "shadow-2xl shadow-black/10 dark:shadow-black/40",
                  "flex flex-col",
                  className
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Section */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-sidebar-border">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/logo-icon.png"
                      alt="Klever"
                      className="w-9 h-9"
                      width={36}
                      height={36}
                    />
                    <span className="text-lg font-semibold text-sidebar-foreground">
                      Klever
                    </span>
                  </div>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 text-muted-foreground hover:text-sidebar-foreground transition-colors" />
                  </motion.button>
                </div>

                {/* Main Content - Same categorized nav as desktop (Workspace, AI, Analytics, Billing & Plans) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                  <div className="px-5 py-6 flex-1 flex flex-col">
                    {navigationSection && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.3 }}
                        className="flex flex-col gap-6 [&_[data-nav-category]]:text-muted-foreground [&_button]:w-full [&_button]:px-3 [&_button]:py-2.5 [&_button]:rounded-lg [&_button]:text-left [&_button]:flex [&_button]:items-center [&_button]:gap-3 [&_button]:text-sm [&_button]:font-medium [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:translate-x-0.5 [&_button:hover]:bg-sidebar-accent [&_button]:text-sidebar-foreground"
                      >
                        {navigationSection}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Profile Section - Fixed at Bottom */}
                {profileSection && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="px-5 py-4 border-t border-sidebar-border bg-sidebar/80"
                  >
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Account
                      </span>
                    </div>
                    <div className="[&_button]:w-full [&_button]:px-3 [&_button]:py-2.5 [&_button]:rounded-xl [&_button]:bg-sidebar-accent/50 [&_button]:border [&_button]:border-sidebar-border [&_button]:hover:bg-sidebar-accent [&_button]:transition-all">
                      {profileSection}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 ",
        className
      )}
      {...props}
    >
      {link.icon}

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </a>
  );
};

export const SidebarTrigger = ({
  className,
  ...props
}: React.ComponentProps<"button">) => {
  const { open, setOpen } = useSidebar();
  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(
        "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
        className
      )}
      aria-label={open ? "Close sidebar" : "Open sidebar"}
      {...props}
    >
      {open ? (
        <X className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
      ) : (
        <Menu className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
      )}
    </button>
  );
};

export const SidebarInset = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "bg-background flex flex-1 flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarHeader = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarContent = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-2 px-2 py-2", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarFooter = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2 border-t", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarGroup = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarGroupContent = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarMenu = ({
  className,
  children,
  ...props
}: React.ComponentProps<"ul">) => {
  return (
    <ul
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </ul>
  );
};

export const SidebarMenuItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      className={cn("", className)}
      {...props}
    >
      {children}
    </li>
  );
};

export const SidebarMenuButton = ({
  className,
  children,
  tooltip,
  isActive,
  variant,
  asChild,
  size,
  ...props
}: React.ComponentProps<"button"> & {
  tooltip?: string;
  isActive?: boolean;
  variant?: "default" | "outline";
  asChild?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "px-2 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-base",
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn(
        "flex items-center gap-2 rounded-md font-medium transition-colors",
        sizeClasses[size || "md"],
        isActive && "bg-accent text-accent-foreground",
        variant === "outline" && "border border-border",
        className,
        (children.props as any)?.className
      ),
      title: tooltip,
    });
  }
  
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-md font-medium transition-colors",
        sizeClasses[size || "md"],
        isActive && "bg-accent text-accent-foreground",
        variant === "outline" && "border border-border",
        className
      )}
      title={tooltip}
      {...props}
    >
      {children}
    </button>
  );
};

export const SidebarSeparator = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("h-px bg-border my-2", className)}
      {...props}
    />
  );
};
