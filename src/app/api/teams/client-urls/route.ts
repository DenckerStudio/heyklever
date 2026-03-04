import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Type definitions for Client URL settings
type Language = "no" | "en" | "sv" | "da";
type FileAccessMode = "all_public" | "selected_files";

interface ClientUrlSettings {
  // Existing
  pdfViewerEnabled?: boolean;
  // Display settings
  displayName?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  // Language & behavior
  language?: Language;
  liveSearchEnabled?: boolean;
  showSources?: boolean;
  // File access
  fileAccessMode?: FileAccessMode;
  allowedFileIds?: string[];
}

// Validation constants
const VALID_LANGUAGES: Language[] = ["no", "en", "sv", "da"];
const VALID_FILE_ACCESS_MODES: FileAccessMode[] = ["all_public", "selected_files"];
const MAX_DISPLAY_NAME_LENGTH = 50;
const MAX_WELCOME_MESSAGE_LENGTH = 200;
const MAX_PLACEHOLDER_LENGTH = 100;

// Validate and sanitize settings
function validateSettings(settings: Partial<ClientUrlSettings>): { 
  valid: boolean; 
  sanitized: Partial<ClientUrlSettings>; 
  error?: string 
} {
  const sanitized: Partial<ClientUrlSettings> = {};

  // Validate pdfViewerEnabled
  if (settings.pdfViewerEnabled !== undefined) {
    if (typeof settings.pdfViewerEnabled !== "boolean") {
      return { valid: false, sanitized: {}, error: "pdfViewerEnabled must be a boolean" };
    }
    sanitized.pdfViewerEnabled = settings.pdfViewerEnabled;
  }

  // Validate displayName
  if (settings.displayName !== undefined) {
    if (typeof settings.displayName !== "string") {
      return { valid: false, sanitized: {}, error: "displayName must be a string" };
    }
    const trimmed = settings.displayName.trim();
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      return { valid: false, sanitized: {}, error: `displayName must be ${MAX_DISPLAY_NAME_LENGTH} characters or less` };
    }
    sanitized.displayName = trimmed || undefined; // Store undefined if empty
  }

  // Validate welcomeMessage
  if (settings.welcomeMessage !== undefined) {
    if (typeof settings.welcomeMessage !== "string") {
      return { valid: false, sanitized: {}, error: "welcomeMessage must be a string" };
    }
    const trimmed = settings.welcomeMessage.trim();
    if (trimmed.length > MAX_WELCOME_MESSAGE_LENGTH) {
      return { valid: false, sanitized: {}, error: `welcomeMessage must be ${MAX_WELCOME_MESSAGE_LENGTH} characters or less` };
    }
    sanitized.welcomeMessage = trimmed || undefined;
  }

  // Validate placeholderText
  if (settings.placeholderText !== undefined) {
    if (typeof settings.placeholderText !== "string") {
      return { valid: false, sanitized: {}, error: "placeholderText must be a string" };
    }
    const trimmed = settings.placeholderText.trim();
    if (trimmed.length > MAX_PLACEHOLDER_LENGTH) {
      return { valid: false, sanitized: {}, error: `placeholderText must be ${MAX_PLACEHOLDER_LENGTH} characters or less` };
    }
    sanitized.placeholderText = trimmed || undefined;
  }

  // Validate language
  if (settings.language !== undefined) {
    if (!VALID_LANGUAGES.includes(settings.language)) {
      return { valid: false, sanitized: {}, error: `language must be one of: ${VALID_LANGUAGES.join(", ")}` };
    }
    sanitized.language = settings.language;
  }

  // Validate liveSearchEnabled
  if (settings.liveSearchEnabled !== undefined) {
    if (typeof settings.liveSearchEnabled !== "boolean") {
      return { valid: false, sanitized: {}, error: "liveSearchEnabled must be a boolean" };
    }
    sanitized.liveSearchEnabled = settings.liveSearchEnabled;
  }

  // Validate showSources
  if (settings.showSources !== undefined) {
    if (typeof settings.showSources !== "boolean") {
      return { valid: false, sanitized: {}, error: "showSources must be a boolean" };
    }
    sanitized.showSources = settings.showSources;
  }

  // Validate fileAccessMode
  if (settings.fileAccessMode !== undefined) {
    if (!VALID_FILE_ACCESS_MODES.includes(settings.fileAccessMode)) {
      return { valid: false, sanitized: {}, error: `fileAccessMode must be one of: ${VALID_FILE_ACCESS_MODES.join(", ")}` };
    }
    sanitized.fileAccessMode = settings.fileAccessMode;
  }

  // Validate allowedFileIds
  if (settings.allowedFileIds !== undefined) {
    if (!Array.isArray(settings.allowedFileIds)) {
      return { valid: false, sanitized: {}, error: "allowedFileIds must be an array" };
    }
    if (!settings.allowedFileIds.every(id => typeof id === "string")) {
      return { valid: false, sanitized: {}, error: "allowedFileIds must contain only strings" };
    }
    sanitized.allowedFileIds = settings.allowedFileIds;
  }

  return { valid: true, sanitized };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    console.log("Client URLs GET - Team ID:", teamId);

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Get team info to check plan
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      console.error("Team not found:", teamError);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // For now, use a simple team code based on team ID
    const teamCode = team.id.substring(0, 8).toUpperCase();
    const plan = "free" as "free" | "premium"; // Default to free plan for now

    // Get client URLs
    const { data: clientUrls, error } = await supabase
      .from("client_urls")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching client URLs:", error);
      return NextResponse.json({ error: "Failed to fetch client URLs" }, { status: 500 });
    }

    // Add full_url to each client URL if not already present
    const clientUrlsWithFullUrl = (clientUrls || []).map(url => ({
      ...url,
      full_url: url.full_url || `${process.env.NEXT_PUBLIC_SITE_URL}/client/${teamCode}/${url.display_code}`
    }));

    // Calculate limits
    const maxUrls = plan === "premium" ? 3 : 1;
    const currentCount = clientUrls?.length || 0;

    return NextResponse.json({ 
      clientUrls: clientUrlsWithFullUrl,
      teamCode: teamCode,
      plan: plan,
      limits: {
        max: maxUrls,
        current: currentCount,
        remaining: maxUrls - currentCount
      }
    });

  } catch (error) {
    console.error("Error fetching client URLs:", error);
    return NextResponse.json({ error: "Failed to fetch client URLs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    console.log("Client URL POST - Team ID:", teamId);
    
    if (!teamId) {
      console.error("No team ID found in cookies");
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    const { name, description } = await req.json();
    console.log("Request body:", { name, description });

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get team info to check plan and limits
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .single();

    console.log("Team lookup result:", { team, teamError });

    if (teamError || !team) {
      console.error("Team not found:", teamError);
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // For now, use a simple team code based on team ID
    const teamCode = team.id.substring(0, 8).toUpperCase();
    const plan = "free" as "free" | "premium"; // Default to free plan for now

    // Check limits
    const { data: existingUrls, error: existingUrlsError } = await supabase
      .from("client_urls")
      .select("id")
      .eq("team_id", teamId);

    console.log("Existing URLs check:", { existingUrls, existingUrlsError });

    const maxUrls = plan === "premium" ? 3 : 1;
    const currentCount = existingUrls?.length || 0;
    console.log("Limits check:", { currentCount, maxUrls, plan });

    if (currentCount >= maxUrls) {
      return NextResponse.json({ 
        error: `You have reached the maximum number of client URLs for your plan (${maxUrls})` 
      }, { status: 400 });
    }

    // Generate display code
    const displayCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log("Generated display code:", displayCode);

    // Generate full URL
    const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/client/${teamCode}/${displayCode}`;
    console.log("Generated full URL:", fullUrl);

    // Create client URL with full_url and team_code
    const insertData = {
      team_id: teamId,
      display_code: displayCode,
      name,
      description,
      full_url: fullUrl,
      team_code: teamCode,
    };
    console.log("Insert data:", insertData);

    const { data: clientUrl, error: createError } = await supabase
      .from("client_urls")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating client URL:", createError);
      console.error("Error details:", JSON.stringify(createError, null, 2));
      return NextResponse.json({ 
        error: "Failed to create client URL", 
        details: createError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      clientUrl: {
        ...clientUrl,
        full_url: fullUrl
      }
    });

  } catch (error) {
    console.error("Error creating client URL:", error);
    return NextResponse.json({ error: "Failed to create client URL" }, { status: 500 });
  }
}

// PATCH: Update client URL settings
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    const { id, settings } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Client URL ID required" }, { status: 400 });
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Settings object required" }, { status: 400 });
    }

    // Validate the settings
    const validation = validateSettings(settings as Partial<ClientUrlSettings>);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Verify the client URL belongs to the team
    const { data: clientUrl, error: fetchError } = await supabase
      .from("client_urls")
      .select("team_id, settings")
      .eq("id", id)
      .eq("team_id", teamId)
      .single();

    if (fetchError || !clientUrl) {
      return NextResponse.json({ error: "Client URL not found" }, { status: 404 });
    }

    // Merge validated settings with existing settings
    const currentSettings = (clientUrl.settings as ClientUrlSettings) || {};
    const updatedSettings: ClientUrlSettings = { ...currentSettings, ...validation.sanitized };

    // Update client URL settings
    const { error: updateError } = await supabase
      .from("client_urls")
      .update({ 
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("team_id", teamId);

    if (updateError) {
      console.error("Error updating client URL settings:", updateError);
      return NextResponse.json({ error: "Failed to update client URL settings" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      settings: updatedSettings
    });

  } catch (error) {
    console.error("Error updating client URL settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
