import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callMicrosoftGraph } from "@/lib/integrations/microsoft";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "root"; // root, onedrive, sites, teams, site, team, channel, drive, folder
    const id = searchParams.get("id"); // siteId, teamId, driveId, itemId
    const path = searchParams.get("path"); // optional path for OneDrive
    
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = req.cookies;
    const teamId = cookieStore.get("team_id")?.value;

    if (!teamId) {
      return NextResponse.json({ error: "No team selected" }, { status: 400 });
    }

    // Verify membership
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let endpoint = "";
    let dataProp = "value";

    switch (type) {
      case "root":
        // Return top-level categories
        return NextResponse.json({
          value: [
            { id: "onedrive", name: "OneDrive", folder: {}, type: "category" },
            { id: "sites", name: "SharePoint Sites", folder: {}, type: "category" },
            { id: "teams", name: "Microsoft Teams", folder: {}, type: "category" }
          ]
        });

      case "onedrive":
        if (path) {
            endpoint = `/me/drive/root:/${encodeURIComponent(path)}:/children`;
        } else if (id) {
            endpoint = `/me/drive/items/${id}/children`;
        } else {
            endpoint = `/me/drive/root/children`;
        }
        break;

      case "sites":
        // List followed sites as a good default
        endpoint = `/me/followedSites`;
        break;
        
      case "teams":
        endpoint = `/me/joinedTeams`;
        break;

      case "site":
        if (!id) return NextResponse.json({ error: "Missing site id" }, { status: 400 });
        // List document libraries (drives) in the site
        endpoint = `/sites/${id}/drives`;
        break;

      case "team":
        if (!id) return NextResponse.json({ error: "Missing team id" }, { status: 400 });
        // List channels
        endpoint = `/teams/${id}/channels`;
        break;

      case "channel":
        if (!id) return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
        const teamIdParam = searchParams.get("teamId");
        if (!teamIdParam) return NextResponse.json({ error: "Missing teamId param for channel" }, { status: 400 });
        // Get the "filesFolder" driveItem for the channel
        // We first get the filesFolder, then its children? 
        // Or just return the filesFolder as a single item so the user can click it?
        // Let's list its children directly.
        // First get the folder
        try {
            const folder = await callMicrosoftGraph(supabase, teamId, `/teams/${teamIdParam}/channels/${id}/filesFolder`);
            // Then list children
            endpoint = `/drives/${folder.parentReference.driveId}/items/${folder.id}/children`;
        } catch (e) {
            // Fallback or error
             return NextResponse.json({ error: "Failed to access channel files" }, { status: 500 });
        }
        break;

      case "drive":
      case "folder":
        if (!id) return NextResponse.json({ error: "Missing drive/folder id" }, { status: 400 });
        // If it's a drive (top level), we might need /root/children
        // But usually "drive" means a driveId. 
        // If type is drive, id is driveId.
        // If type is folder, id is itemId, and we need driveId param?
        // Simpler: treat id as "driveId/items/itemId" or just support passing endpoint? No, security.
        
        // Let's require driveId for folder browsing
        const driveId = searchParams.get("driveId");
        if (type === 'drive') {
            endpoint = `/drives/${id}/root/children`;
        } else {
            if (!driveId) return NextResponse.json({ error: "Missing driveId for folder" }, { status: 400 });
            endpoint = `/drives/${driveId}/items/${id}/children`;
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const response = await callMicrosoftGraph(supabase, teamId, endpoint);
    
    // Normalize response if needed
    // Graph returns { value: [] } usually
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
