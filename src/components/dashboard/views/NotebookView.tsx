"use client";

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { NotebookLayout } from '@/components/dashboard/notebook/NotebookLayout';
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper';
import { useDashboardView } from '@/lib/contexts/DashboardViewContext';
import { Loader2 } from 'lucide-react';

interface NotebookViewProps {
  // Optional pre-loaded data from server
  initialTeamId?: string;
  initialTeamName?: string;
  initialTeamLogo?: string | null;
}

export function NotebookView({ initialTeamId, initialTeamName, initialTeamLogo }: NotebookViewProps) {
  const [teamId, setTeamId] = useState(initialTeamId || '');
  const [teamName, setTeamName] = useState(initialTeamName || 'Team');
  const [teamLogo, setTeamLogo] = useState<string | undefined>(initialTeamLogo || undefined);
  const [loading, setLoading] = useState(!initialTeamId);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useDashboardView();

  useEffect(() => {
    // If we already have initial data, don't refetch
    if (initialTeamId) return;

    const fetchTeamData = async () => {
      const supabase = createSupabaseBrowserClient();
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/signin';
          return;
        }

        // Get team ID from cookie or profile
        let currentTeamId = document.cookie.match(/(?:^|; )team_id=([^;]+)/)?.[1] || '';
        
        if (!currentTeamId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('default_team_id')
            .eq('id', user.id)
            .maybeSingle();
          currentTeamId = profile?.default_team_id || '';

          // If no default_team_id, check team_members table
          if (!currentTeamId) {
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle();
            
            if (teamMember?.team_id) {
              currentTeamId = teamMember.team_id;
              // Update the profile with this team as default
              await supabase
                .from('profiles')
                .update({ default_team_id: currentTeamId })
                .eq('id', user.id);
            }
          }
        }

        if (!currentTeamId) {
          navigateTo('team');
          return;
        }

        setTeamId(currentTeamId);

        // Fetch team details
        const { data: team } = await supabase
          .from('teams')
          .select('name, logo_url')
          .eq('id', currentTeamId)
          .single();

        if (team) {
          setTeamName(team.name || 'Team');
          setTeamLogo(team.logo_url || undefined);
        }
      } catch (err) {
        console.error('Error fetching team data:', err);
        setError('Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [initialTeamId, navigateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!teamId) {
    return null;
  }

  return (
    <DashboardWrapper>
      <NotebookLayout 
        teamId={teamId} 
        teamName={teamName} 
        teamLogo={teamLogo} 
      />
    </DashboardWrapper>
  );
}
