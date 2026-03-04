"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";

interface AnimatedStepTeamDetailsProps {
  teamName: string;
  teamSlug: string;
  setTeamName: (name: string) => void;
  setTeamSlug: (slug: string) => void;
  onNext: () => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  logoPreview: string | null;
  setLogoPreview: (preview: string | null) => void;
  isProcessing: boolean;
}

export function AnimatedStepTeamDetails({
  teamName,
  teamSlug,
  setTeamName,
  setTeamSlug,
  onNext,
  logoFile,
  setLogoFile,
  logoPreview,
  setLogoPreview,
  isProcessing,
}: AnimatedStepTeamDetailsProps) {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setTeamName(name);
    // Auto-generate slug from team name
    const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (generatedSlug) {
      setTeamSlug(generatedSlug);
    }
  };


  const handleLogoSelect = async (files: File[]) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setLogoFile(file);
    setIsUploadingLogo(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing logo:", error);
      setIsUploadingLogo(false);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamName" className="text-foreground">Team Name</Label>
          <Input
            id="teamName"
            placeholder="Acme Corp"
            value={teamName}
            onChange={handleNameChange}
            disabled={isProcessing}
            className="border-[0.5px] border-border/30 focus:border-primary/50"
          />
        </div>


        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="teamLogo" className="text-foreground">Team Logo (Optional)</Label>
          <div className="space-y-3">
            {logoPreview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative inline-block"
              >
                <div className="relative size-24 rounded-xl overflow-hidden border-[0.5px] border-border/30 bg-muted/20 ring-[0.5px] ring-border/20">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    disabled={isProcessing || isUploadingLogo}
                    className="absolute top-1 right-1 p-1 rounded-full bg-background/80 backdrop-blur-sm border-[0.5px] border-border/30 hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
                  >
                    <X className="size-3 text-foreground" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full">
                <FileUpload
                  onChange={handleLogoSelect}
                  onUpload={async () => {
                    // Prevent auto-upload to Supabase Storage
                    // We just want the file for preview, will upload later with team creation
                    return Promise.resolve();
                  }}
                  scope="public"
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex justify-end pt-4 border-t-[0.5px] border-border/30"
      >
        <RainbowButton
          onClick={onNext}
          disabled={!teamName || isProcessing}
          className="min-w-[120px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Continue"
          )}
        </RainbowButton>
      </motion.div>
    </motion.div>
  );
}

