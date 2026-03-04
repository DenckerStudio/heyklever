"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export interface Team {
  id: string;
  name: string;
  created_at: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  logo_url?: string | null;
  website?: string | null;
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("User not authenticated");
        router.push('/signin');
        return;
      }

      // Fetch teams where user is a member
      const { data, error: teamsError } = await supabase
        .from('team_members')
        .select(`
          role,
          teams (
            id,
            name,
            created_at,
            logo_url,
            website
          )
        `)
        .eq('user_id', user.id);

      if (teamsError) {
        setError(teamsError.message);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userTeams: Team[] = data?.map((item: any) => ({
        id: item.teams.id,
        name: item.teams.name,
        created_at: item.teams.created_at,
        role: item.role as 'owner' | 'admin' | 'member' | 'viewer',
        logo_url: item.teams.logo_url ?? null,
        website: item.teams.website ?? null,
      })) || [];

      setTeams(userTeams);

      // Get user's default team from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_team_id")
        .eq("id", user.id)
        .single();

      // Set current team from cookie, default team, or first team
      const cookieTeamId = typeof document !== 'undefined'
        ? document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1] 
        : null;
      
      let selectedTeam = null;
      
      if (cookieTeamId) {
        // Use team from cookie if it exists and user is still a member
        selectedTeam = userTeams.find(t => t.id === cookieTeamId);
      }
      
      if (!selectedTeam && profile?.default_team_id) {
        // Use default team if cookie team not found or invalid
        selectedTeam = userTeams.find(t => t.id === profile.default_team_id);
      }
      
      if (!selectedTeam && userTeams.length > 0) {
        // Fall back to first team
        selectedTeam = userTeams[0];
      }
      
      setCurrentTeam(selectedTeam || null);
      
      // Set cookie for the selected team
      if (selectedTeam && typeof document !== 'undefined') {
        document.cookie = `team_id=${encodeURIComponent(selectedTeam.id)}; path=/`;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const createTeam = async (name: string) => {
    try {
      setError(null);

      const response = await fetch('/api/teams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create team");
        return null;
      }

      // Refresh teams
      await fetchTeams();
      
      // Set as current team
      const newTeam = { ...data.team, role: 'admin' as const };
      setCurrentTeam(newTeam);
      if (typeof document !== 'undefined') {
        document.cookie = `team_id=${encodeURIComponent(data.team.id)}; path=/`;
      }

      return data.team;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    }
  };

  const switchTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      if (typeof document !== 'undefined') {
        document.cookie = `team_id=${encodeURIComponent(teamId)}; path=/`;
        // Force a page refresh to update all team data
        window.location.href = '/dashboard';
      }
    }
  };

  const setDefaultTeam = async (teamId: string) => {
    try {
      setError(null);
      
      const response = await fetch('/api/teams/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to set default team");
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return false;
    }
  };

  useEffect(() => {
    fetchTeams();
    
    // Listen for custom event to refetch teams
    const handleRefetch = () => {
      fetchTeams();
    };
    
    if (typeof window !== "undefined") {
      window.addEventListener("teams:refetch", handleRefetch);
      return () => {
        window.removeEventListener("teams:refetch", handleRefetch);
      };
    }
  }, [fetchTeams]);

  return {
    teams,
    currentTeam,
    loading,
    error,
    createTeam,
    switchTeam,
    setDefaultTeam,
    refetch: fetchTeams,
    hasTeams: teams.length > 0
  };
}
