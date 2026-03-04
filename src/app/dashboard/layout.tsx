"use client";
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTeams } from '@/lib/hooks/useTeams';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { AIChatWrapper } from '@/components/ui/ai-chat-wrapper';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { motion } from 'motion/react';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import {
  AnimatedNotebookIcon,
  AnimatedDashboardIcon,
  AnimatedTeamIcon,
  AnimatedPackageIcon,
  AnimatedBrainIcon,
  AnimatedChartIcon,
  AnimatedCreditCardIcon,
  type AnimatedIconProps,
} from '@/components/ui/animated-icons';
import { UserDropdown } from '@/app/dashboard/UserDropdown';
import { DashboardViewProvider, useDashboardNavigation, DashboardView, useDashboardView } from '@/lib/contexts/DashboardViewContext';
import { DashboardViewRenderer } from '@/components/dashboard/views';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

// Category label: hidden in closed mode, same animation as nav link labels
function NavCategoryLabel({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar();
  return (
    <motion.span
      data-nav-category
      animate={{
        display: animate ? (open ? "inline-block" : "none") : "inline-block",
        opacity: animate ? (open ? 1 : 0) : 1,
      }}
      transition={{ duration: 0.15 }}
      className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 inline-block overflow-hidden whitespace-nowrap"
    >
      {children}
    </motion.span>
  );
}

// Navigation link component for dashboard views
function DashboardNavLink({ label, view, Icon }: { label: string; view: DashboardView; Icon: React.ComponentType<AnimatedIconProps> }) {
  const { navigateTo, isActive } = useDashboardNavigation();
  const { open, animate } = useSidebar();
  const active = isActive(view);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={() => navigateTo(view)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left",
        "transition-colors duration-150 text-foreground/70 dark:text-foreground/70",
        active && "bg-secondary/10 dark:bg-secondary/10 rounded-md px-2 -mx-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" isHovered={isHovered} />
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.15 }}
        className={cn(
          "text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0 overflow-hidden",
          active
            ? "text-foreground dark:text-secondary-foreground font-bold"
            : "text-foreground dark:text-secondary-foreground"
        )}
      >
        {label}
      </motion.span>
    </button>
  );
}

// View title map for header
const viewTitleMap: Record<DashboardView, string> = {
  'notebook': 'Dashboard',
  'overview': 'Overview',
  'team': 'Team',
  'assets': 'Assets',
  'billing': 'Billing',
  'analytics': 'Analytics',
  'settings': 'Settings',
  'docs': 'AI Docs',
  'public-docs': 'Docs',
  'features': 'Features',
  'chat': 'Chat',
  'train-ai': 'Train AI',
};

