"use client";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Settings, LogOut, ChevronsUpDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useIsMobile } from '@/hooks/use-mobile';

export function UserDropdown({ avatarUrl, displayName, onSignOut }: { avatarUrl: string | null; displayName: string; onSignOut: () => void }) {
  const { open, animate, setLocked, setOpen } = useSidebar();
  const isMobile = useIsMobile();

  // Generate initials from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = displayName ? getInitials(displayName) : 'U';

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <DropdownMenu.Root
        onOpenChange={(isOpen) => {
          setLocked(isOpen);
          // If sidebar is collapsed, clicking opens it to show menu
          if (isOpen && animate && !open) setOpen(true);
        }}
      >
        <DropdownMenu.Trigger asChild>
          <button
            suppressHydrationWarning
            aria-label="User menu"
            className={cn(
              "flex items-center gap-2 w-full py-1.5 rounded-lg transition-all duration-150 ease-in-out hover:bg-neutral-100 dark:hover:bg-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 dark:focus-visible:ring-neutral-800 justify-between"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
               <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    {initials}
                  </span>
                )}
              </div>
              
              <motion.div
                animate={{
                  display: animate ? (open ? "flex" : "none") : "flex",
                  opacity: animate ? (open ? 1 : 0) : 1,
                  width: animate ? (open ? "auto" : 0) : "auto",
                }}
                className="flex-col items-start hidden overflow-hidden text-left"
              >
                <span className="text-sm font-medium text-foreground dark:text-foreground truncate w-full max-w-[150px] leading-tight">
                  {displayName || "User"}
                </span>
                <span className="text-xs text-muted-foreground dark:text-muted-foreground truncate w-full max-w-[150px] leading-tight">
                  Free Plan
                </span>
              </motion.div>
            </div>

             <motion.div
                animate={{
                  display: animate ? (open ? "block" : "none") : "block",
                  opacity: animate ? (open ? 1 : 0) : 1,
                }}
             >
              <ChevronsUpDown className="ml-auto size-4 text-neutral-400 dark:text-neutral-500" />
            </motion.div>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            side={isMobile ? "top" : "right"} 
            align={isMobile ? "end" : "end"} 
            sideOffset={isMobile ? 8 : 10} 
            className="z-[200] min-w-[240px] rounded-xl bg-white dark:bg-neutral-900 p-1.5 shadow-xl border border-neutral-200/60 dark:border-neutral-800 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200"
          >
            <div className="px-2 py-2 flex items-center gap-3 mb-1">
               <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="avatar"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    {initials}
                  </span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                 <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {displayName || "User"}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  Free Plan
                </div>
              </div>
            </div>

            <div className="px-1 mb-1">
               <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 dark:border-violet-500/30 flex items-center justify-between cursor-pointer hover:from-violet-500/15 hover:to-fuchsia-500/15 transition-colors group">
                  <div className="flex items-center gap-2">
                     <div className="p-1 rounded-md bg-white dark:bg-black shadow-sm">
                        <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 group-hover:text-violet-800 dark:group-hover:text-violet-200">Upgrade to Pro</span>
                        <span className="text-[10px] text-violet-600/80 dark:text-violet-400/80">Unlock all features</span>
                     </div>
                  </div>
               </div>
            </div>
            
            <DropdownMenu.Separator className="h-px bg-neutral-100 dark:bg-neutral-800 my-1 mx-1" />
            
            {/* Menu items */}
            <div className="space-y-0.5">
               <DropdownMenu.Item className="px-2 py-1.5 rounded-md text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex items-center gap-2 outline-none transition-colors" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="size-4 text-neutral-500 dark:text-neutral-400" />
                  Settings
                </Link>
              </DropdownMenu.Item>
            </div>
            
            <DropdownMenu.Separator className="h-px bg-neutral-100 dark:bg-neutral-800 my-1 mx-1" />
            
            {/* Sign out */}
            <div>
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  onSignOut();
                }}
                className="px-2 py-1.5 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer flex items-center gap-2 outline-none transition-colors"
              >
                <LogOut className="size-4 text-red-500 dark:text-red-400" />
                Sign out
              </DropdownMenu.Item>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
