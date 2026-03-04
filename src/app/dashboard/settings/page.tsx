import { getServerUser } from "@/lib/supabase/server";
import { ClientUrlManager } from "@/components/settings/ClientUrlManager";
import { TeamFolderInfo } from "../../../components/settings/TeamFolderInfo";
import { DeleteTeamDangerZone } from "@/components/settings/DeleteTeamDangerZone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export default async function SettingsPage() {
	const user = await getServerUser();
	if (!user) return null;

	const supabase = await createSupabaseServerClient();
	const cookieStore = await cookies();
	const teamId = cookieStore.get("team_id")?.value;

	if (!teamId) return null;

	// Get team info and folder info
	const { data: team } = await supabase
		.from("teams")
		.select("name, team_code")
		.eq("id", teamId)
		.single();

	const { data: teamFolder } = await supabase
		.from("team_folders")
		.select("*")
		.eq("team_id", teamId)
		.eq("provider", "google_drive")
		.single();

	return (
		<div className="space-y-8">
			<header>
				<h1 className="text-2xl font-semibold">Settings</h1>
				<p className="text-sm text-muted-foreground">Manage your workspace and integrations</p>
			</header>


			<section id="client-urls" className="space-y-3">
				<ClientUrlManager teamId={teamId} />
			</section>

			<section id="danger" className="space-y-3">
				<h2 className="text-lg font-medium text-destructive">Danger</h2>
				<p className="text-sm text-muted-foreground">Delete the team and all associated data</p>
				<DeleteTeamDangerZone />
			</section>
		</div>
	);
}


