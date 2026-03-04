import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAppAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get all published docs, or all docs if user is admin
    const isAdmin = user?.email ? await isAppAdmin(user.email) : false;
    
    const searchParams = req.nextUrl.searchParams;
    const topicFilter = searchParams.get("topic");
    
    // Use admin client if user is admin to bypass RLS issues
    const client = isAdmin ? createSupabaseAdminClient() : supabase;
    
    // Try with topic column first, fallback without it if column doesn't exist
    let selectFields = "id, title, slug, content, order_index, is_published, topic, created_at, updated_at";
    
    let query = client
      .from("public_docs")
      .select(selectFields)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });
    
    if (topicFilter) {
      query = query.eq("topic", topicFilter);
    }
    
    if (!isAdmin) {
      query = query.eq("is_published", true);
    }
    
    let { data, error } = await query;
    
    // If topic column doesn't exist, retry without it
    if (error && (error.code === 'PGRST204' || error.message?.includes("Could not find the 'topic' column"))) {
      console.warn("topic column not found - retrying without topic column");
      selectFields = "id, title, slug, content, order_index, is_published, created_at, updated_at";
      query = client
        .from("public_docs")
        .select(selectFields)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });
      
      if (!isAdmin) {
        query = query.eq("is_published", true);
      }
      // Note: Can't filter by topic if column doesn't exist
      
      const retryResult = await query;
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error("Error fetching public docs:", error);
      // If table doesn't exist, return empty array instead of error
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn("public_docs table not found - migration may not have been applied");
        return NextResponse.json({ documents: [] });
      }
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }
    
    return NextResponse.json({ documents: data || [] });
  } catch (error) {
    console.error("Public docs API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check admin access
    if (!(await isAppAdmin(user.email))) {
      return NextResponse.json({ error: "Forbidden: App admin access required" }, { status: 403 });
    }
    
    // Use admin client to bypass RLS and schema cache issues
    const adminClient = createSupabaseAdminClient();
    
    const body = await req.json();
    const { title, slug, content, order_index, is_published, topic } = body;
    
    if (!title || !slug || content === undefined) {
      return NextResponse.json({ error: "Title, slug, and content are required" }, { status: 400 });
    }
    
    // Build insert object - conditionally include topic
    const insertData: Record<string, unknown> = {
      title,
      slug,
      content,
      order_index: order_index ?? 0,
      is_published: is_published ?? true,
      created_by: user.id,
      updated_by: user.id,
    };
    
    // Only include topic if provided (will be omitted if column doesn't exist)
    if (topic !== undefined) {
      insertData.topic = topic || null;
    }
    
    // Try insert with topic first
    let { data, error } = await adminClient
      .from("public_docs")
      .insert(insertData)
      .select()
      .single();
    
    // If topic column doesn't exist, retry without it
    if (error && (error.code === 'PGRST204' || error.message?.includes("Could not find the 'topic' column"))) {
      console.warn("topic column not found - retrying insert without topic column");
      delete insertData.topic;
      
      const retryResult = await adminClient
        .from("public_docs")
        .insert(insertData)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error("Error creating doc:", error);
      // Provide more helpful error message
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({ 
          error: "Database table not found. Please ensure migration 0052_public_docs_table.sql has been applied." 
        }, { status: 500 });
      }
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
    }
    
    return NextResponse.json({ document: data });
  } catch (error) {
    console.error("Create public doc error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

