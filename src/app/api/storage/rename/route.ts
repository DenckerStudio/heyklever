import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { minioClient, ensureTeamBucket } from "@/lib/storage/minio";
import { CopyConditions } from "minio";

export async function POST(req: NextRequest) {
  try {
    const { scope = "public", path = "", newName } = await req.json();
    if (!path || !newName) {
      return NextResponse.json({ error: "path and newName are required" }, { status: 400 });
    }

    const supabaseServer = await createSupabaseServerClient();
    const { data: session } = await supabaseServer.auth.getUser();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value || "";

    if (!teamId) {
      return NextResponse.json({ error: "No team context" }, { status: 400 });
    }

    const { data: teamFolder } = await supabaseServer
      .from("team_folders")
      .select("team_id, folder_id")
      .eq("team_id", teamId)
      .single();

    if (!teamFolder) {
      return NextResponse.json({ error: "Team folder not found" }, { status: 404 });
    }

    const bucket = await ensureTeamBucket(teamId);

    // Object keys relative to bucket root
    const oldFullPath = path;
    const parent = oldFullPath.split("/").slice(0, -1).join("/");
    const newFullPath = parent ? `${parent}/${newName}` : newName;

    // MinIO doesn't have a direct rename. We must copy then remove.
    // minioClient.copyObject(bucketName, objectName, sourceObject, conds)
    // The sourceObject parameter should include the bucket name as a prefix: `/${bucketName}/${objectName}`
    const sourcePath = `/${bucket}/${oldFullPath}`;
    
    try {
      await minioClient.copyObject(bucket, newFullPath, sourcePath, new CopyConditions());
      await minioClient.removeObject(bucket, oldFullPath);
      return NextResponse.json({ success: true, path: newFullPath });
    } catch (error: any) {
      console.error("Error renaming in MinIO:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}



