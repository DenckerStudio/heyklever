import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateTeamFolderResult = {
  success: boolean;
  message?: string;
  folderId?: string;
  folderName?: string;
  folderUrl?: string;
  publicFolderId?: string;
  privateFolderId?: string;
};

/**
 * Creates the default Supabase Storage folder structure for a team and
 * inserts the corresponding row in team_folders.
 * Used when a team is created so all teams have consistent storage.
 */
export async function createTeamFolder(
  teamId: string,
  teamName: string,
  userId: string
): Promise<CreateTeamFolderResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "team-files";

    if (!supabaseUrl || !serviceKey) {
      return { success: false, message: "Supabase env not configured" };
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ensure bucket exists (ignore if already exists)
    await admin.storage.createBucket(bucket, { public: false }).catch(() => {});

    // Create team root folder with a .keep file
    const basePath = `teams/${teamId}`;
    const keepPath = `${basePath}/.keep`;
    const membersPath = `${basePath}/Members/.keep`;
    const userMemberPath = `${basePath}/Members/${userId}/.keep`;

    await Promise.all([
      admin.storage.from(bucket).upload(keepPath, "", { upsert: true, contentType: "text/plain" }),
      admin.storage.from(bucket).upload(membersPath, "", { upsert: true, contentType: "text/plain" }),
      admin.storage.from(bucket).upload(userMemberPath, "", { upsert: true, contentType: "text/plain" }),
    ]).catch((err) => console.error("Error creating folder structure:", err));

    // Store team folder in database (no longer using Public/Private subfolders)
    const supabase = await createSupabaseServerClient();
    const { error: dbError } = await supabase.from("team_folders").insert({
      team_id: teamId,
      provider: "supabase_storage",
      folder_id: basePath,
      folder_name: `${teamName} - Supabase`,
      folder_url: `supabase://${bucket}/${basePath}`,
      storage_bucket: bucket,
      public_folder_id: basePath,
      private_folder_id: basePath,
    });

    if (dbError) {
      console.error("Error storing team folder:", dbError);
      return { success: false, message: `Failed to store folder info: ${dbError.message}` };
    }

    return {
      success: true,
      folderId: basePath,
      folderName: `${teamName} - Supabase`,
      folderUrl: `supabase://${bucket}/${basePath}`,
      publicFolderId: basePath,
      privateFolderId: basePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create Supabase storage folders: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
