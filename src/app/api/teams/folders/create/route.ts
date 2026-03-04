import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getGoogleAccessTokenFromServiceAccount } from "@/lib/google/serviceAccount";
import { setupDriveNotifications, setupSubfolderNotifications } from "@/lib/google/driveNotifications";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    const { provider, teamName, teamMemberEmails } = await req.json();

    if (!provider || !teamName) {
      return NextResponse.json({ error: "Provider and team name required" }, { status: 400 });
    }

    // Validate provider
    if (!['google_drive', 'onedrive', 'supabase_storage'].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider. Must be google_drive, onedrive, or supabase_storage" }, { status: 400 });
    }

    // Check if team folder already exists
    const { data: existingFolder } = await supabase
      .from("team_folders")
      .select("*")
      .eq("team_id", teamId)
      .eq("provider", provider)
      .single();

    if (existingFolder) {
      return NextResponse.json({ 
        success: true, 
        folder: existingFolder,
        message: "Team folder already exists"
      });
    }

    let folderResult: { success: boolean; message?: string } & Partial<{ folderId: string; folderName: string; folderUrl: string; publicFolderId: string; privateFolderId: string }>;

    // Create folder in storage based on provider
    if (provider === "google_drive") {
      folderResult = await createGoogleDriveFolder(teamName, teamMemberEmails || []);
    } else if (provider === "onedrive") {
      folderResult = await createOneDriveFolder(teamName, teamMemberEmails || []);
    } else if (provider === "supabase_storage") {
      folderResult = await createSupabaseStorageFolder(teamId, teamName);
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    if (!folderResult.success) {
      return NextResponse.json({ error: folderResult.message }, { status: 500 });
    }

    // Set up Google Drive notifications for the main folder
    let notificationSetup = null;
    if (provider === "google_drive" && folderResult.folderId && folderResult.folderName) {
      notificationSetup = await setupDriveNotifications(
        folderResult.folderId,
        teamId,
        folderResult.folderName
      );
    }

    // Store folder info in database with namespace info
    const insertData: any = {
      team_id: teamId,
      provider,
      folder_id: folderResult.folderId!,
      folder_name: folderResult.folderName!,
      folder_url: folderResult.folderUrl!,
    };

    // Add optional fields if they exist
    if (folderResult.publicFolderId) {
      insertData.public_folder_id = folderResult.publicFolderId;
    }
    if (folderResult.privateFolderId) {
      insertData.private_folder_id = folderResult.privateFolderId;
    }
    if (provider === 'supabase_storage') {
      insertData.storage_bucket = process.env.SUPABASE_STORAGE_BUCKET || 'team-files';
    }

    // Add notification fields if they exist
    if (notificationSetup) {
      insertData.notification_channel_id = notificationSetup.id;
      insertData.notification_resource_id = notificationSetup.resourceId;
      insertData.notification_expiration = notificationSetup.expiration;
    }

    console.log('Inserting team folder data:', insertData);

    // Try to insert with minimal required fields first
    const minimalData = {
      team_id: teamId,
      provider,
      folder_id: folderResult.folderId!,
      folder_name: folderResult.folderName!,
      folder_url: folderResult.folderUrl!,
    };

    let { data: teamFolder, error: folderError } = await supabase
      .from("team_folders")
      .insert(minimalData)
      .select()
      .single();

    // If that fails, try with the full data
    if (folderError) {
      console.log('Minimal insert failed, trying with full data:', folderError);
      const result = await supabase
        .from("team_folders")
        .insert(insertData)
        .select()
        .single();
      
      teamFolder = result.data;
      folderError = result.error;
    }

    if (folderError) {
      console.error("Error storing team folder:", folderError);
      console.error("Insert data was:", insertData);
      return NextResponse.json({ 
        error: "Failed to store folder info", 
        details: folderError.message,
        code: folderError.code,
        hint: folderError.hint
      }, { status: 500 });
    }

    // Set up notifications for subfolders if they exist
    if (provider === "google_drive" && folderResult.publicFolderId && folderResult.privateFolderId) {
      // Set up notifications for Public folder
      await setupSubfolderNotifications(
        folderResult.publicFolderId,
        teamId,
        "Public"
      );

      // Set up notifications for Private folder
      await setupSubfolderNotifications(
        folderResult.privateFolderId,
        teamId,
        "Private"
      );
    }

    return NextResponse.json({
      success: true,
      folder: teamFolder,
      message: "Team folder created successfully with notifications enabled"
    });

  } catch (error) {
    console.error("Error creating team folder:", error);
    return NextResponse.json({ error: "Failed to create team folder" }, { status: 500 });
  }
}

