import { createClient } from "@supabase/supabase-js";

export async function createMemberFolder(teamId: string, userId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "team-files";

    if (!supabaseUrl || !serviceKey) {
      return { success: false, message: "Supabase env not configured" };
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const memberFolderPath = `teams/${teamId}/Members/${userId}/.keep`;

    // Create member folder by uploading .keep file
    // upsert: true ensures it doesn't fail if already exists
    const { error } = await admin.storage
      .from(bucket)
      .upload(memberFolderPath, "", { upsert: true, contentType: "text/plain" });

    if (error) {
      console.error(`Error creating member folder for user ${userId} in team ${teamId}:`, error);
      return { success: false, message: error.message };
    }

    return { success: true, path: memberFolderPath };
  } catch (error) {
    console.error(`Error creating member folder for user ${userId} in team ${teamId}:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error creating member folder" 
    };
  }
}

