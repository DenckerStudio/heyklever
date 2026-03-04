import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAppAdmin } from "@/lib/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const isAdmin = user?.email ? await isAppAdmin(user.email) : false;
    
    // Use admin client if user is admin to bypass RLS issues
    const client = isAdmin ? createSupabaseAdminClient() : supabase;
    
    // Try with topic column first, fallback without it if column doesn't exist
    let selectFields = "id, title, slug, content, order_index, is_published, topic, created_at, updated_at";
    
    let query = client
      .from("public_docs")
      .select(selectFields)
      .eq("slug", slug);
    
    if (!isAdmin) {
      query = query.eq("is_published", true);
    }
    
    let { data, error } = await query.single();
    
    // If topic column doesn't exist, retry without it
    if (error && (error.code === 'PGRST204' || error.message?.includes("Could not find the 'topic' column"))) {
      console.warn("topic column not found - retrying without topic column");
      selectFields = "id, title, slug, content, order_index, is_published, created_at, updated_at";
      query = client
        .from("public_docs")
        .select(selectFields)
        .eq("slug", slug);
      
      if (!isAdmin) {
        query = query.eq("is_published", true);
      }
      
      const retryResult = await query.single();
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error || !data) {
      // If table doesn't exist, return 404
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        console.warn("public_docs table not found - migration may not have been applied");
      }
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    return NextResponse.json({ document: data });
  } catch (error) {
    console.error("Get public doc error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
    const { title, content, order_index, is_published, topic } = body;
    
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (is_published !== undefined) updateData.is_published = is_published;
    // Only include topic if provided (will be omitted if column doesn't exist)
    if (topic !== undefined) {
      updateData.topic = topic || null;
    }
    
    // Try update with topic first
    let { data, error } = await adminClient
      .from("public_docs")
      .update(updateData)
      .eq("slug", slug)
      .select()
      .single();
    
    // If topic column doesn't exist, retry without it
    if (error && (error.code === 'PGRST204' || error.message?.includes("Could not find the 'topic' column"))) {
      console.warn("topic column not found - retrying update without topic column");
      delete updateData.topic;
      
      const retryResult = await adminClient
        .from("public_docs")
        .update(updateData)
        .eq("slug", slug)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error("Error updating doc:", error);
      // Provide more helpful error message
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({ 
          error: "Database table not found. Please ensure migration 0052_public_docs_table.sql has been applied." 
        }, { status: 500 });
      }
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
    }
    
    return NextResponse.json({ document: data });
  } catch (error) {
    console.error("Update public doc error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
    
    const { error } = await adminClient
      .from("public_docs")
      .delete()
      .eq("slug", slug);
    
    if (error) {
      console.error("Error deleting doc:", error);
      // Provide more helpful error message
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({ 
          error: "Database table not found. Please ensure migration 0052_public_docs_table.sql has been applied." 
        }, { status: 500 });
      }
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete public doc error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

