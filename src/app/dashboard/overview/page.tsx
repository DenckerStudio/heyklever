import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Overview (IT dashboard) view: Asset Overview, Signage Status, Document Pulse, AI Chat.
 * Content is rendered by DashboardViewRenderer when currentView === 'overview'.
 */
export default async function DashboardOverviewPage() {
	const user = await getServerUser();
	if (!user) redirect("/signin");
	return null;
}
