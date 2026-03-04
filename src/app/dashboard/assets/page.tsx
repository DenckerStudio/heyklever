import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Assets view: list and manage assets (Snipe-IT). Content is rendered by DashboardViewRenderer when currentView === 'assets'.
 */
export default async function DashboardAssetsPage() {
	const user = await getServerUser();
	if (!user) redirect("/signin");
	return null;
}
