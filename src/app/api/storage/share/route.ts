import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "node:crypto";

// POST: create share link (file or folder)
// body: { scope: 'public'|'private', path: string, type: 'file'|'folder', expiresInHours?: number }
export async function POST(req: NextRequest) {
  try {
    const { scope = "public", path = "", type = "file", expiresInHours = 168 } = await req.json();
    if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value || "";

    const token = crypto.randomBytes(16).toString("hex");
    const { data, error } = await supabase
      .from("storage_shares")
      .insert({
        team_id: teamId,
        created_by: session.user.id,
        scope,
        object_path: path,
        object_type: type,
        token,
        expires_at: expiresInHours ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString() : null,
      })
      .select("token")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    return NextResponse.json({ token: data.token, shareUrl: `${baseUrl}/api/storage/share?token=${data.token}` });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET: resolve share link by token and download file
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("storage_shares")
    .select("team_id, scope, object_path, object_type, expires_at")
    .eq("token", token)
    .single();

  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // If it's a file, download it
  if (data.object_type === "file") {
    const { data: teamFolder } = await supabase
      .from("team_folders")
      .select("team_id, provider, folder_id, public_folder_id, private_folder_id, storage_bucket")
      .eq("team_id", data.team_id)
      .eq("provider", "supabase_storage")
      .single();

    if (!teamFolder) {
      return NextResponse.json({ error: "Team folder not found" }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = teamFolder.storage_bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
    const admin = createClient(supabaseUrl, serviceKey);

    let baseFolderPath = data.scope === "public" ? teamFolder.public_folder_id : teamFolder.private_folder_id;
    if (!baseFolderPath) {
      const teamBasePath = teamFolder.folder_id || `teams/${data.team_id}`;
      baseFolderPath = `${teamBasePath}/${data.scope === "public" ? "Public" : "Private"}`;
    }
    if (!baseFolderPath.includes(data.scope === "public" ? "Public" : "Private")) {
      const teamBasePath = teamFolder.folder_id || `teams/${data.team_id}`;
      baseFolderPath = `${teamBasePath}/${data.scope === "public" ? "Public" : "Private"}`;
    }

    const fullPath = `${baseFolderPath}/${data.object_path}`;
    const { data: fileData, error: downloadError } = await admin.storage.from(bucket).download(fullPath);
    
    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    // Determine content type
    const fileName = data.object_path.split("/").pop() || "file";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    let contentType = "application/octet-stream";
    
    if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "png") contentType = "image/png";
    else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "txt") contentType = "text/plain";
    else if (ext === "html") contentType = "text/html";

    return new Response(fileData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // For folders or metadata requests, return JSON
  return NextResponse.json({
    teamId: data.team_id,
    scope: data.scope,
    path: data.object_path,
    type: data.object_type,
  });
}


