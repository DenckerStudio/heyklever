import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  TrainAISettings,
  TrainAIDefaults,
  BrandGuideline,
  generateGuidelineId,
  DEFAULT_TRAIN_AI_SETTINGS,
} from "@/lib/train-ai-types";

// GET: Fetch Train AI settings (defaults + brand guidelines)
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "User is not a member of this team" }, { status: 403 });
    }

    // Get team settings
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", teamId)
      .single();

    if (teamError) {
      return NextResponse.json({ error: "Failed to fetch team settings" }, { status: 500 });
    }

    const settings = (team?.settings as Record<string, unknown>) || {};
    const trainAISettings = (settings.trainAI as TrainAISettings) || DEFAULT_TRAIN_AI_SETTINGS;

    return NextResponse.json({ 
      settings: trainAISettings
    });

  } catch (error) {
    console.error("Error fetching Train AI settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update Train AI settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required" }, { status: 400 });
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "User is not a member of this team" }, { status: 403 });
    }

    // Get current settings
    const { data: currentTeam, error: fetchError } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", teamId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch current settings" }, { status: 500 });
    }

    const currentSettings = (currentTeam?.settings as Record<string, unknown>) || {};
    const currentTrainAI = (currentSettings.trainAI as TrainAISettings) || DEFAULT_TRAIN_AI_SETTINGS;

    let updatedTrainAI: TrainAISettings = { ...currentTrainAI };

    switch (action) {
      case "updateDefaults":
        // Update default configuration
        const defaults = payload as TrainAIDefaults;
        updatedTrainAI.defaults = { ...updatedTrainAI.defaults, ...defaults };
        break;

      case "saveLastUsed":
        // Save last used settings for quick apply
        updatedTrainAI.lastUsedSettings = payload;
        break;

      case "addBrandGuideline":
        // Add new brand guideline
        const newGuideline: BrandGuideline = {
          id: generateGuidelineId(),
          name: payload.name,
          description: payload.description,
          content: payload.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: payload.isDefault || false,
        };
        
        // If this is set as default, unset other defaults
        if (newGuideline.isDefault) {
          updatedTrainAI.brandGuidelines = (updatedTrainAI.brandGuidelines || []).map(g => ({
            ...g,
            isDefault: false,
          }));
          updatedTrainAI.defaults = {
            ...updatedTrainAI.defaults,
            defaultBrandGuidelineId: newGuideline.id,
          };
        }
        
        updatedTrainAI.brandGuidelines = [...(updatedTrainAI.brandGuidelines || []), newGuideline];
        break;

      case "updateBrandGuideline":
        // Update existing brand guideline
        const { id, ...updates } = payload;
        updatedTrainAI.brandGuidelines = (updatedTrainAI.brandGuidelines || []).map(g => {
          if (g.id === id) {
            const updated = {
              ...g,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            // If setting as default, update defaults reference
            if (updates.isDefault) {
              updatedTrainAI.defaults = {
                ...updatedTrainAI.defaults,
                defaultBrandGuidelineId: id,
              };
            }
            return updated;
          }
          // If another guideline is being set as default, unset this one
          if (updates.isDefault && g.isDefault) {
            return { ...g, isDefault: false };
          }
          return g;
        });
        break;

      case "deleteBrandGuideline":
        // Delete brand guideline
        const deleteId = payload.id;
        updatedTrainAI.brandGuidelines = (updatedTrainAI.brandGuidelines || []).filter(
          g => g.id !== deleteId
        );
        // Clear default reference if deleted guideline was default
        if (updatedTrainAI.defaults?.defaultBrandGuidelineId === deleteId) {
          updatedTrainAI.defaults = { ...updatedTrainAI.defaults, defaultBrandGuidelineId: undefined };
        }
        break;

      case "setDefaultBrandGuideline":
        // Set a brand guideline as the default
        const setDefaultId = payload.id;
        updatedTrainAI.brandGuidelines = (updatedTrainAI.brandGuidelines || []).map(g => ({
          ...g,
          isDefault: g.id === setDefaultId,
        }));
        updatedTrainAI.defaults = {
          ...updatedTrainAI.defaults,
          defaultBrandGuidelineId: setDefaultId || undefined,
        };
        break;

      case "toggleAutoApplyDefaults":
        updatedTrainAI.autoApplyDefaults = payload.enabled;
        break;

      case "clearDefaults":
        updatedTrainAI.defaults = {};
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update team settings
    const updatedSettings = {
      ...currentSettings,
      trainAI: updatedTrainAI,
    };

    const { error: updateError } = await supabase
      .from("teams")
      .update({ 
        settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq("id", teamId);

    if (updateError) {
      console.error("Error updating Train AI settings:", updateError);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      settings: updatedTrainAI
    });

  } catch (error) {
    console.error("Error updating Train AI settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
