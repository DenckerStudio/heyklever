import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

// GET: List monitored URLs for a team
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamIdParam = searchParams.get("teamId");

    // Get team ID from query or cookie
    const cookieStore = await cookies();
    const teamId = teamIdParam || cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch monitored URLs
    const { data, error } = await supabase
      .from('monitored_urls')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch monitored URLs:', error);
      return NextResponse.json({ error: "Failed to fetch URLs" }, { status: 500 });
    }

    // Transform to camelCase for frontend
    const urls = (data || []).map(row => ({
      id: row.id,
      url: row.url,
      checkFrequency: row.check_frequency,
      lastCheckedAt: row.last_checked_at,
      lastContentHash: row.last_content_hash,
      isActive: row.is_active,
      createdAt: row.created_at,
      hasChanges: row.has_changes || false,
    }));

    return NextResponse.json({ urls });

  } catch (error) {
    console.error("Monitored URLs GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new URL to monitor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId: bodyTeamId, url, checkFrequency = "daily" } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Validate check frequency
    if (!["daily", "weekly"].includes(checkFrequency)) {
      return NextResponse.json({ error: "Invalid check frequency" }, { status: 400 });
    }

    // Get team ID from body or cookie
    const cookieStore = await cookies();
    const teamId = bodyTeamId || cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if URL already exists for this team
    const { data: existing } = await supabase
      .from('monitored_urls')
      .select('id')
      .eq('team_id', teamId)
      .eq('url', url)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This URL is already being monitored" }, { status: 400 });
    }

    // Insert new monitored URL
    const { data, error } = await supabase
      .from('monitored_urls')
      .insert({
        team_id: teamId,
        url,
        check_frequency: checkFrequency,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert monitored URL:', error);
      return NextResponse.json({ error: "Failed to add URL" }, { status: 500 });
    }

    // Transform to camelCase
    const monitoredUrl = {
      id: data.id,
      url: data.url,
      checkFrequency: data.check_frequency,
      lastCheckedAt: data.last_checked_at,
      lastContentHash: data.last_content_hash,
      isActive: data.is_active,
      createdAt: data.created_at,
      hasChanges: false,
    };

    return NextResponse.json({ url: monitoredUrl });

  } catch (error) {
    console.error("Monitored URLs POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update a monitored URL (toggle active state)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "URL ID is required" }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the URL
    const { error } = await supabase
      .from('monitored_urls')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Failed to update monitored URL:', error);
      return NextResponse.json({ error: "Failed to update URL" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Monitored URLs PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a monitored URL
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "URL ID is required" }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the URL
    const { error } = await supabase
      .from('monitored_urls')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete monitored URL:', error);
      return NextResponse.json({ error: "Failed to delete URL" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Monitored URLs DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
