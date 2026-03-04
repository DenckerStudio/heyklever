"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
	const supabase = createSupabaseBrowserClient();
	const handle = async () => {
		await supabase.auth.signOut();
		window.location.href = "/";
	};
	return (
		<button onClick={handle} className="border rounded px-3 py-1">Sign out</button>
	);
}


