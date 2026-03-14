import { createClient } from '@supabase/supabase-js';
import { notFound, redirect } from "next/navigation";
import { GlobalChat } from '@/components/ui/global-chat';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { StripedPattern } from '@/components/magicui/striped-pattern';
import { getServerUser } from "@/lib/supabase/server";

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
  // Page template & access
  pageVariant?: 'simple_chat' | 'info_sidebar' | 'kiosk_fullscreen' | 'authenticated_workspace';
  requireAuth?: boolean;
  // Public data panel (fixed slots for simplicity)
  publicPanelTitle?: string;
  publicPanelBody?: string;
  kpi1Label?: string;
  kpi1Value?: string;
  kpi2Label?: string;
  kpi2Value?: string;
  kpi3Label?: string;
  kpi3Value?: string;
  faq1Question?: string;
  faq1Answer?: string;
  faq2Question?: string;
  faq2Answer?: string;
  faq3Question?: string;
  faq3Answer?: string;
  // Advanced behaviour
  textToSpeechEnabled?: boolean;
  webSearchEnabled?: boolean;
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

  // Optional auth guard – allows certain client pages to require sign-in
  if (clientSettings.requireAuth) {
    const user = await getServerUser();
    if (!user) {
      redirect(`/signin?redirect=/client/${clientUrl.team_code}/${clientUrl.display_code}`);
    }
  }

  const pageVariant = clientSettings.pageVariant ?? "simple_chat";

  // Simple full-screen chat (default) – current behaviour
  if (pageVariant === "simple_chat") {
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
                enableTextToSpeech={clientSettings.textToSpeechEnabled}
                enableWebTool={clientSettings.webSearchEnabled && (pageVariant === "authenticated_workspace" || pageVariant === "kiosk_fullscreen")}
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

  // Split layout: chat + information panel
  if (pageVariant === "info_sidebar") {
    return (
      <div className="min-h-screen relative w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        </div>

        {!primaryColor && (
          <div className="absolute top-6 right-6 z-50">
            <AnimatedThemeToggler className="p-2 rounded-full bg-background/60 backdrop-blur-md shadow-sm hover:bg-background/80 transition-all text-foreground/70 hover:text-foreground" />
          </div>
        )}

        <div className="relative z-10 flex flex-col h-[100dvh]">
          <div className="absolute h-full w-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <StripedPattern className="[mask-image:radial-gradient(520px_circle_at_center,#45454520,transparent)] hidden dark:block" />
            <StripedPattern className="[mask-image:radial-gradient(520px_circle_at_center,#e5e5e520,transparent)] block dark:hidden" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
            <div className="w-full h-full grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1.1fr)]">
              <div className="flex flex-col">
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
                  enableTextToSpeech={clientSettings.textToSpeechEnabled}
                  enableWebTool={clientSettings.webSearchEnabled && (pageVariant === "authenticated_workspace" || pageVariant === "kiosk_fullscreen")}
                  className="flex-1 rounded-2xl border dark:border-border/20 border-border/40 shadow-xl backdrop-blur-sm"
                />
              </div>

              <aside className="relative overflow-hidden rounded-2xl border dark:border-border/20 border-border/40 bg-background/80 backdrop-blur-md shadow-xl p-6 sm:p-7 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                    {team.name}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                    {clientSettings.publicPanelTitle || displayName}
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {clientSettings.publicPanelBody ||
                    clientUrl.description ||
                    "Ask questions, report issues, or get instant guidance. This assistant is connected to the most relevant documentation and information for this page."}
                </p>
                <div className="mt-2 grid gap-3 text-sm">
                  {(clientSettings.kpi1Label || clientSettings.kpi2Label || clientSettings.kpi3Label) && (
                    <div className="rounded-xl border border-border/40 bg-muted/40 px-3.5 py-2.5 grid grid-cols-1 gap-2">
                      {[1, 2, 3].map((index) => {
                        const labelKey = `kpi${index}Label` as keyof ClientUrlSettings;
                        const valueKey = `kpi${index}Value` as keyof ClientUrlSettings;
                        const label = clientSettings[labelKey];
                        const value = clientSettings[valueKey];
                        if (!label && !value) return null;
                        return (
                          <div key={index} className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {label}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(clientSettings.faq1Question || clientSettings.faq2Question || clientSettings.faq3Question) && (
                    <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground space-y-2">
                      {[1, 2, 3].map((index) => {
                        const qKey = `faq${index}Question` as keyof ClientUrlSettings;
                        const aKey = `faq${index}Answer` as keyof ClientUrlSettings;
                        const q = clientSettings[qKey];
                        const a = clientSettings[aKey];
                        if (!q && !a) return null;
                        return (
                          <div key={index}>
                            {q && <p className="font-medium text-foreground text-xs">{q}</p>}
                            {a && <p className="text-xs text-muted-foreground">{a}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!clientSettings.publicPanelBody &&
                    !clientSettings.kpi1Label &&
                    !clientSettings.faq1Question && (
                      <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground">
                        This layout is ideal for public info screens or client portals where you want both
                        context and an AI assistant side by side.
                      </div>
                    )}
                </div>
              </aside>
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

  // Kiosk-style fullscreen – optimized for in-office displays
  if (pageVariant === "kiosk_fullscreen") {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <div className="flex flex-col h-[100dvh]">
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-4 sm:py-10">
            <div className="w-full h-full flex flex-col gap-4">
              <header className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground/80 uppercase tracking-[0.18em]">
                    {team.name}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                    {displayName}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                    Tap the screen or start typing to get help. Perfect for walk‑up support desks and
                    information kiosks.
                  </p>
                </div>
              </header>

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
                showHeader={false}
                initialGreeting={clientSettings.welcomeMessage}
                placeholderText={clientSettings.placeholderText || "How can we help you today?"}
                language={clientSettings.language}
                fileAccessMode={clientSettings.fileAccessMode}
                allowedFileIds={clientSettings.allowedFileIds}
                enableTextToSpeech={clientSettings.textToSpeechEnabled}
                enableWebTool={clientSettings.webSearchEnabled}
                className="flex-1 rounded-3xl border-2 dark:border-border/40 border-border/60 shadow-2xl shadow-primary/10"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated workspace assistant – uses internal team tools & context
  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      {!primaryColor && (
        <div className="absolute top-8 right-6 z-50">
          <AnimatedThemeToggler className="p-2 rounded-full bg-background/60 backdrop-blur-md shadow-sm hover:bg-background/80 transition-all text-foreground/70 hover:text-foreground" />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-[100dvh]">
        <div className="absolute h-full w-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <StripedPattern className="[mask-image:radial-gradient(520px_circle_at_center,#45454520,transparent)] hidden dark:block" />
          <StripedPattern className="[mask-image:radial-gradient(520px_circle_at_center,#e5e5e520,transparent)] block dark:hidden" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          <div className="w-full h-full flex flex-col gap-4">
            <header className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground/80 uppercase tracking-[0.18em]">
                  {team.name}
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  {displayName}
                </h1>
                {clientUrl.description && (
                  <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                    {clientUrl.description}
                  </p>
                )}
              </div>
            </header>

            <GlobalChat
              variant="team"
              teamId={team.id}
              teamName={team.name}
              clientName={displayName}
              clientCode={clientUrl.display_code}
              pdfViewerEnabled={clientSettings.pdfViewerEnabled ?? teamSettings.pdfViewerEnabled ?? true}
              context="private"
              allowContextSwitch={true}
              allowFileUpload={true}
              showHeader={true}
              initialGreeting={clientSettings.welcomeMessage}
              placeholderText={clientSettings.placeholderText}
              language={clientSettings.language}
              fileAccessMode={clientSettings.fileAccessMode}
              allowedFileIds={clientSettings.allowedFileIds}
              enableTextToSpeech={clientSettings.textToSpeechEnabled}
              enableWebTool={clientSettings.webSearchEnabled}
              className="flex-1 rounded-2xl border dark:border-border/20 border-border/40 shadow-xl backdrop-blur-sm"
            />
          </div>
        </div>

        <div className="text-center pb-4 sm:pb-6 relative z-10">
          <p className="text-xs font-medium text-muted-foreground/60 flex items-center justify-center gap-1.5 hover:text-muted-foreground transition-colors">
            Internal assistant for{" "}
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
