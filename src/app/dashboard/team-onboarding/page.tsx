"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AnimatedWizardLayout } from "@/components/onboarding/AnimatedWizardLayout";
import { AnimatedStepTeamDetails } from "@/components/onboarding/AnimatedStepTeamDetails";
import { AnimatedStepPlanSelection } from "@/components/onboarding/AnimatedStepPlanSelection";
import { motion } from "framer-motion";

export default function TeamOnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace("/signin");
        return;
      }
      setUser(authData.user);

      // Check if user already has a team
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_team_id")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile?.default_team_id) {
        // Check if user is member of any team
        const { data: memberships } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", authData.user.id)
          .limit(1)
          .maybeSingle();

        if (memberships) {
          router.replace("/dashboard");
          return;
        }
      }
    };
    init();
  }, [supabase, router]);

  const uploadLogo = async (file: File): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/teams/upload-logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload logo");
      }

      const data = await response.json();
      // Return the temp path info instead of URL
      return data;
    } catch (error) {
      console.error("Error uploading logo:", error);
      return null;
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName || !teamSlug) {
      setError("Team name and slug are required");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Upload logo if provided (returns temp path info)
      let logoUploadInfo = null;
      if (logoFile) {
        logoUploadInfo = await uploadLogo(logoFile);
        if (!logoUploadInfo) {
          console.warn("Logo upload failed, continuing without logo");
        }
      }

      // Create team
      const response = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          slug: teamSlug,
          logoUrl: logoUploadInfo, // Pass temp path info
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      if (!data.team?.id) {
        throw new Error("Team creation failed");
      }

      setTeamId(data.team.id);
      
      // Set team cookie
      document.cookie = `team_id=${encodeURIComponent(data.team.id)}; path=/`;

      // Move to plan selection step
      setCurrentStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlanSelection = async () => {
    if (!teamId || !selectedPlan) {
      setError("Please select a plan");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Update team plan (for now, just set it - actual subscription setup can be done later)
      const { error: updateError } = await supabase
        .from("teams")
        .update({ plan: selectedPlan === "free" ? "free" : "premium" })
        .eq("id", teamId);

      if (updateError) {
        console.error("Error updating team plan:", updateError);
        // Continue anyway, plan can be set later
      }

      // Dispatch custom event to trigger teams refetch
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("teams:refetch"));
      }

      // Redirect to dashboard - use window.location to ensure full page reload
      // This ensures all components refetch their data
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set plan");
      setIsProcessing(false);
    }
  };

  const steps = [
    { step: 1, label: "Team Details" },
    { step: 2, label: "Choose Plan" },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AnimatedWizardLayout
      currentStep={currentStep + 1}
      totalSteps={steps.length}
      title="Create Your Team"
      description="Set up your team workspace in just a few steps"
      steps={steps}
      completedSteps={[]}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
        >
          {error}
        </motion.div>
      )}

      {currentStep === 0 && (
        <AnimatedStepTeamDetails
          teamName={teamName}
          teamSlug={teamSlug}
          setTeamName={setTeamName}
          setTeamSlug={setTeamSlug}
          onNext={handleCreateTeam}
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          logoPreview={logoPreview}
          setLogoPreview={setLogoPreview}
          isProcessing={isProcessing}
        />
      )}

      {currentStep === 1 && teamId && (
        <AnimatedStepPlanSelection
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          onNext={handlePlanSelection}
          isProcessing={isProcessing}
        />
      )}
    </AnimatedWizardLayout>
  );
}

