"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StorageProviderSetupDialog } from "./StorageProviderSetupDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Settings, FolderSync, Wrench } from "lucide-react";
import { MicrosoftBrowser } from "@/components/integrations/MicrosoftBrowser";
import Image from "next/image";

type Provider = "google_drive" | "onedrive" | "microsoft";

interface IntegrationState {
  provider: Provider;
  status: "connected" | "disconnected" | "error" | "connecting";
  email?: string | null;
}

export function IntegrationsPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [teamId, setTeamId] = useState<string>("");
  const [integrations, setIntegrations] = useState<IntegrationState[]>([
    { provider: "google_drive", status: "disconnected" },
    { provider: "onedrive", status: "disconnected" },
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [microsoftBrowserOpen, setMicrosoftBrowserOpen] = useState(false);

  useEffect(() => {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("team_id="));
    const currentTeam = cookie?.split("=")[1] ?? "";
    setTeamId(currentTeam);
  }, []);

  const fetchStatus = async () => {
    if (!teamId) return;
    setLoading(true);
    const { data } = await supabase
      .from("integration_accounts")
      .select("provider,status,provider_account_email")
      .eq("team_id", teamId);
    
    // Normalize DB providers to UI providers
    // DB might have 'microsoft', we treat it as 'onedrive' for UI or show it as Microsoft
    // Let's support both 'onedrive' and 'microsoft' in DB, but map to 'onedrive' UI slot if 'microsoft' is present
    
    const google = data?.find(x => x.provider === 'google_drive');
    const microsoft = data?.find(x => x.provider === 'microsoft' || x.provider === 'onedrive');

    const next: IntegrationState[] = [
        { 
            provider: "google_drive", 
            status: (google?.status ?? "disconnected") as IntegrationState["status"], 
            email: google?.provider_account_email 
        },
        { 
            provider: "onedrive", // Used for UI key
            status: (microsoft?.status ?? "disconnected") as IntegrationState["status"], 
            email: microsoft?.provider_account_email 
        }
    ];

    setIntegrations(next);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [supabase, teamId]);

  const openConnectDialog = (provider?: Provider) => {
    setSelectedProvider(provider ?? null);
    setDialogOpen(true);
  };

  const disconnect = async (provider: Provider) => {
    if (!teamId) return alert("No team selected");
    if (!confirm("Disconnect this provider?")) return;
    
    // For microsoft/onedrive, we might need to send 'microsoft' or 'onedrive' depending on what's in DB.
    // The disconnect API should handle it or we check what we have.
    // Simplest is to try both or rely on the UI mapping.
    // Let's assume we pass the UI provider name and the API handles it (or we map it here).
    
    const targetProvider = provider; 
    
    const res = await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, provider: targetProvider }),
    });
    
    if (!res.ok) return alert("Failed to disconnect");
    fetchStatus();
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Drive Card */}
          <IntegrationCard 
            title="Google Drive"
            icon="/google-drive.png"
            state={integrations.find(i => i.provider === 'google_drive')!}
            onConnect={() => openConnectDialog('google_drive')}
            onDisconnect={() => disconnect('google_drive')}
            onReconfigure={() => openConnectDialog('google_drive')}
            onFileSync={undefined}
            description="Sync Docs, Sheets, and PDFs from Google Workspace."
          />
          
          {/* Microsoft Card */}
          <IntegrationCard 
            title="Microsoft 365"
            icon="/onedrive.png" 
            state={integrations.find(i => i.provider === 'onedrive')!}
            onConnect={() => openConnectDialog('onedrive')}
            onDisconnect={() => disconnect('onedrive')}
            onReconfigure={() => openConnectDialog('onedrive')}
            onFileSync={() => setMicrosoftBrowserOpen(true)}
            description="Sync items from OneDrive, SharePoint, and Teams."
          />
       </div>

      <StorageProviderSetupDialog
        open={dialogOpen}
        onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) fetchStatus(); // Refresh on close in case success
        }}
        initialProvider={selectedProvider}
        onConnected={() => fetchStatus()}
      />

      {/* Microsoft file sync dialog (opened from cogwheel dropdown) */}
      <MicrosoftBrowser
        teamId={teamId}
        open={microsoftBrowserOpen}
        onOpenChange={setMicrosoftBrowserOpen}
      />
    </div>
  );
}

function IntegrationCard({ 
    title, 
    icon, 
    state, 
    onConnect, 
    onDisconnect, 
    onReconfigure,
    onFileSync,
    description,
}: { 
    title: string; 
    icon: string; 
    state: IntegrationState; 
    onConnect: () => void; 
    onDisconnect: () => void;
    onReconfigure: () => void;
    onFileSync?: () => void;
    description: string;
}) {
    const isConnected = state.status === 'connected';
    const hasFileSync = typeof onFileSync === 'function';
    
    return (
        <div className="border border-border rounded-xl p-5 bg-card flex flex-col justify-between h-full">
            <div>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-muted/50 flex items-center justify-center p-1.5">
                            <Image src={icon} alt={title} width={32} height={32} />
                        </div>
                        <div>
                            <h3 className="font-medium">{title}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {isConnected ? (
                                    <span className="flex items-center text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        Not Connected
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {isConnected && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                    title="Integration options"
                                    aria-label="Integration options"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {hasFileSync ? (
                                    <DropdownMenuItem onClick={onFileSync} className="gap-2 cursor-pointer">
                                        <FolderSync className="w-4 h-4" />
                                        File sync
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem disabled className="gap-2 opacity-70">
                                        <FolderSync className="w-4 h-4" />
                                        File sync (coming soon)
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={onReconfigure} className="gap-2 cursor-pointer">
                                    <Wrench className="w-4 h-4" />
                                    Re-configure
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                    {description}
                </p>
                
                {isConnected && state.email && (
                    <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted/30 rounded border flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Connected as {state.email}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mt-2 pt-4 border-t border-border/50">
                {isConnected ? (
                    <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        Disconnect
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" onClick={onConnect} className="w-full">
                        Connect
                    </Button>
                )}
            </div>
        </div>
    );
}
