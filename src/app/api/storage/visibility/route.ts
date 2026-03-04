import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get("fileName");
  if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 });

  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value || "";
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: docs } = await admin
    .from("documents")
    .select("id, metadata")
    .eq("metadata->>team_id", teamId)
    .eq("metadata->>file_name", fileName)
    .limit(1);

  const meta = docs?.[0]?.metadata as Record<string, unknown> | undefined;
  return NextResponse.json({
    visibilityScope: (meta?.visibility_scope as string) || "internal",
    allowedClientCodes: (meta?.allowed_client_codes as string[]) || [],
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fileName, visibilityScope, allowedClientCodes } = body as {
    fileName: string;
    visibilityScope: "internal" | "public" | "restricted";
    allowedClientCodes?: string[];
  };

  if (!fileName || !visibilityScope) {
    return NextResponse.json({ error: "fileName and visibilityScope required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const teamId = cookieStore.get("team_id")?.value || "";
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: docs, error: fetchErr } = await admin
    .from("documents")
    .select("id, metadata")
    .eq("metadata->>team_id", teamId)
    .eq("metadata->>file_name", fileName);

  if (fetchErr || !docs?.length) {
    return NextResponse.json({ error: "No documents found for this file" }, { status: 404 });
  }

  let updateCount = 0;
  for (const doc of docs) {
    const meta = { ...(doc.metadata as Record<string, unknown>) };
    meta.visibility_scope = visibilityScope;
    meta.context = visibilityScope === "internal" ? "private" : "public";

    if (visibilityScope === "restricted" && allowedClientCodes) {
      meta.allowed_client_codes = allowedClientCodes;
    } else {
      delete meta.allowed_client_codes;
    }

    const { error } = await admin
      .from("documents")
      .update({ metadata: meta })
      .eq("id", doc.id);

    if (!error) updateCount++;
  }

  return NextResponse.json({ updated: updateCount, total: docs.length });
}
