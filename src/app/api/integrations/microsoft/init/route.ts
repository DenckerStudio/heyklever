import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { teamId, clientId, clientSecret, redirectUri } = body;

    if (!teamId || !clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify team admin access
    const { data: member, error: memberErr } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (memberErr || !member || (member.role !== "owner" && member.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert integration account with config
    const { error: upsertErr } = await supabase
      .from("integration_accounts")
      .upsert({
        team_id: teamId,
        provider: "microsoft",
        client_id: clientId,
        client_secret: clientSecret,
        status: "connecting",
        updated_at: new Date().toISOString(),
      }, { onConflict: "team_id,provider" });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // Generate Auth URL
    const scopes = [
      "Files.Read.All",
      "Sites.Read.All",
      "User.Read",
      "Channel.ReadBasic.All",
      "ChannelMessage.Read.All",
      "offline_access"
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: scopes,
      state: teamId, // Pass teamId as state to identify on callback
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error("Error initiating Microsoft auth:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
