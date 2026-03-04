import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Delete document records from the documents table
 * This is called when a file is deleted from storage to clean up RAG index
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, filePath } = body;

    if (!fileName && !filePath) {
      return NextResponse.json(
        { error: 'fileName or filePath is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json(
        { error: "No team context found" },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Try to find and delete documents matching the file
    // Documents are stored with metadata containing team_id and object_path
    let query = supabase
      .from('documents')
      .delete();

    // Build the filter - we need to match by metadata since documents table
    // uses JSONB metadata column for team_id and object_path
    if (filePath) {
      // Match by object_path in metadata that contains the file path
      query = query.filter('metadata->>object_path', 'ilike', `%${filePath}%`);
    } else if (fileName) {
      // Match by file_name
      query = query.eq('file_name', fileName);
    }

    // Also filter by team_id in metadata
    query = query.filter('metadata->>team_id', 'eq', teamId);

    const { error, count } = await query;

    if (error) {
      console.error('Error deleting documents:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`Deleted ${count || 0} document records for: ${filePath || fileName}`);

    return NextResponse.json({
      ok: true,
      deletedCount: count || 0,
    });

  } catch (e) {
    console.error('Documents delete API error:', e);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
