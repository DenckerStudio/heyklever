"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { CheckCircle, XCircle, Loader2, AlertCircle, Copy, Check, ArrowRight } from "lucide-react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import {
  Modal,
  ModalBody,
  ModalContent
} from "@/components/ui/animated-modal";
import { MicrosoftBrowserContent } from "@/components/integrations/MicrosoftBrowser";

type Provider = "google_drive" | "onedrive" | "microsoft";

interface StorageProviderSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProvider?: Provider | null;
  onConnected?: (provider: Provider) => Promise<void> | void;
}

export function StorageProviderSetupDialog({
  open,
  onOpenChange,
  initialProvider = null,
  onConnected,
}: StorageProviderSetupDialogProps) {
  const [teamId, setTeamId] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [provider, setProvider] = useState<Provider | null>(initialProvider);
  const [clientId, setClientId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  
  // Google specific legacy fields
  const [authorizationUrl, setAuthorizationUrl] = useState<string>(
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
  );
  const [accessTokenUrl, setAccessTokenUrl] = useState<string>(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copiedUri, setCopiedUri] = useState(false);

  // Animation refs
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);
  const googleItemRef = useRef<HTMLButtonElement | null>(null);
  const onedriveItemRef = useRef<HTMLButtonElement | null>(null);
  const [glow, setGlow] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const cookie = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("team_id="));
    setTeamId(cookie?.split("=")[1] ?? "");
  }, []);

  useEffect(() => {
    if (open) {
      setStep(initialProvider ? 1 : 0);
      // Normalize 'microsoft' to 'onedrive' for dialog UI
      setProvider(initialProvider === 'microsoft' ? 'onedrive' : (initialProvider ?? null));
      setError("");
    } else {
      setStep(0);
      setProvider(null);
      setClientId("");
      setClientSecret("");
      setSubmitting(false);
      setError("");
    }
  }, [open, initialProvider]);

  const updateGlow = useCallback(() => {
    const container = itemsContainerRef.current;
    const target = provider === "google_drive" ? googleItemRef.current : provider === "onedrive" ? onedriveItemRef.current : null;
    if (!container || !target) return;
    const c = container.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    setGlow({ top: t.top - c.top, left: t.left - c.left, width: t.width, height: t.height });
  }, [provider]);

  useLayoutEffect(() => {
    updateGlow();
  }, [updateGlow]);

  useEffect(() => {
    const onResize = () => updateGlow();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateGlow]);

  const handleConnect = async () => {
    if (!teamId || !provider || !clientId || !clientSecret) return;
    setSubmitting(true);
    setError("");

    try {
      if (provider === "onedrive") {
        const redirectUri = `${window.location.origin}/api/integrations/microsoft/callback`;
        const res = await fetch("/api/integrations/microsoft/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId,
            clientId,
            clientSecret,
            redirectUri
          }),
        });
        
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || "Failed to initiate connection");
        }
        
        const { authUrl } = await res.json();
        window.location.href = authUrl;
        return;
      }
      
      const res = await fetch("/api/integrations/n8n/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          provider,
          config: {
            client_id: clientId,
            client_secret: clientSecret,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to connect");
      await onConnected?.(provider);
      // Transition to success step instead of closing
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/microsoft/callback` : '';

  // Check if we are in "Success Callback" mode (URL param)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'microsoft' && open) {
            setStep(2);
            setProvider('onedrive');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
  }, [open]);

  return (
    <Modal open={open} setOpen={onOpenChange}>
      <ModalBody className={cn("max-w-[94vw] w-full p-0 overflow-hidden", step === 3 ? "md:max-w-4xl h-[80vh]" : "md:max-w-2xl")}>
        <ModalContent className={cn("flex flex-col", step === 3 ? "h-full" : "h-[600px] max-h-[80vh]")}>
          {/* Header */}
          <div className="p-6 pb-4 border-b shrink-0 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-semibold">
                    {step === 2 || step === 3 ? "Integration Connected" : "Connect Integration"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {step === 0 ? "Choose a service provider to connect" : 
                     step === 1 ? "Configure integration settings" :
                     step === 2 ? "What would you like to do next?" :
                     "Select files to sync"}
                </p>
            </div>
          </div>

          {/* Content */}
          <div className={cn("flex-1 overflow-y-auto", step === 3 ? "p-0 relative" : "p-6")}>
            {/* Step 0: Choose Provider */}
            <div className={cn("transition-all duration-300", step === 0 ? "block" : "hidden")}>
                <div ref={itemsContainerRef} className="relative grid grid-cols-1 gap-4">
                  {glow ? (
                    <div
                      className={cn(
                        "pointer-events-none absolute rounded-xl",
                        "bg-brand/10 dark:bg-brand/20",
                        "blur-md transition-all duration-300"
                      )}
                      style={{
                        transform: `translate(${glow.left}px, ${glow.top}px)`,
                        width: glow.width,
                        height: glow.height,
                      }}
                    />
                  ) : null}
                  
                  <RadioGroup.Root
                    value={provider ?? ""}
                    onValueChange={(val) => setProvider(val as Provider)}
                    className="flex flex-col gap-3"
                  >
                    <RadioGroup.Item
                      ref={onedriveItemRef}
                      value="onedrive"
                      className={cn(
                        "relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all text-left",
                        provider === "onedrive" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Image src="/onedrive.png" alt="Microsoft 365" width={32} height={32} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Microsoft 365</div>
                        <div className="text-sm text-muted-foreground">Sync files from OneDrive, SharePoint, and Teams</div>
                      </div>
                    </RadioGroup.Item>

                    <RadioGroup.Item
                      ref={googleItemRef}
                      value="google_drive"
                      className={cn(
                        "relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all text-left",
                        provider === "google_drive" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <Image src="/google-drive.png" alt="Google Drive" width={32} height={32} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Google Drive</div>
                        <div className="text-sm text-muted-foreground">Sync items from your Google Workspace</div>
                      </div>
                    </RadioGroup.Item>
                  </RadioGroup.Root>
                </div>
            </div>

            {/* Step 1: Config */}
            <div className={cn("space-y-6 transition-all duration-300", step === 1 ? "block" : "hidden")}>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <p className="font-medium mb-1">
                        {provider === "onedrive" ? "Microsoft Azure App Required" : "Google Cloud App Required"}
                    </p>
                    <p className="opacity-90">
                        You need to create an OAuth app in your provider&apos;s developer console.
                        {provider === "onedrive" && " Ensure you add the Redirect URI below."}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Client ID</label>
                        <input
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder={provider === "onedrive" ? "Application (client) ID" : "OAuth Client ID"}
                            className="w-full px-3 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Client Secret</label>
                        <input
                            type="password"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            placeholder="Client Secret Value"
                            className="w-full px-3 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {provider === "onedrive" && (
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Redirect URI</label>
                            <div className="flex gap-2">
                                <div className="flex-1 px-3 py-2 rounded-lg border bg-muted text-muted-foreground text-sm font-mono truncate">
                                    {redirectUri}
                                </div>
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(redirectUri)}>
                                    {copiedUri ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                                Add this exact URI to your Azure App registration under Authentication.
                            </p>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            {/* Step 2: Success & Choice */}
            <div className={cn("space-y-6 transition-all duration-300 flex flex-col items-center justify-center h-full", step === 2 ? "flex" : "hidden")}>
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-center">Successfully Connected!</h3>
                <p className="text-center text-muted-foreground max-w-sm">
                    Your {provider === 'onedrive' ? 'Microsoft 365' : 'Google Drive'} account is now linked.
                    What would you like to sync?
                </p>

                <div className="grid grid-cols-1 w-full max-w-sm gap-3 mt-4">
                    {provider === 'onedrive' && (
                        <Button 
                            variant="default" 
                            className="w-full justify-between h-auto py-4 px-4"
                            onClick={() => setStep(3)}
                        >
                            <span className="flex flex-col items-start">
                                <span className="font-semibold">Select files to sync</span>
                                <span className="text-xs opacity-80 font-normal">Browse and pick specific folders</span>
                            </span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    )}
                    {provider === 'google_drive' && (
                        <Button 
                            variant="default" 
                            className="w-full justify-between h-auto py-4 px-4"
                            onClick={() => onOpenChange(false)}
                        >
                            <span className="flex flex-col items-start">
                                <span className="font-semibold">Go to Integrations</span>
                                <span className="text-xs opacity-80 font-normal">Manage connection and sync options</span>
                            </span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        className="w-full justify-between h-auto py-4 px-4"
                        onClick={() => onOpenChange(false)}
                    >
                        <span className="flex flex-col items-start">
                            <span className="font-semibold">Configure later</span>
                            <span className="text-xs text-muted-foreground font-normal">Return to settings</span>
                        </span>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Step 3: Browser (Microsoft only for now) */}
            {step === 3 && provider === 'onedrive' && (
                <div className="absolute inset-0 bg-background">
                    <MicrosoftBrowserContent teamId={teamId} />
                </div>
            )}
          </div>

          {/* Footer (Steps 0 & 1 only) */}
          {(step === 0 || step === 1) && (
            <div className="p-6 pt-4 border-t flex justify-between items-center bg-muted/5 shrink-0">
                {step === 0 ? (
                    <>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={() => setStep(1)} disabled={!provider}>Next</Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" onClick={() => setStep(0)} disabled={submitting}>Back</Button>
                        <Button onClick={handleConnect} disabled={!clientId || !clientSecret || submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                "Connect"
                            )}
                        </Button>
                    </>
                )}
            </div>
          )}
        </ModalContent>
      </ModalBody>
    </Modal>
  );
}
