import { createClient } from '@supabase/supabase-js';
import { notFound } from "next/navigation";
import { GlobalChat } from '@/components/ui/global-chat';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { StripedPattern } from '@/components/magicui/striped-pattern';

type RouteParams = { teamCode: string; displayCode: string };

interface TeamSettings {
  pdfViewerEnabled?: boolean;
  primaryColor?: string;
  theme?: 'light' | 'dark' | 'system';
}

interface ClientUrlSettings {
  // Existing
  pdfViewerEnabled?: boolean;
  primaryColor?: string;
  // Display settings
  displayName?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  // Language & behavior
  language?: 'no' | 'en' | 'sv' | 'da';
  liveSearchEnabled?: boolean;
  showSources?: boolean;
  // File access
  fileAccessMode?: 'all_public' | 'selected_files';
  allowedFileIds?: string[];
}

export default async function ClientPage({ params }: { params: Promise<RouteParams> }) {
  const { teamCode, displayCode } = await params;
  
  // Server-side admin client (bypasses RLS). Never expose this key to the client.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the public link by denormalized keys (no join needed)
  const { data: clientUrl, error: clientError } = await admin
    .from("client_urls")
    .select("id, team_id, name, description, display_code, team_code, is_active, settings")
    .eq("team_code", teamCode)
    .eq("display_code", displayCode)
    .eq("is_active", true)
    .single();

  if (clientError || !clientUrl) {
    console.log('Client URL not found:', { teamCode, displayCode, error: clientError });
    notFound();
  }

  // Fetch team name and settings separately
  const { data: team, error: teamError } = await admin
    .from("teams")
    .select("id, name, settings")
    .eq("id", clientUrl.team_id)
    .single();

  if (teamError || !team) {
    console.log('Team not found for client URL:', { teamId: clientUrl.team_id, teamError });
    notFound();
  }

  // Parse settings with proper types
  const teamSettings = (team.settings as TeamSettings | null) ?? {};
  const clientSettings = (clientUrl.settings as ClientUrlSettings | null) ?? {};
  
  const primaryColor = clientSettings.primaryColor || teamSettings.primaryColor;
  
  // Use displayName if set, otherwise fall back to name
  const displayName = clientSettings.displayName || clientUrl.name;

  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Subtle Background Shader */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      {/* Theme Toggler (only if no custom color defined) */}
      {!primaryColor && (
        <div className="absolute top-10 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-700">
          <AnimatedThemeToggler className="p-2 rounded-full bg-background/50 backdrop-blur-md shadow-sm hover:bg-background/80 transition-all text-foreground/70 hover:text-foreground" />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-[100dvh]">
        <div className="absolute h-full w-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <StripedPattern className="[mask-image:radial-gradient(500px_circle_at_center,#45454520,transparent)] hidden dark:block" />
          <StripedPattern className="[mask-image:radial-gradient(500px_circle_at_center,#e5e5e520,transparent)] block dark:hidden" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="w-full h-full flex flex-col">
            <GlobalChat
              variant="client"
              teamId={team.id}
              teamName={team.name}
              clientName={displayName}
              clientCode={clientUrl.display_code}
              pdfViewerEnabled={clientSettings.pdfViewerEnabled ?? teamSettings.pdfViewerEnabled ?? true}
              context="public"
              allowContextSwitch={false}
              allowFileUpload={false}
              showHeader={true}
              initialGreeting={clientSettings.welcomeMessage}
              placeholderText={clientSettings.placeholderText}
              language={clientSettings.language}
              fileAccessMode={clientSettings.fileAccessMode}
              allowedFileIds={clientSettings.allowedFileIds}
              className="flex-1 rounded-2xl border dark:border-border/20 border-border/40 shadow-xl backdrop-blur-sm"
            />
          </div>
        </div>

        <div className="text-center pb-4 sm:pb-6 relative z-10">
          <p className="text-xs font-medium text-muted-foreground/60 flex items-center justify-center gap-1.5 hover:text-muted-foreground transition-colors">
            Powered by{" "}
            <span className="font-semibold text-foreground/80">
              {team.name}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }) {
  const { teamCode, displayCode } = await params;
  
  // Server-side admin client (bypasses RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get client info including settings for displayName
  const { data: clientUrl } = await admin
    .from("client_urls")
    .select("name, description, team_id, settings")
    .eq("team_code", teamCode)
    .eq("display_code", displayCode)
    .eq("is_active", true)
    .single();

  let teamName: string | undefined;
  if (clientUrl?.team_id) {
    const { data: team } = await admin
      .from("teams")
      .select("name")
      .eq("id", clientUrl.team_id)
      .single();
    teamName = team?.name;
  }

  // Use displayName from settings if available, otherwise fall back to name
  const settings = clientUrl?.settings as ClientUrlSettings | null;
  const title = settings?.displayName || clientUrl?.name || "AI Assistant";
  const description = clientUrl?.description || `AI-powered assistant by ${teamName || 'KleverAI'}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}
