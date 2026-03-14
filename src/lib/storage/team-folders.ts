import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { minioClient, ensureTeamBucket, getTeamBucketName } from "@/lib/storage/minio";

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
    const bucket = await ensureTeamBucket(teamId);

    // Files live directly in the bucket root. Create .keep and Members structure only.
    const keepPath = ".keep";
    const membersPath = "Members/.keep";
    const userMemberPath = `Members/${userId}/.keep`;

    await Promise.all([
      minioClient.putObject(bucket, keepPath, ""),
      minioClient.putObject(bucket, membersPath, ""),
      minioClient.putObject(bucket, userMemberPath, ""),
    ]).catch((err) => console.error("Error creating MinIO folder structure:", err));

    // Store team folder in database (folder_id empty = root of bucket)
    const supabase = await createSupabaseServerClient();
    const { error: dbError } = await supabase.from("team_folders").insert({
      team_id: teamId,
      provider: "minio",
      folder_id: "",
      folder_name: `${teamName} - MinIO`,
      folder_url: `minio://${bucket}`,
      storage_bucket: bucket,
      public_folder_id: "",
      private_folder_id: "",
    });

    if (dbError) {
      console.error("Error storing MinIO team folder:", dbError);
      return { success: false, message: `Failed to store folder info: ${dbError.message}` };
    }

    return {
      success: true,
      folderId: "",
      folderName: `${teamName} - MinIO`,
      folderUrl: `minio://${bucket}`,
      publicFolderId: "",
      privateFolderId: "",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create MinIO storage folders: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