async function createGoogleDriveFolder(teamName: string, teamMemberEmails: string[]) {
  try {
    // Use our own Google Drive credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return { success: false, message: "Google Drive credentials not configured" };
    }

    // Get access token using service account or OAuth2
    const accessToken = await getGoogleDriveAccessToken();
    
    if (!accessToken) {
      return { success: false, message: "Failed to get Google Drive access token" };
    }

    // Create folder in our Google Drive
    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${teamName} - KleverAI`,
        mimeType: "application/vnd.google-apps.folder",
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || "root"], // Use our designated folder
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Google Drive API error: ${errorData.error?.message || response.statusText}`
      };
    }

    const folderData = await response.json();

    // Create public and private subfolders
    const publicFolder = await createGoogleDriveSubfolder(folderData.id, "Public", accessToken);
    const privateFolder = await createGoogleDriveSubfolder(folderData.id, "Private", accessToken);

    // Share folder with team members and n8n Google account (so n8n can download files)
    const n8nGoogleUser = process.env.N8N_GOOGLE_USER_EMAIL;
    const shareEmails = [...(teamMemberEmails || [])];
    if (n8nGoogleUser) shareEmails.push(n8nGoogleUser);
    if (shareEmails.length > 0) {
      await shareGoogleDriveFolder(folderData.id, shareEmails, accessToken);
    }

    return {
      success: true,
      folderId: folderData.id,
      folderName: folderData.name,
      folderUrl: `https://drive.google.com/drive/folders/${folderData.id}`,
      publicFolderId: publicFolder?.id,
      privateFolderId: privateFolder?.id,
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to create Google Drive folder: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function createOneDriveFolder(teamName: string, teamMemberEmails: string[]) {
  try {
    // For now, we'll focus on Google Drive as the primary provider
    // OneDrive implementation would require our own Microsoft Graph credentials
    return {
      success: false,
      message: "OneDrive team folders not yet implemented. Please use Google Drive."
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create OneDrive folder: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function getGoogleDriveAccessToken() {
  try {
    const token = await getGoogleAccessTokenFromServiceAccount([
      "https://www.googleapis.com/auth/drive"
    ]);
    return token;
  } catch (error) {
    console.error("Error getting Google Drive access token:", error);
    return null;
  }
}

async function createSupabaseStorageFolder(teamId: string, teamName: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceKey) {
      return { success: false, message: "Supabase env not configured" };
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "team-files";

    // Ensure bucket exists (ignore error if exists)
    await admin.storage.createBucket(bucket, { public: false }).catch(() => {});

    // Create team root folder with a .keep file
    const basePath = `teams/${teamId}`;
    const keepPath = `${basePath}/.keep`;

    // Check if folder already exists
    const { data: existingFiles } = await admin.storage.from(bucket).list(basePath);
    
    if (existingFiles && existingFiles.length > 0) {
      console.log('Supabase Storage folder already exists for team:', teamId);
      // Folder already exists, just return the structure
      return {
        success: true,
        folderId: basePath,
        folderName: `${teamName} - Supabase`,
        folderUrl: `supabase://${bucket}/${basePath}`,
        // Keep these for backward compatibility, but they point to root now
        publicFolderId: basePath,
        privateFolderId: basePath,
      };
    }

    // Create team root folder if it doesn't exist
    await admin.storage.from(bucket).upload(keepPath, "", { upsert: true, contentType: "text/plain" }).catch(() => {});

    return {
      success: true,
      folderId: basePath,
      folderName: `${teamName} - Supabase`,
      folderUrl: `supabase://${bucket}/${basePath}`,
      // Keep these for backward compatibility, but they point to root now
      publicFolderId: basePath,
      privateFolderId: basePath,
    };
  } catch (error) {
    return { success: false, message: `Failed to create Supabase storage folder: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

async function createGoogleDriveSubfolder(parentFolderId: string, folderName: string, accessToken: string) {
  try {
    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to create ${folderName} subfolder:`, await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error creating ${folderName} subfolder:`, error);
    return null;
  }
}

async function shareGoogleDriveFolder(folderId: string, emails: string[], accessToken: string) {
  try {
    for (const email of emails) {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "writer",
          type: "user",
          emailAddress: email,
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to share folder with ${email}:`, await response.text());
      }
    }
  } catch (error) {
    console.error("Error sharing Google Drive folder:", error);
  }
}
