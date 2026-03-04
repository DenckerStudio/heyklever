import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    
    // Get parameters from query
    const searchParams = req.nextUrl.searchParams;
    const teamId = searchParams.get("teamId") || cookieStore.get("team_id")?.value;
    const status = searchParams.get("status"); // Optional filter by status
    
    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("content_recommendations")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching content recommendations:", error);
      return NextResponse.json(
        { error: "Failed to fetch recommendations" },
        { status: 500 }
      );
    }

    // Parse JSONB fields if they come as strings
    const recommendations = (data || []).map((rec) => ({
      ...rec,
      topics: typeof rec.topics === "string" ? JSON.parse(rec.topics) : rec.topics,
      metadata_recommendations:
        typeof rec.metadata_recommendations === "string"
          ? JSON.parse(rec.metadata_recommendations)
          : rec.metadata_recommendations,
    }));

    // Calculate summary stats
    const stats = {
      total: recommendations.length,
      pending: recommendations.filter((r) => r.status === "pending").length,
      analyzing: recommendations.filter((r) => r.status === "analyzing").length,
      created: recommendations.filter((r) => r.status === "created").length,
      dismissed: recommendations.filter((r) => r.status === "dismissed").length,
    };

    return NextResponse.json({
      recommendations,
      stats,
      hasData: recommendations.length > 0,
    });

  } catch (error) {
    console.error("Content Recommendations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await req.json();
    
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { error: "ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status; "ai_fix" is a special action that sets status to "analyzing"
    const validStatuses = ["pending", "created", "dismissed", "analyzing", "ai_fix"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }
    const statusToStore = status === "ai_fix" ? "analyzing" : status;

    const { data, error } = await supabase
      .from("content_recommendations")
      .update({ status: statusToStore, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating recommendation:", error);
      return NextResponse.json(
        { error: "Failed to update recommendation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Content Recommendations PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
