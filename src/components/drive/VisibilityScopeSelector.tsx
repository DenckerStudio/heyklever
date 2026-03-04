"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Globe, Lock, Users, Loader2, X } from "lucide-react";

export type VisibilityScope = "internal" | "public" | "restricted";

interface ClientUrl {
  id: string;
  name: string;
  display_code: string;
  full_url?: string;
}

interface VisibilityScopeSelectorProps {
  value: VisibilityScope;
  onChange: (scope: VisibilityScope) => void;
  selectedClientCodes: string[];
  onClientCodesChange: (codes: string[]) => void;
  className?: string;
  compact?: boolean;
}

const scopeConfig = {
  internal: {
    label: "Intern",
    description: "Kun synlig for teamet",
    icon: Lock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  public: {
    label: "Offentlig",
    description: "Synlig for alle klienter",
    icon: Globe,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  restricted: {
    label: "Begrenset",
    description: "Kun for utvalgte klienter",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
};

export function VisibilityScopeSelector({
  value,
  onChange,
  selectedClientCodes,
  onClientCodesChange,
  className,
  compact = false,
}: VisibilityScopeSelectorProps) {
  const [clientUrls, setClientUrls] = useState<ClientUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch client URLs when restricted scope is selected
  useEffect(() => {
    if (value === "restricted") {
      fetchClientUrls();
    }
  }, [value]);

  const fetchClientUrls = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/teams/client-urls");
      if (response.ok) {
        const data = await response.json();
        setClientUrls(data.clientUrls || []);
      } else {
        setError("Kunne ikke hente klient-URLer");
      }
    } catch (err) {
      console.error("Error fetching client URLs:", err);
      setError("Feil ved henting av klient-URLer");
    } finally {
      setLoading(false);
    }
  };

  const handleClientCodeToggle = (displayCode: string) => {
    if (selectedClientCodes.includes(displayCode)) {
      onClientCodesChange(selectedClientCodes.filter((c) => c !== displayCode));
    } else {
      onClientCodesChange([...selectedClientCodes, displayCode]);
    }
  };

  const removeClientCode = (displayCode: string) => {
    onClientCodesChange(selectedClientCodes.filter((c) => c !== displayCode));
  };

  const CurrentIcon = scopeConfig[value].icon;

  if (compact) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Select value={value} onValueChange={(v) => onChange(v as VisibilityScope)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue>
              <div className="flex items-center gap-1.5">
                <CurrentIcon className={cn("w-3 h-3", scopeConfig[value].color)} />
                <span>{scopeConfig[value].label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(scopeConfig) as VisibilityScope[]).map((scope) => {
              const Icon = scopeConfig[scope].icon;
              return (
                <SelectItem key={scope} value={scope}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", scopeConfig[scope].color)} />
                    <span>{scopeConfig[scope].label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {value === "restricted" && (
          <div className="flex flex-wrap gap-1">
            {selectedClientCodes.length === 0 ? (
              <span className="text-xs text-muted-foreground">Velg klienter...</span>
            ) : (
              selectedClientCodes.map((code) => {
                const clientUrl = clientUrls.find((c) => c.display_code === code);
                return (
                  <Badge
                    key={code}
                    variant="secondary"
                    className="text-xs gap-1 pr-1"
                  >
                    {clientUrl?.name || code}
                    <button
                      onClick={() => removeClientCode(code)}
                      className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Scope Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Synlighet</Label>
        <Select value={value} onValueChange={(v) => onChange(v as VisibilityScope)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center gap-2">
                <div className={cn("p-1 rounded", scopeConfig[value].bgColor)}>
                  <CurrentIcon className={cn("w-4 h-4", scopeConfig[value].color)} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{scopeConfig[value].label}</span>
                </div>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(scopeConfig) as VisibilityScope[]).map((scope) => {
              const Icon = scopeConfig[scope].icon;
              return (
                <SelectItem key={scope} value={scope}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded", scopeConfig[scope].bgColor)}>
                      <Icon className={cn("w-4 h-4", scopeConfig[scope].color)} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{scopeConfig[scope].label}</span>
                      <span className="text-xs text-muted-foreground">
                        {scopeConfig[scope].description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{scopeConfig[value].description}</p>
      </div>

      {/* Client Code Selection (only for restricted) */}
      {value === "restricted" && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Velg klienter med tilgang</Label>
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : clientUrls.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              Ingen klient-URLer funnet. Opprett en i innstillinger først.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {clientUrls.map((clientUrl) => (
                <div
                  key={clientUrl.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    selectedClientCodes.includes(clientUrl.display_code)
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                  onClick={() => handleClientCodeToggle(clientUrl.display_code)}
                >
                  <Checkbox
                    checked={selectedClientCodes.includes(clientUrl.display_code)}
                    onCheckedChange={() => handleClientCodeToggle(clientUrl.display_code)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{clientUrl.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {clientUrl.display_code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected badges */}
          {selectedClientCodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedClientCodes.map((code) => {
                const clientUrl = clientUrls.find((c) => c.display_code === code);
                return (
                  <Badge
                    key={code}
                    variant="secondary"
                    className="gap-1.5 pr-1.5"
                  >
                    {clientUrl?.name || code}
                    <button
                      onClick={() => removeClientCode(code)}
                      className="ml-0.5 hover:bg-muted rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage visibility scope state
 */
export function useVisibilityScope(initialScope: VisibilityScope = "internal") {
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>(initialScope);
  const [allowedClientCodes, setAllowedClientCodes] = useState<string[]>([]);

  const reset = () => {
    setVisibilityScope("internal");
    setAllowedClientCodes([]);
  };

  return {
    visibilityScope,
    setVisibilityScope,
    allowedClientCodes,
    setAllowedClientCodes,
    reset,
  };
}