// Header component that uses the view context
function DashboardHeader() {
  const { currentView } = useDashboardView();
  const pageTitle = viewTitleMap[currentView] ?? 'Dashboard';

  return (
    <header className="hidden h-14 shrink-0 items-center justify-between bg-sidebar lg:h-[60px] md:flex px-8">
      <div className="w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Klever</span>
          <span>/</span>
          <span className="text-foreground font-medium">{pageTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <AnimatedThemeToggler className="my-auto h-6 w-6 mx-2 cursor-pointer" />
          <TeamSwitcher />
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {

	const supabase = createSupabaseBrowserClient();
	const [displayName, setDisplayName] = useState<string>('');
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const { hasTeams, loading: teamsLoading } = useTeams();
	const searchParams = useSearchParams();
	const [inviteDialog, setInviteDialog] = useState<{ open: boolean; token: string; teamId: string; teamName: string }>(() => ({ open: false, token: '', teamId: '', teamName: '' }));
	const router = useRouter();

	useEffect(() => {
		void (async () => {
			const { data } = await supabase.auth.getUser();
			const authUser = data.user;
			let name = authUser?.email ?? '';
			if (authUser?.id) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('full_name, avatar_url')
					.eq('id', authUser.id)
					.maybeSingle();
				if (profile?.full_name) name = profile.full_name;
				if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
			}
			setDisplayName(name);
		})();
	}, [supabase]);

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		window.location.href = '/signin';
	};
	const navItem = (label: string, view: DashboardView, Icon: React.ComponentType<AnimatedIconProps>) => ({ label, view, Icon });
	const navCategories: { label: string; links: { label: string; view: DashboardView; Icon: React.ComponentType<AnimatedIconProps> }[] }[] = [
		{
			label: "Workspace",
			links: [
				navItem("Notebook", "notebook", AnimatedNotebookIcon),
				navItem("Overview", "overview", AnimatedDashboardIcon),
				navItem("Team", "team", AnimatedTeamIcon),
				navItem("Assets", "assets", AnimatedPackageIcon),
			],
		},
		{
			label: "AI",
			links: [
				navItem("Train AI", "train-ai", AnimatedBrainIcon),
			],
		},
		{
			label: "Analytics",
			links: [
				navItem("Analytics", "analytics", AnimatedChartIcon),
			],
		},
		{
			label: "Billing & Plans",
			links: [
				navItem("Billing", "billing", AnimatedCreditCardIcon),
			],
		},
	];

	// Initialize invite confirmation dialog from URL
	useEffect(() => {
		const token = searchParams.get('inviteToken');
		const teamId = searchParams.get('team') || '';
		const teamName = searchParams.get('teamName') || 'Team';
		if (token) {
			setInviteDialog({ open: true, token, teamId, teamName });
		}
	}, [searchParams]);

	// Auto-create team from pending signup data, or fall back to onboarding
	useEffect(() => {
		if (teamsLoading || hasTeams || inviteDialog.open) return;

		const pendingTeamName = localStorage.getItem('pendingTeamName');
		if (pendingTeamName) {
			localStorage.removeItem('pendingTeamName');
			fetch('/api/teams/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: pendingTeamName }),
			})
				.then(() => { window.location.href = '/dashboard'; })
				.catch(() => { router.push('/dashboard/team-onboarding'); });
			return;
		}

		router.push('/dashboard/team-onboarding');
	}, [teamsLoading, hasTeams, inviteDialog.open, router]);

  const [open, setOpen] = useState(false);

	return (
    <DashboardViewProvider>
      <AIChatWrapper>
        <div className="flex max-md:flex-col h-[100dvh] w-full overflow-hidden">
          <Sidebar open={open} setOpen={setOpen}>
            <SidebarBody className="justify-between gap-10">
              <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start">
                    <motion.div
                      className="hidden md:block"
                      animate={{
                        width: open ? 40 : 24,
                        height: open ? 40 : 24,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    >
                      <Image
                        src="/logo-icon.png"
                        alt="Klever"
                        className="w-full h-full"
                        width={100}
                        height={100}
                      />
                    </motion.div>
                  </div>
                </div>
                <nav className={cn("mt-8 flex flex-col transition-[gap] duration-200 ease-in-out", open ? "gap-6" : "gap-0.5")} aria-label="Dashboard navigation">
                  {navCategories.map((category) => (
                    <div key={category.label} className="flex flex-col gap-2">
                      <NavCategoryLabel>{category.label}</NavCategoryLabel>
                      <div className="flex flex-col gap-0.5">
                        {category.links.map((link) => (
                          <DashboardNavLink key={link.view} {...link} />
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
              <div>
                <UserDropdown
                  avatarUrl={avatarUrl}
                  displayName={displayName}
                  onSignOut={handleSignOut}
                />
              </div>
            </SidebarBody>
          </Sidebar>
          <main className="flex flex-1 flex-col overflow-hidden relative z-0 min-h-0">
            <DashboardHeader />
            <div className="flex-1 overflow-y-auto overflow-x-hidden md:rounded-tl-2xl border-l-1 border-t-1 border-border bg-background relative min-h-0">
              {inviteDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                  <div className="bg-white dark:bg-black rounded-xl w-full max-w-md shadow-xl border border-neutral-200/40 dark:border-neutral-800 p-5">
                    <div className="space-y-1 mb-3">
                      <button
                        onClick={() => {
                          setInviteDialog({
                            open: false,
                            token: "",
                            teamId: "",
                            teamName: "",
                          });
                          router.replace("/dashboard");
                        }}
                        className="px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        Not now
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/invites/accept", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                token: inviteDialog.token,
                              }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok)
                              throw new Error(
                                data.error || `HTTP ${res.status}`
                              );
                            const teamId =
                              (data.teamId as string) || inviteDialog.teamId;
                            if (typeof document !== "undefined" && teamId) {
                              document.cookie = `team_id=${encodeURIComponent(teamId)}; path=/`;
                            }
                            setInviteDialog({
                              open: false,
                              token: "",
                              teamId: "",
                              teamName: "",
                            });
                            // Force a page refresh to update all team data
                            window.location.href = "/dashboard";
                          } catch {
                            // Soft failure: just close modal; errors can be surfaced via toast system later
                            setInviteDialog({
                              open: false,
                              token: "",
                              teamId: "",
                              teamName: "",
                            });
                            router.replace("/dashboard");
                          }
                        }}
                        className="px-3 py-2 text-sm rounded-md bg-black text-white dark:bg-white dark:text-black"
                      >
                        Accept & join
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <DashboardViewRenderer>{children}</DashboardViewRenderer>
            </div>
          </main>
        </div>
      </AIChatWrapper>
    </DashboardViewProvider>
  );
}