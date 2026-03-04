import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { createTeamFolder } from "@/lib/storage/team-folders";

export async function POST(req: NextRequest) {
  try {
    const { name, slug, logoUrl } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Generate slug if not provided
    let finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    
    // Ensure slug is unique
    let slugCheck = finalSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from("teams")
        .select("id")
        .eq("slug", slugCheck)
        .maybeSingle();
      
      if (!existing) break;
      slugCheck = `${finalSlug}-${counter}`;
      counter++;
    }
    finalSlug = slugCheck;

    // Use the create_team RPC function which bypasses RLS (security definer)
    const { data: teamId, error: rpcError } = await supabase.rpc("create_team", {
      p_name: name,
      p_slug: finalSlug,
    });

    if (rpcError || !teamId) {
      console.error("Error creating team via RPC:", rpcError);
      return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
    }

    // Fetch the created team
    const { data: team, error: fetchError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (fetchError || !team) {
      console.error("Error fetching created team:", fetchError);
      return NextResponse.json({ error: "Failed to fetch created team" }, { status: 500 });
    }

    // Update team with additional fields (plan)
    // Logo will be set after moving from temp or if already a direct URL
    const { error: updateError } = await supabase
      .from("teams")
      .update({
        plan: "free",
      })
      .eq("id", teamId);

    if (updateError) {
      console.error("Error updating team:", updateError);
      // Continue anyway, team was created
    }

    // Set as default team
    const { error: defaultError } = await supabase
      .from("profiles")
      .update({ default_team_id: team.id })
      .eq("id", user.id);

    if (defaultError) {
      console.error("Error setting default team:", defaultError);
    }

    // Generate team code
    const teamCode = team.id.substring(0, 8).toUpperCase();
    const { error: codeError } = await supabase
      .from("teams")
      .update({ team_code: teamCode })
      .eq("id", team.id);

    if (codeError) {
      console.error("Error updating team code:", codeError);
    }

    // Handle logo upload - move from temp to team's root folder
    let finalLogoUrl = null;
    if (logoUrl && typeof logoUrl === "object" && logoUrl.tempPath) {
      // Logo was uploaded to temp, move it to team's root folder
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
        const bucket = logoUrl.bucket || process.env.SUPABASE_STORAGE_BUCKET || "team-files";
        const ext = logoUrl.ext || "png";
        
        if (supabaseUrl && serviceKey) {
          const admin = createClient(supabaseUrl, serviceKey);
          const tempPath = logoUrl.tempPath;
          const finalPath = `teams/${teamId}/logo.${ext}`;
          
          // Download from temp location
          const { data: tempData, error: downloadError } = await admin.storage
            .from(bucket)
            .download(tempPath);
          
          if (downloadError) {
            console.error("Error downloading temp logo:", downloadError);
          } else if (tempData) {
            // Upload to team's root folder
            const { error: uploadError } = await admin.storage
              .from(bucket)
              .upload(finalPath, tempData, { 
                upsert: true, 
                contentType: `image/${ext}` 
              });
            
            if (uploadError) {
              console.error("Error uploading logo to team folder:", uploadError);
            } else {
              // Delete temp file
              await admin.storage.from(bucket).remove([tempPath]);
              
              // Get public URL (no expiry, public access)
              // The storage policy should allow public read access to logo files
              const { data: publicUrl } = admin.storage
                .from(bucket)
                .getPublicUrl(finalPath);
              
              finalLogoUrl = publicUrl.publicUrl;
            }
          }
        }
      } catch (logoError) {
        console.error("Error moving logo:", logoError);
        // Continue anyway, team was created
      }
    } else if (logoUrl && typeof logoUrl === "string") {
      // Direct URL provided (legacy support)
      finalLogoUrl = logoUrl;
    }
    
    // Update team with logo URL
    if (finalLogoUrl) {
      const { error: logoUpdateError } = await supabase
        .from("teams")
        .update({ logo_url: finalLogoUrl })
        .eq("id", teamId);
      
      if (logoUpdateError) {
        console.error("Error updating team logo URL:", logoUpdateError);
      }
    }

    // Create team storage in Supabase automatically
    const folderResult = await createTeamFolder(team.id, team.name, user.id);
    
    if (!folderResult.success) {
      console.error("Error creating team folder:", folderResult.message);
    }

    // Register team in Nextcloud and Snipe-IT (fire-and-forget; only when webhook URLs are set)
    const registerPayload = { team_id: teamId, team_slug: finalSlug, team_name: name };
    const webhookNextcloud = process.env.N8N_REGISTER_TEAM_NEXTCLOUD_WEBHOOK_URL;
    const webhookSnipeIt = process.env.N8N_REGISTER_TEAM_SNIPE_IT_WEBHOOK_URL;
    const webhookFetches: Promise<Response>[] = [];
    if (webhookNextcloud) webhookFetches.push(fetch(webhookNextcloud, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registerPayload) }));
    if (webhookSnipeIt) webhookFetches.push(fetch(webhookSnipeIt, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registerPayload) }));
    if (webhookFetches.length > 0) {
      Promise.allSettled(webhookFetches).then((results) => {
        results.forEach((result, i) => {
          const label = i === 0 ? "Nextcloud" : "Snipe-IT";
          if (result.status === "rejected") console.error(`Register team ${label} webhook error:`, result.reason);
          else if (!result.value.ok) console.error(`Register team ${label} webhook non-ok:`, result.value.status);
        });
      });
    }

    // Fetch the final team data with logo_url
    const { data: finalTeam, error: finalFetchError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (finalFetchError) {
      console.error("Error fetching final team data:", finalFetchError);
    }

    return NextResponse.json({
      success: true,
      team: {
        ...(finalTeam || team),
        team_code: teamCode,
        logo_url: finalLogoUrl || finalTeam?.logo_url || team.logo_url || null,
      },
      folder: folderResult
    });

  } catch (error) {
    console.error("Error creating team:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}

