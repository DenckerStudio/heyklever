import { getServerUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasActiveSubscription } from "@/lib/utils/subscription";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

export default async function WelcomePage() {
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
	}

	if (!teamId) redirect('/dashboard/team-onboarding');

	const hasSub = await hasActiveSubscription(teamId, supabase);
	if (hasSub) redirect('/dashboard');

	const { data: team } = await supabase
		.from('teams')
		.select('name, logo_url')
		.eq('id', teamId)
		.single();

	const { count: memberCount } = await supabase
		.from('team_members')
		.select('id', { count: 'exact', head: true })
		.eq('team_id', teamId);

	return (
		<OnboardingChecklist
			teamId={teamId}
			teamName={team?.name || 'Team'}
			teamLogo={team?.logo_url || null}
			memberCount={memberCount ?? 1}
		/>
	);
}
