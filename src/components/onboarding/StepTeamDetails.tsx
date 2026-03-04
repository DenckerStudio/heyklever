import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface StepTeamDetailsProps {
  teamName: string;
  teamSlug: string;
  setTeamName: (name: string) => void;
  setTeamSlug: (slug: string) => void;
  onNext: () => void;
  onBack: () => void;
  teamId: string | null;
  onLogoSelect: (file: File) => void;
  buttonText?: string;
  isProcessing: boolean;
}

export function StepTeamDetails({
  teamName,
  teamSlug,
  setTeamName,
  setTeamSlug,
  onNext,
  onBack,
  teamId,
  onLogoSelect,
  buttonText = "Next",
  isProcessing,
}: StepTeamDetailsProps) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTeamName(name);
    // Auto-generate slug if not manually edited (simplistic approach)
    if (!teamSlug || teamSlug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
        setTeamSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeamSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLogoSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamName" className="mb-2">Team Name</Label>
          <Input
            id="teamName"
            placeholder="Acme Corp"
            value={teamName}
            onChange={handleNameChange}
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamSlug" className="mb-2">Team URL</Label>
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
              heyklever.ai/
            </span>
            <Input
              id="teamSlug"
              placeholder="acme"
              className="rounded-l-none"
              value={teamSlug}
              onChange={handleSlugChange}
              disabled={isProcessing}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This will be used for your team's unique URL.
          </p>
        </div>

        <div className="space-y-2">
            <Label htmlFor="teamLogo" className="mb-2">Team Logo (Optional)</Label>
            <Input 
                id="teamLogo" 
                type="file" 
                accept="image/*" 
                onChange={handleLogoChange}
                disabled={isProcessing}
            />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!teamName || !teamSlug || isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </div>
    </div>
  );
}

