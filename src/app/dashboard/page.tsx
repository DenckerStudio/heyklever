import { getServerUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NotebookLayout } from "@/components/dashboard/notebook/NotebookLayout";
import { hasActiveSubscription } from "@/lib/utils/subscription";

export default async function DashboardPage() {
	const user = await getServerUser();
	if (!user) redirect('/signin');

	const supabase = await createSupabaseServerClient();
	const cookieStore = await cookies();
	let teamId = cookieStore.get('team_id')?.value || '';

	if (!teamId) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('default_team_id')
			.eq('id', user.id)
			.maybeSingle();
		teamId = profile?.default_team_id || '';

		// If no default_team_id, check team_members table
		if (!teamId) {
			const { data: teamMember } = await supabase
				.from('team_members')
				.select('team_id')
				.eq('user_id', user.id)
				.limit(1)
				.maybeSingle();
			
			if (teamMember?.team_id) {
				teamId = teamMember.team_id;
				// Update the profile with this team as default
				await supabase
					.from('profiles')
					.update({ default_team_id: teamId })
					.eq('id', user.id);
			}
		}
	}

	if (!teamId) {
		redirect('/dashboard/team-onboarding');
	}

    // Check subscription
    const hasSub = await hasActiveSubscription(teamId, supabase);
    
    if (!hasSub) {
        redirect('/dashboard/features');
    }

    // Fetch team details for Notebook
    const { data: team } = await supabase
        .from('teams')
        .select('name, logo_url')
        .eq('id', teamId)
        .single();

	return (
    <NotebookLayout 
      teamId={teamId} 
      teamName={team?.name || 'Team'} 
      teamLogo={team?.logo_url} 
    />
  );
}
