import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamIdParam = searchParams.get("teamId");
    const status = searchParams.get("status"); // optional filter
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

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

    // Build query
    let query = supabase
      .from("generated_outputs")
      .select("*", { count: "exact" })
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching generated outputs:", error);
      return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      outputs: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });

  } catch (error) {
    console.error("Train AI History error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a generated output
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outputId = searchParams.get("id");

    if (!outputId) {
      return NextResponse.json({ error: "Output ID is required" }, { status: 400 });
    }

    // Get team ID from cookie
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the output (RLS will ensure team membership)
    const { error } = await supabase
      .from("generated_outputs")
      .delete()
      .eq("id", outputId)
      .eq("team_id", teamId);

    if (error) {
      console.error("Error deleting generated output:", error);
      return NextResponse.json({ error: "Failed to delete output" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Train AI Delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update a generated output (e.g. set status to approved)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id: outputId, status, ingested_at } = body as {
      id: string;
      status?: string;
      ingested_at?: string;
    };

    if (!outputId) {
      return NextResponse.json({ error: "Output ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team context found" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (ingested_at !== undefined) updates.ingested_at = ingested_at;
    if (status === "approved") {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = user.id;
    }

    const { data, error } = await supabase
      .from("generated_outputs")
      .update(updates)
      .eq("id", outputId)
      .eq("team_id", teamId)
      .select()
      .single();

    if (error) {
      console.error("Error updating generated output:", error);
      return NextResponse.json({ error: "Failed to update output" }, { status: 500 });
    }

    return NextResponse.json({ success: true, output: data });
  } catch (error) {
    console.error("Train AI PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
