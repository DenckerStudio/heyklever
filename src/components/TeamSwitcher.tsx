"use client";
import { useTeams } from "@/lib/hooks/useTeams";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDownIcon, CheckIcon, StarIcon } from "@radix-ui/react-icons";
import React, { useState } from "react";

export function TeamSwitcher() {
	const { teams, currentTeam, switchTeam, setDefaultTeam, createTeam, loading } = useTeams();
	const [createOpen, setCreateOpen] = useState(false);
	const [newTeamName, setNewTeamName] = useState("");
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);

	const handleCreateTeam = async (e: React.FormEvent) => {
		e.preventDefault();
		const name = newTeamName.trim();
		if (!name) return;
		setCreating(true);
		setCreateError(null);
		try {
			const team = await createTeam(name);
			if (team) {
				setCreateOpen(false);
				setNewTeamName("");
			} else {
				setCreateError("Failed to create team");
			}
		} finally {
			setCreating(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center gap-2">
				<div className="w-32 h-8 bg-muted animate-pulse rounded" />
			</div>
		);
	}

	if (teams.length === 0) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">No teams</span>
			</div>
		);
	}

	return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "pl-2 pr-2.5 h-9 rounded-xl",
              "backdrop-blur-md border border-foreground/20 dark:border-border/20",
              "hover:bg-accent/60 dark:hover:bg-accent/60",
              "hover:border-foreground/20 dark:hover:border-border/20",
              "hover:scale-[1.01] active:scale-[0.99]",
              "transition-all duration-200",
              "text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <TeamLogoOrAvatar
                name={currentTeam?.name ?? "Team"}
                id={currentTeam?.id ?? ""}
                logoUrl={currentTeam?.logo_url ?? null}
              />
              <span className="text-sm font-medium text-foreground max-w-[12rem] truncate">
                {currentTeam?.name}
              </span>
              <ChevronDownIcon className="ml-0.5 size-4 opacity-60 dark:opacity-70" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn(
            "min-w-[240px] rounded-xl p-1",
            "bg-background/95 dark:bg-background/90",
            "backdrop-blur-xl border border-border/30 dark:border-border/40",
            // Higher z-index to appear above mobile sidebar (z-[100])
            "z-[200]",
            // Smooth animations
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            // Enhanced shadows for depth
            "data-[state=open]:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.05)]",
            "data-[state=closed]:shadow-lg",
            "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          )}
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1000px',
          } as React.CSSProperties}
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-xs tracking-wide text-muted-foreground">
            Switch team
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/30 dark:bg-border/20" />
          {teams.map((team) => {
            const isActive = team.id === currentTeam?.id;
            return (
              <DropdownMenuItem
                key={team.id}
                onSelect={() => switchTeam(team.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2.5 cursor-pointer",
                  "transition-all duration-200 ease-out",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground",
                  "hover:translate-x-1 hover:shadow-sm",
                  "active:scale-[0.98]",
                  isActive && "bg-accent/50 dark:bg-accent/30"
                )}
              >
                <TeamLogoOrAvatar
                  name={team.name}
                  id={team.id}
                  logoUrl={team.logo_url ?? null}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm text-foreground truncate">
                    {team.name}
                  </span>
                  {isActive && (
                    <span className="text-[11px] text-muted-foreground">
                      Current
                    </span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {isActive && (
                    <CheckIcon className="size-4 opacity-80" />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-border/30 dark:bg-border/20" />
          {currentTeam && (
            <DropdownMenuItem
              onSelect={async () => {
                await setDefaultTeam(currentTeam.id);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2.5 cursor-pointer",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                "transition-all duration-200 ease-out",
                "hover:translate-x-1 hover:shadow-sm",
                "active:scale-[0.98]"
              )}
            >
              <StarIcon className="size-4" />
              <span className="text-sm">Set as default team</span>
            </DropdownMenuItem>
          )}
          <div className="px-2 py-1.5">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full",
                "border-border/50 hover:border-border",
                "bg-background/50 hover:bg-background",
                "dark:bg-background/30 dark:hover:bg-background/50"
              )}
              onClick={() => setCreateOpen(true)}
            >
              Create new team
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Create new team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label htmlFor="team-name" className="text-sm font-medium text-foreground">
                Team name
              </label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Acme Inc."
                className="mt-1.5"
                required
                autoFocus
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function TeamLogoOrAvatar({ name, id, logoUrl, className }: { name: string; id: string; logoUrl: string | null; className?: string }) {
	const initials = getInitials(name);
	const gradient = pickGradient(id || name);
	return (
		<div className="size-7">
			{logoUrl ? (
				<img
					src={logoUrl}
					alt={name}
					className={cn(
						"size-7 rounded-full object-cover",
						"ring-1 ring-border/30 dark:ring-border/20",
						"shadow-sm",
						className
					)}
				/>
			) : (
				<div
					className={cn(
						"size-7 rounded-full text-[11px] font-semibold text-white grid place-items-center",
						"shadow-sm",
						"ring-1 ring-white/20 dark:ring-white/10",
						"bg-gradient-to-br",
						gradient,
						className,
					)}
				>
					{initials}
				</div>
			)}
		</div>
	);
}

function getInitials(name: string) {
	const words = name.trim().split(/\s+/);
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}

function pickGradient(seed: string) {
	const gradients = [
		"from-indigo-500 to-purple-500",
		"from-emerald-500 to-teal-500",
		"from-amber-500 to-orange-500",
		"from-sky-500 to-cyan-500",
		"from-rose-500 to-pink-500",
		"from-violet-500 to-fuchsia-500",
		"from-blue-500 to-indigo-500",
	];
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % gradients.length;
	return gradients[index];
}