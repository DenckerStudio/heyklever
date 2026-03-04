import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Missing team_id cookie" }, { status: 400 });
    }

    // Verify requester is an owner of this team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Only the team owner can delete the team" }, { status: 403 });
    }

    // Delete team; cascades will remove dependent rows
    const { error: delError } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    // Clear team cookie (client will set new one after redirect)
    cookieStore.set({ name: "team_id", value: "", path: "/", maxAge: 0 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


