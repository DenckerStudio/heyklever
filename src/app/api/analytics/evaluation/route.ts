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
    const type = searchParams.get("type") || "confidence";
    
    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Fetch latest evaluation analytics
    const { data, error } = await supabase
      .from("evaluation_analytics")
      .select("stats, calculated_at")
      .eq("team_id", teamId)
      .eq("evaluation_type", type)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching evaluation analytics:", error);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        stats: null,
        calculatedAt: null,
        hasData: false
      });
    }

    // Supabase JSONB can be returned as string; ensure we send an object
    const stats =
      typeof data.stats === "string"
        ? (JSON.parse(data.stats) as Record<string, unknown>)
        : data.stats;

    return NextResponse.json({
      stats,
      calculatedAt: data.calculated_at,
      hasData: true
    });

  } catch (error) {
    console.error("Evaluation Analytics API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
