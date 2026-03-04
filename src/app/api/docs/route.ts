import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "team"; // 'team' or 'personal'

    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get team_id from cookie
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID not found" }, { status: 400 });
    }

    let query = supabase
      .from("ai_documents")
      .select("id, file_name, content, created_at, object_path")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (type === "team") {
      const publicPath = `teams/${teamId}/Public/AI-Docs/%`;
      const privatePath = `teams/${teamId}/Private/AI-Docs/%`;
      
      // Filter by object_path matching either pattern
      query = query.or(`object_path.like.${publicPath},object_path.like.${privatePath}`);

    } else if (type === "personal") {
      const personalPath = `teams/${teamId}/members/${user.id}/AI-Docs/%`;
      
      query = query.like("object_path", personalPath);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching docs:", error);
      return NextResponse.json({ error: "Failed to fetch documents", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (error) {
    console.error("Docs API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership or permissions if necessary
    // For now, assuming anyone in the team can delete team docs if they have access
    
    const { error } = await supabase
      .from("ai_documents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting doc:", error);
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete doc error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, content } = body;

    if (!id || content === undefined) {
      return NextResponse.json({ error: "Document ID and content required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the document
    const { error } = await supabase
      .from("ai_documents")
      .update({ content })
      .eq("id", id);

    if (error) {
      console.error("Error updating doc:", error);
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update doc error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
