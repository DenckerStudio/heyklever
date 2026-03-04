import type { MetadataRoute } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/signin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/invite`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Add all public client chat pages (active client URLs only)
  let clientRoutes: MetadataRoute.Sitemap = [];
  try {
    const admin = createSupabaseAdminClient();
    const { data: clientUrls } = await admin
      .from("client_urls")
      .select("team_code, display_code, updated_at")
      .eq("is_active", true)
      .not("team_code", "is", null);

    if (clientUrls?.length) {
      clientRoutes = clientUrls.map((row) => ({
        url: `${baseUrl}/client/${row.team_code}/${row.display_code}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // If Supabase is unavailable (e.g. build without env), sitemap still returns static routes
  }

  return [...staticRoutes, ...clientRoutes];
}
